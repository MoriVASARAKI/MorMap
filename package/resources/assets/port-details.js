/* On-demand, read-only LibreNMS port details. Discovery absence is not a negative result. */
(function(root){
'use strict';
const unknown='Not reported by LibreNMS',validVlan=n=>Number.isInteger(Number(n))&&Number(n)>0&&Number(n)<4095;
function ranges(values){const sorted=[...new Set(values.map(Number).filter(validVlan))].sort((a,b)=>a-b),out=[];for(let i=0;i<sorted.length;i++){const start=sorted[i];let end=start;while(sorted[i+1]===end+1)end=sorted[++i];out.push(end===start?String(start):start+'–'+end);}return out.join(', ');}
function truth(value){return value===true||value===1||value==='1'||value==='true';}
function lines(data){
 const p=data.interface||{},vlans=data.vlans||[],all=vlans.map(v=>v.vlan??v.port_vlan).filter(validVlan),tagged=vlans.filter(v=>v.untagged!==undefined&&v.untagged!==null&&!truth(v.untagged)).map(v=>v.vlan??v.port_vlan),untagged=vlans.filter(v=>truth(v.untagged)).map(v=>v.vlan??v.port_vlan),voice=vlans.filter(v=>truth(v.voice)).map(v=>v.vlan??v.port_vlan),raw=String(p.ifTrunk??'').trim(),trunk=['dot1q','isl','trunk','trunking','on'].includes(raw.toLowerCase()),access=['access','nottrunking','not-trunking'].includes(raw.toLowerCase());
 const mode=trunk?'Trunk ('+raw+')':access?'Access':tagged.some(validVlan)?'Tagged VLANs; mode not reported':untagged.filter(validVlan).length===1?'Access (inferred from untagged membership)':raw&&raw!=='notApplicable'?raw:unknown;
 const result=['Mode: '+mode,'VLANs (discovered): '+(ranges(all)||unknown)];
 if(tagged.some(validVlan))result.push('Tagged: '+ranges(tagged));if(untagged.some(validVlan))result.push('Untagged: '+ranges(untagged));
 if(validVlan(p.ifVlan))result.push((trunk?'Native VLAN':'Port VLAN / PVID')+': '+p.ifVlan);
 result.push('Voice VLAN: '+(ranges(voice)||unknown));
 if(p.ifAlias)result.push('Description: '+p.ifAlias);
 const speed=Number(p.ifHighSpeed)>0?Number(p.ifHighSpeed)*1e6:Number(p.ifSpeed);if(speed>0)result.push('Speed: '+(speed>=1e9?speed/1e9+' Gbit/s':speed>=1e6?speed/1e6+' Mbit/s':speed/1e3+' kbit/s')+(p.ifDuplex?' · '+p.ifDuplex:''));else if(p.ifDuplex)result.push('Duplex: '+p.ifDuplex);
 if(data.addresses?.length)result.push('Interface IP: '+data.addresses.join(', '));
 const neighbors=(data.neighbors||[]).filter(n=>/^(lldp|cdp)$/i.test(n.protocol||''));
 result.push('LLDP / CDP: '+(neighbors.length?'':'No neighbor reported'));
 for(const n of neighbors)result.push([String(n.protocol).toUpperCase(),n.remote_name||n.remote_hostname||'Name not reported','IP '+(n.remote_ip&&n.remote_ip!=='Unavailable'?n.remote_ip:'not reported'),'Port '+(n.remote_port||'not reported')].join(' · '));
 return result;
}
function mount({root:container,resolve,load}){
 if(!container?.addEventListener||typeof document==='undefined')return null;
 const cache=new Map();let active=null,timer=null,leave=null,ticket=0,nativeTitle=null,nativeText='';
 const popup=document.createElement('div');popup.className='mm-port-tooltip';popup.id=container.id+'-port-tooltip';popup.setAttribute('role','tooltip');popup.hidden=true;document.body.append(popup);
 function hide(){clearTimeout(timer);clearTimeout(leave);ticket++;if(nativeTitle?.isConnected)nativeTitle.textContent=nativeText;if(active?.element)active.element.removeAttribute('aria-describedby');nativeTitle=null;active=null;popup.hidden=true;}
 function place(x,y){popup.style.left=Math.max(8,Math.min(x+16,window.innerWidth-popup.offsetWidth-8))+'px';popup.style.top=Math.max(8,Math.min(y+14,window.innerHeight-popup.offsetHeight-8))+'px';}
 async function show(hit,x,y){const token=++ticket;active=hit;popup.replaceChildren();const heading=document.createElement('strong'),body=document.createElement('div');heading.textContent=hit.header;body.textContent=(hit.summary||[]).join('\n');popup.append(heading,body);hit.element.setAttribute('aria-describedby',popup.id);nativeTitle=hit.element.querySelector('title');if(nativeTitle){nativeText=nativeTitle.textContent;nativeTitle.textContent='';}popup.hidden=false;place(x,y);
  const ids=[...new Set([hit.portId,...(hit.loadIds||[])].filter(Boolean))];if(!ids.length)return;
  const detail=document.createElement('div');detail.className='mm-port-discovery';detail.textContent='Loading LibreNMS details…';popup.append(detail);place(x,y);
  try{const data=await Promise.all(ids.map(id=>{let entry=cache.get(id);if(!entry||Date.now()-entry.time>30000){entry={time:Date.now(),promise:Promise.resolve().then(()=>load(id))};cache.set(id,entry);}return entry.promise.catch(e=>{cache.delete(id);throw e;});}));
   if(ticket!==token)return;const own=data.find(d=>Number(d.interface?.port_id)===Number(hit.portId));detail.textContent=[own?lines(own).join('\n'):null,hit.extra?.(data)].filter(Boolean).join('\n\n');place(x,y);
  }catch(e){if(ticket===token){detail.textContent='LibreNMS details unavailable. '+e.message;place(x,y);}}

 }
 container.addEventListener('pointerover',event=>{const hit=resolve(event.target);if(!hit)return;if(active?.element===hit.element){clearTimeout(leave);return;}hide();timer=setTimeout(()=>{if(hit.element.isConnected)show(hit,event.clientX,event.clientY);},180);});
 container.addEventListener('pointerout',event=>{if(active?.element?.contains(event.relatedTarget)||popup.contains(event.relatedTarget))return;clearTimeout(timer);clearTimeout(leave);leave=setTimeout(hide,160);});
 popup.addEventListener('pointerenter',()=>clearTimeout(leave));popup.addEventListener('pointerleave',hide);
 container.addEventListener('focusin',event=>{const hit=resolve(event.target);if(hit){hide();const b=hit.element.getBoundingClientRect();show(hit,b.right,b.top);}});container.addEventListener('focusout',hide);
 container.addEventListener('pointerdown',hide,true);container.addEventListener('wheel',hide,{passive:true});window.addEventListener('blur',hide);window.addEventListener('resize',hide);container.addEventListener('keydown',event=>{if(event.key==='Escape')hide();});
 return {hide,clear:()=>{cache.clear();hide();}};
}
async function fetchDetails(base,id){if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw Error('Invalid port.');const response=await fetch(base.replace(/\/$/,'')+'/ports/'+Number(id)+'/details',{credentials:'same-origin',headers:{Accept:'application/json'}});const data=await response.json().catch(()=>({message:'Refresh the page and check your login.'}));if(!response.ok)throw Error(data.message||'HTTP '+response.status);return data;}
const api={lines,ranges,mount,fetch:fetchDetails};if(typeof module!=='undefined')module.exports=api;else root.MorMapPortDetails=api;
})(typeof window==='undefined'?globalThis:window);
