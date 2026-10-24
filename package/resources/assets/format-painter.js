/* Visual formatting clipboard. Object identities, data and placement never enter it. */
(function(root){
'use strict';
const copy=v=>JSON.parse(JSON.stringify(v)),hex=v=>typeof v==='string'&&/^#[a-f\d]{6}$/i.test(v);
const clamp=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
function appearance(value={},defaults={}){const d={opacity:1,label_size:12,label_color:'#2b465a',label_bold:false,...defaults};return {opacity:clamp(value.opacity??d.opacity,.1,1,d.opacity),label_size:clamp(value.label_size??d.label_size,4,72,d.label_size),label_color:hex(value.label_color)?value.label_color:d.label_color,label_bold:typeof value.label_bold==='boolean'?value.label_bold:d.label_bold};}
function sanitize(data){
 if(!data||typeof data!=='object')return null;
 if(data.type==='object')return {type:'object',style:appearance(data.style)};
 if(data.type==='cable')return {type:'cable',style:{format:(root.MorMapCableStyle||(typeof require==='function'?require('./cable-style.js'):null)).normalize(data.style?.format),color:hex(data.style?.color)?data.style.color:null,...(['right-angle','straight','curved'].includes(data.style?.connector)?{connector:data.style.connector}:{})}};
 if(data.type==='info')return {type:'info',style:{font_size:clamp(data.style?.font_size,4,32,8)}};
 if(data.type==='shape')return {type:'shape',style:shapeStyle(data.style)};
 if(data.type==='location')return {type:'location',style:{color:hex(data.style?.color)?data.style.color:'#c8e8f4'}};
 return null;
}
// Copy visual style only: identity, label text, position and view membership belong to the target.
function shapeStyle(value={}){
 const d=value.drawing||{},l=value.label||{},drawing={opacity:clamp(d.opacity,.05,1,1),corner_radius:clamp(d.corner_radius,0,500,2)};
 for(const [key,choices,fallback]of [['dash',['solid','dashed','dotted'],'solid'],['text_align',['left','center','right'],'left'],['layer',['back','front'],'back']])drawing[key]=choices.includes(d[key])?d[key]:fallback;
 for(const key of ['arrow_start','arrow_end','bold','italic'])drawing[key]=d[key]===true;
 const label={position:['top-left','top-center','top-right','bottom-left','bottom-center','bottom-right','custom'].includes(l.position)?l.position:'top-left',x:clamp(l.x,-100000,100000,8),y:clamp(l.y,-100000,100000,-8),font_size:clamp(l.font_size,8,160,20),color:hex(l.color)?l.color:'#294d63',bold:l.bold===true};
 return {fill:hex(value.fill)?value.fill:'none',stroke:hex(value.stroke)?value.stroke:'#5e7890',stroke_width:clamp(value.stroke_width,0,20,2),font_size:clamp(value.font_size,8,160,20),drawing,label};
}
function applyShape(target,value){const style=shapeStyle(value),text=target.label?.text||'';Object.assign(target,{fill:style.fill,stroke:style.stroke,stroke_width:style.stroke_width,font_size:style.font_size});target.drawing={...target.drawing,...style.drawing};target.label={...target.label,...style.label,text};}
function controls(parent,{format={},image,label='Equipment'}){
 const U=root.MorMapUI,style=appearance(format),make=(tag,props={})=>Object.assign(document.createElement(tag),props),box=make('div',{className:'mm-object-format'}),preview=make('div',{className:'mm-object-preview'}),img=make('img',{src:image||'',alt:''}),caption=make('span',{textContent:label}),fields=make('div',{className:'mm-format-grid'});if(image)preview.append(img);preview.append(caption);box.append(preview,fields);parent.append(box);
 const field=(text,props)=>{const label=make('label'),span=make('span',{textContent:text}),input=make('input',props);input.setAttribute('aria-label',text);U.numberInput(input);label.append(span,input);fields.append(label);return input;};
 const opacity=field('Image opacity (%)',{type:'number',min:10,max:100,step:'any',value:style.opacity*100,required:true}),size=field('Label size (px)',{type:'number',min:4,max:72,step:'any',value:style.label_size,required:true}),color=field('Label color',{type:'color',value:style.label_color}),bold=field('Bold label',{type:'checkbox',checked:style.label_bold});
 const value=()=>appearance({opacity:U.numberValue(opacity)/100,label_size:U.numberValue(size),label_color:color.value,label_bold:bold.checked});
 const draw=()=>{const v=value();img.style.opacity=v.opacity;caption.style.fontSize=v.label_size+'px';caption.style.color=v.label_color;caption.style.fontWeight=v.label_bold?'700':'400';};box.addEventListener('input',draw);draw();return {value};
}
function create({root:host,button,scope='',getSelection,getTargets=()=>[getSelection()],apply,applyMany,notice,enabled=()=>true,onStart=()=>{}}){
 if(!button)return {active:()=>false,recent:()=>false,cancel(){},refresh(){},paint:()=>false,copy:()=>false,items:()=>[]};
 const toast=document.createElement('div');toast.className='mm-painter-status';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');host.append(toast);let toastTimer;const tell=text=>{if(toastTimer)root.clearTimeout?.(toastTimer);toast.textContent=text;toast.hidden=false;if(!armed)toastTimer=root.setTimeout?.(()=>toast.hidden=true,4000);};
 const storageKey='mormap-format-painter:'+scope;let clipboard=null,alternates=[],armed=false,locked=false,picking=false,lastAction=0,paintedAt=0;
 try{const old=JSON.parse(root.sessionStorage.getItem(storageKey));clipboard=sanitize(old?.clipboard);alternates=(Array.isArray(old?.alternates)?old.alternates:[]).map(sanitize).filter(Boolean);armed=!!clipboard&&old?.armed===true;locked=armed&&old?.locked===true;}catch{}
 const persist=()=>{try{root.sessionStorage.setItem(storageKey,JSON.stringify({clipboard,alternates,armed,locked}));}catch{}};
 const formats=()=>[clipboard,...alternates].filter(Boolean);
 const sourceHint=()=>{const cable=formats().find(v=>v.type==='cable');return cable?'Cable style · '+(cable.style.connector||'current connector')+' · '+(cable.style.color||'automatic color')+' · '+Number((cable.style.format.width*.75).toFixed(2))+' pt · corners '+cable.style.format.rounding+' px. '+(clipboard.type==='info'?'Info text style is also available. ':''):'';};
 function refresh(){button.disabled=!enabled();button.classList.toggle('active',armed);button.setAttribute('aria-pressed',String(armed));button.setAttribute('data-locked',String(locked));button.setAttribute('data-picking-source',String(picking));host.classList.toggle('mm-painting',armed&&enabled());button.title=picking?'Format Painter: choose the source, then the target.':armed?(locked?'Format Painter: multiple targets. Escape to stop.':'Format Painter: click a matching target. Escape to stop.'):'Copy formatting. Double-click for multiple targets. Ctrl+Shift+C / Ctrl+Shift+V.';}
 function cancel(){armed=locked=picking=false;toast.hidden=true;persist();refresh();}
 function take(target=getSelection(),multiple=false,arm=true){if(!enabled())return false;const data=sanitize(target?.format);if(!data){if(!arm){tell('Select a source to copy its formatting.');return false;}armed=picking=true;locked=multiple;onStart();refresh();tell('Format Painter · click the source, then a matching target · Escape to stop.');return true;}clipboard=data;alternates=(target?.alternateFormats||[]).map(sanitize).filter(v=>v&&v.type!==data.type);picking=false;armed=arm;locked=arm&&multiple;onStart();persist();refresh();tell(sourceHint()+(arm?'Format Painter · '+(locked?'click matching targets; Escape stops.':'click a matching target. Double-click the brush to keep painting; Escape stops.'):'Formatting copied. Select matching targets and press Ctrl+Shift+V.'));return true;}
 function paint(target,force=false){if((!armed&&!force)||!enabled())return false;if(picking)return take(Array.isArray(target)?target[0]:target,locked);if(!clipboard){tell('Copy formatting from a source first.');return true;}const targets=Array.isArray(target)?target:[target],format=formats().find(f=>targets.some(t=>t?.format?.type===f.type)),candidates=targets.filter(t=>format&&t?.format?.type===format.type);if(!candidates.length){tell('Choose a matching '+formats().map(f=>f.type).join(' or ')+' target. Escape cancels Format Painter.');return true;}const applied=candidates.length>1&&applyMany?applyMany(candidates,copy(format.style)):candidates.every(t=>apply(t,copy(format.style))!==false);if(applied===false)return true;paintedAt=Date.now();if(armed&&!locked)cancel();else{persist();refresh();}tell('Formatting applied. '+(armed?'Choose another target; Escape stops.':'Save to keep the change.'));return true;}
 button.addEventListener('click',event=>{if(event.detail>1)return;lastAction=Date.now();if(armed)cancel();else take();});
 button.addEventListener('dblclick',event=>{event.preventDefault();if(picking){locked=true;refresh();return;}if(!clipboard||Date.now()-lastAction>600){take(undefined,true);return;}armed=locked=true;onStart();persist();refresh();tell(sourceHint()+'Format Painter · multiple targets · Escape to stop.');});
 document.addEventListener('keydown',event=>{if(!enabled()||event.defaultPrevented||event.target.closest?.('input,select,textarea,[contenteditable=true],dialog'))return;const key=event.key.toLowerCase();if(event.key==='Escape'&&armed){event.preventDefault();cancel();return;}if(!(event.ctrlKey||event.metaKey)||!event.shiftKey)return;if(key==='c'){event.preventDefault();take(undefined,false,false);}else if(key==='v'){event.preventDefault();paint(getTargets(),true);}});
 const items=target=>[{label:'Format Painter',group:'Appearance',action:()=>take(target)},{label:'Paste formatting',group:'Appearance',disabled:!formats().some(f=>f.type===target?.format?.type),action:()=>paint(target,true)}];
 refresh();return {active:()=>armed&&enabled(),recent:()=>Date.now()-paintedAt<450,cancel,refresh,paint,copy:take,items,kind:()=>clipboard?.type,picking:()=>picking};
}
const api={appearance,sanitize,shapeStyle,applyShape,controls,create};if(typeof module!=='undefined')module.exports=api;else root.MorMapFormatPainter=api;
})(typeof window==='undefined'?globalThis:window);
