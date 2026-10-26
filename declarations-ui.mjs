export function createDeclarations({api,toast,date}){
 const $=s=>document.querySelector(s);let context=null,request=0,dates=[];
 function renderDates(){
  const list=$('#attendance-list');list.replaceChildren();for(const d of dates){const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button');text.textContent=date(d)+' ';remove.type='button';remove.className='ghost';remove.textContent='Remover';remove.setAttribute('aria-label','Remover '+date(d));remove.onclick=()=>{dates=dates.filter(v=>v!==d);renderDates();$('#declaration-form').elements.verified.checked=false;};row.append(text,remove);list.append(row);}
 }
 function updateType(){const attendance=$('#declaration-type').value==='comparecimento';$('#attendance-dates').hidden=!attendance;$('#declaration-confirm-text').textContent=attendance?'Conferi os dados, a matrícula atual e o comparecimento em todas as datas selecionadas.':'Conferi os dados e a situação atual de matrícula.';$('#declaration-form').elements.verified.checked=false;}
 $('#declaration-type').onchange=updateType;
 $('#attendance-add').onclick=()=>{const input=$('#attendance-date');if(!input.value)return;if(dates.length>=12){toast('Selecione até 12 datas por declaração.');return;}dates=[...new Set([...dates,input.value])].sort();renderDates();input.value='';$('#declaration-form').elements.verified.checked=false;};
 function update(){
  const form=$('#declaration-form'),option=context?.options.find(o=>o.productId===$('#declaration-course').value);
  form.elements.months.value=option?.months||'';form.elements.months.readOnly=!!option?.months;form.elements.verified.checked=false;
  $('#declaration-status').textContent=option?'Situação na fonte: '+option.statuses.join(' / ')+(option.eligible?'':'. A matrícula regular precisa ser confirmada nos registros antes de emitir.'):'Nenhum curso disponível.';
  $('#declaration-generate').disabled=!option?.eligible;
 }
 async function open(studentId){
  const current=++request;context=null;dates=[];renderDates();$('#declaration-form').reset();updateType();$('#attendance-date').max=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date());$('#declaration-error').textContent='';
  try{
   const fresh=await api('declarations?'+new URLSearchParams({studentId}));if(current!==request)return;context=fresh;
   $('#declaration-name').value=fresh.name;$('#declaration-form').elements.cpf.value=fresh.cpf||'';
   const select=$('#declaration-course');select.replaceChildren();for(const option of fresh.options)select.add(new Option(option.course+(option.eligible?'':' — conferir matrícula'),option.productId));
   const eligible=fresh.options.find(o=>o.eligible);if(eligible)select.value=eligible.productId;
   $('#declaration-source').textContent='Base de alunos: '+date(fresh.sourceDate)+'. Data de emissão: hoje, em Brasília.'+(fresh.cpfConflict?' Há CPFs divergentes na fonte; informe o CPF conferido.':'');
   update();$('#declaration-dialog').showModal();
  }catch(error){toast(error.message);}
 }
 $('#declaration-course').onchange=update;
 $('#declaration-close').onclick=$('#declaration-cancel').onclick=()=>$('#declaration-dialog').close();
 $('#declaration-form').addEventListener('submit',async e=>{
  e.preventDefault();if(!context)return;const form=e.currentTarget,button=$('#declaration-generate');button.disabled=true;$('#declaration-error').textContent='';
  try{
   if(form.elements.type.value==='comparecimento'&&!dates.length)throw Error('Adicione ao menos uma data de comparecimento.');
   const blob=await api('declarations',{type:form.elements.type.value,dates,studentId:context.studentId,productId:$('#declaration-course').value,cpf:form.elements.cpf.value,months:Number(form.elements.months.value),frequency:form.elements.frequency.value,verified:form.elements.verified.checked},{pdf:true});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Declaracao-'+(form.elements.type.value==='comparecimento'?'Comparecimento':'Matricula')+'-'+context.studentId+'.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   $('#declaration-dialog').close();toast('Declaração gerada. Emissão registrada no histórico.');
  }catch(error){$('#declaration-error').textContent=error.message;}finally{button.disabled=false;}
 });
 return {open,reset(){request++;context=null;$('#declaration-dialog').close();$('#declaration-form').reset();$('#declaration-name').value='';$('#declaration-course').replaceChildren();$('#declaration-status').textContent='';$('#declaration-source').textContent='';}};
}
