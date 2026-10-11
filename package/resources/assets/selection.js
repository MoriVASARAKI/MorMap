/* Transient selection helpers; no selection state is written into map documents. */
(function(root){
'use strict';
const key=v=>v.type+':'+v.id,unique=items=>[...new Map(items.map(v=>[key(v),v])).values()];
const rect=(a,b)=>({x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)});
const overlap=(a,b)=>a.x<=b.x+b.w&&a.x+a.w>=b.x&&a.y<=b.y+b.h&&a.y+a.h>=b.y;
function bounds(b,angle=0){const r=angle*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r)),w=b.w*c+b.h*s,h=b.w*s+b.h*c;return {x:b.x+b.w/2-w/2,y:b.y+b.h/2-h/2,w,h};}
function segment(a,b,r){let lo=0,hi=1;for(const [p,q]of [[a.x-b.x,a.x-r.x],[b.x-a.x,r.x+r.w-a.x],[a.y-b.y,a.y-r.y],[b.y-a.y,r.y+r.h-a.y]]){if(!p){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}return true;}
function pathHits(points,r,type,format,G){if(!points?.length)return false;if(type==='curved'||format?.rounding){const track=G.cableTrack(points,type,format);let a=track.position(0);for(let i=1;i<=128;i++){const b=track.position(i/128);if(segment(a,b,r))return true;a=b;}return false;}return points.slice(1).some((b,i)=>segment(points[i],b,r));}
function toggle(items,item){return items.some(v=>key(v)===key(item))?items.filter(v=>key(v)!==key(item)):unique([...items,item]);}
function marquee(parent,r,shape){parent.append(shape('rect',{x:r.x,y:r.y,width:r.w,height:r.h,fill:'#1683a620','stroke':'#167eab','stroke-width':1,'stroke-dasharray':'5 3','vector-effect':'non-scaling-stroke','pointer-events':'none','data-output':'omit','data-selection-marquee':'true'}));}
function box(parent,b,shape,id){parent.append(shape('rect',{x:b.x-3,y:b.y-3,width:b.w+6,height:b.h+6,fill:'none',stroke:'#087fbd','stroke-width':1.5,'stroke-dasharray':'5 3','vector-effect':'non-scaling-stroke','pointer-events':'none','data-output':'omit','data-selected-item':id}));}
function line(parent,points,type,format,G,shape,id){parent.append(shape('path',{d:G.connectorPath(points,type,format),fill:'none',stroke:'#138ac0','stroke-width':6,opacity:.28,'vector-effect':'non-scaling-stroke','pointer-events':'none','data-output':'omit','data-selected-item':id}));}
// Resolve overlapping generous SVG hit areas against the rendered cable centerline.
function nearestCable(cables,point,tolerance,G,preferred){
 let best=null,bestDistance=tolerance,preferredDistance=Infinity;
 for(const cable of cables){
  if(!cable.points||cable.points.length<2)continue;
  const samples=G.cableTrack(cable.points,cable.type,cable.format).samples;let distance=Infinity;
  for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/length)):0;distance=Math.min(distance,Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy));}
  if(cable.id===preferred)preferredDistance=distance;
  if(distance<=bestDistance){best=cable.id;bestDistance=distance;}
 }
 // MouseEvent coordinates can be rounded to pixels. Preserve the DOM target
 // within one screen pixel, while resolving visibly distinct nearby lines.
 return preferredDistance<=tolerance&&preferredDistance<=bestDistance+tolerance/6?preferred:best;
}
function panScale(svg,view){const m=svg.getScreenCTM?.()?.inverse();return m?{a:m.a,b:m.b,c:m.c,d:m.d}:{a:view.w/Math.max(1,svg.clientWidth),b:0,c:0,d:view.h/Math.max(1,svg.clientHeight)};}
function panKeys(host,enabled=()=>true){let held=false,used=false;const form=e=>e.target.closest?.('input,textarea,select,[contenteditable=true],dialog'),reset=()=>{held=used=false;host.classList.remove('mw-panning');};root.document.addEventListener('keydown',e=>{if((e.code==='Space'||e.key===' ')&&!form(e)&&enabled()){held=true;if(!e.target.closest?.('button,a,summary,[role=button]'))e.preventDefault();host.classList.add('mw-panning');}},true);root.document.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' '){if(used)e.preventDefault();reset();}},true);root.addEventListener?.('blur',reset);return ()=>{if(held)used=true;return held;};}

const api={key,unique,rect,overlap,bounds,segment,pathHits,toggle,marquee,box,line,nearestCable,panScale,panKeys};if(typeof module!=='undefined')module.exports=api;else root.MorMapSelection=api;
})(typeof window==='undefined'?globalThis:window);
