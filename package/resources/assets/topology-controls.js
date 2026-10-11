(function(root){
'use strict';
const T=root.MorMapTopology,U=root.MorMapUI;
const el=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;Object.assign(n,attrs);return U.numberInput(n);};
function field(parent,label,input){const wrap=el('label',null,{className:'mt-field'});wrap.append(el('span',label),input);input.setAttribute('aria-label',label);parent.append(wrap);return input;}
function select(parent,label,options,value){const input=el('select',null);for(const [v,text]of options)input.append(el('option',text,{value:v}));input.value=value;return field(parent,label,input);}
function mode(parent,onchange){
 const box=el('div',null,{className:'mt-device-mode'}),type=select(box,'Device mode',[['standalone','Standalone'],['stack','Stack'],['lag','Bond / LAG'],['team','NIC Team']],'standalone'),member=field(box,'Stack member',el('input',null,{type:'number',min:1,max:64,step:1,value:1})),scope=select(box,'Interface scope',[['member','Member interfaces'],['all','All unassigned interfaces']],'member');parent.append(box);
 let previous;const refresh=()=>{member.parentElement.hidden=scope.parentElement.hidden=type.value!=='stack';member.disabled=scope.disabled=type.value!=='stack';const next=[type.value,member.value,scope.value].join('|');if(next===previous)return;previous=next;if(type.value==='stack'&&(!Number.isInteger(Number(member.value))||Number(member.value)<1||Number(member.value)>64))return;onchange?.();};type.onchange=member.onchange=scope.onchange=refresh;refresh();
 return {type,member,scope,get value(){return type.value;},get number(){const n=U.numberValue(member);if(type.value==='stack'&&(!Number.isInteger(n)||n<1||n>64))throw Error('Stack member must be 1–64.');return n;},device(id){return {device_id:Number(id),...(type.value==='stack'?{stack_member:this.number}:{})};},isGroup(){return ['lag','team'].includes(type.value);}};
}
function groups(parent,{device,graph,ports,type='lag'}){
 let draft=JSON.parse(JSON.stringify(T.groups(graph,device))),active=null;
 const list=el('select',null,{size:5,className:'mt-groups-list'}),toolbar=el('div',null,{className:'mt-actions'}),add=el('button','New group',{type:'button'}),remove=el('button','Delete group',{type:'button'});toolbar.append(add,remove);parent.append(el('p','Define the member interfaces once for both map workspaces. Every physical member keeps its own cable and monitoring state.'),list,toolbar);
 const form=el('div',null,{className:'mt-grid'});parent.append(form);
 const name=field(form,'Group name',el('input',null,{maxLength:120})),kind=select(form,'Group type',[['lag','Bond / LAG'],['team','NIC Team']],type),strategy=select(form,'Aggregation mode',[['unknown','Not specified'],['lacp','LACP / 802.3ad'],['static','Static aggregation'],['active-backup','Active / backup'],['switch-independent','Switch independent']],'unknown');
 const options=ports.map(p=>[T.port(p),p.ifName||p.label||p.ifDescr||T.port(p)]),aggregate=select(form,'Monitored aggregate interface',[['','None — member status only'],...options],'');
 const search=field(parent,'Filter member ports',el('input',null,{type:'search',placeholder:'Interface name'})),members=el('div',null,{className:'mt-port-checks'});parent.append(members);const checks=[];
 for(const p of ports){const label=p.ifName||p.label||p.ifDescr||T.port(p),check=el('input',null,{type:'checkbox',value:T.port(p)}),row=el('label',null);row.append(check,el('span',label));members.append(row);checks.push({check,row,label});}
 function commit(){if(!active)return;Object.assign(active,{name:name.value.trim(),type:kind.value,mode:strategy.value,aggregate:aggregate.value||null,ports:checks.filter(v=>v.check.checked).map(v=>v.check.value)});}
 function draw(){list.replaceChildren();for(const g of draft)list.append(el('option',g.name||'New group',{value:g.id}));list.value=active?.id||'';form.hidden=members.hidden=search.parentElement.hidden=!active;remove.disabled=!active;if(active){name.value=active.name;kind.value=active.type;strategy.value=active.mode;aggregate.value=active.aggregate||'';for(const v of checks)v.check.checked=active.ports.includes(v.check.value);}}
 list.onchange=()=>{commit();active=draft.find(g=>g.id===list.value);draw();};add.onclick=()=>{commit();active={id:T.uuid(),name:type==='team'?'Team'+draft.length:'Port-channel'+(draft.length+1),type,mode:'unknown',ports:[],aggregate:null};draft.push(active);draw();name.focus();};remove.onclick=()=>{draft=draft.filter(g=>g!==active);active=draft[0]||null;draw();};search.oninput=()=>{for(const v of checks)v.row.hidden=!v.label.toLowerCase().includes(search.value.toLowerCase());};
 if(!draft.length)add.onclick();else{active=draft[0];draw();}
 return {value(){commit();const used=new Set(),names=new Set();for(const g of draft){if(!g.name)throw Error('Enter a group name.');if(names.has(g.name.toLowerCase()))throw Error('Group names must be unique.');names.add(g.name.toLowerCase());if(!g.ports.length)throw Error('Select at least one member interface.');if(g.aggregate&&g.ports.includes(g.aggregate))throw Error('The aggregate interface cannot also be a member.');for(const p of g.ports){if(used.has(p))throw Error('An interface can belong to one aggregation group.');used.add(p);}}return draft;}};
}
function cable(parent,cable){
 const grid=el('div',null,{className:'mt-grid'});parent.append(grid);
 const name=field(grid,'Cable label',el('input',null,{value:cable.name||'',maxLength:120})),kind=select(grid,'Cable type',[['cable','Cable'],['copper','Copper'],['fiber','Fibre'],['power','Power'],['building','Inter-building'],['backbone','Backbone'],['stack','Stack']],cable.kind||'cable'),comment=field(parent,'Comment',el('textarea',null,{value:cable.comment||'',maxLength:4000,rows:3}));
 const specs=el('fieldset',null,{className:'mt-grid'});specs.append(el('legend','Cable specifications'));parent.append(specs);const values={},m=cable.media||{};
 for(const [key,label,max]of [['reference','Cable reference',120],['fiber_type','Fibre type (OS2 / OM3 / OM4)',40],['connector','Connector (LC / SC / MPO)',80],['fiber_pair','Fibre pair / strand IDs',80],['port_group','Port group / cassette',80],['polarity','Polarity (A–B / A–A / mapped)',80]])values[key]=field(specs,label,el('input',null,{value:m[key]||'',maxLength:max}));
 for(const [key,label]of [['strands','Total strands'],['used_strands','Used strands'],['reserved_strands','Reserved strands'],['length_m','Length (m)']])values[key]=field(specs,label,el('input',null,{type:'number',min:0,max:key==='length_m'?10000000:10000,step:key==='length_m'?'any':1,value:m[key]||0}));
 values.route=field(specs,'Route / patch-panel terminations',el('textarea',null,{value:m.route||'',maxLength:2000,rows:3}));
 function refresh(){specs.hidden=!['fiber','building','stack','backbone'].includes(kind.value);}kind.onchange=refresh;refresh();
 return {value(){const media={};for(const [k,v]of Object.entries(values))media[k]=v.type==='number'?U.numberValue(v):v.value.trim();if(media.used_strands+media.reserved_strands>media.strands)throw Error('Used and reserved strands exceed cable capacity.');const out={name:name.value.trim(),kind:kind.value,comment:comment.value};if(!specs.hidden||cable.media)out.media=media;return out;}};
}
root.MorMapTopologyControls={mode,groups,cable};
})(window);
