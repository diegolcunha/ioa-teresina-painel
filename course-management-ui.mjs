import {statusSummary,statusTone} from './status-display.mjs?v=1792802958655';
export function createCourseManagement({api,escape,date,toast,onStudent}){
 const $=s=>document.querySelector(s);let data=null,request=0,editing=null;
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 $('#management-year').value=today().slice(0,4);$('#management-year').max=today().slice(0,4);
 const format=(value,unit)=>unit==='money'?value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):value.toLocaleString('pt-BR',{maximumFractionDigits:2})+(unit==='percent'?'%':unit==='score'?' pontos':'');
 async function load(){
  const current=++request,year=Number($('#management-year').value),course=$('#management-course').value;
  $('#course-error').hidden=true;$('#refresh-course').disabled=true;$('#course-kpis').innerHTML='<p>Carregando indicadores…</p>';$('#course-status-overview').replaceChildren();
  try{
   const fresh=await api('course-management?'+new URLSearchParams({year:String(year),...(course?{course}:{})}));if(current!==request)return;data=fresh;
   $('#management-course').innerHTML=fresh.courses.map(c=>`<option value="${escape(c)}">${escape(c)}</option>`).join('');$('#management-course').value=fresh.course;
   $('#course-source-date').textContent='Base de alunos: '+date(fresh.sourceDate);
   $('#course-period').textContent='YTD: de 01/01/'+fresh.year+' até a data de corte de cada apuração. Contratos em aberto são posição na data de corte. Ausência de informação não significa zero.';
   $('#course-kpis').innerHTML=fresh.definitions.map(def=>{
    const metric=fresh.metrics.find(m=>m.metric===def.id),hasValue=metric!==undefined;
    return `<article class="course-kpi"><div class="course-kpi-top"><h2>${escape(def.title)}</h2><span class="badge">${def.scope==='ytd'?'YTD '+fresh.year:'Posição'}</span></div><div class="course-kpi-reading"><strong class="course-kpi-value">${hasValue?escape(format(metric.value,def.unit)):'—'}</strong><p class="course-kpi-state">${hasValue?'Informado manualmente · corte '+escape(date(metric.cutoff)):'Aguardando apuração'}</p></div>${hasValue&&def.unit==='percent'?`<progress class="kpi-progress" value="${metric.value}" max="100" aria-label="${escape(def.title)}: ${metric.value}%"></progress>`:''}<div class="course-kpi-footer"><details><summary>Fonte e critério</summary><p>${escape(hasValue?metric.source:def.source)}</p><p>${escape(hasValue?metric.methodology:def.method)}</p>${hasValue?`<small>Registrado por ${escape(metric.author)} em ${escape(new Date(metric.updated).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</small>`:''}</details>${fresh.canEdit?`<button type="button" class="ghost" data-edit-metric="${def.id}">${hasValue?'Atualizar apuração':'Registrar apuração'}</button>`:''}</div></article>`;
   }).join('');
   const statusRecords=fresh.scope.records.map(r=>({STATUS:r.status,STATUS_FINANCEIRO:r.financialStatus,TEM_CONTRATO:r.contractStatus}));
   const charts=[{field:'STATUS',title:'Status Acadêmico'},{field:'STATUS_FINANCEIRO',title:'Status Financeiro'},{field:'TEM_CONTRATO',title:'Status Contrato'}];
   $('#course-status-overview').innerHTML=`<p class="overview-note">Posição dos registros identificados de <strong>${escape(fresh.course)}</strong> · base de ${escape(date(fresh.sourceDate))}. Quantidades e percentuais por registro acadêmico; prévia não conciliada com frequências, sem acumulação YTD.</p>`+charts.map(chart=>{
    const summary=statusSummary(chart.field,statusRecords).sort((a,b)=>b.percent-a.percent);
    return `<section class="status-chart" aria-labelledby="course-chart-${chart.field}"><header class="status-chart-header"><h2 id="course-chart-${chart.field}">${chart.title}</h2><span>${statusRecords.length} registros (prévia)</span></header><div class="status-chart-rows">${summary.map(item=>{
     const tone=statusTone(chart.field,item.label),color=tone==='yellow'?'orange':tone||'gray';
     return `<div class="status-chart-row"><div class="status-chart-label"><span>${escape(item.label)}</span><div><strong>${item.count}</strong><small>${item.percent.toLocaleString('pt-BR',{maximumFractionDigits:1})}%</small></div></div><svg viewBox="0 0 100 7" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="chart-track" width="100" height="7" rx="3.5"/><rect class="chart-${color}" width="${item.percent.toFixed(3)}" height="7" rx="3.5"/></svg></div>`;
    }).join('')}</div><p class="status-chart-foot">Quantidade e participação dos registros</p></section>`;
   }).join('');
   $('#course-coverage').textContent=fresh.scope.identifiedStudents+' alunos distintos identificados na base (prévia); '+fresh.scope.records.length+' registros acadêmicos. Não validado com o controle de frequências.';
   $('#course-scope-rows').innerHTML=fresh.scope.records.map(r=>`<tr><td>${escape(r.name)}<small>ID ${escape(r.id)}</small></td><td>${escape(r.course)}<small>${escape(r.turma||'Turma não informada')} · ${escape(r.code||'')}</small></td><td>${escape(r.status||'Não informado')}</td><td>${escape(r.association)}</td><td><button type="button" class="ghost" data-course-student="${escape(r.id)}">Ver ficha</button></td></tr>`).join('')||'<tr><td colspan="5">Nenhum registro identificado na fonte atual.</td></tr>';
  }catch(error){if(current===request){data=null;$('#course-error').textContent=error.message;$('#course-error').hidden=false;$('#course-kpis').replaceChildren();$('#course-status-overview').replaceChildren();$('#course-scope-rows').replaceChildren();$('#course-coverage').textContent='Composição indisponível.';}}
  finally{if(current===request)$('#refresh-course').disabled=false;}
 }
 function edit(id){
  if(!data?.canEdit)return;const definition=data.definitions.find(d=>d.id===id),previous=data.metrics.find(m=>m.metric===id);
  editing={course:data.course,year:data.year,metric:id,version:previous?.version||0};
  const form=$('#course-metric-form');form.reset();$('#course-metric-error').textContent='';$('#course-metric-title').textContent=definition.title;$('#course-metric-context').textContent=data.course+' · '+data.year+' · '+(definition.scope==='ytd'?'Acumulado desde 1º de janeiro':'Posição na data de corte');
  form.elements.value.value=previous?.value??'';form.elements.value.step=definition.unit==='count'?'1':'any';form.elements.value.min=definition.unit==='score'?'-100':['percent','count'].includes(definition.unit)?'0':'';form.elements.value.max=['percent','score'].includes(definition.unit)?'100':'';
  form.elements.cutoff.min=data.year+'-01-01';form.elements.cutoff.max=Math.min(Number(data.year),Number(today().slice(0,4)))===Number(today().slice(0,4))?today():data.year+'-12-31';form.elements.cutoff.value=previous?.cutoff||(data.year===Number(today().slice(0,4))?today():data.year+'-12-31');
  form.elements.source.value=previous?.source||'';form.elements.methodology.value=previous?.methodology||'';form.elements.source.placeholder=definition.source;form.elements.methodology.placeholder=definition.method;
  $('#course-metric-dialog').showModal();
 }
 $('#management-course').addEventListener('change',load);$('#management-year').addEventListener('change',load);$('#refresh-course').onclick=load;
 $('#course-kpis').addEventListener('click',e=>{const button=e.target.closest('[data-edit-metric]');if(button)edit(button.dataset.editMetric);});
 $('#course-scope-rows').addEventListener('click',e=>{const button=e.target.closest('[data-course-student]');if(button)onStudent(button.dataset.courseStudent);});
 $('#course-metric-close').onclick=$('#course-metric-cancel').onclick=()=>$('#course-metric-dialog').close();
 $('#course-metric-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!editing)return;const form=e.currentTarget,button=form.querySelector('[type=submit]');button.disabled=true;$('#course-metric-error').textContent='';
  try{await api('course-management',{...editing,value:Number(form.elements.value.value),cutoff:form.elements.cutoff.value,source:form.elements.source.value,methodology:form.elements.methodology.value});$('#course-metric-dialog').close();toast('Apuração salva com fonte e histórico.');await load();}catch(error){$('#course-metric-error').textContent=error.message;}finally{button.disabled=false;}
 });
 return {load,reset(){request++;data=null;editing=null;$('#course-kpis').replaceChildren();$('#course-status-overview').replaceChildren();$('#course-scope-rows').replaceChildren();$('#course-coverage').textContent='';$('#course-period').textContent='';$('#course-metric-form').reset();$('#course-metric-dialog').close();}};
}
