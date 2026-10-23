<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Shared membership and cable metadata, independent of a drawing's coordinates. */
final class TopologySchema
{
    /** Optional image-scoped Asset Library slot identity; old maps remain valid. */
    public static function assetKey(array $port): array
    {
        if (!array_key_exists('asset_key', $port)) return [];
        $key = $port['asset_key'];
        if (!is_string($key) || !preg_match('/^[A-Za-z0-9_-]{1,100}:[A-Za-z0-9_-]{1,64}$/D', $key)) throw new \InvalidArgumentException('Invalid asset port identity.');
        return ['asset_key' => $key];
    }
    public static function member(mixed $value): int
    {
        if (!is_int($value) || $value < 1 || $value > 64) throw new \InvalidArgumentException('Stack member must be 1–64.');
        return $value;
    }
    public static function profileKey(array $device): string { return isset($device['stack_member']) ? 'member:'.self::member($device['stack_member']) : 'main'; }
    public static function placements(array $devices): void
    {
        $seen=[];
        foreach ($devices as $d) {
            $ref=!empty($d['device_id'])?'lnms:device:'.$d['device_id']:($d['object_id']??'');
            $member=isset($d['stack_member'])?self::member($d['stack_member']):0;
            if($member&&empty($d['device_id']))throw new \InvalidArgumentException('A stack member needs a monitored device.');
            foreach($seen[$ref]??[] as $previous)if(!$previous||!$member||$previous===$member)throw new \InvalidArgumentException('This device or stack member is already in the map.');
            $seen[$ref][]=$member;
        }
    }
    public static function media(mixed $raw): array
    {
        if(!is_array($raw))throw new \InvalidArgumentException('Invalid cable specifications.');
        $allowed=['reference','fiber_type','connector','strands','used_strands','reserved_strands','length_m','route','fiber_pair','port_group','polarity'];
        if(array_diff(array_keys($raw),$allowed))throw new \InvalidArgumentException('Unknown cable specification.');
        $out=[];
        foreach(['reference'=>120,'fiber_type'=>40,'connector'=>80,'route'=>2000,'fiber_pair'=>80,'port_group'=>80,'polarity'=>80] as $key=>$max)if(isset($raw[$key]))$out[$key]=self::text($raw[$key],$max);
        foreach(['strands','used_strands','reserved_strands'] as $key)if(isset($raw[$key])){
            if(!is_int($raw[$key])||$raw[$key]<0||$raw[$key]>10000)throw new \InvalidArgumentException('Use a whole number of fibre strands.');$out[$key]=$raw[$key];
        }
        if(($out['used_strands']??0)+($out['reserved_strands']??0)>($out['strands']??0))throw new \InvalidArgumentException('Used and reserved strands exceed cable capacity.');
        if(isset($raw['length_m'])){if(!is_numeric($raw['length_m'])||!is_finite((float)$raw['length_m'])||$raw['length_m']<0||$raw['length_m']>10000000)throw new \InvalidArgumentException('Invalid cable length.');$out['length_m']=(float)$raw['length_m'];}
        return $out;
    }
    public static function group(mixed $raw): array
    {
        if(!is_array($raw))throw new \InvalidArgumentException('Invalid port group.');
        $id=$raw['id']??'';if(!is_string($id)||!preg_match('/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/D',$id))throw new \InvalidArgumentException('Invalid group identity.');
        $type=$raw['type']??'';if(!in_array($type,['lag','team'],true))throw new \InvalidArgumentException('Choose LAG or NIC Team.');
        $name=trim(self::text($raw['name']??'',120));if(!$name)throw new \InvalidArgumentException('Group name is required.');
        $mode=$raw['mode']??'unknown';if(!in_array($mode,['unknown','lacp','static','active-backup','switch-independent'],true))throw new \InvalidArgumentException('Invalid aggregation mode.');
        $ports=$raw['ports']??[];if(!is_array($ports)||!array_is_list($ports)||count($ports)<1||count($ports)>256)throw new \InvalidArgumentException('Choose 1–256 distinct member ports.');
        foreach($ports as $port)self::port($port);if(count(array_unique($ports))!==count($ports))throw new \InvalidArgumentException('Choose distinct member ports.');
        $aggregate=$raw['aggregate']??null;if($aggregate!==null){self::port($aggregate);if(in_array($aggregate,$ports,true))throw new \InvalidArgumentException('The aggregate interface cannot also be a member.');}
        return ['id'=>$id,'type'=>$type,'name'=>$name,'mode'=>$mode,'ports'=>$ports,'aggregate'=>$aggregate];
    }
    private static function port(mixed $ref): void {if(!is_string($ref)||!preg_match('/^(?:lnms:port:[1-9][0-9]*|mm:port:[a-f0-9-]{36})$/D',$ref))throw new \InvalidArgumentException('Invalid group port.');}
    private static function text(mixed $value,int $max): string {if(!is_string($value)||mb_strlen($value)>$max)throw new \InvalidArgumentException('Invalid topology text.');return $value;}
}
