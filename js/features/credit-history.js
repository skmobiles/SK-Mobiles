/* SK MOBILES v5.8.2 — "Send history" button on a customer's ledger (Customer Credit / Outstanding page).
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
  /* V5.9.4: short customer message — outstanding, last payment, and only the last 3 credit items */
  var r=pick(c);
  var clean=function(t){return String(t||'').replace(/\s*•\s*Ledger only/ig,'').trim()};
  var L=['*'+shopName()+' — Account statement*','Customer: '+c.name,'','*Outstanding: '+money(c.balance)+'*'];
  var pays=r.ents.filter(function(e){return e.type==='payment'});
  if(pays.length){var lp=pays[pays.length-1];L.push('Last payment: '+money(lp.amount)+' on '+dmy(lp.date));}
  var items=[];
  r.bills.forEach(function(x){var b=x.b;items.push({k:sortKey(b.date),d:b.date,t:(b.model||'Bill'),a:num(b.balance)||num(b.price)})});
  r.ents.forEach(function(e){if(e.type!=='payment'&&e.type!=='discount')var ed=e.type==='emi'&&e.dueDate?e.dueDate:e.date;items.push({k:sortKey(ed),d:ed,t:clean(e.note||e.details)||'Credit',a:num(e.amount)})});
  items.sort(function(a,b){return a.k<b.k?1:a.k>b.k?-1:0});
  if(items.length){
    L.push('','*Recent items*');
    items.slice(0,3).forEach(function(it){L.push('• '+dmy(it.d)+' — '+it.t+' — '+money(it.a))});
  }
  L.push('','Thank you 🙏');
  return L.join('\n');
}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function fresh(){
  if(!cust)return null;
  try{var f=window.skCPGetCustomers().filter(function(c){return c.key===cust.key})[0];if(f)cust=f}catch(e){}
  return cust;
}
function renderSummary(){
  var box=document.getElementById('skCPHistSummary');if(!box||!fresh())return;
  var r=pick(cust),paid=r.ents.filter(function(e){return e.type==='payment'}).reduce(function(a,e){return a+num(e.amount)},0);
  box.innerHTML='<div class="skcph-sum"><b>'+r.bills.length+'</b><small>credit bills</small></div><div class="skcph-sum"><b>'+r.ents.length+'</b><small>entries</small></div><div class="skcph-sum"><b>'+money(paid)+'</b><small>payments</small></div>';
  var L=document.getElementById('skCPHistList');if(!L)return;
  var rows=[];
  r.bills.forEach(function(x){var b=x.b;rows.push({k:sortKey(b.date),h:'<div class="skcph-row"><div class="skcph-l"><span class="skcph-tag">'+(b.payMode==='EMI'?'EMI bill':'Credit bill')+'</span><b>'+esc(b.model||'Bill')+'</b><small>'+esc(dmy(b.date))+' • Bill '+esc(b.billNo||b.id||'')+' • Balance '+money(b.balance)+'</small></div><div class="skcph-r"><b>'+money(b.price)+'</b><button type="button" class="skcph-ed" onclick="skCPHistOpenBill('+x.idx+')">Open ›</button></div></div>'})});
  r.ents.forEach(function(e){
    var pay=e.type==='payment',emi=e.type==='emi',dt=emi&&e.dueDate?e.dueDate:e.date,src=String(e.source||''),rj=src.indexOf('repair-job')===0;
    var btn=rj&&e.repairJobId?'<button type="button" class="skcph-ed" onclick="skCPHistOpenJob(\''+esc(String(e.repairJobId))+'\')">Open ›</button>':(!rj?'<button type="button" class="skcph-ed" aria-label="Edit" onclick="skCPHistEdit(\''+encodeURIComponent(String(e.id||''))+'\')">✏️ Edit</button>':'');
    rows.push({k:sortKey(dt),h:'<div class="skcph-row"><div class="skcph-l"><span class="skcph-tag'+(pay?' pay':'')+'">'+(pay?'Payment':(emi?'EMI':(e.source==='penalty'?'Penalty':'Credit')))+'</span><b>'+esc(String(e.note||e.details||(pay?'Payment':'Credit')).replace(/\s*•\s*Ledger only/ig,'').slice(0,60))+'</b><small>'+esc(dmy(dt))+(e.mode?' • '+esc(e.mode):'')+'</small></div><div class="skcph-r"><b class="'+(pay?'pay':'')+'">'+(pay?'− ':'')+money(e.amount)+'</b>'+btn+'</div></div>'});
  });
  rows.sort(function(a,b){return a.k<b.k?1:a.k>b.k?-1:0});
  L.innerHTML=rows.length?rows.map(function(x){return x.h}).join(''):'<div class="skcph-empty">Nothing in this date range.</div>';
}
window.skCPHistSet=function(which,v){if(which==='from')from=v||'';else to=v||'';renderSummary()};
window.skCPHistPreset=function(n){
  var d=new Date();to=keyOf(d);
  if(n==='all'){from='';to=''}else if(n==='month'){var s=new Date();s.setMonth(s.getMonth()-1);from=keyOf(s)}else if(n===0){from=to}else{var t=new Date();t.setDate(t.getDate()-n);from=keyOf(t)}
  var f=document.getElementById('skCPHistFrom'),t2=document.getElementById('skCPHistTo');if(f)f.value=from;if(t2)t2.value=to;renderSummary();
};
var watch=0,lastSig='';
function closePage(){var m=document.getElementById('skcpHistPage');if(m)m.remove();if(watch){clearInterval(watch);watch=0}}
window.skCPHistClose=closePage;
window.skCPHistEdit=function(id){if(typeof window.skCPEditLedgerEntry==='function')window.skCPEditLedgerEntry(id)};
window.skCPHistOpenBill=function(idx){closePage();setTimeout(function(){if(window.skCPViewBill)window.skCPViewBill(idx)},60)};
window.skCPHistOpenJob=function(id){closePage();setTimeout(function(){if(window.skCPOpenRepairJob)window.skCPOpenRepairJob(id)},60)};
function ensureModal(){
  closePage();
  var el=document.createElement('div');el.id='skcpHistPage';
  el.innerHTML='<div class="skcph-bar"><button type="button" class="skcph-back" aria-label="Back" onclick="skCPHistClose()">‹</button><div><b>Send history</b><small id="skCPHistWho"></small></div></div>'+
   '<div class="skcph-body"><div class="skcph-card"><div class="skcrg-dates"><label>From<input type="date" id="skCPHistFrom" onchange="skCPHistSet(\'from\',this.value)"/></label><label>To<input type="date" id="skCPHistTo" onchange="skCPHistSet(\'to\',this.value)"/></label></div>'+
   '<div class="skcrg-chips"><button type="button" onclick="skCPHistPreset(0)">Today</button><button type="button" onclick="skCPHistPreset(7)">7 days</button><button type="button" onclick="skCPHistPreset(\'month\')">1 month</button><button type="button" onclick="skCPHistPreset(\'all\')">All</button></div>'+
   '<div id="skCPHistSummary" class="skcph-sums"></div></div>'+
   '<div class="skcph-h">Entries in this period <small>(tap Edit to correct, then send)</small></div><div id="skCPHistList" class="skcph-list"></div></div>'+
   '<div class="skcph-foot"><button type="button" class="skcph-send" onclick="skCPHistSend()">📤 Send on WhatsApp</button></div>';
  document.body.appendChild(el);
  lastSig=localStorage.getItem('sk_credit_ledger_v1')+'|'+localStorage.getItem('sk_bills');
  watch=setInterval(function(){
    if(!document.getElementById('skcpHistPage')){clearInterval(watch);watch=0;return}
    var sg=localStorage.getItem('sk_credit_ledger_v1')+'|'+localStorage.getItem('sk_bills');
    if(sg!==lastSig){lastSig=sg;renderSummary()}
  },600);
}
window.skCPHistSend=function(){
  if(!cust){toast('Customer not found');return}
  var d=digits(cust.phone);if(d.length>10)d=d.slice(-10);
  if(d.length!==10){toast('No phone number — opening WhatsApp without a number');d=''}
  fresh();window.open('https://wa.me/'+(d?'91'+d:'')+'?text='+encodeURIComponent(statement(cust)),'_blank','noopener');
  closePage();
};
window.skCPSendHistory=function(){
  var c=currentCustomer();if(!c){toast('Customer not found');return}
  cust=c;ensureModal();
  var w=document.getElementById('skCPHistWho');if(w)w.textContent=c.name+(c.phone?' • '+c.phone:'');
  skCPHistPreset('all');
  renderSummary();
};
function inject(){
  var view=document.getElementById('skCPDetailView');if(!view||view.style.display==='none')return;
  /* V5.11.3: the big "Send history" box was removed — the blue "Send history" link under the buttons does the same */
  var old=view.querySelector('.skcp-hist-btn');if(old)old.remove();
}
function boot(){
  var view=document.getElementById('skCPDetailView');
  if(view){try{new MutationObserver(inject).observe(view,{childList:true,attributes:true,attributeFilter:['style']})}catch(e){}}
  else setTimeout(boot,1500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
