// Tempo calendário da turma, independente de matrícula, status e frequência do aluno.
function sourceDate(value){
 const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value||'');if(!m)return null;
 const date=new Date(Date.UTC(+m[3],+m[2]-1,+m[1]));
 return date.getUTCFullYear()===+m[3]&&date.getUTCMonth()===+m[2]-1&&date.getUTCDate()===+m[1]?date:null;
}
function addMonths(date,months){
 const year=date.getUTCFullYear(),month=date.getUTCMonth()+months;
 const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 return new Date(Date.UTC(year,month,Math.min(date.getUTCDate(),last)));
}
export function elapsedCourseTime(starts,now=new Date()){
 const dates=starts.map(sourceDate).filter(Boolean).sort((a,b)=>a-b);if(!dates.length)return 'Início não informado';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,+p.value]));
 const today=new Date(Date.UTC(parts.year,parts.month-1,parts.day)),start=dates[0];
 if(today<start)return 'Não iniciado';
 let months=(today.getUTCFullYear()-start.getUTCFullYear())*12+today.getUTCMonth()-start.getUTCMonth();
 if(addMonths(start,months)>today)months--;
 const days=Math.round((today-addMonths(start,months))/86400000);
 return months+' '+(months===1?'mês':'meses')+' e '+days+' '+(days===1?'dia':'dias');
}
