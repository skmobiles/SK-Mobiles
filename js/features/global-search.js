/* SK MOBILES v5.6.162 — Search everywhere: one box finds bills (customer, phone, bill no., IMEI, model),
   repair jobs (customer, phone, model, IMEI, job id) and used-mobile stock (IMEI, model, dealer, buyer).
   Read-only; opens the existing detail screens. Opened from the scan-style button next to the home search box. */
(function(){
'use strict';
function read(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){n=Number(n);return '₹'+Math.round(isFinite(n)?n:0).toLocaleString('en-IN')}
function hay(){return Array.prototype.slice.call(arguments).map(function(v){return String(v==null?'':v).toLowerCase()}).join(' ')}
var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>';

function search(q){
  q=String(q||'').trim().toLowerCase();if(q.length<2)return null;
  var digits=q.replace(/\D/g,''),out={bills:[],jobs:[],used:[]};
  var bills=read('sk_bills');
  bills.forEach(function(b,i){
    if(!b)return;
    var h=hay(b.custName,b.phone,b.billNo,b.id,b.imei1,b.imei2,b.model,b.brand);
    if(h.indexOf(q)>=0||(digits.length>=4&&hay(b.phone,b.imei1,b.imei2).indexOf(digits)>=0))out.bills.push({b:b,id:b.id});
  });
  read('skx_repair_jobs_v2').forEach(function(j){
    if(!j)return;
    var h=hay(j.customer,j.phone,j.model,j.imei,j.id,j.problem);
    if(h.indexOf(q)>=0||(digits.length>=4&&hay(j.phone,j.imei).indexOf(digits)>=0))out.jobs.push(j);
  });
  read('sk_used_mobile_stock_v1').forEach(function(r){
    if(!r)return;
    var h=hay(r.imei,r.model,r.dealer,r.sale&&r.sale.customer,r.sale&&r.sale.phone);
    if(h.indexOf(q)>=0)out.used.push(r);
  });
  /* newest first: saved bills are stored newest-first, sort by bill date to be safe */
  var dk=function(d){var m=String(d||'').match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);return m?(m[3].length===2?'20'+m[3]:m[3])+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2):String(d||'').replace(/\D/g,'').slice(0,8)};
  out.bills=out.bills.map(function(x,i){return {x:x,i:i,k:dk(x.b.date)}}).sort(function(a,b){return a.k<b.k?1:a.k>b.k?-1:a.i-b.i}).map(function(o){return o.x});
  return out;
}
function section(title,count,rows){
  if(!rows.length)return '';
  return '<div class="skgs-h">'+title+' <span>'+count+'</span></div>'+rows.join('');
}
function render(q){
  var box=document.getElementById('skGsBody');if(!box)return;
  var r=search(q);
  if(!r){box.innerHTML='<div class="skgs-empty">Type at least 2 letters or digits.<br><small>Customer • phone • IMEI • bill no. • model • repair job</small></div>';return}
  var billRows=r.bills.slice(0,30).map(function(x){
    var b=x.b,no=b.billNo||b.id||'';
    return '<div class="skgs-row" onclick="skGsOpen(\'bill\',\''+encodeURIComponent(String(b.id))+'\')"><span class="skgs-ic b">🧾</span><div><b>'+esc(b.custName||'Customer')+'</b><small>'+esc([b.brand,b.model].filter(Boolean).join(' ')||'—')+' • '+esc(no)+(b.phone?' • '+esc(b.phone):'')+'</small></div><em>'+money(b.price)+'</em></div>';
  });
  var jobRows=r.jobs.slice(0,30).map(function(j){
    return '<div class="skgs-row" onclick="skGsOpen(\'job\',\''+encodeURIComponent(String(j.id))+'\')"><span class="skgs-ic j">🛠️</span><div><b>'+esc(j.customer||'Customer')+'</b><small>'+esc(j.model||'Repair')+' • '+esc(j.status||'')+(j.phone?' • '+esc(j.phone):'')+'</small></div><em>›</em></div>';
  });
  var usedRows=r.used.slice(0,30).map(function(u){
    return '<div class="skgs-row" onclick="skGsOpen(\'used\',\''+encodeURIComponent(String(u.imei))+'\')"><span class="skgs-ic u">📱</span><div><b>'+esc(u.model||'Used mobile')+'</b><small>'+esc(u.imei||'')+' • '+esc(u.status||'')+(u.dealer?' • '+esc(u.dealer):'')+'</small></div><em>›</em></div>';
  });
  var h=section('Bills',r.bills.length,billRows)+section('Repair jobs',r.jobs.length,jobRows)+section('Used mobiles',r.used.length,usedRows);
  box.innerHTML=h||'<div class="skgs-empty">No results for “'+esc(q)+'”</div>';
}
function ensureModal(){
  if(document.getElementById('skGlobalSearchModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skGlobalSearchModal';
  el.innerHTML='<div class="modal-sheet skgs-sheet"><div class="modal-title"><span>🔎 Search everywhere</span><button class="modal-close-btn" onclick="toggleModal(\'skGlobalSearchModal\',false)">✕</button></div>'+
   '<input type="search" class="form-input skgs-input" id="skGsInput" placeholder="Customer, phone, IMEI, bill no., repair job…" autocomplete="off" oninput="skGsRender(this.value)"/>'+
   '<div id="skGsBody"></div></div>';
  document.body.appendChild(el);
}
window.skGsRender=render;
window.skOpenGlobalSearch=function(){
  ensureModal();var i=document.getElementById('skGsInput');i.value='';render('');
  if(typeof window.toggleModal==='function')window.toggleModal('skGlobalSearchModal',true);
  setTimeout(function(){try{i.focus()}catch(e){}},250);
};
window.skGsOpen=function(type,enc){
  var id=decodeURIComponent(enc);
  if(typeof window.toggleModal==='function')window.toggleModal('skGlobalSearchModal',false);
  setTimeout(function(){
    try{
      if(type==='bill'){
        var idx=-1;try{idx=savedBills.findIndex(function(x){return x&&String(x.id)===id})}catch(e){}
        if(idx<0){var a=read('sk_bills');idx=a.findIndex(function(x){return x&&String(x.id)===id})}
        if(typeof window.viewSavedBill==='function')window.viewSavedBill(idx);
      }else if(type==='job'){
        if(typeof window.skCPOpenRepairJob==='function')window.skCPOpenRepairJob(id);else if(typeof window.skRjShowDetail==='function')window.skRjShowDetail(id);
      }else if(type==='used'){
        if(typeof window.skUsedShowDetails==='function')window.skUsedShowDetails(id);
      }
    }catch(e){if(typeof window.showToast==='function')window.showToast('Could not open')}
  },200);
};
/* turn the old "focus search" scan-style button into the global search button */
function rewire(){
  var b=document.querySelector('.home-search-scan-btn');if(!b||b.dataset.skGs)return;
  b.dataset.skGs='1';b.setAttribute('onclick','skOpenGlobalSearch()');b.title='Search everywhere';b.setAttribute('aria-label','Search everywhere');
  var svg=b.querySelector('svg');if(svg){svg.outerHTML=ICON}
}
function boot(){rewire();setTimeout(rewire,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
