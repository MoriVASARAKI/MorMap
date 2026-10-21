<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Storage;
use PortMap\LibreNMS\Support\TopologySchema;

/** One infrastructure graph; maps persist presentations of its objects. */
final class InfrastructureStore
{
    private string $dir;
    public function __construct(private string $root)
    {
        $this->dir=$root.'/infrastructure';
        if(!is_dir($this->dir)&&!mkdir($this->dir,0770,true)&&!is_dir($this->dir))throw new \RuntimeException('Cannot create infrastructure storage.');
    }
    public static function deviceRef(array $device): string
    {
        if(!empty($device['device_id']))return 'lnms:device:'.(int)$device['device_id'];
        $id=$device['object_id']??'';
        if(!is_string($id)||!preg_match('/^mm:device:[a-f0-9-]{36}$/D',$id))throw new \InvalidArgumentException('Choose an existing MorMap component.');
        return $id;
    }
    public static function portRef(array $port): string
    {
        if(!empty($port['port_id']))return 'lnms:port:'.(int)$port['port_id'];
        $id=$port['port_ref']??'';
        if(!is_string($id)||!preg_match('/^mm:port:[a-f0-9-]{36}$/D',$id))throw new \InvalidArgumentException('Invalid MorMap physical port.');
        return $id;
    }
    public static function connectionId(string $a,string $b): string
    {
        $ends=[$a,$b];sort($ends,SORT_STRING);$h=hash('sha256','mormap-connection:'.implode('|',$ends));
        return substr($h,0,8).'-'.substr($h,8,4).'-5'.substr($h,13,3).'-a'.substr($h,17,3).'-'.substr($h,20,12);
    }
    private static function emptyGraph(): array {return ['schema'=>2,'revision'=>0,'devices'=>[],'ports'=>[],'connections'=>[],'disconnected'=>[],'logical_connections'=>[],'logical_disconnected'=>[],'migration_conflicts'=>[]];}
    public static function connectionKey(string $workspace): string
    {
        if(!in_array($workspace,['logical','physical'],true))throw new \InvalidArgumentException('Invalid topology.');
        return $workspace==='logical'?'logical_connections':'connections';
    }
    public static function disconnectedKey(string $workspace): string {return $workspace==='logical'?'logical_disconnected':'disconnected';}
    public static function activeDevice(array $device): bool
    {
        return ($device['source']??'')==='librenms'||($device['endpoint_role']??'')==='active'||($device['type']??'')==='active';
    }
    /** Preserve every drawing and route; classify old shared edges by saved view provenance. */
    private function separateTopologies(array $legacy): array
    {
        $backup=$this->dir.'/graph-before-topology-v2.json';
        if(!is_file($backup))$this->writeJson($backup,$legacy);
        $g=$legacy;$g['schema']=2;$g['connections']=[];$g['logical_connections']=[];
        $g['disconnected']=$legacy['disconnected']??[];$g['logical_disconnected']=$g['disconnected'];
        $g['migration_conflicts']=[];$drawn=['logical'=>[],'physical'=>[]];
        foreach(['logical','physical'] as $workspace)foreach($this->mapStore($workspace)->all() as $summary){
            $map=$this->mapStore($workspace)->read($summary['id']);$points=[];
            if($workspace==='logical')foreach($map['anchors']??[] as $p)$points[$p['id']]=self::portRef($p);
            foreach($map[$workspace==='logical'?'links':'cables']??[] as $link){
                $a=$workspace==='logical'?($points[$link['source']]??null):$link['source'];
                $b=$workspace==='logical'?($points[$link['target']]??null):$link['target'];
                if(!$a||!$b)continue;$id=self::connectionId($a,$b);
                if(isset($legacy['disconnected'][$id])&&!isset($legacy['connections'][$id]))continue;
                $drawn[$workspace][$id]=['source'=>$a,'target'=>$b,'input'=>$legacy['connections'][$id]??$link,'map_id'=>$map['id'],'link_id'=>$link['id']];
            }
        }
        // An edge with no drawing is a retained or remote physical cable.
        foreach($legacy['connections']??[] as $id=>$c)if(!isset($drawn['logical'][$id])&&!isset($drawn['physical'][$id]))$drawn['physical'][$id]=['source'=>$c['source'],'target'=>$c['target'],'input'=>$c];
        foreach($drawn as $workspace=>$edges)foreach($edges as $edge){
            try{$this->connect($g,$edge['source'],$edge['target'],$edge['input'],$workspace);}
            catch(\InvalidArgumentException $e){$g['migration_conflicts'][]=['workspace'=>$workspace,'map_id'=>$edge['map_id']??null,'link_id'=>$edge['link_id']??null,'message'=>$e->getMessage()];}
        }
        $g['revision']++;$this->writeJson($this->dir.'/graph.json',$g);return $g;
    }
    /** Used when an Undo is rebased onto newer infrastructure. */
    public static function validateConnections(array $g): void
    {
        foreach(['logical','physical'] as $workspace){
            foreach($g[self::connectionKey($workspace)]??[] as $c){
                $a=$c['source'];$b=$c['target'];
                if($a===$b||!isset($g['ports'][$a],$g['ports'][$b]))throw new \UnexpectedValueException('A connection references missing or identical ports.');
            }
        }
    }
    private function locked(callable $fn): mixed
    {
        $lock=fopen($this->dir.'/graph.lock','c');if(!$lock)throw new \RuntimeException('Cannot open infrastructure lock.');
        try{if(!flock($lock,LOCK_EX))throw new \RuntimeException('Cannot lock infrastructure.');$this->recover();$file=$this->dir.'/graph.json';$graph=is_file($file)?$this->readJson($file):$this->migrate();if(($graph['schema']??1)<2)$graph=$this->separateTopologies($graph);return $fn($graph);}
        finally{flock($lock,LOCK_UN);fclose($lock);}
    }
    private function readJson(string $file): array {return json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR);}
    private function writeJson(string $file,array $value): void
    {
        $tmp=tempnam($this->dir,'.graph-');try{if(!$tmp||file_put_contents($tmp,json_encode($value,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE),LOCK_EX)===false)throw new \RuntimeException('Cannot write infrastructure.');chmod($tmp,0660);if(!rename($tmp,$file))throw new \RuntimeException('Cannot replace infrastructure.');}
        finally{if($tmp&&is_file($tmp))unlink($tmp);}
    }
    private function mapStore(string $workspace): MapStore
    {
        if(!in_array($workspace,['logical','physical'],true))throw new \InvalidArgumentException('Invalid workspace.');
        return new MapStore($this->root.($workspace==='physical'?'/physical':'').'/maps');
    }
    /** A write-ahead journal makes the map + graph update recoverable as one unit. */
    private function recover(): void
    {
        $file=$this->dir.'/pending.json';if(!is_file($file))return;$j=$this->readJson($file);
        $map=$this->mapStore($j['workspace'])->read($j['id']);
        if(($map['revision']??0)===$j['map_revision'])$this->writeJson($this->dir.'/graph.json',$j['graph']);
        elseif(($map['revision']??0)!==$j['map_revision']-1)throw new \RuntimeException('Infrastructure recovery needs the matching map revision. Restore a consistent backup.');
        unlink($file);
    }
    public function snapshot(): array {return $this->locked(fn($graph)=>$graph);}
    /**
     * Retire connections only after a complete, authoritative inventory lookup.
     * Missing drawings, equal names, disabled devices and link-down states are
     * deliberately not evidence of deletion. Call under the workspace lock.
     */
    public function reconcileInventory(int $expected, array $devices, array $ports): array
    {
        return $this->locked(function ($graph) use ($expected, $devices, $ports) {
            if ($graph['revision'] !== $expected) {
                throw new \UnexpectedValueException('Infrastructure changed during inventory verification. Reload and try again.');
            }
            $issues = [];
            foreach ($graph['ports'] as $ref => $port) {
                $owner = $port['device_ref'] ?? '';
                if (str_starts_with($owner, 'lnms:device:') && !isset($devices[(int) substr($owner, 12)])) {
                    $issues[$ref] = 'LibreNMS device no longer exists.';
                } elseif (str_starts_with($ref, 'lnms:port:')) {
                    $id = (int) substr($ref, 10);
                    if (!isset($ports[$id])) $issues[$ref] = 'LibreNMS interface was deleted or no longer exists.';
                    elseif ('lnms:device:' . (int) $ports[$id] !== $owner) $issues[$ref] = 'LibreNMS interface belongs to a different device.';
                }
            }
            $original = $graph;
            if ($issues || isset($graph['inventory_issues'])) $graph['inventory_issues'] = $issues;
            // A drawing of a removed interface is still an engineer's record of
            // the wiring. Preserve it with an inventory warning. Automatic
            // retirement is reserved for orphaned, invalid endpoints.
            $placed = [];
            if ($issues) foreach (['logical', 'physical'] as $workspace) {
                $store = $this->mapStore($workspace);
                foreach ($store->all() as $summary) {
                    $map = $store->read($summary['id']);
                    if ($map) foreach ($this->viewPoints($workspace, $map) as $ref) $placed[$ref] = true;
                }
            }
            foreach (['logical', 'physical'] as $workspace) {
                $key = self::connectionKey($workspace);
                $removed = self::disconnectedKey($workspace);
                foreach ($graph[$key] as $id => $connection) {
                    $reasons = array_intersect_key($issues, array_flip([$connection['source'], $connection['target']]));
                    if (!$reasons || !array_diff_key($reasons, $placed)) continue;
                    // Tombstones prevent saved maps and published snapshots from
                    // silently bringing a retired connection back on their next load.
                    $graph[$removed][$id] = $connection + ['retired_inventory' => $reasons];
                    unset($graph[$key][$id]);
                }
            }
            if ($graph !== $original) {
                $backup = $this->dir . '/graph-before-inventory-' . $original['revision'] . '.json';
                if (!is_file($backup)) $this->writeJson($backup, $original);
                $graph['revision']++;
                $this->writeJson($this->dir . '/graph.json', $graph);
            }
            return $graph;
        });
    }
    public function decorate(array $map): array
    {
        $g=$this->snapshot();$map['infrastructure_revision']=$g['revision'];$map['infrastructure']=$g;return $map;
    }
    private function migrate(): array
    {
        $graph=self::emptyGraph();
        foreach(['logical','physical'] as $workspace){$store=$this->mapStore($workspace);foreach($store->all() as $summary){$map=$store->read($summary['id']);
            try{$points=$this->registerView($graph,$workspace,$map);foreach($map[$workspace==='physical'?'cables':'links']??[] as $link){
                $a=$points[$link['source']]??null;$b=$points[$link['target']]??null;if(!$a||!$b)continue;
                try{$id=self::connectionId($a,$b);if(!isset($graph[self::connectionKey($workspace)][$id]))$this->connect($graph,$a,$b,$link,$workspace);}
                catch(\InvalidArgumentException $e){$graph['migration_conflicts'][]=['workspace'=>$workspace,'map_id'=>$map['id'],'link_id'=>$link['id'],'message'=>$e->getMessage()];}
            }}catch(\InvalidArgumentException $e){$graph['migration_conflicts'][]=['workspace'=>$workspace,'map_id'=>$map['id'],'message'=>$e->getMessage()];}
        }}
        $graph['revision']=1;$this->writeJson($this->dir.'/graph.json',$graph);return $graph;
    }
    private function registerView(array &$graph,string $workspace,array &$map): array
    {
        $points=[];$nodes=[];$members=[];$key=$workspace==='logical'?'nodes':'equipment';TopologySchema::placements($map[$key]);
        if($workspace==='physical'){
            $planId=$map['id']??'';
            foreach($graph['devices'] as &$known){foreach($known['placements']??[] as $k=>$place)if(($place['plan_id']??null)===$planId)unset($known['placements'][$k]);if(($known['physical']['plan_id']??null)===$planId){unset($known['physical']);if(!empty($known['placements']))$known['physical']=reset($known['placements']);}}unset($known);
        }

        foreach($map[$key] as &$device){$ref=self::deviceRef($device);$device['object_id']=$ref;$nodes[$device['id']]=$ref;$members[$device['id']]=$device['stack_member']??null;
            if(!empty($device['device_id']))$graph['devices'][$ref]=($graph['devices'][$ref]??[])+['id'=>$ref,'source'=>'librenms','device_id'=>(int)$device['device_id']];
            elseif(!isset($graph['devices'][$ref]))throw new \InvalidArgumentException('The MorMap component no longer exists.');
            $graph['devices'][$ref]['name']??=$device['label'];
            if($workspace==='physical'){
                $locations=array_column($map['locations'],null,'id');$path=[];$hierarchy=[];$parent=$device['parent_id'];$seen=[];
                while($parent&&isset($locations[$parent])&&!isset($seen[$parent])){$seen[$parent]=true;array_unshift($path,$locations[$parent]['name']);$hierarchy[$locations[$parent]['type']??'location']=['id'=>$parent,'name'=>$locations[$parent]['name']];$parent=$locations[$parent]['parent_id'];}
                $placement=['plan_id'=>$map['id']??null,'location_id'=>$device['parent_id'],'path'=>implode(' / ',$path),'hierarchy'=>$hierarchy,'rack_u'=>$device['rack_u'],'rack_units'=>$device['rack_units']];$placement['stack_member']=$device['stack_member']??null;$placement['equipment_id']=$device['id'];$placement['plan_name']=$map['name'];$placement['port_refs']=array_map([self::class,'portRef'],$device['ports']);$graph['devices'][$ref]['placements'][$map['id'].(isset($device['stack_member'])?':member:'.$device['stack_member']:'')]=$placement;$graph['devices'][$ref]['physical']??=$placement;if($graph['devices'][$ref]['physical']['plan_id']===$map['id'])$graph['devices'][$ref]['physical']=$placement;
                foreach($device['ports'] as &$port){$p=self::portRef($port);$port['port_ref']=$p;$this->registerPort($graph,$p,$ref,$port,$device['stack_member']??null);$points[$p]=$p;}unset($port);
            }
        }unset($device);
        if($workspace==='logical')foreach($map['anchors'] as &$port){$owner=$nodes[$port['node_id']]??null;if(!$owner)throw new \InvalidArgumentException('Connection point has no device.');$p=self::portRef($port);$port['port_ref']=$p;$this->registerPort($graph,$p,$owner,$port,$members[$port['node_id']]??null);$points[$port['id']]=$p;}unset($port);
        foreach($map[$key] as &$device){
            $ref=self::deviceRef($device);$d=&$graph['devices'][$ref];$k=TopologySchema::profileKey($device);
            if(isset($device['stack_member'])){$d['stack']=true;if(isset($d['profiles']['main'])&&!isset($d['profiles']['member:1'])){$d['profiles']['member:1']=$d['profiles']['main'];unset($d['profiles']['main']);}}
            $previous=$d['profiles'][$k]??(($k==='main'||$k==='member:1')?($d['presentation']??[]):[]);
            if(isset($device['profile_revision'])&&($previous['revision']??0)>$device['profile_revision'])throw new \UnexpectedValueException('Device definition changed in another view. Reload before saving.');
            $profile=$previous;$profile['image']=$device['image'];$profile['label']=$device['label'];
            foreach(['image_width','image_height','width_mm','rack_units','image_fit'] as $field)if(isset($device[$field]))$profile[$field]=$device[$field];
            $incoming=$workspace==='physical'?$device['ports']:array_values(array_filter($map['anchors'],fn($a)=>$a['node_id']===$device['id']));
            $ports=[];if(($previous['image']??null)===$device['image'])foreach($previous['ports']??[] as $port)$ports[self::portRef($port)]=$port;
            foreach($incoming as $port){$r=self::portRef($port);$ports[$r]=['port_id'=>$port['port_id']??null,'port_ref'=>$r,'label'=>$port['label'],'x'=>$port['x'],'y'=>$port['y']];}
            if(isset($device['stack_member']))$ports=array_filter($ports,fn($p)=>!isset($graph['ports'][self::portRef($p)]['stack_member'])||$graph['ports'][self::portRef($p)]['stack_member']===$device['stack_member']);
            $profile['ports']=array_values($ports);$oldRevision=$previous['revision']??0;unset($profile['revision'],$previous['revision']);
            $profile['revision']=$profile===$previous?max(1,$oldRevision):$oldRevision+1;
            $d['profiles'][$k]=$profile;$device['profile_revision']=$profile['revision'];
            if($k==='main'||$k==='member:1')$d['presentation']=$profile;unset($d);
        }unset($device);
        return $points;
    }
    private function registerPort(array &$graph,string $ref,string $owner,array $port,?int $member=null): void
    {
        $member??=$graph['ports'][$ref]['stack_member']??null;
        if($member&&isset($graph['ports'][$ref]['stack_member'])&&$graph['ports'][$ref]['stack_member']!==$member)throw new \InvalidArgumentException('This port belongs to another stack member.');
        if(!empty($port['port_id'])){
            if(isset($graph['ports'][$ref])&&$graph['ports'][$ref]['device_ref']!==$owner)throw new \InvalidArgumentException('A port is mapped to inconsistent devices.');
            $graph['ports'][$ref]=['id'=>$ref,'source'=>'librenms','port_id'=>(int)$port['port_id'],'device_ref'=>$owner,'label'=>$port['label']];
        }elseif(($graph['ports'][$ref]['device_ref']??null)!==$owner)throw new \InvalidArgumentException('The physical port does not belong to this MorMap component.');
        if($member)$graph['ports'][$ref]['stack_member']=$member;
    }
    private function connect(array &$g,string $a,string $b,array $input,string $workspace='physical',bool $retained=false): string
    {
        $connections=&$g[self::connectionKey($workspace)];$disconnected=&$g[self::disconnectedKey($workspace)];
        if($a===$b||!isset($g['ports'][$a],$g['ports'][$b]))throw new \InvalidArgumentException('Choose two distinct known ports.');
        if(!$retained&&(isset($g['inventory_issues'][$a])||isset($g['inventory_issues'][$b])))throw new \InvalidArgumentException('A connection endpoint no longer matches LibreNMS inventory. Choose its current interface.');
        // Occupied ports, passive loops and stack-role mismatches are design
        // advisories in the UI. Preserve the engineer's connections on save/Undo.
        $id=self::connectionId($a,$b);
        $c=['id'=>$id,'source'=>$a,'target'=>$b,'name'=>self::text($input['name']??'',120),'comment'=>self::text($input['comment']??'',4000),'kind'=>$input['kind']??'cable'];
        if(!in_array($c['kind'],['cable','copper','fiber','power','building','stack','backbone'],true))throw new \InvalidArgumentException('Invalid connection kind.');
        if(isset($input['color'])){if(!is_string($input['color'])||!preg_match('/^#[a-fA-F0-9]{6}$/D',$input['color']))throw new \InvalidArgumentException('Invalid cable color.');$c['color']=$input['color'];}
        if(isset($input['media']))$c['media']=TopologySchema::media($input['media']);elseif(isset($connections[$id]['media']))$c['media']=$connections[$id]['media'];
        $c['topology']=$workspace;$connections[$id]=$c;unset($disconnected[$id]);return $id;
    }
    private static function text(mixed $value,int $max): string
    {
        if(!is_string($value)||mb_strlen($value)>$max)throw new \InvalidArgumentException('Invalid infrastructure text.');return $value;
    }
    public function saveView(string $workspace,string $id,int $expected,array $map): array
    {
        return $this->locked(function($graph)use($workspace,$id,$expected,$map){
            if(($map['infrastructure_revision']??null)!==$graph['revision'])throw new \UnexpectedValueException('Shared infrastructure changed. Reload the map before saving; your current changes remain on screen.');
            $store=$this->mapStore($workspace);$old=$store->read($id);if(($old['revision']??0)!==$expected)throw new \UnexpectedValueException('Map changed in another tab. Reload before saving.');
            $original=$graph;$connections=&$graph[self::connectionKey($workspace)];$disconnected=&$graph[self::disconnectedKey($workspace)];$map['id']=$id;$points=$this->registerView($graph,$workspace,$map);
            $oldPoints=array_merge($this->viewPoints($workspace,$old),array_values($points));$allowed=[];foreach($connections as $c)if(in_array($c['source'],$oldPoints,true)&&in_array($c['target'],$oldPoints,true))$allowed[$c['id']]=true;
            // A cable removed together with its port/device may no longer be in the draft.
            // Reconcile saved cable identities as well as explicit disconnect requests.
            $linkKey=$workspace==='logical'?'links':'cables';
            $remaining=[];
            foreach($map[$linkKey]??[] as $link){
                if($workspace==='logical'){
                    $lookup=array_column($map['anchors']??[],null,'id');
                    $a=isset($lookup[$link['source']])?self::portRef($lookup[$link['source']]):null;
                    $b=isset($lookup[$link['target']])?self::portRef($lookup[$link['target']]):null;
                }else{$a=$link['source']??null;$b=$link['target']??null;}
                if($a&&$b)$remaining[self::connectionId($a,$b)]=true;
            }
            $removedFromOld=[];$previous=[];
            if($workspace==='logical')$previous=array_column($old['anchors']??[],null,'id');
            foreach($old[$linkKey]??[] as $link){
                $a=$workspace==='logical'?(isset($previous[$link['source']])?self::portRef($previous[$link['source']]):null):($link['source']??null);
                $b=$workspace==='logical'?(isset($previous[$link['target']])?self::portRef($previous[$link['target']]):null):($link['target']??null);
                if(!$a||!$b)continue;
                $cid=self::connectionId($a,$b);
                if(isset($connections[$cid])&&!isset($remaining[$cid]))$removedFromOld[$cid]=true;
            }
            $removals=array_unique(array_merge($map['disconnect']??[],$workspace==='physical'?[]:array_keys(array_diff_key($removedFromOld,$remaining))));
            foreach($removals as $connection){
                if(!isset($allowed[$connection])){
                    // Recovery for an old orphan: a placed endpoint is enough to request
                    // disconnection of its shared relationship.
                    $edge=$connections[$connection]??null;
                    if(!$edge||(!in_array($edge['source'],array_values($points),true)&&!in_array($edge['target'],array_values($points),true)))
                        throw new \InvalidArgumentException('The disconnected cable is not associated with this view.');
                }
                if(!isset($connections[$connection]))continue;
                // An explicit cable deletion disconnects the shared relationship. An
                // incidental removal with a device/port preserves other saved drawings.
                $explicit=in_array($connection,$map['disconnect']??[],true);
                $referencedElsewhere=false;
                foreach($explicit?[]:$store->all() as $summary){
                    if($summary['id']===$id)continue;
                    $another=$store->read($summary['id']);
                    $anchors=$workspace==='logical'?array_column($another['anchors']??[],null,'id'):[];
                    foreach($another[$linkKey]??[] as $link){
                        $a=$workspace==='logical'?(isset($anchors[$link['source']])?self::portRef($anchors[$link['source']]):null):($link['source']??null);
                        $b=$workspace==='logical'?(isset($anchors[$link['target']])?self::portRef($anchors[$link['target']]):null):($link['target']??null);
                        if($a&&$b&&self::connectionId($a,$b)===$connection){$referencedElsewhere=true;break 2;}
                    }
                }
                if($referencedElsewhere)continue;
                $disconnected[$connection]=$connections[$connection];unset($connections[$connection]);
            }
            $linkKey=$workspace==='logical'?'links':'cables';$seen=[];$map[$linkKey]??=[];
            foreach($map[$linkKey] as &$link){$a=$points[$link['source']]??null;$b=$points[$link['target']]??null;if(!$a||!$b)throw new \InvalidArgumentException('Cable endpoints must be placed in this view.');
                $expectedId=self::connectionId($a,$b);if(isset($link['connection_id'])&&$link['connection_id']!==$expectedId)throw new \InvalidArgumentException('Connection identity does not match its ports.');
                if(isset($seen[$expectedId]))throw new \InvalidArgumentException('A connection is drawn more than once.');$seen[$expectedId]=true;
                $retained=isset($original[self::connectionKey($workspace)][$expectedId])&&in_array($a,$this->viewPoints($workspace,$old),true)&&in_array($b,$this->viewPoints($workspace,$old),true);
                $link['connection_id']=$this->connect($graph,$a,$b,$link,$workspace,$retained);
            }unset($link);
            if(count($connections)>20000||count($graph['devices'])>10000||count($graph['ports'])>80000)throw new \InvalidArgumentException('Infrastructure size limit reached.');
            $graph['migration_conflicts']=array_values(array_filter($graph['migration_conflicts']??[],fn($c)=>$c['workspace']!==$workspace||$c['map_id']!==$id));
            if($graph!==$original)$graph['revision']++;
            unset($map['infrastructure'],$map['disconnect']);$map['infrastructure_revision']=$graph['revision'];
            $this->writeJson($this->dir.'/pending.json',['workspace'=>$workspace,'id'=>$id,'map_revision'=>$expected+1,'graph'=>$graph]);
            $saved=$store->save($id,$expected,$map);$this->writeJson($this->dir.'/graph.json',$graph);unlink($this->dir.'/pending.json');
            $saved['infrastructure']=$graph;return $saved;
        });
    }
    private function viewPoints(string $workspace,array $map): array
    {
        $list=$workspace==='logical'?($map['anchors']??[]):array_merge([], ...array_map(fn($e)=>$e['ports']??[],$map['equipment']??[]));$out=[];
        foreach($list as $p)$out[]=self::portRef($p);return $out;
    }
    /** Create a MorMap-owned object; no fake LibreNMS device or interface IDs. */
    public function addComponent(array $input,int $expected): array
    {
        return $this->locked(function($g)use($input,$expected){
            if($expected!==$g['revision'])throw new \UnexpectedValueException('Infrastructure changed. Refresh and try again.');
            $type=$input['type']??'';if(!in_array($type,['patch-panel','fiber-panel','wall-outlet','odf','coupler','splice-box','pdu','ups','cable-manager','passive','active'],true))throw new \InvalidArgumentException('Invalid infrastructure component type.');
            if(count($g['devices'])>=10000||count($g['ports'])+384>80000)throw new \InvalidArgumentException('Infrastructure size limit reached.');
            $name=trim(self::text($input['name']??'',120));if($name==='')throw new \InvalidArgumentException('Component name is required.');
            $image=self::text($input['image']??'',100);$count=$input['port_count']??0;if(!is_int($count)||$count<0||$count>192)throw new \InvalidArgumentException('Choose 0–192 physical ports.');
            $newId=fn()=>sprintf('%s-%s-4%s-a%s-%s',bin2hex(random_bytes(4)),bin2hex(random_bytes(2)),substr(bin2hex(random_bytes(2)),1),substr(bin2hex(random_bytes(2)),1),bin2hex(random_bytes(6)));
            $id='mm:device:'.$newId();$component=['id'=>$id,'source'=>'mormap','type'=>$type,'name'=>$name,'image'=>$image,'endpoint_role'=>$type==='active'?'active':'passive'];$g['devices'][$id]=$component;$paired=in_array($type,['patch-panel','fiber-panel','wall-outlet','odf','coupler','splice-box'],true);
            for($n=1;$n<=$count;$n++){$front='mm:port:'.$newId();$back=$paired?'mm:port:'.$newId():null;
                foreach($paired?['front'=>$front,'rear'=>$back]:['front'=>$front] as $face=>$ref){$g['ports'][$ref]=['id'=>$ref,'device_ref'=>$id,'source'=>'mormap','label'=>($paired?($face==='front'?'F':'R'):'P').$n,'kind'=>in_array($type,['pdu','ups'],true)?'power':(in_array($type,['fiber-panel','odf','splice-box'],true)?'fiber':'ethernet'),'face'=>$face,'position'=>$n,'peer_id'=>$paired?($face==='front'?$back:$front):null];}
            }
            $g['revision']++;$this->writeJson($this->dir.'/graph.json',$g);return ['device'=>$component,'infrastructure'=>$g];
        });
    }
    public function addPort(array $input,int $expected,?array $verifiedDevice=null): array
    {
        return $this->locked(function($g)use($input,$expected,$verifiedDevice){
            if($expected!==$g['revision'])throw new \UnexpectedValueException('Infrastructure changed. Reload before adding a physical port.');
            $paired=$input['paired']??false;if(!is_bool($paired))throw new \InvalidArgumentException('Invalid port arrangement.');
            if(count($g['ports'])+($paired?2:1)>80000)throw new \InvalidArgumentException('Infrastructure port limit reached.');
            $owner=$input['device_ref']??'';
            if(!isset($g['devices'][$owner])&&$verifiedDevice&&($verifiedDevice['id']??'')===$owner&&($verifiedDevice['source']??'')==='librenms'&&$owner==='lnms:device:'.($verifiedDevice['device_id']??'')){
                if(count($g['devices'])>=10000)throw new \InvalidArgumentException('Infrastructure equipment limit reached.');$g['devices'][$owner]=$verifiedDevice;
            }
            if(!isset($g['devices'][$owner]))throw new \InvalidArgumentException('Equipment does not exist.');
            $label=trim(self::text($input['label']??'',120));$kind=$input['kind']??'';
            if($label===''||!in_array($kind,['ethernet','sfp','sfp+','qsfp','management','console','power','fiber','stack'],true))throw new \InvalidArgumentException('Choose a port name and connector type.');
            $rearLabel=$paired?self::text($label.' / rear',120):null;
            foreach($g['ports'] as $p)if($p['device_ref']===$owner&&(strcasecmp($p['label'],$label)===0||($paired&&strcasecmp($p['label'],$rearLabel)===0)))throw new \InvalidArgumentException('A port with that name already exists on this equipment.');
            $newId=function(){$hex=bin2hex(random_bytes(16));return 'mm:port:'.substr($hex,0,8).'-'.substr($hex,8,4).'-4'.substr($hex,13,3).'-a'.substr($hex,17,3).'-'.substr($hex,20);};$id=$newId();$rear=$paired?$newId():null;
            $p=['id'=>$id,'device_ref'=>$owner,'source'=>'mormap','label'=>$label,'kind'=>$kind,'face'=>$paired?'front':'custom','peer_id'=>$rear];if(isset($input['stack_member']))$p['stack_member']=TopologySchema::member($input['stack_member']);$g['ports'][$id]=$p;
            if($kind==='stack'&&(!isset($input['stack_member'])||$paired))throw new \InvalidArgumentException('A Stack connector needs a member number and a single physical socket.');
            if($paired){$g['ports'][$rear]=['id'=>$rear,'device_ref'=>$owner,'source'=>'mormap','label'=>$rearLabel,'kind'=>$kind,'face'=>'rear','peer_id'=>$id];if(isset($p['stack_member']))$g['ports'][$rear]['stack_member']=$p['stack_member'];}$g['revision']++;
            $this->writeJson($this->dir.'/graph.json',$g);return ['port'=>$p,'rear_port'=>$paired?$g['ports'][$rear]:null,'infrastructure'=>$g];
        });
    }

    /** Atomic shared cables also connect ports whose drawings are in different plans. */
    public function changeConnection(array $input,int $expected,?string $id=null,bool $remove=false): array
    {
        return $this->locked(function($g)use($input,$expected,$id,$remove){
            if($expected!==$g['revision'])throw new \UnexpectedValueException('Infrastructure changed. Reload before changing this connection.');
            if($id!==null&&!isset($g['connections'][$id]))throw new \InvalidArgumentException('The connection no longer exists.');
            if($remove){$g['disconnected'][$id]=$g['connections'][$id];unset($g['connections'][$id]);}
            else{
                $old=$id===null?[]:$g['connections'][$id];$data=array_replace($old,$input);
                $a=$data['source']??'';$b=$data['target']??'';
                if(!is_string($a)||!is_string($b)||!isset($g['ports'][$a],$g['ports'][$b]))throw new \InvalidArgumentException('Choose two known infrastructure ports.');
                $expectedId=self::connectionId($a,$b);
                if($id!==null&&$expectedId!==$id)throw new \InvalidArgumentException('Disconnect a cable before changing its endpoints.');
                if($id===null&&isset($g['connections'][$expectedId]))return ['undo_token'=>null,'connection_id'=>$expectedId,'infrastructure'=>$g,'notice'=>'This exact connection already exists; its details were retained.'];
                if($id===null&&count($g['connections'])>=20000)throw new \InvalidArgumentException('Infrastructure connection limit reached.');
                if(array_key_exists('color',$input)&&$input['color']===null)unset($data['color']);
                $id=$this->connect($g,$a,$b,$data);
            }
            $g['revision']++;$token=(new UndoStore($this->root))->apply(['infrastructure/graph.json'=>$g],[],[],['connection_id'=>$id]);
            return ['undo_token'=>$token,'connection_id'=>$id,'infrastructure'=>$g];
        });
    }
    /** Follow cables and paired passive ports; never traverse a switch internally. */
    public static function relatedDevices(array $g,array $ids,array $refs=[]): array
    {
        $wanted=array_fill_keys(array_map(fn($id)=>'lnms:device:'.$id,array_filter($ids)),true);$adj=[];
        foreach(array_merge($g['connections'],$g['logical_connections']??[]) as $c){$adj[$c['source']][]=$c['target'];$adj[$c['target']][]=$c['source'];}
        foreach($g['ports'] as $ref=>$p){if(isset($wanted[$p['device_ref']]))$refs[]=$ref;
            $peer=$p['peer_id']??null;if($peer&&($g['ports'][$peer]['peer_id']??null)===$ref&&($g['ports'][$peer]['device_ref']??null)===$p['device_ref'])$adj[$ref][]=$peer;
        }
        $seen=[];$out=array_fill_keys(array_map('intval',array_filter($ids)),true);
        while($refs){$ref=array_pop($refs);if(isset($seen[$ref]))continue;$seen[$ref]=true;$p=$g['ports'][$ref]??null;
            if(!$p)continue;$device=$g['devices'][$p['device_ref']]??[];if(!empty($device['device_id']))$out[(int)$device['device_id']]=true;
            foreach($adj[$ref]??[] as $next)if(!isset($seen[$next]))$refs[]=$next;
        }
        return array_keys($out);
    }

    public function saveGroups(string $owner,array $groups,int $expected,array $verifiedPorts=[],?array $verifiedDevice=null): array
    {
        return $this->locked(function($g)use($owner,$groups,$expected,$verifiedPorts,$verifiedDevice){
            if($expected!==$g['revision'])throw new \UnexpectedValueException('Infrastructure changed. Reload the groups before saving.');
            if(!isset($g['devices'][$owner])&&($verifiedDevice['id']??null)===$owner)$g['devices'][$owner]=$verifiedDevice;
            if(!isset($g['devices'][$owner]))throw new \InvalidArgumentException('Device no longer exists.');
            if(count($groups)>128)throw new \InvalidArgumentException('Maximum 128 port groups per device.');
            $out=[];$used=[];$names=[];
            foreach($groups as $raw){$group=TopologySchema::group($raw);if(isset($out[$group['id']])||isset($names[strtolower($group['name'])]))throw new \InvalidArgumentException('Group IDs and names must be unique.');$names[strtolower($group['name'])]=true;
                foreach(array_filter([...$group['ports'],$group['aggregate']]) as $ref){
                    if(isset($verifiedPorts[$ref])){$v=$verifiedPorts[$ref];if('lnms:device:'.$v['device_id']!==$owner)throw new \InvalidArgumentException('Group port belongs to another device.');$this->registerPort($g,$ref,$owner,['port_id'=>$v['port_id'],'label'=>$v['ifName']?:$v['ifDescr']]);}
                    if(($g['ports'][$ref]['device_ref']??null)!==$owner)throw new \InvalidArgumentException('Group port belongs to another device or was removed.');
                }
                foreach($group['ports'] as $ref){if(isset($used[$ref]))throw new \InvalidArgumentException('A physical port can belong to one aggregation group.');$used[$ref]=true;}
                $out[$group['id']]=$group;
            }
            $g['devices'][$owner]['port_groups']=$out;$g['revision']++;$token=(new UndoStore($this->root))->apply(['infrastructure/graph.json'=>$g],[],[],['device_ref'=>$owner]);return ['undo_token'=>$token,'infrastructure'=>$g];
        });
    }

}
