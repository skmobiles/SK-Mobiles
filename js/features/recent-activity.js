/* SK MOBILES v5.7.2 — Home "Recent Activity": the three cards open the item they show, and "View All" opens one
   newest-first list of the latest bills, repair jobs, used-stock purchases and credit entries (tap a row to open it).
   Read-only: no data is changed. */
(function(){
'use strict';
function read(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){n=Number(n);return '₹'+Math.round(isFinite(n)?n:0).toLocaleString('en-IN')}
function key(v){
  var s=String(v||'').trim(),m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/)))return m[3]+('0'+m[2]).slice(-2)+('0'+m[1]).slice(-2);
  var d=new Date(s);return isNaN(d)?'':d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2);
}
function dmy(k){return k?k.slice(6,8)+'/'+k.slice(4,6)+'/'+k.slice(0,4):''}
/* time hint from ids made with Date.now() (bills keep its last 8 digits) so same-day items sort newest first */
function tsOf(id,created){
  var m=String(id==null?'':id).match(/(\d{8,13})$/);if(m)return Number(m[1])%100000000;
  var d=new Date(created||'');return isNaN(d)?0:d.getTime()%100000000;
}
function collect(){
  var out=[],n=0;
  read('sk_bills').forEach(function(b,bi){if(!b)return;out.push({t:'bill',id:b.id,k:key(b.date),ts:tsOf(b.id,b.createdAt),o:-bi,i:n++,title:'Bill #'+(b.billNo||b.id),sub:(b.custName||'Customer')+(b.model?' • '+b.model:''),amt:money(b.price),icon:'🧾'})});
  read('skx_repair_jobs_v2').forEach(function(j){if(!j)return;out.push({t:'job',id:j.id,k:key(j.createdAt||j.date),ts:tsOf(j.id,j.createdAt),o:n,i:n++,title:'Repair #'+j.id,sub:(j.customer||'Customer')+(j.model?' • '+j.model:'')+(j.status?' • '+j.status:''),amt:j.estimate?money(j.estimate):'',icon:'🔧'})});
  read('sk_used_mobile_stock_v1').forEach(function(r){if(!r||r.exchange)return;out.push({t:'used',id:r.imei,k:key(r.date),ts:tsOf(r.id,r.createdAt),o:n,i:n++,title:'Used stock • '+(r.model||'Mobile'),sub:(r.dealer||'')+(r.status?' • '+r.status:''),amt:money(r.cost),icon:'📱'})});
  read('sk_credit_ledger_v1').forEach(function(e){if(!e||String(e.source||'')==='bill'||e.billId)return;out.push({t:'credit',id:e.id,k:key(e.date),ts:tsOf(e.id,e.createdAt),o:n,name:e.name,phone:e.phone,i:n++,title:(e.type==='payment'?'Payment • ':'Credit • ')+(e.name||'Customer'),sub:(e.mode||'')+(e.details?' '+e.details:''),amt:money(e.amount),icon:e.type==='payment'?'💰':'📒'})});
  out.sort(function(a,b){return a.k<b.k?1:a.k>b.k?-1:(b.ts-a.ts)||(b.o-a.o)});
  return out;
}
var rows=[],filter='all';
function render(){
  var box=document.getElementById('skRaBody');if(!box)return;
  var list=rows.filter(function(r){return filter==='all'||r.t===filter}).slice(0,80);
  box.innerHTML=list.length?list.map(function(r){
    var idx=rows.indexOf(r);
    return '<button type="button" class="skra-row" onclick="skRaOpen('+idx+')"><span class="skra-ic">'+r.icon+'</span><span class="skra-main"><b>'+esc(r.title)+'</b><small>'+esc(r.sub)+'</small></span><span class="skra-side"><em>'+esc(r.amt)+'</em><small>'+esc(dmy(r.k))+'</small></span></button>';
  }).join(''):'<div class="skra-empty">Nothing here yet</div>';
  document.querySelectorAll('#skRaChips button').forEach(function(b){b.classList.toggle('active',b.dataset.f===filter)});
}
window.skRaFilter=function(f){filter=f;render()};
window.skRaOpen=function(i){
  var r=rows[i];if(!r)return;
  if(typeof window.toggleModal==='function')window.toggleModal('skRecentModal',false);
  setTimeout(function(){
    try{
      if(r.t==='credit'){
        var c=(window.skCPGetCustomers?window.skCPGetCustomers():[]).filter(function(x){return String(x.name)===String(r.name)&&String(x.phone||'')===String(r.phone||'')})[0];
        window.skOpenCreditLedger();if(c&&window.skCPOpenCustomer)window.skCPOpenCustomer(c.key);
      }else window.skGsOpenRaw(r.t,r.id);
    }catch(e){if(typeof window.showToast==='function')window.showToast('Could not open')}
  },200);
};
/* open without the global-search modal being involved */
window.skGsOpenRaw=function(type,id){
  if(type==='bill'){
    var a=read('sk_bills'),idx=a.findIndex(function(x){return x&&String(x.id)===String(id)});
    try{if(Array.isArray(savedBills)){var j=savedBills.findIndex(function(x){return x&&String(x.id)===String(id)});if(j>=0)idx=j}}catch(e){}
    window.viewSavedBill(idx);
  }else if(type==='job'){(window.skCPOpenRepairJob||window.skRjShowDetail)(id)}
  else if(type==='used'){window.skUsedOpen&&window.skUsedOpen();window.skUsedShowManagement&&window.skUsedShowManagement();window.skUsedShowDetails(id)}
};
function ensureModal(){
  if(document.getElementById('skRecentModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skRecentModal';
  el.innerHTML='<div class="modal-sheet skra-sheet"><div class="modal-title"><span>🕘 Recent Activity</span><button class="modal-close-btn" onclick="toggleModal(\'skRecentModal\',false)">✕</button></div>'+
   '<div class="skra-chips" id="skRaChips"><button type="button" data-f="all" onclick="skRaFilter(\'all\')">All</button><button type="button" data-f="bill" onclick="skRaFilter(\'bill\')">Bills</button><button type="button" data-f="job" onclick="skRaFilter(\'job\')">Repairs</button><button type="button" data-f="used" onclick="skRaFilter(\'used\')">Used stock</button><button type="button" data-f="credit" onclick="skRaFilter(\'credit\')">Credit</button></div>'+
   '<div id="skRaBody"></div></div>';
  document.body.appendChild(el);
}
window.skOpenRecentActivity=function(){
  ensureModal();rows=collect();filter='all';render();
  if(typeof window.toggleModal==='function')window.toggleModal('skRecentModal',true);
};
/* home page: the three newest activities of any kind */
window.skRaHome=function(){var t=new Date(),tk=t.getFullYear()+('0'+(t.getMonth()+1)).slice(-2)+('0'+t.getDate()).slice(-2);return collect().filter(function(r){return r.k===tk}).slice(0,3).map(function(r){return {t:r.t,id:r.id,name:r.name,phone:r.phone,title:r.title,sub:r.sub,amt:r.amt,date:dmy(r.k),icon:r.t==='bill'?'file-text':r.t==='job'?'wrench':r.t==='credit'?'credit-card':'package',tone:r.t==='bill'?'blue':r.t==='job'?'rose':r.t==='credit'?'amber':'green'}})};
window.skRaTop=function(n){rows=window.skRaHome();window.skRaOpen(n)};
/* newest bill / repair job (same ordering as the list), used by the home cards and their taps */
window.skRaLatest=function(type){
  var all=collect().filter(function(r){return r.t===type});
  if(type==='job'){
    var ids={};read('skx_repair_jobs_v2').forEach(function(j){if(j)ids[j.id]=j});
    var pend=all.filter(function(r){var j=ids[r.id];return j&&['Received','Checking','Repairing'].indexOf(String(j.status||''))>=0});
    var r0=pend[0]||all[0];return r0?ids[r0.id]:null;
  }
  var bills={};read('sk_bills').forEach(function(b){if(b)bills[b.id]=b});
  return all[0]?bills[all[0].id]:null;
};
/* the three cards on the home page */
window.skRecentCard=function(n){
  try{
    if(n===0){
      var b=window.skRaLatest('bill');if(!b){window.toggleModal('billingModal',true);return}
      window.skGsOpenRaw('bill',b.id);
    }else if(n===1){
      var j=window.skRaLatest('job');
      if(!j){window.skOpenRepairJobs&&window.skOpenRepairJobs();return}
      window.skGsOpenRaw('job',j.id);
    }else if(n===2){
      var it=Array.isArray(inventory)?inventory[0]:null;
      if(it&&it.category&&typeof renderCards==='function'){currentFilter=it.category;renderCards();window.scrollTo&&window.scrollTo({top:0,behavior:'smooth'})}
    }
  }catch(e){if(typeof window.showToast==='function')window.showToast('Could not open')}
};
})();
