<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;
use PortMap\LibreNMS\Storage\MapStore;
final class PublishedMaps
{
    public static function all(): array
    {
        $items=[];
        foreach(['published'=>'mormap.viewer','physical/published'=>'mormap.physical.viewer'] as $directory=>$route){
            foreach((new MapStore(storage_path('app/mormap/'.$directory)))->all() as $map){$items[]=['id'=>$map['id'],'name'=>$map['name'].($directory==='published'?'':' · Physical'),'url'=>route($route,['id'=>$map['id']])];}
        }
        usort($items,fn($a,$b)=>strnatcasecmp($a['name'],$b['name']));return $items;
    }
}
