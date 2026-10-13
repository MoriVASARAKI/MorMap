/* MorMap physical-plan geometry and invariants. No DOM or network dependencies. */
(function(root){
'use strict';
const T=root.MorMapTopology||(typeof require==='function'?require('./topology.js'):null);
const TYPES=['site','building','floor','room','rack'];
const RACK={unit:44.45,width:482.6,left:94,top:58};
const clone=value=>JSON.parse(JSON.stringify(value));
const all=map=>[...map.locations,...map.equipment,...map.shapes];
const find=(map,id)=>all(map).find(item=>item.id===id)||null;
const location=(map,id)=>map.locations.find(item=>item.id===id)||null;
function kind(map,id){return map.locations.some(v=>v.id===id)?'location':map.equipment.some(v=>v.id===id)?'equipment':map.shapes.some(v=>v.id===id)?'shape':null;}
const nextType=current=>TYPES[current?TYPES.indexOf(current.type)+1:0]||null;
const children=(map,id)=>({locations:map.locations.filter(v=>v.parent_id===id),equipment:map.equipment.filter(v=>v.parent_id===id),shapes:map.shapes.filter(v=>v.parent_id===id)});
function path(map,id){const result=[],seen=new Set();while(id){if(seen.has(id))throw Error('Location cycle.');seen.add(id);const l=location(map,id);if(!l)throw Error('Location not found.');result.unshift(l);id=l.parent_id;}return result;}
function subtree(map,id){const ids=new Set([id]);let size=0;while(size!==ids.size){size=ids.size;for(const l of map.locations)if(ids.has(l.parent_id))ids.add(l.id);}return ids;}
function remove(map,id){const ids=subtree(map,id),removed=new Set(map.equipment.filter(v=>ids.has(v.id)||ids.has(v.parent_id)).flatMap(e=>(e.ports||[]).map(portRef)));for(const key of ['locations','equipment','shapes'])map[key]=map[key].filter(v=>!ids.has(v.id)&&!ids.has(v.parent_id));map.cables=(map.cables||[]).filter(c=>!removed.has(c.source)&&!removed.has(c.target));}
function occupied(map,rackId,except){const u=new Set();for(const e of map.equipment){if(e.parent_id!==rackId||e.id===except)continue;for(let i=e.rack_u;i<e.rack_u+e.rack_units;i++)u.add(i);}return u;}
function firstFreeU(map,rackId,units=1,except){const rack=location(map,rackId),used=occupied(map,rackId,except);if(!rack||rack.type!=='rack')return null;for(let u=1;u+units-1<=rack.metadata.capacity;u++){let free=true;for(let n=u;n<u+units;n++)if(used.has(n))free=false;if(free)return u;}return null;}
function rackProblem(map,item){const rack=location(map,item.parent_id);if(rack?.type!=='rack')return '';if(!Number.isInteger(item.rack_u)||!Number.isInteger(item.rack_units)||item.rack_u<1||item.rack_units<1||item.rack_u+item.rack_units-1>rack.metadata.capacity)return 'Equipment exceeds the rack capacity.';const used=occupied(map,rack.id,item.id);for(let u=item.rack_u;u<item.rack_u+item.rack_units;u++)if(used.has(u))return `Rack U${u} is already occupied.`;return '';}
function rackBox(item,capacity){const w=item.width_mm||RACK.width,offset=(RACK.width-w)*({left:0,center:.5,right:1}[item.rack_align||'center']);return {x:RACK.left+offset,y:RACK.top+(capacity-item.rack_u-item.rack_units+1)*RACK.unit,w,h:item.rack_units*RACK.unit};}
function canvas(map,id){const current=location(map,id);return current?.type==='rack'?{width:1100,height:Math.ceil(current.metadata.capacity*RACK.unit+116)}:clone(current?.canvas||map.canvas);}
function box(map,item){const parent=location(map,item.parent_id);return kind(map,item.id)==='equipment'&&parent?.type==='rack'?rackBox(item,parent.metadata.capacity):item;}
function imageBox(item,box){
 const width=Math.max(1,box.w),height=Math.max(1,box.h);
 if(item.image_fit==='stretch')return {x:0,y:0,w:width,h:height};
 const iw=item.image_width||item.w,ih=item.image_height||item.h,scale=Math.min(width/iw,height/ih),w=iw*scale,h=ih*scale;
 return {x:(box.w-w)/2,y:(box.h-h)/2,w,h};
}
function bounds(item){const angle=(item.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle)),w=item.w*c+item.h*s,h=item.w*s+item.h*c;return {x:item.x+item.w/2-w/2,y:item.y+item.h/2-h/2,w,h};}
function fitBounds(map,id){const items=Object.values(children(map,id)).flat(),background=location(map,id)?.background;if(!items.length&&!background)return {x:0,y:0,...{w:canvas(map,id).width,h:canvas(map,id).height}};const bb=items.map(v=>bounds({...box(map,v),rotation:v.rotation}));if(background)bb.push(bounds({...background,rotation:0}));const x=Math.min(...bb.map(v=>v.x)),y=Math.min(...bb.map(v=>v.y));return {x:x-60,y:y-60,w:Math.max(...bb.map(v=>v.x+v.w))-x+120,h:Math.max(...bb.map(v=>v.y+v.h))-y+120};}
function snap(value,enabled,grid=20){return enabled?Math.round(value/grid)*grid:value;}
function polygon(points){const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),w=Math.max(1,Math.max(...points.map(p=>p.x))-minX),h=Math.max(1,Math.max(...points.map(p=>p.y))-minY);return {x:minX,y:minY,w,h,points:points.map(p=>({x:(p.x-minX)/w,y:(p.y-minY)/h}))};}
function geoLayout(map,parent){
 const items=map.locations.filter(l=>l.parent_id===parent&&Number.isFinite(l.metadata.latitude)&&Number.isFinite(l.metadata.longitude));
 if(items.length<2)throw Error('Set latitude and longitude on at least two locations at this level.');
 const rad=Math.PI/180,origin=Math.atan2(items.reduce((v,l)=>v+Math.sin(l.metadata.longitude*rad),0),items.reduce((v,l)=>v+Math.cos(l.metadata.longitude*rad),0)),mean=items.reduce((v,l)=>v+l.metadata.latitude,0)/items.length*rad;
 const points=items.map(l=>{let lon=l.metadata.longitude*rad-origin;while(lon>Math.PI)lon-=2*Math.PI;while(lon< -Math.PI)lon+=2*Math.PI;return {item:l,x:lon*Math.max(.01,Math.cos(mean)),y:-l.metadata.latitude*rad};});
 const minX=Math.min(...points.map(p=>p.x)),maxX=Math.max(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxY=Math.max(...points.map(p=>p.y)),size=canvas(map,parent),marginX=Math.max(...items.map(l=>l.w))/2+40,marginY=Math.max(...items.map(l=>l.h))/2+40,availableX=Math.max(1,size.width-2*marginX),availableY=Math.max(1,size.height-2*marginY),scale=Math.min(maxX>minX?availableX/(maxX-minX):Infinity,maxY>minY?availableY/(maxY-minY):Infinity);
 if(!Number.isFinite(scale))throw Error('The coordinates are identical. Use distinct coordinates or place the locations manually.');
 for(const p of points){p.item.x=size.width/2+(p.x-(minX+maxX)/2)*scale-p.item.w/2;p.item.y=size.height/2+(p.y-(minY+maxY)/2)*scale-p.item.h/2;}
 return items.length;
}
function metadata(){return {address:'',latitude:null,longitude:null,notes:'',owner:'',reference:'',floor_label:'',model:'',capacity:42};}
function newLocation(id,parent_id,type,name,x=120,y=120){return {id,parent_id,type,name,x,y,w:type==='rack'?160:320,h:type==='rack'?220:200,rotation:0,color:({site:'#e3f1ee',building:'#dcecf7',floor:'#ece9f8',room:'#e2eff5',rack:'#dce5ee'})[type],canvas:{width:1920,height:1080},metadata:metadata()};}
function validateBackground(b){if(!b||typeof b.image!=='string'||!b.image.trim())throw Error('Choose a floor background image.');for(const [key,min,max]of [['x',-100000,100000],['y',-100000,100000],['w',1,16384],['h',1,16384],['opacity',.05,1]])if(!Number.isFinite(b[key])||b[key]<min||b[key]>max)throw Error('Invalid floor background '+key+'.');if(typeof b.locked!=='boolean')throw Error('Invalid floor background lock.');}
function validate(map){
 if(map.kind!=='physical'||map.schema!==1)throw Error('Unsupported physical plan.');
 if(!map.name?.trim()||map.name.length>120)throw Error('Plan name must have 1–120 characters.');
 for(const size of [map.canvas,...map.locations.map(v=>v.canvas)])if(!Number.isInteger(size?.width)||!Number.isInteger(size?.height)||size.width<320||size.width>16384||size.height<240||size.height>16384)throw Error('Canvas size must be 320–16384 × 240–16384.');
 const ids=new Set(),devices=new Set();
 for(const item of all(map)){
  if(!item.id||ids.has(item.id))throw Error('Duplicate plan item.');ids.add(item.id);
  for(const key of ['x','y','w','h','rotation'])if(!Number.isFinite(item[key]))throw Error('Invalid item geometry.');
  if(Math.abs(item.x)>100000||Math.abs(item.y)>100000||item.w<1||item.h<1||item.w>16384||item.h>16384||Math.abs(item.rotation)>360)throw Error('Item geometry is outside its allowed range.');
 }
 for(const item of map.locations){if(item.background){if(!['site','building','floor','room'].includes(item.type))throw Error('Backgrounds belong to a site, building, floor or server room.');validateBackground(item.background);}const i=TYPES.indexOf(item.type),parent=location(map,item.parent_id);if(i<0||(i===0?item.parent_id!==null:parent?.type!==TYPES[i-1]))throw Error('Use the hierarchy Site → Building → Floor → ServerRoom → Rack.');if(!item.name.trim()||item.name.length>120)throw Error('Location name must have 1–120 characters.');if(item.type==='rack'&&(!Number.isInteger(item.metadata.capacity)||item.metadata.capacity<1||item.metadata.capacity>60))throw Error('Rack capacity must be 1–60 U.');for(const [key,max] of [['latitude',90],['longitude',180]])if(item.metadata[key]!==null&&item.metadata[key]!==''&&(!Number.isFinite(item.metadata[key])||Math.abs(item.metadata[key])>max))throw Error(`Invalid ${key}.`);}
 for(const item of map.equipment){if(!location(map,item.parent_id))throw Error('Equipment needs a location.');const ref=item.device_id?'lnms:device:'+item.device_id:item.object_id;if(!ref)throw Error('Equipment needs an infrastructure identity.');const placement=T.placement(item);if(devices.has(placement)||map.equipment.some(other=>other!==item&&T.duplicate([other],item)))throw Error('This device or stack member already has a physical location in the plan.');devices.add(placement);if(!item.label.trim()||item.label.length>120)throw Error('Equipment name must have 1–120 characters.');if(item.width_mm!==undefined&&(!Number.isFinite(item.width_mm)||item.width_mm<50||item.width_mm>482.6))throw Error('Equipment width must be 50–482.6 mm.');if(item.rack_align!==undefined&&!['left','center','right'].includes(item.rack_align))throw Error('Invalid rack alignment.');const problem=rackProblem(map,item);if(problem)throw Error(problem);}
 for(const item of map.shapes)if(item.parent_id&&!location(map,item.parent_id))throw Error('Shape location is missing.');
 const placed=new Set(),cableIds=new Set();for(const e of map.equipment)for(const p of e.ports||[]){const ref=portRef(p);if(!ref||placed.has(ref))throw Error('A port is placed more than once.');placed.add(ref);if(![p.x,p.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))throw Error('A connection point is outside the image.');}
 if((map.cables||[]).length>2000)throw Error('Maximum 2000 cables per physical plan.');
 for(const c of map.cables||[]){if(!c.id||cableIds.has(c.id))throw Error('Duplicate cable.');cableIds.add(c.id);if(c.source===c.target||![c.source,c.target].every(p=>placed.has(p)))throw Error('Cable endpoints must be placed in this plan.');for(const [context,points] of Object.entries(c.paths||{})){const style=c.connectors?.[context]||'right-angle';if(!['right-angle','straight','curved'].includes(style)||(style==='straight'&&points.length!==2)||(style==='curved'&&points.length!==4))throw Error('Invalid connector geometry.');if(!Array.isArray(points)||points.length<2||points.length>100)throw Error('Cable paths need 2–100 points.');for(let n=0;n<points.length;n++){const p=points[n],q=points[n-1];if(![p.x,p.y].every(v=>Number.isFinite(v)&&Math.abs(v)<=100000))throw Error('Invalid cable geometry.');if(style==='right-angle'&&q&&Math.abs(p.x-q.x)>0.001&&Math.abs(p.y-q.y)>0.001)throw Error('Use orthogonal cable segments.');}}}

 return map;
}
const portRef=p=>p.port_id?'lnms:port:'+Number(p.port_id):p.port_ref;
const contextKey=(id,cabling=false)=>(cabling?'cabling:':'location:')+(id||'root');
function projection(map,id,cabling=false){
 const standard=children(map,id),here=location(map,id),boxes=new Map(),panels=[];
 if(!cabling){for(const e of standard.equipment)boxes.set(e.id,box(map,e));if(here?.type==='rack')panels.push({rack:here,x:0,y:0});return {items:standard,boxes,panels,canvas:canvas(map,id)};}
 const included=subtree(map,id),racks=map.locations.filter(l=>l.type==='rack'&&included.has(l.id)),equipment=map.equipment.filter(e=>included.has(e.parent_id));
 let y=0,maxY=0,maxX=0;for(let n=0;n<racks.length;n+=3){const row=racks.slice(n,n+3),height=Math.max(...row.map(r=>r.metadata.capacity*RACK.unit+160));
  row.forEach((rack,i)=>{const x=i*780;panels.push({rack,x,y});for(const e of equipment.filter(e=>e.parent_id===rack.id)){const b=rackBox(e,rack.metadata.capacity);boxes.set(e.id,{...b,x:b.x+x,y:b.y+y});}maxX=Math.max(maxX,x+760);});y+=height;maxY=y;}
 const loose=equipment.filter(e=>!boxes.has(e.id));loose.forEach((e,i)=>{const x=(i%3)*600+80,yy=y+80+Math.floor(i/3)*360;boxes.set(e.id,{x,y:yy,w:e.w,h:e.h});maxX=Math.max(maxX,x+e.w+100);maxY=Math.max(maxY,yy+e.h+100);});
 return {items:{locations:[],equipment,shapes:[]},boxes,panels,canvas:{width:Math.max(1100,Math.ceil(maxX)),height:Math.max(600,Math.ceil(maxY))}};
}
function portItem(map,ref){for(const item of map.equipment){const port=(item.ports||[]).find(p=>portRef(p)===ref);if(port)return {item,port};}const record=map.infrastructure?.ports?.[ref],peer=map.infrastructure?.ports?.[record?.peer_id];if(peer?.peer_id===ref&&peer.device_ref===record.device_ref)for(const item of map.equipment){const front=(item.ports||[]).find(p=>portRef(p)===peer.id);if(front&&!item.hidden_ports?.includes(ref))return {item,port:{port_id:null,port_ref:ref,label:record.label,x:front.x,y:front.y},virtual:true};}return null;}
function portPosition(map,ref,id,cabling=false,projected){const found=portItem(map,ref);if(!found)return null;const b=(projected||projection(map,id,cabling)).boxes.get(found.item.id);if(!b)return null;const im=imageBox(found.item,b),x=im.x+found.port.x*im.w,y=im.y+found.port.y*im.h,a=(found.item.rotation||0)*Math.PI/180;return {x:b.x+b.w/2+(x-b.w/2)*Math.cos(a)-(y-b.h/2)*Math.sin(a),y:b.y+b.h/2+(x-b.w/2)*Math.sin(a)+(y-b.h/2)*Math.cos(a)};}
// Intra-rack routes use rack coordinates in every projected cabling view.
// Legacy per-view paths remain in the document, so upgrading never deletes a route.
function cableFrame(map,c,id,cabling=false){
 const key=contextKey(id,cabling),a=c&&portItem(map,c.source),b=c&&portItem(map,c.target),rack=a&&location(map,a.item.parent_id);
 if(!rack||rack.type!=='rack'||b?.item.parent_id!==rack.id)return {key,x:0,y:0};
 if(!cabling)return id===rack.id?{key:contextKey(rack.id),x:0,y:0,rack:rack.id}:{key,x:0,y:0};
 const included=subtree(map,id),racks=map.locations.filter(l=>l.type==='rack'&&included.has(l.id)),index=racks.findIndex(r=>r.id===rack.id);
 if(index<0)return {key,x:0,y:0};let y=0;for(let n=0;n<Math.floor(index/3)*3;n+=3)y+=Math.max(...racks.slice(n,n+3).map(r=>r.metadata.capacity*RACK.unit+160));
 return {key:contextKey(rack.id),x:index%3*780,y,rack:rack.id};
}
function prepareCable(map,c,id,cabling=false){
 const frame=cableFrame(map,c,id,cabling);c.paths??={};
 if(!frame.rack||c.paths[frame.key])return frame;
 const preferred=contextKey(id,cabling),keys=[preferred,...Object.keys(c.paths).filter(k=>k!==preferred)];
 for(const key of keys){if(!c.paths[key])continue;const [mode,value]=key.split(':'),loc=value==='root'?null:value;
  if(mode!=='cabling'||loc&&!location(map,loc))continue;
  const source=cableFrame(map,c,loc,true);if(source.rack!==frame.rack)continue;
  c.paths[frame.key]=c.paths[key].map(p=>({x:p.x-source.x,y:p.y-source.y}));
  for(const field of ['connectors','formats','infos'])if(c[field]?.[key]!==undefined){c[field][frame.key]=clone(c[field][key]);if(field==='infos'){c[field][frame.key].x-=source.x;c[field][frame.key].y-=source.y;}}
  break;
 }
 return frame;
}
function reorderRack(map,sourceId,targetId,after=false){
 const source=location(map,sourceId),target=location(map,targetId);
 if(!source||!target||source.type!=='rack'||target.type!=='rack'||source.parent_id!==target.parent_id||source===target)return false;
 const slots=[],siblings=[];map.locations.forEach((l,i)=>{if(l.type==='rack'&&l.parent_id===source.parent_id){slots.push(i);siblings.push(l);}});
 const before=siblings.map(l=>l.id).join('|');siblings.splice(siblings.indexOf(source),1);siblings.splice(siblings.indexOf(target)+(after?1:0),0,source);
 if(before===siblings.map(l=>l.id).join('|'))return false;
 slots.forEach((slot,i)=>map.locations[slot]=siblings[i]);return true;
}
function attachCables(map,G){const cache=new Map();for(const c of map.cables||[])for(const [key,points] of Object.entries(c.paths||{})){const [mode,value]=key.split(':'),id=value==='root'?null:value,cabling=mode==='cabling';if(id&&!location(map,id)){delete c.paths[key];continue;}if(!cache.has(key))cache.set(key,projection(map,id,cabling));const a=portPosition(map,c.source,id,cabling,cache.get(key)),b=portPosition(map,c.target,id,cabling,cache.get(key));if(a&&b){if(c.infos?.[key])c.infos[key]=G.attachInfo(c.infos[key],points,c.connectors?.[key],c.formats?.[key]);c.paths[key]=G.attachConnector(points,a,b,c.connectors?.[key]);if(c.infos?.[key])c.infos[key]=G.attachInfo(c.infos[key],c.paths[key],c.connectors?.[key],c.formats?.[key]);}}}
const api={cableFrame,prepareCable,reorderRack,validateBackground,RACK,portRef,projection,portPosition,portItem,contextKey,attachCables,TYPES,clone,all,find,kind,location,nextType,children,path,subtree,remove,occupied,firstFreeU,rackProblem,rackBox,canvas,box,imageBox,bounds,fitBounds,snap,polygon,geoLayout,metadata,newLocation,validate};
if(typeof module!=='undefined')module.exports=api;else root.MorMapPhysical=api;
})(typeof window==='undefined'?globalThis:window);
