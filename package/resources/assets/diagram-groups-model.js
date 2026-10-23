/* Presentation-only groups. Cable/port identities and shared infrastructure never change. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v));
const nodes=m=>m.nodes||m.equipment||[],cables=m=>m.links||m.cables||[];
const clusters=(m,context)=>(m?.clusters||[]).filter(g=>g.context===context);
const ducts=(m,context)=>(m?.ducts||[]).filter(g=>g.context===context);
function clean(m){
 const ids=new Set(nodes(m).map(n=>n.id)),links=new Set(cables(m).map(c=>c.id));
 for(const [key,valid]of [['clusters',ids],['ducts',links]])if(m[key])m[key]=m[key].map(g=>({...g,members:g.members.filter(id=>valid.has(id))})).filter(g=>g.members.length&&validContext(m,g.context));
 for(const g of m.clusters||[])for(const id of Object.keys(g.routes||{}))if(!links.has(id))delete g.routes[id];
 for(const d of m.ducts||[])for(const key of Object.keys(d.branches||{})){const [kind,id]=key.split(':');if(kind.startsWith('cluster-')?!(m.clusters||[]).some(g=>g.id===id&&g.context===d.context):!d.members.includes(id))delete d.branches[key];}
 if(m.cluster_positions)for(const [context,positions]of Object.entries(m.cluster_positions)){if(!validContext(m,context)){delete m.cluster_positions[context];continue;}for(const id of Object.keys(positions))if(!ids.has(id))delete positions[id];}
 return m;
}
function validContext(m,context){if(m.nodes)return context==='logical';const [kind,id]=context.split(':');return ['location','cabling'].includes(kind)&&(id==='root'||m.locations.some(l=>l.id===id));}
function bounds(group,boxes){
 if(group.frame)return copy(group.frame);
 const list=group.members.map(id=>boxes.get(id)).filter(Boolean);if(!list.length)return null;
 const x=Math.min(...list.map(b=>b.x))-28,y=Math.min(...list.map(b=>b.y))-104;
 return {x,y,w:Math.max(340,Math.max(...list.map(b=>b.x+b.w))-x+32),h:Math.max(170,Math.max(...list.map(b=>b.y+b.h))-y+58)};
}
function endpointOwners(m,c){if(m.nodes)return [c.source,c.target].map(id=>m.anchors.find(a=>a.id===id)?.node_id);return [c.source,c.target].map(ref=>m.equipment.find(e=>(e.ports||[]).some(p=>(p.port_id?'lnms:port:'+p.port_id:p.port_ref)===ref))?.id);}
function movedPoints(points,dx,dy){return points.map(p=>({...p,x:p.x+dx,y:p.y+dy}));}
function moveExtras(m,context,ids,dx,dy){
 const hosts=new Set(nodes(m).filter(n=>ids.has(n.id)).map(n=>Number(n.device_id)));
 for(const g of m.vm_groups||[])if(g.context===context&&hosts.has(g.host_id)){g.x+=dx;g.y+=dy;}
 for(const d of ducts(m,context)){const all=d.members.map(id=>cables(m).find(c=>c.id===id)).filter(Boolean);if(all.length&&all.every(c=>endpointOwners(m,c).every(id=>ids.has(id)))){d.points=movedPoints(d.points,dx,dy);for(const key of Object.keys(d.branches||{}))d.branches[key]=movedPoints(d.branches[key],dx,dy);}}
}
function moveLogical(m,group,dx,dy,G){
 const ids=new Set(group.members);if(group.frame){group.frame.x+=dx;group.frame.y+=dy;}
 for(const n of m.nodes)if(ids.has(n.id)){n.x+=dx;n.y+=dy;if(n.comment_box){n.comment_box.x+=dx;n.comment_box.y+=dy;}}
 const endpoint=id=>{const a=m.anchors.find(a=>a.id===id);return G.point(m.nodes.find(n=>n.id===a.node_id),a);};
 for(const c of m.links){if(!endpointOwners(m,c).some(id=>ids.has(id)))continue;const both=endpointOwners(m,c).every(id=>ids.has(id));c.points=G.attachConnector(both?movedPoints(c.points,dx,dy):c.points,endpoint(c.source),endpoint(c.target),c.connector);if(c.info)c.info=G.attachInfo({...c.info,x:c.info.x+(both?dx:0),y:c.info.y+(both?dy:0)},c.points,c.connector,c.format);if(both&&c.comment_box){c.comment_box.x+=dx;c.comment_box.y+=dy;}}
 moveExtras(m,group.context,ids,dx,dy);
}
function movePhysical(m,group,dx,dy,M,G){
 const [kind,value]=group.context.split(':'),location=value==='root'?null:value,cabling=kind==='cabling',project=M.projection(m,location,cabling),ids=new Set(group.members);if(group.frame){group.frame.x+=dx;group.frame.y+=dy;}
 const oldPaths=new Map();for(const c of m.cables||[]){const a=M.portPosition(m,c.source,location,cabling),b=M.portPosition(m,c.target,location,cabling);if(!a||!b)continue;const frame=M.cableFrame(m,c,location,cabling);oldPaths.set(c.id,{frame,points:(c.paths?.[frame.key]||G.connectorRoute({x:a.x-frame.x,y:a.y-frame.y},{x:b.x-frame.x,y:b.y-frame.y},c.connectors?.[frame.key])).map(p=>({x:p.x+frame.x,y:p.y+frame.y}))});}
 for(const n of m.equipment)if(ids.has(n.id)&&project.boxes.has(n.id)){const b=project.boxes.get(n.id);if(M.location(m,n.parent_id)?.type==='rack'){m.cluster_positions??={};(m.cluster_positions[group.context]??={})[n.id]={x:b.x+dx,y:b.y+dy};}else if(cabling){m.cabling_positions??={};(m.cabling_positions[group.context]??={})[n.id]={x:b.x+dx,y:b.y+dy};}else{n.x+=dx;n.y+=dy;}const comment=n.comment_boxes?.[group.context];if(comment){comment.x+=dx;comment.y+=dy;}}
 for(const c of m.cables||[]){const old=oldPaths.get(c.id);if(!old||!endpointOwners(m,c).some(id=>ids.has(id)))continue;const a=M.portPosition(m,c.source,location,cabling),b=M.portPosition(m,c.target,location,cabling),frame=M.cableFrame(m,c,location,cabling),type=c.connectors?.[old.frame.key],both=endpointOwners(m,c).every(id=>ids.has(id)),points=G.attachConnector(both?movedPoints(old.points,dx,dy):old.points,a,b,type);c.paths??={};c.paths[frame.key]=points.map(p=>({x:p.x-frame.x,y:p.y-frame.y}));if(frame.key!==old.frame.key){for(const key of ['connectors','formats'])if(c[key]?.[old.frame.key])c[key][frame.key]=copy(c[key][old.frame.key]);}if(c.infos?.[old.frame.key]){c.infos[frame.key]=G.attachInfo({...c.infos[old.frame.key],x:c.infos[old.frame.key].x+old.frame.x+(both?dx:0)-frame.x,y:c.infos[old.frame.key].y+old.frame.y+(both?dy:0)-frame.y},c.paths[frame.key],type,c.formats?.[frame.key]);}}
 moveExtras(m,group.context,ids,dx,dy);
}
// A port exits its own equipment box before joining the shared corridor.
function exitStub(start,end,box){
 let side='right';
 if(box){const cx=box.x+box.w/2,cy=box.y+box.h/2,dx=(end.x-cx)/Math.max(1,box.w),dy=(end.y-cy)/Math.max(1,box.h);side=Math.abs(dx)>Math.abs(dy)?(dx>=0?'right':'left'):(dy>=0?'bottom':'top');}
 else side=Math.abs(end.x-start.x)>=Math.abs(end.y-start.y)?(end.x>=start.x?'right':'left'):(end.y>=start.y?'bottom':'top');
 if(box){const nearest=[['left',start.x-box.x],['right',box.x+box.w-start.x],['top',start.y-box.y],['bottom',box.y+box.h-start.y]].sort((a,b)=>a[1]-b[1])[0];if(nearest[1]<=.2*Math.min(box.w,box.h))side=nearest[0];}
 const stub={...start},gap=24;
 if(side==='right')stub.x=Math.max(start.x,box?box.x+box.w:start.x)+gap;
 if(side==='left')stub.x=Math.min(start.x,box?box.x:start.x)-gap;
 if(side==='bottom')stub.y=Math.max(start.y,box?box.y+box.h:start.y)+gap;
 if(side==='top')stub.y=Math.min(start.y,box?box.y:start.y)-gap;
 return {stub,side};
}
function branchRoute(start,end,box,trunkNeighbour,G,endBox=null){
 const {stub,side}=exitStub(start,end,box),gap=24;
 const lead=endBox?exitStub(end,start,endBox).stub:{...end};if(trunkNeighbour&&!endBox){if(Math.abs(trunkNeighbour.x-end.x)>.01)lead.x+=Math.sign(end.x-trunkNeighbour.x)*gap;else lead.y+=Math.sign(end.y-trunkNeighbour.y)*gap;}
 const h=side==='right'||side==='left',mid=h?(stub.x+lead.x)/2:(stub.y+lead.y)/2;
 const points=[start,stub,...(h?[{x:mid,y:stub.y},{x:mid,y:lead.y}]:[{x:stub.x,y:mid},{x:lead.x,y:mid}]),lead,end];
 const out=[];for(const p of points){if(out.length&&Math.hypot(p.x-out.at(-1).x,p.y-out.at(-1).y)<.001)continue;out.push({...p});while(out.length>2){const [a,b,c]=out.slice(-3);if((Math.abs(a.x-b.x)<.001&&Math.abs(b.x-c.x)<.001)||(Math.abs(a.y-b.y)<.001&&Math.abs(b.y-c.y)<.001))out.splice(out.length-2,1);else break;}}
 return out.length>1?out:[{...start},{...end}];
}
function resizeFrame(frame,handle,dx,dy,minW=220,minH=100){
 const r=copy(frame),right=r.x+r.w,bottom=r.y+r.h;
 if(handle.includes('e'))r.w=Math.max(minW,r.w+dx);
 if(handle.includes('s'))r.h=Math.max(minH,r.h+dy);
 if(handle.includes('w')){r.x=Math.min(right-minW,r.x+dx);r.w=right-r.x;}
 if(handle.includes('n')){r.y=Math.min(bottom-minH,r.y+dy);r.h=bottom-r.y;}
 return r;
}
function initialDuct(entries,G){
 const first=entries[0],reference=first.a,oriented=entries.map(e=>{const direct=Math.hypot(e.a.x-reference.x,e.a.y-reference.y),reverse=Math.hypot(e.b.x-reference.x,e.b.y-reference.y);return reverse<direct?{a:e.b,b:e.a}:e;});
 const mean=key=>({x:oriented.reduce((sum,e)=>sum+e[key].x,0)/oriented.length,y:oriented.reduce((sum,e)=>sum+e[key].y,0)/oriented.length});
 const a=mean('a'),b=mean('b'),p={x:a.x+(b.x-a.x)*.22,y:a.y+(b.y-a.y)*.22},q={x:a.x+(b.x-a.x)*.78,y:a.y+(b.y-a.y)*.78};
 if(Math.hypot(q.x-p.x,q.y-p.y)<40){q.x=p.x+160;q.y=p.y;}
 return G.connectorRoute(p,q,'right-angle');
}
function parallelRoutes(entries,axis,position,spacing){
 if(!['vertical','horizontal'].includes(axis)||!Number.isFinite(position)||Math.abs(position)>99000||!Number.isFinite(spacing)||spacing<4||spacing>200||entries.length<2)throw Error('Select two or more cables, spacing 4–200 and a valid corridor position.');
 return entries.map((e,i)=>{const value=position+(i-(entries.length-1)/2)*spacing,a=e.points[0],b=e.points.at(-1);if(Math.abs(value)>100000)throw Error('Parallel routes exceed the map coordinate range.');return {id:e.c.id,points:axis==='vertical'?[{...a},{x:value,y:a.y},{x:value,y:b.y},{...b}]:[{...a},{x:a.x,y:value},{x:b.x,y:value},{...b}]};});
}
function validate(m){
 const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=100000&&Math.abs(p.y)<=100000;
 for(const n of nodes(m))if(!point(n))throw Error('A device position is outside the map coordinate range.');
 for(const positions of Object.values(m.cluster_positions||{}))for(const p of Object.values(positions))if(!point(p))throw Error('Invalid cluster position.');
 const route=ps=>{if(!Array.isArray(ps)||ps.length<2||ps.length>100||ps.some((p,i)=>!point(p)||i&&Math.abs(p.x-ps[i-1].x)>.01&&Math.abs(p.y-ps[i-1].y)>.01))throw Error('Invalid group cable route.');};
 for(const g of m.clusters||[]){if(g.frame&&(!point(g.frame)||!Number.isFinite(g.frame.w)||!Number.isFinite(g.frame.h)||g.frame.w<220||g.frame.h<100||g.frame.w>100000||g.frame.h>100000))throw Error('Invalid cluster size.');if(g.compact&&(!Number.isFinite(g.compact.w)||!Number.isFinite(g.compact.h)||g.compact.w<220||g.compact.h<64||g.compact.w>100000||g.compact.h>100000))throw Error('Invalid collapsed cluster size.');for(const ps of Object.values(g.routes||{}))route(ps);}
 for(const d of m.ducts||[])for(const ps of Object.values(d.branches||{}))route(ps);
 for(const key of ['clusters','ducts']){const used=new Set();if((m[key]||[]).length>500)throw Error('Maximum 500 diagram groups per map.');for(const g of m[key]||[]){if(!g.name?.trim()||g.name.length>120||!validContext(m,g.context))throw Error('Invalid group name or context.');for(const id of g.members){const k=g.context+':'+id;if(used.has(k))throw Error('A host or cable belongs to one group per view.');used.add(k);}if(key==='ducts'){if(!Number.isFinite(g.width)||g.width<6||g.width>24||g.points.length<2||g.points.length>100)throw Error('Ducts need 2–100 points and a width of 6–24 pixels.');for(let i=0;i<g.points.length;i++){const p=g.points[i],q=g.points[i-1];if(!point(p)||q&&Math.abs(q.x-p.x)>.01&&Math.abs(q.y-p.y)>.01)throw Error('Duct paths must stay orthogonal and inside the map coordinate range.');}}}}
 return m;
}
const api={copy,nodes,cables,clusters,ducts,clean,validate,validContext,bounds,endpointOwners,movedPoints,moveLogical,movePhysical,initialDuct,branchRoute,resizeFrame,parallelRoutes};
if(typeof module!=='undefined')module.exports=api;else root.MorMapDiagramGroupsModel=api;
})(typeof window==='undefined'?globalThis:window);
