/* Floor artwork is a presentation layer, never an infrastructure device. */
(function(root){
'use strict';
root.MorMapFloorBackground=function(ctx){
 const {S,M,U,svg,shape,node,field,action,modal,mutate,api,base,shared,readOnly}=ctx;
 const allowed=a=>['image/png','image/jpeg','image/svg+xml'].includes(a.mime);
 const floor=()=>S.map&&['site','building','floor','room'].includes(M.location(S.map,S.current)?.type)?M.location(S.map,S.current):null;
 function render(layer){const f=floor(),b=f?.background;if(!b||S.cabling)return;const g=shape('g',{'data-floor-background':f.id,'pointer-events':readOnly||b.locked?'none':'all'});g.append(shape('image',{href:(readOnly?base:shared)+'/images/'+encodeURIComponent(b.image),x:b.x,y:b.y,width:b.w,height:b.h,opacity:b.opacity,preserveAspectRatio:'none',style:b.locked?'':'cursor:move'}));layer.append(g);}
 async function open(){
  const current=floor();if(readOnly||!current)return;const mapId=S.map.id,floorId=current.id;
  const data=await api('/library','GET',undefined,true);if(S.map?.id!==mapId||S.current!==floorId)return;
  let assets=data.assets.filter(allowed);
  modal('Background · '+current.name,el=>{
   el.append(node('p',{},'Import a PNG, JPG or SVG, then place buildings, rooms and equipment over it.'));
   const picker=node('select',{'aria-label':'Background image'}),blank=node('option',{value:''},'Choose an image…');picker.append(blank);
   const options=()=>{picker.replaceChildren(blank);for(const a of assets)picker.append(node('option',{value:a.id},a.name));};options();picker.value=current.background?.image||'';
   const label=node('label',{class:'mp-prop'});label.append(node('span',{},'Background image'),picker);el.append(label);
   const upload=field(el,'Import PNG / JPG / SVG','','file',{accept:'.png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml'});
   const preview=node('img',{class:'mp-floor-preview',alt:'Location background preview'});el.append(preview);
   const grid=node('div',{class:'mp-prop-grid'});el.append(grid);
   const old=current.background,x=field(grid,'X',old?.x??0,'number',{min:-100000,max:100000,step:'any'}),y=field(grid,'Y',old?.y??0,'number',{min:-100000,max:100000,step:'any'}),w=field(grid,'Width',old?.w??current.canvas.width,'number',{min:1,max:16384,step:'any'}),h=field(grid,'Height',old?.h??current.canvas.height,'number',{min:1,max:16384,step:'any'});
   const ratio=field(el,'Keep image proportions',true,'checkbox');ratio.checked=true;
   const opacity=field(el,'Opacity (%)',(old?.opacity??1)*100,'number',{min:5,max:100,step:'any'}),locked=field(el,'Lock position (prevent dragging)',old?.locked??true,'checkbox');locked.checked=old?.locked??true;
   let aspect=old?old.w/old.h:1,busy=false;
   const draw=reset=>{const a=assets.find(a=>a.id===picker.value);preview.hidden=!a;if(!a)return;preview.src=shared+'/images/'+encodeURIComponent(a.id);if(reset){aspect=a.width/a.height;const scale=Math.min(current.canvas.width/a.width,current.canvas.height/a.height);w.value=Number((a.width*scale).toFixed(3));h.value=Number((a.height*scale).toFixed(3));x.value=0;y.value=0;}preview.style.opacity=Number(opacity.value)/100;};
   picker.onchange=()=>draw(true);opacity.oninput=()=>draw(false);w.oninput=()=>{if(ratio.checked)h.value=Number((U.numberValue(w)/aspect).toFixed(3));};h.oninput=()=>{if(ratio.checked)w.value=Number((U.numberValue(h)*aspect).toFixed(3));};draw(false);
   if(old)action(el,'Remove background',()=>{if(S.map?.id!==mapId)return;if(mutate(()=>delete M.location(S.map,floorId).background))document.getElementById('mp-dialog').close();});
   const status=node('p',{role:'status',class:'mp-floor-upload-status'});el.append(status);
   upload.onchange=async()=>{const file=upload.files[0];if(!file)return;busy=true;picker.disabled=true;status.textContent='Importing image…';try{
    if(!/\.(png|jpe?g|svg)$/i.test(file.name))throw Error('Choose a PNG, JPG or SVG file.');
    const body=new FormData();body.append('image',file);body.append('name',file.name.replace(/\.[^.]+$/,''));
    const response=await fetch(shared+'/images',{method:'POST',credentials:'same-origin',headers:{Accept:'application/json','X-CSRF-TOKEN':ctx.root.dataset.csrf},body});
    let asset;try{asset=await response.json();}catch{throw Error(response.status===413?'The image exceeds the server upload limit.':'Image upload failed (HTTP '+response.status+').');}
    if(!response.ok)throw Error(asset.message||'Image upload failed.');if(!allowed(asset))throw Error('Choose a PNG, JPG or SVG image.');
    assets.push(asset);options();picker.value=asset.id;draw(true);status.textContent='Image imported. Apply to use it in this location.';
   }catch(error){status.textContent=error.message;}finally{busy=false;picker.disabled=false;}};
   return {value(){if(busy)throw Error('Wait for the image import to finish.');if(!picker.value)throw Error('Choose a background image.');return {image:picker.value,x:U.numberValue(x),y:U.numberValue(y),w:U.numberValue(w),h:U.numberValue(h),opacity:U.numberValue(opacity)/100,locked:locked.checked};}};
  },controls=>{if(S.map?.id!==mapId)throw Error('Return to the original plan.');const value=controls.value();M.validateBackground(value);if(!mutate(()=>M.location(S.map,floorId).background=value))throw Error('The background could not be applied.');});
 }
 function start(event,point){const f=floor();if(readOnly||S.tool!=='select'||S.cabling||!f?.background||f.background.locked||!event.target.closest('[data-floor-background]'))return false;event.preventDefault();event.stopImmediatePropagation();S.drag={type:'floor-background',start:point,before:M.clone(S.map),original:M.clone(f.background),floorId:f.id,id:event.pointerId};svg.setPointerCapture(event.pointerId);return true;}
 function move(point){const d=S.drag;if(d?.type!=='floor-background')return false;const b=M.location(S.map,d.floorId).background;b.x=M.snap(d.original.x+point.x-d.start.x,S.snap);b.y=M.snap(d.original.y+point.y-d.start.y,S.snap);ctx.renderCanvas();return true;}
 return {open,render,start,move,floor};
};
})(window);
