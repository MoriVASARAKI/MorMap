/* Comment markers stay visible; expanded text is readable and movable. */
(function(root){
'use strict';
const NS='http://www.w3.org/2000/svg';
root.MorMapComments=function(svg,{point,editable,commit,render}){
    const entries=new Map(),opened=new Map(),offsets=new Map();let drag=null;
    const element=(tag,attrs,parent,text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
    const lines=text=>String(text).split('\n').flatMap(line=>{const out=[];let chars=Array.from(line);while(chars.length>42){let cut=chars.slice(0,43).lastIndexOf(' ');if(cut<8)cut=42;out.push(chars.splice(0,cut).join(''));if(chars[0]===' ')chars.shift();}out.push(chars.join(''));return out;});
    const api={
        begin(){entries.clear();},
        open(key){opened.set(key,true);},
        draw({key,object,parent,fallback,context=null}){
            if(!object.comment)return;
            const stored=context?object.comment_boxes?.[context]:object.comment_box;
            const position=offsets.get(key)||stored||fallback;
            const record={key,object,context,position};entries.set(key,record);
            const x=position.x,y=position.y,expanded=opened.get(key)===true;
            const g=element('g',{'data-comment-key':key,'data-comment':object.comment,'data-output':expanded?'comment-text':'comment-marker'},parent);
            const marker=element('g',{'data-comment-action':'toggle',tabindex:0,role:'button','aria-label':expanded?'Collapse comment':'Read comment','aria-expanded':String(expanded),style:'cursor:pointer'},g);
            element('rect',{x,y,width:20,height:18,rx:4,fill:'#fff3cc',stroke:'#ad771b','stroke-width':1},marker);
            element('path',{d:`M${x+5} ${y+5}h10m-10 4h10m-10 4h6`,stroke:'#875a12','stroke-width':1.5,fill:'none'},marker);
            element('title',{},marker,expanded?'Collapse comment':'Comment available — click to read');
            if(!expanded)return;
            const rows=lines(object.comment),card=element('g',{'data-comment-action':'move',style:editable()?'cursor:move':'cursor:default'},g),width=290,height=rows.length*16+35;
            element('rect',{x:x+24,y,width,height,rx:5,fill:'#fffdf5',stroke:'#bc944c','stroke-width':1},card);
            element('rect',{x:x+24,y,width,height:25,rx:5,fill:'#fff0c4'},card);
            element('text',{x:x+34,y:y+17,'font-size':11,fill:'#775219','font-weight':600},card,'Comment');
            rows.forEach((line,i)=>element('text',{x:x+34,y:y+43+i*16,'font-size':12,'font-family':'Arial, sans-serif','xml:space':'preserve',fill:'#364852'},card,line));
            const close=element('g',{'data-comment-action':'toggle',tabindex:0,role:'button','aria-label':'Collapse comment',style:'cursor:pointer'},g);
            element('rect',{x:x+width-2,y:y+3,width:22,height:20,rx:3,fill:'#fffdf5'},close);element('text',{x:x+width+9,y:y+17,'font-size':15,'text-anchor':'middle',fill:'#775219'},close,'−');
        }
    };
    function target(event){const n=event.target.closest('[data-comment-key]');return n&&entries.get(n.dataset.commentKey);}
    svg.addEventListener('pointerdown',event=>{
        const r=target(event);if(!r||event.button!==0)return;event.preventDefault();event.stopImmediatePropagation();
        const action=event.target.closest('[data-comment-action]')?.dataset.commentAction;
        if(action==='toggle'){opened.set(r.key,!opened.get(r.key));render();return;}
        if(editable()){drag={record:r,start:point(event),original:{...r.position},id:event.pointerId};svg.setPointerCapture(event.pointerId);}
    },true);
    svg.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;event.preventDefault();event.stopImmediatePropagation();const p=point(event);offsets.set(drag.record.key,{x:Math.max(-99000,Math.min(99000,drag.original.x+p.x-drag.start.x)),y:Math.max(-99000,Math.min(99000,drag.original.y+p.y-drag.start.y))});render();},true);
    function end(event){if(!drag)return;event.stopImmediatePropagation();const r=drag.record,p=offsets.get(r.key);drag=null;offsets.delete(r.key);if(event.type!=='pointercancel'&&p)commit(()=>{if(r.context){r.object.comment_boxes??={};r.object.comment_boxes[r.context]=p;}else r.object.comment_box=p;});else render();}
    svg.addEventListener('pointerup',end,true);svg.addEventListener('pointercancel',end,true);
    svg.addEventListener('keydown',event=>{const r=target(event);if(!r||!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();opened.set(r.key,!opened.get(r.key));render();},true);
    svg.addEventListener('dblclick',event=>{if(target(event)){event.preventDefault();event.stopImmediatePropagation();}},true);
    svg.addEventListener('contextmenu',event=>{const r=target(event);if(!r)return;event.preventDefault();event.stopImmediatePropagation();root.MorMapUI.contextMenu({x:event.clientX,y:event.clientY,items:[{label:opened.get(r.key)?'Collapse comment':'Read comment',action:()=>{opened.set(r.key,!opened.get(r.key));render();}}]});},true);
    return api;
};
})(window);
