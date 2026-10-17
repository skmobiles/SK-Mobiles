/* SK MOBILES v5.6.159 — "Send history" button on a customer's ledger (Customer Credit / Outstanding page).
   Builds the customer's statement from the same data the ledger shows (credit bills, credit/payment entries,
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
function statement(c){
  var L=['*'+shopName()+' — Account statement*','Customer: '+c.name+(c.phone?' ('+c.phone+')':''),''];
  L.push('Outstanding now: '+money(c.balance),'Total credit / EMI: '+money(c.credits),'Payments received: '+money(c.payments),'');
  var bills=(c.bills||[]).filter(function(x){var b=x.b;return b.payMode==='Credit'||b.payMode==='EMI'||num(b.balance)>0});
  bills.sort(function(a,b){return sortKey(a.b.date)<sortKey(b.b.date)?-1:1});
  if(bills.length){
    L.push('*Credit bills*');
    bills.slice(-15).forEach(function(x){
      var b=x.b,total=num(b.price),bal=num(b.balance),paid=Math.max(0,total-bal);
      L.push('• '+dmy(b.date)+' '+(b.model||'Bill')+' — Total '+money(total)+', Paid '+money(paid)+', Balance '+money(bal));
    });
    L.push('');
  }
  var ents=(c.entries||[]).filter(function(e){return String(e.source||'')!=='bill'});
  ents.sort(function(a,b){return sortKey(a.date)<sortKey(b.date)?-1:1});
  if(ents.length){
    L.push('*Credit / payment history*');
    ents.slice(-25).forEach(function(e){
      var tag=e.type==='payment'?'Payment':(e.type==='discount'?'Discount':'Credit');
      L.push('• '+dmy(e.date)+' '+tag+' '+money(e.amount)+(e.note?' ('+e.note+')':''));
    });
    if(ents.length>25)L.push('(older entries not shown)');
    L.push('');
  }
  L.push('Thank you 🙏');
  return L.join('\n');
}
window.skCPSendHistory=function(){
  var c=currentCustomer();if(!c){toast('Customer not found');return}
  var d=digits(c.phone);if(d.length>10)d=d.slice(-10);
  if(d.length!==10){toast('No phone number — opening WhatsApp without a number');d=''}
  window.open('https://wa.me/'+(d?'91'+d:'')+'?text='+encodeURIComponent(statement(c)),'_blank','noopener');
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
