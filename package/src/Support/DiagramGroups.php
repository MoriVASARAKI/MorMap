<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Optional map presentation. Never merged into the shared infrastructure graph. */
final class DiagramGroups
{
    private static function expect(bool $ok, string $message): void
    {
        if (!$ok) throw new \InvalidArgumentException($message);
    }

    private static function uuid(mixed $value): string
    {
        self::expect(is_string($value) && (bool) preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D', $value), 'Invalid group or member ID.');
        return $value;
    }

    private static function number(mixed $value, float $min=-100000, float $max=100000): int|float
    {
        self::expect((is_int($value)||is_float($value)) && is_finite((float) $value) && $value >= $min && $value <= $max, 'Invalid group geometry.');
        return $value;
    }

    private static function route(mixed $points): array
    {
        self::expect(is_array($points) && array_is_list($points) && count($points)>=2 && count($points)<=100, 'Routes need 2–100 points.');
        $out=[];
        foreach ($points as $p) {
            self::expect(is_array($p), 'Invalid route point.');
            $p=['x'=>self::number($p['x']??null),'y'=>self::number($p['y']??null)];
            $last=end($out);
            self::expect(!$last || abs($p['x']-$last['x'])<.01 || abs($p['y']-$last['y'])<.01, 'Group routes must be orthogonal.');
            $out[]=$p;
        }
        return $out;
    }

    private static function context(mixed $value, array $map): bool
    {
        self::expect(is_string($value) && (bool) preg_match('/^(?:logical|(?:location|cabling):(?:root|[a-f0-9-]{36}))$/D', $value), 'Invalid group context.');
        if (isset($map['nodes'])) return $value === 'logical';
        if ($value === 'logical') return false;
        $id=explode(':', $value, 2)[1];
        return $id === 'root' || in_array($id, array_column($map['locations']??[], 'id'), true);
    }

    public static function validate(array $input, array $map): array
    {
        $out=[];
        foreach (['clusters','ducts'] as $key) {
            if (!array_key_exists($key, $input)) continue;
            $list=$input[$key];
            self::expect(is_array($list) && array_is_list($list) && count($list)<=500, 'Too many or invalid diagram groups.');
            $out[$key]=[]; $ids=[]; $used=[];
            $valid=array_column($map[$key==='clusters'?(isset($map['nodes'])?'nodes':'equipment'):(isset($map['nodes'])?'links':'cables')]??[], 'id');
            foreach ($list as $g) {
                self::expect(is_array($g), 'Invalid diagram group.');
                $id=self::uuid($g['id']??null);
                self::expect(!isset($ids[$id]), 'Duplicate diagram group ID.'); $ids[$id]=true;
                $keep=self::context($g['context']??null, $map);
                self::expect(is_string($g['name']??null) && trim($g['name'])!=='' && mb_strlen($g['name'])<=120, 'Group names need 1–120 characters.');
                self::expect(is_string($g['color']??null) && (bool) preg_match('/^#[a-fA-F0-9]{6}$/D', $g['color']), 'Invalid group color.');
                self::expect(is_array($g['members']??null) && array_is_list($g['members']) && count($g['members'])<=2000, 'Invalid group members.');
                $members=[];
                foreach ($g['members'] as $member) {
                    $member=self::uuid($member);
                    if (!in_array($member,$valid,true) || !$keep) continue; // Deleted placements cannot strand the map.
                    $membership=$g['context'].':'.$member;
                    self::expect(!isset($used[$membership]), 'A placement or cable belongs to one group per view.');
                    $used[$membership]=true; $members[]=$member;
                }
                $row=['id'=>$id,'context'=>$g['context'],'name'=>trim($g['name']),'color'=>$g['color'],'members'=>$members];
                $flag=$key==='clusters'?'collapsed':'expanded';
                self::expect(is_bool($g[$flag]??null), 'Invalid diagram group display flag.'); $row[$flag]=$g[$flag];
                if ($key==='clusters') {
                    $icon=$g['icon']??null;
                    self::expect(is_string($icon) && (in_array($icon,['proxmox','hyperv','esxi','kvm','other','none'],true) || (bool) preg_match('/^asset:(?:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}|(?:symbol|stencil|logo)-[a-z0-9_-]{1,80})$/D', $icon)), 'Choose a cluster icon from the presets or Asset Library.');
                    $row['icon']=$icon;
                    if (array_key_exists('frame',$g)) {
                        self::expect(is_array($g['frame']), 'Invalid cluster frame.'); $f=$g['frame'];
                        $row['frame']=['x'=>self::number($f['x']??null),'y'=>self::number($f['y']??null),'w'=>self::number($f['w']??null,220),'h'=>self::number($f['h']??null,100)];
                    }
                    if (array_key_exists('compact',$g)) {
                        self::expect(is_array($g['compact']), 'Invalid collapsed cluster frame.'); $f=$g['compact'];
                        $row['compact']=['w'=>self::number($f['w']??null,220),'h'=>self::number($f['h']??null,64)];
                    }
                    if (array_key_exists('routes',$g)) {
                        self::expect(is_array($g['routes']) && count($g['routes'])<=2000, 'Too many cluster routes.'); $row['routes']=[];
                        $cables=array_column($map[isset($map['nodes'])?'links':'cables']??[],'id');
                        foreach ($g['routes'] as $cable=>$points) {self::uuid($cable);$route=self::route($points);if(in_array($cable,$cables,true))$row['routes'][$cable]=$route;}
                    }
                } else {
                    $row['width']=self::number($g['width']??null,6,24);
                    if (array_key_exists('branches',$g)) {
                        self::expect(is_array($g['branches']) && count($g['branches'])<=4000, 'Too many duct branches.'); $row['branches']=[];
                        foreach ($g['branches'] as $branchKey=>$points) {
                            self::expect(is_string($branchKey) && (bool)preg_match('/^(source|target|cluster-start|cluster-end):([a-f0-9-]{36})$/D',$branchKey,$parts), 'Invalid duct branch key.');
                            self::uuid($parts[2]); $route=self::route($points);
                            $validBranch=in_array($parts[1],['source','target'],true)?in_array($parts[2],$members,true):count(array_filter($input['clusters']??[],fn($c)=>($c['id']??null)===$parts[2] && ($c['context']??null)===$g['context']))>0;
                            if($validBranch)$row['branches'][$branchKey]=$route;
                        }
                    }

                    self::expect(is_array($g['points']??null) && array_is_list($g['points']) && count($g['points'])>=2 && count($g['points'])<=100, 'Ducts need 2–100 route points.');
                    $row['points']=[];
                    foreach ($g['points'] as $p) {
                        self::expect(is_array($p), 'Invalid duct route point.');
                        $p=['x'=>self::number($p['x']??null),'y'=>self::number($p['y']??null)];
                        $previous=end($row['points']);
                        self::expect(!$previous || abs($p['x']-$previous['x'])<.01 || abs($p['y']-$previous['y'])<.01, 'Duct routes must be orthogonal.');
                        $row['points'][]=$p;
                    }
                }
                if ($keep && $members) $out[$key][]=$row;
            }
        }
        if (array_key_exists('cluster_positions',$input)) {
            self::expect(!isset($map['nodes']) && is_array($input['cluster_positions']) && count($input['cluster_positions'])<=502, 'Invalid cluster layout positions.');
            $out['cluster_positions']=[];
            foreach ($input['cluster_positions'] as $context=>$positions) {
                $keep=self::context($context,$map);
                self::expect(is_array($positions) && count($positions)<=2000, 'Invalid cluster layout positions.');
                foreach ($positions as $id=>$p) {
                    self::uuid($id); self::expect(is_array($p), 'Invalid cluster layout position.');
                    $point=['x'=>self::number($p['x']??null),'y'=>self::number($p['y']??null)];
                    if ($keep && in_array($id,array_column($map['equipment'],'id'),true)) $out['cluster_positions'][$context][$id]=$point;
                }
            }
        }
        return $out;
    }

    public static function images(array $map): array
    {
        return array_values(array_unique(array_map(fn($g)=>substr($g['icon'],6),array_filter($map['clusters']??[],fn($g)=>str_starts_with($g['icon']??'','asset:')))));
    }
}
