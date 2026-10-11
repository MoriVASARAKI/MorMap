/* Shared device presentations, stack membership and location-level link projection. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),ref=d=>d.device_id?'lnms:device:'+Number(d.device_id):d.object_id,port=p=>p.port_id?'lnms:port:'+Number(p.port_id):p.port_ref;
function uuid(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
const key=d=>d.stack_member?'member:'+Number(d.stack_member):'main';
function profile(graph,d){const device=graph?.devices?.[ref(d)],exact=device?.profiles?.[key(d)];if(exact)return exact;const legacy=device?.profiles?.main||device?.presentation;if(!d.stack_member||d.stack_member===1)return legacy||null;if(legacy&&!device?.stack){const ports=(legacy.ports||[]).filter(p=>memberOf(p)===Number(d.stack_member));if(ports.length)return {...legacy,revision:0,label:'',ports};}return null;}
function placement(d){return ref(d)+'/'+key(d);}
function duplicate(items,d){return items.some(v=>ref(v)===ref(d)&&(!v.stack_member||!d.stack_member||v.stack_member===d.stack_member));}
function memberOf(p){const m=String(p.ifName||p.ifDescr||p.label||'').match(/^(?:Gi(?:gabitEthernet)?|Te(?:nGigabitEthernet)?|Twe(?:ntyFiveGigE)?|Fo(?:rtyGigabitEthernet)?|Hu(?:ndredGigE)?|Eth(?:ernet)?|Fa(?:stEthernet)?)(\d+)\/\d+\/\d+/i);return m?Number(m[1]):null;}
function memberPorts(ports,graph,d,items=[],scope='member'){
 const transferable=p=>d.stack_member&&!graph?.devices?.[ref(d)]?.stack&&memberOf(p)===Number(d.stack_member);
 const other=new Set();for(const item of items)if(ref(item)===ref(d)&&key(item)!==key(d)&&!(d.stack_member===1&&!item.stack_member))for(const p of item.ports||[])if(!transferable(p))other.add(port(p));
 const profiles=graph?.devices?.[ref(d)]?.profiles||{};for(const [k,p]of Object.entries(profiles))if(k!==key(d)&&!(k==='main'&&d.stack_member===1))for(const v of p.ports||[])if(!transferable(v))other.add(port(v));
 return ports.filter(p=>{const assigned=p.stack_member||graph?.ports?.[port(p)]?.stack_member;return !other.has(port(p))&&(!assigned||!d.stack_member||Number(assigned)===Number(d.stack_member))&&(!d.stack_member||scope==='all'||(assigned?Number(assigned)===Number(d.stack_member):memberOf(p)===null||memberOf(p)===Number(d.stack_member)));});
}
async function withSavedAssets(assets,graph,fetchAsset){const ids=new Set();for(const d of Object.values(graph?.devices||{})){if(d.image)ids.add(d.image);if(d.presentation?.image)ids.add(d.presentation.image);for(const p of Object.values(d.profiles||{}))if(p.image)ids.add(p.image);}const missing=[...ids].filter(id=>!assets.some(a=>a.id===id));for(const asset of await Promise.all(missing.map(fetchAsset)))assets.push(asset);return assets;}
function savedSlots(asset,graph,d){const p=profile(graph,d);return p?.image===asset?.id&&p.ports?.length?copy(p.ports.filter(v=>v.port_id)):copy(asset?.ports||[]);}
function promote(map,workspace,added){if(!added.stack_member)return;const logical=workspace==='logical',items=logical?map.nodes:map.equipment;for(const d of items)if(d!==added&&ref(d)===ref(added)&&!d.stack_member){d.stack_member=1;if(!/ · M\d+$/.test(d.label))d.label+=' · M1';}
 if(added.stack_member===1)return;
 if(logical){for(const p of [...map.anchors]){const owner=items.find(n=>n.id===p.node_id);if(owner===added||ref(owner||{})!==ref(added)||owner.stack_member!==1||memberOf(p)!==Number(added.stack_member))continue;const fresh=map.anchors.find(a=>a.node_id===added.id&&port(a)===port(p));if(fresh){p.x=fresh.x;p.y=fresh.y;map.anchors=map.anchors.filter(a=>a!==fresh);}p.node_id=added.id;}}
 else{for(const d of items)if(d!==added&&ref(d)===ref(added)&&d.stack_member===1){const moved=d.ports.filter(p=>memberOf(p)===Number(added.stack_member));d.ports=d.ports.filter(p=>!moved.includes(p));for(const p of moved)if(!added.ports.some(a=>port(a)===port(p)))added.ports.push(p);}}
}
function restoreBindings(rows){for(const row of rows){const id=row.slot.port_id;if(id&&row.ports.some(p=>Number(p.port_id)===Number(id)))row.input.value=String(id);}return rows;}
function applyProfiles(map,graph,workspace,geometry){
 const logical=workspace==='logical',items=logical?map.nodes:map.equipment;
 for(const d of items||[]){const canonical=graph?.devices?.[ref(d)];if(canonical?.stack&&!d.stack_member)d.stack_member=1;
  const p=profile(graph,d);if(!p?.revision||Number(d.profile_revision||0)>=p.revision)continue;
  d.image=p.image;d.profile_revision=p.revision;if(p.label)d.label=p.label;
  if(!logical)for(const field of ['image_width','image_height','width_mm','image_fit'])if(p[field]!==undefined)d[field]=p[field];
  if(!logical&&p.rack_units!==undefined){const rack=map.locations.find(l=>l.id===d.parent_id),height=p.rack_units,safe=rack?.type!=='rack'||(d.rack_u+height-1<=rack.metadata.capacity&&!items.some(e=>e.id!==d.id&&e.parent_id===d.parent_id&&d.rack_u<e.rack_u+e.rack_units&&d.rack_u+height>e.rack_u));if(safe){d.rack_units=height;delete d.profile_warning;}else d.profile_warning='Shared height changed. Move this device to free rack space before applying the new height.';}
  const existing=logical?map.anchors.filter(a=>a.node_id===d.id):(d.ports||=[]),hidden=new Set(d.hidden_ports||[]);
  for(const s of p.ports||[]){if(hidden.has(port(s)))continue;const found=existing.find(a=>port(a)===port(s));if(found){Object.assign(found,{x:s.x,y:s.y,label:s.label,port_ref:port(s)});}else{
    const owner=logical?map.anchors.some(a=>port(a)===port(s)):items.some(e=>(e.ports||[]).some(a=>port(a)===port(s)));if(owner)continue;
    const point={...copy(s),port_ref:port(s)};if(logical){point.id=uuid();point.node_id=d.id;map.anchors.push(point);}else d.ports.push(point);
  }}
 }
 if(logical&&geometry)for(const l of map.links){const a=map.anchors.find(p=>p.id===l.source),b=map.anchors.find(p=>p.id===l.target);if(a&&b)l.points=geometry.attachConnector(l.points,geometry.point(items.find(n=>n.id===a.node_id),a),geometry.point(items.find(n=>n.id===b.node_id),b),l.connector);}
 return map;
}
function groups(graph,d){return Object.values(graph?.devices?.[ref(d)]?.port_groups||{});}
function portGroups(graph,p){return Object.values(graph?.devices||{}).flatMap(d=>Object.values(d.port_groups||{})).filter(g=>g.ports.includes(p));}
function groupState(group,ports,devices,display){const states=group.ports.map(r=>{const p=ports.get(Number(r.split(':').at(-1)));return r.startsWith('lnms:port:')?display.port(p,p&&devices.get(Number(p.device_id))):{key:'unknown'};});const counts={up:0,down:0,unknown:0};for(const s of states)counts[s.key==='up'?'up':s.key==='down'?'down':'unknown']++;
 const a=group.aggregate&&ports.get(Number(group.aggregate.split(':').at(-1))),aggregate=a?display.port(a,devices.get(Number(a.device_id))):null;
 return {...counts,label:aggregate?aggregate.label:counts.unknown?'Unknown':counts.up===states.length?'All member links UP':counts.up?'Partial member availability':'All member links DOWN',state:aggregate?.key||(counts.unknown?'unknown':counts.up===states.length?'up':counts.up?'warning':'down')};
}
function locationLinks(map,current){
 const P=root.MorMapPath||(typeof require==='function'?require('./physical-trace.js'):null);
 const locations=new Map(map.locations.map(l=>[l.id,l])),owners=new Map();for(const d of map.equipment)for(const p of d.ports||[])owners.set(port(p),d);for(const d of map.equipment)for(const p of d.ports||[]){const peer=map.infrastructure?.ports?.[port(p)]?.peer_id;if(peer&&!owners.has(peer)&&!d.hidden_ports?.includes(peer)&&map.infrastructure?.ports?.[peer]?.peer_id===port(p))owners.set(peer,d);}
 function visible(d){if(d.parent_id===current)return {id:d.id,label:d.label,type:'device',item:d};let l=locations.get(d.parent_id),seen=new Set();while(l&&!seen.has(l.id)){seen.add(l.id);if(l.parent_id===current)return {id:l.id,label:l.name,type:l.type,item:l};l=locations.get(l.parent_id);}return null;}
 const external=d=>({id:'outside-'+(d.remote?.plan_id||map.id)+'-'+d.parent_id,label:d.remote?((d.remote.plan_name||'Remote plan')+' / '+d.remote.path):locations.get(d.parent_id)?.name||d.label,type:'external',item:d});
 function owner(ref){if(owners.has(ref))return owners.get(ref);const p=map.infrastructure?.ports?.[ref],d=map.infrastructure?.devices?.[p?.device_ref],place=P?.placements(map.infrastructure||{},ref,map.id).find(v=>v.plan_id!==map.id);return d&&place?{id:d.id,label:d.name,parent_id:place.location_id,remote:place,port_ref:ref}:null;}
 const buckets=new Map();for(const c of map.cables||[]){const da=owner(c.source),db=owner(c.target);if(!da||!db)continue;let a=da.remote?null:visible(da),b=db.remote?null:visible(db);if(!a&&!b)continue;if(!a)a=external(da);if(!b)b=external(db);if(a.id===b.id||(a.type==='device'&&b.type==='device'))continue;if(a.id>b.id)[a,b]=[b,a];const id=a.id+'|'+b.id+((a.type==='device'||b.type==='device')?'|'+c.id:'');let bucket=buckets.get(id);if(!bucket){bucket={id,a,b,cables:[]};buckets.set(id,bucket);}bucket.cables.push(c);}
 return [...buckets.values()];
}
function validateStack(c,items,anchors){if(c.kind!=='stack')return;const owner=r=>anchors?items.find(d=>d.id===anchors.find(a=>a.id===r)?.node_id):items.find(d=>(d.ports||[]).some(p=>port(p)===r));const a=owner(c.source),b=owner(c.target);if(!a?.stack_member||!b?.stack_member||ref(a)!==ref(b)||a.stack_member===b.stack_member)throw Error('A Stack cable must join distinct members of the same Stack.');}
function cableLabel({parent,shape,G,U,points,type,format,cable,graph,refs,state,scale=1}){const names=[...new Set(refs.flatMap(r=>portGroups(graph,r).map(g=>g.name)))],label=[cable.name||cable.media?.reference||(cable.kind==='stack'?'STACK':''),...names].filter(Boolean).join(' · ');if(!label||points.length<2)return;const p=G.cableTrack(points,type,format).position(.5),width=(U.measureText(label,10)+30)*scale,g=shape('g',{'data-cable-label':cable.id});g.append(shape('rect',{x:p.x-width/2,y:p.y-11*scale,width,height:22*scale,rx:4*scale,fill:'#fff',stroke:cable.kind==='stack'?'#7c3aed':'#a6bac7','stroke-width':.8*scale}),shape('circle',{cx:p.x-width/2+9*scale,cy:p.y,r:3*scale,fill:state.color}),shape('text',{x:p.x-width/2+18*scale,y:p.y+3.5*scale,'font-size':10*scale,fill:'#365169'},label),shape('title',{},state.label));parent.append(g);}
const api={uuid,ref,port,key,profile,placement,duplicate,memberOf,memberPorts,savedSlots,withSavedAssets,restoreBindings,promote,applyProfiles,groups,portGroups,groupState,locationLinks,validateStack,cableLabel};
if(typeof module!=='undefined')module.exports=api;else root.MorMapTopology=api;
})(typeof window==='undefined'?globalThis:window);
