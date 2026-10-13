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
            $workspace=$directory==='published'?'logical':'physical';
            foreach((new MapStore(storage_path('app/mormap/'.$directory)))->all() as $map){$items[]=['id'=>$map['id'],'key'=>$workspace.':'.$map['id'],'workspace'=>$workspace,'name'=>$map['name'].($workspace==='logical'?'':' · Physical'),'url'=>route($route,['id'=>$map['id']])];}
        }
        usort($items,fn($a,$b)=>strnatcasecmp($a['name'],$b['name']));return $items;
    }
}
