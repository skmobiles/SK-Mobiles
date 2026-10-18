/* SK MOBILES v5.8.1 — Dealer payment tracker.
   Bought = used-mobile purchases (dealer + purchase price) + repair spare-part purchases (dealer + amount).
   Paid   = payments entered here (key skx_dealer_payments_v1, synced like every other skx_ key).
   Purchases are treated as already paid; only ones marked "Pay later" count as owed. Balance = credit purchases - Paid. Only purchases on/after the "count from" date are included, so old, already-settled
   purchases do not show up as pending. */
(function(){
'use strict';
var CRED_KEY='skx_dealer_credit_v1',PAY_KEY='skx_dealer_payments_v1',START_KEY='skx_dealer_start_v1',USED_KEY='sk_used_mobile_stock_v1',REP_KEY='skx_repair_jobs_v2';
function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'');return v==null?f:v}catch(e){return f}}
function arr(k){var v=read(k,[]);return Array.isArray(v)?v:[]}
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function p2(n){return String(n).padStart(2,'0')}
function toKey(s){
  if(!s)return '';s=String(s).trim();var m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))return m[3]+'-'+p2(m[2])+'-'+p2(m[1]);
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  var d=new Date(s);return isNaN(d)?'':d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
}
function today(){var d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function fmt(k){var a=String(k).split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0]:String(k||'')}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function startKey(){var s=localStorage.getItem(START_KEY);return s||(today().slice(0,8)+'01')}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}

function credSet(){var v=read(CRED_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function compute(){
  var start=startKey(),map={},cs=credSet();
  function get(name){
    var n=String(name||'').trim();if(!n)return null;
    var k=n.toLowerCase();if(!map[k])map[k]={name:n,bought:0,credit:0,paid:0,buys:[],pays:[]};return map[k];
  }
  arr(USED_KEY).forEach(function(r){
    if(r.exchange)return;var d=get(r.dealer);if(!d)return;var dt=toKey(r.date);
    if(dt&&dt<start)return;
    var id='u:'+(r.imei||r.id||dt+num(r.cost)),cr=!!cs[id];d.bought+=num(r.cost);if(cr)d.credit+=num(r.cost);d.buys.push({id:id,credit:cr,date:dt,label:(r.model||'Used mobile')+(r.imei?' • '+String(r.imei).slice(-6):''),amount:num(r.cost)});
  });
  arr(REP_KEY).forEach(function(j){
    var amt=num(j.dealerPurchaseAmount);if(!amt)return;var d=get(j.dealerName);if(!d)return;var dt=toKey(j.date||j.createdAt);
    if(dt&&dt<start)return;
    var id='r:'+(j.id||dt+amt),cr=!!cs[id];d.bought+=amt;if(cr)d.credit+=amt;d.buys.push({id:id,credit:cr,date:dt,label:'Spare parts • '+(j.model||'Repair'),amount:amt});
  });
  arr(PAY_KEY).forEach(function(p){
    var d=get(p.dealer);if(!d)return;var dt=toKey(p.date);
    d.paid+=num(p.amount);d.pays.push({id:p.id,date:dt,note:p.note||'',amount:num(p.amount)});
  });
  var list=Object.keys(map).filter(function(k){return map[k].buys.length||map[k].pays.length}).map(function(k){var d=map[k];d.balance=d.credit-d.paid;
    d.buys.sort(function(a,b){return a.date<b.date?1:-1});d.pays.sort(function(a,b){return a.date<b.date?1:-1});return d})
    .sort(function(a,b){return b.balance-a.balance||a.name.localeCompare(b.name)});
  var total=0;list.forEach(function(d){if(d.balance>0)total+=d.balance});
  return {list:list,total:total,start:start};
}

var view=null; /* dealer key being viewed, null = list */
function render(){
  var body=document.getElementById('skDlBody');if(!body)return;
  var D=compute();
  if(view){
    var d=D.list.filter(function(x){return x.name.toLowerCase()===view})[0];
    if(!d){view=null}else{body.innerHTML=detailHtml(d);return}
  }
  var h='<div class="skdr-hero"><small>TOTAL TO PAY DEALERS</small><b>'+money(D.total)+'</b></div>'+
   '<div class="skdl-start"><span>Count purchases from</span><input type="date" id="skDlStart" value="'+esc(D.start)+'" onchange="skDlSetStart(this.value)"/></div>';
  if(!D.list.length)h+='<div class="skdr-empty">No dealer purchases yet. Add a dealer name in Used Mobile purchase or Repair spare parts.</div>';
  else h+='<div class="skdr-card">'+D.list.map(function(d){
    var cls=d.balance>0?'skdl-due':(d.balance<0?'skdl-adv':'skdl-ok');
    return '<div class="skdr-item skdl-row" onclick="skDlOpen(\''+esc(d.name.toLowerCase().replace(/\\/g,'\\\\').replace(/'/g,"\\'"))+'\')"><span>'+esc(d.name)+'<small>Bought '+money(d.bought)+' • On credit '+money(d.credit)+' • Paid '+money(d.paid)+'</small></span><b class="'+cls+'">'+(d.balance<0?'Adv ':'')+money(Math.abs(d.balance))+'</b></div>';
  }).join('')+'</div>';
  body.innerHTML=h;
}
function detailHtml(d){
  var bal=d.balance;
  var h='<button type="button" class="skdl-back" onclick="skDlOpen(null)">‹ All dealers</button>'+
   '<div class="skdr-hero"><small>'+esc(d.name.toUpperCase())+' — '+(bal<0?'ADVANCE PAID':'BALANCE TO PAY')+'</small><b>'+money(Math.abs(bal))+'</b></div>'+
   '<div class="skdr-card"><h4>Add payment</h4><div class="skdl-form"><input type="number" id="skDlAmt" min="0" step="0.01" inputmode="decimal" placeholder="Amount ₹"/>'+
   '<input type="date" id="skDlDate" value="'+today()+'"/><input type="text" id="skDlNote" placeholder="Note (optional)"/>'+
   '<button type="button" class="submit-btn" onclick="skDlAddPay()">Save payment</button>'+
   (bal>0?'<button type="button" class="submit-btn skdl-settle" onclick="skDlSettle()">Pay full balance '+money(bal)+'</button>':'')+'</div></div>'+
   '<div class="skdr-card"><h4>Payments given</h4>'+(d.pays.length?d.pays.map(function(p){
     return '<div class="skdr-item"><span>'+fmt(p.date)+'<small>'+esc(p.note||'Payment')+'</small></span><b>'+money(p.amount)+' <button type="button" class="skdl-x" aria-label="Delete payment" onclick="skDlDelPay(\''+esc(p.id)+'\')">✕</button></b></div>';
   }).join(''):'<div class="skdr-empty">No payments yet</div>')+'</div>'+
   '<div class="skdr-card"><h4>Purchases <small style="font-weight:500;opacity:.7">(paid by default — tap Pay later only if you owe the dealer)</small></h4>'+(d.buys.length?d.buys.map(function(b){
     return '<div class="skdr-item"><span>'+esc(b.label)+'<small>'+fmt(b.date)+' • '+(b.credit?'Pay later (credit)':'Paid')+'</small></span><b>'+money(b.amount)+' <button type="button" class="skdl-x" onclick="skDlCred(\''+esc(b.id).replace(/'/g,"\\'")+'\')">'+(b.credit?'Mark paid':'Pay later')+'</button></b></div>';
   }).join(''):'<div class="skdr-empty">No purchases in this period</div>')+'</div>'+
   '<div class="skdr-actions"><button type="button" class="submit-btn whatsapp-green" onclick="skDlShare()">📤 Share on WhatsApp</button></div>';
  return h;
}
function ensureModal(){
  if(document.getElementById('skDealerModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skDealerModal';
  el.innerHTML='<div class="modal-sheet skdr-sheet"><div class="modal-title"><span>🤝 Dealer Payments</span><button class="modal-close-btn" onclick="toggleModal(\'skDealerModal\',false)">✕</button></div><div id="skDlBody"></div></div>';
  document.body.appendChild(el);
}
window.skOpenDealerTracker=function(){ensureModal();view=null;render();if(typeof window.toggleModal==='function')window.toggleModal('skDealerModal',true)};
window.skDlOpen=function(k){view=k;render();var s=document.querySelector('#skDealerModal .skdr-sheet');if(s)s.scrollTop=0};
window.skDlCred=function(id){var c=credSet();if(c[id])delete c[id];else c[id]=1;try{localStorage.setItem(CRED_KEY,JSON.stringify(c))}catch(e){}render()};
window.skDlSetStart=function(v){if(!v)return;try{localStorage.setItem(START_KEY,v)}catch(e){}render()};
function curDealer(){var D=compute();return D.list.filter(function(x){return x.name.toLowerCase()===view})[0]}
function addPay(name,amount,date,note){
  var a=arr(PAY_KEY);a.push({id:'DP-'+Date.now(),dealer:name,amount:amount,date:date||today(),note:note||'',createdAt:new Date().toISOString()});
  try{localStorage.setItem(PAY_KEY,JSON.stringify(a))}catch(e){toast('Could not save');return false}
  return true;
}
window.skDlAddPay=function(){
  var d=curDealer();if(!d)return;
  var amt=num(document.getElementById('skDlAmt').value);
  if(!(amt>0)){toast('Enter a valid amount');return}
  if(addPay(d.name,amt,document.getElementById('skDlDate').value,document.getElementById('skDlNote').value.trim())){toast('✅ Payment saved');render()}
};
window.skDlSettle=function(){
  var d=curDealer();if(!d||d.balance<=0)return;
  if(!confirm('Record payment of '+money(d.balance)+' to '+d.name+'?'))return;
  if(addPay(d.name,d.balance,today(),'Full settlement')){toast('✅ Settled');render()}
};
window.skDlDelPay=function(id){
  if(!confirm('Delete this payment entry?'))return;
  var a=arr(PAY_KEY).filter(function(p){return p.id!==id});
  try{localStorage.setItem(PAY_KEY,JSON.stringify(a))}catch(e){}
  render();
};
window.skDlShare=function(){
  var d=curDealer();if(!d)return;
  var t=shopName()+' — Dealer account\n'+d.name+'\nBought: '+money(d.bought)+'\nOn credit: '+money(d.credit)+'\nPaid: '+money(d.paid)+'\n'+(d.balance<0?'Advance: ':'Balance: ')+money(Math.abs(d.balance));
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank','noopener');
};
function addDrawer(){
  var ref=document.getElementById('skDrMonth')||document.querySelector('.menu-drawer-btn[onclick*="skOpenDailyReport"]');
  if(!ref||document.getElementById('skDrDealer'))return;
  var b=document.createElement('button');b.className='menu-drawer-btn';b.id='skDrDealer';b.type='button';b.setAttribute('onclick','skOpenDealerTracker(); toggleLeftDrawer(false);');
  b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h18v12H3z"/><path d="M3 11h18M8 15h3"/><path d="M8 7V5h8v2"/></svg></span><span class="menu-btn-label">Dealer Payments</span><span class="menu-arrow">›</span>';
  ref.parentNode.insertBefore(b,ref.nextSibling);
}
function boot(){addDrawer();setTimeout(addDrawer,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
