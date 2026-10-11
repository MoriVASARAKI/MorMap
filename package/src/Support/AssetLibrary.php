<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;
use Illuminate\Support\Str;
final class AssetLibrary
{
    private array $base=[];
    public function __construct()
    {
        $dir=dirname(__DIR__,2).'/resources/stencils';
        foreach(array_merge(json_decode(file_get_contents($dir.'/legacy-catalog.json'),true,512,JSON_THROW_ON_ERROR),json_decode(file_get_contents($dir.'/catalog.json'),true,512,JSON_THROW_ON_ERROR)) as $item){$item['path']=$dir.'/'.$item['id'].'.svg';$item['mime']='image/svg+xml';$this->base[$item['id']]=$item;}
        $logos=base_path('html/images/os');
        foreach(glob($logos.'/*')?:[] as $path){
            $ext=strtolower(pathinfo($path,PATHINFO_EXTENSION));$stem=pathinfo($path,PATHINFO_FILENAME);
            if(!in_array($ext,['svg','png','jpg','jpeg','webp'],true)||!preg_match('/^[a-zA-Z0-9_-]+$/D',$stem))continue;
            $id='logo-'.strtolower($stem);if(isset($this->base[$id])&&$ext!=='svg')continue;
            $size=$ext==='svg'?self::svgSize($path):@getimagesize($path);
            $aliases=['windows'=>'Windows','linux'=>'Linux','vmware'=>'VMware / ESXi','vmware-esxi'=>'VMware ESXi','proxmox'=>'Proxmox VE','qnap'=>'QNAP','cisco'=>'Cisco','dell'=>'Dell','netasq'=>'Stormshield SNS / Netasq','stormshield'=>'Stormshield SNS','hp'=>'HP / HPE','hpe'=>'HPE','huawei'=>'Huawei'];
            $this->base[$id]=['id'=>$id,'name'=>$aliases[strtolower($stem)]??ucwords(str_replace(['_','-'],' ',$stem)),'kind'=>'logo','path'=>$path,'mime'=>$ext==='svg'?'image/svg+xml':($size['mime']??'image/png'),'width'=>$size[0]??128,'height'=>$size[1]??128,'ports'=>[],'source'=>'LibreNMS'];
        }
    }
    private function valid(string $id): bool {return Str::isUuid($id)||isset($this->base[$id]);}
    private static function svgSize(string $path): array
    {
        $head=file_get_contents($path,false,null,0,16384);
        if(preg_match('/viewBox=[\'"]\s*([-+\d.eE]+)[ ,\s]+([-+\d.eE]+)[ ,\s]+([-+\d.eE]+)[ ,\s]+([-+\d.eE]+)\s*[\'"]/',$head,$m)){$w=(float)$m[3];$h=(float)$m[4];if(is_finite($w)&&is_finite($h)&&$w>0&&$h>0)return [$w,$h];}
        if(preg_match('/\bwidth=[\'"]([\d.]+)/',$head,$w)&&preg_match('/\bheight=[\'"]([\d.]+)/',$head,$h)&&(float)$w[1]>0&&(float)$h[1]>0)return [(float)$w[1],(float)$h[1]];
        return [128,128];
    }
    private function metadata(string $id): array {$path=storage_path('app/mormap/assets/'.$id.'.json');return is_file($path)?json_decode(file_get_contents($path),true,512,JSON_THROW_ON_ERROR):[];}
    public function get(string $id): ?array
    {
        if(!$this->valid($id))return null;$meta=$this->metadata($id);if($meta['deleted']??false)return null;$item=$this->base[$id]??null;
        if(!$item){$path=storage_path('app/mormap/images/'.$id);if(!is_file($path))return null;$size=isset($meta['mime'])?null:@getimagesize($path);
            // PHP 8.5 also recognizes SVG. Only legacy raster images may lack
            // import metadata; an orphan vector has not completed a safe import.
            if(!isset($meta['mime'])&&(!$size||!in_array($size['mime']??'',['image/png','image/jpeg','image/webp'],true)))return null;
            if(isset($meta['mime'])&&(!in_array($meta['mime'],['image/svg+xml','image/png','image/jpeg','image/webp'],true)||!is_numeric($meta['width']??null)||!is_numeric($meta['height']??null)||$meta['width']<=0||$meta['height']<=0))return null;
            $item=['id'=>$id,'name'=>'Imported image '.substr($id,0,8),'kind'=>'image','mime'=>$size['mime']??$meta['mime'],'width'=>$size[0]??$meta['width'],'height'=>$size[1]??$meta['height'],'ports'=>[],'path'=>$path,'source'=>'Uploaded'];}
        foreach(['name','ports','mime','width','height','kind','appearance'] as $key)if(array_key_exists($key,$meta))$item[$key]=$meta[$key];
        $item['deletable']=($item['source']??'')!=='LibreNMS';$item['meta_revision']=$meta['revision']??0;$item['url']=route('mormap.image',['id'=>$id]);return $item;
    }
    public function exists(string $id): bool {return $this->get($id)!==null;}
    public function all(): array
    {
        $ids=array_keys($this->base);foreach(glob(storage_path('app/mormap/images/*'))?:[] as $path)if(Str::isUuid(basename($path)))$ids[]=basename($path);
        $items=[];foreach(array_unique($ids) as $id){try{$item=$this->get($id);if($item&&!($item['legacy']??false)){unset($item['path']);$items[]=$item;}}catch(\Throwable $e){report($e);}}
        usort($items,fn($a,$b)=>strnatcasecmp($a['name'],$b['name']));return $items;
    }
    public function response(string $id)
    {
        $item=$this->get($id);abort_unless($item,404);
        return response()->file($item['path'],['Content-Type'=>$item['mime'],'X-Content-Type-Options'=>'nosniff','Cache-Control'=>'private, max-age=86400','Content-Security-Policy'=>"default-src 'none'; style-src 'unsafe-inline'; sandbox"]);
    }
    public static function ports(array $ports): array
    {
        if(count($ports)>4000)throw new \InvalidArgumentException('A stencil can define up to 4000 port positions.');$keys=[];$clean=[];
        foreach($ports as $p){if(!is_array($p)||!isset($p['key'],$p['label'],$p['x'],$p['y'])||!is_string($p['key'])||!preg_match('/^[A-Za-z0-9_-]{1,64}$/D',$p['key'])||isset($keys[$p['key']])||!is_string($p['label'])||strlen($p['label'])>255||!is_numeric($p['x'])||!is_numeric($p['y'])||!is_finite((float)$p['x'])||!is_finite((float)$p['y'])||$p['x']<0||$p['x']>1||$p['y']<0||$p['y']>1)throw new \InvalidArgumentException('Invalid stencil port position.');
            $comment=$p['comment']??'';if(!is_string($comment)||mb_strlen($comment)>4000)throw new \InvalidArgumentException('Invalid connection-point comment.');
            $keys[$p['key']]=true;$clean[]=['key'=>$p['key'],'label'=>$p['label'],'x'=>(float)$p['x'],'y'=>(float)$p['y']]+($comment!==''?['comment'=>$comment]:[]);}return $clean;
    }
    public function import(string $path,string $name): array
    {
        $bytes=file_get_contents($path);$ports=[];$appearance=null;$expectedMime=null;$clean=null;$trim=ltrim($bytes);$isPack=str_starts_with($trim,'{');
        if($isPack){
            $pack=json_decode($bytes,true,512,JSON_THROW_ON_ERROR);
            if(!is_array($pack)||($pack['format']??'')!=='mormap-stencil'||!in_array($pack['version']??0,[1,2],true)||!is_string($pack['name']??'')||!is_array($pack['ports']??[]))throw new \InvalidArgumentException('Use a MorMap stencil package or SVG/image.');
            if($pack['version']===1){if(!is_string($pack['svg']??null))throw new \InvalidArgumentException('The vector package is missing SVG content.');$bytes=$pack['svg'];}
            else{
                $image=$pack['image']??null;
                if(!is_array($image)||!is_string($image['data']??null)||!in_array($image['mime']??'', ['image/svg+xml','image/png','image/jpeg','image/webp'],true))throw new \InvalidArgumentException('Invalid portable image package.');
                $bytes=base64_decode($image['data'],true);if($bytes===false)throw new \InvalidArgumentException('The packaged image is not valid base64.');$expectedMime=$image['mime'];
            }
            $ports=self::ports($pack['ports']??[]);if(array_key_exists('appearance',$pack))$appearance=ObjectFormat::validate($pack['appearance']);$name=$pack['name']??$name;$trim=ltrim($bytes);
        }
        if(strlen($bytes)>5*1024*1024)throw new \InvalidArgumentException('The image inside a package must be no larger than 5 MB.');
        if(str_starts_with($trim,'<')){$clean=SvgSanitizer::clean($bytes);$bytes=$clean['svg'];$mime='image/svg+xml';$width=$clean['width'];$height=$clean['height'];}
        else{$size=@getimagesizefromstring($bytes);if(!$size||!in_array($size['mime'],['image/png','image/jpeg','image/webp'],true)||$size[0]>8000||$size[1]>8000||$size[0]*$size[1]>24000000)throw new \InvalidArgumentException('Use SVG, PNG, JPEG, WebP or a MorMap stencil package. Export Visio stencils as SVG first.');[$width,$height]=$size;$mime=$size['mime'];}
        if($expectedMime!==null&&$expectedMime!==$mime)throw new \InvalidArgumentException('The packaged image type does not match its contents.');
        $hash=hash('sha256',$bytes);
        if(!$isPack)foreach(glob(storage_path('app/mormap/images/*'))?:[] as $old)if(Str::isUuid(basename($old))&&is_file($old)&&hash_file('sha256',$old)===$hash){$existing=$this->get(basename($old));if($existing)return $this->publicItem($existing);}
        $id=(string)Str::uuid();$directory=storage_path('app/mormap/images');if(!is_dir($directory))mkdir($directory,0770,true);
        if(file_put_contents($directory.'/'.$id,$bytes,LOCK_EX)===false){if(is_file($directory.'/'.$id))unlink($directory.'/'.$id);throw new \RuntimeException('Cannot save image.');}chmod($directory.'/'.$id,0660);
        try { $this->write($id,['name'=>mb_substr(trim((string)$name),0,120)?:'Imported image','mime'=>$mime,'width'=>$width,'height'=>$height,'kind'=>$mime==='image/svg+xml'?'stencil':'image','ports'=>$ports]+($appearance!==null?['appearance'=>$appearance]:[]),0); } catch (\Throwable $e) { unlink($directory.'/'.$id); throw $e; }
        return $this->publicItem($this->get($id));
    }
    public function update(string $id,string $name,array $ports,int $expected,?array $appearance=null): array
    {
        $item=$this->get($id);abort_unless($item,404);$metadata=$this->metadata($id);$metadata['name']=$name;$metadata['ports']=self::ports($ports);if($appearance!==null)$metadata['appearance']=ObjectFormat::validate($appearance);$this->write($id,$metadata,$expected);return $this->publicItem($this->get($id));
    }
    private function write(string $id,array $meta,int $expected): void
    {
        $directory=storage_path('app/mormap/assets');if(!is_dir($directory))mkdir($directory,0770,true);$file=$directory.'/'.$id.'.json';$lock=fopen($file.'.lock','c');if(!$lock)throw new \RuntimeException('Cannot lock asset metadata.');$tmp=null;
        try{if(!flock($lock,LOCK_EX))throw new \RuntimeException('Cannot lock asset metadata.');$old=$this->metadata($id);if(($old['revision']??0)!==$expected)throw new \UnexpectedValueException('Stencil changed in another tab. Reload before saving.');$meta['revision']=$expected+1;$tmp=tempnam($directory,'.asset-');if(!$tmp||file_put_contents($tmp,json_encode($meta,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE))===false)throw new \RuntimeException('Cannot save stencil metadata.');chmod($tmp,0660);if(!rename($tmp,$file))throw new \RuntimeException('Cannot replace stencil metadata.');}
        finally{if($tmp&&is_file($tmp))unlink($tmp);flock($lock,LOCK_UN);fclose($lock);}
    }
    public function export(string $id): array
    {
        $item=$this->get($id);abort_unless($item,404);
        $bytes=file_get_contents($item['path']);
        if($item['mime']==='image/svg+xml'){$svg=SvgSanitizer::clean($bytes);$bytes=$svg['svg'];}
        return ['format'=>'mormap-stencil','version'=>2,'name'=>$item['name'],
            'image'=>['mime'=>$item['mime'],'data'=>base64_encode($bytes)],'ports'=>$item['ports']]+(isset($item['appearance'])?['appearance'=>$item['appearance']]:[]);
    }
    public static function downloadName(string $name): string
    {
        $name=preg_replace('~[\\x00-\\x1f\\x7f<>:"/\\\\\\\\|?*]~u','-',trim($name));
        return (rtrim(mb_substr($name??'',0,120)," .")?:'device').'.json';
    }
    /** Bundled vectors are removed per installation, so an upgrade cannot restore them. */
    public function removal(string $id): array
    {
        $item=$this->get($id);
        if(!$item||!$item['deletable'])throw new \InvalidArgumentException('LibreNMS system logos cannot be deleted.');
        if(isset($this->base[$id]))return ['writes'=>['assets/'.$id.'.json'=>['deleted'=>true,'revision'=>$item['meta_revision']+1]],'deletes'=>[]];
        return ['writes'=>[],'deletes'=>['images/'.$id,'assets/'.$id.'.json']];
    }
    private function publicItem(array $item): array {unset($item['path']);return $item;}
}
