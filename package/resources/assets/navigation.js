/* Runs through LibreNMS's existing MenuEntryHook; core templates are not patched. */
(function(){
'use strict';
const script=document.currentScript,endpoint=script?.dataset.publishedUrl;
function mapsMenu(){
    const anchors=document.querySelectorAll('.navbar a, nav a');
    for(const a of anchors){
        const isMaps=a.querySelector('.fa-map, .fa-map-o, .fa-map-marked-alt, .fa-map-location-dot')||/^(maps|cartes)$/i.test(a.textContent.trim());
        if(!isMaps)continue;
        const li=a.closest('li');if(!li)continue;
        const menu=Array.from(li.children).find(e=>e.tagName==='UL'&&e.classList.contains('dropdown-menu'));
        if(menu)return menu;
    }
    return null;
}
function draw(items){
    if(!Array.isArray(items))throw new Error('Unexpected map list.');
    const menu=mapsMenu();
    if(!menu){window.MorMapNavigation={found:false};return false;}
    for(const e of menu.querySelectorAll('[data-mormap-navigation]'))e.remove();
    if(items.length){
        const separator=document.createElement('li');separator.className='divider';separator.setAttribute('role','separator');separator.dataset.mormapNavigation='true';menu.append(separator);
        const header=document.createElement('li');header.className='dropdown-header';const logo=document.createElement('img');logo.src=script?.dataset.logoUrl||endpoint.replace(/\/published$/, '/assets/mormap-logo.svg');logo.alt='MorMap';logo.style.width='120px';logo.style.height='40px';logo.style.objectFit='contain';header.append(logo);header.dataset.mormapNavigation='true';menu.append(header);
        for(const item of items){
            if(!item||typeof item.name!=='string'||typeof item.url!=='string')continue;
            let url;try{url=new URL(item.url,window.location.href);}catch(e){continue;}
            if(url.origin!==window.location.origin)continue;
            const li=document.createElement('li'),link=document.createElement('a');li.dataset.mormapNavigation='true';
            link.href=url.href;const mark=document.createElement('img');mark.src=script?.dataset.iconUrl||script?.dataset.logoUrl;mark.alt='';mark.width=18;mark.height=18;mark.style.cssText='object-fit:contain;vertical-align:middle;margin-right:7px';link.append(mark,document.createTextNode(item.name));li.append(link);menu.append(li);
        }
    }
    window.MorMapNavigation={found:true};return true;
}
async function refresh(){
    if(!endpoint)return false;
    const result=await fetch(endpoint,{credentials:'same-origin',headers:{Accept:'application/json'}});
    if(!result.ok)throw new Error('Cannot refresh the Maps menu.');
    return draw(await result.json());
}
function start(){
    try{draw(JSON.parse(document.getElementById('mormap-navigation-data')?.textContent||'[]'));}catch(e){console.warn('MorMap menu:',e.message);}
    window.MorMapRefreshNavigation=refresh;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
