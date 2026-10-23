/* Match stencil labels to inventory identities; never infer a port from SNMP row order. */
(function(root){
'use strict';
const normal=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,'')
 .replace(/^tengigabitethernet/,'te').replace(/^gigabitethernet/,'gi')
 .replace(/^fastethernet/,'fa').replace(/^ethernet/,'eth').replace(/^et(?=\d)/,'eth');
function panelNumber(value){
 const name=normal(value);
 // Subinterfaces, management, VLANs, aggregates and breakout lanes are not panel numbers.
 const match=name.match(/^(?:port|p|eth|gi|te|fa|fo|hu|xe-|ge-|et-)?(\d+(?:\/\d+){0,2})$/);
 if(!match)return null;
 if(/^eth\d+\/\d+\/\d+$/.test(name))return null;
 return Number(match[1].split('/').at(-1));
}
function match(slots,ports){
 const inventory=Array.from(new Map(ports.filter(p=>Number(p.port_id)>0).map(p=>[Number(p.port_id),p])).values());
 const rows=slots.map(slot=>({slot,port:null,reason:'unmatched'})),used=new Set();
 const assign=(row,candidates,reason)=>{if(candidates.length!==1)return;const p=candidates[0];if(used.has(Number(p.port_id)))return;row.port=p;row.reason=reason;used.add(Number(p.port_id));};
 for(const row of rows){
  if(row.slot.port_id){assign(row,inventory.filter(p=>Number(p.port_id)===Number(row.slot.port_id)),'saved');continue;}
  const label=normal(row.slot.label);if(label)assign(row,inventory.filter(p=>[p.ifName,p.ifDescr].some(v=>normal(v)===label)),'name');
 }
 const numbers=slots.map(s=>panelNumber(s.label));
 for(const [i,row]of rows.entries()){
  if(row.port||row.slot.port_id)continue;
  const number=numbers[i];if(number===null||numbers.filter(n=>n===number).length!==1)continue;
  // Number fallback is reserved for generic front-panel labels, e.g. port1, P1, 1.
  if(!/^(?:port|p)?\d+$/.test(normal(row.slot.label)))continue;
  assign(row,inventory.filter(p=>panelNumber(p.ifName||p.ifDescr)===number),'number');
 }
 return rows;
}
const nameOf=p=>String(p.ifName||p.ifDescr||p.port_id).trim();
function inventory(ports){
 if(!Array.isArray(ports))throw Error('Invalid LibreNMS port response. Reload the page after upgrading MorMap.');
 return Array.from(new Map(ports.filter(p=>Number.isSafeInteger(Number(p.port_id))&&Number(p.port_id)>0).map(p=>[Number(p.port_id),p])).values());
}
function virtualPort(p){
 const name=nameOf(p).toLowerCase().replace(/\s+/g,'');
 return /^(?:vlan|vl|lo(?:opback)?|po(?:rt-?channel)?|bond|vmbr|br|veth|tap|tun|fwbr|fwpr|fwln|docker|virbr|dummy|null|stackport|stacksub|mgmt|management|oob)[-\d/.]/.test(name)||name==='lo'||/\.\d+(?::\d+)?$/.test(name)||['softwareLoopback','l2vlan','l3ipvlan','ieee8023adLag','tunnel','53','131','135','136','161'].includes(String(p.ifType));
}
function interfaceOrder(ports,{all=false,by='name'}={}){
 const compare=new Intl.Collator('en',{numeric:true,sensitivity:'base'});
 return inventory(ports).filter(p=>all||!virtualPort(p)).sort((a,b)=>{
  if(by==='index'){const ai=Number(a.ifIndex)>0?Number(a.ifIndex):Infinity,bi=Number(b.ifIndex)>0?Number(b.ifIndex):Infinity;if(ai!==bi)return ai-bi;}
  return compare.compare(normal(nameOf(a)),normal(nameOf(b)))||Number(a.port_id)-Number(b.port_id);
 });
}
function controls(parent,slots,response,gridClass='mm-binding-grid',reload){
 const make=(tag,text)=>{const el=document.createElement(tag);if(text)el.textContent=text;return el;};
 const unpack=value=>{const ports=inventory(Array.isArray(value)?value:value?.ports);return {ports,total:Array.isArray(value)?value.length:Number.isSafeInteger(value?.total)&&value.total>=ports.length?value.total:ports.length};};
 const initial=unpack(response),ports=initial.ports,rows=[];let total=initial.total;
 const summary=make('p'),grid=make('div'),feedback=make('p');grid.className=gridClass;summary.setAttribute('role','status');feedback.setAttribute('role','status');
 const update=()=>{const count=rows.filter(r=>r.input.value).length,missing=rows.filter(r=>r.missing).length;summary.textContent=`${count} / ${slots.length} image positions bound to LibreNMS ports. ${total} inventory ports received.`+(total!==ports.length?` ${ports.length} available for this device / Stack member.`:'')+(missing?` ${missing} saved bindings unavailable in the current inventory; reload or explicitly choose another assignment.`:'');};
 parent.append(summary,grid);
 for(const slot of slots){const label=make('label',slot.label),input=make('select'),row={slot,input,ports,requested:'',missing:false};input.setAttribute('aria-label','Port for '+slot.label);input.onchange=()=>{row.requested=input.value;row.missing=false;input.options[0].textContent='Unbound';feedback.textContent='';update();};label.append(input);grid.append(label);rows.push(row);}
 const options=make('div'),sort=make('select'),scope=make('select'),first=make('select');options.className='mm-interface-order';
 const field=(label,input)=>{const row=make('label',label);input.setAttribute('aria-label',label);row.append(input);options.append(row);};
 sort.append(new Option('Name (1, 2, 10)','name'),new Option('SNMP ifIndex','index'));scope.append(new Option('Hardware ports','hardware'),new Option('All inventory interfaces','all'));
 field('Interface order',sort);field('Include interfaces',scope);field('Start at interface',first);
 let ordered=[];
 const order=make('button','Fill by interface order');order.type='button';order.title='Assign image positions in Asset library order to the selected interface sequence.';
 const prepare=()=>{const previous=first.value;ordered=interfaceOrder(ports,{all:scope.value==='all',by:sort.value});first.replaceChildren();for(const p of ordered)first.append(new Option(nameOf(p),String(p.port_id)));if(ordered.some(p=>String(p.port_id)===previous))first.value=previous;order.disabled=!!rows.loading||!ordered.length;first.disabled=order.disabled;
  feedback.textContent=!total?'LibreNMS returned no ports for this device. Check port discovery, then use Reload ports.':!ports.length?'Inventory ports exist, but none are available for the selected Stack member. Check Device mode, Stack member and Interface scope.':!ordered.length?'No hardware interfaces found in this inventory. Choose All inventory interfaces to review the available ports.':'Positions follow Asset library order; additional saved positions follow them. Review each assignment before applying.';
 };
 const populate=(preserve=false)=>{const matched=match(slots,ports);rows.forEach((r,i)=>{if(!preserve)r.requested=r.slot.port_id?String(r.slot.port_id):matched[i].port?String(matched[i].port.port_id):'';r.missing=!!r.requested&&!ports.some(p=>String(p.port_id)===r.requested);r.input.replaceChildren(new Option(r.missing?`Saved binding unavailable · port ID ${r.requested}`:'Unbound',''));for(const p of ports)r.input.append(new Option(nameOf(p),String(p.port_id)));r.input.value=r.missing?'':r.requested;});prepare();update();};
 sort.onchange=scope.onchange=()=>{first.replaceChildren();prepare();};
 order.onclick=()=>{const start=ordered.findIndex(p=>String(p.port_id)===first.value);if(start<0)return;const sequence=ordered.slice(start);rows.forEach((r,i)=>{r.input.value=sequence[i]?String(sequence[i].port_id):'';r.input.dispatchEvent(new Event('change',{bubbles:true}));});const count=Math.min(rows.length,sequence.length);feedback.textContent=count?`Assigned ${count} / ${rows.length} positions: ${nameOf(sequence[0])}${count>1?' → '+nameOf(sequence[count-1]):''}.`+(count<rows.length?' Not enough interfaces remain; choose another starting interface or complete the remaining positions manually.':' Review, then Apply to keep these assignments.'):'No image positions to assign.';update();};
 parent.append(options,order);
 if(reload){const refresh=make('button','Reload ports');refresh.type='button';refresh.onclick=async()=>{rows.loading=true;refresh.disabled=order.disabled=first.disabled=sort.disabled=scope.disabled=true;for(const r of rows)r.input.disabled=true;feedback.textContent='Loading LibreNMS ports…';try{const fresh=unpack(await reload());ports.splice(0,ports.length,...fresh.ports);total=fresh.total;populate(true);}catch(e){feedback.textContent=e.message;}finally{rows.loading=false;refresh.disabled=sort.disabled=scope.disabled=false;for(const r of rows)r.input.disabled=false;order.disabled=first.disabled=!ordered.length;}};parent.append(refresh);}
 parent.append(feedback);populate();return rows;
}
const api={match,normal,panelNumber,interfaceOrder,controls};if(typeof module!=='undefined')module.exports=api;else root.MorMapPortMapping=api;
})(typeof window==='undefined'?globalThis:window);
