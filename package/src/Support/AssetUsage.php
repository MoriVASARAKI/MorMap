<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;
use PortMap\LibreNMS\Storage\InfrastructureStore;
use PortMap\LibreNMS\Storage\WorkspaceTransaction;

/** References include drafts, published snapshots and the reusable infrastructure. */
final class AssetUsage
{
    public function __construct(private string $root, private AssetLibrary $library) {}
    private function documents(): array
    {
        $graph=(new InfrastructureStore($this->root))->snapshot();$documents=[];
        foreach (['maps','published','physical/maps','physical/published'] as $folder) foreach (glob($this->root.'/'.$folder.'/*.json')?:[] as $path) {
            $documents[$folder.'/'.basename($path)]=json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
        }
        ksort($documents);$documents['infrastructure/graph.json']=$graph;return $documents;
    }
    private function scan(string $id, array $documents): array
    {
        $uses=[];$ports=[];
        $add=function(array $device,array $positions,array $where) use(&$uses,&$ports) {
            $ref=InfrastructureStore::deviceRef($device);$where+=['device_ref'=>$ref,'label'=>$device['label']??$device['name']??$ref];$uses[]=$where;
            foreach($positions as $p){$key=InfrastructureStore::portRef($p);if(!isset($ports[$key]))$ports[$key]=['ref'=>$key,'device_ref'=>$ref,'device_label'=>$where['label'],'stack_member'=>$device['stack_member']??null,'label'=>$p['label'],'x'=>$p['x'],'y'=>$p['y']];}
        };
        foreach($documents as $path=>$map){
            if($path==='infrastructure/graph.json'){
                foreach($map['devices'] as $d){
                    $profiles=$d['profiles']??[];if(!$profiles&&isset($d['presentation']))$profiles=['main'=>$d['presentation']];
                    $matched=false;foreach($profiles as $key=>$profile)if(($profile['image']??null)===$id){$matched=true;$add($d+['object_id'=>$d['id'],'stack_member'=>str_starts_with($key,'member:')?(int)substr($key,7):null],$profile['ports']??[],['workspace'=>'infrastructure','map_name'=>'Shared infrastructure · '.$key,'map_id'=>null,'published'=>false]);}
                    if(!$matched&&($d['image']??null)===$id)$add($d+['object_id'=>$d['id']],[],['workspace'=>'infrastructure','map_name'=>'Shared infrastructure','map_id'=>null,'published'=>false]);
                }continue;
            }
            $physical=str_starts_with($path,'physical/');
            if ($physical) foreach ($map['locations'] ?? [] as $location) if (($location['background']['image'] ?? null) === $id) $uses[] = ['workspace'=>'physical','map_id'=>$map['id'],'map_name'=>$map['name'].' · '.$location['name'].' background','published'=>str_contains($path,'published/'),'device_ref'=>null,'label'=>$location['name']];
            foreach($map[$physical?'equipment':'nodes']??[] as $d)if($d['image']===$id){
                $positions=$physical?($d['ports']??[]):array_values(array_filter($map['anchors'],fn($a)=>$a['node_id']===$d['id']));
                $add($d,$positions,['workspace'=>$physical?'physical':'logical','map_id'=>$map['id'],'map_name'=>$map['name'],'published'=>str_contains($path,'published/')]);
            }
        }
        $asset=$this->library->get($id);if(!$asset)throw new \InvalidArgumentException('The asset no longer exists.');
        return ['id'=>$id,'deletable'=>$asset['deletable'],'uses'=>$uses,'ports'=>array_values($ports),'token'=>hash('sha256',json_encode([$id,$asset['meta_revision'],$documents],JSON_THROW_ON_ERROR))];
    }
    public function usage(string $id): array {return $this->scan($id,$this->documents());}
    public function delete(string $id,string $token): array
    {
        $usage=$this->usage($id);$this->check($usage,$token);
        if(!$usage['deletable'])throw new \InvalidArgumentException('LibreNMS system logos cannot be deleted.');
        if($usage['uses'])throw new \InvalidArgumentException('This image is in use. Replace its usages before deleting it.');
        $remove=$this->library->removal($id);
         $token=(new \PortMap\LibreNMS\Storage\UndoStore($this->root))->apply($remove['writes'],$remove['deletes'],[],['asset_id'=>$id]);
        return ['deleted'=>true,'undo_token'=>$token];
    }
    private function check(array $usage,string $token): void
    {
        if(!hash_equals($usage['token'],$token))throw new \UnexpectedValueException('Maps or image metadata changed. Refresh the usage preview before continuing.');
    }
    public function replace(string $id,string $replacement,string $token,int $revision,array $positions,bool $delete): array
    {
        if($id===$replacement)throw new \InvalidArgumentException('Choose a different replacement image.');
        $documents=$this->documents();$usage=$this->scan($id,$documents);$this->check($usage,$token);
        $asset=$this->library->get($replacement);if(!$asset)throw new \InvalidArgumentException('The replacement image no longer exists.');
        if($asset['meta_revision']!==$revision)throw new \UnexpectedValueException('The replacement stencil changed. Refresh the preview.');
        if($delete&&!$usage['deletable'])throw new \InvalidArgumentException('LibreNMS system logos cannot be deleted.');
        $bound=[];$seen=[];
        foreach($usage['ports'] as $p){
            $pos=$positions[$p['ref']]??null;
            if(!is_array($pos))throw new \InvalidArgumentException('Review and map every existing connection point.');
            foreach(['x','y'] as $axis)if(!isset($pos[$axis])||!is_numeric($pos[$axis])||!is_finite((float)$pos[$axis])||$pos[$axis]<0||$pos[$axis]>1)throw new \InvalidArgumentException('Connection positions must lie inside the replacement image.');
            $point=['x'=>(float)$pos['x'],'y'=>(float)$pos['y']];
            $key=$p['device_ref'].':'.($p['stack_member']??'main').':'.sprintf('%.7f,%.7f',$point['x'],$point['y']);
            if(isset($seen[$key]))throw new \InvalidArgumentException('Two ports on the same device cannot use the same replacement position.');
            $seen[$key]=true;$bound[$p['ref']]=$point;
        }
        $updatePorts=function(array &$ports)use($bound){foreach($ports as &$p){$ref=InfrastructureStore::portRef($p);if(isset($bound[$ref])){$p['x']=$bound[$ref]['x'];$p['y']=$bound[$ref]['y'];}}unset($p);};
        $writes=[];$count=0;
        foreach($documents as $path=>$map){
            $changed=false;
            if($path==='infrastructure/graph.json'){
                foreach($map['devices'] as &$d){foreach($d['profiles']??[] as $key=>$profile)if(($profile['image']??null)===$id){$profile['image']=$replacement;$profile['image_width']=$asset['width'];$profile['image_height']=$asset['height'];$profile['revision']=($profile['revision']??0)+1;$updatePorts($profile['ports']);$d['profiles'][$key]=$profile;$changed=true;}if(($d['image']??null)===$id){$d['image']=$replacement;$changed=true;}if(($d['presentation']['image']??null)===$id){$d['presentation']['image']=$replacement;$updatePorts($d['presentation']['ports']);$changed=true;}}unset($d);
                // Stale open editors must reload before saving an old image reference.
                $map['revision']++;$writes[$path]=$map;continue;
            }
            $physical=str_starts_with($path,'physical/');$key=$physical?'equipment':'nodes';
            foreach($map[$key] as &$d)if($d['image']===$id){
                $d['image']=$replacement;$changed=true;$count++;
                if($physical){$d['image_width']=$asset['width'];$d['image_height']=$asset['height'];$updatePorts($d['ports']);}
                else foreach($map['anchors'] as &$a)if($a['node_id']===$d['id']){$ref=InfrastructureStore::portRef($a);if(isset($bound[$ref])){$a['x']=$bound[$ref]['x'];$a['y']=$bound[$ref]['y'];}}unset($a);
            }unset($d);
            if ($physical) foreach ($map['locations'] ?? [] as $index=>$location) if (($location['background']['image'] ?? null) === $id) {
                if (!in_array($asset['mime'], ['image/png','image/jpeg','image/svg+xml'], true)) throw new \InvalidArgumentException('A floor background needs a PNG, JPG or SVG replacement.');
                $map['locations'][$index]['background']['image']=$replacement;$changed=true;$count++;
            }
            if(!$changed)continue;
            if(!$physical){$nodes=array_column($map['nodes'],null,'id');$anchors=array_column($map['anchors'],null,'id');$point=static function($id)use($nodes,$anchors){$a=$anchors[$id];$n=$nodes[$a['node_id']];return ['x'=>$n['x']+$n['w']*$a['x'],'y'=>$n['y']+$n['h']*$a['y']];};foreach($map['links'] as &$link)$link['points']=self::attach($link['points'],$point($link['source']),$point($link['target']));unset($link);}
            $map['revision']++;$map['updated_at']=gmdate('c');$writes[$path]=$map;
        }
        $remove=$delete?$this->library->removal($id):['writes'=>[],'deletes'=>[]];
        $undo=(new \PortMap\LibreNMS\Storage\UndoStore($this->root))->apply($writes+$remove['writes'],$remove['deletes'],[],['asset_id'=>$id]);
        return ['undo_token'=>$undo,'replaced'=>$count,'deleted'=>$delete,'message'=>'Image replaced across drafts, published maps and shared equipment. Reload other open maps.'];
    }
    private static function attach(array $points,array $start,array $end): array
    {
        $last=count($points)-1;
        $horizontal=static function(int $index)use($points){for($distance=0;$distance<count($points);$distance++)foreach([$index-$distance,$index+$distance] as $i){if($i<0||$i>=count($points)-1)continue;$dx=abs($points[$i]['x']-$points[$i+1]['x']);$dy=abs($points[$i]['y']-$points[$i+1]['y']);if($dx<.001&&$dy<.001)continue;$h=$dy<.001;return abs($i-$index)%2?!$h:$h;}return $index%2===0;};
        if($last<=2){if(abs($start['x']-$end['x'])<.001||abs($start['y']-$end['y'])<.001)return [$start,$end];return [$start,$horizontal(0)?['x'=>$end['x'],'y'=>$start['y']]:['x'=>$start['x'],'y'=>$end['y']],$end];}
        $firstH=$horizontal(0);$lastH=$horizontal($last-1);$points[0]=$start;$points[$last]=$end;
        $points[1][$firstH?'y':'x']=$start[$firstH?'y':'x'];$points[$last-1][$lastH?'y':'x']=$end[$lastH?'y':'x'];return $points;
    }
}
