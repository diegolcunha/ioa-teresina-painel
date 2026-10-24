export function createDeclarations({api,toast,date}){
 const $=s=>document.querySelector(s);let context=null,request=0;
 function update(){
  const form=$('#declaration-form'),option=context?.options.find(o=>o.productId===$('#declaration-course').value);
  form.elements.months.value=option?.months||'';form.elements.months.readOnly=!!option?.months;form.elements.verified.checked=false;
  $('#declaration-status').textContent=option?'Situação na fonte: '+option.statuses.join(' / ')+(option.eligible?'':'. A matrícula regular precisa ser confirmada nos registros antes de emitir.'):'Nenhum curso disponível.';
  $('#declaration-generate').disabled=!option?.eligible;
 }
 async function open(studentId){
  const current=++request;context=null;$('#declaration-form').reset();$('#declaration-error').textContent='';
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
   const blob=await api('declarations',{studentId:context.studentId,productId:$('#declaration-course').value,cpf:form.elements.cpf.value,months:Number(form.elements.months.value),frequency:form.elements.frequency.value,verified:form.elements.verified.checked},{pdf:true});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Declaracao-Matricula-'+context.studentId+'.pdf';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   $('#declaration-dialog').close();toast('Declaração gerada. Emissão registrada no histórico.');
  }catch(error){$('#declaration-error').textContent=error.message;}finally{button.disabled=false;}
 });
 return {open,reset(){request++;context=null;$('#declaration-dialog').close();$('#declaration-form').reset();$('#declaration-name').value='';$('#declaration-course').replaceChildren();$('#declaration-status').textContent='';$('#declaration-source').textContent='';}};
}
