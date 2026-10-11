/* Cable appearance shared by the two renderers, previews and exported SVG. */
(function(root){
'use strict';
const defaults=Object.freeze({width:3,opacity:1,dash:'solid',cap:'round',join:'round',rounding:0,line:'solid',compound:'single',start_arrow:'none',end_arrow:'none',start_size:10,end_size:10,gradient:'#507ca5'});
const choices={dash:['solid','dash','dot','dash-dot','long-dash'],cap:['round','butt','square'],join:['round','miter','bevel'],line:['solid','gradient','none'],compound:['single','double'],start_arrow:['none','triangle','open','diamond','circle'],end_arrow:['none','triangle','open','diamond','circle']};
const ranges={width:[.25,24],opacity:[0,1],rounding:[0,120],start_size:[2,40],end_size:[2,40]};
function normalize(value={}){const out={...defaults};for(const [key,allowed]of Object.entries(choices))if(allowed.includes(value[key]))out[key]=value[key];for(const [key,[min,max]]of Object.entries(ranges)){const n=Number(value[key]);if(value[key]!==undefined&&Number.isFinite(n))out[key]=Math.max(min,Math.min(max,n));}if(/^#[a-f\d]{6}$/i.test(value.gradient))out.gradient=value.gradient;return out;}
function draw(parent,{points,type='right-angle',format={},color='#08a84f',selected=false,id='cable',shape,G}){
 const f=normalize(format),tag=(type==='right-angle'&&!f.rounding)?'polyline':'path',geometry=tag==='polyline'?{points:points.map(p=>`${p.x},${p.y}`).join(' ')}:{d:G.connectorPath(points,type,f)},defs=shape('defs'),key='mm-line-'+String(id).replace(/[^a-z\d_-]/gi,'');
 let stroke=color;if(f.line==='gradient'){const gradient=shape('linearGradient',{id:key+'-gradient',gradientUnits:'userSpaceOnUse',x1:points[0].x,y1:points[0].y,x2:points.at(-1).x+(points[0].x===points.at(-1).x?.001:0),y2:points.at(-1).y});gradient.append(shape('stop',{offset:'0%','stop-color':color}),shape('stop',{offset:'100%','stop-color':f.gradient}));defs.append(gradient);stroke='url(#'+key+'-gradient)';}
 const common={...geometry,fill:'none','stroke-linecap':f.cap,'stroke-linejoin':f.join,'vector-effect':'non-scaling-stroke','pointer-events':'none'};
 if(f.line!=='none'&&f.opacity>0){const group=shape('g',{opacity:f.opacity,'data-cable-paint':'true'});group.append(shape(tag,{...common,stroke:'#fff','stroke-width':f.width+(selected?5:3)}));
  const pattern={dash:[8,5],dot:[1,5],'dash-dot':[8,4,1,4],'long-dash':[16,6]}[f.dash],dash=pattern?{'stroke-dasharray':pattern.map(n=>n*f.width/3).join(' ')}:{};
  group.append(shape(tag,{...common,...dash,stroke,'stroke-width':f.width,'data-cable-stroke':'true'}));
  if(f.compound==='double')group.append(shape(tag,{...common,...dash,stroke:'#fff','stroke-width':f.width*.4}));
  const arrows={};for(const end of ['start','end']){const kind=f[end+'_arrow'];if(kind==='none')continue;const marker=shape('marker',{id:key+'-'+end,viewBox:'-12 -6 14 12',refX:0,refY:0,markerWidth:f[end+'_size'],markerHeight:f[end+'_size'],markerUnits:'userSpaceOnUse',orient:'auto-start-reverse',overflow:'visible'}),paint=end==='end'&&f.line==='gradient'?f.gradient:color;
   const attrs={fill:kind==='open'?'none':paint,stroke:paint,'stroke-width':1.3,'stroke-linejoin':'round'};marker.append(kind==='circle'?shape('circle',{...attrs,cx:-3,cy:0,r:3}):shape('path',{...attrs,d:kind==='triangle'?'M0 0L-10 -5L-10 5Z':kind==='diamond'?'M0 0L-5 -4L-10 0L-5 4Z':'M-10 -5L0 0L-10 5'}));defs.append(marker);arrows['marker-'+end]='url(#'+key+'-'+end+')';
  }if(Object.keys(arrows).length)group.append(shape(tag,{...common,stroke:'none',...arrows,'data-cable-arrows':'true'}));parent.append(group);
 }else if(selected)parent.append(shape(tag,{...common,stroke:'#7493a4','stroke-width':1,'stroke-dasharray':'4 4','data-output':'omit'}));
 parent.append(defs);return {tag,geometry,format:f};
}
// An outlined stroke remains vector geometry in PDF converters that support
// gradient fills but cannot paint a gradient stroke. Points follow the centerline.
function strokeOutline(points,width,cap='round',join='round'){
 const p=points.filter((v,i)=>!i||Math.hypot(v.x-points[i-1].x,v.y-points[i-1].y)>1e-7);if(p.length<2)return '';const r=width/2,d=p.slice(1).map((q,i)=>{const x=q.x-p[i].x,y=q.y-p[i].y,len=Math.hypot(x,y);return {x:x/len,y:y/len};}),xy=q=>q.x+','+q.y;
 const side=sign=>{const out=[];for(let i=0;i<p.length;i++){const a=d[Math.max(0,i-1)],b=d[Math.min(i,d.length-1)],n={x:-a.y*sign,y:a.x*sign},m={x:-b.y*sign,y:b.x*sign},at=p[i];if(!i||i===p.length-1){const along=cap==='square'?(!i?-r:r):0;out.push({x:at.x+n.x*r+a.x*along,y:at.y+n.y*r+a.y*along});continue;}const cross=a.x*b.y-a.y*b.x,den=1+a.x*b.x+a.y*b.y,offset=den>1e-8?{x:(n.x+m.x)*r/den,y:(n.y+m.y)*r/den}:null,outer=cross*sign<0;
  if(offset&&(!outer||join==='miter')&&Math.hypot(offset.x,offset.y)<=4*r){out.push({x:at.x+offset.x,y:at.y+offset.y});continue;}
  out.push({x:at.x+n.x*r,y:at.y+n.y*r});if(outer&&join==='round'){const start=Math.atan2(n.y,n.x),delta=Math.atan2(cross,a.x*b.x+a.y*b.y),steps=Math.ceil(Math.abs(delta)/(Math.PI/16));for(let k=1;k<steps;k++){const angle=start+delta*k/steps;out.push({x:at.x+Math.cos(angle)*r,y:at.y+Math.sin(angle)*r});}}out.push({x:at.x+m.x*r,y:at.y+m.y*r});
 }return out;};
 const left=side(1),right=side(-1).reverse();return 'M '+left.map(xy).join(' L ')+(cap==='round'?' A '+r+','+r+' 0 0 0 ':' L ')+xy(right[0])+' L '+right.slice(1).map(xy).join(' L ')+(cap==='round'?' A '+r+','+r+' 0 0 0 '+xy(left[0]):'')+' Z';
}
const api={defaults,choices,ranges,normalize,draw,strokeOutline};if(typeof module!=='undefined')module.exports=api;else root.MorMapCableStyle=api;
})(typeof window==='undefined'?globalThis:window);
