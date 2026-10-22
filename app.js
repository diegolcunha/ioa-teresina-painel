import {API_BASE} from './api-config.mjs?v=1792704048712';
import {statusLabel,statusOptions,matchesStatus,matchesSelection,statusSummary} from './status-display.mjs';
const $=s=>document.querySelector(s);let records=[],groups=[],page=1,selected=null;
if(API_BASE){$('#direct-access-link').href=API_BASE;$('#direct-access').hidden=false;}
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const money=n=>n===null||n===undefined?'Não informado':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=s=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'Não informada';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){
 let token;try{token=sessionStorage.getItem('ioa_session_token');}catch{}
 const headers={...(body?{'Content-Type':'application/json'}:{}),...(API_BASE&&token?{Authorization:'Bearer '+token}:{})};
 let res;try{res=await fetch(API_BASE+'/api/'+path,{method:body?'POST':'GET',headers,credentials:API_BASE?'omit':'same-origin',body:body?JSON.stringify(body):undefined});}catch{throw Error('Servidor indisponível. Verifique se o PC e a conexão pública do painel estão ligados.');}
 const value=await res.json();
 if(!res.ok){if(res.status===401&&path!=='login'){try{sessionStorage.removeItem('ioa_session_token');}catch{}showLogin();}throw Error(value.error||'Falha na operação');}
 if(path==='login'&&value.sessionToken){try{sessionStorage.setItem('ioa_session_token',value.sessionToken);}catch{throw Error('Permita armazenamento nesta aba para entrar no painel.');}}
 if(path==='logout'){try{sessionStorage.removeItem('ioa_session_token');}catch{}}
 return value;
}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;setTimeout(()=>$('#toast').hidden=true,6000);}
function showLogin(){records=[];groups=[];$('#cards').replaceChildren();$('#detail-content').replaceChildren();$('#contact-dialog').close();$('#contact-edit-form').reset();$('#detail').close();$('#users-list').replaceChildren();$('#history-list').replaceChildren();$('#user-form').reset();$('#dashboard').hidden=true;$('#login').hidden=false;}
function badge(value,field){value=statusLabel(field,value);const v=normalize(value);const tone=['adimplente','assinado'].includes(v)?'green':(/inadimplente|atraso|nao assinado|parcial/.test(v)?'red':'');return `<span class="badge ${tone}">${escape(value)}</span>`;}
function filterValues(id){return [...$('#'+id).selectedOptions].map(option=>option.value).filter(Boolean);}
function setupMultiFilter(id){
 const select=$('#'+id);select.multiple=true;select.hidden=true;
 let field=select.parentElement;
 if(field.tagName==='LABEL'){
  const replacement=document.createElement('div');replacement.className='filter-field';
  while(field.firstChild)replacement.append(field.firstChild);
  field.replaceWith(replacement);field=replacement;
 }
 field.querySelector('.multi-filter')?.remove();
 const caption=field.querySelector('span').textContent;
 const dropdown=document.createElement('details');dropdown.className='multi-filter';
 const summary=document.createElement('summary');summary.id=id+'-summary';
 const menu=document.createElement('div');menu.className='multi-options';menu.setAttribute('role','group');menu.setAttribute('aria-label',caption);
 const options=[...select.options];
 for(const option of options){
  const label=document.createElement('label'),checkbox=document.createElement('input'),text=document.createElement('span');
  checkbox.type='checkbox';checkbox.value=option.value;checkbox.setAttribute('aria-label',option.textContent);text.textContent=option.textContent;label.append(checkbox,text);menu.append(label);
  checkbox.addEventListener('change',()=>{
   const values=new Set(filterValues(id));
   if(!option.value)values.clear();else if(checkbox.checked)values.add(option.value);else values.delete(option.value);
   for(const item of select.options)item.selected=item.value?values.has(item.value):values.size===0;
   update();select.dispatchEvent(new Event('change',{bubbles:true}));
  });
 }
 function update(){
  const values=filterValues(id),labels=options.filter(o=>values.includes(o.value)).map(o=>o.textContent);
  summary.textContent=labels.length===0?options[0].textContent:labels.length===1?labels[0]:labels.length+' selecionados';
  summary.setAttribute('aria-label',caption+': '+summary.textContent);summary.title=labels.join(', ')||options[0].textContent;
  for(const checkbox of menu.querySelectorAll('input'))checkbox.checked=checkbox.value?values.includes(checkbox.value):values.length===0;
 }
 dropdown.append(summary,menu);field.append(dropdown);update();
 dropdown.addEventListener('toggle',()=>{if(dropdown.open)for(const other of document.querySelectorAll('.multi-filter'))if(other!==dropdown)other.open=false;});
 dropdown.addEventListener('keydown',event=>{if(event.key==='Escape'){dropdown.open=false;summary.focus();}});
}
document.addEventListener('click',event=>{for(const dropdown of document.querySelectorAll('.multi-filter'))if(!dropdown.contains(event.target))dropdown.open=false;});
async function load(user){
 const source=await api('students');records=source.records;const byId=new Map();for(const r of records){if(!byId.has(r.ID_CLIENTE))byId.set(r.ID_CLIENTE,{id:r.ID_CLIENTE,name:r.NOME,links:[]});byId.get(r.ID_CLIENTE).links.push(r);}groups=[...byId.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 const products=source.products||records.map(r=>({id:r.key,studentId:r.ID_CLIENTE,name:r.CURSO_AJUSTADO,memberKeys:[r.key],consolidated:false,warnings:[]}));
 const recordMap=new Map(records.map(r=>[r.key,r]));for(const g of groups)g.products=products.filter(p=>p.studentId===g.id).map(p=>({...p,members:p.memberKeys.map(key=>recordMap.get(key))}));
 $('#user-label').textContent=user.username;$('#nav-settings').hidden=!user.admin;showView('students');$('#source-date').textContent=date(source.date);$('#source-file').textContent=source.filename||'Nenhuma fonte importada';
 for(const [id,field] of [['course','CURSO_AJUSTADO'],['finance','STATUS_FINANCEIRO'],['contract','TEM_CONTRATO'],['academic-status','STATUS']]){const select=$('#'+id);select.length=1;for(const value of (field==='CURSO_AJUSTADO'?[...new Set(products.map(p=>p.name))].sort():statusOptions(field,records))){const option=new Option(value,value);select.add(option);}setupMultiFilter(id);}
 const charts=[
  {field:'STATUS',title:'Status Acadêmico',colors:['blue','green','teal','red','orange','gray']},
  {field:'STATUS_FINANCEIRO',title:'Status Financeiro',colors:['red','green','orange','gray']},
  {field:'TEM_CONTRATO',title:'Status Contrato',colors:['green','teal','orange','red','gray']},
 ];
 $('#metrics').innerHTML=`<p class="overview-note"><strong>${groups.length} alunos</strong> em <strong>${products.length} entradas de produtos</strong>, com <strong>${records.length} registros de origem</strong>. Os gráficos mantêm os status dos registros de origem.</p>`+charts.map(chart=>{
  const summary=statusSummary(chart.field,records).map((item,i)=>({...item,color:chart.colors[i]||'gray'})).sort((a,b)=>b.percent-a.percent);
  return `<section class="status-chart" aria-labelledby="chart-${chart.field}"><header class="status-chart-header"><h2 id="chart-${chart.field}">${chart.title}</h2><span>${records.length} vínculos</span></header><div class="status-chart-rows">${summary.map((item,i)=>{
   const percent=item.percent.toLocaleString('pt-BR',{maximumFractionDigits:1});
   return `<div class="status-chart-row"><div class="status-chart-label"><span>${escape(item.label)}</span><div><strong>${item.count}</strong><small>${percent}%</small></div></div><svg viewBox="0 0 100 7" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="chart-track" width="100" height="7" rx="3.5"/><rect class="chart-${item.color}" width="${item.percent.toFixed(3)}" height="7" rx="3.5"/></svg></div>`;
  }).join('')}</div><p class="status-chart-foot">Quantidade e participação dos vínculos</p></section>`;
 }).join('');page=1;render();$('#login').hidden=true;$('#dashboard').hidden=false;
}
function render(){
 const search=normalize($('#search').value);const filtered=groups.map(g=>{const products=g.products.filter(p=>matchesSelection(p.name,filterValues('course'))&&p.members.some(r=>matchesStatus(r,'STATUS_FINANCEIRO',filterValues('finance'))&&matchesStatus(r,'TEM_CONTRATO',filterValues('contract'))&&matchesStatus(r,'STATUS',filterValues('academic-status'))));return {...g,products,links:products.flatMap(p=>p.members)};}).filter(g=>g.products.length&&normalize(g.name+' '+g.id).includes(search));
 const pages=Math.max(1,Math.ceil(filtered.length/12));page=Math.min(page,pages);$('#result-count').textContent=filtered.length+' alunos encontrados';$('#page-label').textContent=`${page} de ${pages}`;$('#prev').disabled=page===1;$('#next').disabled=page===pages;
 $('#cards').innerHTML=filtered.slice((page-1)*12,page*12).map(g=>{const r=g.links[0];const initials=g.name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('');return `<article class="student"><div class="student-top"><div class="avatar">${escape(initials)}</div><div><h3>${escape(g.name.toLocaleLowerCase('pt-BR'))}</h3><span class="id">ID ${escape(g.id)} · ${g.products.length} produto(s) no filtro</span></div></div><p class="course-name">${escape([...new Set(g.products.map(p=>p.name))].join(" · "))}</p><div class="badges">${g.products.some(p=>p.consolidated)?'<span class="badge">Produto consolidado · status nos registros</span>':badge(r.STATUS_FINANCEIRO,'STATUS_FINANCEIRO')}${g.products.some(p=>p.consolidated)?'':badge(r.TEM_CONTRATO,'TEM_CONTRATO')}</div><div class="student-bottom"><span>${r.review.checked?'Conferência registrada':'Conferência pendente'}</span><button data-student="${escape(g.id)}">Ver ficha →</button></div></article>`;}).join('')||'<div class="empty">Nenhum aluno encontrado para estes filtros.</div>';
}
function openDetail(id){selected=id;const g=groups.find(g=>g.id===id),primary=g.links[0];$('#detail-content').innerHTML=`<h2 class="detail-title">${escape(g.name)}</h2><p>ID ${escape(id)} · ${g.products.length} produto(s) · ${g.links.length} registro(s) de origem</p><div class="contact-summary"><div><span>E-mail</span><strong data-contact-email>${escape(primary.EMAIL||'Não informado')}</strong></div><div><span>Telefone</span><strong data-contact-phone>${escape(primary.TELEFONE||'Não informado')}</strong></div><button type="button" class="ghost" data-edit-contacts="${escape(id)}">Editar contatos</button></div>`+g.products.map(p=>p.consolidated?`<section class="commercial-product"><h3>${escape(p.name)}</h3><p>${p.durationMonths?p.durationMonths+' meses':'Duração comercial a confirmar'} · ${p.members.length} registros acadêmicos vinculados</p>${p.warnings.map(w=>`<p class="product-warning">${escape(w)}</p>`).join('')}<details><summary>Ver registros acadêmicos, contratos e observações</summary>${p.members.map(r=>renderAcademicLink(r)).join('')}</details><div class="detail-actions"><button type="button" class="close-detail-inline">Fechar a ficha</button></div></section>`:p.members.map(r=>renderAcademicLink(r)).join('')).join('');if(!$('#detail').open)$('#detail').showModal();}
async function saveContacts(form,restore=false){
 const g=groups.find(g=>g.id===form.dataset.contact),r=g.links[0];
 const payload={studentId:g.id,version:r.contact.version};
 if(restore){payload.email=null;payload.phone=null;}else{
  if(form.elements.email.value.trim()!==(r.EMAIL||''))payload.email=form.elements.email.value.trim();
  if(form.elements.phone.value.trim()!==(r.TELEFONE||''))payload.phone=form.elements.phone.value.trim();
  if(!Object.hasOwn(payload,'email')&&!Object.hasOwn(payload,'phone')){$('#contact-error').textContent='Nenhuma alteração nos contatos.';return;}
 }
 const buttons=[...$('#contact-dialog').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);$('#contact-error').textContent='';
 try{
  await api('contacts',payload);
  const fresh=await api('students');
  for(const incoming of fresh.records){const local=records.find(v=>v.key===incoming.key);if(local&&local.ID_CLIENTE===g.id){local.EMAIL=incoming.EMAIL;local.TELEFONE=incoming.TELEFONE;local.contact=incoming.contact;}}
  // Atualiza só os contatos, mantendo textos de observações ainda não salvos.
  form.elements.email.value=r.EMAIL||'';form.elements.phone.value=r.TELEFONE||'';
  $('#detail-content [data-contact-email]').textContent=r.EMAIL||'Não informado';
  $('#detail-content [data-contact-phone]').textContent=r.TELEFONE||'Não informado';
  $('#contact-dialog').close();
  toast(restore?'Contatos da fonte restaurados.':'Contatos salvos para todos os vínculos deste aluno.');
 }catch(error){$('#contact-error').textContent=error.message;}finally{buttons.forEach(b=>b.disabled=false);}
}
$('#detail-content').addEventListener('click',event=>{
 const button=event.target.closest('[data-edit-contacts]');if(!button)return;
 const g=groups.find(g=>g.id===button.dataset.editContacts),r=g.links[0],form=$('#contact-edit-form');
 form.dataset.contact=g.id;form.elements.email.value=r.EMAIL||'';form.elements.phone.value=r.TELEFONE||'';
 $('#contact-student').textContent=g.name;$('#contact-error').textContent='';
 $('#contact-edit-meta').textContent=r.contact.updated?'Última alteração: '+r.contact.author+' · '+timeStamp(r.contact.updated):'Contatos recebidos da VIDA DE ALUNO.';
 $('#contact-dialog').showModal();
});
$('#contact-edit-form').addEventListener('submit',event=>{event.preventDefault();saveContacts(event.currentTarget);});
$('#contact-cancel').onclick=$('#contact-close').onclick=()=>$('#contact-dialog').close();
$('#contact-restore').onclick=()=>saveContacts($('#contact-edit-form'),true);
$('#login-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;$('#login-error').textContent='';try{const user=await api('login',Object.fromEntries(new FormData(form)));form.reset();await load(user);}catch(error){$('#login-error').textContent=error.message;}finally{button.disabled=false;}});
$('#logout').onclick=async()=>{try{await api('logout',{});showLogin();}catch(e){toast(e.message);}};
for(const id of ['search','course','finance','contract','academic-status'])$('#'+id).addEventListener(id==='search'?'input':'change',()=>{page=1;render();});
$('#clear-filters').onclick=()=>{
 $('#search').value='';
 for(const id of ['course','finance','contract','academic-status']){
  const select=$('#'+id);for(const option of select.options)option.selected=!option.value;
  setupMultiFilter(id);
 }
 page=1;render();
};
$('#prev').onclick=()=>{page--;render();};$('#next').onclick=()=>{page++;render();};$('#close-detail').onclick=()=>$('#detail').close();$('#detail-content').addEventListener('click',e=>{if(e.target.closest('.close-detail-inline'))$('#detail').close();});
$('#cards').addEventListener('click',e=>{const button=e.target.closest('[data-student]');if(button)openDetail(button.dataset.student);});
$('#detail-content').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;const r=records.find(r=>r.key===form.dataset.review);if(!r)return;const button=form.querySelector('button');button.disabled=true;try{r.review=await api('review',{id:r.key,checked:Boolean(r.review.checked),note:form.elements.note.value,version:r.review.version});render();openDetail(selected);toast(r.review.exportPending?'Salvo no banco. A planilha está indisponível; feche o arquivo e salve novamente para exportar.':'Acompanhamento salvo e planilha local atualizada.');}catch(error){toast(error.message);}finally{button.disabled=false;}});
let settingsTab='users',historyPage=1,historyTotal=0,settingsRequest=0;
const timeStamp=s=>s?new Date(s).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Sem login registrado';
function showView(view){
 const planned={attendance:'Lançamento de Frequências',actions:'Ações e Correções',contract:'Gestão de Contrato',debt:'Gestão de Inadimplentes',onboarding:'Onbording de Novatos',evasion:'Risco de Evasão'};
 const isAction=['actions','contract','debt','onboarding','evasion'].includes(view);
 $('#students-view').hidden=view!=='students';$('#settings-view').hidden=view!=='settings';$('#planned-view').hidden=!planned[view];
 for(const id of ['students','settings','attendance','actions','contract','debt','onboarding','evasion']){const button=$('#nav-'+id);button.classList.toggle('nav-active',view===id||(id==='actions'&&isAction));if(view===id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}
 if(isAction){$('#actions-submenu').hidden=false;$('#nav-actions').setAttribute('aria-expanded','true');}
 if(planned[view]){$('#planned-title').textContent=planned[view];$('#planned-heading').textContent=view==='actions'?'Selecione uma área no submenu':'Desenvolvimento futuro';}
}
async function loadUsers(){
 const data=await api('admin/users');
 $('#users-list').innerHTML=data.users.map(u=>`<tr><td><strong>${escape(u.username)}</strong></td><td>${u.admin?'Administrador':'Usuário'}</td><td>${escape(timeStamp(u.lastLogin))}</td></tr>`).join('')||'<tr><td colspan="3">Nenhum usuário cadastrado.</td></tr>';
 const selectedUser=$('#history-user').value;$('#history-user').length=1;
 for(const u of data.users)$('#history-user').add(new Option(u.username,u.username));
 if(selectedUser&&data.users.some(u=>u.username===selectedUser))$('#history-user').value=selectedUser;
}
async function loadHistory(){
 const request=++settingsRequest;
 const query=new URLSearchParams({kind:settingsTab==='logins'?'login':'all',page:String(historyPage),username:$('#history-user').value});
 $('#history-list').innerHTML='<tr><td colspan="4">Carregando histórico…</td></tr>';
 $('#history-prev').disabled=true;$('#history-next').disabled=true;
 const data=await api('admin/activity?'+query);
 if(request!==settingsRequest)return;
 historyTotal=data.total;const pages=Math.max(1,Math.ceil(data.total/data.pageSize));
 if(historyPage>pages){historyPage=pages;return loadHistory();}
 const labels={contacts:'Atualização de contatos',login:'Login',logout:'Saída',user_created:'Cadastro de usuário',review:'Acompanhamento',import:'Importação da base'};
 $('#history-list').innerHTML=data.rows.map(r=>`<tr><td class="when">${escape(timeStamp(r.created))}</td><td><strong>${escape(r.author)}</strong></td><td><span class="badge">${escape(labels[r.action]||r.action)}</span></td><td>${escape(r.summary)}${r.student?`<small>${escape(r.student.name)} · ID ${escape(r.student.id)}<br>${escape(r.student.course)}</small>`:r.action==='review'?'<small>Vínculo fora da base atual.</small>':''}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhum registro para este filtro.</td></tr>';
 $('#history-count').textContent=data.total+' registro(s)';$('#history-page').textContent=historyPage+' de '+pages;
 $('#history-prev').disabled=historyPage<=1;$('#history-next').disabled=historyPage>=pages;
}
async function settingsAction(action){$('#settings-error').hidden=true;try{await action();}catch(error){$('#settings-error').textContent=error.message;$('#settings-error').hidden=false;}}
async function selectSettingsTab(tab){
 settingsTab=tab;settingsRequest++;historyPage=1;
 for(const button of document.querySelectorAll('[data-settings-tab]'))button.setAttribute('aria-selected',String(button.dataset.settingsTab===tab));
 $('#panel-users').hidden=tab!=='users';$('#panel-history').hidden=tab==='users';
 $('#panel-history').setAttribute('aria-labelledby','tab-'+tab);
 $('#history-title').textContent=tab==='logins'?'Histórico de logins':'Registro de atividades';
 $('#history-description').textContent=tab==='logins'?'Veja quem entrou no sistema e quando.':'Resumo de acessos, cadastros e alterações nos acompanhamentos.';
 await settingsAction(async()=>{await loadUsers();if(tab!=='users')await loadHistory();});
}
$('#nav-students').onclick=()=>showView('students');
for(const view of ['attendance','contract','debt','onboarding','evasion'])$('#nav-'+view).onclick=()=>showView(view);
$('#nav-actions').onclick=()=>{
 const expanded=$('#nav-actions').getAttribute('aria-expanded')==='true';
 showView('actions');$('#actions-submenu').hidden=expanded;$('#nav-actions').setAttribute('aria-expanded',String(!expanded));
};
$('#nav-settings').onclick=()=>{showView('settings');selectSettingsTab('users');};
for(const button of document.querySelectorAll('[data-settings-tab]'))button.onclick=()=>selectSettingsTab(button.dataset.settingsTab);
$('#refresh-users').onclick=()=>settingsAction(loadUsers);
$('#refresh-history').onclick=()=>settingsAction(loadHistory);
$('#history-user').onchange=()=>{historyPage=1;settingsAction(loadHistory);};
$('#history-prev').onclick=()=>{if(historyPage>1){historyPage--;settingsAction(loadHistory);}};
$('#history-next').onclick=()=>{if(historyPage*20<historyTotal){historyPage++;settingsAction(loadHistory);}};
$('#user-form').addEventListener('submit',async e=>{e.preventDefault();const form=e.target,button=form.querySelector('button');button.disabled=true;$('#user-result').textContent='';try{await api('users',Object.fromEntries(new FormData(form)));form.reset();$('#user-result').textContent='Usuário cadastrado.';await loadUsers();}catch(error){$('#user-result').textContent=error.message;}finally{button.disabled=false;}});
api('me').then(load).catch(()=>showLogin());

function renderAcademicLink(r){return `<section class="link-detail"><h3>${escape(r.CURSO_AJUSTADO)}</h3><p>${escape(r.TURMA_AJUSTADA||r.TURMA)}</p><div class="badges">${badge(r.STATUS_FINANCEIRO,'STATUS_FINANCEIRO')}${badge(r.TEM_CONTRATO,'TEM_CONTRATO')}${badge(r.STATUS,'STATUS')}</div><dl class="facts">${[['Duração',r.DURACAO_AJUSTADA_MESES?r.DURACAO_AJUSTADA_MESES+' meses (ajustada)':r.TEMPO_TURMA_MESES||'Não informada'],['Término',r.DT_FIM_AJUSTADO||r.DT_FIM||'Não informado'],['Matrícula',r.DT_MATRICULA],['Código do contrato',r.CODCONTRATO],['Contrato original',money(r.VLR_CONTRATO)],['Contrato ajustado',money(r.VLR_CONTRATO_AJUSTADO)],['Em aberto',money(r.VLR_EM_ABERTO)],['Em atraso',money(r.VLR_EM_ATRASO)],['Inadimplente',money(r.VLR_INADIMPLENTE)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${escape(v)}</dd></div>`).join('')}</dl><form data-review="${r.key}"><label>Observações<textarea name="note" maxlength="3000" placeholder="Registre o acompanhamento deste vínculo">${escape(r.review.note)}</textarea></label><div class="detail-actions"><button>Salvar acompanhamento</button><button type="button" class="close-detail-inline">Fechar a ficha</button></div><small class="saved">${r.review.updated?'Última alteração: '+escape(r.review.author)+' · '+new Date(r.review.updated).toLocaleString('pt-BR'): 'Nenhum acompanhamento registrado.'}</small></form></section>`;}
