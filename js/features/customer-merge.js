/* SK MOBILES v5.6.163 — Customers page: "Edit" a customer (name / phone) and "Merge" two accounts of the same person.
   Every bill, repair job and credit-ledger entry of the old account(s) is re-pointed to the final name + phone, so
   the history stays complete and the date-wise order of the ledger is unchanged. A 15 second Undo is offered.
   Nothing is deleted: only the customer name / phone fields of existing records change. */
(function(){
'use strict';
var BILLS='sk_bills',JOBS='skx_repair_jobs_v2',LEDGER='sk_credit_ledger_v1',DUE='skx_credit_due_override_v1';
function raw(k){try{return localStorage.getItem(k)}catch(e){return null}}
function arr(k){try{var v=JSON.parse(raw(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function tail10(p){var d=String(p||'').replace(/\D/g,'');return d.length>10?d.slice(-10):d}
function cleanName(n){return String(n||'').replace(/\s+/g,' ').trim()}
/* same grouping rule as the Customers list: by phone when it has 10 digits, otherwise by name */
function custKey(name,phone){var p=tail10(phone);return p.length===10?'p'+p:'n'+cleanName(name).toLowerCase()}
function ledgerKey(name,phone){return cleanName(name).toLowerCase()+'|'+String(phone||'').replace(/\D/g,'')}
function bills(){try{if(Array.isArray(savedBills))return savedBills}catch(e){}return arr(BILLS)}

function groups(){
  var map={};
  function get(name,phone){
    var nm=cleanName(name);if(!nm&&tail10(phone).length<10)return null;
    var k=custKey(name,phone);
    if(!map[k])map[k]={key:k,name:nm||'Customer',phone:tail10(phone).length===10?tail10(phone):'',nb:0,nj:0,nl:0};
    var g=map[k];if(!g.phone&&tail10(phone).length===10)g.phone=tail10(phone);
    if(g.name==='Customer'&&nm)g.name=nm;return g;
  }
  bills().forEach(function(b){if(!b)return;var g=get(b.custName,b.phone);if(g)g.nb++});
  arr(JOBS).forEach(function(j){if(!j)return;var g=get(j.customer,j.phone);if(g)g.nj++});
  arr(LEDGER).forEach(function(e){if(!e)return;var g=get(e.name,e.phone);if(g)g.nl++});
  return Object.keys(map).map(function(k){return map[k]}).sort(function(a,b){return a.name.localeCompare(b.name)});
}
function find(list,key){return list.filter(function(g){return g.key===key})[0]||null}

/* ---------- apply ---------- */
var undoSnap=null,undoTimer=0;
function snapshot(){return {b:raw(BILLS),j:raw(JOBS),l:raw(LEDGER),d:raw(DUE)}}
function rewrite(oldKeys,newName,newPhone){
  var before=snapshot(),nm=cleanName(newName),ph=tail10(newPhone).length===10?tail10(newPhone):'',moved={b:0,j:0,l:0};
  var set={};oldKeys.forEach(function(k){set[k]=1});
  var bl=bills();
  bl.forEach(function(b){if(b&&set[custKey(b.custName,b.phone)]){b.custName=nm;b.phone=ph;moved.b++}});
  var jb=arr(JOBS);
  jb.forEach(function(j){if(j&&set[custKey(j.customer,j.phone)]){j.customer=nm;j.phone=ph;j.updatedAt=new Date().toISOString();moved.j++}});
  var lg=arr(LEDGER),oldLedgerKeys={};
  lg.forEach(function(e){if(e&&set[custKey(e.name,e.phone)]){oldLedgerKeys[e.key||ledgerKey(e.name,e.phone)]=1;e.name=nm;e.phone=ph;e.key=ledgerKey(nm,ph);moved.l++}});
  /* due-date overrides follow the customer */
  var dm=null;try{dm=JSON.parse(raw(DUE)||'{}')}catch(e){dm={}}
  if(dm&&typeof dm==='object'){var nk=ledgerKey(nm,ph),ch=false;Object.keys(oldLedgerKeys).forEach(function(k){if(dm[k]!==undefined&&k!==nk){if(!dm[nk])dm[nk]=dm[k];delete dm[k];ch=true}});if(ch)localStorage.setItem(DUE,JSON.stringify(dm))}
  localStorage.setItem(BILLS,JSON.stringify(bl));
  localStorage.setItem(JOBS,JSON.stringify(jb));
  localStorage.setItem(LEDGER,JSON.stringify(lg));
  return {before:before,moved:moved};
}
function restore(s){
  try{
    if(s.b!=null){localStorage.setItem(BILLS,s.b);try{savedBills=JSON.parse(s.b)}catch(e){}}
    if(s.j!=null)localStorage.setItem(JOBS,s.j);
    if(s.l!=null)localStorage.setItem(LEDGER,s.l);
    if(s.d!=null)localStorage.setItem(DUE,s.d);else localStorage.removeItem(DUE);
  }catch(e){}
}
function refresh(openKey){
  try{if(typeof window.updateBillHistoryCount==='function')window.updateBillHistoryCount()}catch(e){}
  try{if(typeof window.renderBillHistory==='function')window.renderBillHistory()}catch(e){}
  try{if(typeof window.skCPRender==='function')window.skCPRender()}catch(e){}
  try{if(typeof window.skRjRenderJobs==='function'){window.skRjRenderJobs();window.skRjRenderHistory&&window.skRjRenderHistory()}}catch(e){}
  try{if(typeof window.renderCards==='function')window.renderCards()}catch(e){}
  if(document.getElementById('skCustModal')&&typeof window.skOpenCustomers==='function'){
    window.skOpenCustomers();if(openKey&&typeof window.skCuOpen==='function')window.skCuOpen(encodeURIComponent(openKey));
  }
}
function offerUndo(label,snap,openKey){
  hideUndo();undoSnap=snap;
  var bar=document.createElement('div');bar.id='skMergeUndo';bar.className='skun-bar';
  bar.innerHTML='<span>'+esc(label)+'</span><button type="button">↩ Undo</button>';
  document.body.appendChild(bar);
  bar.querySelector('button').onclick=function(){restore(undoSnap);hideUndo();refresh('');toast('Undone')};
  undoTimer=setTimeout(hideUndo,15000);
}
function hideUndo(){var b=document.getElementById('skMergeUndo');if(b)b.remove();clearTimeout(undoTimer)}

/* ---------- modals ---------- */
function ensure(id,html){
  var el=document.getElementById(id);
  if(!el){el=document.createElement('div');el.className='modal-overlay';el.id=id;document.body.appendChild(el)}
  el.innerHTML=html;return el;
}
function close(id){if(typeof window.toggleModal==='function')window.toggleModal(id,false)}
function open(id){if(typeof window.toggleModal==='function')window.toggleModal(id,true)}

var cur={src:null,tgt:null};
function countsLine(g){return g.nb+' bill'+(g.nb===1?'':'s')+' • '+g.nj+' repair'+(g.nj===1?'':'s')+' • '+g.nl+' credit entr'+(g.nl===1?'y':'ies')}

/* Edit customer */
window.skCmEdit=function(enc){
  var g=find(groups(),decodeURIComponent(enc));if(!g){toast('Customer not found');return}
  cur.src=g;
  ensure('skCmEditModal','<div class="modal-sheet skcm-sheet"><div class="modal-title"><span>✏️ Edit customer</span><button class="modal-close-btn" onclick="toggleModal(\'skCmEditModal\',false)">✕</button></div>'+
    '<div class="skcm-note">'+esc(countsLine(g))+' will be updated.</div>'+
    '<label class="skcm-l">Name<input class="form-input" id="skCmName" value="'+esc(g.name==='Customer'?'':g.name)+'" autocomplete="off"></label>'+
    '<label class="skcm-l">Phone<input class="form-input" id="skCmPhone" inputmode="numeric" maxlength="14" value="'+esc(g.phone)+'" autocomplete="off"></label>'+
    '<div class="skcm-actions"><button type="button" class="submit-btn" onclick="skCmSaveEdit()">💾 Save</button></div></div>');
  open('skCmEditModal');
};
window.skCmSaveEdit=function(){
  var g=cur.src;if(!g)return;
  var nm=cleanName(document.getElementById('skCmName').value),ph=document.getElementById('skCmPhone').value;
  if(!nm){toast('Enter a name');return}
  var d=String(ph).replace(/\D/g,'');if(d&&tail10(ph).length!==10){toast('Phone must be 10 digits');return}
  var nk=custKey(nm,ph),other=nk!==g.key?find(groups(),nk):null;
  if(other&&!confirm('"'+other.name+'" already exists with this name/phone.\nSave and merge both accounts?'))return;
  var r=rewrite([g.key],nm,ph);
  close('skCmEditModal');refresh(nk);
  offerUndo('✏️ Customer updated',r.before,nk);toast('✅ Customer updated');
};

/* Merge */
function pickerHtml(src,q){
  q=String(q||'').toLowerCase();
  var list=groups().filter(function(g){return g.key!==src.key&&(!q||g.name.toLowerCase().indexOf(q)>=0||g.phone.indexOf(q.replace(/\D/g,'')||'§')>=0)}).slice(0,40);
  var sn=cleanName(src.name).toLowerCase();
  list.sort(function(a,b){var sa=cleanName(a.name).toLowerCase()===sn?0:1,sb=cleanName(b.name).toLowerCase()===sn?0:1;return sa-sb});
  return list.length?list.map(function(g){
    var same=cleanName(g.name).toLowerCase()===sn;
    return '<button type="button" class="skcm-opt'+(cur.tgt&&cur.tgt.key===g.key?' sel':'')+'" onclick="skCmPick(\''+encodeURIComponent(g.key)+'\')"><span><b>'+esc(g.name)+'</b>'+(same?' <i>same name</i>':'')+'<small>'+(g.phone?esc(g.phone):'No phone')+' • '+esc(countsLine(g))+'</small></span></button>';
  }).join(''):'<div class="skcm-empty">No other customers</div>';
}
window.skCmMerge=function(enc,preTarget){
  var gs=groups(),g=find(gs,decodeURIComponent(enc));if(!g){toast('Customer not found');return}
  cur.src=g;cur.tgt=preTarget?find(gs,decodeURIComponent(preTarget)):null;
  ensure('skCmMergeModal','<div class="modal-sheet skcm-sheet"><div class="modal-title"><span>🔗 Merge accounts</span><button class="modal-close-btn" onclick="toggleModal(\'skCmMergeModal\',false)">✕</button></div>'+
    '<div class="skcm-note"><b>'+esc(g.name)+'</b> ('+(g.phone?esc(g.phone):'no phone')+') — '+esc(countsLine(g))+'<br>Pick the account it should be merged <b>into</b>. All bills, repairs and credit history are combined, date-wise.</div>'+
    '<input type="search" class="form-input" id="skCmSearch" placeholder="Search name / phone…" oninput="skCmSearch(this.value)">'+
    '<div id="skCmList" class="skcm-list">'+pickerHtml(g,'')+'</div>'+
    '<div id="skCmFinal"></div>'+
    '<div class="skcm-actions"><button type="button" class="submit-btn" id="skCmGo" onclick="skCmDoMerge()" disabled>🔗 Merge</button></div></div>');
  open('skCmMergeModal');
  if(cur.tgt)window.skCmPick(encodeURIComponent(cur.tgt.key));
};
window.skCmSearch=function(v){var l=document.getElementById('skCmList');if(l&&cur.src)l.innerHTML=pickerHtml(cur.src,v)};
window.skCmPick=function(enc){
  var gs=groups(),t=find(gs,decodeURIComponent(enc));if(!t||!cur.src)return;cur.tgt=t;
  var l=document.getElementById('skCmList');if(l)l.innerHTML=pickerHtml(cur.src,(document.getElementById('skCmSearch')||{}).value||'');
  var ph=t.phone||cur.src.phone||'';
  var f=document.getElementById('skCmFinal');
  if(f)f.innerHTML='<div class="skcm-final"><div class="skcm-note">Final account (you can change it):</div>'+
    '<label class="skcm-l">Name<input class="form-input" id="skCmFName" value="'+esc(t.name)+'" autocomplete="off"></label>'+
    '<label class="skcm-l">Phone<input class="form-input" id="skCmFPhone" inputmode="numeric" maxlength="14" value="'+esc(ph)+'" autocomplete="off"></label></div>';
  var go=document.getElementById('skCmGo');if(go)go.disabled=false;
};
window.skCmDoMerge=function(){
  var s=cur.src,t=cur.tgt;if(!s||!t)return;
  var nm=cleanName(document.getElementById('skCmFName').value),ph=document.getElementById('skCmFPhone').value;
  if(!nm){toast('Enter a name');return}
  if(String(ph).replace(/\D/g,'')&&tail10(ph).length!==10){toast('Phone must be 10 digits');return}
  var nk=custKey(nm,ph),r=rewrite([s.key,t.key],nm,ph);
  close('skCmMergeModal');refresh(nk);
  offerUndo('🔗 Merged '+r.moved.b+' bills, '+r.moved.j+' repairs, '+r.moved.l+' credit entries',r.before,nk);
  toast('✅ Accounts merged');
};

/* ---------- buttons on the Customers page ---------- */
function addDetailButtons(){
  var d=document.getElementById('skCuDetail');if(!d||d.style.display==='none'||d.querySelector('.skcm-row'))return;
  var key=window.__skCuKey?encodeURIComponent(window.__skCuKey):null;
  if(!key)return;
  var row=document.createElement('div');row.className='skcm-row';
  row.innerHTML='<button type="button" class="skcm-btn" onclick="skCmEdit(\''+key+'\')">✏️ Edit</button><button type="button" class="skcm-btn" onclick="skCmMerge(\''+key+'\')">🔗 Merge</button>';
  var head=d.querySelector('.skcu-head');if(head&&head.parentNode)head.parentNode.insertBefore(row,head.nextSibling);else d.insertBefore(row,d.firstChild);
}
function dupBanner(){
  var list=document.getElementById('skCuList'),modal=document.getElementById('skCustModal');
  if(!list||!modal||!modal.classList.contains('active'))return;
  var old=document.getElementById('skCmDup');
  if(list.style.display==='none'){if(old)old.remove();return}
  var by={};groups().forEach(function(g){var n=cleanName(g.name).toLowerCase();if(n&&n!=='customer'){(by[n]=by[n]||[]).push(g)}});
  var dups=Object.keys(by).filter(function(n){return by[n].length>1}).map(function(n){return by[n]});
  if(!dups.length){if(old)old.remove();return}
  var html='<button type="button" class="skcm-dup" onclick="skCmDupReview()">⚠️ '+dups.length+' customer'+(dups.length>1?'s have':' has')+' more than one account — tap to review &amp; merge</button>';
  if(old){if(old.innerHTML!==html)old.innerHTML=html;return}
  old=document.createElement('div');old.id='skCmDup';old.innerHTML=html;list.parentNode.insertBefore(old,list);
}
window.skCmDupReview=function(){
  var by={};groups().forEach(function(g){var n=cleanName(g.name).toLowerCase();if(n&&n!=='customer'){(by[n]=by[n]||[]).push(g)}});
  var dups=Object.keys(by).filter(function(n){return by[n].length>1});
  var h=dups.map(function(n){
    var gs=by[n];return '<div class="skcm-dgroup"><b>'+esc(gs[0].name)+'</b>'+gs.map(function(g,i){
      var other=gs[(i+1)%gs.length];
      return '<div class="skcm-drow"><span>'+(g.phone?esc(g.phone):'No phone')+'<small>'+esc(countsLine(g))+'</small></span><button type="button" class="skcm-btn" onclick="toggleModal(\'skCmDupModal\',false);skCmMerge(\''+encodeURIComponent(g.key)+'\',\''+encodeURIComponent(other.key)+'\')">Merge into '+(other.phone?esc(other.phone):'no-phone')+'</button></div>';
    }).join('')+'</div>';
  }).join('');
  ensure('skCmDupModal','<div class="modal-sheet skcm-sheet"><div class="modal-title"><span>⚠️ Duplicate customers</span><button class="modal-close-btn" onclick="toggleModal(\'skCmDupModal\',false)">✕</button></div><div class="skcm-note">Same name, different accounts (for example one with a phone number and one without).</div>'+h+'</div>');
  open('skCmDupModal');
};
function wrapOpen(){
  if(typeof window.skCuOpen==='function'&&!window.skCuOpen.__cm){
    var o=window.skCuOpen,w=function(enc){window.__skCuKey=decodeURIComponent(enc);return o.apply(this,arguments)};w.__cm=1;window.skCuOpen=w;
  }
}
function boot(){
  wrapOpen();setTimeout(wrapOpen,1500);
  var raf=0;try{new MutationObserver(function(){if(raf)return;var m=document.getElementById('skCustModal');if(!m||!m.classList.contains('active'))return;raf=requestAnimationFrame(function(){raf=0;addDetailButtons();dupBanner()})}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']})}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
