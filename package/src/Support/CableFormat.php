<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Persist local cable appearance without accepting arbitrary SVG or CSS. */
final class CableFormat
{
    public static function validate(mixed $value): array
    {
        if (!is_array($value)) throw new \InvalidArgumentException('Invalid cable format.');
        $choices=['dash'=>['solid','dash','dot','dash-dot','long-dash'],'cap'=>['round','butt','square'],'join'=>['round','miter','bevel'],'line'=>['solid','gradient','none'],'compound'=>['single','double'],'start_arrow'=>['none','triangle','open','diamond','circle'],'end_arrow'=>['none','triangle','open','diamond','circle']];
        $ranges=['width'=>[.25,24],'opacity'=>[0,1],'rounding'=>[0,120],'start_size'=>[2,40],'end_size'=>[2,40]];
        $result=[];
        foreach($value as $key=>$v){
            if(isset($choices[$key])){if(!in_array($v,$choices[$key],true))throw new \InvalidArgumentException('Invalid cable '.$key.'.');}
            elseif(isset($ranges[$key])){if(!is_numeric($v)||!is_finite((float)$v)||$v<$ranges[$key][0]||$v>$ranges[$key][1])throw new \InvalidArgumentException('Invalid cable '.$key.'.');$v=(float)$v;}
            elseif($key==='gradient'){if(!is_string($v)||!preg_match('/^#[a-fA-F0-9]{6}$/D',$v))throw new \InvalidArgumentException('Invalid cable gradient color.');}
            else throw new \InvalidArgumentException('Unknown cable format field.');
            $result[$key]=$v;
        }
        return $result;
    }
}
