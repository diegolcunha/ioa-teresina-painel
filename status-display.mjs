// Consolidação apenas para apresentação; nunca modifica os dados da fonte.
const key=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export const statusGroups={
 STATUS:[
  ['Pré-matrícula',['Pré-Matriculado','Pré-matrícula']],
  ['Matriculado',['Matriculado']],['Concluído',['Concluído']],
  ['Cancelado',['Cancelado']],['Abandono',['Abandono']],
  ['Outros',['Sem informação (IOA Office)']],
 ],
 STATUS_FINANCEIRO:[
  ['Inadimplente',['Inadimplente']],['Adimplente',['Adimplente']],['Em Atraso',['Em Atraso']],
  ['Outros',['Tem parcelas, mas não foi gerado lançamento','Nenhuma parcela cadastrada','Sem parcelas ativas, somente canceladas']],
 ],
 TEM_CONTRATO:[
  ['Assinado',['Assinado','Contrato IOA Office - Conferir Assinatura']],
  ['Assinado Parcial',['Assinado Parcial']],['Contrato não enviado',['Contrato não enviado']],
  ['Não Assinado',['Não Assinado']],['Cancelado',['Cancelado']],
 ],
};
const lookups=Object.fromEntries(Object.entries(statusGroups).map(([field,groups])=>[field,new Map(groups.flatMap(([label,values])=>values.map(value=>[key(value),label])))]));
export function statusLabel(field,value){return lookups[field]?.get(key(value))??String(value??'');}
export function statusOptions(field,records){
 const configured=(statusGroups[field]||[]).map(([label])=>label);
 const extra=[...new Set(records.map(r=>statusLabel(field,r[field])))].filter(label=>label&&!configured.includes(label)).sort();
 return [...configured,...extra];
}
export function matchesSelection(value,selected){return Array.isArray(selected)?selected.length===0||selected.includes(value):!selected||value===selected;}
export function matchesStatus(record,field,selected){return matchesSelection(statusLabel(field,record[field]),selected);}

export function statusSummary(field,records){
 const counts=new Map(statusOptions(field,records).map(label=>[label,0]));
 for(const record of records){const label=statusLabel(field,record[field])||'Não informado';counts.set(label,(counts.get(label)||0)+1);}
 return [...counts].map(([label,count])=>({label,count,percent:records.length?count/records.length*100:0}));
}
