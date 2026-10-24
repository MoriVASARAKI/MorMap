/* Manual VM/CT membership. Map groups never enter the network connection graph. */
(function () {
'use strict';
const NS='http://www.w3.org/2000/svg',copy=v=>JSON.parse(JSON.stringify(v)),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const html=(tag,text,attrs={})=>{const e=document.createElement(tag);if(text!==null)e.textContent=text;for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const shape=(tag,attrs={},text=null)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==null)e.textContent=text;return e;};
window.MorMapVirtualization=function (a) {
 const {root,svg,readOnly}=a,base=root.dataset.shared.replace(/\/$/,''),panel=html('aside',null,{class:'mv-panel',hidden:'',role:'region','aria-label':'Virtual machines'});
 root.append(panel);
 let data={revision:0,assignments:[],devices:[]},mapId=null,key='',loadTicket=0,activeHost=null,tab='all',filter='',busy=false,error='',drag=null,manage=false,searchTicket=0;
 const transient=new Map();let lastFocus=null;
 const record=id=>data.devices.find(d=>d.device_id===Number(id));
 const name=id=>record(id)?.name||a.hosts().find(d=>Number(d.device_id)===Number(id))?.label||'Device #'+id;
 const guests=id=>data.assignments.filter(g=>g.host_id===Number(id));
 const hypervisor=id=>record(id)?.can_host!==false&&(!!record(id)?.is_hypervisor||guests(id).length>0),viewOnly=()=>readOnly||a.preview?.()===true;
 const needsReview=id=>record(id)?.can_host===false||guests(id).some(g=>record(g.device_id)?.can_guest===false);
 const visibleHost=id=>hypervisor(id)||guests(id).length>0;
 const status=id=>record(id)?window.MorMapDisplay.device(record(id)):{key:'unknown',label:'Unavailable',color:'#788a99'};
 function guestName(d,label) {
  const line=html('span',null,{class:'mv-guest-name'});
  if(d?.os_icon){const icon=html('img',null,{src:d.os_icon,alt:'',width:16,height:16,class:'mv-os-icon',title:d.os||'OS unknown'});icon.onerror=()=>icon.hidden=true;line.append(icon);}
  line.append(html('strong',label));return line;
 }
 function contextItems(item) {
  const id=Number(item?.device_id);
  if(!id||!visibleHost(id))return [];return [...(hypervisor(id)?[{label:'Show VMs',group:'Virtual machines',action:()=>toggle(id)}]:[]),{label:'Virtual machines & containers…',group:'Virtual machines',action:()=>open(id)}];
 }
 function button(parent,text,fn,attrs={}) {const b=html('button',text,{type:'button',...attrs});b.onclick=fn;parent.append(b);return b;}
 async function api(path='',method='GET',body) {
  if(readOnly&&method!=='GET')throw Error('Published maps are read-only.');
  const r=await fetch(base+'/virtualization'+path,{method,credentials:'same-origin',headers:{'Accept':'application/json','Content-Type':'application/json','X-CSRF-TOKEN':root.dataset.csrf},body:body===undefined?undefined:JSON.stringify(body)});
  const value=await r.json().catch(()=>({message:'Cannot load virtual guests. Refresh the page and check your session.'}));
  if(!r.ok)throw Error(value.message||'Request failed ('+r.status+').');return value;
 }
 function syncMap() {
  const id=a.map()?.id||null;
  if(id!==mapId){mapId=id;key='';loadTicket++;data={revision:0,assignments:[],devices:[]};activeHost=null;panel.hidden=true;manage=false;transient.clear();cancelDrag();}
 }
 async function refresh() {
  syncMap();if(!mapId)return;
  const ids=[...new Set(a.hosts().map(h=>Number(h.device_id)).filter(Boolean))].sort((x,y)=>x-y),id=mapId,ticket=++loadTicket;
  key=id+':'+ids.join(',');
  try {
   const q=new URLSearchParams();ids.forEach(n=>q.append('hosts[]',n));const result=await api('?'+q);
   if(ticket!==loadTicket||a.map()?.id!==id)return;
   data=result;error='';if(!drag)a.render();if(activeHost&&!manage&&!panel.contains(document.activeElement))renderPanel();
  }catch(e){if(ticket!==loadTicket)return;error=e.message;data.devices=data.devices.map(d=>({...d,status:null,last_polled:null}));if(!drag)a.render();if(activeHost&&!manage)renderPanel();}
 }
 function layout(host) {
  const context=a.context(),k=context+':'+host;
  const stored=viewOnly()?transient.get(k):null;
  if(stored)return copy(stored);
  const saved=a.map()?.vm_groups?.find(g=>g.host_id===Number(host)&&g.context===context);
  if(saved)return copy(saved);
  const item=a.visible().find(n=>Number(n.device_id)===Number(host)),b=item?.box||{x:80,y:80,w:200,h:80};
  return {host_id:Number(host),context,x:clamp(b.x+b.w+100,-99000,99000),y:clamp(b.y,-99000,99000),w:350,h:310,expanded:false,guests:guests(host).map(g=>g.device_id)};
 }
 function put(value) {
  if(viewOnly()){transient.set(value.context+':'+value.host_id,copy(value));a.render();}
  else if(a.enabled())a.mutate(map=>{map.vm_groups??=[];const i=map.vm_groups.findIndex(g=>g.host_id===value.host_id&&g.context===value.context);if(i<0)map.vm_groups.push(copy(value));else map.vm_groups[i]=copy(value);});
 }
 function changeLayout(host,fn){if(!a.map())return;const g=layout(host);fn(g);put(g);if(activeHost===host)renderPanel();}
 function toggle(host){changeLayout(host,g=>{g.expanded=!g.expanded;if(g.expanded&&!g.guests.length)g.guests=guests(host).map(r=>r.device_id);});}
 function open(host){syncMap();activeHost=Number(host);tab='all';filter='';manage=false;lastFocus=document.activeElement;panel.hidden=false;renderPanel();panel.querySelector('[data-mv-close]')?.focus();}
 function close(){activeHost=null;manage=false;searchTicket++;panel.hidden=true;lastFocus?.isConnected&&lastFocus.focus?.();}
 async function change(changes,revision=data.revision) {
  if(busy||readOnly||!a.enabled())return false;
  busy=true;const id=a.map()?.id;setBusy();
  try {
   await a.beforeChange();if(a.map()?.id!==id)throw Error('The active map changed. Reopen the virtual machines panel.');
   const result=await api('','PUT',{revision,workspace:a.workspace,map_id:id,changes});
   a.recordUndo(result.undo_token);await refresh();manage=false;renderPanel();a.notice('Virtual guest assignments saved. Undo is available.');return true;
  }catch(e){error=e.message;const warning=panel.querySelector('[data-mv-error]');if(warning){warning.textContent=error;warning.hidden=false;}a.notice(error);return false;}
  finally{busy=false;setBusy();}
 }
 function setBusy(){panel.querySelectorAll('button,input,select').forEach(e=>{if(!e.hasAttribute('data-mv-close'))e.disabled=busy||e.hasAttribute('data-mv-ineligible');});}
 function header() {
  panel.replaceChildren();const head=html('div',null,{class:'mv-heading'}),titles=html('div');titles.append(html('h3',name(activeHost)),html('p','Virtual machines & containers'));head.append(titles);button(head,'×',close,{'aria-label':'Close virtual machines',title:'Close',class:'mv-close','data-mv-close':''});panel.append(head);
  const hint=html('p','Manual membership · Status from LibreNMS; not guest power state.',{class:'mv-hint'});panel.append(hint);
  const host=record(activeHost);if(host?.can_host===false)panel.append(html('p',host.virtualization_reason+' Existing assignments need review. Use Unlink here, or reassign the guests from their correct hypervisor.',{class:'mv-warning',role:'alert'}));
  const warning=html('p',error,{class:'mv-error',role:'alert','data-mv-error':''});warning.hidden=!error;panel.append(warning);
 }
 function renderPanel() {
  if(!activeHost||panel.hidden||manage)return;
  header();const rows=guests(activeHost),vm=rows.filter(g=>g.kind==='vm').length,ct=rows.length-vm,tools=html('div',null,{class:'mv-tools'});
  for(const [id,label]of [['all','All ('+rows.length+')'],['vm','VMs ('+vm+')'],['ct','CTs ('+ct+')']])button(tools,label,()=>{tab=id;renderPanel();},{'aria-pressed':String(tab===id)});
  button(tools,'Refresh',()=>refresh().then(()=>renderPanel()));panel.append(tools);
  const search=html('input',null,{type:'search',placeholder:'Search name, VMID, OS or IP','aria-label':'Search virtual guests'});search.value=filter;panel.append(search);
  const body=html('div',null,{class:'mv-list'});panel.append(body);search.oninput=()=>{filter=search.value;list(body);};list(body);
  if(!rows.length)body.append(html('p','No virtual guests assigned. Select existing LibreNMS devices to associate with this hypervisor.'));
  const bottom=html('div',null,{class:'mv-tools'}),g=layout(activeHost);
  if(rows.length){button(bottom,g.expanded?'Collapse on map':'Show selected on map',()=>changeLayout(activeHost,v=>{v.expanded=!v.expanded;if(v.expanded&&!v.guests.length)v.guests=rows.map(r=>r.device_id);}));button(bottom,'Select all on map',()=>changeLayout(activeHost,v=>{v.guests=rows.map(r=>r.device_id);v.expanded=true;}));}
  if(!readOnly&&record(activeHost)?.can_host!==false)button(bottom,'Assign LibreNMS devices',()=>assignmentPicker(),{'data-mv-assign':'',class:'mv-primary'});
  panel.append(bottom,html('small','Dotted lines show host membership. Drag the group header to position it independently; use the corner to resize. Save the map to keep the layout.'));
  setBusy();
 }
 function list(body) {
  body.replaceChildren();const revision=data.revision,current=layout(activeHost),q=filter.trim().toLowerCase(),rows=guests(activeHost).filter(g=>{
   const d=record(g.device_id);return(tab==='all'||g.kind===tab)&&[name(g.device_id),g.vmid,d?.os,d?.resolved_ip].join(' ').toLowerCase().includes(q);
  });
  if(!rows.length)return;
  const table=html('table'),thead=html('thead'),tr=html('tr');for(const text of ['Map','Name / OS','VMID','IP address','LibreNMS status'])tr.append(html('th',text,{scope:'col'}));if(!readOnly)tr.append(html('th','Assignment',{scope:'col'}));thead.append(tr);table.append(thead);const tbody=html('tbody');table.append(tbody);body.append(table);
  for(const g of rows){
   const d=record(g.device_id),s=status(g.device_id),tr=html('tr',null,{'data-mv-guest':g.device_id}),checkCell=html('td'),check=html('input',null,{type:'checkbox','aria-label':'Show '+name(g.device_id)+' on map'});check.checked=current.guests.includes(g.device_id);check.onchange=()=>changeLayout(activeHost,v=>{v.guests=check.checked?[...new Set([...v.guests,g.device_id])]:v.guests.filter(id=>id!==g.device_id);});checkCell.append(check);
   const identity=html('td');identity.append(guestName(d,name(g.device_id)),html('small',(g.kind==='vm'?'VM':'CT')+' · '+(d?.os||'OS unknown')));
   if(d?.can_guest===false)identity.append(html('small',d.virtualization_reason+' Review this assignment.',{class:'mv-warning',role:'alert'}));
   const state=html('td',s.label);state.style.color=s.color;tr.append(checkCell,identity,html('td',g.vmid||'—'),html('td',d?.resolved_ip||'Unavailable'),state);
   if(!readOnly){const actions=html('td');if(record(activeHost)?.can_host!==false&&d?.can_guest!==false)button(actions,'Edit',()=>editGuest(g));button(actions,'Unlink',()=>change([{...g,host_id:null}],revision),{title:'Remove membership; keep the LibreNMS device and its cables'});tr.append(actions);}tbody.append(tr);
  }
 }
 function editGuest(g) {
  const revision=data.revision;manage=true;header();panel.append(html('h4',name(g.device_id)));const type=html('select',null,{'aria-label':'Guest type'});type.append(html('option','Virtual machine',{value:'vm'}),html('option','Container',{value:'ct'}));type.value=g.kind;
  const vmid=html('input',null,{placeholder:'VMID (optional)',maxlength:80,'aria-label':'VMID'});vmid.value=g.vmid;panel.append(type,vmid);
  button(panel,'Apply assignment',()=>change([{...g,kind:type.value,vmid:vmid.value}],revision));button(panel,'Back',()=>{manage=false;renderPanel();});
 }
 function assignmentPicker() {
  manage=true;header();let revision=data.revision;const host=activeHost,selected=new Map(),search=html('input',null,{type:'search',placeholder:'Search LibreNMS name, hostname, IP or ID','aria-label':'Search LibreNMS devices'}),results=html('div',null,{class:'mv-list'}),nav=html('div',null,{class:'mv-tools'}),actions=html('div',null,{class:'mv-tools'});
  panel.append(search,results,nav,actions);const submit=button(actions,'Assign selected to '+name(host),()=>{if(!selected.size)return;change([...selected.values()].map(g=>({...g,host_id:host})),revision);},{class:'mv-primary','data-mv-submit':''});
  button(actions,'Refresh assignments',async()=>{await refresh();revision=data.revision;find();});button(actions,'Back',()=>{manage=false;searchTicket++;renderPanel();});let page=1,timer;
  async function find(){
   const ticket=++searchTicket;results.textContent='Loading LibreNMS devices…';nav.replaceChildren();
   try{const result=await api('/devices?'+new URLSearchParams({q:search.value,page}));if(ticket!==searchTicket||!manage||activeHost!==host)return;results.replaceChildren();
    for(const d of result.devices.filter(d=>d.device_id!==host)){
     const line=html('div',null,{class:'mv-choice','data-mv-choice':d.device_id}),label=html('label'),check=html('input',null,{type:'checkbox','aria-label':'Assign '+d.name}),details=html('span');check.checked=selected.has(d.device_id);details.append(html('strong',d.name),html('small',(d.os||'OS unknown')+' · '+d.resolved_ip));label.append(check,details);line.append(label);
     const existing=d.assignment,kind=html('select',null,{'aria-label':'Guest type for '+d.name}),vmid=html('input',null,{placeholder:'VMID (optional)',maxlength:80,'aria-label':'VMID for '+d.name});kind.append(html('option','VM',{value:'vm'}),html('option','CT',{value:'ct'}));kind.value=selected.get(d.device_id)?.kind||existing?.kind||'vm';vmid.value=selected.get(d.device_id)?.vmid??existing?.vmid??'';
     if(d.can_guest===false){selected.delete(d.device_id);check.checked=false;for(const input of [check,kind,vmid]){input.disabled=true;input.setAttribute('data-mv-ineligible','');input.title=d.virtualization_reason;}line.append(html('small',d.virtualization_reason,{class:'mv-warning'}));}
     const update=()=>{if(check.checked)selected.set(d.device_id,{device_id:d.device_id,kind:kind.value,vmid:vmid.value});else selected.delete(d.device_id);submit.textContent='Assign '+selected.size+' selected to '+name(host);};check.onchange=kind.onchange=vmid.oninput=update;line.append(kind,vmid);
     if(existing){const old=result.hosts.find(h=>h.device_id===existing.host_id);line.append(html('small',existing.host_id===host?'Already assigned to this host':'Will move from '+(old?.name||'Device #'+existing.host_id),{class:existing.host_id===host?'':'mv-warning'}));}results.append(line);
    }
    submit.textContent='Assign '+selected.size+' selected to '+name(host);
    if(!results.children.length)results.textContent='No matching devices.';
    if(page>1)button(nav,'Previous',()=>{page--;find();});if(result.has_more)button(nav,'Next',()=>{page++;find();});nav.append(html('span','Page '+page));
   }catch(e){if(ticket===searchTicket)results.textContent=e.message;}
  }
  search.oninput=()=>{clearTimeout(timer);page=1;timer=setTimeout(find,250);};search.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);find();}};find();search.focus();
 }
 function inspect(parent,item) {
  if(!item?.device_id||readOnly&&!guests(item.device_id).length)return;
  const host=record(item.device_id);if(host?.can_host!==false||guests(item.device_id).length)button(parent,host?.can_host===false?'Review VM assignments':'Virtual machines / containers',()=>open(item.device_id),{'data-mv-open':item.device_id});
  const assignment=data.assignments.find(g=>g.device_id===Number(item.device_id));if(assignment)parent.append(html('p',(assignment.kind==='vm'?'VM':'CT')+' hosted by '+name(assignment.host_id),{class:'mv-hint'}));
 }
 function badge(parent,host,box) {
  const rows=guests(host),vm=rows.filter(g=>g.kind==='vm').length,ct=rows.length-vm,review=needsReview(host),text=review?'Review VM assignments ('+rows.length+')':vm+' VM'+(vm===1?'':'s')+' · '+ct+' CT'+(ct===1?'':'s'),width=Math.max(112,text.length*7+20),g=shape('g',{'data-mv-ui':'','data-mv-host':host,'data-mv-action':'toggle',role:'button',tabindex:0,'aria-expanded':String(layout(host).expanded),'aria-label':name(host)+' · '+text,style:'cursor:pointer'});
  g.append(shape('rect',{x:box.x,y:box.y+box.h+10,width,height:24,rx:6,fill:review?'#fff4d6':'#e9f4fa',stroke:review?'#c58b22':'#82aabb','stroke-width':1}),shape('text',{x:box.x+10,y:box.y+box.h+26,'font-size':12,fill:review?'#805b12':'#275568'},text));parent.append(g);
 }
 function drawGroup(parent,host,box,g) {
  const rows=guests(host).filter(r=>g.guests.includes(r.device_id)),limit=Math.max(1,Math.floor((g.h-85)/50)),shown=rows.slice(0,limit),links=shape('g',{'pointer-events':'none','data-vm-dependencies':host});
  for(let i=0;i<shown.length;i++){
   const left=g.x>=box.x+box.w/2,start={x:left?box.x+box.w:box.x,y:box.y+box.h/2},end={x:left?g.x:g.x+g.w,y:g.y+64+i*50};links.append(shape('path',{d:`M${start.x} ${start.y} C${(start.x+end.x)/2} ${start.y} ${(start.x+end.x)/2} ${end.y} ${end.x} ${end.y}`,fill:'none',stroke:'#6b879b','stroke-width':1.5,'stroke-dasharray':'4 5'}));
  }parent.append(links);
  const group=shape('g',{'data-mv-ui':'','data-mv-group':host,transform:`translate(${g.x} ${g.y})`});group.append(shape('rect',{width:g.w,height:g.h,rx:10,fill:'#f8fbfe',stroke:'#a8bfcc','stroke-width':1.2}));
  const review=needsReview(host),header=shape('g',{'data-mv-drag':host,style:'cursor:'+(readOnly?'default':'move')});header.append(shape('rect',{width:g.w,height:42,rx:10,fill:review?'#fff4d6':'#e6eff6'}),shape('text',{x:14,y:26,'font-size':14,'font-weight':600,fill:review?'#805b12':'#284c62'},short(name(host)+(review?' · Review assignments':' · Guests'),Math.floor((g.w-65)/8))));header.append(shape('title',{},review?'Review VM assignments: the LibreNMS device type is incompatible. Open the guest list for details.':'Drag to move the guest group independently of the hypervisor'));group.append(header);
  const collapse=shape('g',{'data-mv-host':host,'data-mv-action':'collapse',role:'button',tabindex:0,'aria-label':'Collapse virtual guest group','data-output':'omit',style:'cursor:pointer'});collapse.append(shape('rect',{x:g.w-36,y:8,width:27,height:27,rx:4,fill:'#fff'}),shape('text',{x:g.w-23,y:27,'text-anchor':'middle','font-size':18,fill:'#33596c'},'−'));group.append(collapse);
  shown.forEach((r,i)=>{const d=record(r.device_id),s=status(r.device_id),card=shape('g',{'data-mv-host':host,'data-mv-action':'open',style:'cursor:pointer'}),y=50+i*50;card.append(shape('rect',{x:12,y,width:g.w-24,height:43,rx:6,fill:'#fff',stroke:'#d5e0e8','stroke-width':1}),shape('circle',{cx:27,cy:y+16,r:4,fill:s.color}),...(d?.os_icon?[shape('image',{href:d.os_icon,x:40,y:y+6,width:16,height:16,preserveAspectRatio:'xMidYMid meet','aria-hidden':'true','data-mv-os-icon':r.device_id})]:[]),shape('text',{x:d?.os_icon?62:40,y:y+19,'font-size':12,'font-weight':600,fill:'#294d63'},short(name(r.device_id),Math.floor((g.w-(d?.os_icon?112:90))/7))),shape('text',{x:40,y:y+34,'font-size':10,fill:'#5e7584'},short((r.kind==='vm'?'VM':'CT')+(r.vmid?' '+r.vmid:'')+' · '+(d?.os||'OS unknown')+' · '+(d?.resolved_ip||'Unavailable'),Math.floor((g.w-60)/6))));card.append(shape('title',{},name(r.device_id)+' · LibreNMS: '+s.label));group.append(card);});
  const more=rows.length-shown.length,footer=shape('g',{'data-mv-host':host,'data-mv-action':'open',style:'cursor:pointer'});footer.append(shape('text',{x:14,y:g.h-13,'font-size':11,fill:'#3f7189'},more?'+'+more+' more · Open list':rows.length?'Open guest list':guests(host).length?'Select guests in the side panel':'No virtual guests assigned'));group.append(footer);
  if(!readOnly)group.append(shape('path',{d:`M${g.w-18} ${g.h-5} L${g.w-5} ${g.h-18} M${g.w-11} ${g.h-5} L${g.w-5} ${g.h-11}`,fill:'none',stroke:'#5b859c','stroke-width':3,'data-mv-resize':host,'data-output':'omit',style:'cursor:nwse-resize'}));parent.append(group);
 }
 function short(text,n){return text.length>n?text.slice(0,n-1)+'…':text;}
 function render() {
  syncMap();if(!a.map())return;
  const ids=[...new Set(a.hosts().map(h=>Number(h.device_id)).filter(Boolean))].sort((x,y)=>x-y),next=mapId+':'+ids.join(',');
  if(next!==key){key=next;queueMicrotask(refresh);}
  const layer=shape('g',{'data-layer':'virtual-guests'}),seen=new Set();svg.append(layer);
  for(const item of a.visible()){
   const host=Number(item.device_id);if(!host||seen.has(host)||!visibleHost(host))continue;seen.add(host);const g=drag?.host===host?drag.value:layout(host);
   if(g.expanded)drawGroup(layer,host,item.box,g);if(guests(host).length)badge(layer,host,item.box);
  }
 }
 function redraw(){svg.querySelector('[data-layer="virtual-guests"]')?.remove();render();}
 function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());}
 function cancelDrag(){if(!drag)return;const id=drag.pointer;drag=null;if(svg.hasPointerCapture(id))svg.releasePointerCapture(id);}
 root.addEventListener('pointerdown',e=>{
  if(!e.target.closest('[data-mv-ui]'))return;e.stopImmediatePropagation();
  const handle=e.target.closest('[data-mv-drag],[data-mv-resize]');if(!handle||e.button!==0||readOnly||!a.enabled())return;
  e.preventDefault();const host=Number(handle.dataset.mvDrag||handle.dataset.mvResize);drag={host,pointer:e.pointerId,start:point(e),before:layout(host),value:layout(host),resize:!!handle.dataset.mvResize,moved:false};svg.setPointerCapture(e.pointerId);
 },true);
 root.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.pointer)return;e.preventDefault();e.stopImmediatePropagation();const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;drag.moved=drag.moved||Math.hypot(dx,dy)>2;if(drag.resize){drag.value.w=clamp(drag.before.w+dx,280,800);drag.value.h=clamp(drag.before.h+dy,148,1400);}else{drag.value.x=clamp(drag.before.x+dx,-99000,99000);drag.value.y=clamp(drag.before.y+dy,-99000,99000);}redraw();},true);
 svg.addEventListener('lostpointercapture',e=>{if(drag?.pointer===e.pointerId){cancelDrag();redraw();}});
 const end=e=>{if(!drag||e.pointerId!==drag.pointer)return;e.stopImmediatePropagation();const current=drag;cancelDrag();if(e.type==='pointerup'&&current.moved)put(current.value);else redraw();};root.addEventListener('pointerup',end,true);root.addEventListener('pointercancel',end,true);
 root.addEventListener('click',e=>{const target=e.target.closest('[data-mv-ui]');if(!target)return;e.stopImmediatePropagation();const action=e.target.closest('[data-mv-action]');if(!action)return;const host=Number(action.dataset.mvHost);if(action.dataset.mvAction==='open')open(host);else if(action.dataset.mvAction==='toggle')toggle(host);else changeLayout(host,g=>g.expanded=false);},true);
 root.addEventListener('contextmenu',e=>{const target=e.target.closest('[data-mv-ui] [data-mv-host],[data-mv-ui][data-mv-host]');if(!target)return;e.preventDefault();e.stopImmediatePropagation();window.MorMapUI.contextMenu({x:e.clientX,y:e.clientY,items:contextItems({device_id:Number(target.dataset.mvHost)})});},true);
 root.addEventListener('dblclick',e=>{if(e.target.closest('[data-mv-ui]'))e.stopImmediatePropagation();},true);
 root.addEventListener('keydown',e=>{
  if(panel.contains(e.target)){if(e.key==='Escape'){e.preventDefault();close();}if(!((e.ctrlKey||e.metaKey)&&['s','z','y'].includes(e.key.toLowerCase())))e.stopPropagation();return;}
  const target=e.target.closest('[data-mv-action]');if(target&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
  if(e.key==='Escape'&&drag){e.preventDefault();e.stopPropagation();cancelDrag();redraw();}
 },true);
 function bounds(){const points=[];for(const item of a.visible()){const g=layout(Number(item.device_id));if(g.expanded&&visibleHost(item.device_id))points.push({x:g.x,y:g.y},{x:g.x+g.w,y:g.y+g.h});}return points;}
 function fitBounds(area){const points=bounds();if(!points.length)return area;const x=Math.min(area.x,...points.map(p=>p.x-30)),y=Math.min(area.y,...points.map(p=>p.y-30)),right=Math.max(area.x+area.w,...points.map(p=>p.x+30)),bottom=Math.max(area.y+area.h,...points.map(p=>p.y+30));return {x,y,w:right-x,h:bottom-y};}
 return {render,inspect,refresh,open,contextItems,bounds,fitBounds,count:hosts=>new Set(hosts.flatMap(h=>guests(h.device_id).map(g=>g.device_id))).size,dragging:()=>!!drag};
};
})();
