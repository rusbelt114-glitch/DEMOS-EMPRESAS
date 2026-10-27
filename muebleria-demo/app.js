'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const KEY='casa-perla-prototipo-v1';
const seed=[
 {id:'CP-001',name:'Colchón Ortopédico',category:'colchones',type:'ortopedicos',size:'Matrimonial',measures:'140 × 190 cm',price:180,available:true,photo:[28,654,406,190],description:'Modelo ficticio de firmeza alta y acabado acolchado. Las características se sustituirán por la ficha del proveedor.'},
 {id:'CP-002',name:'Base tapizada',category:'bases',type:'base',size:'Queen',measures:'160 × 200 cm',price:220,available:true,photo:[454,654,406,190],description:'Base de ejemplo en tono azul pastel. La imagen muestra una ambientación; colchón, almohadas y accesorios no se incluyen en este precio ficticio.'},
 {id:'CP-003',name:'Sofá Nube',category:'sofas',type:'sofa',size:'na',measures:'3 puestos · 220 × 90 cm',price:390,available:false,photo:[28,1002,406,200],description:'Sofá de ejemplo con tapizado azul y líneas suaves. Producto mostrado para demostrar cómo se comunica un artículo agotado.'},
 {id:'CP-004',name:'Colchón Confort',category:'colchones',type:'resortes',size:'King',measures:'200 × 200 cm',price:260,available:true,photo:[454,1002,406,200],description:'Colchón de ejemplo con superficie acolchada. Base y accesorios de la ambientación no incluidos en el precio ficticio.'},
 {id:'CP-005',name:'Sillón Perla',category:'sillones',type:'sillon',size:'na',measures:'Individual · Tela beige',price:145,available:true,photo:[28,1356,406,200],description:'Sillón individual de ejemplo, con tapizado beige y patas de madera clara. Medidas definitivas pendientes de una ficha real.'},
 {id:'CP-006',name:'Lámpara Aura',category:'lamparas',type:'lampara',size:'na',measures:'De pie · Luz cálida',price:65,available:false,photo:[454,1356,406,200],description:'Lámpara de pie ficticia con pantalla clara y soporte de madera. Los accesorios de ambientación no forman parte del producto.'}
];
const labels={colchones:'Colchones',bases:'Bases cama',sofas:'Sofás',sillones:'Sillones',lamparas:'Lámparas'};
const defaults=()=>({version:1,rate:100,products:seed.map(p=>({id:p.id,name:p.name,price:p.price,available:p.available})),history:[]});
function validDB(v){
 if(!v||v.version!==1||!Number.isFinite(v.rate)||v.rate<0.01||v.rate>1000000||Math.abs(v.rate*100-Math.round(v.rate*100))>0.00001||!Array.isArray(v.products)||v.products.length!==seed.length||!Array.isArray(v.history)||v.history.length>50)throw Error('Formato de respaldo no válido.');
 const known=new Set(seed.map(p=>p.id));
 for(const p of v.products){if(!p||!known.delete(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.available!=='boolean'||!Number.isFinite(p.price)||p.price<=0||p.price>1000000||Math.abs(p.price*100-Math.round(p.price*100))>0.00001)throw Error('Productos o precios no válidos.');}
 if(!v.history.every(h=>h&&typeof h.text==='string'&&h.text.length<=300&&typeof h.at==='string'&&Number.isFinite(Date.parse(h.at))))throw Error('Historial no válido.');
 return {version:1,rate:v.rate,products:v.products.map(p=>({id:p.id,name:p.name.trim(),price:p.price,available:p.available})),history:v.history.map(h=>({text:h.text,at:h.at}))};
}
let db=defaults(),persistence=true,blocked=false;
try{const raw=localStorage.getItem(KEY);if(raw){try{db=validDB(JSON.parse(raw));}catch(e){blocked=true;$('#save-status').textContent='No se pudieron interpretar los datos anteriores. No se sobrescribirán. Puedes descargar el ejemplo o restaurar un respaldo válido.';}}else{localStorage.setItem(KEY,JSON.stringify(db));}}catch(e){persistence=false;$('#save-status').textContent='Modo temporal: este navegador no permite guardar. Los cambios funcionan durante esta sesión; descarga un respaldo para conservarlos.';}
let category='all',favoritesOnly=false,favorites=new Set(),mode='catalog',detailId=null;
let page=1,adminPage=1;
const mobile=window.matchMedia('(max-width:620px)');
function pageSize(){return mobile.matches?2:6;}
let toastTimer;
function toast(t){$('#toast').textContent=t;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('#toast').textContent='';},5500);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function items(){return seed.map(p=>({...p,...db.products.find(x=>x.id===p.id)}));}
function get(id){return items().find(p=>p.id===id);}
function num(n){return n.toLocaleString('es-VE',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2});}
function toBs(cents){return Number((BigInt(cents)*BigInt(Math.round(db.rate*100))+50n)/100n)/100;}
function bs(p){return toBs(Math.round(p.price*100));}
function stamp(t){const d=new Date(t);return d.toLocaleDateString('es-VE',{timeZone:'America/Caracas'})+' · '+d.toLocaleTimeString('en-US',{timeZone:'America/Caracas',hour:'numeric',minute:'2-digit'});}
function art(p){const [x,y,w,h]=p.photo;return `<svg viewBox="${x} ${y} ${w} ${h}" role="img" aria-label="Imagen ilustrativa de ${esc(p.name)}" preserveAspectRatio="xMidYMid slice"><use href="#product-sheet"/></svg>`;}
function badge(p){return `<span class="state-label ${p.available?'is-available':'is-out'}">${p.available?'● Disponible':'⊘ Agotado'}</span>`;}
function save(next,description,{allowRecovery=false}={}){
 if(blocked&&!allowRecovery){toast('Guardado bloqueado para proteger los datos anteriores. Restaura un respaldo válido.');return false;}
 try{next=validDB(next);next.history=[{text:description,at:new Date().toISOString()},...next.history].slice(0,50);if(persistence)localStorage.setItem(KEY,JSON.stringify(next));db=next;blocked=false;renderAll();toast(persistence?'Cambios guardados en este navegador. El catálogo ya está actualizado.':'Cambio aplicado en esta sesión. Descarga un respaldo para conservarlo.');return true;}catch(e){toast('No se aplicó el cambio: '+e.message);return false;}
}
function toggleStock(id){const p=get(id);if(!p)return;save({...db,products:db.products.map(x=>x.id===id?{...x,available:!x.available}:x)},p.name+': '+(p.available?'marcado como agotado':'marcado como disponible'));}
function filtered(){let rows=items().filter(p=>(category==='all'||p.category===category||category==='ortopedicos'&&p.type==='ortopedicos')&&($('#size').value==='all'||p.size===$('#size').value)&&(!$('#only-stock').checked||p.available)&&(!favoritesOnly||favorites.has(p.id)));
 const term=$('#search').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();if(term)rows=rows.filter(p=>(p.name+' '+p.id+' '+p.measures).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(term));
 if($('#sort').value==='price-asc')rows.sort((a,b)=>a.price-b.price);if($('#sort').value==='price-desc')rows.sort((a,b)=>b.price-a.price);return rows;}
function renderCatalog(resetPage=true){
 if(resetPage)page=1;
 const allRows=filtered(),pages=Math.max(1,Math.ceil(allRows.length/pageSize()));page=Math.min(page,pages);
 const rows=allRows.slice((page-1)*pageSize(),page*pageSize());
 $('#page-label').textContent='Página '+page+' de '+pages;$('#previous-page').disabled=page<=1;$('#next-page').disabled=page>=pages;$('#product-pager').hidden=pages<=1;$('#rate-summary').textContent='Tasa manual de ejemplo: '+num(db.rate)+' Bs por USD';$('#rate').value=db.rate;
 $('#products').innerHTML=rows.map(p=>`<article class="product" style="--surface:#edf0f2"><div class="product-art"><button data-detail="${p.id}" aria-label="Ver ${esc(p.name)}">${art(p)}</button><span class="stock ${p.available?'':'out'}">${p.available?'● Disponible':'⊘ Agotado'}</span><button class="heart" data-favorite="${p.id}" aria-label="${favorites.has(p.id)?'Quitar':'Añadir'} ${esc(p.name)} ${favorites.has(p.id)?'de':'a'} mi selección" aria-pressed="${favorites.has(p.id)}">${favorites.has(p.id)?'♥':'♡'}</button></div><div class="product-info"><p class="product-kind">${esc(labels[p.category])} · ${p.id}</p><h3><button data-detail="${p.id}">${esc(p.name)}</button></h3><p class="product-measures">${p.size!=='na'?esc(p.size)+' · ':''}${esc(p.measures)}</p><div class="price-line"><strong class="usd">$${num(p.price)} <small>USD</small></strong><span class="ves">Bs ${num(bs(p))}</span></div><div class="product-foot"><span>Precio de ejemplo</span><button data-detail="${p.id}">Ver detalles ↗</button></div></div></article>`).join('');
 $('#result-count').textContent=allRows.length+' productos'+(allRows.length>rows.length?' · '+rows.length+' en esta página':'')+(favoritesOnly?' · Mi selección':'');$('#empty').hidden=rows.length>0;$('#selection-bar').hidden=!favoritesOnly;$('#favorite-count').textContent=favorites.size;$('#favorites').setAttribute('aria-pressed',String(favoritesOnly));
 const chosen=items().filter(p=>favorites.has(p.id));const totalCents=chosen.reduce((s,p)=>s+Math.round(p.price*100),0);const totalBsCents=chosen.reduce((s,p)=>s+Math.round(bs(p)*100),0);$('#selection-total').textContent='Selección: '+chosen.length+' productos · $'+num(totalCents/100)+' USD · Bs '+num(totalBsCents/100)+' · Referencial, no reserva mercancía';
}
function renderAdmin(resetPage=true){
 if(resetPage)adminPage=1;
 const all=items();$('#admin-total').textContent=all.length;$('#admin-available').textContent=all.filter(p=>p.available).length;$('#admin-out').textContent=all.filter(p=>!p.available).length;
 const search=$('#admin-search').value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),status=$('#admin-filter').value;
 const allRows=all.filter(p=>(p.name+' '+p.id).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(search)&&(status==='all'||p.available===(status==='available')));
 const pages=Math.max(1,Math.ceil(allRows.length/pageSize()));adminPage=Math.min(adminPage,pages);const rows=allRows.slice((adminPage-1)*pageSize(),adminPage*pageSize());
 $('#admin-page-label').textContent='Página '+adminPage+' de '+pages;$('#admin-previous').disabled=adminPage<=1;$('#admin-next').disabled=adminPage>=pages;$('#admin-pager').hidden=pages<=1;
 $('#admin-list').innerHTML=rows.map(p=>`<article class="admin-product"><div class="admin-photo">${art(p)}</div><div class="admin-description"><small>${p.id} · ${esc(labels[p.category])}</small><h3>${esc(p.name)}</h3><p>$${num(p.price)} USD · Bs ${num(bs(p))}</p>${badge(p)}</div><div class="admin-buttons"><button class="stock-button ${p.available?'deactivate':'activate'}" data-stock="${p.id}">${p.available?'Marcar como agotado':'Marcar como disponible'}</button><button class="edit-button" data-edit="${p.id}">Editar producto</button></div></article>`).join('');$('#admin-empty').hidden=rows.length>0;
 $('#history').innerHTML=db.history.length?db.history.slice(0,8).map(h=>`<div class="history-entry"><p>${esc(h.text)}</p><small>${esc(stamp(h.at))}</small></div>`).join(''):'<p class="muted">Aquí verás los cambios que hagas.</p>';
}
function renderAll(){renderCatalog(false);renderAdmin(false);if(detailId&&$('#detail').open)fillDetail(detailId);}
function setMode(next){mode=next;$('#client-view').hidden=next!=='catalog';$('#admin-view').hidden=next!=='admin';$('#mode-catalog').setAttribute('aria-pressed',String(next==='catalog'));$('#mode-admin').setAttribute('aria-pressed',String(next==='admin'));$('#favorites').hidden=next==='admin';window.scrollTo({top:0,behavior:'instant'});}
function openEditor(id){const p=get(id);if(!p)return;$('#edit-id').value=p.id;$('#editor-title').textContent=p.name;$('#editing-code').textContent=p.id+' · Datos de demostración';$('#edit-name').value=p.name;$('#edit-price').value=p.price;$('#edit-state').value=p.available?'available':'out';$('#edit-error').textContent='';$('#editor').showModal();}
function fillDetail(id){const p=get(id);if(!p)return;$('#detail-content').innerHTML=`<div class="detail-layout"><div class="detail-visual" style="--surface:#edf1f3">${art(p)}</div><div class="detail-copy"><p class="eyebrow">${esc(labels[p.category])} · ${p.id}</p><h2 id="detail-title">${esc(p.name)}</h2>${badge(p)}<strong class="usd">$${num(p.price)} <small>USD</small></strong><span class="ves">Bs ${num(bs(p))}</span><p>Tasa manual de ejemplo: ${num(db.rate)} Bs/USD</p><p>Consulta los detalles del producto y su disponibilidad.</p><dl class="specs"><div><dt>Formato</dt><dd>${p.size==='na'?'No aplica':esc(p.size)}</dd></div><div><dt>Medidas / detalle</dt><dd>${esc(p.measures)}</dd></div><div><dt>Disponibilidad</dt><dd>${p.available?'Disponible':'Agotado'}</dd></div></dl><details class="detail-description"><summary>Características y descripción</summary><p>${esc(p.description)}</p></details><p>${p.available?'Disponibilidad de ejemplo, sin reserva ni compra real.':'Actualmente agotado en esta demostración. No se puede reservar ni comprar.'}</p><button class="primary" data-detail-favorite="${p.id}">${favorites.has(p.id)?'Quitar de':'Añadir a'} mi selección</button><p class="detail-note">Imágenes y precios ficticios. No corresponden a una mueblería real.</p></div></div>`;}
function openDetail(id){detailId=id;fillDetail(id);$('#detail').showModal();$('#detail').scrollTop=0;}
$('#hero-scene').innerHTML='<svg viewBox="449 109 438 246" preserveAspectRatio="xMidYMid slice"><use href="#product-sheet"/></svg>';
$('#mode-catalog').onclick=()=>setMode('catalog');$('#mode-admin').onclick=()=>setMode('admin');$('#footer-admin').onclick=()=>setMode('admin');$('#view-catalog').onclick=()=>setMode('catalog');
$$('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;$$('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));renderCatalog();});
$('#search').oninput=renderCatalog;$('#size').onchange=renderCatalog;$('#sort').onchange=renderCatalog;$('#only-stock').onchange=renderCatalog;
$('#admin-search').oninput=renderAdmin;$('#admin-filter').onchange=renderAdmin;
$('#favorites').onclick=()=>{favoritesOnly=!favoritesOnly;renderCatalog();$('#catalogo').scrollIntoView({behavior:'smooth'});};
$('#reset').onclick=()=>{category='all';favoritesOnly=false;$('#search').value='';$('#size').value='all';$('#only-stock').checked=false;$$('[data-category]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.category==='all')));renderCatalog();};
$('#clear-selection').onclick=()=>{favorites.clear();renderCatalog();};$('#print-selection').onclick=()=>{if(!favorites.size)return toast('Añade primero productos a tu selección.');window.print();};
$('#products').onclick=e=>{const heart=e.target.closest('[data-favorite]'),detail=e.target.closest('[data-detail]');if(heart){const id=heart.dataset.favorite;favorites.has(id)?favorites.delete(id):favorites.add(id);renderCatalog();}else if(detail)openDetail(detail.dataset.detail);};
$('#admin-list').onclick=e=>{const state=e.target.closest('[data-stock]'),edit=e.target.closest('[data-edit]');if(state)toggleStock(state.dataset.stock);else if(edit)openEditor(edit.dataset.edit);};
$('#close-detail').onclick=()=>{$('#detail').close();detailId=null;};$('#detail-content').onclick=e=>{const b=e.target.closest('[data-detail-favorite]');if(!b)return;const id=b.dataset.detailFavorite;favorites.has(id)?favorites.delete(id):favorites.add(id);renderAll();};
$('#cancel-edit-top').onclick=$('#cancel-edit').onclick=()=>$('#editor').close();
$('#edit-product').onsubmit=e=>{e.preventDefault();const name=$('#edit-name').value.trim(),price=Number($('#edit-price').value),id=$('#edit-id').value,available=$('#edit-state').value==='available';if(!name||!Number.isFinite(price)||price<=0||price>1000000||Math.abs(price*100-Math.round(price*100))>0.00001){$('#edit-error').textContent='Escribe un nombre y un precio válido con un máximo de dos decimales.';return;}const next={...db,products:db.products.map(p=>p.id===id?{...p,name,price,available}:p)};if(save(next,name+': producto actualizado ('+(available?'disponible':'agotado')+')'))$('#editor').close();};
$('#edit-rate').onclick=()=>{$('#rate-form').hidden=!$('#rate-form').hidden;$('#edit-rate').setAttribute('aria-expanded',String(!$('#rate-form').hidden));if(!$('#rate-form').hidden)$('#rate').focus();};
$('#rate-form').onsubmit=e=>{e.preventDefault();const rate=Number($('#rate').value);if(!Number.isFinite(rate)||rate<0.01||rate>1000000)return toast('Introduce una tasa válida mayor que cero.');if(save({...db,rate},'Tasa manual de ejemplo actualizada a '+num(rate)+' Bs/USD')){$('#rate-form').hidden=true;$('#edit-rate').setAttribute('aria-expanded','false');}};
function download(name,content,type){const u=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
$('#backup').onclick=()=>{download('casa-perla-respaldo-demo.json',JSON.stringify(db,null,2),'application/json');toast('Respaldo solicitado. Revisa tus descargas.');};
$('#restore').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1048576)throw Error('Archivo demasiado grande.');const next=validDB(JSON.parse(await f.text()));if(confirm('¿Reemplazar los productos y la tasa de este navegador con el respaldo? Descarga antes una copia de tus cambios actuales.'))save(next,'Respaldo de demostración restaurado',{allowRecovery:true});}catch(err){toast('No se restauró: '+err.message);}finally{e.target.value='';}};
$('#share-catalog').onclick=()=>{if(location.protocol==='https:'&&navigator.share)navigator.share({title:'Casa Perla · Demostración',url:location.href.split('#')[0]}).catch(()=>{});else toast('Este archivo es un prototipo local. El enlace para compartir se habilitará cuando autorices su publicación.');};
window.addEventListener('storage',e=>{if(e.key!==KEY)return;try{if(!e.newValue)return;db=validDB(JSON.parse(e.newValue));renderAll();toast('Catálogo actualizado desde otra pestaña de este navegador.');}catch(err){toast('No se pudo leer la actualización de otra pestaña.');}});
$('#previous-page').onclick=()=>{page=Math.max(1,page-1);renderCatalog(false);};
$('#next-page').onclick=()=>{page++;renderCatalog(false);};
$('#admin-previous').onclick=()=>{adminPage=Math.max(1,adminPage-1);renderAdmin(false);};
$('#admin-next').onclick=()=>{adminPage++;renderAdmin(false);};
mobile.addEventListener('change',()=>{page=1;adminPage=1;renderAll();});
renderAll();
