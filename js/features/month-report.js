/* SK MOBILES v5.7.0 — Month-end report (sales, profit, best sellers, repairs, credit collected) + Excel / PDF / WhatsApp.
   Read-only over existing data. */
(function(){
'use strict';
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
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
var MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
function curYm(){var d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)}
function ymLabel(ym){var a=ym.split('-');return MN[+a[1]-1]+' '+a[0]}
var ym=curYm(),lastData=null;

function build(ym){
  var inM=function(d){return toKey(d).slice(0,7)===ym};
  var bills=arr('sk_bills').filter(function(b){return inM(b.date)});
  var S={count:bills.length,total:0,received:0,credit:0,newM:0,usedM:0,keypad:0,modes:{}};
  var models={};
  bills.forEach(function(b){
    var price=num(b.price),mode=b.payMode||'Cash',cr=(mode==='Credit'||mode==='EMI'),got=cr?num(b.advance):price;
    S.total+=price;S.received+=got;S.credit+=Math.max(0,price-got);
    if(b.mobileType==='Used Mobile')S.usedM++;else if(b.mobileType==='Keypad Mobile')S.keypad++;else S.newM++;
    S.modes[mode]=(S.modes[mode]||0)+1;
    var name=[b.brand,b.model].filter(Boolean).join(' ').trim()||'Unknown';
    var k=name.toLowerCase();
    if(!models[k])models[k]={name:name,qty:0,value:0};models[k].qty++;models[k].value+=price;
  });
  var top=Object.keys(models).map(function(k){return models[k]}).sort(function(a,b){return b.qty-a.qty||b.value-a.value}).slice(0,10);

  var used=arr('sk_used_mobile_stock_v1').filter(function(r){return r.status==='Sold'&&r.sale&&inM(r.sale.date)});
  var U={count:used.length,sale:0,profit:0};
  used.forEach(function(r){U.sale+=num(r.sale.price);U.profit+=num(r.sale.profit)});

  var jobs=arr('skx_repair_jobs_v2'),R={received:0,delivered:0,revenue:0,cost:0,profit:0,collected:0,rows:[]};
  jobs.forEach(function(j){
    if(inM(j.createdAt||j.date))R.received++;
    if(j.status==='Delivered'&&inM(j.deliveredAt)){
      R.delivered++;var rev=Math.max(0,num(j.estimate)-num(j.discountAmount)),cost=num(j.dealerPurchaseAmount);
      R.revenue+=rev;R.cost+=cost;R.rows.push({name:j.customer||'',model:j.model||'',revenue:rev,cost:cost});
    }
    (Array.isArray(j.paymentHistory)?j.paymentHistory:[]).forEach(function(p){if(inM(p.date))R.collected+=num(p.amount)});
  });
  R.profit=R.revenue-R.cost;

  var pays=arr('sk_credit_ledger_v1').filter(function(e){return e.type==='payment'&&inM(e.date)});
  var C={count:pays.length,total:0};pays.forEach(function(e){C.total+=num(e.amount)});

  var out=0;try{out=typeof window.skOutstandingTotalForHome==='function'?window.skOutstandingTotalForHome():0}catch(e){}
  return {ym:ym,bills:bills,S:S,top:top,U:U,R:R,C:C,outstanding:out,
    collection:S.received+R.collected+C.total,profit:U.profit+R.profit};
}

function text(d){
  var L=['📊 *'+shopName()+' — Monthly Report*','📅 '+ymLabel(d.ym),'',
   '💰 *Total collection: '+money(d.collection)+'*','📈 *Profit (used mobiles + repairs): '+money(d.profit)+'*','',
   '🛒 *Sales* ('+d.S.count+' bills)','• Sale value: '+money(d.S.total),'• Received: '+money(d.S.received),'• Credit/EMI given: '+money(d.S.credit),
   '• New '+d.S.newM+' • Used '+d.S.usedM+' • Keypad '+d.S.keypad,'',
   '📱 *Used mobiles sold*: '+d.U.count+' • Profit '+money(d.U.profit),
   '🔧 *Repairs*: delivered '+d.R.delivered+' • Revenue '+money(d.R.revenue)+' • Spares '+money(d.R.cost)+' • Profit '+money(d.R.profit),
   '💳 *Credit collected*: '+money(d.C.total)+' ('+d.C.count+' payments)','',
   '🏆 *Best sellers*'];
  d.top.slice(0,5).forEach(function(m,i){L.push((i+1)+'. '+m.name+' — '+m.qty+' pcs • '+money(m.value))});
  if(!d.top.length)L.push('—');
  L.push('','📌 Total outstanding now: '+money(d.outstanding));
  return L.join('\n');
}

function row(a,b,c){return '<div class="skdr-line"><span>'+a+'</span><b>'+b+'</b>'+(c?'<em>'+c+'</em>':'')+'</div>'}
function html(d){
  var h='<div class="skdr-hero"><small>TOTAL COLLECTION</small><b>'+money(d.collection)+'</b></div>';
  h+='<div class="skdr-card"><h4>📈 Profit</h4>'+row('Used mobiles',money(d.U.profit),d.U.count+' sold')+row('Repairs',money(d.R.profit),'Revenue '+money(d.R.revenue)+' − spares '+money(d.R.cost))+
     row('<b>Total profit</b>','<b>'+money(d.profit)+'</b>')+'<div class="skdr-empty" style="padding:4px 0 0;text-align:left">New-mobile cost price is not stored, so it is not included.</div></div>';
  h+='<div class="skdr-card"><h4>🛒 Sales</h4>'+row('Bills',d.S.count,'New '+d.S.newM+' • Used '+d.S.usedM+' • Keypad '+d.S.keypad)+
     row('Sale value',money(d.S.total))+row('Received',money(d.S.received))+row('Credit / EMI given',money(d.S.credit))+'</div>';
  h+='<div class="skdr-card"><h4>🏆 Best selling models</h4>'+(d.top.length?d.top.map(function(m,i){
     return '<div class="skdr-item"><span>'+(i+1)+'. '+esc(m.name)+'<small>'+m.qty+' pcs</small></span><b>'+money(m.value)+'</b></div>'}).join(''):'<div class="skdr-empty">No sales this month.</div>')+'</div>';
  h+='<div class="skdr-card"><h4>🔧 Repairs</h4>'+row('New jobs',d.R.received)+row('Delivered',d.R.delivered)+row('Collected',money(d.R.collected))+'</div>';
  h+='<div class="skdr-card"><h4>💳 Credit collected</h4>'+row('Payments',d.C.count)+row('Amount',money(d.C.total))+'</div>';
  h+='<div class="skdr-card"><h4>📌 Position now</h4>'+row('Total outstanding',money(d.outstanding))+'</div>';
  return h;
}
function render(){
  lastData=build(ym);
  var l=document.getElementById('skMrLabel');if(l)l.textContent=ymLabel(ym)+(ym===curYm()?' • This month':'');
  var b=document.getElementById('skMrBody');if(b)b.innerHTML=html(lastData);
}
function ensureModal(){
  if(document.getElementById('skMonthReportModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skMonthReportModal';
  el.innerHTML='<div class="modal-sheet skdr-sheet"><div class="modal-title"><span>📆 Monthly Report</span><button class="modal-close-btn" onclick="toggleModal(\'skMonthReportModal\',false)">✕</button></div>'+
   '<div class="skdr-nav"><button type="button" class="skdr-nb" onclick="skMrStep(-1)" aria-label="Previous month">‹</button>'+
   '<div class="skdr-datebox"><span id="skMrLabel"></span></div>'+
   '<button type="button" class="skdr-nb" onclick="skMrStep(1)" aria-label="Next month">›</button>'+
   '<button type="button" class="skdr-today" onclick="skMrNow()">Now</button></div>'+
   '<div id="skMrBody"></div>'+
   '<div class="skdr-actions skdr-two"><button type="button" class="submit-btn whatsapp-green" onclick="skMrShare()">📤 WhatsApp</button>'+
   '<button type="button" class="submit-btn" onclick="skMrExcel()">📊 Excel</button></div>'+
   '<div class="skdr-actions"><button type="button" class="submit-btn" onclick="skMrPdf()">📄 Download PDF</button></div></div>';
  document.body.appendChild(el);
}
window.skOpenMonthReport=function(){ensureModal();ym=curYm();render();if(typeof window.toggleModal==='function')window.toggleModal('skMonthReportModal',true)};
window.skMrStep=function(n){var a=ym.split('-'),d=new Date(+a[0],+a[1]-1+n,1);ym=d.getFullYear()+'-'+p2(d.getMonth()+1);render()};
window.skMrNow=function(){ym=curYm();render()};
window.skMrShare=function(){window.open('https://wa.me/?text='+encodeURIComponent(text(build(ym))),'_blank','noopener')};

window.skMrExcel=function(){
  if(typeof XLSX==='undefined'){toast('Excel library not loaded (internet needed once). Try again.');return}
  var d=build(ym),wb=XLSX.utils.book_new();
  var sum=[['Monthly Report',ymLabel(d.ym)],[],['Total collection',d.collection],['Profit (used mobiles + repairs)',d.profit],[],
    ['Bills',d.S.count],['Sale value',d.S.total],['Received',d.S.received],['Credit/EMI given',d.S.credit],
    ['New mobiles',d.S.newM],['Used mobiles',d.S.usedM],['Keypad mobiles',d.S.keypad],[],
    ['Used mobiles sold',d.U.count],['Used mobile profit',d.U.profit],[],
    ['Repairs delivered',d.R.delivered],['Repair revenue',d.R.revenue],['Spare cost',d.R.cost],['Repair profit',d.R.profit],['Repair payments collected',d.R.collected],[],
    ['Credit payments',d.C.count],['Credit collected',d.C.total],[],['Total outstanding now',d.outstanding]];
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(sum),'Summary');
  var bills=[['Bill No','Date','Customer','Phone','Brand','Model','Type','Pay mode','Price','Advance','Balance','IMEI']];
  d.bills.forEach(function(b){bills.push([b.billNo||b.id,b.date,b.custName,b.phone,b.brand,b.model,b.mobileType,b.payMode,num(b.price),num(b.advance),num(b.balance),b.imei1||''])});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(bills),'Bills');
  var top=[['Model','Qty','Sale value']];d.top.forEach(function(m){top.push([m.name,m.qty,m.value])});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(top),'Best sellers');
  var rep=[['Customer','Model','Revenue','Spare cost','Profit']];d.R.rows.forEach(function(r){rep.push([r.name,r.model,r.revenue,r.cost,r.revenue-r.cost])});
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rep),'Repairs');
  XLSX.writeFile(wb,'SK_Mobiles_Report_'+d.ym+'.xlsx');
  toast('✅ Excel downloaded');
};
window.skMrPdf=function(){
  if(typeof html2pdf!=='function'){toast('PDF library not loaded (internet needed once). Try again.');return}
  var d=build(ym);
  var box=document.createElement('div');
  box.style.cssText='position:fixed;left:-9999px;top:0;width:700px;padding:24px;background:#fff;color:#0f172a;font-family:Inter,Arial,sans-serif;font-size:13px';
  function r2(a,b){return '<tr><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0">'+a+'</td><td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">'+b+'</td></tr>'}
  box.innerHTML='<h2 style="margin:0 0 2px">'+esc(shopName())+'</h2><div style="color:#64748b;margin-bottom:14px">Monthly Report — '+esc(ymLabel(d.ym))+'</div>'+
   '<table style="width:100%;border-collapse:collapse;margin-bottom:14px">'+r2('Total collection',money(d.collection))+r2('Profit (used mobiles + repairs)',money(d.profit))+
   r2('Bills / Sale value',d.S.count+' / '+money(d.S.total))+r2('Received',money(d.S.received))+r2('Credit/EMI given',money(d.S.credit))+
   r2('Used mobiles sold / profit',d.U.count+' / '+money(d.U.profit))+r2('Repairs delivered / profit',d.R.delivered+' / '+money(d.R.profit))+
   r2('Credit collected',money(d.C.total))+r2('Total outstanding now',money(d.outstanding))+'</table>'+
   '<h3 style="margin:0 0 6px">Best selling models</h3><table style="width:100%;border-collapse:collapse">'+
   (d.top.map(function(m,i){return r2((i+1)+'. '+esc(m.name)+' ('+m.qty+' pcs)',money(m.value))}).join('')||r2('No sales','—'))+'</table>';
  document.body.appendChild(box);
  html2pdf().set({margin:8,filename:'SK_Mobiles_Report_'+d.ym+'.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}})
    .from(box).save().then(function(){box.remove();toast('✅ PDF downloaded')}).catch(function(){box.remove();toast('❌ PDF failed')});
};
function addDrawer(){
  var ref=document.querySelector('.menu-drawer-btn[onclick*="skOpenDailyReport"]');if(!ref||document.getElementById('skDrMonth'))return;
  var b=document.createElement('button');b.className='menu-drawer-btn';b.id='skDrMonth';b.type='button';b.setAttribute('onclick','skOpenMonthReport(); toggleLeftDrawer(false);');
  b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18M8 15h3M8 18h6"/></svg></span><span class="menu-btn-label">Monthly Report</span><span class="menu-arrow">›</span>';
  ref.parentNode.insertBefore(b,ref.nextSibling);
}
function boot(){addDrawer();setTimeout(addDrawer,1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
