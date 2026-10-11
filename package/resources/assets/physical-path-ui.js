/* Trace and off-page navigation on the existing shared infrastructure graph. */
(function(root){
'use strict';
root.MorMapPhysicalPathUI=function(ctx){
 const {S,M,I,D,U,G,svg,node,shape,action,field,selectField,modal,notice,renderAll,enter,readOnly,api,load,save,base,shared,propertiesPanel,safeNavigation}=ctx;
 const P=root.MorMapPath,TC=root.MorMapTopologyControls;
 let graph,index,result=null,verificationResult=null,verificationTicket=0;
 const run=fn=>Promise.resolve().then(fn).catch(e=>notice(e.message));
 const desc=ref=>P.describe(graph,ref,S.devices,S.ports);
 const placed=ref=>M.portItem(S.map,ref);
 function prepare(){if(!S.map)return;graph=P.overlay(S.map);index=P.index(graph);Object.defineProperty(graph,'_pathIndex',{value:index});result=S.traceStart?P.trace(graph,S.traceStart,index):null;}
 let tracePanel=null,traceContent=null,traceCollapsed=false;
 function closePanel(){if(tracePanel)tracePanel.hidden=true;}
 function renderPanel(){if(!result){closePanel();return;}if(!tracePanel){tracePanel=node('aside',{class:'mp-trace-panel','aria-label':'Physical path trace'});const head=node('div',{class:'mp-trace-head'});head.append(node('strong',{},'Trace Physical Path'));action(head,'Minimize',()=>{traceCollapsed=!traceCollapsed;traceContent.hidden=traceCollapsed;tracePanel.classList.toggle('is-collapsed',traceCollapsed);head.querySelector('button').textContent=traceCollapsed?'Expand':'Minimize';});action(head,'×',()=>{S.traceStart=null;S.focusPort=null;renderAll();});traceContent=node('div',{class:'mp-trace-content'});tracePanel.append(head,traceContent);svg.parentElement.append(tracePanel);U.makeDraggable?.(tracePanel,head);}tracePanel.hidden=false;tracePanel.querySelector('.mp-trace-head button:last-child').setAttribute('aria-label','Close trace');tracePanel.querySelector('.mp-trace-head button').textContent=traceCollapsed?'Expand':'Minimize';const scroll=traceContent.scrollTop;traceContent.replaceChildren();inspect(traceContent);traceContent.scrollTop=scroll;}
 function trace(ref){if(!S.map)return;verificationResult=null;S.traceStart=ref;traceCollapsed=false;if(traceContent)traceContent.hidden=false;if(tracePanel)tracePanel.classList.remove('is-collapsed');renderAll();const ticket=++verificationTicket;Promise.all(endpointPortIds(ref).map(id=>root.MorMapPortDetails.fetch(shared,id))).then(data=>{if(ticket!==verificationTicket||S.traceStart!==ref)return;verificationResult=P.verify(graph,P.trace(graph,ref,index),data);renderPanel();}).catch(()=>{if(ticket!==verificationTicket||S.traceStart!==ref)return;verificationResult={status:'Not Verified',detail:'LibreNMS discovery information is unavailable.'};renderPanel();});}
 function pathText(ref){const d=desc(ref),here=placed(ref),place=P.placements(graph,ref,S.map.id)[0];return [here?M.path(S.map,here.item.parent_id).map(l=>l.name).join(' / '):place?.path,d.text].filter(Boolean).join(' / ');}
 function paths(){const local=new Map((S.map.cables||[]).map(c=>[c.connection_id||c.id,c]));return I.values(graph.connections).map(c=>local.get(c.id)||c).filter(c=>placed(c.source)||placed(c.target));}
 function info(c){
  const route=P.trace(graph,c.source,index),ends=route.endpoints.map(ref=>{const d=desc(ref),p=graph.ports[ref],live=S.ports.get(Number(p?.port_id));
   const rate=n=>{n=Number(n);return n>=1e9?(n/1e9).toFixed(2)+' Gbit/s':n>=1e6?(n/1e6).toFixed(2)+' Mbit/s':n>=1e3?(n/1e3).toFixed(1)+' kbit/s':n+' bit/s';};
   const speed=Number(live?.ifHighSpeed)>0?Number(live.ifHighSpeed)*1e6:Number(live?.ifSpeed);
   return [d.text,d.ip?'IP '+d.ip:null,Number.isFinite(speed)&&speed>0?'Speed '+rate(speed):null,
    live?.ifInOctets_rate!=null?'In '+rate(Number(live.ifInOctets_rate)*8):null,live?.ifOutOctets_rate!=null?'Out '+rate(Number(live.ifOutOctets_rate)*8):null].filter(Boolean).join(' · ');
  });
  return [c.name||c.media?.reference||c.kind||'Cable','A · '+desc(c.source).text,'Z · '+desc(c.target).text,'Path: '+route.status,...ends].join('\n');
 }
 function endpointInfo(ref){const d=desc(ref),p=graph.ports?.[ref],live=S.ports.get(Number(p?.port_id)),owner=S.devices.get(Number(graph.devices?.[p?.device_ref]?.device_id));
  const rate=Number(live?.ifHighSpeed)>0?Number(live.ifHighSpeed)*1e6:Number(live?.ifSpeed),speed=rate>0?(rate>=1e9?rate/1e9+' Gbit/s':rate/1e6+' Mbit/s'):null;
  return [d.text,d.ip?'IP: '+d.ip:null,(placed(ref)?M.path(S.map,placed(ref).item.parent_id).map(l=>l.name).join(' / '):d.location)?'Location: '+(placed(ref)?M.path(S.map,placed(ref).item.parent_id).map(l=>l.name).join(' / '):d.location):'Location: not documented',live?D.port(live,owner).label:'Unmonitored',speed].filter(Boolean).join(' · ');
 }
 function portInfo(ref){const d=desc(ref),p=graph.ports?.[ref],peer=graph.ports?.[p?.peer_id],route=P.trace(graph,ref,index);
  if(!peer)return [d.text+(d.ip?' · '+d.ip:''),d.location?'Location: '+d.location:null,d.monitored?'Monitored interface':d.active?'Active endpoint · unmonitored':'Passive termination','Path: '+route.status,...route.endpoints.filter(r=>r!==ref).map(r=>'Endpoint: '+endpointInfo(r))].filter(Boolean).join('\n');
  const pair=[p,peer].sort((a,b)=>a.face==='front'?-1:b.face==='front'?1:0),lines=[d.name+' / '+(p.position?'Port '+p.position:p.label.replace(/ \/ rear$/,'')),'Path: '+route.status];
  for(const face of pair){const branch=P.side(graph,face.id);lines.push('',face.face==='front'?'FRONT':'REAR');lines.push('Direct: '+(branch.direct?desc(branch.direct).text:'Unconnected'));
   lines.push('Active endpoint: '+(branch.endpoint?endpointInfo(branch.endpoint):'Unknown endpoint'));
   const via=branch.refs.slice(1,-1).filter((r,i,refs)=>i===0||graph.ports[r]?.device_ref!==graph.ports[refs[i-1]]?.device_ref).map(r=>desc(r).text);if(via.length)lines.push('Via: '+via.join(' → '));
  }return lines.join('\n');
 }
 function endpointPortIds(ref){return P.trace(graph,ref,index).endpoints.map(r=>graph.ports?.[r]?.port_id).filter(Boolean);}
 function verification(ref,details){const v=P.verify(graph,P.trace(graph,ref,index),details);return 'Physical / LLDP: '+v.status+'\n'+v.detail;}
 function choose(){if(!S.map)return;prepare();const c=(S.map.cables||[]).find(c=>c.id===S.cableSelected);if(c){trace(c.source);return;}
  const item=M.find(S.map,S.selected),ports=(item?.ports?.length?item.ports:S.map.equipment.flatMap(e=>e.ports||[]));
  if(!ports.length){notice('Place a connection point to trace its physical path.');return;}
  if(ports.length===1){trace(I.portRef(ports[0]));return;}
  modal('Trace Physical Path',el=>selectField(el,'Starting termination',ports.map(p=>({value:I.portRef(p),label:desc(I.portRef(p)).text})),I.portRef(ports[0])),v=>trace(v.value),'Trace');
 }
 async function openPort(ref,preferred){
  const start=S.traceStart,here=placed(ref);if(here){enter(here.item.parent_id);S.selected=here.item.id;S.focusPort=ref;propertiesPanel.set(true);renderAll();return;}
  const places=P.placements(graph,ref,S.map.id),place=preferred||places[0];if(!place){notice('This termination has no saved physical placement.');return;}
  if(places.length>1&&!preferred){modal('Open physical location',el=>selectField(el,'Location',places.map((p,i)=>({value:String(i),label:(p.plan_name||'Physical plan')+' / '+p.path})),'0'),v=>openPort(ref,places[Number(v.value)]),'Open');return;}
  if(readOnly){const url=new URL(shared+'/physical',location.origin);url.searchParams.set('map',place.plan_id);url.searchParams.set('location',place.location_id);url.searchParams.set('equipment',graph.ports[ref].device_ref);url.searchParams.set('trace',start||ref);location.assign(url);return;}
  if(place.plan_id!==S.map.id){if(!safeNavigation())return;await load(place.plan_id);}
  S.traceStart=start;prepare();const p=placed(ref),peer=graph.ports[ref]?.peer_id,q=p||placed(peer);enter(q?.item.parent_id||place.location_id);S.selected=q?.item.id||null;S.focusPort=ref;propertiesPanel.set(true);renderAll();
 }
 function inspect(panel){if(!result)return false;
  const summary=node('section',{class:'mp-trace-summary'});
  summary.append(node('strong',{},result.status),node('p',{},result.cableIds.length+' external cables · '+result.edges.filter(e=>e.type==='internal').length+' internal pairs'));
  if(S.dirty)summary.append(node('small',{},'Includes unsaved connections in this plan.'));
  for(const ref of result.endpoints){const d=desc(ref);summary.append(node('p',{},d.text),node('small',{},d.ip?'Management IP: '+d.ip:'Management IP: unavailable'));}
  if(!result.complete)summary.append(node('p',{},result.loop?'The route returns to a visited termination.':result.ambiguous?'Several cables use one termination; repair the conflicting connections.':result.openEnds.length?'Last open termination: '+result.openEnds.map(pathText).join(' / '):'No complete endpoint pair.'));
  const state=I.cableState({source:result.refs[0],target:result.refs.at(-1)},graph,S.ports,S.devices,[result.refs[0]]);
  summary.append(node('p',{},'Endpoint monitoring: '+state.label));const verification=verificationResult||{status:'Not Verified',detail:'LLDP / CDP verification pending.'};summary.append(node('p',{},'Physical / LLDP: '+verification.status),node('small',{},verification.detail));panel.append(summary);
  action(panel,'Clear trace',()=>{S.traceStart=null;S.focusPort=null;renderAll();});
  const list=node('ol',{class:'mp-trace-list'});
  result.refs.forEach((ref,n)=>{const d=desc(ref),row=node('li',{'data-trace-port':ref});row.append(node('strong',{},d.text));const place=placed(ref),location=place?M.path(S.map,place.item.parent_id).map(l=>l.name).join(' / '):P.placements(graph,ref,S.map.id)[0]?.path;
   if(location)row.append(node('small',{},location));if(d.ip)row.append(node('small',{},d.ip));
   if(place||P.placements(graph,ref,S.map.id).length)action(row,'Open location',()=>run(()=>openPort(ref)));
   const e=result.edges[n];if(e)row.append(node('div',{class:'mp-trace-edge'},e.type==='internal'?'Internal continuity · FRONT ↔ REAR':(e.cable.name||e.cable.media?.reference||e.cable.kind||'Cable')+(e.cable.comment?' · '+e.cable.comment:'')));
   list.append(row);
  });panel.append(list);return true;
 }
 function highlight(layer){if(!result&&!S.focusPort)return;const refs=new Set(result?.allRefs||[]),ids=new Set(result?.cableIds||[]);if(S.focusPort){refs.add(S.focusPort);const peer=graph.ports[S.focusPort]?.peer_id;if(peer)refs.add(peer);}
  for(const el of layer.querySelectorAll('[data-cable]')){const c=(S.map.cables||[]).find(c=>c.id===el.dataset.cable);if(c&&ids.has(c.connection_id||c.id))el.setAttribute('data-traced','true');}
  for(const el of layer.querySelectorAll('[data-location-link]'))if((el.dataset.connections||'').split(' ').some(id=>ids.has(id)))el.setAttribute('data-traced','true');
  for(const ref of refs){const at=M.portPosition(S.map,ref,S.current,S.cabling);if(at)layer.append(shape('circle',{cx:at.x,cy:at.y,r:6*S.view.w/Math.max(1,svg.getBoundingClientRect().width),fill:'none',stroke:'#06a6c1','stroke-width':2,'vector-effect':'non-scaling-stroke','data-trace-ring':ref,'data-output':'omit'}));}
 }
 async function ensureSaved(){if(S.drag||S.saving)throw Error('Finish the current edit before changing a shared connection.');if(S.dirty)await save();if(S.dirty)throw Error('Save the physical plan successfully before changing a remote connection.');prepare();}
 async function commit(method,path,data){await ensureSaved();const result=await api('/infrastructure/connections'+path,method,{...data,revision:S.map.infrastructure_revision},true);I.physical(S.map,result.infrastructure);ctx.recordServerUndo?.(result.undo_token);prepare();renderAll();await ctx.refreshStatus();notice('Shared connection saved.',true);}
 async function remote(initial){if(readOnly)return;await ensureSaved();const localRefs=new Set(S.map.equipment.flatMap(e=>(e.ports||[]).flatMap(p=>[I.portRef(p),graph.ports?.[I.portRef(p)]?.peer_id].filter(ref=>ref&&!e.hidden_ports?.includes(ref))))),busy=ref=>!!I.connection(graph,ref),available=Object.keys(graph.ports).filter(r=>!busy(r));
  const source=available.filter(r=>localRefs.has(r)),target=available.filter(r=>P.placements(graph,r,S.map.id).some(p=>p.plan_id!==S.map.id));
  if(!source.length||!target.length){notice('Save device placements in both physical plans and choose free terminations. Front and rear each accept one cable.');return;}
  modal('Remote Physical Link',el=>{el.append(node('p',{},'Connect a termination in this plan to a saved termination in another plan. Apply saves the shared cable immediately.'));
   const filter=field(el,'Find remote termination','','search',{placeholder:'Plan, building, room, panel or port'}),a=selectField(el,'Source termination',source.map(ref=>({value:ref,label:pathText(ref)})),source.includes(initial)?initial:source[0]),b=selectField(el,'Remote termination',[],''),options=target.map(ref=>({value:ref,label:((P.placements(graph,ref,S.map.id).find(p=>p.plan_id!==S.map.id)?.plan_name)||'Remote plan')+' / '+pathText(ref)}));
   const fill=()=>{const old=b.value;b.replaceChildren();for(const o of options)if(o.value!==a.value&&o.label.toLowerCase().includes(filter.value.toLowerCase()))b.append(node('option',{value:o.value},o.label));if([...b.options].some(o=>o.value===old))b.value=old;};filter.oninput=a.onchange=fill;fill();const details=TC.cable(el,{kind:'backbone',name:'',media:{}});return {a,b,details};
  },async v=>{if(!v.a.value||!v.b.value)throw Error('Choose two available terminations.');await commit('POST','',{source:v.a.value,target:v.b.value,...v.details.value()});},'Connect');
 }
 function edit(c){if(readOnly)return;modal('Remote cable details',el=>{const details=TC.cable(el,c),automatic=field(el,'Automatic status color',false,'checkbox');automatic.checked=!c.color;const color=field(el,'Cable color',c.color||'#1683a6','color');return {details,automatic,color};},v=>commit('PUT','/'+c.id,{...v.details.value(),color:v.automatic.checked?null:v.color.value}));}
 function disconnect(c){if(readOnly)return;run(async()=>{await commit('DELETE','/'+c.id,{});document.getElementById('mp-dialog')?.close();});}
 function chooseFace(ref,onChoose){const p=graph.ports?.[ref],peer=graph.ports?.[p?.peer_id];const at=placed(ref),other=peer&&placed(peer.id);if(!peer||!other||at&&other&&!at.virtual&&!other.virtual&&(Math.abs(at.port.x-other.port.x)>1e-9||Math.abs(at.port.y-other.port.y)>1e-9)){onChoose(ref);return;}
  const options=[p,peer].sort((a,b)=>a.face==='front'?-1:b.face==='front'?1:0),free=options.filter(p=>!I.connection(graph,p.id));
  if(!free.length){notice('Both Front and Rear are already connected.');return;}
  modal('Choose termination',el=>{el.append(node('p',{},'One point represents two sides with permanent internal continuity. Each side accepts one cable.'));const select=selectField(el,'Side',options.map(p=>({value:p.id,label:p.face.toUpperCase()+' · '+p.label+(I.connection(graph,p.id)?' · occupied':' · available')})),free[0].id);for(const option of select.options)option.disabled=!!I.connection(graph,option.value);return select;},v=>onChoose(v.value),'Use termination');
 }
 return {prepare,trace,choose,inspect,renderPanel,closePanel,highlight,remote,edit,disconnect,chooseFace,openPort:(...args)=>run(()=>openPort(...args)),info,portInfo,endpointPortIds,verification,pathText,paths,graph:()=>graph,result:()=>result,description:desc};
};
})(window);
