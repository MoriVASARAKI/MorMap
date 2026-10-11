/* Accessible, bilingual workspace guides. Guide content is rendered as text. */
(function(root){
'use strict';
const data=root.MorMapHelpContent;if(!data)return;
const scopes=Object.keys(data.workspaces),topics=data.topics,byId=new Map(topics.map(t=>[t.id,t]));
const assetBase=new URL('.',document.currentScript.src).href;
const words={
 en:{title:'Help center',search:'Search all guides, tools or error messages…',clear:'Clear search',about:'About MorMap',topics:'Topics',results:'Search results',none:'No matching topics',try:'Try “ports”, “Format Painter”, “floor” or “import”. Search includes all three guides in English and French.',reset:'Show all topics',read:'min read',next:'Next',previous:'Previous',related:'Related guides',contents:'On this page',note:'Good to know',back:'Back to the guide',footer:'Practical guides for your network workspace',opens:'Opens in a new tab',empty:'Search across all three workspaces',count:'topics',overview:'Start with the essentials, then follow the guide at your own pace.'},
 fr:{title:'Centre d’aide',search:'Rechercher un outil, une tâche ou une erreur…',clear:'Effacer la recherche',about:'À propos de MorMap',topics:'Rubriques',results:'Résultats de recherche',none:'Aucun résultat',try:'Essayez « ports », « Format Painter », « étage » ou « import ». La recherche couvre les trois guides en anglais et français.',reset:'Afficher les rubriques',read:'min de lecture',next:'Suivant',previous:'Précédent',related:'Guides associés',contents:'Dans cette page',note:'Bon à savoir',back:'Retour au guide',footer:'Des guides pratiques pour votre réseau',opens:'S’ouvre dans un nouvel onglet',empty:'Rechercher dans les trois espaces',count:'rubriques',overview:'Commencez par l’essentiel, puis suivez le guide à votre rythme.'}
};
let language='en';try{language=localStorage.getItem('mormap:help-language')==='fr'?'fr':'en';}catch{}
let scope='logical',current='logical-start',query='',about=false,dialog,opener;
const last={logical:'logical-start',physical:'physical-start',library:'asset-start'};
let ui={};
const make=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,action,cls)=>{const b=make('button',text,cls);b.type='button';b.onclick=action;return b;};
const normalize=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const searchText=new Map(topics.map(t=>[t.id,normalize(JSON.stringify([t.tags,t.en,t.fr]))]));
function matches(value){const terms=normalize(value).trim().split(/\s+/).filter(Boolean);return topics.filter(t=>terms.every(term=>searchText.get(t.id).includes(term))).sort((a,b)=>{const score=t=>terms.reduce((sum,x)=>sum+(normalize(t[language].title).includes(x)?4:0),0)+(t.scopes.includes(scope)?1:0);return score(b)-score(a);});}
function icon(name){
 const paths={logical:'M4 4h6v6H4zM15 14h6v6h-6zM7 10v7h8M16 4h5v5h-5zM18 9v5',physical:'M4 21V3h11v18M15 10h5v11M7 7h5M7 11h5M7 15h5M2 21h20',library:'M4 3h14l3 3v15H4zM8 7h5M8 11h9M8 15h9M8 18h5',search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',external:'M14 3h7v7M21 3 11 13M10 4H4v17h17v-6',arrow:'M4 12h16m-6-6 6 6-6 6',book:'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3zM12 6v16'};
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [key,value]of Object.entries({viewBox:'0 0 24 24','aria-hidden':'true',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))svg.setAttribute(key,value);
 const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[name]||paths.book);svg.append(p);return svg;
}
function listFor(value){return topics.filter(t=>t.scopes.includes(value));}
function navigate(id,{focus=true}={}){const topic=byId.get(id);if(!topic)return;if(!topic.scopes.includes(scope))scope=topic.scopes[0];current=id;last[scope]=id;about=false;ui.layout.dataset.topicsOpen='false';draw();if(focus)focusArticle();}
function focusArticle(){ui.article.querySelector('h2')?.focus({preventScroll:true});}
function switchScope(next){scope=next;query='';ui.search.value='';about=false;current=last[scope];ui.layout.dataset.topicsOpen='false';draw();}
function clearSearch(){query='';ui.search.value='';current=last[scope];draw();ui.search.focus();}
function build(){
 dialog=make('dialog',null,'mw-help');dialog.id='mw-help';dialog.setAttribute('aria-labelledby','mw-help-title');
 const head=make('header',null,'mw-help-head'),brand=make('h3'),mark=make('img'),brandText=make('span',null,'mw-help-brand-text');
 mark.src=assetBase+'mormap-logo.svg';mark.alt='MorMap';mark.className='mw-help-full-logo';mark.width=132;mark.height=44;ui.title=make('span');ui.title.id='mw-help-title';brandText.append(mark,ui.title);brand.append(brandText);
 ui.about=button('',()=>{about=!about;ui.layout.dataset.topicsOpen='false';draw();focusArticle();},'mw-help-about-button');
 const languageLabel=make('label',null,'mw-help-language');ui.language=make('select');ui.language.setAttribute('aria-label','Help language');
 for(const [v,label]of [['en','English'],['fr','Français']]){const option=make('option',label);option.value=v;ui.language.append(option);}ui.language.value=language;languageLabel.append(ui.language);
 const close=button('×',()=>dialog.close(),'mw-help-close');close.setAttribute('aria-label','Close Help');close.title='Close Help';head.append(brand,ui.about,languageLabel,close);
 ui.tabs=make('div',null,'mw-help-tabs');ui.tabs.setAttribute('role','tablist');ui.tabs.setAttribute('aria-label','Workspace guides');
 for(const key of scopes){const tab=button(null,()=>switchScope(key),'mw-help-tab');tab.id='mw-help-tab-'+key;tab.dataset.helpScope=key;tab.setAttribute('role','tab');tab.setAttribute('aria-controls','mw-help-article');tab.append(icon(key),make('span',data.workspaces[key].label));ui.tabs.append(tab);}
 ui.tabs.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const i=scopes.indexOf(scope),next=e.key==='Home'?0:e.key==='End'?scopes.length-1:(i+(e.key==='ArrowLeft'?-1:1)+scopes.length)%scopes.length;switchScope(scopes[next]);ui.tabs.children[next].focus();});
 const searchbar=make('div',null,'mw-help-searchbar'),searchbox=make('div',null,'mw-help-searchbox');ui.menu=button('',()=>{const show=ui.layout.dataset.topicsOpen!=='true';ui.layout.dataset.topicsOpen=String(show);ui.menu.setAttribute('aria-expanded',String(show));if(show)ui.nav.querySelector('button')?.focus();},'mw-help-menu');ui.menu.setAttribute('aria-controls','mw-help-nav');ui.menu.setAttribute('aria-expanded','false');
 ui.search=make('input');ui.search.type='search';ui.search.setAttribute('aria-label','Search Help');ui.search.autocomplete='off';ui.search.spellcheck=false;ui.clear=button('×',clearSearch,'mw-help-clear');searchbox.append(icon('search'),ui.search,ui.clear);ui.searchStatus=make('span',null,'mw-help-search-status');ui.searchStatus.setAttribute('role','status');ui.searchStatus.setAttribute('aria-live','polite');searchbar.append(ui.menu,searchbox,ui.searchStatus);
 ui.layout=make('div',null,'mw-help-layout');ui.layout.dataset.topicsOpen='false';ui.nav=make('nav');ui.nav.id='mw-help-nav';ui.nav.setAttribute('aria-label','Help topics');ui.article=make('article');ui.article.id='mw-help-article';ui.article.tabIndex=-1;ui.layout.append(ui.nav,ui.article);
 const footer=make('footer',null,'mw-help-footer');ui.footer=make('span');footer.append(ui.footer,make('span','MorMap '+data.version));dialog.append(head,ui.tabs,searchbar,ui.layout,footer);
 document.querySelector('.mw-workbench,#mormap-physical,#mormap').append(dialog);
 ui.search.oninput=()=>{query=ui.search.value;about=false;const found=matches(query);if(query.trim()&&!found.some(t=>t.id===current)&&found.length){current=found[0].id;if(!byId.get(current).scopes.includes(scope))scope=byId.get(current).scopes[0];}draw();};
 ui.language.onchange=()=>{language=ui.language.value;try{localStorage.setItem('mormap:help-language',language);}catch{}draw();};
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();dialog.close();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s')e.preventDefault();});
 dialog.addEventListener('close',()=>queueMicrotask(()=>{if(!dialog.open&&opener?.isConnected)opener.focus({preventScroll:true});}));
 root.MorMapUI.makeDraggable(dialog,brand);
}
function heading(text){const h=make('h2',text);h.id='mw-help-article-title';h.tabIndex=-1;return h;}
function renderSection(section,index){
 const box=make('section',null,'mw-help-section');if(section.title){const h=make('h3',section.title);h.id='mw-help-section-'+index;h.tabIndex=-1;box.append(h);}
 for(const text of section.body||[])box.append(make('p',text));
 if(section.steps){const ol=make('ol',null,'mw-help-steps');for(const text of section.steps)ol.append(make('li',text));box.append(ol);}
 if(section.table){const wrap=make('div',null,'mw-help-table-wrap'),table=make('table'),caption=make('caption',section.title,'mw-help-sr-only'),head=make('thead'),row=make('tr'),body=make('tbody');table.append(caption);for(const value of section.table.head){const th=make('th',value);th.scope='col';row.append(th);}head.append(row);for(const values of section.table.rows){const tr=make('tr');values.forEach((value,i)=>{const cell=make(i?'td':'th',value);if(!i)cell.scope='row';tr.append(cell);});body.append(tr);}table.append(head,body);wrap.append(table);box.append(wrap);}
 if(section.note){const callout=make('aside',null,'mw-help-note');callout.append(make('strong',words[language].note),make('p',section.note));box.append(callout);}return box;
}
function renderAbout(){
 const a=data.about[language],w=words[language],hero=make('div',null,'mw-help-about-hero');ui.article.removeAttribute('role');ui.article.setAttribute('aria-labelledby','mw-help-article-title');
 hero.append(make('div','MORMAP · '+w.about.toUpperCase(),'mw-help-eyebrow'),heading(a.title),make('p',a.intro,'mw-help-intro'));
 const identity=make('div',null,'mw-help-identity'),initials=make('span','MV','mw-help-initials'),name=make('div');initials.setAttribute('aria-hidden','true');name.append(make('strong',data.about.name),make('span',a.role));identity.append(initials,name);hero.append(identity);ui.article.append(hero);
 const content=make('div',null,'mw-help-about-content');a.sections.forEach((s,i)=>content.append(renderSection(s,i)));
 const links=make('div',null,'mw-help-contact');for(const [key,label]of [['linkedin',a.linkedinLabel],['github',a.githubLabel]]){const link=make('a',label,'mw-help-contact-link '+(key==='linkedin'?'primary':''));link.href=data.about[key];link.target='_blank';link.rel='noopener noreferrer';link.title=label+' · '+w.opens;link.append(icon('external'));links.append(link);}content.append(links,make('p',a.footer,'mw-help-about-footnote'),button('← '+w.back,()=>{about=false;draw();focusArticle();},'mw-help-back'));ui.article.append(content);
}
function draw(){
 const w=words[language];dialog.lang=language;dialog.dataset.helpScope=scope;dialog.dataset.helpTopic=about?'about':current;dialog.classList.toggle('mw-help-about',about);
 ui.title.textContent=w.title;ui.about.textContent=w.about;ui.about.setAttribute('aria-pressed',String(about));ui.search.placeholder=w.search;ui.clear.hidden=!query;ui.clear.setAttribute('aria-label',w.clear);ui.menu.textContent=w.topics;ui.menu.setAttribute('aria-expanded',ui.layout.dataset.topicsOpen);ui.footer.textContent=w.footer;
 for(const tab of ui.tabs.children){const active=tab.dataset.helpScope===scope;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
 const isSearch=!!query.trim(),found=isSearch?matches(query):listFor(scope);ui.searchStatus.textContent=isSearch?found.length+' '+w.results.toLowerCase():w.empty;
 const navTop=ui.nav.scrollTop;ui.nav.replaceChildren();ui.nav.hidden=about;ui.menu.hidden=about;ui.article.replaceChildren();ui.article.scrollTop=0;
 if(about){renderAbout();return;}
 ui.article.setAttribute('role','tabpanel');ui.article.setAttribute('aria-labelledby','mw-help-tab-'+scope);
 const caption=make('div',null,'mw-help-nav-caption');caption.append(make('strong',isSearch?w.results:data.workspaces[scope].label),make('span',found.length+' '+w.count));ui.nav.append(caption);
 let lastGroup='';for(const topic of found){if(!isSearch&&lastGroup!==topic.group){lastGroup=topic.group;ui.nav.append(make('div',data.groups[lastGroup][language],'mw-help-nav-group'));}const b=button(null,()=>navigate(topic.id),'mw-help-topic');b.dataset.helpTopic=topic.id;b.append(make('span',topic[language].title));if(isSearch)b.append(make('small',topic.scopes.map(s=>data.workspaces[s].label).join(' · ')));if(topic.id===current)b.setAttribute('aria-current','page');ui.nav.append(b);}
 ui.nav.scrollTop=navTop;
 if(!found.length){const empty=make('div',null,'mw-help-empty');empty.append(icon('search'),heading(w.none),make('p',w.try),button(w.reset,clearSearch,'mw-help-reset'));ui.article.append(empty);return;}
 let topic=byId.get(current);if(!found.some(t=>t.id===current)){topic=found[0];current=topic.id;dialog.dataset.helpTopic=current;}
 const c=topic[language],minutes=Math.max(1,Math.ceil(JSON.stringify(c).split(/\s+/).length/190)),meta=make('div',null,'mw-help-meta');meta.append(make('span',data.workspaces[scope].label+' / '+data.groups[topic.group][language]),make('span',minutes+' '+w.read));ui.article.append(meta,heading(c.title),make('p',c.intro,'mw-help-intro'));
 if(topic.id===data.workspaces[scope].start){const welcome=make('div',null,'mw-help-welcome');welcome.append(icon(scope),make('span',data.workspaces[scope].description[language]),make('small',w.overview));ui.article.append(welcome);}
 const sections=c.sections.filter(s=>s.title);if(sections.length>1){const toc=make('nav',null,'mw-help-toc');toc.setAttribute('aria-label',w.contents);toc.append(make('strong',w.contents));c.sections.forEach((s,i)=>{if(s.title)toc.append(button(s.title,()=>{const target=ui.article.querySelector('#mw-help-section-'+i);target.focus({preventScroll:true});target.scrollIntoView({block:'start'});}));});ui.article.append(toc);}
 c.sections.forEach((s,i)=>ui.article.append(renderSection(s,i)));
 if(topic.related.length){const related=make('section',null,'mw-help-related');related.append(make('h3',w.related));const links=make('div');for(const id of topic.related){const item=byId.get(id);if(!item)continue;links.append(button(item[language].title,()=>{query='';ui.search.value='';navigate(id);}));}related.append(links);ui.article.append(related);}
 const curriculum=listFor(scope),index=curriculum.findIndex(t=>t.id===topic.id),pager=make('nav',null,'mw-help-pager');pager.setAttribute('aria-label',language==='fr'?'Parcourir le guide':'Guide navigation');
 for(const [i,label,dir]of [[index-1,w.previous,'previous'],[index+1,w.next,'next']]){const item=curriculum[i];if(!item)continue;const b=button(null,()=>{query='';ui.search.value='';navigate(item.id);},dir);b.append(make('small',label),make('span',item[language].title),icon('arrow'));pager.append(b);}ui.article.append(pager);
}
function open(workspace){const next=scopes.includes(workspace)?workspace:'logical';if(dialog&&root.MorMapUI.resumeDialog?.(dialog))return;if(dialog?.open){ui.search.focus();return;}opener=document.activeElement;if(!dialog)build();scope=next;current=last[scope];query='';ui.search.value='';about=false;ui.layout.dataset.topicsOpen='false';draw();root.MorMapUI.openDialog(dialog);ui.search.focus();}
document.addEventListener('keydown',e=>{if(e.key==='F1'){e.preventDefault();e.stopImmediatePropagation();open(document.querySelector('.mw-workbench')?.dataset.workspace);}},true);
root.MorMapHelp={open,topics};
})(window);
