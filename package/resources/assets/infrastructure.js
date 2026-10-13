/* Canonical infrastructure identities and view projections. No duplicate inventory. */
(function(root){
'use strict';
const P=root.MorMapPath||(typeof require==='function'?require('./physical-trace.js'):null);
const T=root.MorMapTopology||(typeof require==='function'?require('./topology.js'):null);
const deviceRef=d=>d.device_id?'lnms:device:'+Number(d.device_id):d.object_id;
const portRef=p=>p.port_id?'lnms:port:'+Number(p.port_id):p.port_ref;
const values=value=>Object.values(value||{});
function scope(graph,workspace='physical'){return workspace==='logical'&&graph?.schema>=2?{...graph,connections:graph.logical_connections||{},disconnected:graph.logical_disconnected||{},topology:'logical'}:graph;}
function connections(graph,ref,workspace='physical'){return values(scope(graph,workspace)?.connections).filter(c=>c.source===ref||c.target===ref);}
function connection(graph,ref,workspace='physical'){return connections(graph,ref,workspace)[0]||null;}
function samePair(c,a,b){return c.source===a&&c.target===b||c.source===b&&c.target===a;}
// Include unsaved cables and explicit disconnections when reporting advisories.
function viewGraph(map,workspace='physical'){
 let view=map;
 if(workspace==='logical')view={infrastructure:scope(map.infrastructure,'logical'),disconnect:map.disconnect,
  equipment:map.nodes.map(d=>({...d,ports:map.anchors.filter(a=>a.node_id===d.id)})),
  cables:map.links.map(c=>({...c,source:portRef(map.anchors.find(a=>a.id===c.source)||{}),target:portRef(map.anchors.find(a=>a.id===c.target)||{})}))};
 const g=P.overlay(view);if(workspace==='logical')g.topology='logical';Object.defineProperty(g,'_pathIndex',{value:P.index(g)});return g;
}
function stackWarning(c,graph){const a=graph.ports?.[c.source],b=graph.ports?.[c.target];return c.kind==='stack'&&(!a?.stack_member||!b?.stack_member||a.device_ref!==b.device_ref||a.stack_member===b.stack_member)?'Stack cable endpoints are not distinct members of the same stack. Verify the stack assignment.':'';}
function warnings(graph,refs){
 if(!graph)return [];const wanted=refs?new Set(refs):null,adj=(graph._pathIndex||P.index(graph)).adjacent,out=[];
 const relevant=r=>!wanted||wanted.has(r),name=r=>[graph.devices?.[graph.ports?.[r]?.device_ref]?.name,graph.ports?.[r]?.label||r].filter(Boolean).join(' / ');
 for(const [ref,edges] of adj){const count=edges.filter(e=>e.type==='cable').length;if(count>1&&relevant(ref))out.push(`Port ${name(ref)} has ${count} ${graph.topology==='logical'?'logical connections':'physical cables'}. All connections are retained; connectivity is ambiguous.`);}
 const parent=new Map(),cycles=[];const find=r=>{let q=r;while(parent.has(q))q=parent.get(q);while(parent.has(r)){const n=parent.get(r);parent.set(r,q);r=n;}return q;};
 const join=(a,b)=>{const x=find(a),y=find(b);if(x===y)cycles.push(a);else parent.set(x,y);};
 if(graph.topology!=='logical')for(const [ref,p] of Object.entries(graph.ports||{}))if(p.peer_id&&ref<p.peer_id&&graph.ports[p.peer_id]?.peer_id===ref&&graph.ports[p.peer_id]?.device_ref===p.device_ref)join(ref,p.peer_id);
 for(const c of values(graph.connections)){if(graph.topology!=='logical')join(c.source,c.target);if(relevant(c.source)||relevant(c.target)){const w=stackWarning(c,graph);if(w)out.unshift(w);if(graph.ports?.[c.source]?.peer_id===c.target)out.unshift('Front and rear already have internal continuity. This additional connection may create a redundant or looped path.');}}
 if(graph.topology!=='logical'&&cycles.some(r=>!wanted||[...wanted].some(p=>find(p)===find(r))))out.unshift('A physical continuity loop is documented. Verify the wiring; path tracing cannot confirm a unique endpoint pair.');
 return [...new Set(out)];
}
function warningText(map,workspace='physical',graph=viewGraph(map,workspace)){
 const refs=workspace==='logical'?map.anchors.map(portRef):map.equipment.flatMap(d=>(d.ports||[]).map(portRef)),list=warnings(graph,refs);
 return list.length?'Warning: '+list.slice(0,3).join(' ')+(list.length>3?` ${list.length-3} further advisories are shown in connection details.`:''):'';
}
function logical(map,graph,geometry,syncProfiles=true){
 if(!graph)return map;if(syncProfiles)T?.applyProfiles(map,graph,'logical',geometry);map.infrastructure=graph;map.infrastructure_revision=graph.revision;
 graph=scope(graph,'logical');
 for(const n of map.nodes)n.object_id=deviceRef(n);for(const a of map.anchors)a.port_ref=portRef(a);
 const byRef=new Map();for(const a of map.anchors)if(!byRef.has(a.port_ref))byRef.set(a.port_ref,a);
 const removed=new Set(map.disconnect||[]),present=new Set(),result=[];
 for(const l of map.links){const a=map.anchors.find(p=>p.id===l.source),b=map.anchors.find(p=>p.id===l.target);if(!a||!b)continue;
  const shared=values(graph.connections).find(c=>samePair(c,a.port_ref,b.port_ref));
  if(shared&&!removed.has(shared.id)){l.connection_id=shared.id;apply(l,shared);present.add(shared.id);result.push(l);}
  else if(!l.connection_id&&!values(graph.disconnected).some(c=>samePair(c,a.port_ref,b.port_ref))){delete l.relationship_warning;result.push(l);}
 }
 for(const c of values(graph.connections)){const a=byRef.get(c.source),b=byRef.get(c.target);if(!a||!b||present.has(c.id)||removed.has(c.id))continue;
  const start=geometry.point(map.nodes.find(n=>n.id===a.node_id),a),end=geometry.point(map.nodes.find(n=>n.id===b.node_id),b);
  const l={id:c.id,connection_id:c.id,source:a.id,target:b.id,points:geometry.shortestRoute(start,end)};apply(l,c);result.push(l);
 }map.links=result;return map;
}
function physical(map,graph,syncProfiles=true){
 if(!graph)return map;if(syncProfiles)T?.applyProfiles(map,graph,'physical');map.infrastructure=graph;map.infrastructure_revision=graph.revision;map.cables??=[];
 const existing=new Map(map.equipment.flatMap(e=>(e.ports||[]).map(p=>[portRef(p),{item:e,port:p}])));
 const available=ref=>existing.get(ref)||(()=>{const peer=graph.ports?.[ref]?.peer_id,at=existing.get(peer);return at&&!at.item.hidden_ports?.includes(ref)&&graph.ports?.[peer]?.peer_id===ref?at:null;})();
 for(const c of values(graph.connections))if(!map.disconnect?.includes(c.id)&&available(c.source)&&available(c.target))for(const ref of [c.source,c.target])if(!existing.has(ref)){const at=available(ref),record=graph.ports[ref],p={port_id:null,port_ref:ref,label:record.label,x:at.port.x,y:at.port.y,comment:''};at.item.ports.push(p);existing.set(ref,{item:at.item,port:p});}
 const points=new Set();for(const e of map.equipment){e.object_id=deviceRef(e);for(const p of e.ports){p.port_ref=portRef(p);points.add(p.port_ref);}}
 const removed=new Set(map.disconnect||[]),present=new Set(),result=[];
 for(const l of map.cables){const c=values(graph.connections).find(c=>samePair(c,l.source,l.target));
  if(c&&!removed.has(c.id)){l.connection_id=c.id;apply(l,c);present.add(c.id);result.push(l);}else if(!l.connection_id&&!values(graph.disconnected).some(c=>samePair(c,l.source,l.target)))result.push(l);
 }
 for(const c of values(graph.connections))if(points.has(c.source)&&points.has(c.target)&&!present.has(c.id)&&!removed.has(c.id)){const l={id:c.id,connection_id:c.id,source:c.source,target:c.target,paths:{}};apply(l,c);result.push(l);}
 map.cables=result;return map;
}
function apply(link,c){link.comment=c.comment||'';link.name=c.name||'';link.kind=c.kind||'cable';if(c.media)link.media=JSON.parse(JSON.stringify(c.media));if(c.color)link.color=c.color;else delete link.color;delete link.relationship_warning;}
// Keep the existing monitoring contract, backed by the ordered physical resolver.
function trace(graph,a,b){
 let g=graph||{ports:{},connections:{},devices:{}};
 if(b&&!(g._pathIndex?(g._pathIndex.adjacent.get(a)||[]).some(e=>e.type==='cable'&&e.to===b):values(g.connections).some(c=>samePair(c,a,b))))g={...g,connections:{...g.connections,'draft-path':{id:'draft-path',source:a,target:b}}};
 const path=P.trace(g,a),ports=path.allRefs.filter(r=>g.ports?.[r]?.source==='librenms'||r?.startsWith('lnms:port:')).map(r=>Number(g.ports?.[r]?.port_id||r.split(':').at(-1)));
 return {ports:[...new Set(ports)],warning:path.warning,detail:[path.ambiguous?'Several cables use one termination; the path is ambiguous.':'',path.loop?'Continuity loop detected.':'',path.status==='Invalid continuity'?'Invalid continuity.':''].filter(Boolean).join(' ')};
}
function cableState(link,graph,ports,devices,ends){
 const refs=ends||[link.source,link.target],path=trace(graph,refs[0],refs[1]);let warning=!!link.relationship_warning||path.warning||path.ports.length<2,down=false;
 const advisory=stackWarning({...link,source:refs[0],target:refs[1]},graph),details=[path.detail,advisory].filter(Boolean);if(advisory)warning=true;
 for(const id of path.ports){const p=ports.get(Number(id)),owner=p&&devices.get(Number(p.device_id)),registered=graph?.ports?.['lnms:port:'+id];
  if(!p||!owner||!owner.last_polled||String(owner.last_polled).startsWith('0000-')||owner.disabled===true||owner.disabled===1||owner.disabled==='1'){warning=true;details.push('Missing or disabled monitoring');continue;}
  if(registered&&registered.device_ref!=='lnms:device:'+Number(p.device_id)){warning=true;details.push('Port mapping mismatch');continue;}
  if(owner.status===0||owner.status==='0'||owner.status===false){down=true;details.push('Device unreachable');continue;}
  const oper=String(p.ifOperStatus).toLowerCase(),admin=String(p.ifAdminStatus).toLowerCase();
  if(oper==='down'&&admin!=='down'){down=true;details.push('Interface down');}
  else if(oper!=='up'||admin==='down'||!(owner.status===1||owner.status==='1'||owner.status===true)){warning=true;details.push(admin==='down'?'Administratively disabled':'Incomplete interface state');}
 }
 if(!path.ports.length)return {key:details.length?'warning':'unknown',color:details.length?'#df8a16':'#8593a1',label:details.length?'Warning / unmonitored':'Unmonitored',detail:[...details,link.kind==='stack'?'No monitored stack-port state is available.':'No monitored endpoint state is available.'].join(' ')};
 const key=down?'down':warning?'warning':'up';return {key,color:({up:'#08a84f',warning:'#df8a16',down:'#d93443'})[key],label:({up:'Healthy',warning:'Warning / unverified',down:'Down'})[key],detail:[...new Set(details)].join('; ')|| (warning?'No complete monitored path':'Monitored endpoints are UP')};
}
// Rebase undo onto the current graph without reverting monitoring/inventory.
function restoreHistory(before,after,graph,workspace){
 const currentGraph=graph;graph=scope(graph,workspace);
 const physicalView=workspace==='physical',key=physicalView?'cables':'links';
 const pair=(map,l)=>physicalView?[l.source,l.target]:[portRef(map.anchors.find(a=>a.id===l.source)||{}),portRef(map.anchors.find(a=>a.id===l.target)||{})];
 const refs=new Set(physicalView?after.equipment.flatMap(e=>(e.ports||[]).map(portRef)):after.anchors.map(portRef));
 const removed=new Set((after.disconnect||[]).filter(id=>graph?.connections?.[id]));
 for(const old of before[key]||[]){const [a,b]=pair(before,old),shared=values(graph?.connections).find(c=>samePair(c,a,b));
  if(shared&&refs.has(a)&&refs.has(b)&&!(after[key]||[]).some(l=>{const ends=pair(after,l);return samePair(shared,...ends);}))removed.add(shared.id);
 }
 for(const l of after[key]||[]){const ends=pair(after,l),shared=values(graph?.connections).find(c=>samePair(c,...ends));
  if(shared){l.connection_id=shared.id;removed.delete(shared.id);}else delete l.connection_id;
 }
 for(const d of after[physicalView?'equipment':'nodes']||[]){const p=T.profile(graph,d);if(p?.revision)d.profile_revision=p.revision;}after.disconnect=[...removed];after.infrastructure=currentGraph;after.infrastructure_revision=currentGraph?.revision;return after;
}

const api={scope,restoreHistory,deviceRef,portRef,connection,connections,samePair,viewGraph,warnings,warningText,logical,physical,trace,cableState,values};
if(typeof module!=='undefined')module.exports=api;else root.MorMapInfrastructure=api;
})(typeof window==='undefined'?globalThis:window);
