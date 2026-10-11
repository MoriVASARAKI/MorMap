<?php
declare(strict_types=1);
namespace PortMap\LibreNMS\Support;
/** A restricted vector interchange format. No scripts, external resources or HTML. */
final class SvgSanitizer
{
    private const ELEMENTS = ['svg','g','defs','path','rect','circle','ellipse','line','polyline','polygon','text','tspan','title','desc','linearGradient','radialGradient','stop','clipPath','mask','pattern','symbol','use','style','image','marker'];
    private const ATTRIBUTES = ['id','class','style','viewBox','preserveAspectRatio','x','y','x1','x2','y1','y2','cx','cy','r','rx','ry','width','height','d','points','transform','fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','stroke-opacity','opacity','clip-path','clip-rule','clipPathUnits','mask','maskUnits','maskContentUnits','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','spreadMethod','fx','fy','fr','patternUnits','patternContentUnits','patternTransform','font-family','font-size','font-weight','font-style','text-anchor','dominant-baseline','dx','dy','rotate','textLength','lengthAdjust','display','visibility','color','vector-effect','href','version','xml:space','marker-start','marker-mid','marker-end','markerUnits','markerWidth','markerHeight','refX','refY','orient','overflow'];
    private const CSS = ['fill','fill-rule','fill-opacity','stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-dashoffset','stroke-opacity','opacity','clip-path','mask','stop-color','stop-opacity','font-family','font-size','font-weight','font-style','text-anchor','dominant-baseline','display','visibility','color','vector-effect','marker-start','marker-mid','marker-end'];
    public static function clean(string $bytes): array
    {
        if (trim($bytes)==='' || strlen($bytes)>5*1024*1024) { throw new \InvalidArgumentException('Use an SVG under 5 MB.'); }
        $bytes=self::stripDeclarations($bytes);
        if (!class_exists(\DOMDocument::class)) { throw new \RuntimeException('PHP DOM extension is required for SVG imports.'); }
        $previous=libxml_use_internal_errors(true);
        try { $doc=new \DOMDocument();$ok=$doc->loadXML($bytes,LIBXML_NONET|LIBXML_NOBLANKS); }
        finally {libxml_clear_errors();libxml_use_internal_errors($previous);}
        if(!$ok||$doc->documentElement?->localName!=='svg')throw new \InvalidArgumentException('Invalid SVG document.');
        $root=$doc->documentElement;$elements=iterator_to_array($doc->getElementsByTagName('*'));
        if(count($elements)>20000)throw new \InvalidArgumentException('SVG has too many elements.');
        foreach($elements as $el){
            // Visio/Inkscape editor metadata does not contribute vector artwork.
            if($el->namespaceURI&&$el->namespaceURI!=='http://www.w3.org/2000/svg'){$el->parentNode?->removeChild($el);continue;}
            if(in_array($el->localName,['metadata','namedview'],true)){$el->parentNode?->removeChild($el);continue;}
            if($el->localName==='link'&&strtolower($el->getAttribute('rel'))==='stylesheet'){$el->parentNode?->removeChild($el);continue;}
            if(!in_array($el->localName,self::ELEMENTS,true)||($el->namespaceURI&&$el->namespaceURI!=='http://www.w3.org/2000/svg'))throw new \InvalidArgumentException('Unsupported SVG element: '.$el->localName.'. Export a plain vector SVG without scripts, filters or external resources.');
            foreach(iterator_to_array($el->attributes) as $attr){
                $name=$attr->name;$value=$attr->value;
                if($attr->namespaceURI==='http://www.w3.org/2000/xmlns/')continue;
                if(str_starts_with(strtolower($name),'on'))throw new \InvalidArgumentException('SVG event handlers are not allowed.');
                if($attr->namespaceURI==='http://www.w3.org/1999/xlink'&&$attr->localName==='href')$name='href';
                if(!in_array($name,self::ATTRIBUTES,true)){$el->removeAttributeNode($attr);continue;}
                if($name==='href'&&$el->localName==='image'){self::embeddedImage($value);continue;}
                if($name==='href'&&!preg_match('/^#[A-Za-z_][A-Za-z0-9_.:-]*$/D',$value))throw new \InvalidArgumentException('SVG references must stay inside the same file.');
                if($name==='style')$el->setAttribute('style',self::declarations($value));
                else self::safeValue($value);
            }
            if($el->localName==='style')$el->textContent=self::stylesheet($el->textContent);
        }
        foreach(iterator_to_array($doc->childNodes) as $node)if($node->nodeType===XML_PI_NODE)$doc->removeChild($node);
        $root->setAttribute('xmlns','http://www.w3.org/2000/svg');
        $view=preg_split('/[\s,]+/',trim($root->getAttribute('viewBox')));
        if(count($view)===4&&count(array_filter($view,'is_numeric'))===4){foreach($view as $v)if(!is_finite((float)$v))throw new \InvalidArgumentException('SVG viewBox values must be finite.');$w=(float)$view[2];$h=(float)$view[3];}
        else{$w=(float)$root->getAttribute('width');$h=(float)$root->getAttribute('height');if($w>0&&$h>0)$root->setAttribute('viewBox','0 0 '.$w.' '.$h);}
        if(!is_finite($w)||!is_finite($h)||$w<.001||$h<.001||$w>100000||$h>100000)throw new \InvalidArgumentException('SVG viewBox dimensions must be between 0.001 and 100000.');
        $root->setAttribute('width',(string)$w);$root->setAttribute('height',(string)$h);
        self::removePageBackground($root);
        $view=preg_split('/[\s,]+/',trim($root->getAttribute('viewBox')));$w=(float)$view[2];$h=(float)$view[3];if(!is_finite($w)||!is_finite($h)||$w<.001||$h<.001||$w>100000||$h>100000)throw new \InvalidArgumentException('Trimmed SVG dimensions are outside the supported range.');
        return ['svg'=>$doc->saveXML($root),'width'=>$w,'height'=>$h];
    }
    /** Remove declarations before parsing; never load or expand a DTD/entity. */
    private static function stripDeclarations(string $xml): string
    {
        $out='';$length=strlen($xml);$i=0;
        while($i<$length){
            if($xml[$i]!=='<'){$next=strpos($xml,'<',$i);$next=$next===false?$length:$next;$out.=substr($xml,$i,$next-$i);$i=$next;continue;}
            if(substr($xml,$i,4)==='<!--'||substr($xml,$i,9)==='<![CDATA['){$end=substr($xml,$i,4)==='<!--'?'-->':']]>';$at=strpos($xml,$end,$i+4);if($at===false)throw new \InvalidArgumentException('Invalid SVG comment or CDATA.');$out.=substr($xml,$i,$at+strlen($end)-$i);$i=$at+strlen($end);continue;}
            if(strncasecmp(substr($xml,$i,17),'<?xml-stylesheet',16)===0){$at=strpos($xml,'?>',$i+2);if($at===false)throw new \InvalidArgumentException('Invalid stylesheet instruction.');$i=$at+2;continue;}
            if(preg_match('/\A<!\s*(?:DOCTYPE|ENTITY)\b/i',substr($xml,$i,32))){$quote=null;$brackets=0;$closed=false;
                for($j=$i+2;$j<$length;$j++){$c=$xml[$j];if($quote!==null){if($c===$quote)$quote=null;continue;}if($c==='"'||$c==="'"){$quote=$c;continue;}if(substr($xml,$j,4)==='<!--'){$end=strpos($xml,'-->',$j+4);if($end===false)throw new \InvalidArgumentException('Invalid DTD comment.');$j=$end+2;continue;}if($c==='[')$brackets++;if($c===']')$brackets--;if($c==='>'&&$brackets===0){$i=$j+1;$closed=true;break;}}
                if(!$closed)throw new \InvalidArgumentException('Invalid SVG declaration.');continue;}
            $out.=$xml[$i++];
        }return $out;
    }
    private static function embeddedImage(string $value): void
    {
        if(!preg_match('~^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$~D',$value,$m))throw new \InvalidArgumentException('Embed device images as PNG, JPEG or WebP inside the SVG; external images are not loaded.');
        $bytes=base64_decode(preg_replace('/\s+/','',$m[2]),true);$size=$bytes===false?false:@getimagesizefromstring($bytes);
        if(!$size||$size['mime']!==$m[1]||$size[0]>8000||$size[1]>8000||$size[0]*$size[1]>24000000)throw new \InvalidArgumentException('Invalid embedded SVG image.');
    }
    private static function removePageBackground(\DOMElement $root): void
    {
        // A white rectangle may be part of a front panel. Remove only an explicit,
        // unreferenced page-background marker, never arbitrary white artwork.
        $removed=false;
        foreach(iterator_to_array($root->childNodes) as $el){if(!$el instanceof \DOMElement)continue;
            $id=$el->getAttribute('id');if($el->localName!=='rect'||!preg_match('/^(?:visio[-_])?(?:page[-_]?background|background[-_]?page)$/i',$id)||$el->hasAttribute('transform')||$el->hasAttribute('style')||$el->hasAttribute('class'))continue;
            $fill=strtolower($el->getAttribute('fill'));if(!in_array($fill,['white','#fff','#ffffff','none','transparent'],true)||!in_array($el->getAttribute('stroke'),['','none'],true))continue;
            $rest=$root->ownerDocument->saveXML($root);if(preg_match('/(?:#'.preg_quote($id,'/').'\b)/',$rest))continue;
            $root->removeChild($el);$removed=true;
        }
        if(!$removed)return;
        // Cropping complex paths, text or transformed groups without a renderer
        // can cut visible artwork. Keep their original page bounds.
        $bounds=[];foreach(iterator_to_array($root->childNodes) as $el){if(!$el instanceof \DOMElement||in_array($el->localName,['title','desc','defs'],true))continue;
            if($el->localName!=='rect'||$el->hasAttribute('transform')||$el->hasAttribute('class')||$el->hasAttribute('style'))return;
            foreach(['x','y','width','height','stroke-width'] as $k){$value=$el->getAttribute($k);if($value!==''&&!is_numeric($value))return;}
            $pad=$el->getAttribute('stroke')!=='none'?max(1,(float)$el->getAttribute('stroke-width'))/2:0;
            $x=(float)$el->getAttribute('x');$y=(float)$el->getAttribute('y');$w=(float)$el->getAttribute('width');$h=(float)$el->getAttribute('height');if($w<=0||$h<=0)return;$bounds[]=[$x-$pad,$y-$pad,$x+$w+$pad,$y+$h+$pad];
        }if(!$bounds)return;
        $x=min(array_column($bounds,0));$y=min(array_column($bounds,1));$w=max(array_column($bounds,2))-$x;$h=max(array_column($bounds,3))-$y;
        $root->setAttribute('viewBox',"$x $y $w $h");$root->setAttribute('width',(string)$w);$root->setAttribute('height',(string)$h);
    }
    private static function safeValue(string $value): void
    {
        if(preg_match('/[\\\\\x00-\x08]|@|expression\s*\(|javascript\s*:|data\s*:|https?\s*:|\/\//i',$value))throw new \InvalidArgumentException('External or active SVG content is not allowed.');
        if(preg_match('/url\s*\(/i',$value)&&!preg_match('/^url\(\s*[\'"]?#[A-Za-z_][A-Za-z0-9_.:-]*[\'"]?\s*\)$/D',$value))throw new \InvalidArgumentException('SVG paint references must be local.');
    }
    private static function declarations(string $css): string
    {
        $css=preg_replace('~/\*.*?\*/~s','',$css);$out=[];
        foreach(explode(';',$css) as $part){if(trim($part)==='')continue;$pair=explode(':',$part,2);if(count($pair)!==2)throw new \InvalidArgumentException('Invalid SVG style.');$key=strtolower(trim($pair[0]));$value=trim($pair[1]);self::safeValue($value);if(in_array($key,self::CSS,true))$out[]=$key.':'.$value;}
        return implode(';',$out);
    }
    private static function stylesheet(string $css): string
    {
        $css=preg_replace('~/\*.*?\*/~s','',$css);$css=preg_replace('/@import\s+(?:url\([^;{}]*\)|"[^"{}]*"|\x27[^\x27{}]*\x27)[^;{}]*;/i','',$css);$out='';
        while(trim($css)!==''){
            if(!preg_match('/^\s*([^{}]+)\{([^{}]*)\}/s',$css,$m))throw new \InvalidArgumentException('Unsupported SVG stylesheet.');
            if(!preg_match('/^[A-Za-z0-9_.,#\s>:-]+$/D',$m[1])||str_contains($m[1],':'))throw new \InvalidArgumentException('Use simple SVG class styles.');
            $out.=trim($m[1]).'{'.self::declarations($m[2]).'}';$css=substr($css,strlen($m[0]));
        }return $out;
    }
}
