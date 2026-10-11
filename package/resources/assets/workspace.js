/* Shared workspace state, collapsible panels and reusable image selection. */
(function (root) {
'use strict';
const U = root.MorMapUI, h = (tag, text, attrs = {}) => {
    const n = document.createElement(tag); if (text != null) n.textContent = text;
    Object.assign(n, attrs); return n;
};
U.memory = function (element, workspace) {
    const base = element.dataset.shared || element.dataset.base;
    const key = 'mormap:workspace:v1:' + base + ':' + (element.dataset.user || 'session') + ':' + workspace;
    let fallback = {};
    return {
        get() { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch (_) { return fallback; } },
        set(value) { fallback = value; try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }
    };
};
U.panel = function (panel, toggle, close, label, initiallyOpen = true) {
    panel.hidden = false;
    panel.classList.add('mm-sliding-panel');
    const tab = h('button', label, {type:'button', className:'mm-panel-tab', title:'Expand ' + label});
    tab.setAttribute('aria-label', 'Expand ' + label); panel.append(tab);
    const set = open => {
        panel.classList.toggle('mm-panel-collapsed', !open);
        toggle?.setAttribute('aria-expanded', String(open));
        toggle?.setAttribute('aria-pressed', String(open));
        for (const child of panel.children) if (child !== tab) child.inert = !open;
    };
    tab.onclick = () => set(true); if (close) { close.textContent = '›'; close.title = 'Collapse ' + label; close.onclick = () => set(false); }
    if (toggle) toggle.onclick = () => set(panel.classList.contains('mm-panel-collapsed'));
    set(initiallyOpen); return {set, isOpen:()=>!panel.classList.contains('mm-panel-collapsed')};
};
U.assetPicker = function (parent, assets, initial = '', onChange = () => {}) {
    const wrap = h('section', null, {className:'mm-asset-picker'}), title = h('label','Device Image');
    const controls = h('div', null, {className:'mm-asset-controls'}), tabs = h('div', null, {className:'mm-asset-tabs'});
    tabs.setAttribute('role','group'); tabs.setAttribute('aria-label','Asset category');
    const search = h('input', null, {type:'search',placeholder:'Search images, vendors or models'}); search.setAttribute('aria-label','Search device images');
    const grid = h('div',null,{className:'mm-asset-grid'}), info = h('small','');
    controls.append(tabs, search); wrap.append(title, controls, grid, info); parent.append(wrap);
    let category='stencil', value=initial; const buttons=[];
    const picker = {get value(){return value;}, select(id){value=id;draw();onChange(assets.find(a=>a.id===value));}};
    for (const [key,label] of [['all','All'],['image','Images'],['logo','Logos'],['stencil','Vectors']]) {
        const b=h('button',label,{type:'button'}); b.dataset.assetCategory=key;
        b.onclick=()=>{category=key;draw();}; tabs.append(b); buttons.push([key,b]);
    }
    function draw(){
        const q=search.value.trim().toLowerCase();
        for(const [key,b] of buttons){b.classList.toggle('active',key===category);b.setAttribute('aria-pressed',String(key===category));}
        const list=assets.filter(a=>(category==='all'||a.kind===category)&&((a.name||'')+' '+(a.source||'')).toLowerCase().includes(q));
        grid.replaceChildren();
        for(const a of list){const b=h('button',null,{type:'button',className:'mm-asset-card',title:a.name});b.dataset.assetId=a.id;b.classList.toggle('active',a.id===value);b.append(h('img',null,{src:a.url,alt:'',loading:'lazy'}),h('span',a.name));b.onclick=()=>picker.select(a.id);grid.append(b);}
        const selected=assets.find(a=>a.id===value);info.textContent=list.length+' assets'+(selected?' · Selected: '+selected.name:'');
        if(!list.length)grid.append(h('p','No matching assets in this category.'));
    }
    search.oninput=draw;draw();return picker;
};
/* Dialog collapse releases the modal backdrop while retaining entered values. */
const openDialog=U.openDialog, dialogStates=new WeakMap();
U.resumeDialog=dialog=>{if(!dialog?.classList.contains('mm-window-minimized'))return false;dialog.querySelector('.mm-window-collapse')?.click();return true;};
U.openDialog=function(dialog){
    let state=dialogStates.get(dialog);
    if(!state){state={minimized:false};dialogStates.set(dialog,state);dialog.addEventListener('submit',event=>{
        if(state.owner && state.owner.dataset.mapId!==state.mapId){event.preventDefault();event.stopImmediatePropagation();const error=dialog.querySelector('[role=alert]');if(error)error.textContent='Return to the original map before applying these changes.';}
    },true);}
    if(state.minimized){dialog.classList.remove('mm-window-minimized');state.minimized=false;dialog.close();}
    const owner=dialog.closest('[data-base]')||document.querySelector('[data-base]');state.owner=owner;state.mapId=owner?.dataset.mapId;
    const title=dialog.querySelector('h3,h2');
    if(title&&!title.querySelector('.mm-window-collapse')){
        const button=h('button','−',{type:'button',className:'mm-window-collapse',title:'Minimize window'});button.setAttribute('aria-label','Minimize window');
        button.onclick=()=>{
            if(state.minimized){dialog.classList.remove('mm-window-minimized');state.minimized=false;button.textContent='−';button.title='Minimize window';button.setAttribute('aria-label',button.title);dialog.close();openDialog(dialog);if(state.expandedPosition)U.positionDialog(dialog,state.expandedPosition.x,state.expandedPosition.y);}
            else{const expanded=dialog.getBoundingClientRect();state.expandedPosition={x:expanded.left,y:expanded.top};state.minimized=true;button.textContent='□';button.title='Restore window';button.setAttribute('aria-label',button.title);dialog.close();dialog.classList.add('mm-window-minimized');dialog.show();const bounds=state.owner?.querySelector('.mm-workspace,.mp-workspace,.ml-layout')?.getBoundingClientRect(),size=dialog.getBoundingClientRect();U.positionDialog(dialog,(bounds?.left??0)+8,(bounds?.bottom??root.innerHeight)-size.height-8);}
        };title.append(button);
    }
    openDialog(dialog);
};
})(window);
