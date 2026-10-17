/* SK MOBILES v5.6.161 — Old mobile exchange on a bill.
   The exchange value is deducted from the sale price (handled in app.js: skBillNetPrice). This module:
   - toggles the exchange fields, shows the exchange lines on the invoice preview / saved bill view,
   - adds the old mobile to Used Mobile stock (cost = exchange value) when a NEW bill is saved. */
(function(){
'use strict';
var STOCK_KEY='sk_used_mobile_stock_v1';
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹ '+Math.round(num(n)).toLocaleString('en-IN')}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function $(id){return document.getElementById(id)}

function summary(){
  var el=$('exchSummary');if(!el)return;
  var d=typeof window.skBillExchangeData==='function'?window.skBillExchangeData():{value:0};
  el.textContent=d.value>0?'− '+money(d.value):'';
}
function setOpen(open){
  var f=$('exchangeFields'),t=$('exchToggle');if(!f||!t)return;
  f.style.display=open?'grid':'none';t.setAttribute('aria-expanded',open?'true':'false');
  var b=$('exchangeBox');if(b)b.classList.toggle('open',!!open);
}
window.skToggleExchange=function(){var f=$('exchangeFields');setOpen(!f||f.style.display==='none')};

/* ---- invoice lines ---- */
function ensureRows(){
  var sale=$('pvRowSalePrice');if(!sale||$('pvRowExGross'))return;
  var g=document.createElement('tr');g.id='pvRowExGross';g.style.cssText='border-bottom:1px solid #e2e8f0;display:none';
  g.innerHTML='<td class="sk-ui-muted-cell">Sale Price</td><td id="pvExGross" style="padding:7px;text-align:right;font-weight:700;"></td>';
  var x=document.createElement('tr');x.id='pvRowExchange';x.style.cssText='border-bottom:1px solid #e2e8f0;display:none';
  x.innerHTML='<td class="sk-ui-muted-cell" id="pvExLabel">Old Mobile Exchange</td><td id="pvExValue" style="padding:7px;text-align:right;color:#16a34a;font-weight:700;"></td>';
  sale.parentNode.insertBefore(g,sale);sale.parentNode.insertBefore(x,sale);
}
function showRows(gross,ex){
  ensureRows();
  var g=$('pvRowExGross'),x=$('pvRowExchange'),lab=$('pvLabelAmount');if(!g||!x)return;
  var on=ex&&num(ex.value)>0;
  g.style.display=on?'table-row':'none';x.style.display=on?'table-row':'none';
  if(on){
    $('pvExGross').textContent=money(gross);
    $('pvExLabel').textContent='Old Mobile Exchange'+(ex.model?' ('+ex.model+')':'');
    $('pvExValue').textContent='− '+money(ex.value);
    if(lab)lab.textContent='Amount Payable';
  }else if(lab&&lab.textContent==='Amount Payable'){lab.textContent='Amount'}
}
function liveRows(){
  var d=typeof window.skBillExchangeData==='function'?window.skBillExchangeData():null;
  var gross=typeof window.skBillNetPrice==='function'?window.skBillNetPrice()+(d?d.value:0):0;
  showRows(gross,d);summary();
}

/* ---- add the old mobile to used stock ---- */
function addToStock(bill){
  var ex=bill&&bill.exchange;if(!ex||num(ex.value)<=0||ex.stockAdded)return;
  var rows=[];try{rows=JSON.parse(localStorage.getItem(STOCK_KEY)||'[]');if(!Array.isArray(rows))rows=[]}catch(e){rows=[]}
  var imei=String(ex.imei||'').trim()||('EX-'+Date.now().toString().slice(-8));
  if(rows.some(function(r){return String(r.imei)===imei})){toast('Old mobile IMEI already in stock — not added again');ex.stockAdded=true;return}
  var cost=num(ex.value),d=new Date();
  rows.unshift({id:'USED-EX-'+Date.now(),date:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),
    dealer:'Exchange - '+(bill.custName||'Customer'),model:ex.model||'Exchange mobile',ram:'',colour:'',storage:'',kit:'Mobile Only',
    cost:cost,dealerPrice:Math.round((cost+1000)*100)/100,customerPrice:Math.round((cost+2000)*100)/100,imei:imei,
    issue:'Received in exchange (Bill '+(bill.billNo||bill.id||'')+')',status:'In Stock',sale:null,exchange:true,updatedAt:new Date().toISOString()});
  try{localStorage.setItem(STOCK_KEY,JSON.stringify(rows))}catch(e){toast('Could not add old mobile to stock');return}
  ex.stockAdded=true;
  toast('Old mobile added to Used Mobile stock');
}
function wrap(){
  if(typeof window.saveUsedBill==='function'&&!window.saveUsedBill.__ex){
    var o=window.saveUsedBill,w=function(){
      var wasEditing=!!window.__skEditingBillId,beforeId=(typeof savedBills!=='undefined'&&savedBills[0])?savedBills[0].id:null;
      var r=o.apply(this,arguments);
      try{
        if(!wasEditing&&typeof savedBills!=='undefined'&&savedBills[0]&&savedBills[0].id!==beforeId&&savedBills[0].exchange){
          addToStock(savedBills[0]);
          localStorage.setItem('sk_bills',JSON.stringify(savedBills));
        }
      }catch(e){console.warn('Exchange stock add skipped',e)}
      setTimeout(function(){summary();if(!(window.skBillExchangeData&&window.skBillExchangeData().value>0))setOpen(false)},60);
      return r;
    };
    w.__ex=1;window.saveUsedBill=w;
  }
  if(typeof window.updateBillPreview==='function'&&!window.updateBillPreview.__ex){
    var o2=window.updateBillPreview,w2=function(){var r=o2.apply(this,arguments);try{liveRows()}catch(e){}return r};
    w2.__ex=1;window.updateBillPreview=w2;
  }
  if(typeof window.renderSavedBillToLiveInvoicePreview==='function'&&!window.renderSavedBillToLiveInvoicePreview.__ex){
    var o3=window.renderSavedBillToLiveInvoicePreview,w3=function(b){
      var r=o3.apply(this,arguments);
      try{showRows(b&&(b.grossPrice!=null?b.grossPrice:b.price),b&&b.exchange)}catch(e){}
      return r;
    };
    w3.__ex=1;window.renderSavedBillToLiveInvoicePreview=w3;
  }
  if(typeof window.editSavedBill==='function'&&!window.editSavedBill.__ex){
    var o4=window.editSavedBill,w4=function(){var r=o4.apply(this,arguments);setTimeout(function(){summary();setOpen(!!(window.skBillExchangeData&&window.skBillExchangeData().value>0))},60);return r};
    w4.__ex=1;window.editSavedBill=w4;
  }
}
function boot(){wrap();summary();setTimeout(function(){wrap();summary()},1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
