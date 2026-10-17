/* SK MOBILES v5.6.161 — "Send history" button on a customer's ledger (Customer Credit / Outstanding page).
   Opens a date-range popup (Today / 7 days / 1 month / All / From-To) and builds the customer's statement from the same data the ledger shows (credit bills, credit/payment entries,
   outstanding) and opens WhatsApp with it. Read-only; nothing else on the page changes. */
(function(){
'use strict';
function num(v){v=Number(v);return isFinite(v)?v:0}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function digits(v){return String(v||'').replace(/\D/g,'')}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function dmy(v){
  if(!v)return '';var s=String(v).trim(),m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))return String(+m[1]).padStart(2,'0')+'/'+String(+m[2]).padStart(2,'0')+'/'+m[3];
  var d=new Date(s);return isNaN(d)?s:String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function sortKey(v){
  var s=String(v||'').trim(),m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))return m[3]+m[2].padStart(2,'0')+m[1].padStart(2,'0');
  var d=new Date(s);return isNaN(d)?'':d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
}
function currentCustomer(){
  var btn=document.querySelector('#skCPDetailView button[data-k]');if(!btn)return null;
  var key=decodeURIComponent(btn.dataset.k),list=[];
  try{list=window.skCPGetCustomers()}catch(e){}
  return list.filter(function(c){return c.key===key})[0]||null;
}
function p2(n){return String(n).padStart(2,'0')}
function keyOf(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function isoToKey(v){return String(v||'').replace(/-/g,'')}
var cust=null,from='',to='';
function inRange(dateVal){
  if(!from&&!to)return true;
  var k=sortKey(dateVal);if(!k)return true;
  if(from&&k<isoToKey(from))return false;
  if(to&&k>isoToKey(to))return false;
  return true;
}
function period(){
  if(!from&&!to)return 'All dates';
  return (from?dmy(from):'Start')+' to '+(to?dmy(to):dmy(keyOf(new Date())));
}
function pick(c){
  var bills=(c.bills||[]).filter(function(x){var b=x.b;return (b.payMode==='Credit'||b.payMode==='EMI'||num(b.balance)>0)&&inRange(b.date)});
  bills.sort(function(a,b){return sortKey(a.b.date)<sortKey(b.b.date)?-1:1});
  var ents=(c.entries||[]).filter(function(e){return String(e.source||'')!=='bill'&&inRange(e.date)});
  ents.sort(function(a,b){return sortKey(a.date)<sortKey(b.date)?-1:1});
  return {bills:bills,ents:ents};
}
function statement(c){
  var r=pick(c);
  var L=['*'+shopName()+' — Account statement*','Customer: '+c.name+(c.phone?' ('+c.phone+')':''),'Period: '+period(),''];
  var paid=r.ents.filter(function(e){return e.type==='payment'}).reduce(function(a,e){return a+num(e.amount)},0);
  L.push('Outstanding now: '+money(c.balance),'Payments in this period: '+money(paid),'');
  if(r.bills.length){
    L.push('*Credit bills*');
    r.bills.forEach(function(x){
      var b=x.b,total=num(b.price),bal=num(b.balance),pd=Math.max(0,total-bal);
      L.push('• '+dmy(b.date)+' '+(b.model||'Bill')+' — Total '+money(total)+', Paid '+money(pd)+', Balance '+money(bal));
    });
    L.push('');
  }
  if(r.ents.length){
    L.push('*Credit / payment history*');
    r.ents.forEach(function(e){
      var tag=e.type==='payment'?'Payment':(e.type==='discount'?'Discount':'Credit');
      L.push('• '+dmy(e.date)+' '+tag+' '+money(e.amount)+(e.note||e.details?' ('+(e.note||e.details)+')':''));
    });
    L.push('');
  }
  if(!r.bills.length&&!r.ents.length)L.push('No entries in this period.','');
  L.push('Thank you 🙏');
  return L.join('\n');
}
function renderSummary(){
  var box=document.getElementById('skCPHistSummary');if(!box||!cust)return;
  var r=pick(cust),paid=r.ents.filter(function(e){return e.type==='payment'}).reduce(function(a,e){return a+num(e.amount)},0);
  box.innerHTML='<div class="skcph-sum"><b>'+r.bills.length+'</b><small>credit bills</small></div><div class="skcph-sum"><b>'+r.ents.length+'</b><small>entries</small></div><div class="skcph-sum"><b>'+money(paid)+'</b><small>payments</small></div>';
}
window.skCPHistSet=function(which,v){if(which==='from')from=v||'';else to=v||'';renderSummary()};
window.skCPHistPreset=function(n){
  var d=new Date();to=keyOf(d);
  if(n==='all'){from='';to=''}else if(n==='month'){var s=new Date();s.setMonth(s.getMonth()-1);from=keyOf(s)}else if(n===0){from=to}else{var t=new Date();t.setDate(t.getDate()-n);from=keyOf(t)}
  var f=document.getElementById('skCPHistFrom'),t2=document.getElementById('skCPHistTo');if(f)f.value=from;if(t2)t2.value=to;renderSummary();
};
function ensureModal(){
  if(document.getElementById('skCPHistModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skCPHistModal';
  el.innerHTML='<div class="modal-sheet skcph-sheet"><div class="modal-title"><span>📤 Send history</span><button class="modal-close-btn" onclick="toggleModal(\'skCPHistModal\',false)">✕</button></div>'+
   '<div id="skCPHistWho" class="skcph-who"></div>'+
   '<div class="skcrg-dates"><label>From<input type="date" id="skCPHistFrom" onchange="skCPHistSet(\'from\',this.value)"/></label><label>To<input type="date" id="skCPHistTo" onchange="skCPHistSet(\'to\',this.value)"/></label></div>'+
   '<div class="skcrg-chips"><button type="button" onclick="skCPHistPreset(0)">Today</button><button type="button" onclick="skCPHistPreset(7)">7 days</button><button type="button" onclick="skCPHistPreset(\'month\')">1 month</button><button type="button" onclick="skCPHistPreset(\'all\')">All</button></div>'+
   '<div id="skCPHistSummary" class="skcph-sums"></div>'+
   '<div class="skcph-actions"><button type="button" class="submit-btn whatsapp-green" onclick="skCPHistSend()">📤 Send on WhatsApp</button></div></div>';
  document.body.appendChild(el);
}
window.skCPHistSend=function(){
  if(!cust){toast('Customer not found');return}
  var d=digits(cust.phone);if(d.length>10)d=d.slice(-10);
  if(d.length!==10){toast('No phone number — opening WhatsApp without a number');d=''}
  window.open('https://wa.me/'+(d?'91'+d:'')+'?text='+encodeURIComponent(statement(cust)),'_blank','noopener');
  if(typeof window.toggleModal==='function')window.toggleModal('skCPHistModal',false);
};
window.skCPSendHistory=function(){
  var c=currentCustomer();if(!c){toast('Customer not found');return}
  cust=c;ensureModal();
  var w=document.getElementById('skCPHistWho');if(w)w.textContent=c.name+(c.phone?' • '+c.phone:'');
  skCPHistPreset('all');
  if(typeof window.toggleModal==='function')window.toggleModal('skCPHistModal',true);
};
function inject(){
  var view=document.getElementById('skCPDetailView');if(!view||view.style.display==='none')return;
  var row=view.querySelector('.skcp-detail-box .skcp-bill-actions');
  if(!row||row.querySelector('.skcp-hist-btn'))return;
  var b=document.createElement('button');b.type='button';b.className='skcp-btn skcp-hist-btn';b.textContent='📤 Send history';b.onclick=window.skCPSendHistory;
  row.appendChild(b);
}
function boot(){
  var view=document.getElementById('skCPDetailView');
  if(view){try{new MutationObserver(inject).observe(view,{childList:true,attributes:true,attributeFilter:['style']})}catch(e){}}
  else setTimeout(boot,1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
