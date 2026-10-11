/* MorMap geometry: coordinates always belong to the map, never the viewport. */
(function (root) {
'use strict';
const copy = v => JSON.parse(JSON.stringify(v));
const near = (a,b) => Math.abs(a-b) < 0.001;
const horizontal = (a,b) => near(a.y,b.y);
const point = (node, anchor) => ({x:node.x+node.w*anchor.x, y:node.y+node.h*anchor.y});
function segmentH(p,i){
    for(let distance=0;distance<p.length;distance++)for(const k of [i-distance,i+distance]){
        if(k<0||k>=p.length-1)continue;
        if(near(p[k].x,p[k+1].x)&&near(p[k].y,p[k+1].y))continue;
        const h=horizontal(p[k],p[k+1]);return Math.abs(k-i)%2?!h:h;
    }
    return i%2===0;
}
function route(s,t) {
    const y=Math.min(s.y,t.y)-60, x1=s.x+40, x2=near(t.x-40,x1)?t.x-60:t.x-40;
    return [copy(s), {x:x1,y:s.y}, {x:x1,y}, {x:x2,y}, {x:x2,y:t.y}, copy(t)];
}
function shortestRoute(s,t,firstHorizontal=true){
    if(near(s.x,t.x)||near(s.y,t.y))return [copy(s),copy(t)];
    return [copy(s),firstHorizontal?{x:t.x,y:s.y}:{x:s.x,y:t.y},copy(t)];
}
function attach(points,s,t) {
    if (points.length < 3) return shortestRoute(s,t,points.length===2?horizontal(points[0],points[1]):true);
    if(points.length===3)return [copy(s),segmentH(points,0)?{x:t.x,y:s.y}:{x:s.x,y:t.y},copy(t)];
    const p=copy(points), last=p.length-1;
    const firstH=segmentH(points,0), lastH=segmentH(points,last-1);
    p[0]=copy(s); p[last]=copy(t);
    if(firstH) p[1].y=s.y; else p[1].x=s.x;
    if(lastH) p[last-1].y=t.y; else p[last-1].x=t.x;
    return p;
}
function moveSegment(points,index,position) {
    if(index<0||index>=points.length-1)return copy(points);
    const p=copy(points),a=p[index],b=p[index+1],h=segmentH(points,index),axis=h?'y':'x';
    if(near(a[axis],position[axis]))return p;
    // Keep the endpoint fixed and slide the whole adjacent segment. One corner
    // at that endpoint is sufficient; a four-point detour creates a false loop.
    if(p.length===2)return simplify([p[0],{...p[0],[axis]:position[axis]},{...p[1],[axis]:position[axis]},p[1]]);
    if(index===p.length-2)return moveSegment(p.reverse(),0,position).reverse();
    if(index===0){b[axis]=position[axis];p.splice(1,0,{...a,[axis]:position[axis]});}
    else {a[axis]=position[axis];b[axis]=position[axis];}
    return simplify(p);
}
function moveBend(points,index,position){
    if(index<=0||index>=points.length-1)return copy(points);
    const p=copy(points),firstH=segmentH(points,index-1),lastH=segmentH(points,index),before=p.slice(0,index),after=p.slice(index+1),a=before.at(-1),b=after[0],q=copy(position);
    if(index>1){if(firstH)a.y=q.y;else a.x=q.x;}
    else if(firstH&&!near(a.y,q.y))before.push({x:a.x,y:q.y});
    else if(!firstH&&!near(a.x,q.x))before.push({x:q.x,y:a.y});
    if(index<points.length-2){if(lastH)b.y=q.y;else b.x=q.x;}
    else if(lastH&&!near(b.y,q.y))after.unshift({x:b.x,y:q.y});
    else if(!lastH&&!near(b.x,q.x))after.unshift({x:q.x,y:b.y});
    return [...before,q,...after];
}
function snapCable(position,points,{enabled=true,grid=20,tolerance=8,ignore=[]}={}){
    const point={x:position.x,y:position.y},guides=[];if(!enabled)return {point,guides};
    for(const axis of ['x','y']){const targets=points.filter((_,i)=>i===0||i===points.length-1||!ignore.includes(i)).map(p=>p[axis]);let closest=null,distance=tolerance;
        for(const v of targets){const d=Math.abs(v-position[axis]);if(d<=distance){distance=d;closest=v;}}
        if(closest!==null){point[axis]=closest;guides.push({axis,value:closest});}else point[axis]=Math.round(position[axis]/grid)*grid;
    }return {point,guides};
}
function detour(points,i,offset=35) {
    const p=copy(points), a=p[i], b=p[i+1], h=segmentH(points,i);
    const u={x:a.x+(b.x-a.x)/3,y:a.y+(b.y-a.y)/3};
    const v={x:a.x+2*(b.x-a.x)/3,y:a.y+2*(b.y-a.y)/3};
    const u2=copy(u),v2=copy(v);
    if(h) { u2.y+=offset;v2.y+=offset; } else {u2.x+=offset;v2.x+=offset;}
    p.splice(i+1,0,u,u2,v2,v); return p;
}
function removeDetour(points,i) {
    if(i<2 || i+3>=points.length) return null;
    const a=points[i-2], b=points[i+3];
    if(!near(a.x,b.x) && !near(a.y,b.y)) return null;
    const p=copy(points);p.splice(i-1,4);return p;
}
function orthogonal(p) {return p.every((a,i)=>!i||near(a.x,p[i-1].x)||near(a.y,p[i-1].y));}
function simplify(points){
 const p=[];for(const point of points){if(p.length&&near(p.at(-1).x,point.x)&&near(p.at(-1).y,point.y))continue;p.push(copy(point));while(p.length>2){const [a,b,c]=p.slice(-3);if((near(a.x,b.x)&&near(b.x,c.x))||(near(a.y,b.y)&&near(b.y,c.y)))p.splice(p.length-2,1);else break;}}
 return p.length<2?[copy(points[0]),copy(points.at(-1))]:p;
}
function removeBend(points,index){
 if(index<=0||index>=points.length-1)return null;
 const p=copy(points),a=p[index-1],b=p[index+1],old=p[index];
 if(near(a.x,b.x)||near(a.y,b.y))p.splice(index,1);
 else p[index]=near(a.y,old.y)?{x:a.x,y:b.y}:{x:b.x,y:a.y};
 return simplify(p);
}
function occupiedPort(map,anchorId){
 const a=map.anchors.find(a=>a.id===anchorId);if(!a)return null;
 const ref=p=>p.port_id?'lnms:port:'+Number(p.port_id):p.port_ref;const ids=new Set(map.anchors.filter(b=>ref(b)===ref(a)).map(b=>b.id));
 return map.links.find(l=>ids.has(l.source)||ids.has(l.target))||null;
}
function snap(value,enabled,grid=25){return enabled?Math.round(value/grid)*grid:value;}
function connectorRoute(s,t,type='right-angle'){
 if(type==='straight')return [copy(s),copy(t)];
 if(type==='curved'){const dx=t.x-s.x,dy=t.y-s.y;
  if(Math.abs(dx)>=Math.abs(dy))return [copy(s),{x:s.x+dx/3,y:s.y+(near(dy,0)?40:0)},{x:t.x-dx/3,y:t.y+(near(dy,0)?40:0)},copy(t)];
  return [copy(s),{x:s.x+(near(dx,0)?40:0),y:s.y+dy/3},{x:t.x+(near(dx,0)?40:0),y:t.y-dy/3},copy(t)];
 }return shortestRoute(s,t);
}
function attachConnector(points,s,t,type='right-angle'){
 if(type==='straight')return connectorRoute(s,t,type);
 if(type==='curved'){if(points.length!==4)return connectorRoute(s,t,type);return [copy(s),{x:points[1].x+s.x-points[0].x,y:points[1].y+s.y-points[0].y},{x:points[2].x+t.x-points[3].x,y:points[2].y+t.y-points[3].y},copy(t)];}
 return attach(points,s,t);
}
function connectorSegments(points,type='right-angle',format={}){
 if(type==='curved'&&points.length===4)return [{kind:'C',a:points[0],b:points[1],c:points[2],d:points[3]}];
 const out=[],radius=type==='straight'?0:Math.max(0,Number(format.rounding)||0);let last=points[0];
 for(let i=1;i<points.length;i++){const corner=points[i],next=points[i+1],before=points[i-1],inLength=Math.hypot(corner.x-before.x,corner.y-before.y),outLength=next?Math.hypot(next.x-corner.x,next.y-corner.y):0;
  const cross=next?(corner.x-before.x)*(next.y-corner.y)-(corner.y-before.y)*(next.x-corner.x):0;
  const r=next&&Math.abs(cross)>.0001?Math.min(radius,inLength/2,outLength/2):0;
  if(r){const entry={x:corner.x+(before.x-corner.x)*r/inLength,y:corner.y+(before.y-corner.y)*r/inLength},exit={x:corner.x+(next.x-corner.x)*r/outLength,y:corner.y+(next.y-corner.y)*r/outLength};out.push({kind:'L',a:last,d:entry},{kind:'Q',a:entry,b:corner,d:exit});last=exit;}
  else{out.push({kind:'L',a:last,d:corner});last=corner;}
 }return out;
}
function connectorPath(points,type='right-angle',format={}){
 const xy=p=>`${p.x},${p.y}`;if(!format.rounding)return 'M '+xy(points[0])+(type==='curved'&&points.length===4?' C '+points.slice(1).map(xy).join(' '):' L '+points.slice(1).map(xy).join(' '));
 return 'M '+xy(points[0])+connectorSegments(points,type,format).map(s=>' '+s.kind+' '+[s.b,s.c,s.d].filter(Boolean).map(xy).join(' ')).join('');
}
function segmentPoint(s,t){const u=1-t;return s.kind==='C'?{x:u*u*u*s.a.x+3*u*u*t*s.b.x+3*u*t*t*s.c.x+t*t*t*s.d.x,y:u*u*u*s.a.y+3*u*u*t*s.b.y+3*u*t*t*s.c.y+t*t*t*s.d.y}:s.kind==='Q'?{x:u*u*s.a.x+2*u*t*s.b.x+t*t*s.d.x,y:u*u*s.a.y+2*u*t*s.b.y+t*t*s.d.y}:{x:s.a.x+(s.d.x-s.a.x)*t,y:s.a.y+(s.d.y-s.a.y)*t};}
// The label follows the rendered centerline, including rounded corners.
function cableTrack(points,type,format={}){
 const segments=connectorSegments(points,type,format),samples=[points[0]],spans=[null],lengths=[0];
 for(const segment of segments){const count=segment.kind==='C'?128:segment.kind==='Q'?24:1;for(let i=1;i<=count;i++){const p=segmentPoint(segment,i/count),old=samples.at(-1);samples.push(p);spans.push({segment,t0:(i-1)/count,t1:i/count});lengths.push(lengths.at(-1)+Math.hypot(p.x-old.x,p.y-old.y));}}
 const total=lengths.at(-1),position=fraction=>{const distance=Math.max(0,Math.min(1,fraction))*total;let i=1;while(i<samples.length-1&&lengths[i]<distance)i++;const span=lengths[i]-lengths[i-1],t=span?(distance-lengths[i-1])/span:0,s=spans[i];return segmentPoint(s.segment,s.t0+(s.t1-s.t0)*t);};
 return {samples,lengths,total,position};
}
function pinInfo(info,points,type,keepOffset=false,format={}){
 const track=cableTrack(points,type,format);let best=Infinity,fraction=0;
 for(let i=1;i<track.samples.length;i++){const a=track.samples[i-1],b=track.samples[i],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((info.x-a.x)*dx+(info.y-a.y)*dy)/len)):0,x=a.x+t*dx,y=a.y+t*dy,d=(x-info.x)**2+(y-info.y)**2;
  if(d<best){best=d;fraction=track.total?(track.lengths[i-1]+t*(track.lengths[i]-track.lengths[i-1]))/track.total:0;}
 }
 const p=track.position(fraction),attachment={fraction,dx:keepOffset?info.x-p.x:0,dy:keepOffset?info.y-p.y:0};
 return {...info,x:p.x+attachment.dx,y:p.y+attachment.dy,attachment};
}
function attachInfo(info,points,type,format={}){
 if(!info)return info;if(!info.attachment)return pinInfo(info,points,type,false,format);
 const a=info.attachment,p=cableTrack(points,type,format).position(a.fraction);
 return {...info,x:p.x+a.dx,y:p.y+a.dy};
}
function appendWaypoint(points,point,vertical=false){const p=points.map(q=>({x:q.x,y:q.y})),last=p.at(-1),end={x:point.x,y:point.y};if(!near(last.x,end.x)&&!near(last.y,end.y))p.push(vertical?{x:last.x,y:end.y}:{x:end.x,y:last.y});p.push(end);return simplify(p);}
function nearestSegment(points,position){let best=Infinity,index=0;for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((position.x-a.x)*dx+(position.y-a.y)*dy)/len)):0,d=Math.hypot(position.x-a.x-t*dx,position.y-a.y-t*dy);if(d<best){best=d;index=i;}}return index;}
function addDetourAt(points,index,position,offset=35){const a=points[index],b=points[index+1],h=segmentH(points,index),axis=h?'x':'y',length=Math.abs(b[axis]-a[axis]);if(length<.01)return copy(points);const direction=Math.sign(b[axis]-a[axis]),center=Math.max(length*.1,Math.min(length*.9,(position[axis]-a[axis])*direction)),half=Math.min(length/6,30,center/2,(length-center)/2),p=copy(points),u={...a,[axis]:a[axis]+direction*(center-half)},v={...a,[axis]:a[axis]+direction*(center+half)},cross=h?'y':'x';p.splice(index+1,0,u,{...u,[cross]:u[cross]+offset},{...v,[cross]:v[cross]+offset},v);return p;}
function snapPort(position,others,width,height,tolerance=6){const point={x:position.x,y:position.y},guides=[];for(const [axis,size]of [['x',width],['y',height]]){let distance=tolerance,best;for(const p of others){const d=Math.abs(p[axis]-position[axis])*size;if(d<distance){distance=d;best=p[axis];}}if(best!==undefined){point[axis]=best;guides.push({axis,value:best});}}return {point,guides};}
function alignPorts(ports,{axis='rows',tolerance=.04,distribute=false}={}){
 const cross=axis==='columns'?'x':'y',along=cross==='x'?'y':'x',groups=[];
 for(const p of [...ports].sort((a,b)=>a[cross]-b[cross])){const group=groups.at(-1);if(!group||p[cross]-group[0][cross]>tolerance)groups.push([p]);else group.push(p);}
 const result=ports.map(p=>({...p}));for(const group of groups){if(group.length<2)continue;const sorted=[...group].sort((a,b)=>a[along]-b[along]),values=group.map(p=>p[cross]).sort((a,b)=>a-b),middle=(values[Math.floor((values.length-1)/2)]+values[Math.floor(values.length/2)])/2,lo=sorted[0][along],hi=sorted.at(-1)[along];for(const [i,p]of sorted.entries()){const q=result[ports.indexOf(p)];q[cross]=middle;if(distribute)q[along]=lo+(hi-lo)*i/(sorted.length-1);}}
 return result;
}
function infoLayout(text,size=8,measure){
 const fontSize=Math.max(4,Math.min(32,Number(size)||8)),padding=fontSize*.45,lineHeight=fontSize*1.3,lines=[];
 for(const row of String(text).split('\n')){let rest=row;while(rest.length>44){let at=rest.lastIndexOf(' ',44);if(at<8)at=44;lines.push(rest.slice(0,at));rest=rest.slice(at).trimStart();}lines.push(rest);}
 const widths=lines.map(s=>measure?measure(s,fontSize):Array.from(s).length*fontSize*.6);
 return {fontSize,padding,lineHeight,lines,width:Math.max(fontSize,...widths)+2*padding,height:lines.length*lineHeight+2*padding};
}
const api={cableTrack,snap,copy,point,route,shortestRoute,attach,moveSegment,moveBend,snapCable,detour,removeDetour,orthogonal,removeBend,occupiedPort,segmentH,connectorRoute,attachConnector,connectorPath,connectorSegments,pinInfo,attachInfo,appendWaypoint,nearestSegment,addDetourAt,snapPort,alignPorts,infoLayout};
if(typeof module!=='undefined') module.exports=api; else root.MorMapGeometry=api;
})(typeof window==='undefined'?globalThis:window);
