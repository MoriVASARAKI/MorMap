<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Optional per-map, per-host layout. No legacy map is rewritten on read. */
final class VirtualizationLayout
{
    public static function validate(mixed $groups): array
    {
        if (!is_array($groups) || !array_is_list($groups) || count($groups)>1000) throw new \InvalidArgumentException('Invalid virtual guest groups.');
        $out=[]; $seen=[];
        foreach ($groups as $g) {
            if (!is_array($g) || !is_int($g['host_id']??null) || $g['host_id']<1
                || !is_string($g['context']??null) || !preg_match('/^(?:logical|(?:location|cabling):(?:root|[a-f0-9-]{36}))$/D', $g['context'])
                || !is_bool($g['expanded']??null) || !is_array($g['guests']??null) || !array_is_list($g['guests']) || count($g['guests'])>2000) {
                throw new \InvalidArgumentException('Invalid virtual guest group.');
            }
            $key=$g['context'].':'.$g['host_id'];
            if (isset($seen[$key])) throw new \InvalidArgumentException('Duplicate virtual guest group.');
            $seen[$key]=true; $row=array_intersect_key($g,array_flip(['host_id','context','expanded','guests']));
            foreach (['x'=>[-100000,100000], 'y'=>[-100000,100000], 'w'=>[280,800], 'h'=>[148,1400]] as $k=>[$min,$max]) {
                $v=$g[$k]??null;
                if ((!is_int($v)&&!is_float($v)) || !is_finite((float)$v) || $v<$min || $v>$max) throw new \InvalidArgumentException('Invalid virtual guest group position or size.');
                $row[$k]=$v;
            }
            foreach ($row['guests'] as $id) if (!is_int($id)||$id<1) throw new \InvalidArgumentException('Invalid virtual guest device ID.');
            $row['guests']=array_values(array_unique($row['guests'])); $out[]=$row;
        }
        return $out;
    }
}
