<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;
final class CableRules
{
    /** Port IDs identify the real interface across repeated images in this map. */
    public static function validate(array $map): void
    {
        $anchors=array_column($map['anchors'],null,'id');
        foreach($map['links'] as $link)foreach(['source','target'] as $end){
            $a=$anchors[$link[$end]]??null;if(!$a)throw new \InvalidArgumentException('Invalid cable endpoint.');
            $port=!empty($a['port_id'])?'lnms:port:'.(int)$a['port_id']:($a['port_ref']??'');if($port==='')throw new \InvalidArgumentException('Invalid port reference.');
        }
    }
}
