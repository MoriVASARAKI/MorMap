/* MorMap output layout. All paper measurements are millimetres. */
(function(root){
'use strict';
const PAPERS={A0:[841,1189],A1:[594,841],A2:[420,594],A3:[297,420],A4:[210,297],A5:[148,210],Letter:[215.9,279.4],Legal:[215.9,355.6],Tabloid:[279.4,431.8]};
const finite=(value,label,min,max)=>{const n=Number(value);if(!Number.isFinite(n)||n<min||n>max)throw Error(`${label} must be between ${min} and ${max}.`);return n;};
function region(value){return {x:finite(value.x,'Area X',-100000,100000),y:finite(value.y,'Area Y',-100000,100000),w:finite(value.w,'Area width',.01,200000),h:finite(value.h,'Area height',.01,200000)};}
function layout(area,options={}){
 const r=region(area),paper=options.paper||'A4',custom=paper==='Custom',base=custom?[finite(options.paperWidth,'Paper width',50,2000),finite(options.paperHeight,'Paper height',50,2000)]:PAPERS[paper];if(!base)throw Error('Unknown paper size.');
 let [pw,ph]=base;if(options.orientation==='landscape'&&pw<ph||options.orientation!=='landscape'&&pw>ph)[pw,ph]=[ph,pw];
 const margin=finite(options.margin??10,'Margin',0,100),footer=options.title?10:0,aw=pw-2*margin,ah=ph-2*margin-footer;
 if(aw<10||ah<10)throw Error('Margins leave too little printable space.');
 const mode=options.scaleMode||'fit';let scale;
 if(mode==='fit')scale=Math.min(aw/r.w,ah/r.h);
 else if(mode==='percent')scale=25.4/96*finite(options.percent??100,'Scale (%)',1,10000)/100;
 else if(mode==='ratio'){const unit={px:25.4/96,mm:1,cm:10,m:1000}[options.units||'px'];if(!unit)throw Error('Unknown drawing unit.');scale=unit/finite(options.denominator??100,'Scale denominator',.01,100000);}
 else throw Error('Unknown scale mode.');
 const tile=mode!=='fit'&&options.tile!==false,overlap=tile?finite(options.overlap??5,'Overlap',0,50):0;
 if(overlap>=Math.min(aw,ah)/2)throw Error('Overlap must be smaller than half the printable area.');
 const cols=tile?Math.max(1,Math.ceil((r.w*scale-overlap-1e-8)/(aw-overlap))):1,rows=tile?Math.max(1,Math.ceil((r.h*scale-overlap-1e-8)/(ah-overlap))):1;
 if(cols*rows>200)throw Error('This layout needs more than 200 sheets. Reduce scale or use larger paper.');
 const pages=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
  const sx=r.x+col*(aw-overlap)/scale,sy=r.y+row*(ah-overlap)/scale,w=Math.min(aw/scale,Math.max(.01,r.x+r.w-sx)),h=Math.min(ah/scale,Math.max(.01,r.y+r.h-sy));
  const center=options.center!==false&&cols===1&&rows===1;
  pages.push({row,col,source:{x:sx,y:sy,w,h},x:margin+(center?(aw-w*scale)/2:0),y:margin+(center?(ah-h*scale)/2:0),w:w*scale,h:h*scale});
 }
 return {paperWidth:pw,paperHeight:ph,margin,footer,scale,cols,rows,pages,overlap,clipped:!tile&&(r.w*scale>aw+.01||r.h*scale>ah+.01),area:r};
}
function safeName(name){return String(name||'mormap').replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').trim().slice(0,160)||'mormap';}
function rasterSize(area,dpi=150){const r=region(area),d=finite(dpi,'Resolution',72,600),w=Math.ceil(r.w*d/96),h=Math.ceil(r.h*d/96);if(w*h>64000000||w>16000||h>16000)throw Error('Image export is too large. Reduce DPI or export a smaller area.');return {width:w,height:h};}
const api={PAPERS,region,layout,safeName,rasterSize};if(typeof module!=='undefined')module.exports=api;else root.MorMapOutputModel=api;
})(typeof window==='undefined'?globalThis:window);
