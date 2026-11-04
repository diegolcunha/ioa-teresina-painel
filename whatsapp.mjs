// Validação conservadora de contatos brasileiros; nunca altera o cadastro.
export function whatsappLink(value){
 const raw=String(value||'').trim();
 if(!raw)return {url:null,reason:''};
 if(!/^[+\d\s().-]+$/.test(raw))return {url:null,reason:'Confira o telefone para abrir o WhatsApp.'};
 let n=raw.replace(/\D/g,'');
 if(n.startsWith('55')&&(n.length===12||n.length===13))n=n.slice(2);
 const ddds=new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));
 if(!ddds.has(n.slice(0,2))||!(/^[0-9]{2}9[0-9]{8}$/.test(n)||/^[0-9]{2}[2-5][0-9]{7}$/.test(n)))return {url:null,reason:'Confira DDD e número completo para abrir o WhatsApp.'};
 return {url:'https://wa.me/55'+n,reason:''};
}
