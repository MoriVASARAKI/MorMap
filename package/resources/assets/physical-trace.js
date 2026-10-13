/* Ordered physical continuity. Reuses canonical ports, peer_id and cable IDs. */
(function(root){
'use strict';
const values=v=>Object.values(v||{});
const active=(graph,ref)=>{const p=graph.ports?.[ref],d=graph.devices?.[p?.device_ref];return !p?.peer_id&&(p?.source==='librenms'||d?.source==='librenms'||d?.endpoint_role==='active'||d?.type==='active');};
function overlay(map){
 const g=map.infrastructure||{},connections={...g.connections},ports={...g.ports},devices={...g.devices};
 for(const id of map.disconnect||[])delete connections[id];
 for(const d of map.equipment||[]){const owner=d.device_id?'lnms:device:'+d.device_id:d.object_id;
  devices[owner]={...devices[owner],id:owner,name:d.label,source:d.device_id?'librenms':'mormap',device_id:d.device_id};
  for(const p of d.ports||[]){const ref=p.port_id?'lnms:port:'+p.port_id:p.port_ref;ports[ref]={...ports[ref],id:ref,device_ref:owner,label:p.label,stack_member:d.stack_member??ports[ref]?.stack_member,...(p.port_id?{source:'librenms',port_id:p.port_id}:{})};}
 }
 const pairs=new Map(values(connections).map(c=>[[c.source,c.target].sort().join('|'),c.id]));
 for(const c of map.cables||[]){const pair=[c.source,c.target].sort().join('|'),id=pairs.get(pair)||c.connection_id||c.id;connections[id]={...connections[id],...c,id};pairs.set(pair,id);}
 return {...g,connections,ports,devices};
}
function index(graph){
 const adjacent=new Map(),invalid=new Set();
 const add=(a,b,edge)=>{if(!adjacent.has(a))adjacent.set(a,[]);adjacent.get(a).push({to:b,...edge});};
 for(const c of values(graph.connections)){add(c.source,c.target,{type:'cable',id:c.id,cable:c});add(c.target,c.source,{type:'cable',id:c.id,cable:c});}
 for(const [ref,p] of Object.entries(graph.ports||{}))if(graph.topology!=='logical'&&p.peer_id){const peer=graph.ports[p.peer_id];
  if(!peer||peer.peer_id!==ref||peer.device_ref!==p.device_ref||ref===p.peer_id||p.source==='librenms'){invalid.add(ref);continue;}
  add(ref,p.peer_id,{type:'internal',id:[ref,p.peer_id].sort().join('|')});
 }
 return {adjacent,invalid};
}
function trace(graph,start,prepared=graph._pathIndex||index(graph)){
 const {adjacent,invalid}=prepared,visited=new Set(),queue=[start];let warning=false,ambiguous=false;
 while(queue.length){const ref=queue.pop();if(visited.has(ref))continue;visited.add(ref);
  const edges=adjacent.get(ref)||[];if(!graph.ports?.[ref]||invalid.has(ref))warning=true;
  if(edges.length>2||edges.filter(e=>e.type==='cable').length>1){warning=true;ambiguous=true;}
  for(const e of edges)if(!visited.has(e.to))queue.push(e.to);
 }
 const terminals=[...visited].filter(r=>(adjacent.get(r)||[]).length<2);
 const managed=ref=>active(graph,ref);
 // A cycle may also have an attached branch or an open end.
 const edgeCount=[...visited].reduce((count,ref)=>count+(adjacent.get(ref)||[]).length,0)/2;
 const loop=visited.size>1&&edgeCount>=visited.size;
 const origin=terminals.includes(start)?start:terminals.find(managed)||terminals[0]||start;
 const refs=[],edges=[],ordered=new Set();let ref=origin,previous=null;
 while(ref&&!ordered.has(ref)){refs.push(ref);ordered.add(ref);const choices=(adjacent.get(ref)||[]).filter(e=>e.id!==previous);if(choices.length!==1)break;const next=choices[0];if(ordered.has(next.to)){if(loop)edges.push(next);break;}edges.push(next);previous=next.id;ref=next.to;}
 const cableIds=[...new Set([...visited].flatMap(r=>(adjacent.get(r)||[]).filter(e=>e.type==='cable').map(e=>e.id)))];
 const endpoints=terminals.filter(managed),openEnds=terminals.filter(r=>!managed(r));
 const complete=!warning&&!loop&&!ambiguous&&terminals.length===2&&endpoints.length===2&&cableIds.length>0;
 return {start,refs,edges,allRefs:[...visited],cableIds,endpoints,openEnds,loop,ambiguous,complete,warning:warning||!complete,
  status:ambiguous?'Ambiguous path':loop?'Loop detected':warning?'Invalid continuity':complete?'Connected':'Unconnected'};
}
function placements(graph,ref,planId){
 const p=graph.ports?.[ref],d=graph.devices?.[p?.device_ref];if(!d)return [];
 const list=values(d.placements).length?values(d.placements):d.physical?[d.physical]:[];
 return list.filter(v=>(!p.stack_member||v.stack_member===p.stack_member)&&(!v.port_refs||v.port_refs.includes(ref)||v.port_refs.includes(p.peer_id)))
  .sort((a,b)=>(a.plan_id===planId?-1:0)-(b.plan_id===planId?-1:0));
}
function describe(graph,ref,devices=new Map(),ports=new Map()){
 const p=graph.ports?.[ref]||{},d=graph.devices?.[p.device_ref]||{},live=devices.get(Number(d.device_id)),port=ports.get(Number(p.port_id));
 return {ref,deviceRef:p.device_ref,name:live?.sysName||d.name||p.device_ref||'Unknown device',label:port?.ifName||port?.ifDescr||p.label||ref,
  face:p.face,managed:p.source==='librenms'||d.source==='librenms',monitored:p.source==='librenms',ip:live?.resolved_ip&&live.resolved_ip!=='Unavailable'?live.resolved_ip:null,location:placements(graph,ref)[0]?.path||live?.location||live?.sysLocation||null,active:active(graph,ref),
  text:(live?.sysName||d.name||p.device_ref||'Unknown device')+' / '+(p.label||ref)+(p.face&&['front','rear'].includes(p.face)?' · '+p.face.toUpperCase():'')};
}
// Follow one face outwards; the starting panel's internal pair is not crossed.
function side(graph,start){
 const prepared=graph._pathIndex||index(graph),refs=[start],seen=new Set(refs);let ref=start,previous=null,direct=null;
 while(true){
  if(ref!==start&&active(graph,ref))return {refs,direct,endpoint:ref,status:'Connected'};
  const edges=(prepared.adjacent.get(ref)||[]).filter(e=>e.id!==previous&&(ref!==start||e.type==='cable'));
  if(prepared.invalid.has(ref)||edges.length>1)return {refs,direct,endpoint:null,status:'Invalid continuity'};
  if(!edges.length)return {refs,direct,endpoint:null,status:'Unknown endpoint'};
  const edge=edges[0];direct??=edge.to;if(seen.has(edge.to))return {refs,direct,endpoint:null,status:'Loop detected'};
  previous=edge.id;ref=edge.to;seen.add(ref);refs.push(ref);
 }
}
function verify(graph,path,details=[]){
 const unverified={status:'Not Verified',detail:'A complete physical path and LLDP / CDP endpoint information are required.'};
 if(!path?.complete||path.endpoints.length!==2)return unverified;
 let matched=false,mismatch=false;
 for(const data of details){
  const local='lnms:port:'+data.interface?.port_id;if(!path.endpoints.includes(local))continue;
  const other=path.endpoints.find(r=>r!==local),p=graph.ports?.[other],d=graph.devices?.[p?.device_ref];
  if(!p?.port_id||!d?.device_id)continue;
  const neighbors=(data.neighbors||[]).filter(n=>/^(lldp|cdp)$/i.test(n.protocol||''));
  for(const n of neighbors){
   if(Number(n.remote_port_id)>0){if(Number(n.remote_port_id)===Number(p.port_id))matched=true;else mismatch=true;}
   else if(Number(n.remote_device_id)>0&&Number(n.remote_device_id)!==Number(d.device_id))mismatch=true;
  }
 }
 if(mismatch)return {status:'Mismatch',detail:'A discovered neighbor differs from the documented physical endpoint.'};
 if(matched)return {status:'Matched',detail:'LLDP / CDP agrees with the active endpoints. Intermediate passive cabling is documented, not verified by discovery.'};
 return unverified;
}
const api={overlay,index,trace,placements,describe,side,verify,active};
if(typeof module!=='undefined')module.exports=api;else root.MorMapPath=api;
})(typeof window==='undefined'?globalThis:window);
