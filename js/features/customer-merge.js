/* SK MOBILES v5.8.0 — Customers page: "Edit" a customer (name / phone) and "Merge" two accounts of the same person.
   Every bill, repair job and credit-ledger entry of the old account(s) is re-pointed to the final name + phone, so
   the history stays complete and the date-wise order of the ledger is unchanged. A 15 second Undo is offered.
   Nothing is deleted: only the customer name / phone fields of existing records change. */
(function(){
'use strict';
var BILLS='sk_bills',JOBS='skx_repair_jobs_v2',LEDGER='sk_credit_ledger_v1',DUE='skx_credit_due_override_v1',PROF='skx_customer_profiles_v1';
function raw(k){try{return localStorage.getItem(k)}catch(e){return null}}
function arr(k){try{var v=JSON.parse(raw(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function tail10(p){var d=String(p||'').replace(/\D/g,'');return d.length>10?d.slice(-10):d}
function cleanName(n){return String(n||'').replace(/\s+/g,' ').trim()}
/* walk-in customers have no real name, so different numbers are different people: never suggest merging them */
function isWalk(n){return /^walk[\s-]*in(\b|$)/i.test(String(n||'').trim())}
/* same grouping rule as the Customers list: by phone when it has 10 digits, otherwise by name */
function custKey(name,phone){var p=tail10(phone);return p.length===10?'p'+p:'n'+cleanName(name).toLowerCase()}
function ledgerKey(name,phone){return cleanName(name).toLowerCase()+'|'+String(phone||'').replace(/\D/g,'')}
function profiles(){try{var v=JSON.parse(raw(PROF)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return{}}}
window.skCustProfile=function(name,phone){return profiles()[custKey(name,phone)]||null};
var PF=['alt','address','email','notes'];
function ic(n,c){return '<i class="ski ski-in c-'+c+'" data-i="'+n+'" aria-hidden="true"></i>'}
function fld(icon,color,label,inner){return '<label class="skpop-fld"><span>'+ic(icon,color)+label+'</span>'+inner+'</label>'}
function avatar(name){var st=window.skTools?window.skTools.avStyle(name):'';return '<span class="skcm-av" style="'+st+'">'+esc((name||'?').charAt(0).toUpperCase())+'</span>'}
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
function snapshot(){return {b:raw(BILLS),j:raw(JOBS),l:raw(LEDGER),d:raw(DUE),p:raw(PROF)}}
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
  /* profile (address, e-mail ...) follows the customer; the new account wins where it has a value */
  var pf=profiles(),nkey=custKey(nm,ph),merged=pf[nkey]||{};
  oldKeys.forEach(function(k){var o=pf[k];if(!o)return;PF.forEach(function(f){if(!merged[f]&&o[f])merged[f]=o[f]});if(k!==nkey)delete pf[k]});
  if(Object.keys(merged).length){merged.updatedAt=new Date().toISOString();pf[nkey]=merged;localStorage.setItem(PROF,JSON.stringify(pf))}
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
    if(s.p!=null)localStorage.setItem(PROF,s.p);else localStorage.removeItem(PROF);
  }catch(e){}
}
function refresh(openKey,openCp,inLedger){
  try{if(typeof window.updateBillHistoryCount==='function')window.updateBillHistoryCount()}catch(e){}
  try{if(typeof window.renderBillHistory==='function')window.renderBillHistory()}catch(e){}
  try{if(typeof window.skCPRender==='function')window.skCPRender()}catch(e){}
  try{if(typeof window.skRjRenderJobs==='function'){window.skRjRenderJobs();window.skRjRenderHistory&&window.skRjRenderHistory()}}catch(e){}
  try{if(typeof window.renderCards==='function')window.renderCards()}catch(e){}
  if(inLedger){try{
    var cs=window.skCPGetCustomers?window.skCPGetCustomers():[],nk2=openCp||'';
    if(nk2&&cs.some(function(x){return x.key===nk2})&&typeof window.skCPOpenCustomer==='function')window.skCPOpenCustomer(nk2);
    else if(typeof window.skCPBackToList==='function')window.skCPBackToList()}catch(e){}}
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
  undoTimer=setTimeout(hideUndo,5000);
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
window.skCmLedgerWho=function(){return ledgerWho()};
window.skCmEdit=function(enc){
  var g=find(groups(),decodeURIComponent(enc));if(!g){toast('Customer not found');return}
  cur.src=g;var pr=profiles()[g.key]||{};
  ensure('skCmEditModal','<div class="modal-sheet skpop skcm-sheet"><div class="modal-title"><span>Edit customer</span><button class="modal-close-btn" onclick="toggleModal(\'skCmEditModal\',false)">✕</button></div>'+
    '<div class="skpop-note">'+ic('info','blue')+'<span>'+esc(countsLine(g))+' will be updated with the new name / phone.</span></div>'+
    fld('user','blue','Name','<input id="skCmName" value="'+esc(g.name==='Customer'?'':g.name)+'" autocomplete="off" placeholder="Customer name">')+
    fld('call','green','Phone','<input id="skCmPhone" inputmode="tel" maxlength="14" value="'+esc(g.phone)+'" autocomplete="off" placeholder="10 digit number">')+
    fld('call','sky','Alternate phone','<input id="skCmAlt" inputmode="tel" maxlength="14" value="'+esc(pr.alt||'')+'" autocomplete="off" placeholder="Optional">')+
    fld('pin','red','Address','<textarea id="skCmAddr" placeholder="Door no, street, area, city">'+esc(pr.address||'')+'</textarea>')+
    fld('mail','blue','E-mail','<input id="skCmEmail" type="email" value="'+esc(pr.email||'')+'" autocomplete="off" placeholder="Optional">')+
    fld('note','amber','Notes','<textarea id="skCmNotes" placeholder="Anything to remember about this customer">'+esc(pr.notes||'')+'</textarea>')+
    '<div class="skpop-actions"><button type="button" class="submit-btn sk-keepr" onclick="skCmSaveEdit()">💾 Save</button></div></div>');
  open('skCmEditModal');
};
window.skCmSaveEdit=function(){
  var g=cur.src;if(!g)return;
  var nm=cleanName(document.getElementById('skCmName').value),ph=document.getElementById('skCmPhone').value;
  if(!nm){toast('Enter a name');return}
  var d=String(ph).replace(/\D/g,'');if(d&&tail10(ph).length!==10){toast('Phone must be 10 digits');return}
  var nk=custKey(nm,ph),other=nk!==g.key?find(groups(),nk):null;
  if(other&&!confirm('"'+other.name+'" already exists with this name/phone.\nSave and merge both accounts?'))return;
  var inLedger=!!ledgerWho(),r=rewrite([g.key],nm,ph);
  /* profile details (saved under the final account) */
  var pf=profiles(),entry={alt:String(document.getElementById('skCmAlt').value||'').trim(),address:String(document.getElementById('skCmAddr').value||'').trim(),email:String(document.getElementById('skCmEmail').value||'').trim(),notes:String(document.getElementById('skCmNotes').value||'').trim()};
  if(entry.alt||entry.address||entry.email||entry.notes){entry.updatedAt=new Date().toISOString();pf[nk]=entry}else delete pf[nk];
  localStorage.setItem(PROF,JSON.stringify(pf));
  close('skCmEditModal');refresh(nk,nm.toLowerCase()+'|'+(tail10(ph).length===10?tail10(ph):''),inLedger);
  offerUndo('Customer updated',r.before,nk);toast('✅ Customer updated');
};

/* Merge */
function pickerHtml(src,q){
  q=String(q||'').toLowerCase();
  var list=groups().filter(function(g){return g.key!==src.key&&(!q||g.name.toLowerCase().indexOf(q)>=0||g.phone.indexOf(q.replace(/\D/g,'')||'§')>=0)}).slice(0,40);
  var sn=cleanName(src.name).toLowerCase();
  list.sort(function(a,b){if(isWalk(sn))return 0;var sa=cleanName(a.name).toLowerCase()===sn?0:1,sb=cleanName(b.name).toLowerCase()===sn?0:1;return sa-sb});
  return list.length?list.map(function(g){
    var same=!isWalk(sn)&&cleanName(g.name).toLowerCase()===sn;
    return '<button type="button" class="skcm-opt sk-keepr'+(cur.tgt&&cur.tgt.key===g.key?' sel':'')+'" onclick="skCmPick(\''+encodeURIComponent(g.key)+'\')">'+avatar(g.name)+'<span class="skcm-tx"><b>'+esc(g.name)+(same?'<i class="same">same name</i>':'')+'</b><small>'+(g.phone?esc(g.phone):'No phone')+' • '+esc(countsLine(g))+'</small></span></button>';
  }).join(''):'<div class="skcm-empty">No other customers</div>';
}
window.skCmMerge=function(enc,preTarget){
  var gs=groups(),g=find(gs,decodeURIComponent(enc));if(!g){toast('Customer not found');return}
  cur.src=g;cur.tgt=preTarget?find(gs,decodeURIComponent(preTarget)):null;
  ensure('skCmMergeModal','<div class="modal-sheet skpop skcm-sheet"><div class="modal-title"><span>Merge accounts</span><button class="modal-close-btn" onclick="toggleModal(\'skCmMergeModal\',false)">✕</button></div>'+
    '<div class="skpop-note">'+ic('link','blue')+'<span><b>'+esc(g.name)+'</b> ('+(g.phone?esc(g.phone):'no phone')+') — '+esc(countsLine(g))+'<br>Pick the account it should be merged <b>into</b>. All bills, repairs and credit history are combined, date-wise.</span></div>'+
    '<input type="search" class="skpop-search" id="skCmSearch" placeholder="Search name / phone…" oninput="skCmSearch(this.value)">'+
    '<div id="skCmList" class="skpop-list">'+pickerHtml(g,'')+'</div>'+
    '<div id="skCmFinal"></div>'+
    '<div class="skpop-actions"><button type="button" class="submit-btn sk-keepr" id="skCmGo" onclick="skCmDoMerge()" disabled>🔗 Merge</button></div></div>');
  open('skCmMergeModal');
  if(cur.tgt)window.skCmPick(encodeURIComponent(cur.tgt.key));
};
window.skCmSearch=function(v){var l=document.getElementById('skCmList');if(l&&cur.src)l.innerHTML=pickerHtml(cur.src,v)};
window.skCmPick=function(enc){
  var gs=groups(),t=find(gs,decodeURIComponent(enc));if(!t||!cur.src)return;cur.tgt=t;
  var l=document.getElementById('skCmList');if(l)l.innerHTML=pickerHtml(cur.src,(document.getElementById('skCmSearch')||{}).value||'');
  var ph=t.phone||cur.src.phone||'';
  var f=document.getElementById('skCmFinal');
  if(f)f.innerHTML='<div class="skcm-final"><div class="skpop-note">'+ic('check','green')+'<span>Final account (you can change it):</span></div>'+
    fld('user','blue','Name','<input id="skCmFName" value="'+esc(t.name)+'" autocomplete="off">')+
    fld('call','green','Phone','<input id="skCmFPhone" inputmode="tel" maxlength="14" value="'+esc(ph)+'" autocomplete="off">')+'</div>';
  var go=document.getElementById('skCmGo');if(go)go.disabled=false;
};
window.skCmDoMerge=function(){
  var s=cur.src,t=cur.tgt;if(!s||!t)return;
  var nm=cleanName(document.getElementById('skCmFName').value),ph=document.getElementById('skCmFPhone').value;
  if(!nm){toast('Enter a name');return}
  if(String(ph).replace(/\D/g,'')&&tail10(ph).length!==10){toast('Phone must be 10 digits');return}
  var nk=custKey(nm,ph),inLedger=!!ledgerWho(),r=rewrite([s.key,t.key],nm,ph);
  close('skCmMergeModal');refresh(nk,nm.toLowerCase()+'|'+(tail10(ph).length===10?tail10(ph):''),inLedger);
  offerUndo('Merged '+r.moved.b+' bills, '+r.moved.j+' repairs, '+r.moved.l+' credit entries',r.before,nk);
  toast('✅ Accounts merged');
};

/* ---------- buttons on the Customers page ---------- */
function addDetailButtons(){
  var d=document.getElementById('skCuDetail');if(!d||d.style.display==='none'||d.querySelector('.skcm-row'))return;
  var key=window.__skCuKey?encodeURIComponent(window.__skCuKey):null;
  if(!key)return;
  var row=document.createElement('div');row.className='skcm-row';
  row.innerHTML='<button type="button" class="skcm-btn sk-keepr" onclick="skCmEdit(\''+key+'\')">✏️ Edit details</button><button type="button" class="skcm-btn sk-keepr" onclick="skCmMerge(\''+key+'\')">🔗 Merge</button>';
  var head=d.querySelector('.skcu-head');if(head&&head.parentNode)head.parentNode.insertBefore(row,head.nextSibling);else d.insertBefore(row,d.firstChild);
}
function dupBanner(){
  var list=document.getElementById('skCuList'),modal=document.getElementById('skCustModal');
  if(!list||!modal||!modal.classList.contains('active'))return;
  var old=document.getElementById('skCmDup');
  if(list.style.display==='none'){if(old)old.remove();return}
  var by={};groups().forEach(function(g){var n=cleanName(g.name).toLowerCase();if(n&&n!=='customer'&&!isWalk(n)){(by[n]=by[n]||[]).push(g)}});
  var dups=Object.keys(by).filter(function(n){return by[n].length>1}).map(function(n){return by[n]});
  if(!dups.length){if(old)old.remove();return}
  var html='<button type="button" class="skcm-dup sk-keepr" onclick="skCmDupReview()">⚠️ '+dups.length+' customer'+(dups.length>1?'s have':' has')+' more than one account — tap to review &amp; merge</button>';
  if(old){if(old.innerHTML!==html)old.innerHTML=html;return}
  old=document.createElement('div');old.id='skCmDup';old.innerHTML=html;list.parentNode.insertBefore(old,list);
}
window.skCmDupReview=function(){
  var by={};groups().forEach(function(g){var n=cleanName(g.name).toLowerCase();if(n&&n!=='customer'&&!isWalk(n)){(by[n]=by[n]||[]).push(g)}});
  var dups=Object.keys(by).filter(function(n){return by[n].length>1});
  var h=dups.map(function(n){
    var gs=by[n];return '<div class="skcm-dgroup"><b>'+esc(gs[0].name)+'</b>'+gs.map(function(g,i){
      var other=gs[(i+1)%gs.length];
      return '<div class="skcm-drow"><span>'+(g.phone?esc(g.phone):'No phone')+'<small>'+esc(countsLine(g))+'</small></span><button type="button" class="skcm-btn sk-keepr" onclick="toggleModal(\'skCmDupModal\',false);skCmMerge(\''+encodeURIComponent(g.key)+'\',\''+encodeURIComponent(other.key)+'\')">Merge into '+(other.phone?esc(other.phone):'no-phone')+'</button></div>';
    }).join('')+'</div>';
  }).join('');
  ensure('skCmDupModal','<div class="modal-sheet skpop skcm-sheet"><div class="modal-title"><span>Duplicate customers</span><button class="modal-close-btn" onclick="toggleModal(\'skCmDupModal\',false)">✕</button></div><div class="skpop-note">'+ic('alert','orange')+'<span>Same name, different accounts (for example one with a phone number and one without).</span></div>'+h+'</div>');
  open('skCmDupModal');
};
function wrapOpen(){
  if(typeof window.skCuOpen==='function'&&!window.skCuOpen.__cm){
    var o=window.skCuOpen,w=function(enc){window.__skCuKey=decodeURIComponent(enc);return o.apply(this,arguments)};w.__cm=1;window.skCuOpen=w;
  }
}
/* ---------- ledger page: tap the customer name to edit; address shows under the phone ---------- */
function ledgerWho(){
  var w=document.querySelector('#skCreditLedgerPage.active .skcp-det-who');if(!w)return null;
  var b=w.querySelector('b');if(!b)return null;
  var ph=(w.textContent||'').replace(b.textContent||'','');
  return {el:w,name:cleanName(b.textContent),phone:ph};
}
function decorate(){
  var w=ledgerWho();
  if(w){
    var pr=profiles()[custKey(w.name,w.phone)],old=w.el.querySelector('.skcm-addr');
    var txt=pr&&(pr.address||pr.alt)?[pr.address,pr.alt?'Alt: '+pr.alt:''].filter(Boolean).join(' • '):'';
    if(!txt){if(old)old.remove()}
    else if(!old||old.getAttribute('data-t')!==txt){if(old)old.remove();var d=document.createElement('div');d.className='skcm-addr';d.setAttribute('data-t',txt);d.innerHTML=ic('pin','red')+'<span>'+esc(txt)+'</span>';w.el.appendChild(d)}
  }
  var cd=document.getElementById('skCuDetail');
  if(cd&&cd.style.display!=='none'&&window.__skCuKey){
    var sub=cd.querySelector('.skcu-sub'),g=find(groups(),window.__skCuKey),p2=g&&profiles()[g.key],o2=cd.querySelector('.skcm-addr');
    var t2=p2&&(p2.address||p2.alt||p2.email)?[p2.address,p2.alt?'Alt: '+p2.alt:'',p2.email].filter(Boolean).join(' • '):'';
    if(!t2){if(o2)o2.remove()}
    else if(sub&&(!o2||o2.getAttribute('data-t')!==t2)){if(o2)o2.remove();var e=document.createElement('div');e.className='skcm-addr';e.setAttribute('data-t',t2);e.innerHTML=ic('pin','red')+'<span>'+esc(t2)+'</span>';sub.parentNode.appendChild(e)}
  }
}
document.addEventListener('click',function(ev){
  var w=ev.target&&ev.target.closest&&ev.target.closest('#skCreditLedgerPage .skcp-det-who,#skCreditLedgerPage .skcp-det-av');
  if(!w)return;
  var info=ledgerWho();if(!info)return;
  var k=custKey(info.name,info.phone);
  if(!find(groups(),k)){toast('Customer not found');return}
  ev.preventDefault();ev.stopPropagation();window.skCmEdit(encodeURIComponent(k));
},true);
function boot(){
  wrapOpen();setTimeout(wrapOpen,1500);
  var raf=0;try{new MutationObserver(function(){if(raf)return;var m=document.getElementById('skCustModal'),lp=document.getElementById('skCreditLedgerPage');if((!m||!m.classList.contains('active'))&&(!lp||!lp.classList.contains('active')))return;raf=requestAnimationFrame(function(){raf=0;addDetailButtons();dupBanner();decorate()})}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']})}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
