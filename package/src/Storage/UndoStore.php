<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Storage;

/** Reversible server mutations. Call under the existing workspace transaction lock. */
final class UndoStore
{
    public function __construct(private string $root) {}
    private function state(string $path): array
    {
        $file=$this->root.'/'.$path;
        if(!is_file($file))return ['exists'=>false];
        $bytes=file_get_contents($file);
        return str_ends_with($path,'.json')?['exists'=>true,'json'=>json_decode($bytes,true,512,JSON_THROW_ON_ERROR)]:['exists'=>true,'bytes'=>base64_encode($bytes)];
    }
    public function apply(array $writes,array $deletes,array $blobs=[],array $context=[]): string
    {
        $token=bin2hex(random_bytes(24));$before=[];$after=[];
        foreach(array_unique([...array_keys($writes),...$deletes,...array_keys($blobs)]) as $path){
            if(str_starts_with($path,'undo/'))continue;
            $before[$path]=$this->state($path);
            $after[$path]=array_key_exists($path,$writes)?['exists'=>true,'json'=>$writes[$path]]:(isset($blobs[$path])?['exists'=>true,'bytes'=>$blobs[$path]]:['exists'=>false]);
        }
        $writes['undo/'.$token.'.json']=['before'=>$before,'after'=>$after,'context'=>$context,'created_at'=>time()];
        (new WorkspaceTransaction($this->root))->apply($writes,$deletes,$blobs);
        // Editors cap their session history. Expire inaccessible backup records after seven days.
        foreach(glob($this->root.'/undo/*.json')?:[] as $file)if(filemtime($file)<time()-86400*7)unlink($file);
        return $token;
    }
    /** Rebase unrelated shared-object changes; reject changes to the values being reversed. */
    private function merge(mixed $before,mixed $after,mixed $now,string $path): mixed
    {
        if($before===$after)return $now;
        if(is_array($before)&&is_array($after)&&is_array($now)&&(!$before||!array_is_list($before))&&(!$after||!array_is_list($after))&&(!$now||!array_is_list($now))){
            $out=$now;
            foreach(array_unique([...array_keys($before),...array_keys($after)]) as $key){
                $b=array_key_exists($key,$before);$a=array_key_exists($key,$after);$n=array_key_exists($key,$now);
                if($key==='revision'&&$b&&$a&&is_int($after[$key])){$out[$key]=max((int)($now[$key]??0),$before[$key],$after[$key])+1;continue;}
                if($key==='updated_at'&&$b&&$a){$out[$key]=gmdate('c');continue;}
                if($b&&$a&&$before[$key]===$after[$key])continue;
                if($b&&$a&&$n)$out[$key]=$this->merge($before[$key],$after[$key],$now[$key],$path.'/'.$key);
                else{
                    if($a!==$n||($a&&$after[$key]!==$now[$key]))throw new \UnexpectedValueException('Undo conflicts with a later change. Reload and review the affected item.');
                    if($b)$out[$key]=$before[$key];else unset($out[$key]);
                }
            }
            return $out;
        }
        if($now!==$after)throw new \UnexpectedValueException('Undo conflicts with a later change. Reload and review the affected item.');
        return $before;
    }
    public function revert(string $token): array
    {
        if(!preg_match('/^[a-f0-9]{48}$/D',$token))throw new \InvalidArgumentException('Invalid Undo token.');
        $file=$this->root.'/undo/'.$token.'.json';
        if(!is_file($file))throw new \InvalidArgumentException('This Undo action is no longer available.');
        $record=json_decode(file_get_contents($file),true,512,JSON_THROW_ON_ERROR);$writes=[];$deletes=[];$blobs=[];
        foreach($record['before'] as $path=>$before){
            $after=$record['after'][$path];$now=$this->state($path);
            if($before===$after)continue;
            if(($before['exists']??false)&&($after['exists']??false)&&($now['exists']??false)&&isset($before['json'],$after['json'],$now['json']))$value=['exists'=>true,'json'=>$this->merge($before['json'],$after['json'],$now['json'],$path)];
            else{if($now!==$after)throw new \UnexpectedValueException('Undo conflicts with a later change. Reload and review the affected item.');$value=$before;}
            if(!$value['exists'])$deletes[]=$path;
            elseif(array_key_exists('json',$value)){
                $json=$value['json'];
                if(isset($json['revision']))$json['revision']=max($json['revision'],$after['json']['revision']??0,$now['json']['revision']??0)+1;
                $writes[$path]=$json;
            }else $blobs[$path]=$value['bytes'];
        }
        if(isset($writes['infrastructure/graph.json']))InfrastructureStore::validateConnections($writes['infrastructure/graph.json']);
        if(isset($writes[VirtualizationStore::FILE]))VirtualizationStore::validate($writes[VirtualizationStore::FILE]);
        // A map restoration must not introduce references to assets removed elsewhere.
        foreach($writes as $path=>$map)if(preg_match('~^(?:physical/)?(?:maps|published)/~',$path)){
            $images=array_merge(array_column($map['equipment']??$map['nodes']??[],'image'),\PortMap\LibreNMS\Support\FloorBackground::images($map));
            $assets=new \PortMap\LibreNMS\Support\AssetLibrary();
            foreach($images as $image)if(!$assets->exists($image)&&!isset($blobs['images/'.$image])&&!isset($writes['assets/'.$image.'.json']))throw new \UnexpectedValueException('Restore the removed image asset before restoring this map.');
        }
        $inverse=$this->apply($writes,[...$deletes,'undo/'.$token.'.json'],$blobs,$record['context']??[]);
        return ['undo_token'=>$inverse,'context'=>$record['context']??[]];
    }
}
