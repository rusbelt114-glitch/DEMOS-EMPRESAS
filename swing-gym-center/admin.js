'use strict';
const $=s=>document.querySelector(s);
const KEY='swing-gym-admin-demo-v1';
function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Caracas',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
function dateValid(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;}
function addDays(s,n){const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function state(c){return c.start>today()?'Por iniciar':c.end<today()?'Vencida':'Vigente';}
function sample(){const d=today();return {version:1,clients:[{id:'DEMO-001',name:'Ana · Ejemplo',plan:'Mensual',start:addDays(d,-20),end:addDays(d,9)},{id:'DEMO-002',name:'Luis · Ejemplo',plan:'Pareja',start:addDays(d,-27),end:addDays(d,2)},{id:'DEMO-003',name:'María · Ejemplo',plan:'Mensual',start:addDays(d,-35),end:addDays(d,-6)}],payments:[],attendance:[]};}
function validate(db){
 if(!db||db.version!==1||!['clients','payments','attendance'].every(k=>Array.isArray(db[k])&&db[k].length<=10000))throw Error('Formato de respaldo no válido.');
 const text=(v,n)=>typeof v==='string'&&v.length>0&&v.length<=n;
 const unique=rows=>new Set(rows.map(r=>r.id)).size===rows.length;
 if(!db.clients.every(c=>c&&text(c.id,100)&&text(c.name,80)&&['Mensual','Pareja','Por visita'].includes(c.plan)&&dateValid(c.start)&&dateValid(c.end)&&c.end>=c.start&&c.end<=addDays(c.start,3659))||!unique(db.clients))throw Error('Clientes o fechas no válidos.');
 const ids=new Set(db.clients.map(c=>c.id));
 if(!db.payments.every(p=>p&&text(p.id,100)&&ids.has(p.clientId)&&Number.isFinite(p.amount)&&p.amount>0&&p.amount<=999999999&&Math.abs(p.amount*100-Math.round(p.amount*100))<0.0001&&['USD','VES'].includes(p.currency)&&dateValid(p.date)&&['Efectivo','Transferencia','Pago móvil','Otro'].includes(p.method)&&typeof p.reference==='string'&&p.reference.length<=100)||!unique(db.payments))throw Error('Pagos no válidos.');
 if(!db.attendance.every(a=>a&&text(a.id,100)&&ids.has(a.clientId)&&dateValid(a.date))||!unique(db.attendance)||new Set(db.attendance.map(a=>a.clientId+'|'+a.date)).size!==db.attendance.length)throw Error('Asistencia no válida o duplicada.');
 return db;
}
let db;let readOnly=false;let initialMessage='';
try{const saved=localStorage.getItem(KEY);db=saved?validate(JSON.parse(saved)):sample();if(!saved)localStorage.setItem(KEY,JSON.stringify(db));}catch(e){db=sample();readOnly=true;initialMessage='No se pudieron leer o guardar los datos del navegador. Se muestran ejemplos en modo de solo lectura; el contenido anterior no se sobrescribirá.';}
function message(s){$('#feedback').textContent=s;}
function save(next){if(readOnly){message('Guardado bloqueado: el almacenamiento local no está disponible o requiere revisar los datos anteriores.');return false;}try{validate(next);localStorage.setItem(KEY,JSON.stringify(next));db=next;message('Guardado en este navegador. Descarga un respaldo para conservar una copia.');render();return true;}catch(e){message('No se guardó el cambio: '+e.message);return false;}}
function id(){return crypto.randomUUID();}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function clientName(id){return db.clients.find(c=>c.id===id)?.name||id;}
function money(cents){return (cents/100).toLocaleString('es-VE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function render(){
 $('#total').textContent=db.clients.length;$('#active').textContent=db.clients.filter(c=>state(c)==='Vigente').length;$('#soon').textContent=db.clients.filter(c=>state(c)==='Vigente'&&c.end<=addDays(today(),7)).length;$('#expired').textContent=db.clients.filter(c=>state(c)==='Vencida').length;
 const q=$('#search').value.trim().toLocaleLowerCase('es');const list=db.clients.filter(c=>(c.name+' '+c.id).toLocaleLowerCase('es').includes(q));
 $('#client-list').innerHTML=list.length?list.map(c=>`<article class="record"><strong>${esc(c.name)}</strong><small>${esc(c.id)}</small><p>${esc(c.plan)} · ${esc(c.start)} → ${esc(c.end)}</p><span class="tag ${state(c)==='Vencida'?'expired':'active'}">${state(c)}</span><br><button data-edit="${esc(c.id)}">Editar membresía</button></article>`).join(''):'<p class="empty">No hay clientes que coincidan.</p>';
 const options='<option value="">Selecciona un cliente</option>'+db.clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');for(const selector of ['#pay-client','#att-client']){const el=$(selector),value=el.value;el.innerHTML=options;el.value=value;}
 $('#payment-totals').textContent=['USD','VES'].map(currency=>currency+': '+money(db.payments.filter(p=>p.currency===currency).reduce((s,p)=>s+Math.round(p.amount*100),0))).join(' · ');
 $('#payment-list').innerHTML=db.payments.length?[...db.payments].reverse().map(p=>`<article class="record"><strong>${esc(clientName(p.clientId))}</strong><p>${esc(p.currency)} ${money(Math.round(p.amount*100))} · ${esc(p.date)}</p><small>${esc(p.method)}${p.reference?' · Ref. '+esc(p.reference):''}</small></article>`).join(''):'<p class="empty">Aún no hay pagos registrados.</p>';
 $('#attendance-list').innerHTML=db.attendance.length?[...db.attendance].reverse().map(a=>`<article class="record"><strong>${esc(clientName(a.clientId))}</strong><p>${esc(a.date)}</p></article>`).join(''):'<p class="empty">Aún no hay entradas registradas.</p>';
}
function preview(){const s=$('#start').value,n=Number($('#duration').value);$('#end-preview').value=dateValid(s)&&Number.isInteger(n)&&n>=1&&n<=3660?addDays(s,n-1):'';}
function resetClient(){ $('#client-form').reset();$('#editing').value='';$('#start').value=today();$('#cancel-edit').hidden=true;$('#form-title').textContent='Registrar cliente de ejemplo';preview();}
$('#theme').onclick=()=>{document.body.classList.toggle('verde');};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!==b.dataset.tab);});
$('#search').oninput=render;$('#start').oninput=preview;$('#duration').oninput=preview;$('#cancel-edit').onclick=resetClient;
$('#plan').onchange=()=>{$('#duration').value=$('#plan').value==='Por visita'?1:30;preview();};
$('#client-list').onclick=e=>{const b=e.target.closest('[data-edit]');if(!b)return;const c=db.clients.find(c=>c.id===b.dataset.edit);$('#editing').value=c.id;$('#name').value=c.name;$('#plan').value=c.plan;$('#start').value=c.start;$('#duration').value=Math.round((new Date(c.end+'T00:00:00Z')-new Date(c.start+'T00:00:00Z'))/86400000)+1;preview();$('#form-title').textContent='Editar cliente y membresía';$('#cancel-edit').hidden=false;$('#name').focus();};
$('#client-form').onsubmit=e=>{e.preventDefault();preview();const name=$('#name').value.trim();if(!name||!$('#end-preview').value)return message('Revisa el nombre, la fecha y la duración.');const editing=$('#editing').value;const c={id:editing||id(),name,plan:$('#plan').value,start:$('#start').value,end:$('#end-preview').value};if(!editing&&db.clients.some(x=>x.name.toLocaleLowerCase('es')===name.toLocaleLowerCase('es')))return message('Ya existe un cliente con ese nombre. Usa un nombre de prueba diferente.');const next={...db,clients:editing?db.clients.map(x=>x.id===editing?c:x):[...db.clients,c]};if(save(next))resetClient();};
$('#payment-form').onsubmit=e=>{e.preventDefault();const p={id:id(),clientId:$('#pay-client').value,amount:Number($('#amount').value),currency:$('#currency').value,date:$('#pay-date').value,method:$('#method').value,reference:$('#reference').value.trim()};if(save({...db,payments:[...db.payments,p]})){ $('#payment-form').reset();$('#pay-date').value=today();}};
$('#attendance-form').onsubmit=e=>{e.preventDefault();const clientId=$('#att-client').value,date=today();if(db.attendance.some(a=>a.clientId===clientId&&a.date===date))return message('Este cliente ya tiene una entrada registrada hoy.');save({...db,attendance:[...db.attendance,{id:id(),clientId,date}]});};
function csvCell(v){let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
function csv(rows){return '\uFEFFsep=;\r\n'+rows.map(r=>r.map(csvCell).join(';')).join('\r\n');}
function download(name,content,type){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Descarga solicitada. Comprueba que el archivo esté en tus descargas.');}
document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>{let rows;const kind=b.dataset.export;if(kind==='clientes')rows=[['ID','Nombre ficticio','Plan','Inicio','Vencimiento','Estado'],...db.clients.map(c=>[c.id,c.name,c.plan,c.start,c.end,state(c)])];if(kind==='pagos')rows=[['ID pago','ID cliente','Cliente','Monto','Moneda','Fecha','Método','Referencia'],...db.payments.map(p=>[p.id,p.clientId,clientName(p.clientId),p.amount.toFixed(2).replace('.',','),p.currency,p.date,p.method,p.reference])];if(kind==='asistencia')rows=[['ID entrada','ID cliente','Cliente','Fecha'],...db.attendance.map(a=>[a.id,a.clientId,clientName(a.clientId),a.date])];download('swing-gym-'+kind+'-'+today()+'.csv',csv(rows),'text/csv;charset=utf-8');});
$('#backup').onclick=()=>download('swing-gym-respaldo-demo-'+today()+'.json',JSON.stringify(db,null,2),'application/json');
$('#restore').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('El respaldo supera 5 MB.');const incoming=validate(JSON.parse(await file.text()));if(window.confirm('¿Reemplazar los datos locales con '+incoming.clients.length+' clientes, '+incoming.payments.length+' pagos y '+incoming.attendance.length+' entradas? Descarga antes un respaldo de los registros actuales.')){if(save(incoming))resetClient();}}catch(err){message('Respaldo rechazado: '+err.message);}finally{e.target.value='';}};
resetClient();$('#pay-date').value=today();render();if(initialMessage)message(initialMessage);
