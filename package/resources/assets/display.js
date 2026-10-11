/* MorMap presentation helpers; status is last-polled LibreNMS data, not power sensing. */
(function(root){
'use strict';
const DEFAULT_CANVAS=Object.freeze({width:1920,height:1080});
const palette={up:'#08a84f',down:'#d93443',disabled:'#7b8794',unknown:'#7b8794'};
const flag=v=>v===true||v===1||v==='1';
function canvas(value){
    const w=Number(value?.width),h=Number(value?.height);
    return Number.isInteger(w)&&w>=320&&w<=16384&&Number.isInteger(h)&&h>=240&&h<=16384?{width:w,height:h}:{...DEFAULT_CANVAS};
}
function device(record){
    if(!record)return {key:'unknown',label:'UNKNOWN',color:palette.unknown};
    if(flag(record.disabled))return {key:'disabled',label:'DISABLED',color:palette.disabled};
    if(!record.last_polled||String(record.last_polled).startsWith('0000-'))return {key:'unknown',label:'UNKNOWN',color:palette.unknown};
    if(flag(record.status))return {key:'up',label:'UP',color:palette.up};
    if(record.status===false||record.status===0||record.status==='0')return {key:'down',label:'DOWN',color:palette.down};
    return {key:'unknown',label:'UNKNOWN',color:palette.unknown};
}
function port(record,deviceRecord){
    const d=device(deviceRecord),raw=String(record?.ifOperStatus||'unknown').toLowerCase();
    if(d.key!=='up')return {key:'unknown',label:'UNKNOWN',color:palette.unknown,detail:`Device ${d.label}; last port state: ${raw.toUpperCase()}`};
    if(!record)return {key:'unknown',label:'UNKNOWN',color:palette.unknown,detail:'No port status returned'};
    if(String(record.ifAdminStatus).toLowerCase()==='down')return {key:'disabled',label:'ADMIN DOWN',color:palette.unknown,detail:'Administratively down'};
    const key=raw==='up'?'up':raw==='down'?'down':'unknown';
    return {key,label:key.toUpperCase(),color:palette[key],detail:'Last polled state: '+raw.toUpperCase()};
}
function pageView(size,width,height){
    const c=canvas(size),ratio=Math.max(c.width/Math.max(width,1),c.height/Math.max(height,1));
    return {x:(c.width-width*ratio)/2,y:(c.height-height*ratio)/2,w:width*ratio,h:height*ratio};
}
function anchorRadius(node){return Math.min(node.w,node.h)/28;}
function portMarker(parent,{x,y,r,color,shape}){
 const half=r*1.3;for(const [extra,opacity]of [[r*.28,.12],[r*.12,.25]])parent.append(shape('rect',{x:x-half-extra,y:y-half-extra,width:2*(half+extra),height:2*(half+extra),rx:r*.15,fill:color,opacity,'pointer-events':'none','data-marker':'edge'}));
 parent.append(shape('rect',{x:x-half,y:y-half,width:half*2,height:half*2,rx:r*.1,fill:color,stroke:'#fff','stroke-width':r*.16,'pointer-events':'none','data-marker':'dot'}));
}
function deviceHint(record){return `System Name: ${record?.sysName||'Unavailable'}\nResolved IP: ${record?.resolved_ip||'Unavailable'}`;}
const api={DEFAULT_CANVAS,canvas,device,port,pageView,palette,anchorRadius,portMarker,deviceHint};
if(typeof module!=='undefined')module.exports=api;else root.MorMapDisplay=api;
})(typeof window==='undefined'?globalThis:window);
