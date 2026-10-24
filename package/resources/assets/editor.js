(function () {
'use strict';
const root=document.getElementById('mormap'); if(!root) return;
const G=window.MorMapGeometry, D=window.MorMapDisplay, $=id=>document.getElementById(id), svg=$('mm-canvas');
const UI=window.MorMapUI,I=window.MorMapInfrastructure,CS=window.MorMapCableStyle,CC=window.MorMapCableControls;
const Q=window.MorMapSelection,FP=window.MorMapFormatPainter,T=window.MorMapTopology,TC=window.MorMapTopologyControls;
let gridEnabled=true,snapEnabled=true,snapGuides=[],infrastructureNotice=false;
const base=root.dataset.base.replace(/\/$/,''), NS='http://www.w3.org/2000/svg';
const readOnly=root.dataset.readOnly==='true';
const embedded=readOnly&&new URLSearchParams(location.search).get('mormap_embed')==='1';
if(embedded)gridEnabled=false;
let mapLoadTicket=0,publishedRevision=null,mapLoading=false;
let lastCablePress=null,lastCableDetour=0,routeDraft=null;
let map=null, mode=readOnly?'view':'select', selection=null, pending=null, dirty=false, history=[], future=[], statuses=new Map(), deviceStatuses=new Map(), portLabels=new Map();
let hoveredAnchor=null, pageFitted=true, statusQueued=false;
let placePort=null, allPortsByDevice=new Map();
let view={x:0,y:0,w:1920,h:1080}, drag=null, saving=false, statusBusy=false, requestGeneration=0, portCache=new Map();
root.dataset.mode=mode;
root.addEventListener('click',e=>{if(mapLoading){e.preventDefault();e.stopImmediatePropagation();}},true);root.addEventListener('submit',e=>{if(mapLoading){e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('mormap:groups',()=>{const n=selection?.type==='node'?node(selection.id):null;if(!n){message('Select a device to manage its port groups.');return;}editPortGroups(n).catch(fail);});
const workspaceMemory=UI.memory(root,'logical');
const propertiesPanel=UI.panel($('mm-details-panel'),$('mm-details'),$('mm-details-close'),'Properties',true);
const V=window.MorMapVirtualization({root,svg,readOnly,preview:()=>mode==='view',workspace:'logical',map:()=>map,context:()=> 'logical',hosts:()=>map?.nodes||[],visible:()=> (map?.nodes||[]).filter(n=>!DG.hidden(n.id)).map(n=>({...n,box:n})),enabled:()=>!!map&&!readOnly&&mode!=='view'&&!saving&&!drag,mutate:fn=>{checkpoint();fn(map);changed();render();},render:()=>embedded?fit():render(),recordUndo:recordServerUndo,notice:message,beforeChange:async()=>{if(saving||drag)throw Error('Finish the current edit first.');await save();if(dirty)throw Error('Save the current map successfully before changing guest assignments.');}});
const notes=window.MorMapComments(svg,{point:screenPoint,editable:()=>!readOnly&&mode!=='view',commit:fn=>{checkpoint();fn();changed();render();},render});
const portTooltip=window.MorMapPortDetails?.mount({root,load:id=>window.MorMapPortDetails.fetch(root.dataset.shared||base,id),resolve:target=>{const element=target.closest('[data-type="anchor"]');if(!element||!map)return null;const a=anchor(element.dataset.id);if(!a)return null;const n=node(a.node_id),d=deviceStatuses.get(Number(n.device_id)),ps=portState(a);return {element,portId:a.port_id,header:n.label+' / '+a.label+(d?.resolved_ip?' · '+d.resolved_ip:''),summary:[ps.label,ps.detail,...(a.comment?[a.comment]:[])]};}});
const painter=FP.create({root,button:$('mm-painter'),scope:base,getSelection:()=>paintTarget(selection?.paintType||selection?.type,selection?.id),apply:applyPaint,applyMany:applyPaintMany,getTargets:()=>picked().length>1?picked().map(v=>paintTarget(v.type,v.id)):[paintTarget(selection?.paintType||selection?.type,selection?.id)],notice:message,enabled:()=>!readOnly&&!!map&&mode!=='view'&&!saving,onStart:()=>{pending=null;routeDraft=null;placePort=null;mode='select';root.dataset.mode=mode;root.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));lastCablePress=null;render();}});
function paintTarget(type,id){if(!map)return null;if(type==='shape'){const object=map.shapes?.find(s=>s.id===id);return object?{object,format:{type:'shape',style:object}}:null;}if(type==='anchor'){const a=anchor(id);return a?paintTarget('node',a.node_id):null;}if(type==='node'){const object=node(id);return object?{object,format:{type:'object',style:FP.appearance(object.appearance)}}:null;}if(['link','segment','vertex','info'].includes(type)){const object=map.links.find(l=>l.id===id);if(!object)return null;if(type==='info'&&object.info)return {object:object.info,format:{type:'info',style:{font_size:object.info.font_size||8}},alternateFormats:[{type:'cable',style:{format:object.format,color:object.color,connector:object.connector||'right-angle'}}]};return {object,format:{type:'cable',style:{format:object.format,color:object.color,connector:object.connector||'right-angle'}}};}return null;}
function applyPaint(target,style){lastCablePress=null;checkpoint();if(target.format.type==='shape')FP.applyShape(target.object,style);else if(target.format.type==='object')target.object.appearance=style;else if(target.format.type==='info')target.object.font_size=style.font_size;else{const c=target.object;if(style.connector&&(c.connector||'right-angle')!==style.connector){c.points=G.connectorRoute(endpoint(c.source),endpoint(c.target),style.connector);c.connector=style.connector;if(c.info)c.info=G.attachInfo(c.info,c.points,c.connector,style.format);}c.format=style.format;if(style.color)c.color=style.color;else delete c.color;}changed();render();return true;}
// Multi-selection lives outside the saved map and retains the single-item tools.
let selectedItems=[];
const panHeld=Q.panKeys(root,()=>!!map&&!saving);
function picked(){if(!map)return [];if(selectedItems.length&&!selectedItems.some(v=>v.type===selection?.type&&v.id===selection?.id))selectedItems=[];return (selectedItems.length?selectedItems:selection?.type==='anchor'&&anchor(selection.id)?[{type:'node',id:anchor(selection.id).node_id}]:selection?[selection]:[]).filter(v=>v.type==='node'?!!node(v.id):v.type==='shape'?map.shapes?.some(s=>s.id===v.id):v.type==='link'&&map.links.some(l=>l.id===v.id));}
function setPicked(items){selectedItems=Q.unique(items);selection=selectedItems.at(-1)||null;}
function allPickable(){return [...map.nodes.filter(n=>!DG.hidden(n.id)).map(n=>({type:'node',id:n.id})),...map.links.map(l=>({type:'link',id:l.id})),...(map.shapes||[]).map(s=>({type:'shape',id:s.id}))];}
function selectionTarget(target){if(!target)return null;let {type,id}=target.dataset;if(type==='anchor'){const a=anchor(id);return a?{type:'node',id:a.node_id}:null;}if(['segment','vertex','info'].includes(type))type='link';return ['node','link','shape'].includes(type)?{type,id}:null;}
function renderPicked(){const items=picked();root.dataset.selectionCount=String(items.length);if(mode!=='select')return;if(items.length>1)for(const v of items){if(v.type==='node'||v.type==='shape'){const n=v.type==='shape'?window.MorMapDrawingsModel.bounds(map.shapes.find(s=>s.id===v.id)):node(v.id);Q.box(svg,n,(t,a)=>el(t,a,null),v.id);}else{const c=map.links.find(l=>l.id===v.id);Q.line(svg,c.points,c.connector,c.format,G,(t,a)=>el(t,a,null),v.id);}}if(drag?.type==='marquee')Q.marquee(svg,Q.rect(drag.start,drag.end),(t,a)=>el(t,a,null));}
function cableHitTarget(event){const label=event.target.closest('[data-cable-label]');if(label)return svg.querySelector('[data-type="link"][data-id="'+label.dataset.cableLabel+'"]');const comment=painter.active()&&event.target.closest('[data-comment-key]');if(comment)return svg.querySelector('[data-type="link"][data-id="'+comment.dataset.commentKey+'"]')||svg.querySelector('[data-type="node"][data-id="'+comment.dataset.commentKey+'"]');const target=event.target.closest('[data-type]'),cablePainting=painter.active()&&!painter.picking()&&painter.kind()==='cable';if(target?.dataset.type!=='link'&&!cablePainting)return target;if(cablePainting&&target?.dataset.type==='info')return svg.querySelector('[data-type="link"][data-id="'+target.dataset.id+'"]');const id=Q.nearestCable(map.links.map(c=>({id:c.id,points:c.points,type:c.connector,format:c.format})),screenPoint(event),6*zoomScale(),G,target?.dataset.id);return id?svg.querySelector('[data-type="link"][data-id="'+id+'"]'):target;}
function paintTargets(target){const items=picked(),hit=selectionTarget(target);if(items.length>1&&hit&&items.some(v=>Q.key(v)===Q.key(hit)))return items.map(v=>paintTarget(v.type,v.id)).filter(Boolean);return paintTarget(target?.dataset.type,target?.dataset.id);}
function applyPaintMany(targets,style){checkpoint();for(const target of targets)writePaint(target,G.copy(style));changed();render();return true;}
function writePaint(target,style){if(target.format.type==='shape')FP.applyShape(target.object,style);else if(target.format.type==='object')target.object.appearance=style;else if(target.format.type==='info')target.object.font_size=style.font_size;else{const c=target.object;if(style.connector&&(c.connector||'right-angle')!==style.connector){c.points=G.connectorRoute(endpoint(c.source),endpoint(c.target),style.connector);c.connector=style.connector;if(c.info)c.info=G.attachInfo(c.info,c.points,c.connector,style.format);}c.format=style.format;if(style.color)c.color=style.color;else delete c.color;}}
function groupMove(point){const d=drag,rawX=point.x-d.start.x,rawY=point.y-d.start.y;if(!d.moved&&Math.hypot(rawX,rawY)<2*zoomScale())return;d.moved=true;const first=d.before.nodes.find(n=>d.items.some(v=>v.type==='node'&&v.id===n.id)),dx=G.snap((first?.x||0)+rawX,snapEnabled,25)-(first?.x||0),dy=G.snap((first?.y||0)+rawY,snapEnabled,25)-(first?.y||0),nodes=new Set(d.items.filter(v=>v.type==='node').map(v=>v.id)),links=new Set(d.items.filter(v=>v.type==='link').map(v=>v.id));map=G.copy(d.before);for(const n of map.nodes)if(nodes.has(n.id)){n.x=clamp(n.x+dx,-99000,99000);n.y=clamp(n.y+dy,-99000,99000);}for(const s of map.shapes||[])if(d.items.some(v=>v.type==='shape'&&v.id===s.id)&&!s.drawing?.locked){s.x=clamp(s.x+dx,-99000,99000);s.y=clamp(s.y+dy,-99000,99000);}for(const l of map.links){const a=anchor(l.source),b=anchor(l.target),both=nodes.has(a.node_id)&&nodes.has(b.node_id),move=both||links.has(l.id);if(move)l.points=l.points.map(p=>({x:p.x+dx,y:p.y+dy}));if(move||nodes.has(a.node_id)||nodes.has(b.node_id))l.points=G.attachConnector(l.points,endpoint(l.source),endpoint(l.target),l.connector);}render();}
function removePicked(){const items=picked();if(items.length<2)return false;const nodes=new Set(items.filter(v=>v.type==='node').map(v=>v.id)),links=new Set(items.filter(v=>v.type==='link').map(v=>v.id)),anchors=new Set(map.anchors.filter(a=>nodes.has(a.node_id)).map(a=>a.id));checkpoint();for(const l of map.links)if(links.has(l.id)&&l.connection_id)(map.disconnect??=[]).push(l.connection_id);map.links=map.links.filter(l=>!links.has(l.id)&&!anchors.has(l.source)&&!anchors.has(l.target));map.anchors=map.anchors.filter(a=>!nodes.has(a.node_id));map.nodes=map.nodes.filter(n=>!nodes.has(n.id));if(map.shapes)map.shapes=map.shapes.filter(s=>!items.some(v=>v.type==='shape'&&v.id===s.id));setPicked([]);changed();render();return true;}
const DW=window.MorMapDrawings({root,svg,map:()=>map,replace:m=>{map=m;},context:()=> 'logical',parent:()=>null,view:()=> 'location',visible:()=>map?.shapes||[],attrs:s=>({'data-type':'shape','data-id':s.id}),
 editable:()=>!!map&&!readOnly&&!['view','pan'].includes(mode)&&!saving&&!drag,panning:()=>panHeld()||mode==='pan',painting:()=>painter.active(),point:screenPoint,scale:zoomScale,snapEnabled:()=>snapEnabled,snap:(p,alt)=>({x:G.snap(p.x,snapEnabled&&!alt,25),y:G.snap(p.y,snapEnabled&&!alt,25)}),uid:()=>uid(),
 picked,select:ids=>setPicked(ids.map(id=>({type:'shape',id}))),openProperties:()=>setDetails(true),tool:()=>mode,setTool:value=>setMode(value),render,notice:message,
 mutate:fn=>{const before=G.copy(map);try{fn(map);history.push(before);if(history.length>50)history.shift();future=[];changed();render();return true;}catch(e){map=before;render();throw e;}}
});
const DG=window.MorMapDiagramGroups({root,svg,map:()=>map,replace:value=>{map=value;},context:()=> 'logical',readOnly,
 editable:()=>!!map&&!readOnly&&mode==='select'&&!saving&&!drag&&!painter.active(),panning:()=>panHeld()||mode==='pan',point:screenPoint,scale:zoomScale,snapEnabled:()=>snapEnabled,grid:25,uid:()=>uid(),
 visible:()=>map?.nodes||[],clearSelection:()=>setPicked([]),picked,render,fit,notice:message,mutate:fn=>{const before=G.copy(map);try{fn(map);window.MorMapDiagramGroupsModel.clean(map);window.MorMapDiagramGroupsModel.validate(map);syncLinks();history.push(before);if(history.length>50)history.shift();future=[];changed();render();}catch(error){map=before;render();throw error;}},
 moveCluster:(m,g,dx,dy)=>window.MorMapDiagramGroupsModel.moveLogical(m,g,dx,dy,G),
 setCablePath:(m,c,points)=>{c.connector='right-angle';c.points=points;if(c.info)c.info=G.attachInfo(c.info,points,c.connector,c.format);},
 cables:()=>map?.links||[],cablePath:c=>c.points,cableStyle:c=>c.connector,cableFormat:c=>c.format,cableState,
 cableLabel:c=>(c.name?c.name+' · ':'')+(node(anchor(c.source)?.node_id)?.label||'')+' / '+(anchor(c.source)?.label||'')+' ↔ '+(node(anchor(c.target)?.node_id)?.label||'')+' / '+(anchor(c.target)?.label||''),
 cableAttrs:c=>({'data-type':'link','data-id':c.id,class:'mm-cable'}),nodeState:deviceState,guestCount:hosts=>V.count(hosts),
 imageURL:id=>base+'/images/'+encodeURIComponent(id),assets:async()=> (await api('/library')).assets,
 hideCable:id=>{for(const e of svg.querySelectorAll('[data-id="'+id+'"],[data-cable-label="'+id+'"],[data-comment-key="'+id+'"]'))e.style.display='none';},
 hideNode:id=>{for(const e of svg.querySelectorAll('[data-id="'+id+'"],[data-node-halo="'+id+'"],[data-comment-key="'+id+'"]'))e.style.display='none';for(const p of map.anchors.filter(p=>p.node_id===id))for(const e of svg.querySelectorAll('[data-id="'+p.id+'"],[data-anchor-label="'+p.id+'"]'))e.style.display='none';}
});
root.addEventListener('pointerdown',e=>{if(!map||saving||![0,1].includes(e.button)||(e.target!==svg&&e.target.closest('svg')!==svg))return;const altPan=e.altKey&&mode!=='anchor'&&!placePort&&!e.target.closest('[data-type=anchor]');if(e.button===1||panHeld()||altPan||mode==='pan'){e.preventDefault();e.stopImmediatePropagation();pageFitted=false;drag={type:'pan',client:{x:e.clientX,y:e.clientY},view:{...view},scale:Q.panScale(svg,view),moved:false};svg.setPointerCapture(e.pointerId);return;}const p=screenPoint(e),target=cableHitTarget(e);if(painter.active()){e.preventDefault();e.stopImmediatePropagation();svg.focus?.({preventScroll:true});painter.paint(paintTargets(target));return;}const hit=selectionTarget(target),items=picked();if(readOnly||mode!=='select'||routeDraft||placePort||e.target.closest('[data-comment-key]'))return;svg.focus?.({preventScroll:true});if((e.ctrlKey||e.metaKey||e.shiftKey)&&hit){e.preventDefault();e.stopImmediatePropagation();setPicked(Q.toggle(items,hit));lastCablePress=null;setDetails(true);render();return;}if(!target){e.preventDefault();e.stopImmediatePropagation();drag={type:'marquee',start:p,end:p,beforeSelection:items,add:e.ctrlKey||e.metaKey||e.shiftKey,moved:false};if(!drag.add)setPicked([]);svg.setPointerCapture(e.pointerId);render();return;}if(items.length>1&&hit&&items.some(v=>Q.key(v)===Q.key(hit))&&!['vertex','resize','info'].includes(target.dataset.type)){e.preventDefault();e.stopImmediatePropagation();drag={type:'multi',start:p,before:G.copy(map),items:G.copy(items),moved:false};svg.setPointerCapture(e.pointerId);return;}selectedItems=[];},true);

function formatObject(n){let controls;dialog('Format device',c=>{controls=FP.controls(c,{format:n.appearance,image:base+'/images/'+n.image,label:n.label});},()=>{checkpoint();n.appearance=controls.value();changed();render();});}
const uid=()=>{
    if(crypto.randomUUID)return crypto.randomUUID();
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
};
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));



function el(tag,attributes={},parent=svg,text=null) {
    const n=document.createElementNS(NS,tag); for(const [k,v] of Object.entries(attributes)) n.setAttribute(k,String(v));
    if(text!==null) n.textContent=text; if(parent) parent.append(n); return n;
}
function html(tag,text,attrs={}) {const n=document.createElement(tag);if(text!==null)n.textContent=text;Object.assign(n,attrs);return UI.numberInput(n);}
function message(text='',success=false,warning=false) {$('mm-message').textContent=text;$('mm-message').hidden=!text;$('mm-message').classList.toggle('mm-success',success);$('mm-message').classList.toggle('mm-warning',warning);}
function fail(error){message(error.message||String(error));}
async function api(path,options={}) {
    if(readOnly && !((!options.method && path==='/data') || (options.method==='POST' && path==='/status')))throw new Error('Published maps are read-only.');
    const headers={'Accept':'application/json','X-CSRF-TOKEN':root.dataset.csrf,...options.headers};
    if(options.body && !(options.body instanceof FormData)) {headers['Content-Type']='application/json';options.body=JSON.stringify(options.body);}
    const r=await fetch(base+path,{...options,headers,credentials:'same-origin'});
    const data=await r.json().catch(()=>({message:'Unexpected response. Check your login and server log.'}));
    if(!r.ok) throw new Error(data.message||`HTTP ${r.status}`);return data;
}
function state(){
    painter.refresh();for(const id of ['mm-maps','mm-new','mm-reload'])if($(id))$(id).disabled=saving;root.setAttribute('aria-busy',String(saving));root.inert=mapLoading;if($('mm-pan'))$('mm-pan').setAttribute('aria-pressed',String(mode==='pan'));
    if(readOnly){$('mm-state').textContent=map?.name||'Loading map…';$('mm-refresh').disabled=!map||statusBusy;$('mm-empty').hidden=!!(map?.nodes.length||map?.shapes?.length);return;}
    $('mm-state').textContent=map?`${map.name} · ${dirty?'Unsaved changes':'Saved'} · revision ${map.revision}`:'No map selected';
    for(const id of ['mm-rename','mm-delete-map'])if($(id))$(id).disabled=!map||saving;
    $('mm-unpublish').disabled=!map||!publishedRevision||saving||dirty||mode==='view';$('mm-save').disabled=!map||saving||!dirty;$('mm-publish').disabled=!map||saving||dirty||mode==='view';
    $('mm-undo').disabled=!history.length||mode==='view'||saving;$('mm-redo').disabled=!future.length||mode==='view'||saving;
    $('mm-delete').disabled=!selection||mode==='view';$('mm-add').disabled=!map||mode==='view';
    $('mm-empty').hidden=!!(map?.nodes.length||map?.shapes?.length);
    const c=D.canvas(map?.canvas);$('mm-size').textContent=`Page size: ${c.width} × ${c.height}`;
    $('mm-size').disabled=!map||mode==='view';$('mm-refresh').disabled=!map||statusBusy;
    root.querySelectorAll('[data-mode]').forEach(b=>b.disabled=b.dataset.mode!=='pan'&&mode==='view');
}
function checkpoint(){history.push(G.copy(map));if(history.length>50)history.shift();future=[];}
function changed(){dirty=true;state();}
function recordServerUndo(token){if(!token)return;history.push({__undo:token});if(history.length>50)history.shift();future=[];state();}
function clearDocument(){publishedRevision=null;requestGeneration++;mapLoadTicket++;map=null;dirty=false;selection=null;selectedItems=[];drag=null;pending=null;routeDraft=null;placePort=null;statuses.clear();deviceStatuses.clear();painter.cancel();workspaceMemory.set({});root.dataset.mapId='';render();}
async function applyHistory(from,to){
 if(!from.length||mode==='view'||saving)return;const entry=from.at(-1);
 if(entry.__undo){saving=true;state();try{const result=await api('/undo',{method:'POST',body:{token:entry.__undo}});from.pop();to.push({__undo:result.undo_token});if(to.length>50)to.shift();if(result.context?.kind==='virtualization'){await V.refresh();message('Virtual guest Undo / Redo applied.',true);return;}const maps=await listMaps(),context=result.context||{},id=context.map_id||map?.id;
  if(map&&(!context.map_id||context.action==='unpublish'||context.map_id!==map.id)){if(result.infrastructure)I.sharedUndo(map,result.infrastructure,'logical',G);if(context.action==='unpublish'&&id===map.id)publishedRevision=result.published_revision??null;render();}
  else if(id&&maps.some(m=>m.id===id))loadMap(await api('/maps/'+id),true);else clearDocument();if(context.action==='unpublish'&&window.MorMapRefreshNavigation)await window.MorMapRefreshNavigation().catch(()=>{});const warning=map?I.warningText(map,'logical'):'';message('Undo / Redo applied.'+(warning?' '+warning:''),!warning,!!warning);
 }catch(e){fail(e);}finally{saving=false;state();}return;}
 if(!map||map.id!==entry.id){message('Open the matching map to undo this edit.');return;}
 to.push(G.copy(map));if(to.length>50)to.shift();const rev=map.revision,infra=map.infrastructure,infraRevision=map.infrastructure_revision,oldSize=JSON.stringify(D.canvas(map.canvas));map=I.restoreHistory(map,from.pop(),infra,'logical');map.revision=rev;map.infrastructure_revision=infraRevision;selection=null;pending=null;routeDraft=null;changed();if(oldSize!==JSON.stringify(D.canvas(map.canvas)))pageSizeChanged();else render();const warning=I.warningText(map,'logical');message(warning||'Undo / Redo applied.',!warning,!!warning);
}
function node(id){return map.nodes.find(n=>n.id===id);}
function anchor(id){return map.anchors.find(a=>a.id===id);}
// Shared Physical profiles may place Front and Rear on the same image point.
// Keep both identities usable without a rear hit target covering the front.
function coincidentPeer(a){const p=map.infrastructure?.ports?.[I.portRef(a)],peer=map.infrastructure?.ports?.[p?.peer_id];if(!peer||peer.peer_id!==I.portRef(a)||peer.device_ref!==p.device_ref)return null;return map.anchors.find(b=>b.node_id===a.node_id&&I.portRef(b)===peer.id&&Math.abs(a.x-b.x)<1e-9&&Math.abs(a.y-b.y)<1e-9)||null;}
function endpoint(id){const a=anchor(id);return G.point(node(a.node_id),a);}
function syncLinks(){for(const l of map.links)l.points=G.attachConnector(l.points,endpoint(l.source),endpoint(l.target),l.connector);}
function portState(a){return a.port_id?D.port(statuses.get(Number(a.port_id)),deviceStatuses.get(Number(node(a.node_id).device_id))):{key:'unknown',label:'Unmonitored',color:D.palette.unknown,detail:'Manual connector; no direct SNMP monitoring'};}
let connectionGraph;
function cableState(l){return I.cableState(l,connectionGraph||I.viewGraph(map,'logical'),statuses,deviceStatuses,[I.portRef(anchor(l.source)),I.portRef(anchor(l.target))]);}
function deviceState(n){return D.device(deviceStatuses.get(Number(n.device_id)));}
function applyCanvasSize(){const c=D.canvas(map?.canvas);svg.style.aspectRatio=`${c.width} / ${c.height}`;svg.setAttribute('width',c.width);svg.setAttribute('height',c.height);}
function fitPage(){pageFitted=true;applyCanvasSize();view=D.pageView(map?.canvas,svg.clientWidth||1920,svg.clientHeight||1080);render();}
function pageSizeChanged(){applyCanvasSize();fitPage();}
function pageSizeDialog(){
    if(!map||mode==='view')return;let width,height;const current=D.canvas(map.canvas);
    dialog('Page size',c=>{
        width=field(c,'Width (px)',html('input',null,{type:'number',min:'320',max:'16384',step:'1',value:String(current.width),required:true}));
        height=field(c,'Height (px)',html('input',null,{type:'number',min:'240',max:'16384',step:'1',value:String(current.height),required:true}));
        const reset=html('button','Restore default size',{type:'button',id:'mm-size-default'});reset.onclick=()=>{width.value='1920';height.value='1080';};c.append(reset);
        c.append(html('small','Default: 1920 × 1080. Devices and cable paths keep their positions. Save to retain this size.'));
    },async()=>{
        const w=UI.numberValue(width),h=UI.numberValue(height);
        if(!Number.isInteger(w)||!Number.isInteger(h)||w<320||w>16384||h<240||h>16384)throw new Error('Width: 320–16384 px; height: 240–16384 px. Use whole numbers.');
        checkpoint();map.canvas={width:w,height:h};changed();pageSizeChanged();
    });
}
function setDetails(open){propertiesPanel.set(open);}
function showPortLabel(id){hoveredAnchor=id;for(const [key,g] of portLabels)g.setAttribute('visibility',key===id||(selection?.type==='anchor'&&selection.id===key)?'visible':'hidden');}
function zoomScale(){return view.w/Math.max(svg.clientWidth,1);}
function screenPoint(e){const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse());}
function setView(){svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);$('mm-zoom').textContent=Math.round(100/zoomScale())+'%';}
root.addEventListener('mormap:pan-mode',()=>setMode(mode==='pan'?(readOnly?'view':'select'):'pan'));
function setMode(value){DW.cancel();if(readOnly&&!['pan','view'].includes(value))return;painter.cancel();mode=value;root.dataset.mode=value;pending=null;routeDraft=null;placePort=null;selection=null;hoveredAnchor=null;root.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));if($('mm-view')){$('mm-view').textContent=mode==='view'?'Edit mode':'Preview';$('mm-view').classList.toggle('active',mode==='view');}if($('mm-pan'))$('mm-pan').setAttribute('aria-pressed',String(mode==='pan'));render();}
root.addEventListener('mormap:select-device',e=>{if(!map?.nodes.some(n=>n.id===e.detail))return;setPicked([{type:'node',id:e.detail}]);setDetails(true);render();});
root.addEventListener('mormap:align',()=>{const n=selection?.type==='node'?node(selection.id):null;if(n)alignNodePorts(n);else message('Select a device to align its connection points.',false,true);});
function render(){
 connectionGraph=map?I.viewGraph(map,'logical'):null;
 root.dispatchEvent(new CustomEvent('mormap:outline',{detail:{items:(map?.nodes||[]).map(n=>({id:n.id,label:n.label,stack_member:n.stack_member,ip:deviceStatuses.get(Number(n.device_id))?.resolved_ip||''})),selected:selection?.type==='node'?selection.id:null}}));
    svg.replaceChildren();portLabels.clear();setView();const scale=zoomScale(),c=D.canvas(map?.canvas);
    const defs=el('defs');
    const pattern=el('pattern',{id:'mm-grid-pattern',width:25,height:25,patternUnits:'userSpaceOnUse'},defs);
    el('circle',{cx:1,cy:1,r:1,fill:'#dbe4ea'},pattern);
    el('rect',{x:view.x,y:view.y,width:view.w,height:view.h,fill:'#e9eef2','data-output':'omit'},svg);
    el('rect',{x:0,y:0,width:c.width,height:c.height,fill:'#f8fafb',stroke:'#b9c9d3','stroke-width':1,'vector-effect':'non-scaling-stroke','data-layer':'page'},svg);
    if(gridEnabled)el('rect',{x:0,y:0,width:c.width,height:c.height,fill:'url(#mm-grid-pattern)','pointer-events':'none','data-output':'grid'},svg);
    if(!map){inspect();state();return;}
    // SVG paint order is explicit: every cable is above every device image.
    const haloLayer=el('g',{'data-layer':'device-halos','pointer-events':'none'}),nodeLayer=el('g',{'data-layer':'devices'}),cableLayer=el('g',{'data-layer':'cables'}),labelLayer=el('g',{'data-layer':'device-labels'}),anchorLayer=el('g',{'data-layer':'ports'}),handleLayer=el('g',{'data-layer':'handles','data-output':'omit'}),tooltipLayer=el('g',{'data-layer':'port-labels','pointer-events':'none','data-output':'omit'});
    for(const n of map.nodes){
        const appearance=FP.appearance(n.appearance),ds=deviceState(n),record=deviceStatuses.get(Number(n.device_id));
        const halo=el('g',{'data-node-halo':n.id,'data-device-id':n.device_id,'data-status':ds.key},haloLayer);
        for(const [width,opacity] of [[20,.08],[12,.17],[5,.32]])el('rect',{x:n.x-3*scale,y:n.y-3*scale,width:n.w+6*scale,height:n.h+6*scale,rx:4*scale,fill:'none',stroke:ds.color,'stroke-width':width,opacity,'vector-effect':'non-scaling-stroke'},halo);
        const g=el('g',{'data-type':'node','data-id':n.id,class:'mm-node'},nodeLayer),selected=selection?.type==='node'&&selection.id===n.id;
        el('rect',{x:n.x-2*scale,y:n.y-2*scale,width:n.w+4*scale,height:n.h+4*scale,rx:3*scale,fill:'#fff',stroke:ds.color,'stroke-width':2.5,'vector-effect':'non-scaling-stroke'},g);
        el('image',{href:base+'/images/'+n.image,x:n.x,y:n.y,width:n.w,height:n.h,opacity:appearance.opacity,preserveAspectRatio:'none'},g);
        el('title',{},g,n.device_id?D.deviceHint(record):n.label+' · MorMap component');
        const labels=el('g',{'data-type':'node','data-id':n.id},labelLayer);
        el('text',{x:n.x,y:n.y-(D.deviceIpVisible(n,record)?27:12)*scale,'font-size':appearance.label_size*scale,'font-weight':appearance.label_bold?700:400,fill:appearance.label_color,'paint-order':'stroke',stroke:'#fff','stroke-width':3*scale,'stroke-linejoin':'round'},labels,n.label);
        if(D.deviceIpVisible(n,record))el('text',{'data-device-ip':n.id,x:n.x,y:n.y-12*scale,'font-size':Math.max(8,appearance.label_size*.85)*scale,fill:appearance.label_color,'paint-order':'stroke',stroke:'#fff','stroke-width':3*scale},labels,record.resolved_ip);
        el('title',{},labels,n.device_id?D.deviceHint(record):n.label+' · MorMap component');
        if(selected&&mode!=='view'&&picked().length<2){
            el('rect',{x:n.x-4*scale,y:n.y-4*scale,width:n.w+8*scale,height:n.h+8*scale,fill:'none',stroke:'#147ea5','stroke-dasharray':'4 3','stroke-width':1,'vector-effect':'non-scaling-stroke','pointer-events':'none'},handleLayer);
            el('rect',{x:n.x+n.w-5*scale,y:n.y+n.h-5*scale,width:10*scale,height:10*scale,fill:'#167a9b','data-type':'resize','data-id':n.id,class:'mm-handle'},handleLayer);
        }
    }
    for(const l of map.links){
        const selected=selection?.type==='link'&&selection.id===l.id;
        const g=el('g',{'data-type':'link','data-id':l.id,class:'mm-cable','pointer-events':mode==='anchor'||mode==='cable'?'none':'auto'},cableLayer);
        const d=G.connectorPath(l.points,l.connector,l.format),orthogonal=!l.connector||l.connector==='right-angle';
        CS.draw(g,{points:l.points,type:l.connector,format:l.format,color:l.color||(l.kind==='stack'?'#7c3aed':cableState(l).color),selected,id:l.id,shape:(tag,attrs)=>el(tag,attrs,null),G});
        if(!orthogonal||Number(l.format?.rounding)>0)el('path',{d,fill:'none',stroke:'transparent','stroke-width':12,'vector-effect':'non-scaling-stroke'},g);
        for(let i=0;orthogonal&&i<l.points.length-1;i++){
            const a=l.points[i],b=l.points[i+1];
            el('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'transparent','stroke-width':12,'vector-effect':'non-scaling-stroke','data-segment':i},g);
            if(selected&&mode==='select'&&picked().length<2){
                const sz=8*scale;
                el('rect',{x:(a.x+b.x)/2-sz/2,y:(a.y+b.y)/2-sz/2,width:sz,height:sz,fill:'#fff',stroke:'#137fa4','stroke-width':1.5,'vector-effect':'non-scaling-stroke','data-type':'segment','data-id':l.id,'data-segment':i,class:'mm-handle'},handleLayer);
            }
        }
        el('title',{},g,`${anchor(l.source)?.label} ↔ ${anchor(l.target)?.label}`);T.cableLabel({parent:g,shape:(tag,attrs,text)=>el(tag,attrs,null,text),G,U:UI,points:l.points,type:l.connector,format:l.format,cable:l,graph:map.infrastructure,refs:[I.portRef(anchor(l.source)),I.portRef(anchor(l.target))],state:cableState(l),scale});
        if(selected&&mode==='select'&&picked().length<2)for(let i=1;i<l.points.length-1;i++){const p=l.points[i];if(l.connector==='curved'){const end=l.points[i===1?0:3];el('line',{x1:end.x,y1:end.y,x2:p.x,y2:p.y,stroke:'#147eaa','stroke-dasharray':'3 3','vector-effect':'non-scaling-stroke','pointer-events':'none'},handleLayer);}const handle=el('circle',{cx:p.x,cy:p.y,r:4*scale,fill:'#147eaa',stroke:'#fff','stroke-width':1.2,'vector-effect':'non-scaling-stroke','data-type':'vertex','data-id':l.id,'data-vertex':i,class:'mm-handle'},handleLayer);el('title',{},handle,l.connector==='curved'?'Drag to adjust the curve':'Right-click to remove this bend');}
    }
    for(const a of map.anchors){
        const paired=coincidentPeer(a);if(paired&&map.infrastructure.ports[I.portRef(a)].face==='rear')continue;
        const host=node(a.node_id),p=G.point(host,a),r=D.anchorRadius(host),ps=portState(a);
        const g=el('g',{'data-type':'anchor','data-id':a.id,'data-port-id':a.port_id,'data-status':ps.key,class:'mm-anchor'},anchorLayer);
        const selected=selection?.type==='anchor'&&(selection.id===a.id||selection.id===paired?.id);
        // Visible LED uses map units, not screen pixels: zoom and image resize scale it.
        // A larger transparent target helps selection without changing its appearance.
        el('circle',{cx:p.x,cy:p.y,r:Math.max(r*2.5,5*scale),fill:'transparent','data-marker':'hit'},g);
        D.portMarker(g,{x:p.x,y:p.y,r,color:ps.color,shape:(tag,attrs)=>el(tag,attrs,null)});
        if(selected||pending===a.id||pending===paired?.id)el('circle',{cx:p.x,cy:p.y,r:r*2.2,fill:'none',stroke:'#047da9','stroke-width':r*.35,'pointer-events':'none'},g);
        el('title',{},g,`${node(a.node_id).label} · ${a.label}${paired?' / '+paired.label+' · FRONT / REAR':''} · ${ps.label}\n${ps.detail}`);
        const text=`${a.label}${paired?' / '+paired.label+' · FRONT / REAR':''} · ${ps.label}`,width=(Math.min(text.length,64)*6.5+16)*scale;
        const x=clamp(p.x+13*scale,view.x+2*scale,view.x+view.w-width-2*scale),y=p.y+14*scale;
        const label=el('g',{'data-anchor-label':a.id,visibility:a.id===hoveredAnchor||selected?'visible':'hidden'},tooltipLayer);
        el('rect',{x,y,width,height:23*scale,rx:4*scale,fill:'#fff',stroke:ps.color,'stroke-width':1.5,'vector-effect':'non-scaling-stroke'},label);
        el('text',{x:x+8*scale,y:y+16*scale,'font-size':11*scale,'font-weight':600,fill:'#203747'},label,text.slice(0,64));
        portLabels.set(a.id,label);
    }
    for(const guide of snapGuides)el('line',guide.axis==='x'?{x1:guide.value,x2:guide.value,y1:view.y,y2:view.y+view.h,stroke:'#be55b0','stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke','pointer-events':'none','data-output':'omit'}:{y1:guide.value,y2:guide.value,x1:view.x,x2:view.x+view.w,stroke:'#be55b0','stroke-dasharray':'4 4','vector-effect':'non-scaling-stroke','pointer-events':'none','data-output':'omit'},svg);
    routePreview(el('g',{'data-layer':'route-preview','data-output':'omit','pointer-events':'none'},handleLayer));renderAnnotations();renderPicked();DW.render();DG.render();V.render();inspect();state();
}
function editCableDetails(l){let controls;dialog('Cable details',c=>{controls=TC.cable(c,l);},()=>{const value=controls.value();checkpoint();Object.assign(l,value);if(l.kind==='stack'&&!l.color)l.color='#7c3aed';changed();render();message(I.warningText(map,'logical'),false,true);});}
function editComment(object,position){
    if(readOnly||mode==='view')return;let input;const hadComment=!!object.comment;
    dialog('Comment',c=>{input=field(c,'Comment',html('textarea',null,{value:object.comment||'',maxLength:4000,rows:6}));c.append(html('small','Saved with this object. Clear the text to remove the comment.'));},async()=>{checkpoint();object.comment=input.value.trim();if(!object.comment)delete object.comment_box;if(position&&object.comment&&(!hadComment||!object.comment_box))object.comment_box={x:position.x,y:position.y};notes.open(object.id);changed();render();});
}
function infoSize(l){let input;dialog('Info size',c=>{input=field(c,'Text size',html('input',null,{type:'number',min:4,max:32,step:'any',value:l.info.font_size||8,required:true}));c.append(html('small','Size is saved with this info label. The box fits its text and scales with the map.'));},()=>{checkpoint();l.info.font_size=UI.numberValue(input);changed();render();},true);}

function formatCable(l){lastCablePress=null;let controls;dialog('Format Cable',c=>{controls=CC.cableFormat(c,{connector:l.connector,format:l.format,color:l.color,statusColor:cableState(l).color,label:anchor(l.source).label+' ↔ '+anchor(l.target).label});},()=>{const v=controls.value();checkpoint();if((l.connector||'right-angle')!==v.connector)l.points=G.connectorRoute(endpoint(l.source),endpoint(l.target),v.connector);lastCablePress=null;l.connector=v.connector;l.format=v.format;if(v.color)l.color=v.color;else delete l.color;setPicked([{type:'link',id:l.id}]);changed();render();});}
function alignNodePorts(n){const ports=map.anchors.filter(a=>a.node_id===n.id);if(ports.length<2){message('Place at least two connection points before aligning.');return;}let controls;dialog('Align points · '+n.label,c=>{controls=CC.alignment(c,{ports,image:base+'/images/'+n.image,width:n.w,height:n.h});},()=>{checkpoint();for(const [i,p]of controls.value().entries())Object.assign(ports[i],{x:p.x,y:p.y});syncLinks();changed();render();});}
function portPoint(n,p,exclude,free=false){const at={x:clamp((p.x-n.x)/n.w,0,1),y:clamp((p.y-n.y)/n.h,0,1)};snapGuides=[];if(!snapEnabled||free)return at;const result=G.snapPort(at,map.anchors.filter(a=>a.node_id===n.id&&a.id!==exclude),n.w/zoomScale(),n.h/zoomScale());if(exclude)snapGuides=result.guides.map(g=>({axis:g.axis,value:g.axis==='x'?n.x+g.value*n.w:n.y+g.value*n.h}));return result.point;}
function editCablePoint(l,index,segment=false){const p=segment?{x:(l.points[index].x+l.points[index+1].x)/2,y:(l.points[index].y+l.points[index+1].y)/2}:l.points[index],axis=segment?(G.segmentH(l.points,index)?'y':'x'):null;let inputs={};dialog(segment?'Move segment':'Edit bend position',c=>{for(const key of axis?[axis]:['x','y'])inputs[key]=field(c,key.toUpperCase()+' (map px)',html('input',null,{type:'number',min:-99000,max:99000,step:'any',value:p[key],required:true}));c.append(html('small','Cable endpoints remain attached to their ports.'));},()=>{const q={...p};for(const [key,input]of Object.entries(inputs))q[key]=UI.numberValue(input);const points=l.connector==='curved'?l.points.map((a,i)=>i===index?q:a):segment?G.moveSegment(l.points,index,q):G.moveBend(l.points,index,q);if(points.length>100)throw Error('Maximum 100 cable points.');checkpoint();l.points=points;changed();render();},true);}

function cableColor(l){let input,automatic;dialog('Cable color',c=>{automatic=html('input',null,{type:'checkbox',checked:!l.color});const label=html('label',null,{className:'mm-inline-check'});label.append(automatic,document.createTextNode('Automatic status color'));c.append(label);input=field(c,'Manual override',html('input',null,{type:'color',value:l.color||cableState(l).color}));input.disabled=automatic.checked;automatic.onchange=()=>input.disabled=automatic.checked;const reset=html('button','Use default color',{type:'button'});reset.onclick=()=>{automatic.checked=true;input.disabled=true;};c.append(reset,html('small','Green: healthy · orange: warning · red: down'));},async()=>{checkpoint();if(automatic.checked)delete l.color;else l.color=input.value;changed();render();},true);}

function wrapText(value,columns=44){const out=[];for(const line of String(value||'').split('\n')){let rest=line;while(rest.length>columns){let at=rest.lastIndexOf(' ',columns);if(at<8)at=columns;out.push(rest.slice(0,at));rest=rest.slice(at).trimStart();}out.push(rest);}return out;}
function renderAnnotations(){
    if(!map)return;const layer=el('g',{'data-layer':'annotations'});
    notes.begin();
    for(const n of map.nodes)notes.draw({key:n.id,object:n,parent:layer,fallback:{x:n.x+n.w+6,y:n.y-18}});
    for(const a of map.anchors){const p=endpoint(a.id);notes.draw({key:a.id,object:a,parent:layer,fallback:{x:p.x+5,y:p.y-18}});}
    for(const l of map.links){
        if(l.info){l.info=G.attachInfo(l.info,l.points,l.connector,l.format);const text=`${anchor(l.source)?.label} ↔ ${anchor(l.target)?.label}`,layout=G.infoLayout(text,l.info.font_size,UI.measureText),{lines,width,height,padding,fontSize,lineHeight}=layout,x=l.info.x,y=l.info.y;
            const g=el('g',{'data-type':'info','data-id':l.id,'data-fixed-info':'true'},layer);el('rect',{x,y,width,height,rx:padding,fill:'#fff',stroke:l.color||cableState(l).color,'stroke-width':.7},g);
            lines.forEach((line,i)=>el('text',{x:x+padding,y:y+padding+fontSize+i*lineHeight,'font-size':fontSize,'font-family':'Arial, sans-serif',fill:'#244358'},g,line));el('title',{},g,'Drag to move. Right-click to change Info size or unfix.');
        }
        const p=l.points[Math.floor(l.points.length/2)];notes.draw({key:l.id,object:l,parent:layer,fallback:{x:p.x+7,y:p.y-19}});
    }
}
async function exportDevice(n){
    const pack=await api('/library/'+encodeURIComponent(n.image)+'/export');pack.name=n.label;if(n.appearance)pack.appearance=G.copy(n.appearance);
    pack.ports=map.anchors.filter(a=>a.node_id===n.id).map((a,i)=>({key:'p'+(i+1),label:a.label,x:a.x,y:a.y,...(a.comment?{comment:a.comment}:{})}));
    window.MorMapOutput.downloadJSON(pack,n.label+'.json');message('Image and connection positions exported. Import the package in another MorMap Asset library.',true);
}
function exportSource(){
    if(!map)throw Error('Select a map first.');const saved={selection,selectedItems,hoveredAnchor,mode,view:{...view}};selection=null;hoveredAnchor=null;mode='view';view={x:0,y:0,w:svg.clientWidth||1920,h:svg.clientHeight||1080};
    try{render();const snapshot=window.MorMapOutput.capture(svg);return {svg:snapshot,map:G.copy(map),page:{x:0,y:0,w:map.canvas.width,h:map.canvas.height},view:saved.view,name:map.name,subtitle:'Logical map',comment:map.comment||'',comments:logicalComments()};}
    finally{selection=saved.selection;selectedItems=saved.selectedItems;hoveredAnchor=saved.hoveredAnchor;mode=saved.mode;view=saved.view;render();}
}
function logicalComments(){return [...map.nodes.map(n=>({name:n.label,text:n.comment})),...map.anchors.map(a=>({name:node(a.node_id).label+' / '+a.label,text:a.comment})),...map.links.map(l=>({name:anchor(l.source)?.label+' ↔ '+anchor(l.target)?.label,text:l.comment}))].filter(c=>c.text);}

function inspect(){
    const box=$('mm-inspector'),key=map?.id+':'+selection?.type+':'+selection?.id;if(box.dataset.selection===key&&box.contains(document.activeElement))return;box.dataset.selection=key;box.replaceChildren();if(selection?.type==='shape'&&picked().length===1){const s=map?.shapes?.find(s=>s.id===selection.id);if(s){DW.inspect(box,s);return;}}if(picked().length>1){const items=picked();DW.controls(box);DG.tools(box);box.append(html('h3',items.length+' items selected'),html('p',items.filter(v=>v.type==='node').length+' devices · '+items.filter(v=>v.type==='link').length+' cables'),html('p','Drag to move together. Ctrl/Shift-click changes the selection. Delete removes the selected items.'));return;}
    const detail=(label,value)=>{const d=html('div',null,{className:'mm-detail'});d.append(html('b',label+' '),html('span',value,{className:'mm-comment-text'}));box.append(d);return d;};
    if(!selection||!map){box.append(html('p','Select a device, connection point or cable.'));DG.tools(box);return;}
    const object=selection.type==='node'?node(selection.id):selection.type==='anchor'?anchor(selection.id):map.links.find(l=>l.id===selection.id);
    if(object&&selection.type!=='node'){if(object.comment)detail('Comment',object.comment);if(!readOnly&&mode!=='view'){const comment=html('button',object.comment?'Edit comment':'Add comment');comment.onclick=()=>editComment(object);box.append(comment);}}
    if(selection.type==='node'){
        const n=node(selection.id);let showIp;box.append(html('h3',n.label));V.inspect(box,n);if(n.stack_member)detail('Stack member',String(n.stack_member)+' · shared management IP');for(const group of T.groups(map.infrastructure,n)){const gs=T.groupState(group,statuses,deviceStatuses,D);detail(group.name,`${group.type==='team'?'NIC Team':'Bond / LAG'} · ${gs.up} UP / ${gs.down} DOWN / ${gs.unknown} Unknown · ${gs.label}`);}const record=deviceStatuses.get(Number(n.device_id));if(n.device_id){detail('System Name',record?.sysName||'Unavailable');const ipLine=detail('Resolved IP',record?.resolved_ip||'Unavailable');if(!readOnly&&mode!=='view'){const label=html('label',null,{className:'mm-ip-visibility',title:'Show IP on map. Apply properties to preview the change.'});showIp=html('input',null,{type:'checkbox'});showIp.setAttribute('form','mm-node-properties');showIp.setAttribute('aria-label','Show IP on map');showIp.checked=n.show_ip!==false;label.append(showIp,...ipLine.childNodes);ipLine.append(label);}}else detail('Component',n.label);
        const infrastructureDevice=map.infrastructure?.devices?.[I.deviceRef(n)],placements=Object.values(infrastructureDevice?.placements||{}).filter(p=>!n.stack_member||!p.stack_member||p.stack_member===n.stack_member);if(!placements.length&&infrastructureDevice?.physical)placements.push(infrastructureDevice.physical);for(const physical of placements){detail('Physical location',physical.path+' · U'+physical.rack_u);if(!readOnly&&physical.plan_id){const link=html('a','Open in Physical',{href:base+'/physical?map='+encodeURIComponent(physical.plan_id)+'&location='+encodeURIComponent(physical.location_id||'')+'&equipment='+encodeURIComponent(I.deviceRef(n))+(n.stack_member?'&member='+n.stack_member:'')});box.append(link);}}
        if(!readOnly&&mode!=='view'){
            const form=html('form',null,{id:'mm-node-properties'}),name=field(form,'Display name',html('input',null,{value:n.label,maxLength:120,required:true})),comment=field(form,'Comment',html('textarea',null,{value:n.comment||'',maxLength:4000,rows:3})),grid=html('div',null,{className:'mm-property-grid'});form.append(grid);
            const width=field(grid,'Width',html('input',null,{type:'number',min:40,max:4000,step:'any',value:n.w,required:true})),height=field(grid,'Height',html('input',null,{type:'number',min:20,max:4000,step:'any',value:n.h,required:true}));
            form.append(html('button','Apply properties',{type:'submit',className:'mm-primary'}));form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;checkpoint();if(showIp)n.show_ip=showIp.checked;n.label=name.value.trim()||n.label;n.comment=comment.value.trim();n.w=UI.numberValue(width);n.h=UI.numberValue(height);syncLinks();changed();render();};box.append(form);
            const actions=html('div',null,{className:'mm-property-actions'}),image=html('button','Change image',{type:'button'}),remove=html('button','Delete',{type:'button'});image.onclick=()=>changeNodeImage(n).catch(fail);remove.onclick=removeSelection;const align=html('button','Align points',{type:'button'});align.onclick=()=>alignNodePorts(n);const format=html('button','Format device',{type:'button'});format.onclick=()=>formatObject(n);const groups=html('button','Port groups',{type:'button'});groups.onclick=()=>editPortGroups(n).catch(fail);actions.append(format,image,align,groups,remove);if(n.device_id){const bind=html('button','Bind image ports',{type:'button'});bind.onclick=()=>bindImagePorts(n).catch(fail);actions.append(bind);}box.append(actions);
        }
        showNodePorts(box,n);
        if(readOnly){if(n.comment)detail('Comment',n.comment);return;}
    } else if(selection.type==='anchor'){
        const a=anchor(selection.id);detail('Device',node(a.node_id).label);detail('Port',a.label);detail('State',portState(a).label);detail('Status detail',portState(a).detail);const related=I.connections(connectionGraph,I.portRef(a));detail('Logical connections',String(related.length));if(related.length>1)detail('Warning','Multiple connections are retained; connectivity is ambiguous.');if(!readOnly)for(const shared of related){if(map.links.some(l=>l.connection_id===shared.id||I.samePair(shared,I.portRef(anchor(l.source)),I.portRef(anchor(l.target)))))continue;const other=shared.source===I.portRef(a)?shared.target:shared.source,disconnect=html('button','Disconnect logical cable to '+([connectionGraph.devices?.[connectionGraph.ports?.[other]?.device_ref]?.name,connectionGraph.ports?.[other]?.label||other].filter(Boolean).join(' / ')),{type:'button'});disconnect.onclick=()=>{checkpoint();(map.disconnect??=[]).push(shared.id);changed();message('Selected connection marked for disconnection. Save to apply.',true);render();};box.append(disconnect);}if(a.port_id&&!readOnly){const b=html('button','Interface details');b.onclick=()=>showInterface(a.port_id).catch(fail);box.append(b);}
        const peer=coincidentPeer(a);if(peer){const b=html('button','Inspect '+map.infrastructure.ports[I.portRef(peer)].face.toUpperCase());b.onclick=()=>{selection={type:'anchor',id:peer.id};render();};box.append(b);}
    } else if(selection.type==='inventory-port'){
        const p=statuses.get(Number(selection.id)),n=node(selection.nodeId);if(!p||!n)return;
        detail('Device',n.label);detail('Port',p.ifName||p.ifDescr||String(p.port_id));detail('State',D.port(p,deviceStatuses.get(Number(n.device_id))).label);
        if(readOnly||mode==='view')return;const btn=html('button','Place on image');btn.onclick=()=>{placePort={nodeId:n.id,port:p};message('Click the matching port on '+n.label+'. Escape cancels.',false,true);setDetails(false);};box.append(btn);
    } else {
        const l=map.links.find(l=>l.id===selection.id);if(!l)return;detail('From',anchor(l.source).label);detail('To',anchor(l.target).label);detail('State',cableState(l).label);detail('Detail',cableState(l).detail);
        if(l.kind)detail('Type',l.kind);if(l.media)for(const[k,v]of Object.entries(l.media))if(v)detail(k.replaceAll('_',' '),String(v));if(readOnly)return;const details=html('button','Cable details',{type:'button'});details.onclick=()=>editCableDetails(l);box.append(details);const format=html('button','Format Cable',{type:'button'});format.disabled=mode==='view';format.onclick=()=>formatCable(l);box.append(format);const btn=html('button','Reset cable path');btn.disabled=mode==='view';btn.onclick=()=>{checkpoint();l.points=G.connectorRoute(endpoint(l.source),endpoint(l.target),l.connector);changed();render();};box.append(btn);
    }
}
function dialog(title,build,onSubmit,compact=false){
    if(UI.resumeDialog?.($('mm-dialog')))return;
    const d=$('mm-dialog'),fields=$('mm-fields');d.classList.toggle('mm-compact-dialog',compact);d.style.width='';d.style.height='';fields.replaceChildren();$('mm-dialog-title').textContent=title;$('mm-dialog-error').textContent='';
    build(fields);$('mm-form').onsubmit=async e=>{e.preventDefault();const submit=$('mm-form').querySelector('[type=submit]');submit.disabled=true;try{await onSubmit();d.close();}catch(err){$('mm-dialog-error').textContent=err.message;}finally{submit.disabled=false;}};
    UI?UI.openDialog(d):d.showModal();
}
function field(container,label,input){input.setAttribute('aria-label',label);container.append(html('label',label),input);return input;}
function textDialog(title,value,submit){let input;dialog(title,c=>{input=field(c,'Name',html('input',null,{value,required:true,maxLength:120}));},()=>submit(input.value.trim()||'Untitled'));}
async function listMaps(){const maps=await api('/maps');const s=$('mm-maps');s.replaceChildren(html('option','Choose map…',{value:''}));for(const m of maps)s.append(html('option',m.name,{value:m.id}));if(map)s.value=map.id;return maps;}
function loadMap(data,keepHistory=false){publishedRevision=data.published_revision??null;delete data.published_revision;requestGeneration++;root.dataset.mapId=data.id;if(!readOnly){workspaceMemory.set({map:data.id});$('mm-maps').value=data.id;}map=I.logical(data,data.infrastructure,G,!readOnly);infrastructureNotice=false;map.canvas=D.canvas(data.canvas);dirty=false;selection=null;pending=null;routeDraft=null;placePort=null;hoveredAnchor=null;if(!keepHistory){history=history.filter(e=>e.__undo);future=[];}statuses.clear();deviceStatuses.clear();allPortsByDevice.clear();portCache.clear();if(embedded)fit();else fitPage();refreshStatus();const warning=I.warningText(map,'logical');if(warning)message(warning,false,true);else if(data.infrastructure?.migration_conflicts?.some(c=>c.workspace==='logical'&&c.map_id===data.id))message('This legacy map contains unresolved cable references. Review its connection details.',false,true);}
async function openMap(id){if(!id||saving||drag||V.dragging()||DW.dragging()||DG.dragging())return;if(dirty&&!confirm('Discard unsaved changes?')){$('mm-maps').value=map.id;return;}saving=true;mapLoading=true;state();try{const ticket=++mapLoadTicket,data=await api('/maps/'+id);if(ticket!==mapLoadTicket)return;message();loadMap(data);}finally{saving=false;mapLoading=false;state();}}
async function save(){if(readOnly||!map||saving||!dirty||V.dragging()||DG.dragging()||DW.dragging())return;window.MorMapDiagramGroupsModel.clean(map);saving=true;state();const snapshot=G.copy(map),payload=G.copy(map);delete payload.infrastructure;try{const result=await api('/maps/'+map.id,{method:'PUT',body:payload});if(map.id===snapshot.id){const edited=JSON.stringify(map)!==JSON.stringify(snapshot);if(!edited){map=I.logical(result,result.infrastructure,G);dirty=false;}else{map.revision=result.revision;map.infrastructure=result.infrastructure;map.infrastructure_revision=result.infrastructure_revision;for(const l of map.links){const saved=result.links.find(v=>v.id===l.id);if(saved?.connection_id)l.connection_id=saved.connection_id;}map.disconnect=(map.disconnect||[]).filter(id=>!(snapshot.disconnect||[]).includes(id));}}const warning=I.warningText(map,'logical');message('Saved. '+(warning||'Logical connections and physical cables are independent.'),!warning,!!warning);await listMaps();}catch(e){fail(e);}finally{saving=false;render();}}

function fit(){
    pageFitted=false;const w=svg.clientWidth||1000,h=svg.clientHeight||650;
    if(!map?.nodes.length&&!map?.shapes?.length){fitPage();return;}
    const pts=map.nodes.filter(n=>!DG.hidden(n.id)).flatMap(n=>[{x:n.x,y:n.y-30},{x:n.x+n.w,y:n.y+n.h}]).concat(map.links.flatMap(l=>l.points),V.bounds(),DG.bounds(),DW.bounds());
    const minX=Math.min(...pts.map(p=>p.x))-70,minY=Math.min(...pts.map(p=>p.y))-70,maxX=Math.max(...pts.map(p=>p.x))+70,maxY=Math.max(...pts.map(p=>p.y))+70;
    const scale=Math.max((maxX-minX)/w,(maxY-minY)/h,.25);view={x:(minX+maxX-w*scale)/2,y:(minY+maxY-h*scale)/2,w:w*scale,h:h*scale};render();
    if(embedded){
        // Labels have a constant screen size. Include their rendered extents,
        // not just the equipment rectangles, when fitting a dashboard widget.
        for(let attempt=0;attempt<10;attempt++){
            const boxes=[...svg.querySelectorAll('[data-layer="devices"],[data-layer="device-labels"],[data-layer="cables"],[data-layer="virtual-guests"],[data-layer="cluster-groups"],[data-layer="cable-ducts"],[data-layer="drawings-back"],[data-layer="drawings-front"]')].map(g=>g.getBBox()).filter(b=>b.width||b.height);
            if(!boxes.length)break;
            const pad=16*view.w/w,x=Math.min(...boxes.map(b=>b.x))-pad,y=Math.min(...boxes.map(b=>b.y))-pad,right=Math.max(...boxes.map(b=>b.x+b.width))+pad,bottom=Math.max(...boxes.map(b=>b.y+b.height))+pad;
            if(x>=view.x&&y>=view.y&&right<=view.x+view.w&&bottom<=view.y+view.h)break;
            const ratio=Math.max((right-x)/w,(bottom-y)/h);view={x:(x+right-w*ratio)/2,y:(y+bottom-h*ratio)/2,w:w*ratio,h:h*ratio};render();
        }
    }
}
async function refreshStatus(){
    if(!map)return;
    if(statusBusy){statusQueued=true;return;}
    V.refresh();
    const ids=[...new Set([...map.anchors.map(a=>a.port_id),...map.nodes.flatMap(n=>T.groups(map.infrastructure,n).flatMap(g=>[...g.ports,g.aggregate].filter(r=>r?.startsWith('lnms:port:')).map(r=>Number(r.split(':').at(-1)))))].filter(Boolean))],device_ids=[...new Set(map.nodes.map(n=>n.device_id).filter(Boolean))];
    const generation=requestGeneration;statusBusy=true;statusQueued=false;state();
    try{
        const data=await api('/status',{method:'POST',body:{ids,device_ids}});
        if(generation!==requestGeneration)return;
        if(!Array.isArray(data.ports)||!Array.isArray(data.devices))throw new Error('Status response is outdated. Refresh this page after the upgrade.');
        const firstStatus=!deviceStatuses.size;statuses=new Map(data.ports.map(p=>[Number(p.port_id),p]));deviceStatuses=new Map(data.devices.map(d=>[Number(d.device_id),d]));
        if(data.infrastructure&&!drag&&!DG.dragging()&&!DW.dragging()){if(!dirty){I.logical(map,data.infrastructure,G,!readOnly);infrastructureNotice=false;}else if(data.infrastructure.revision!==map.infrastructure_revision&&!infrastructureNotice){message('Shared infrastructure changed in another view. Reload before saving.',false,true);infrastructureNotice=true;}}
        allPortsByDevice=new Map();for(const p of data.ports){const id=Number(p.device_id);if(!allPortsByDevice.has(id))allPortsByDevice.set(id,[]);allPortsByDevice.get(id).push(p);}
        $('mm-status-time').textContent='Latest polled data · fetched '+new Date().toLocaleTimeString();if(!drag){if(embedded&&firstStatus)fit();else render();}
    }catch(e){
        if(generation===requestGeneration){statuses.clear();deviceStatuses.clear();$('mm-status-time').textContent='Status unavailable — '+e.message;if(!drag)render();}
    }finally{
        statusBusy=false;state();if(statusQueued||generation!==requestGeneration)refreshStatus();
    }
}
function showNodePorts(box,n){
 const ports=T.memberPorts([...(n.device_id?(allPortsByDevice.get(Number(n.device_id))||[]):[]),...I.values(map.infrastructure?.ports).filter(p=>p.device_ref===I.deviceRef(n)&&p.source==='mormap').map(p=>({port_ref:p.id,port_id:null,ifName:p.label}))],map.infrastructure,n,map.nodes.map(d=>({...d,ports:map.anchors.filter(a=>a.node_id===d.id)})));
 const placed=new Set(map.anchors.filter(a=>a.node_id===n.id).map(I.portRef));box.append(html('h4',`Ports · ${placed.size} placed / ${ports.length}`));
 const list=html('div',null,{className:'mm-device-ports'});for(const p of ports){const row=html('div',null,{className:'mm-device-port'}),ps=p.port_id?D.port(p,deviceStatuses.get(Number(n.device_id))):{color:D.palette.unknown,label:'Unmonitored'};const name=html('span',p.ifName||p.ifDescr||p.port_ref);name.style.color=ps.color;name.title=(p.ifAlias||p.ifDescr||'')+' · '+ps.label;row.append(name);
 if(!readOnly&&mode!=='view'&&!placed.has(I.portRef(p))){const b=html('button','Place',{type:'button'});b.onclick=()=>{placePort={nodeId:n.id,port:p};setDetails(false);message('Click the exact port position on '+n.label+'. Escape cancels.',false,true);};row.append(b);}else row.append(html('small',placed.has(I.portRef(p))?'Placed':ps.label));list.append(row);}box.append(list);
}
function placeExistingDevice(d,assets){
 const asset=assets.find(a=>a.id===(d.presentation?.image||d.image));if(!asset)throw Error('The equipment image is missing.');
 if(map.nodes.some(n=>I.deviceRef(n)===d.id))throw Error('This equipment is already in the map.');if(map.anchors.length+(d.presentation?.ports||[]).length>2000)throw Error('Maximum 2000 connection points per map.');
 const w=asset.kind==='logo'?150:440,h=Math.max(20,Math.min(4000,w*asset.height/asset.width));
 checkpoint();const n={id:uid(),object_id:d.id,device_id:d.device_id||null,label:d.name||d.id,image:asset.id,...(asset.appearance?{appearance:G.copy(asset.appearance)}:{}),x:view.x+view.w/2-w/2,y:view.y+view.h/2-h/2,w,h};map.nodes.push(n);
 for(const p of d.presentation?.ports||[])map.anchors.push({...p,id:uid(),node_id:n.id,port_id:p.port_id||null,port_ref:I.portRef(p)});
 I.logical(map,map.infrastructure,G);selection={type:'node',id:n.id};setDetails(true);changed();render();refreshStatus();
}
async function changeNodeImage(n){
 const assets=(await api('/library')).assets;let choice;
 dialog('Change device image',c=>{choice=UI.assetPicker(c,assets,n.image);c.append(html('p','Existing connection positions are preserved. If no ports are placed, matching image positions are added automatically. Use Bind image ports to review other assignments.'));},async()=>{if(!choice.value)throw Error('Choose an image.');const asset=assets.find(a=>a.id===choice.value),ports=n.device_id&&!map.anchors.some(a=>a.node_id===n.id)?await api('/devices/'+n.device_id+'/ports'):[];const matches=window.MorMapPortMapping.match(asset.ports||[],ports).filter(r=>r.port);if(map.anchors.length+matches.length>2000)throw Error('Maximum 2000 connection points per map.');checkpoint();n.image=choice.value;appendImagePorts(n,matches);changed();render();refreshStatus();});
}
function appendImagePorts(n,rows){
 const used=new Set(map.anchors.map(a=>Number(a.port_id)));let count=0;
 for(const {slot,port:p}of rows){if(!p||used.has(Number(p.port_id)))continue;used.add(Number(p.port_id));n.hidden_ports=(n.hidden_ports||[]).filter(ref=>ref!=='lnms:port:'+p.port_id);map.anchors.push({id:uid(),node_id:n.id,port_id:Number(p.port_id),port_ref:'lnms:port:'+p.port_id,label:p.ifName||p.ifDescr||String(p.port_id),x:slot.x,y:slot.y,...(slot.asset_key?{asset_key:slot.asset_key}:{}),...(slot.comment?{comment:slot.comment}:{})});count++;}return count;
}
async function bindImagePorts(n){
 const [catalog,ports]=await Promise.all([api('/library'),api('/devices/'+n.device_id+'/ports')]),asset=catalog.assets.find(a=>a.id===n.image)||await api('/library/'+encodeURIComponent(n.image));let rows=[];
 if(!asset?.ports?.length)throw Error('This image has no saved connection positions. Add and save them in Asset library first.');
 const items=()=>map.nodes.map(d=>({...d,ports:map.anchors.filter(a=>a.node_id===d.id)})),available=T.portInventory(ports,map.infrastructure,n,items()),slots=T.savedSlots(asset,map.infrastructure,n,map.anchors.filter(a=>a.node_id===n.id));
 dialog('Bind image ports · '+n.label,c=>{c.append(html('p','Add missing image ports. Existing port identities, positions and cables are preserved.'));rows=T.restoreBindings(window.MorMapPortMapping.controls(c,slots,available,'mm-binding-grid',async()=>T.portInventory(await api('/devices/'+n.device_id+'/ports'),map.infrastructure,n,items())));},()=>{
  if(rows.loading)throw Error('Wait for LibreNMS ports to reload.');const selected=rows.filter(r=>r.input.value),ids=selected.map(r=>UI.numberValue(r.input));if(!ids.length)throw Error('Choose at least one LibreNMS port.');if(new Set(ids).size!==ids.length)throw Error('Each image position must use a different LibreNMS port.');
  const missing=selected.map(r=>({slot:r.slot,port:r.ports.find(p=>Number(p.port_id)===UI.numberValue(r.input))})).filter(r=>!map.anchors.some(a=>a.node_id===n.id&&Number(a.port_id)===Number(r.port.port_id)));if(map.anchors.length+missing.length>2000)throw Error('Maximum 2000 connection points per map.');if(!missing.length){message('These ports are already placed.',true);return;}
  checkpoint();appendImagePorts(n,missing);changed();render();refreshStatus();message(missing.length+' missing image ports added. Save to keep their positions.',true);
 });
}
async function editPortGroups(n,type='lag'){
 if(!n||readOnly)return;if(dirty){await save();if(dirty)return;}const ports=n.device_id?await api('/devices/'+n.device_id+'/ports'):[];ports.push(...I.values(map.infrastructure?.ports).filter(p=>p.device_ref===I.deviceRef(n)&&p.source==='mormap').map(p=>({...p,port_ref:p.id,port_id:null})));let controls;
 dialog('Port groups · '+n.label,c=>{controls=TC.groups(c,{device:n,graph:map.infrastructure,ports,type});},async()=>{const result=await api('/infrastructure/groups',{method:'POST',body:{revision:map.infrastructure_revision,device_ref:I.deviceRef(n),groups:controls.value()}});map.infrastructure=result.infrastructure;map.infrastructure_revision=result.infrastructure.revision;recordServerUndo(result.undo_token);render();message('Port groups saved for both workspaces.',true);});
}
async function showInterface(id){const data=await api('/ports/'+id+'/details');dialog('LibreNMS interface details',c=>{const add=(label,value)=>{c.append(html('b',label),html('p',value||'Not reported by LibreNMS'));};const p=data.interface;add('Interface',p.ifName||p.ifDescr);add('Description',p.ifAlias||p.ifDescr);add('Operational / administrative state',p.ifOperStatus+' / '+p.ifAdminStatus);add('VLAN',window.MorMapPortDetails.ranges([p.ifVlan,...(data.vlans||[]).map(v=>v.vlan??v.port_vlan)]));add('IP addresses',(data.addresses||[]).join('\n'));add('LLDP / CDP neighbors',(data.neighbors||[]).map(n=>[n.remote_name||n.remote_hostname,n.remote_ip&&n.remote_ip!=='Unavailable'?'IP '+n.remote_ip:null,n.remote_port,n.protocol].filter(Boolean).join(' · ')).join('\n'));for(const line of window.MorMapPortDetails.lines(data).filter(s=>/^(Mode|Voice VLAN|Tagged|Untagged|Native VLAN|Port VLAN|Speed|Duplex):/.test(s))){const i=line.indexOf(':');add(line.slice(0,i),line.slice(i+1));}},async()=>{});}

async function addDevice(){
    if(!map||readOnly)return;
    const results=await Promise.all([api('/devices'),api('/library'),api('/infrastructure')]);let devices=results[0],assets=results[1].assets;const graph=results[2];await T.withSavedAssets(assets,graph,id=>api('/library/'+encodeURIComponent(id)));if(dirty&&graph.revision!==map.infrastructure_revision)throw Error('Shared infrastructure changed. Save or reload before adding equipment.');if(!dirty)I.logical(map,graph,G);let addTab='new',existingSelect;
    let topologyMode,fillDevices;let select,file,search,assetSelect,preview,bindingBox,bindingRows=[],generation=0,mappingLoading=false,mappingError='',uploadedFile=null,passiveName,passiveType,passiveCount,passiveAsset;
    const selectedAsset=()=>assets.find(a=>a.id===assetSelect.value);
    async function bindings(){
        const current=++generation,a=selectedAsset();mappingError='';bindingRows=[];bindingBox.replaceChildren();preview.src=a?.url||'';preview.hidden=!a;
        if(!a||!select.value){mappingLoading=false;return;}if(!T.savedSlots(a,graph,topologyMode.device(select.value)).length){mappingLoading=false;bindingBox.append(html('p','Use Connection point to place interfaces on this image. Saved manual connectors are reused automatically.'));return;}
        mappingLoading=true;
        try{
            const d=topologyMode.device(select.value),filter=ports=>T.portInventory(ports,graph,d,map.nodes.map(n=>({...n,ports:map.anchors.filter(a=>a.node_id===n.id)})),topologyMode.scope.value),ports=filter(await api('/devices/'+select.value+'/ports'));if(current!==generation)return;
            const slots=T.savedSlots(a,graph,d);bindingRows=T.restoreBindings(window.MorMapPortMapping.controls(bindingBox,slots,ports,'mm-binding-grid',async()=>filter(await api('/devices/'+select.value+'/ports'))));
        }catch(e){if(current===generation){mappingError=e.message;$('mm-dialog-error').textContent=e.message;}}finally{if(current===generation)mappingLoading=false;}
    }
    dialog('Add Device',container=>{
        const tabs=html('div',null,{className:'mm-device-tabs'}),newButton=html('button','LibreNMS device',{type:'button',className:'active'}),existingButton=html('button','Existing devices',{type:'button'}),passiveButton=html('button','Device without IP',{type:'button'}),c=html('div',null),existing=html('div',null,{hidden:true}),passive=html('div',null,{hidden:true});tabs.append(newButton,existingButton,passiveButton);container.append(tabs,c,existing,passive);
        passiveName=field(passive,'Name',html('input',null,{value:'Device 01',maxLength:120,disabled:true}));passiveType=field(passive,'Type',html('select',null,{disabled:true}));
        for(const [value,label] of [['passive','Other passive device'],['active','Active device (unmonitored)'],['patch-panel','Patch panel'],['fiber-panel','Fiber panel'],['odf','ODF'],['coupler','Coupler'],['splice-box','Splice box'],['wall-outlet','Wall outlet'],['pdu','PDU'],['ups','UPS'],['cable-manager','Cable manager']])passiveType.append(html('option',label,{value}));
        passiveCount=field(passive,'Physical ports',html('input',null,{type:'number',min:0,max:192,step:1,value:0,disabled:true}));
        const passiveImages=html('div',null);passive.append(passiveImages);const preparePassive=()=>{passiveAsset??=UI.assetPicker(passiveImages,assets,'',asset=>{const types={'stencil-patch-panel':'patch-panel','stencil-fiber-panel':'fiber-panel','stencil-pdu':'pdu','stencil-ups':'ups','stencil-cable-manager':'cable-manager'};passiveType.value=types[asset.id]||'passive';passiveCount.value=Math.min(192,asset.ports?.length||0);});};
        passiveType.onchange=()=>{if(passiveType.value==='wall-outlet')passiveCount.value=1;if(passiveType.value==='cable-manager')passiveCount.value=0;};
        passive.append(html('p','Create ports now, or use X to add named connectors later. Patch panels, fiber panels and wall outlets have paired front/rear ports.'));
        existingSelect=field(existing,'Existing devices',html('select',null,{className:'mm-existing-equipment',size:6}));
        for(const d of I.values(graph.devices).filter(d=>d.presentation?.image||d.image)){const placed=map.nodes.some(n=>I.deviceRef(n)===d.id);existingSelect.append(html('option',(d.name||d.id)+(placed?' · Already in this map':''),{value:d.id,disabled:placed}));}
        existing.append(html('p','Uses the same equipment, ports and connections. Its position in this map is independent.'));
        const switchTab=value=>{if(value==='passive')preparePassive();addTab=value;c.hidden=value!=='new';existing.hidden=value!=='existing';passive.hidden=value!=='passive';newButton.classList.toggle('active',value==='new');existingButton.classList.toggle('active',value==='existing');passiveButton.classList.toggle('active',value==='passive');select.required=value==='new';passiveName.required=passiveCount.required=value==='passive';passiveName.disabled=passiveType.disabled=passiveCount.disabled=value!=='passive';};newButton.onclick=()=>switchTab('new');existingButton.onclick=()=>switchTab('existing');passiveButton.onclick=()=>switchTab('passive');
        c.append(html('label','Find a device (IP or hostname)'));
        const row=html('div',null,{className:'mm-search-row'});search=html('input',null,{type:'search',placeholder:'IP or hostname',maxLength:128});const find=html('button','Search',{type:'button'});row.append(search,find);c.append(row);topologyMode=TC.mode(c,()=>{if(!select||!assetSelect)return;fillDevices?.();select.onchange?.();},graph);
        select=field(c,'LibreNMS device',html('select',null,{required:true}));
        const fill=()=>{select.replaceChildren();for(const d of devices){const placed=topologyMode.value==='standalone'&&map.nodes.some(n=>Number(n.device_id)===Number(d.device_id));select.append(html('option',`${d.hostname} · ${d.sysName||''}`+(placed?' · Already in this map':''),{value:String(d.device_id),disabled:placed}));}};fillDevices=()=>{const previous=select.value;fill();if([...select.options].some(o=>o.value===previous&&!o.disabled))select.value=previous;};fill();
        find.onclick=async()=>{try{devices=await api('/devices?q='+encodeURIComponent(search.value));fill();select.onchange();}catch(e){$('mm-dialog-error').textContent=e.message;}};
        search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();find.onclick();}};select.onchange=()=>{const remembered=T.profile(graph,topologyMode.device(select.value));if(remembered?.image&&assets.some(a=>a.id===remembered.image)&&assetSelect.value!==remembered.image)assetSelect.select(remembered.image);else bindings();};
        assetSelect=UI.assetPicker(c,assets,'',()=>{uploadedFile=null;if(file)file.value='';bindings();});
        preview=html('img',null,{alt:'Selected asset',hidden:true});
        const fillAssets=(id='')=>assetSelect.select(id);
        file=field(c,'Or import once to the shared library',html('input',null,{type:'file',accept:'.svg,.png,.jpg,.jpeg,.webp,.json'}));
        bindingBox=html('div',null);c.append(bindingBox,html('small','Reuse images across every map. Edit reusable port positions in Asset library. Maximum package upload: 8 MB.'));
        if(select.value)setTimeout(()=>select.onchange?.(),0);
        file.onchange=async()=>{const f=file.files[0];if(!f)return;try{if(f.size>8*1024*1024)throw Error('Choose an image or stencil package up to 8 MB.');const body=new FormData();body.append('image',f);const a=await api('/images',{method:'POST',body});if(!assets.some(v=>v.id===a.id))assets.push(a);uploadedFile=f;fillAssets(a.id);await bindings();}catch(e){$('mm-dialog-error').textContent=e.message;}};
    },async()=>{
        if(map.nodes.length>=200)throw new Error('Maximum 200 images per map.');
        if(addTab==='existing'){const d=graph.devices[existingSelect.value];if(!d)throw Error('Choose existing equipment.');placeExistingDevice(d,assets);return;}
        if(addTab==='passive'){
            const asset=assets.find(a=>a.id===passiveAsset.value),count=UI.numberValue(passiveCount);if(!asset)throw Error('Choose an image.');if(!passiveName.value.trim())throw Error('Enter a device name.');if(!Number.isInteger(count)||count<0||count>192)throw Error('Choose 0–192 physical ports.');if(map.anchors.length+Math.min(count,asset.ports?.length||0)>2000)throw Error('Maximum 2000 connection points per map.');
            const ownerMap=map,result=await api('/infrastructure/components',{method:'POST',body:{revision:map.infrastructure_revision,name:passiveName.value.trim(),type:passiveType.value,port_count:count,image:asset.id}});if(map!==ownerMap)throw Error('The map changed. The equipment is available under Existing devices.');map.infrastructure=result.infrastructure;map.infrastructure_revision=result.infrastructure.revision;
            const ports=I.values(result.infrastructure.ports).filter(p=>p.device_ref===result.device.id&&p.face!=='rear').sort((a,b)=>(a.position||0)-(b.position||0)).flatMap((p,i)=>asset.ports?.[i]?[{port_id:null,port_ref:p.id,label:p.label,x:asset.ports[i].x,y:asset.ports[i].y}]:[]);
            placeExistingDevice({...result.device,presentation:{image:asset.id,ports}},assets);return;
        }
        if(!select.value)throw new Error('Select a LibreNMS device.');const requested=topologyMode.device(select.value),existingNode=map.nodes.find(n=>Number(n.device_id)===UI.numberValue(select));if(topologyMode.isGroup()&&existingNode){setTimeout(()=>editPortGroups(existingNode,topologyMode.value).catch(fail),0);return;}const candidates=map.nodes.map(n=>requested.stack_member&&n.device_id===requested.device_id&&!n.stack_member?{...n,stack_member:1}:n);if(T.duplicate(candidates,requested))throw Error('This device or stack member is already in the map.');if(mappingError)throw Error(mappingError);if(bindingRows.some(r=>r.missing))throw Error('Some saved bindings are unavailable. Reload ports or explicitly choose their assignments.');if(mappingLoading||bindingRows.loading)throw Error('Wait for stencil port bindings to load.');
        let result=selectedAsset();const f=file.files?.[0];
        if(f&&f!==uploadedFile){if(f.size>8*1024*1024)throw new Error('Choose an image or stencil package up to 8 MB.');const form=new FormData();form.append('image',f);result=await api('/images',{method:'POST',body:form});}
        if(!result)throw Error('Choose an existing image or import one.');
        const bound=bindingRows.filter(r=>r.input.value),ids=bound.map(r=>UI.numberValue(r.input));if(new Set(ids).size!==ids.length)throw Error('Each stencil position must use a different LibreNMS port.');
        
        const rememberedPorts=T.profile(map.infrastructure,requested),manualPositions=rememberedPorts?.image===result.id?(rememberedPorts.ports||[]).filter(p=>!p.port_id&&map.infrastructure?.ports?.[p.port_ref]?.device_ref==='lnms:device:'+select.value):[];
        if(map.anchors.length+bound.length+manualPositions.length>2000)throw Error('Maximum 2000 connection points per map.');
        const d=devices.find(d=>String(d.device_id)===select.value),w=result.kind==='logo'?150:400,h=clamp(w*result.height/result.width,20,4000);
        checkpoint();const n={id:uid(),label:rememberedPorts?.label||String(d.sysName||d.hostname).slice(0,110)+(requested.stack_member?' · M'+requested.stack_member:''),...requested,profile_revision:rememberedPorts?.revision||0,image:result.id,...(result.appearance?{appearance:G.copy(result.appearance)}:{}),x:view.x+view.w/2-w/2,y:view.y+view.h/2-h/2,w,h};
        map.nodes.push(n);for(const r of bound){const p=r.ports.find(p=>Number(p.port_id)===UI.numberValue(r.input));map.anchors.push({id:uid(),node_id:n.id,port_id:Number(p.port_id),label:String(p.ifName||p.ifDescr||p.port_id).slice(0,255),x:r.slot.x,y:r.slot.y,...(r.slot.asset_key?{asset_key:r.slot.asset_key}:{}),...(r.slot.comment?{comment:r.slot.comment}:{})});}
        for(const p of manualPositions)map.anchors.push({...p,id:uid(),node_id:n.id});T.promote(map,'logical',n);syncLinks();
        selection={type:'node',id:n.id};changed();render();refreshStatus();if(topologyMode.isGroup())setTimeout(()=>editPortGroups(n,topologyMode.value).catch(fail),0);
    });
}
async function addAnchor(n,p,free=false){
    if(map.anchors.length>=2000)throw new Error('Maximum 2000 connection points per map.');
    const ownerMap=map,ref=I.deviceRef(n);let ports=n.device_id?await api('/devices/'+n.device_id+'/ports'):[];if(map!==ownerMap)return;
    ports=[...ports,...I.values(map.infrastructure?.ports).filter(p=>p.device_ref===ref&&p.source==='mormap').map(p=>({...p,port_ref:p.id,port_id:null}))];ports=T.memberPorts(ports,map.infrastructure,n,map.nodes.map(d=>({...d,ports:map.anchors.filter(a=>a.node_id===d.id)})));const used=new Set(map.anchors.map(I.portRef)),available=ports.filter(p=>!used.has(I.portRef(p)));let next=1;while(ports.some(p=>(p.label||p.ifName||'').toLowerCase()==='nic'+next))next++;
    let controls;dialog('Bind connection point to a port',c=>{c.append(html('p',n.label));controls=UI.portControls(c,{ports:available,paired:['patch-panel','fiber-panel','wall-outlet','odf','coupler','splice-box'].includes(map.infrastructure?.devices?.[ref]?.type),defaultName:n.stack_member?'M'+n.stack_member+' / Stack'+(I.values(map.infrastructure?.ports).filter(p=>p.device_ref===ref&&p.stack_member===n.stack_member&&p.kind==='stack').length+1):'NIC'+next,defaultKind:n.stack_member?'stack':'ethernet'});},async()=>{
        if(map!==ownerMap||!map.nodes.includes(n))throw Error('This equipment view changed. Reopen the connection-point dialog.');
        const choice=controls.value();let port=choice.port;
        if(!port){const result=await api('/infrastructure/ports',{method:'POST',body:{...choice,revision:map.infrastructure_revision,device_ref:ref,...(n.stack_member?{stack_member:n.stack_member}:{})}});if(map!==ownerMap)throw Error('The map changed. The new port is available under Existing port.');map.infrastructure=result.infrastructure;map.infrastructure_revision=result.infrastructure.revision;port={...result.port,port_ref:result.port.id,port_id:null};}
        checkpoint();const a={id:uid(),node_id:n.id,port_id:port.port_id?Number(port.port_id):null,port_ref:I.portRef(port),label:String(port.label||port.ifName||port.ifDescr||port.port_id).slice(0,255),...portPoint(n,p,null,free)};
        n.hidden_ports=(n.hidden_ports||[]).filter(r=>r!==I.portRef(a));map.anchors.push(a);if(a.port_id)statuses.set(a.port_id,port);selection={type:'anchor',id:a.id};changed();render();refreshStatus();
    });
}

function beginRoute(l){routeDraft={id:l?.id,source:l?.source||pending,steps:[[{...endpoint(l?.source||pending)}]],cursor:null};message('Click waypoints to draw the route. Shift: vertical first · Backspace: undo waypoint · '+(l?'Enter or target port: apply':'target port: finish')+' · Escape: cancel.',false,true);render();}
function draftPoints(){return routeDraft.steps.at(-1);}
function routePoint(p,vertical=false){const point=G.snapCable(p,draftPoints(),{enabled:snapEnabled,grid:25,tolerance:8*zoomScale()}).point;return {point,vertical};}
function addRouteWaypoint(p,vertical){const next=G.appendWaypoint(draftPoints(),p,vertical);if(next.length>96){message('Maximum route points reached. Finish at the destination.');return;}routeDraft.steps.push(next);routeDraft.cursor=null;render();}
function finishRoute(vertical=routeDraft?.cursor?.vertical||false){if(!routeDraft?.id)return;const l=map.links.find(l=>l.id===routeDraft.id),next=G.appendWaypoint(draftPoints(),endpoint(l.target),vertical);checkpoint();l.points=next;l.connector='right-angle';routeDraft=null;pending=null;selection={type:'link',id:l.id};changed();message();render();}
function routePreview(parent=svg.querySelector('[data-layer=route-preview]')){if(!parent)return;parent.replaceChildren();if(!routeDraft)return;let points=draftPoints();if(routeDraft.cursor)points=G.appendWaypoint(points,routeDraft.cursor.point,routeDraft.cursor.vertical);if(routeDraft.id){const l=map.links.find(l=>l.id===routeDraft.id);if(!l){routeDraft=null;return;}points=G.appendWaypoint(points,endpoint(l.target),routeDraft.cursor?.vertical||false);}if(points.length>1)el('polyline',{points:points.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#1686a4','stroke-width':2,'stroke-dasharray':'6 4','vector-effect':'non-scaling-stroke','pointer-events':'none','data-output':'omit'},parent);for(const p of draftPoints())el('circle',{cx:p.x,cy:p.y,r:3*zoomScale(),fill:'#1686a4','pointer-events':'none','data-output':'omit'},parent);}

function connect(a,vertical=false,resolved=false){
    const graph=I.viewGraph(map,'logical'),peer=coincidentPeer(a);
    if(peer&&!resolved){const candidates=[a,peer].sort((a,b)=>map.infrastructure.ports[I.portRef(a)].face==='front'?-1:1),count=p=>I.connections(graph,I.portRef(p)).length;let select;dialog('Choose termination',c=>{c.append(html('p','Connected terminations remain selectable. Additional connections may make the path ambiguous.'));select=field(c,'Side',html('select',null));for(const p of candidates)select.append(html('option',map.infrastructure.ports[I.portRef(p)].face.toUpperCase()+' · '+p.label+' · '+count(p)+' connections',{value:p.id}));select.value=(candidates.find(p=>!count(p))||candidates[0]).id;},()=>connect(anchor(select.value),vertical,true));return;}
    if(!pending){pending=a.id;beginRoute();if(I.connections(graph,I.portRef(a)).length)message('Warning: '+a.label+' is already connected. You can add another connection; existing connections will be retained.',false,true);return;}
    if(pending===a.id)return;
    if(I.portRef(anchor(pending))===I.portRef(a)){message('Both points represent the same port. Choose another port.',false,true);return;}
    const existing=map.links.find(l=>(l.source===pending&&l.target===a.id)||(l.target===pending&&l.source===a.id));
    if(existing){pending=null;routeDraft=null;selection={type:'link',id:existing.id};render();message('This exact connection already exists and is selected. Its details and route were retained.',true);return;}
    if(map.links.length>=1000){message('Maximum 1000 cables per map.');return;}
    const l={id:uid(),source:pending,target:a.id,points:routeDraft?G.appendWaypoint(draftPoints(),endpoint(a.id),vertical):G.shortestRoute(endpoint(pending),endpoint(a.id))};if([anchor(l.source),anchor(l.target)].every(p=>map.infrastructure?.ports?.[I.portRef(p)]?.kind==='stack')){l.kind='stack';l.name='STACK';l.color='#7c3aed';}checkpoint();map.links.push(l);pending=null;routeDraft=null;selection={type:'link',id:l.id};changed();render();message(I.warningText(map,'logical'),false,true);
}
svg.addEventListener('pointerdown',e=>{
    if(e.button!==0||!map||saving)return;const target=cableHitTarget(e),p=screenPoint(e);if(painter.active()){e.preventDefault();painter.paint(paintTargets(target));return;}if(routeDraft){e.preventDefault();if(target?.dataset.type==='anchor'){if(routeDraft.id){const l=map.links.find(l=>l.id===routeDraft.id);if(target.dataset.id===l.target||coincidentPeer(anchor(target.dataset.id))?.id===l.target)finishRoute(e.shiftKey);else message('Finish at the original target port, or press Enter.',false,true);}else connect(anchor(target.dataset.id),e.shiftKey);}else{const at=routePoint(p,e.shiftKey);addRouteWaypoint(at.point,at.vertical);}return;}
    if(mode==='select'&&['link','segment'].includes(target?.dataset.type)){const now=Date.now(),previous=lastCablePress;lastCablePress={time:now,x:e.clientX,y:e.clientY,id:target.dataset.id};if(previous?.id===target.dataset.id&&now-previous.time<400&&Math.hypot(e.clientX-previous.x,e.clientY-previous.y)<6){lastCablePress=null;cableDoubleClick(e);lastCableDetour=now;return;}}

    if(placePort&&mode!=='view'){
        if(target?.dataset.type==='node'&&target.dataset.id===placePort.nodeId){const n=node(placePort.nodeId),port=placePort.port;if(map.anchors.some(a=>a.node_id===n.id&&I.portRef(a)===I.portRef(port))){placePort=null;return;}checkpoint();map.anchors.push({id:uid(),node_id:n.id,port_id:port.port_id?Number(port.port_id):null,port_ref:I.portRef(port),label:String(port.ifName||port.ifDescr||port.port_id).slice(0,255),...portPoint(n,p,null,e.altKey)});placePort=null;changed();render();}else message('Click the device image selected for this port.',false,true);return;
    }
    if(target?.dataset.type==='inventory-port'){selection={type:'inventory-port',id:target.dataset.id,nodeId:target.dataset.nodeId};setDetails(true);render();return;}
    if(mode==='anchor'&&target?.dataset.type==='node'){addAnchor(node(target.dataset.id),p,e.altKey).catch(fail);return;}
    if(mode==='cable'&&target?.dataset.type==='anchor'){connect(anchor(target.dataset.id));return;}
    if(mode==='anchor'||mode==='cable'){if(target)return;}
    if(target){
        let type=target.dataset.type;const id=target.dataset.id;if(type==='comment'){type=target.dataset.owner;selection={type,id};setDetails(true);render();return;}
        selection={type:type==='resize'?'node':['segment','vertex','info'].includes(type)?'link':type,id,paintType:type==='info'?'info':undefined};
        if(mode==='select'&&['node','resize','anchor','segment','vertex','info'].includes(type)){
            drag={type,id,start:p,before:G.copy(map),index:Number(type==='vertex'?target.dataset.vertex:target.dataset.segment),moved:false};
            if(type==='node'||type==='resize')drag.original=G.copy(node(id));
            if(type==='anchor'){drag.original=G.copy(anchor(id));drag.peerId=coincidentPeer(anchor(id))?.id;}
            if(type==='info')drag.original=G.copy(map.links.find(l=>l.id===id).info);
        }
    }else{selection=null;pageFitted=false;drag={type:'pan',client:{x:e.clientX,y:e.clientY},view:{...view},scale:Q.panScale(svg,view),moved:false};}
    if(!drag&&selection&&['node','anchor'].includes(selection.type))setDetails(true);
    svg.setPointerCapture(e.pointerId);render();e.preventDefault();
});
svg.addEventListener('pointermove',e=>{
    if(routeDraft&&!drag){routeDraft.cursor=routePoint(screenPoint(e),e.shiftKey);routePreview();return;}
    if(!drag)return;
    if(drag.type==='multi'){groupMove(screenPoint(e));return;}if(drag.type==='marquee'){drag.end=screenPoint(e);drag.moved=Math.hypot(drag.end.x-drag.start.x,drag.end.y-drag.start.y)>3*zoomScale();if(drag.moved){const r=Q.rect(drag.start,drag.end),hits=allPickable().filter(v=>v.type==='shape'?Q.overlap(window.MorMapDrawingsModel.bounds(map.shapes.find(s=>s.id===v.id)),r):v.type==='node'?Q.overlap(node(v.id),r):(()=>{const l=map.links.find(l=>l.id===v.id);return Q.pathHits(l.points,r,l.connector,l.format,G);})());setPicked(drag.add?[...drag.beforeSelection,...hits]:hits);}render();return;}
    if(drag.type==='pan'){const s=drag.scale,dx=e.clientX-drag.client.x,dy=e.clientY-drag.client.y;view.x=drag.view.x-dx*s.a-dy*s.c;view.y=drag.view.y-dx*s.b-dy*s.d;render();return;}
    const p=screenPoint(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<2*zoomScale())return;
    lastCablePress=null;if(!drag.moved){history.push(drag.before);if(history.length>50)history.shift();future=[];drag.moved=true;}
    if(drag.type==='node'){const n=node(drag.id);n.x=clamp(G.snap(drag.original.x+dx,snapEnabled,25),-99000,99000);n.y=clamp(G.snap(drag.original.y+dy,snapEnabled,25),-99000,99000);}
    if(drag.type==='resize'){const n=node(drag.id);n.w=clamp(G.snap(drag.original.w+dx,snapEnabled,25),40,4000);n.h=clamp(G.snap(drag.original.h+dy,snapEnabled,25),20,4000);}
    if(drag.type==='anchor'){const a=anchor(drag.id),n=node(a.node_id);Object.assign(a,portPoint(n,p,a.id,e.altKey));if(drag.peerId)Object.assign(anchor(drag.peerId),{x:a.x,y:a.y});}
    if(drag.type==='info'){const l=map.links.find(l=>l.id===drag.id);l.info=G.pinInfo({...drag.original,x:clamp(drag.original.x+dx,-99000,99000),y:clamp(drag.original.y+dy,-99000,99000)},l.points,l.connector,true,l.format);changed();render();return;}
    if(drag.type==='segment'||drag.type==='vertex'){const l=map.links.find(l=>l.id===drag.id),original=drag.before.links.find(l=>l.id===drag.id),snap=G.snapCable(p,original.points,{enabled:snapEnabled,grid:25,tolerance:8*zoomScale(),ignore:drag.type==='segment'?[drag.index,drag.index+1]:[drag.index-1,drag.index,drag.index+1]});snapGuides=snap.guides;const moved=l.connector==='curved'?original.points.map((q,i)=>i===drag.index?{...snap.point}:{...q}):drag.type==='segment'?G.moveSegment(original.points,drag.index,snap.point):G.moveBend(original.points,drag.index,snap.point);if(moved.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return;if(moved.length>100){message('Maximum 100 cable points. Remove a detour first.');return;}l.points=moved;}
    else { // Start from the saved path on every frame; avoid drift while dragging.
        for(const l of map.links){const original=drag.before.links.find(b=>b.id===l.id);l.points=G.attachConnector(original.points,endpoint(l.source),endpoint(l.target),l.connector);}
    }
    changed();render();
});
function endDrag(event){if(drag?.type==='multi'){const d=drag;drag=null;if(event?.type==='pointercancel'){map=d.before;}else if(d.moved){history.push(d.before);if(history.length>50)history.shift();future=[];changed();}render();return;}if(drag?.type==='marquee'){if(event?.type==='pointercancel')setPicked(drag.beforeSelection);drag=null;setDetails(true);render();return;}const wasDragging=!!drag,inspect=drag&&['node','resize','anchor'].includes(drag.type);drag=null;snapGuides=[];if(inspect)setDetails(true);if(wasDragging)render();}
svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
function cableDoubleClick(e){
    if(e.type==='dblclick'&&Date.now()-lastCableDetour<450)return;
    if(mode!=='select'||!map||painter.active()||painter.recent())return;
    // SVG nodes are rebuilt on selection. Resolve double-clicks geometrically so
    // browser retargeting to the SVG root cannot swallow the cable action.
    const click=screenPoint(e);let hit=null,best=12*zoomScale();
    const candidates=selection?.type==='link'?map.links.filter(l=>l.id===selection.id):map.links;
    for(const cable of candidates.filter(l=>!l.connector||l.connector==='right-angle'))for(let j=0;j<cable.points.length-1;j++){
        const a=cable.points[j],b=cable.points[j+1];
        const x=clamp(click.x,Math.min(a.x,b.x),Math.max(a.x,b.x)),y=clamp(click.y,Math.min(a.y,b.y),Math.max(a.y,b.y));
        const distance=Math.hypot(click.x-x,click.y-y);if(distance<best){best=distance;hit={cable,index:j};}
    }
    if(!hit)return;const l=hit.cable,i=hit.index;if(l.points.length>94&&!e.altKey){message('Maximum 100 cable points.');return;}
    const points=e.altKey?G.removeDetour(l.points,i):G.addDetourAt(l.points,i,click);
    if(!points){message('Alt + double-click the middle segment of an added detour. You can also undo or reset the path.');return;}
    checkpoint();l.points=points;selection={type:'link',id:l.id};changed();render();
}
svg.addEventListener('dblclick',cableDoubleClick);
svg.addEventListener('pointerover',e=>{const t=e.target.closest('[data-type]');showPortLabel(!portTooltip&&t?.dataset.type==='anchor'?t.dataset.id:null);});
svg.addEventListener('pointerleave',()=>showPortLabel(null));
svg.addEventListener('wheel',e=>{e.preventDefault();pageFitted=false;const p=screenPoint(e),factor=Math.exp(clamp(e.deltaY,-200,200)*.0015),newW=clamp(view.w*factor,100,30000),ratio=newW/view.w;view.x=p.x-(p.x-view.x)*ratio;view.y=p.y-(p.y-view.y)*ratio;view.w=newW;view.h*=ratio;render();},{passive:false});
svg.addEventListener('contextmenu',e=>{
    if(!map)return;
    if(readOnly||mode!=='select'){
        const host=e.target.closest('[data-type="node"]'),items=host?V.contextItems(node(host.dataset.id)):[];
        if(items.length){e.preventDefault();UI?.contextMenu({x:e.clientX,y:e.clientY,items});}return;
    }
    const target=cableHitTarget(e);e.preventDefault();const point=screenPoint(e),items=[];
    let type=target?.dataset.type,id=target?.dataset.id;
    if(type==='comment')type=target.dataset.owner;
    if(['vertex','segment','link','info'].includes(type)){
        const l=map.links.find(l=>l.id===id);if(!l)return;selection={type:'link',id};
        if((type==='vertex'||type==='segment')&&(!l.connector||l.connector==='right-angle')){
            const index=type==='vertex'?Number(target.dataset.vertex):Math.min(l.points.length-2,Math.max(1,Number(target.dataset.segment)+1));
            items.push({label:'Delete this bend',action:()=>{const points=G.removeBend(l.points,index);if(points){checkpoint();l.points=points;changed();render();}}});
        }
        items.push(...DG.contextItems(null,id));items.unshift(...painter.items(paintTarget(type,id)),{label:'Format Cable',action:()=>formatCable(l)},{label:'Redraw route',action:()=>beginRoute(l)});
        if(!l.connector||l.connector==='right-angle'){const index=G.nearestSegment(l.points,point);items.push({label:'Add bend here',disabled:l.points.length>96,action:()=>{checkpoint();l.points=G.addDetourAt(l.points,index,point);changed();render();}},{label:'Move segment',action:()=>editCablePoint(l,index,true)});}
        if(type==='vertex')items.push({label:l.connector==='curved'?'Edit curve control':'Edit bend position',action:()=>editCablePoint(l,Number(target.dataset.vertex))});
        for(const [value,label] of [['right-angle','Right-Angle Connector'],['straight','Straight Connector'],['curved','Curved Connector']])items.push({label,checked:(l.connector||'right-angle')===value,action:()=>{checkpoint();l.connector=value;l.points=G.connectorRoute(endpoint(l.source),endpoint(l.target),value);changed();render();}});
        if(l.info)items.push({label:'Info size',action:()=>infoSize(l)});
        items.push({label:'Reset cable path',action:()=>{checkpoint();l.points=G.connectorRoute(endpoint(l.source),endpoint(l.target),l.connector);changed();render();}},
            {label:'Change color',action:()=>cableColor(l)},
            {label:l.info?'Unfix info':'Fix info here',action:()=>{checkpoint();if(l.info)delete l.info;else l.info=G.pinInfo({x:clamp(point.x,-99000,99000),y:clamp(point.y,-99000,99000)},l.points,l.connector,false,l.format);changed();render();}},
            {label:'Cable details',action:()=>editCableDetails(l)},
            {label:l.comment?'Edit comment':'Add comment',action:()=>editComment(l,point)},
            {label:'Delete cable',action:()=>{selection={type:'link',id};removeSelection();}});
    }else if(type==='node'||type==='anchor'){
        const object=type==='node'?node(id):anchor(id);if(!object)return;selection={type,id};
        if(type==='node')items.push(...V.contextItems(object),...DG.contextItems(id));
        items.push({label:object.comment?'Edit comment':'Add comment',action:()=>editComment(object,point)});
        if(type==='node')items.push(...painter.items(paintTarget(type,id)),{label:'Format device',action:()=>formatObject(object)},{label:'Align points',action:()=>alignNodePorts(object)},{label:'Export image + connection points',action:()=>exportDevice(object).catch(fail)});
        items.push({label:'Delete '+(type==='node'?'device':'connection point'),action:()=>{selection={type,id};removeSelection();}});
    }else if(type==='inventory-port'){
        selection={type,id,nodeId:target.dataset.nodeId};setDetails(true);render();return;
    }else{items.push(...DG.actions());items.push({label:map.comment?'Edit map comment':'Add map comment',action:()=>editComment(map)},{label:'Print / Export',action:()=>window.MorMapOutput?.open('logical')});}
    items.push({label:'Cancel',action:()=>{}});render();UI?.contextMenu({x:e.clientX,y:e.clientY,items});
});

function removeSelection(){
    if(!selection||mode==='view')return;if(removePicked())return;
    if(selection.type==='inventory-port'){message('This port comes from LibreNMS inventory and cannot be deleted here.',false,true);return;}
    checkpoint();const {type,id}=selection;
    if(type==='shape')map.shapes=map.shapes.filter(s=>s.id!==id);
    if(type==='node'){const ids=new Set(map.anchors.filter(a=>a.node_id===id).map(a=>a.id));map.links=map.links.filter(l=>!ids.has(l.source)&&!ids.has(l.target));map.anchors=map.anchors.filter(a=>a.node_id!==id);map.nodes=map.nodes.filter(n=>n.id!==id);}
    if(type==='anchor'){const a=anchor(id),n=node(a.node_id),points=[a,coincidentPeer(a)].filter(Boolean),ids=new Set(points.map(p=>p.id));n.hidden_ports=[...new Set([...(n.hidden_ports||[]),...points.map(I.portRef)])];map.links=map.links.filter(l=>!ids.has(l.source)&&!ids.has(l.target));map.anchors=map.anchors.filter(a=>!ids.has(a.id));}
    if(type==='link'){const l=map.links.find(l=>l.id===id);if(l?.connection_id)(map.disconnect??=[]).push(l.connection_id);map.links=map.links.filter(l=>l.id!==id);}
    selection=null;pending=null;routeDraft=null;changed();render();
}

async function documentChange(remove=false){
 if(readOnly||!map||saving)return;
 if(remove){
  // Keep the current edit as an undoable saved state before removing the document.
  if(dirty){await save();if(dirty)return;}
  const id=map.id;saving=true;state();try{const result=await api('/maps/'+id,{method:'DELETE',body:{revision:map.revision,infrastructure_revision:map.infrastructure_revision}});
   clearDocument();recordServerUndo(result.undo_token);await listMaps();if(window.MorMapRefreshNavigation)await window.MorMapRefreshNavigation().catch(()=>{});message('Map deleted. Undo restores it and its published copy.',true);
  }catch(e){fail(e);}finally{saving=false;state();}return;
 }
 if(dirty){message('Save the map before renaming it.');return;}const id=map.id;let input;
 dialog('Rename map',el=>{input=field(el,'Map name',html('input',null,{value:map.name,required:true,maxLength:120}));},async()=>{
  if(map?.id!==id)throw Error('Return to the original map.');saving=true;state();try{loadMap(await api('/maps/'+id+'/name',{method:'PATCH',body:{revision:map.revision,infrastructure_revision:map.infrastructure_revision,name:input.value.trim()}}));await listMaps();if(window.MorMapRefreshNavigation)await window.MorMapRefreshNavigation().catch(()=>{});message('Map renamed.',true);}finally{saving=false;state();}
 });
}
async function unpublish(){if(readOnly||!map||!publishedRevision||dirty||saving||mode==='view')return;saving=true;state();try{const result=await api('/maps/'+map.id+'/publish',{method:'DELETE',body:{published_revision:publishedRevision}});publishedRevision=null;recordServerUndo(result.undo_token);if(window.MorMapRefreshNavigation)await window.MorMapRefreshNavigation().catch(()=>{});message('Unpublished. The editable map and connections are preserved. Undo restores the publication.',true);}catch(e){fail(e);}finally{saving=false;state();}}
async function publish(){
    if(readOnly||!map||saving)return;
    if(dirty){message('Save the map before publishing it to Maps.');return;}
    saving=true;state();
    try{
        const result=await api('/maps/'+map.id+'/publish',{method:'POST',body:{revision:map.revision}});publishedRevision=result.published_revision??null;
        let menuFound=false;
        if(window.MorMapRefreshNavigation){try{menuFound=await window.MorMapRefreshNavigation();}catch(e){menuFound=false;}}
        message(menuFound?'Published. Open this map from the LibreNMS Maps menu.':'Published. The Maps menu could not be updated on this page; use the link below.',true);
        const link=html('a',' Open published map',{href:result.url,target:'_blank',rel:'noopener'});$('mm-message').append(link);
    }catch(e){fail(e);}finally{saving=false;state();}
}
if(window.MorMapOutput){window.MorMapOutput.register('logical',exportSource);$('mm-output').onclick=()=>window.MorMapOutput.open('logical');}
$('mm-page').onclick=fitPage;$('mm-fit').onclick=fit;

$('mm-help-button').onclick=()=>UI?UI.openDialog($('mm-help')):$('mm-help').showModal();$('mm-help-close').onclick=()=>$('mm-help').close();
$('mm-refresh').onclick=refreshStatus;
if(!readOnly){
    $('mm-grid').onclick=()=>{gridEnabled=!gridEnabled;$('mm-grid').setAttribute('aria-pressed',String(gridEnabled));render();};$('mm-snap').onclick=()=>{snapEnabled=!snapEnabled;$('mm-snap').setAttribute('aria-pressed',String(snapEnabled));};
    if($('mm-rename'))$('mm-rename').onclick=()=>documentChange();if($('mm-delete-map'))$('mm-delete-map').onclick=()=>documentChange(true);
    $('mm-size').onclick=pageSizeDialog;$('mm-publish').onclick=publish;$('mm-unpublish').onclick=unpublish;
    $('mm-cancel').onclick=()=>$('mm-dialog').close();
    $('mm-new').onclick=()=>{if(dirty&&!confirm('Discard unsaved changes?'))return;textDialog('New map','My network',async name=>{loadMap(await api('/maps',{method:'POST',body:{name}}));await listMaps();});};
    $('mm-maps').onchange=()=>openMap($('mm-maps').value).catch(fail);
    $('mm-save').onclick=save;$('mm-add').onclick=()=>addDevice().catch(fail);
    $('mm-reload').onclick=()=>{if(map)openMap(map.id).catch(fail);};
    $('mm-undo').onclick=()=>applyHistory(history,future);$('mm-redo').onclick=()=>applyHistory(future,history);
    $('mm-delete').onclick=removeSelection;$('mm-view').onclick=()=>setMode(mode==='view'?'select':'view');
    root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('keydown',e=>{if(e.defaultPrevented)return;
    if(readOnly||document.getElementById('mo-dialog')?.open)return;
    if(e.key==='Escape'){if(mode==='pan')setMode('select');if(drag?.type==='multi'||drag?.type==='marquee')endDrag({type:'pointercancel'});setPicked([]);pending=null;routeDraft=null;placePort=null;message();render();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save();}
    if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||($('mm-dialog').open&&!$('mm-dialog').classList.contains('mm-window-minimized'))||($('mm-help').open&&!$('mm-help').classList.contains('mm-window-minimized')))return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'&&mode==='select'){e.preventDefault();setPicked(allPickable());setDetails(true);render();return;}
    if(routeDraft&&['Backspace','Enter'].includes(e.key)){e.preventDefault();if(e.key==='Enter'){if(routeDraft.id)finishRoute();else message('Choose a destination port to finish the cable.',false,true);}else if(routeDraft.steps.length>1){routeDraft.steps.pop();render();}return;}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?applyHistory(future,history):applyHistory(history,future);}
    if(e.key==='Delete'&&root.contains(document.activeElement))removeSelection();
    if(!e.ctrlKey&&!e.metaKey&&!e.altKey&&['v','x','c'].includes(e.key.toLowerCase())){e.preventDefault();setMode({v:'select',x:'anchor',c:'cable'}[e.key.toLowerCase()]);}
});
new ResizeObserver(()=>{if(embedded&&map){fit();return;}if(pageFitted){view=D.pageView(map?.canvas,svg.clientWidth||1920,svg.clientHeight||1080);}else{view.h=view.w*(svg.clientHeight||1080)/(svg.clientWidth||1920);}render();}).observe(svg);
UI?.makeDraggable($('mm-help'),$('mm-help-title'));
if(!readOnly)UI?.makeDraggable($('mm-dialog'),$('mm-dialog-title'));
setInterval(()=>{if(!document.hidden)refreshStatus();},30000);
if(readOnly)api('/data').then(loadMap).catch(fail);else listMaps().then(async maps=>{const id=new URLSearchParams(location.search).get('map')||workspaceMemory.get().map;if(id&&maps.some(m=>m.id===id))await openMap(id);else{workspaceMemory.set({});state();fitPage();}}).catch(e=>{state();fail(e);});
})();
