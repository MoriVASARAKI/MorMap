<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Framework-independent shape and relationship validation for physical plans. */
final class PhysicalMapSchema
{
    public static function empty(string $name): array
    {
        return ['schema' => 1, 'kind' => 'physical', 'name' => $name,
            'canvas' => ['width' => 1920, 'height' => 1080], 'locations' => [], 'equipment' => [], 'shapes' => [], 'cables' => []];
    }

    public static function validate(array $input): array
    {
        self::expect(($input['schema'] ?? null) === 1 && ($input['kind'] ?? null) === 'physical', 'Unsupported physical plan schema.');
        $map = self::empty(self::text($input['name'] ?? null, 120, 'Plan name', true));
        $map['revision'] = self::integer($input['revision'] ?? null, 1, PHP_INT_MAX, 'Revision');
        $map['canvas'] = self::canvas($input['canvas'] ?? null);
        $map['infrastructure_revision'] = self::integer($input['infrastructure_revision'] ?? 0, 0, PHP_INT_MAX, 'Infrastructure revision');
        $map['disconnect'] = array_map(fn($id)=>self::uuid($id),self::collection($input['disconnect']??[],2000,'Disconnected cables'));
        $map['comment'] = self::text($input['comment'] ?? '', 4000, 'Plan comment');
        $map['remote_infos']=[];
        self::expect(is_array($input['remote_infos']??[])&&count($input['remote_infos']??[])<=2000,'Too many pinned remote cables.');
        foreach($input['remote_infos']??[] as $id=>$contexts){self::uuid($id);self::expect(is_array($contexts)&&count($contexts)<=502,'Too many remote information views.');
            foreach($contexts as $context=>$enabled){self::expect(is_string($context)&&(bool)preg_match('/^(?:location|cabling):(?:root|[a-f0-9-]{36})$/D',$context)&&is_bool($enabled),'Invalid remote information context.');$map['remote_infos'][$id][$context]=$enabled;}
        }
        $seen = []; $locations = []; $devices = []; $ports = [];
        foreach (self::collection($input['locations'] ?? null, 500, 'Locations') as $raw) {
            $item = self::box($raw, $seen);
            $type = $raw['type'] ?? '';
            self::expect(in_array($type, ['site', 'building', 'floor', 'room', 'rack'], true), 'Invalid location type.');
            $item['type'] = $type;
            if (isset($raw['background'])) { self::expect(in_array($type, ['site','building','floor','room'], true), 'Backgrounds belong to a site, building, floor or server room.'); $item['background'] = FloorBackground::validate($raw['background']); }
            $item['name'] = self::text($raw['name'] ?? null, 120, 'Location name', true);
            $item['canvas'] = self::canvas($raw['canvas'] ?? ['width' => 1920, 'height' => 1080]);
            $meta = $raw['metadata'] ?? [];
            self::expect(is_array($meta), 'Invalid location metadata.');
            $item['metadata'] = [];
            foreach (['address' => 500, 'notes' => 4000, 'owner' => 200, 'reference' => 120, 'floor_label' => 80, 'model' => 160] as $key => $limit) {
                $item['metadata'][$key] = self::text($meta[$key] ?? '', $limit, $key);
            }
            foreach (['latitude' => [-90, 90], 'longitude' => [-180, 180]] as $key => $range) {
                $item['metadata'][$key] = isset($meta[$key]) && $meta[$key] !== '' ? self::number($meta[$key], $range[0], $range[1], $key) : null;
            }
            $item['metadata']['capacity'] = $type === 'rack' ? self::integer($meta['capacity'] ?? 42, 1, 60, 'Rack capacity') : 42;
            $item['color'] = self::color($raw['color'] ?? '#c8e8f4');
            $locations[$item['id']] = $item;
            $map['locations'][] = $item;
        }
        $parents = ['site' => null, 'building' => 'site', 'floor' => 'building', 'room' => 'floor', 'rack' => 'room'];
        foreach ($locations as $item) {
            $parent = $item['parent_id'];
            if ($item['type'] === 'site') {
                self::expect($parent === null, 'A site must be at the plan root.');
            } else {
                self::expect($parent !== null && isset($locations[$parent]) && $locations[$parent]['type'] === $parents[$item['type']], 'Location hierarchy must follow site, building, floor, room, rack.');
            }
        }
        $allocations = [];
        foreach (self::collection($input['equipment'] ?? null, 500, 'Equipment') as $raw) {
            $item = self::box($raw, $seen);
            self::expect($item['parent_id'] !== null && isset($locations[$item['parent_id']]), 'Equipment needs an existing location.');
            $item['device_id'] = isset($raw['device_id']) ? self::integer($raw['device_id'],1,PHP_INT_MAX,'Device ID') : null;
            $item['object_id'] = $item['device_id'] ? 'lnms:device:'.$item['device_id'] : self::reference($raw['object_id']??null,'device');
            if(isset($raw['stack_member']))$item['stack_member']=TopologySchema::member($raw['stack_member']);
            if(isset($raw['profile_revision']))$item['profile_revision']=self::integer($raw['profile_revision'],0,PHP_INT_MAX,'Profile revision');
            if(isset($raw['hidden_ports']))$item['hidden_ports']=array_map(fn($v)=>self::reference($v,'port',true),self::collection($raw['hidden_ports'],4000,'Hidden ports'));
            $item['width_mm'] = self::number($raw['width_mm']??482.6,50,482.6,'Equipment width');
            $item['rack_align'] = $raw['rack_align']??'center';self::expect(in_array($item['rack_align'],['left','center','right'],true),'Invalid rack alignment.');
            $item['label'] = self::text($raw['label'] ?? null, 120, 'Equipment name', true);
            $item['image'] = self::text($raw['image'] ?? null, 100, 'Image ID', true);
            self::expect((bool) preg_match('/^(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|(?:symbol|stencil|logo)-[a-z0-9_-]{1,80})$/D', $item['image']), 'Invalid image ID.');
            $item['image_width'] = self::number($raw['image_width'] ?? $item['w'], .001, 100000, 'Image width');
            $item['image_height'] = self::number($raw['image_height'] ?? $item['h'], .001, 100000, 'Image height');
            if (array_key_exists('appearance',$raw)) $item['appearance']=ObjectFormat::validate($raw['appearance']);
            $item['image_fit'] = $raw['image_fit'] ?? 'contain';
            self::expect(in_array($item['image_fit'], ['contain', 'stretch'], true), 'Invalid image fit.');
            $item['notes'] = self::text($raw['notes'] ?? '', 4000, 'Equipment notes');
            $item['rack_u'] = self::integer($raw['rack_u'] ?? 1, 1, 60, 'First rack U');
            $item['rack_units'] = self::integer($raw['rack_units'] ?? 1, 1, 60, 'Equipment rack height');
            $parent = $locations[$item['parent_id']];
            if ($parent['type'] === 'rack') {
                $end = $item['rack_u'] + $item['rack_units'] - 1;
                self::expect($end <= $parent['metadata']['capacity'], 'Equipment exceeds rack capacity.');
                for ($u = $item['rack_u']; $u <= $end; $u++) {
                    $key = $parent['id'] . ':' . $u;
                    self::expect(!isset($allocations[$key]), 'Two devices occupy the same rack U.');
                    $allocations[$key] = true;
                }
            }
            $item['ports'] = [];
            foreach (self::collection($raw['ports'] ?? [], 4000, 'Equipment ports') as $port) {
                self::expect(is_array($port), 'Invalid port.');
                $id = isset($port['port_id']) ? self::integer($port['port_id'],1,PHP_INT_MAX,'Port ID') : null;
                $ref=$id?'lnms:port:'.$id:self::reference($port['port_ref']??null,'port');
                self::expect(!isset($ports[$ref]), 'A port appears more than once in this plan.');
                $ports[$ref] = true;
                $item['ports'][] = ['port_id' => $id, 'port_ref'=>$ref, 'label' => self::text($port['label'] ?? '', 255, 'Port label'),
                    'x' => self::number($port['x'] ?? null, 0, 1, 'Port X'), 'y' => self::number($port['y'] ?? null, 0, 1, 'Port Y'),
                    'comment' => self::text($port['comment'] ?? '', 4000, 'Connection-point comment')]+self::commentBoxes($port);
            }
            self::expect(count($ports) <= 12000, 'Too many mapped ports in this plan.');
            $map['equipment'][] = $item;
        }
        TopologySchema::placements($map['equipment']);
        $equipmentIds=array_column($map['equipment'],null,'id');
        self::expect(is_array($input['cabling_positions']??[])&&count($input['cabling_positions']??[])<=502,'Too many cabling contexts.');
        foreach($input['cabling_positions']??[] as $context=>$positions){
            self::expect(is_string($context)&&str_starts_with($context,'cabling:')&&($context==='cabling:root'||isset($locations[substr($context,8)])),'Invalid cabling position context.');
            self::expect(is_array($positions)&&count($positions)<=500,'Too many cabling positions.');
            foreach($positions as $equipment=>$position){
                self::expect(isset($equipmentIds[$equipment])&&is_array($position),'Unknown equipment in cabling positions.');
                $map['cabling_positions'][$context][$equipment]=['x'=>self::number($position['x']??null,-100000,100000,'Cabling X'),'y'=>self::number($position['y']??null,-100000,100000,'Cabling Y')];
            }
        }
        foreach (self::collection($input['shapes'] ?? null, 2000, 'Shapes') as $raw) {
            $item = self::box($raw, $seen);
            self::expect($item['parent_id'] === null || isset($locations[$item['parent_id']]), 'Shape has an unknown location.');
            $item['type'] = $raw['type'] ?? '';
            self::expect(in_array($item['type'], ['rectangle', 'ellipse', 'line', 'polygon', 'text'], true), 'Invalid drawing type.');
            $item['text'] = self::text($raw['text'] ?? '', 2000, 'Shape text');
            $item['fill'] = self::color($raw['fill'] ?? '#e5eef4', true);
            $item['stroke'] = self::color($raw['stroke'] ?? '#5e7890');
            $item['stroke_width'] = self::number($raw['stroke_width'] ?? 2, 0, 20, 'Stroke width');
            $item['font_size'] = self::number($raw['font_size'] ?? 20, 8, 160, 'Font size');
            $item['points'] = [];
            foreach (self::collection($raw['points'] ?? [], 200, 'Shape points') as $point) {
                self::expect(is_array($point), 'Invalid shape point.');
                $item['points'][] = ['x' => self::number($point['x'] ?? null, 0, 1, 'Shape point X'), 'y' => self::number($point['y'] ?? null, 0, 1, 'Shape point Y')];
            }
            self::expect($item['type'] !== 'polygon' || count($item['points']) >= 3, 'A polygon needs three or more points.');
            self::expect($item['type'] !== 'line' || count($item['points']) === 2, 'A line needs two endpoints.');
            $map['shapes'][] = $item;
        }
        foreach(self::collection($input['cables']??[],2000,'Cables') as $raw){
            self::expect(is_array($raw),'Invalid physical cable.');$c=['id'=>self::uuid($raw['id']??null),'source'=>self::reference($raw['source']??null,'port',true),'target'=>self::reference($raw['target']??null,'port',true),'paths'=>[],'infos'=>[],'name'=>self::text($raw['name']??'',120,'Cable name'),'comment'=>self::text($raw['comment']??'',4000,'Cable comment'),'kind'=>$raw['kind']??'cable'];
            self::expect(isset($ports[$c['source']],$ports[$c['target']])&&$c['source']!==$c['target'],'Physical cable ports must be placed in this plan.');
            if(isset($raw['connection_id']))$c['connection_id']=self::uuid($raw['connection_id']);
            if(isset($raw['color']))$c['color']=self::color($raw['color']);
            self::expect(in_array($c['kind'],['cable','copper','fiber','power','building','stack','backbone'],true),'Invalid cable kind.');
            if(isset($raw['media']))$c['media']=TopologySchema::media($raw['media']);
            self::expect(is_array($raw['connectors']??[])&&count($raw['connectors']??[])<=502,'Too many connector styles.');$c['connectors']=[];
            foreach($raw['connectors']??[] as $context=>$style){self::expect((bool)preg_match('/^(?:location|cabling):(?:root|[a-f0-9-]{36})$/D',$context)&&in_array($style,['right-angle','straight','curved'],true),'Invalid connector style.');$c['connectors'][$context]=$style;}
            if(array_key_exists('formats',$raw)){self::expect(is_array($raw['formats'])&&count($raw['formats'])<=502,'Too many cable formats.');$c['formats']=[];foreach($raw['formats'] as $context=>$format){self::expect((bool)preg_match('/^(?:location|cabling):(?:root|[a-f0-9-]{36})$/D',$context),'Invalid cable format context.');$c['formats'][$context]=CableFormat::validate($format);}}
            self::expect(is_array($raw['paths']??[])&&count($raw['paths']??[])<=502,'Too many cable views.');
            foreach($raw['paths']??[] as $context=>$path){self::expect((bool)preg_match('/^(?:location|cabling):(?:root|[a-f0-9-]{36})$/D',$context),'Invalid cable context.');$points=[];
                foreach(self::collection($path,100,'Cable path') as $point){self::expect(is_array($point),'Invalid cable point.');$points[]=['x'=>self::number($point['x']??null,-100000,100000,'Cable X'),'y'=>self::number($point['y']??null,-100000,100000,'Cable Y')];}
                $style=$c['connectors'][$context]??'right-angle';self::expect(count($points)>=2&&($style!=='straight'||count($points)===2)&&($style!=='curved'||count($points)===4),'Invalid connector geometry.');for($i=1;$style==='right-angle'&&$i<count($points);$i++)self::expect(abs($points[$i]['x']-$points[$i-1]['x'])<.01||abs($points[$i]['y']-$points[$i-1]['y'])<.01,'Cable path must be orthogonal.');$c['paths'][$context]=$points;
            }
            self::expect(is_array($raw['infos']??[])&&count($raw['infos']??[])<=502,'Invalid cable information positions.');foreach($raw['infos']??[] as $key=>$position){self::expect((bool)preg_match('/^(?:location|cabling):(?:root|[a-f0-9-]{36})$/D',$key)&&is_array($position),'Invalid information context.');$c['infos'][$key]=['x'=>self::number($position['x']??null,-100000,100000,'Info X'),'y'=>self::number($position['y']??null,-100000,100000,'Info Y')];if(isset($position['font_size']))$c['infos'][$key]['font_size']=self::number($position['font_size'],4,32,'Info text size');if(isset($position['attachment'])){$a=$position['attachment'];self::expect(is_array($a),'Invalid info attachment.');$c['infos'][$key]['attachment']=['fraction'=>self::number($a['fraction']??null,0,1,'Info cable fraction'),'dx'=>self::number($a['dx']??null,-200000,200000,'Info offset X'),'dy'=>self::number($a['dy']??null,-200000,200000,'Info offset Y')];}}
            $map['cables'][]=$c+self::commentBoxes($raw);
        }
        if (array_key_exists('vm_groups',$input)) $map['vm_groups']=VirtualizationLayout::validate($input['vm_groups']);
        return $map;
    }
    private static function reference(mixed $value,string $kind,bool $native=false): string
    {
        self::expect(is_string($value)&&(preg_match('/^mm:'.$kind.':[a-f0-9-]{36}$/D',$value)||($native&&preg_match('/^lnms:'.$kind.':[1-9][0-9]*$/D',$value))),'Invalid infrastructure '.$kind.' reference.');return $value;
    }

    private static function box(mixed $raw, array &$seen): array
    {
        self::expect(is_array($raw), 'Invalid plan item.');
        $id = self::uuid($raw['id'] ?? null);
        self::expect(!isset($seen[$id]), 'Plan item IDs must be unique.'); $seen[$id] = true;
        $parent = $raw['parent_id'] ?? null;
        return ['id' => $id, 'parent_id' => $parent === null ? null : self::uuid($parent),
            'x' => self::number($raw['x'] ?? null, -100000, 100000, 'X'), 'y' => self::number($raw['y'] ?? null, -100000, 100000, 'Y'),
            'w' => self::number($raw['w'] ?? null, 1, 16384, 'Width'), 'h' => self::number($raw['h'] ?? null, 1, 16384, 'Height'),
            'rotation' => self::number($raw['rotation'] ?? 0, -360, 360, 'Rotation'),
            'comment' => self::text($raw['comment'] ?? '', 4000, 'Comment')]+self::commentBoxes($raw);
    }
    private static function commentBoxes(array $raw): array
    {
        if(!isset($raw['comment_boxes']))return [];
        self::expect(is_array($raw['comment_boxes'])&&count($raw['comment_boxes'])<=502,'Invalid comment positions.');$boxes=[];
        foreach($raw['comment_boxes'] as $context=>$p){
            self::expect(is_string($context)&&(bool)preg_match('/^(?:location|cabling):(?:root|[a-f0-9-]{36})$/D',$context)&&is_array($p),'Invalid comment context.');
            $boxes[$context]=['x'=>self::number($p['x']??null,-100000,100000,'Comment X'),'y'=>self::number($p['y']??null,-100000,100000,'Comment Y')];
        }
        return ['comment_boxes'=>$boxes];
    }
    private static function canvas(mixed $raw): array
    {
        self::expect(is_array($raw), 'Invalid canvas.');
        return ['width' => self::integer($raw['width'] ?? null, 320, 16384, 'Canvas width'), 'height' => self::integer($raw['height'] ?? null, 240, 16384, 'Canvas height')];
    }
    private static function collection(mixed $value, int $max, string $label): array
    {
        self::expect(is_array($value) && array_is_list($value) && count($value) <= $max, $label . ' must be a bounded list.');
        return $value;
    }
    private static function text(mixed $value, int $max, string $label, bool $required = false): string
    {
        self::expect(is_string($value) && strlen($value) <= $max * 4 && preg_match('//u', $value) === 1, 'Invalid ' . $label . '.');
        self::expect(!$required || trim($value) !== '', $label . ' is required.');
        self::expect((function_exists('mb_strlen') ? mb_strlen($value) : strlen($value)) <= $max, $label . ' is too long.');
        return $value;
    }
    private static function number(mixed $value, float $min, float $max, string $label): float|int
    {
        self::expect((is_int($value) || is_float($value)) && is_finite((float) $value) && $value >= $min && $value <= $max, 'Invalid ' . $label . '.');
        return $value;
    }
    private static function integer(mixed $value, int $min, int $max, string $label): int
    {
        self::expect(is_int($value) && $value >= $min && $value <= $max, 'Invalid ' . $label . '.'); return $value;
    }
    private static function uuid(mixed $value): string
    {
        self::expect(is_string($value) && (bool) preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', $value), 'Invalid plan item ID.'); return $value;
    }
    private static function color(mixed $value, bool $transparent = false): string
    {
        self::expect(is_string($value) && (($transparent && $value === 'none') || preg_match('/^#[a-fA-F0-9]{6}$/D', $value)), 'Invalid drawing color.'); return $value;
    }
    private static function expect(bool $condition, string $message): void
    {
        if (!$condition) { throw new \InvalidArgumentException($message); }
    }
}
