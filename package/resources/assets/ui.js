/* Shared, movable dialogs and local context menus. No dependencies or HTML injection. */
(function(root){
'use strict';
const positions=new WeakMap(),initialized=new WeakSet();let menu=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(Math.max(a,b),v));
function position(dialog,x,y){
 const r=dialog.getBoundingClientRect(),p={x:clamp(x,8,root.innerWidth-r.width-8),y:clamp(y,8,root.innerHeight-r.height-8)};
 Object.assign(dialog.style,{position:'fixed',margin:'0',right:'auto',bottom:'auto',left:p.x+'px',top:p.y+'px',transform:'none'});positions.set(dialog,p);
}
function makeDraggable(dialog,handle){
 if(!dialog||!handle||initialized.has(dialog))return;initialized.add(dialog);
 handle.classList.add('mm-dialog-handle');handle.tabIndex=0;handle.setAttribute('title','Drag to move. Arrow keys also move this window.');
 let drag=null;
 handle.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('button,input,select,a'))return;const r=dialog.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};handle.setPointerCapture(e.pointerId);e.preventDefault();});
 handle.addEventListener('pointermove',e=>{if(drag)position(dialog,drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
 const end=()=>{drag=null;};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
 handle.addEventListener('keydown',e=>{if(e.target!==handle)return;const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();const r=dialog.getBoundingClientRect(),step=e.shiftKey?30:10;position(dialog,r.left+d[0]*step,r.top+d[1]*step);});
 const keepVisible=()=>{if(dialog.open){const r=dialog.getBoundingClientRect();position(dialog,r.left,r.top);}};
 root.addEventListener('resize',keepVisible);if(typeof root.ResizeObserver==='function')new root.ResizeObserver(keepVisible).observe(dialog);
}
function openDialog(dialog){
 dialog.setAttribute?.('data-mm-dialog','true');
 if(!dialog.open)dialog.showModal();
 if(!dialog.getBoundingClientRect)return;
 const r=dialog.getBoundingClientRect(),p=positions.get(dialog);
 position(dialog,p?.x??(root.innerWidth-r.width)/2,p?.y??Math.max(16,(root.innerHeight-r.height)/2));
}
function closeMenu(){if(menu){menu.remove();menu=null;}}
function menuGroup(item){if(item.group)return item.group;const label=item.label.toLowerCase();if(label==='cancel')return '';if(/format cable|format (?:equipment|device|image)|change color/.test(label))return 'Appearance';if(/bend|segment|connector$|cable path|redraw route|curve control/.test(label))return 'Route';if(/info/.test(label))return 'Information';if(/comment|cable details/.test(label))return 'Comments';if(/export|print/.test(label))return 'Export';if(/delete|remove|disconnect/.test(label))return 'Remove';if(/port|position/.test(label))return 'Connection points';return 'Object';}
function contextMenu({x,y,items}){
 closeMenu();menu=document.createElement('div');menu.className='mm-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label','Object actions');
 const groups=new Map();for(const item of items){const group=menuGroup(item);if(!groups.has(group))groups.set(group,[]);groups.get(group).push(item);}
 for(const group of ['Virtual machines','Appearance','Route','Object','Connection points','Information','Comments','Export','Remove','']){if(!groups.has(group))continue;const section=document.createElement('div');section.setAttribute('role','group');if(group){section.setAttribute('aria-label',group);const heading=document.createElement('div');heading.className='mm-menu-heading';heading.textContent=group;section.append(heading);}for(const item of groups.get(group)){const b=document.createElement('button');b.type='button';b.textContent=item.label;b.disabled=!!item.disabled;b.setAttribute('role',item.checked===undefined?'menuitem':'menuitemradio');if(item.checked!==undefined)b.setAttribute('aria-checked',String(item.checked));if(group==='Remove')b.className='mm-menu-danger';b.onclick=()=>{closeMenu();item.action();};section.append(b);}menu.append(section);}
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu();return;}if(!['ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowUp'?-1:1)+buttons.length)%buttons.length;buttons[next]?.focus();});
 document.body.append(menu);const r=menu.getBoundingClientRect();menu.style.left=clamp(x,8,root.innerWidth-r.width-8)+'px';menu.style.top=clamp(y,8,root.innerHeight-r.height-8)+'px';menu.querySelector('button:not(:disabled)')?.focus();
}
document.addEventListener?.('pointerdown',e=>{if(menu&&!menu.contains(e.target))closeMenu();},true);
document.addEventListener?.('keydown',e=>{if(e.key==='Escape')closeMenu();});
document.addEventListener?.('keydown',e=>{
 if(e.key!=='Enter'||e.defaultPrevented||e.isComposing||e.repeat||e.altKey)return;
 const target=e.target,dialog=target.closest?.('dialog[data-mm-dialog]'),form=target.closest?.('form')||dialog?.querySelector('form');
 if(!form||(!dialog&&!form.closest('#mormap,#mormap-physical,#mormap-library'))||dialog?.classList.contains('mm-window-minimized'))return;
 const multiline=target.matches?.('textarea,[contenteditable=true]');if(multiline&&!e.ctrlKey&&!e.metaKey)return;
 if(!multiline&&target.closest?.('button,a,input[type=button],input[type=submit],input[type=file]'))return;
 const submit=Array.from(form.querySelectorAll('button[type=submit],input[type=submit]')).find(b=>!b.hidden&&!b.closest('[hidden]'));
 if(!submit)return;e.preventDefault();if(submit.disabled)return;form.requestSubmit(submit);
});
function portControls(container,{ports=[],paired=false,defaultName='NIC1',defaultKind='ethernet',manual=false}={}){
 const make=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;Object.assign(n,attrs);return n;};
 const field=(box,title,input)=>{input.setAttribute('aria-label',title);const label=make('label',null);label.append(make('span',title),input);box.append(label);return input;};
 const tabs=make('div',null,{className:'mm-device-tabs mp-asset-filters'}),existing=make('div',null),custom=make('div',null),choose=make('button','Existing port',{type:'button'}),create=make('button','Create manual port',{type:'button'});tabs.append(choose,create);container.append(tabs,existing,custom);
 const select=field(existing,'Port',make('select',null));for(const p of ports)select.append(make('option',`${p.label||p.ifName||p.ifDescr||p.port_id}${p.ifAlias?' · '+p.ifAlias:''}`,{value:p.port_id?'lnms:port:'+p.port_id:p.port_ref}));
 if(!ports.length)existing.append(make('p','No unassigned inventory ports. Refresh LibreNMS discovery, or choose Create manual port for an unmonitored connector.'));
 const name=field(custom,'Port name',make('input',null,{value:defaultName,maxLength:120})),kind=field(custom,'Connector',make('select',null));
 for(const value of ['ethernet','sfp','sfp+','qsfp','management','console','power','fiber','stack'])kind.append(make('option',value,{value}));
 kind.value=defaultKind;const pair=field(custom,'Port arrangement',make('select',null));for(const [value,label] of [['single','Single port'],['pair','Front / rear pair']])pair.append(make('option',label,{value}));pair.value=paired?'pair':'single';
 custom.append(make('p','Manual ports are Unmonitored. Additional connections are allowed with a warning when connectivity becomes ambiguous. Front / rear pairs pass a connection through a panel or wall outlet.'));
 let mode='existing';const switchMode=value=>{mode=value;existing.hidden=value!=='existing';custom.hidden=value!=='manual';select.disabled=value!=='existing'||!ports.length;select.required=value==='existing'&&!!ports.length;name.disabled=kind.disabled=pair.disabled=value!=='manual';name.required=value==='manual';choose.classList.toggle('active',value==='existing');create.classList.toggle('active',value==='manual');choose.setAttribute('aria-pressed',String(value==='existing'));create.setAttribute('aria-pressed',String(value==='manual'));};choose.onclick=()=>switchMode('existing');create.onclick=()=>switchMode('manual');switchMode(manual?'manual':'existing');
 return {value(){if(mode==='manual'){if(!name.value.trim())throw Error('Enter a port name.');return {label:name.value.trim(),kind:kind.value,paired:pair.value==='pair'};}const p=ports.find(p=>(p.port_id?'lnms:port:'+p.port_id:p.port_ref)===select.value);if(!p)throw Error('Choose an existing port or Create manual port.');return {port:p};}};
}
const numericValues=new WeakMap(),numericInputs=new WeakSet();
function formatNumber(value){const n=Number(value);return Number.isFinite(n)?String(Number(n.toFixed(2))):String(value??'');}
function setNumber(input,value){const text=value===''?'':formatNumber(value);input.value=text;numericValues.set(input,{text,raw:value});return input;}
function numberValue(input){const saved=numericValues.get(input);return Number(saved&&input.value===saved.text?saved.raw:input.value);}
function numberInput(input){if(input.tagName!=='INPUT'||input.type!=='number')return input;setNumber(input,input.value);if(!numericInputs.has(input)){numericInputs.add(input);input.addEventListener('input',()=>numericValues.delete(input));input.addEventListener('change',()=>setNumber(input,numberValue(input)));}return input;}
let textContext;
function measureText(text,size){textContext??=document.createElement('canvas').getContext('2d');if(!textContext)return Array.from(text).length*size*.6;textContext.font=size+'px Arial';return textContext.measureText(text).width;}
root.addEventListener('blur',closeMenu);
root.MorMapUI={formatNumber,numberInput,numberValue,setNumber,makeDraggable,positionDialog:position,openDialog,contextMenu,closeMenu,portControls,measureText};
})(window);
