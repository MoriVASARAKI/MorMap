<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;

/** Drawing annotations are local to a map; they never enter the connection graph. */
final class Drawings
{
    private static function expect(bool $ok,string $message): void { if(!$ok)throw new \InvalidArgumentException($message); }
    private static function number(mixed $v,float $min,float $max): int|float {self::expect((is_int($v)||is_float($v))&&is_finite((float)$v)&&$v>=$min&&$v<=$max,'Invalid drawing geometry or format.');return $v;}
    private static function text(mixed $v,int $max): string {self::expect(is_string($v)&&mb_strlen($v)<=$max,'Invalid drawing text.');return $v;}
    public static function format(mixed $value): array
    {
        self::expect(is_array($value),'Invalid drawing format.');$out=[];
        foreach(['opacity'=>[.05,1],'corner_radius'=>[0,500]] as $key=>$range)if(array_key_exists($key,$value))$out[$key]=self::number($value[$key],$range[0],$range[1]);
        foreach(['arrow_start','arrow_end','bold','italic','locked'] as $key)if(array_key_exists($key,$value)){self::expect(is_bool($value[$key]),'Invalid drawing flag.');$out[$key]=$value[$key];}
        foreach(['dash'=>['solid','dashed','dotted'],'text_align'=>['left','center','right'],'layer'=>['back','front'],'view'=>['location','cabling']] as $key=>$choices)if(array_key_exists($key,$value)){self::expect(in_array($value[$key],$choices,true),'Invalid drawing style.');$out[$key]=$value[$key];}
        return $out;
    }
    public static function label(mixed $value): array
    {
        self::expect(is_array($value),'Invalid drawing label.');
        $out=['text'=>self::text($value['text']??'',200),'position'=>$value['position']??'top-left','x'=>self::number($value['x']??8,-100000,100000),'y'=>self::number($value['y']??-8,-100000,100000),'font_size'=>self::number($value['font_size']??20,8,160),'color'=>self::text($value['color']??'#294d63',7),'bold'=>$value['bold']??false];
        self::expect(!preg_match('/[\r\n]/',$out['text'])&&in_array($out['position'],['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right','custom'],true)&&(bool)preg_match('/^#[a-fA-F0-9]{6}$/D',$out['color'])&&is_bool($out['bold']),'Invalid drawing label.');
        return $out;
    }
    public static function validate(mixed $shapes,array $reserved=[]): array
    {
        self::expect(is_array($shapes)&&array_is_list($shapes)&&count($shapes)<=2000,'Invalid drawings list.');$out=[];$seen=array_fill_keys($reserved,true);
        foreach($shapes as $s){
            self::expect(is_array($s),'Invalid drawing.');$id=$s['id']??null;self::expect(is_string($id)&&(bool)preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/D',$id)&&!isset($seen[$id]),'Invalid or duplicate drawing ID.');$seen[$id]=true;
            self::expect(($s['parent_id']??null)===null,'Logical drawings have no physical parent.');$type=$s['type']??null;self::expect(in_array($type,['rectangle','ellipse','line','polygon','text'],true),'Invalid drawing type.');$row=['id'=>$id,'parent_id'=>null,'type'=>$type];
            foreach(['x'=>[-100000,100000],'y'=>[-100000,100000],'w'=>[1,16384],'h'=>[1,16384],'rotation'=>[-360,360],'stroke_width'=>[0,20],'font_size'=>[8,160]] as $key=>$range)$row[$key]=self::number($s[$key]??null,$range[0],$range[1]);
            $row['text']=self::text($s['text']??'',2000);$row['fill']=self::text($s['fill']??'',7);$row['stroke']=self::text($s['stroke']??'',7);
            self::expect((bool)preg_match('/^(?:none|#[a-fA-F0-9]{6})$/D',$row['fill'])&&(bool)preg_match('/^#[a-fA-F0-9]{6}$/D',$row['stroke']),'Invalid drawing color.');
            $points=$s['points']??[];self::expect(is_array($points)&&array_is_list($points)&&count($points)<=200&&($type!=='line'||count($points)===2)&&($type!=='polygon'||count($points)>=3),'Invalid drawing points.');$row['points']=[];
            foreach($points as $p){self::expect(is_array($p),'Invalid drawing point.');$row['points'][]=['x'=>self::number($p['x']??null,0,1),'y'=>self::number($p['y']??null,0,1)];}
            if(array_key_exists('drawing',$s)){$row['drawing']=self::format($s['drawing']);self::expect(($row['drawing']['view']??'location')==='location','Logical drawings cannot use a cabling view.');}
            if(array_key_exists('label',$s))$row['label']=self::label($s['label']);
            if(array_key_exists('comment',$s))$row['comment']=self::text($s['comment'],4000);
            $out[]=$row;
        }
        return $out;
    }
}
