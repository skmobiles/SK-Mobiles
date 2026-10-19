/* SK MOBILES V5.11.0 — Payment receipts.
   Every payment the shop receives (down payment, credit / EMI payment, repair advance, repair payment) gets its own
   receipt with the balance after that payment. The sale bill itself is never changed by a later payment.
   Receipts are stored in sk_receipts_v1 (synced and backed up like every other sk_ key). */
(function(){
'use strict';
var KEY='sk_receipts_v1',BILLS='sk_bills',MIG='sk_receipts_migrated_v1';
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function arr(k){try{var a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function num(v){var n=Number(v);return isFinite(n)?n:0}
function money(n){return '₹'+num(n).toLocaleString('en-IN')}
function toast(t){try{if(typeof showToast==='function')showToast(t)}catch(e){}}
function pad(n,l){return String(n).padStart(l||2,'0')}
function dmy(v){
  if(!v)return '';var s=String(v),m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return pad(m[1])+'/'+pad(m[2])+'/'+m[3];
  var d=new Date(v);return isNaN(d)?s:pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear();
}
function shop(){return {name:localStorage.getItem('sk_shop_name')||'SK MOBILES',addr:localStorage.getItem('sk_shop_addr')||'',phone:localStorage.getItem('sk_shop_phone')||''}}
function all(){return arr(KEY)}
function save(a){localStorage.setItem(KEY,JSON.stringify(a))}

/* sum of the payments received AFTER a sale bill was made (credit / EMI payments) */
window.skPaidAfterSale=function(b){
  return (b&&Array.isArray(b.paymentReceipts)?b.paymentReceipts:[]).reduce(function(s,r){return s+(r&&r.type==='payment'?num(r.amount):0)},0);
};

/* add a receipt; returns it */
window.skReceiptAdd=function(r){
  var a=all(),now=new Date(),day=now.getFullYear()+pad(now.getMonth()+1)+pad(now.getDate());
  var date=r.date?dmy(r.date):pad(now.getDate())+'/'+pad(now.getMonth()+1)+'/'+now.getFullYear();
  var seq=a.filter(function(x){return String(x.no||'').indexOf('RC-'+day)===0}).length+1;
  var rec={id:'RC'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),no:r.no||('RC-'+day+'-'+pad(seq,3)),date:date,createdAt:now.toISOString(),
    customer:r.customer||'',phone:r.phone||'',kind:r.kind||'Payment',ref:r.ref||'',item:r.item||'',amount:num(r.amount),mode:r.mode||'Cash',
    total:num(r.total),paidTotal:num(r.paidTotal),balance:Math.max(0,num(r.balance)),billId:r.billId||'',jobId:r.jobId||'',note:r.note||''};
  a.push(rec);save(a);return rec;
};
/* down payment of a Credit / EMI sale */
window.skReceiptForSale=function(b){
  try{
    if(!b||(b.payMode!=='Credit'&&b.payMode!=='EMI')||num(b.advance)<=0)return null;
    var total=num(b.price);
    return window.skReceiptAdd({date:b.date,customer:b.custName,phone:b.phone,kind:'Down payment',ref:'Bill '+(b.billNo||b.id),item:b.model,amount:b.advance,mode:'Cash',total:total,paidTotal:b.advance,balance:Math.max(0,total-num(b.advance)),billId:b.id});
  }catch(e){console.warn('receipt for sale',e);return null}
};
/* credit / EMI payment made against a bill (called from cpUpdateBill AFTER the bill balance is reduced) */
window.skReceiptForBillPayment=function(b,pay,data){
  try{
    var total=num(b.price),paid=num(b.advance)+window.skPaidAfterSale(b);
    return window.skReceiptAdd({date:data&&data.date,customer:b.custName,phone:b.phone,kind:(b.payMode==='EMI'?'EMI payment':'Credit payment'),ref:'Bill '+(b.billNo||b.id),item:b.model,amount:pay,mode:data&&data.mode,total:total,paidTotal:paid,balance:num(b.balance),billId:b.id,note:data&&data.note});
  }catch(e){console.warn('receipt for payment',e);return null}
};
/* payment on the customer's account without a sale bill */
window.skReceiptForAccount=function(name,phone,pay,data,balanceAfter){
  try{return window.skReceiptAdd({date:data&&data.date,customer:name,phone:phone,kind:'Credit payment',ref:'Customer account',amount:pay,mode:data&&data.mode,total:num(balanceAfter)+num(pay),paidTotal:num(pay),balance:balanceAfter,note:data&&data.note})}catch(e){return null}
};
window.skReceiptForRepair=function(job,amount,kind,mode){
  try{
    var total=Math.max(0,num(job.estimate)-Math.max(0,num(job.discountAmount)));
    return window.skReceiptAdd({customer:job.customer,phone:job.phone,kind:kind,ref:'Repair job '+(job.id||''),item:job.model,amount:amount,mode:mode||'Cash',total:total,paidTotal:num(job.paidAmount),balance:Math.max(0,total-num(job.paidAmount)),jobId:job.id});
  }catch(e){return null}
};

/* One-time repair of old data: earlier versions added every credit payment to the bill's Down Payment.
   Put the original Down Payment back (= saved Down Payment minus the payments) and create the missing receipts. */
function migrate(){
  try{
    var bills=arr(BILLS),changed=false,rcs=all();
    bills.forEach(function(b){
      if(!b||b.advLocked||!Array.isArray(b.paymentReceipts))return;
      var pays=b.paymentReceipts.filter(function(r){return r&&r.type==='payment'&&num(r.amount)>0});
      if(!pays.length){b.advLocked=true;changed=true;return}
      var sum=pays.reduce(function(s,r){return s+num(r.amount)},0),adv=num(b.advance);
      var orig=adv-sum;
      if(orig<0)orig=Math.max(0,adv-sum); /* cannot be negative */
      var total=num(b.price),running=Math.max(0,total-orig);
      pays.forEach(function(r){
        running=Math.max(0,running-num(r.amount));
        if(r.rcNo)return;
        var rec={id:'RC'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),no:'',date:dmy(r.date),createdAt:new Date().toISOString(),customer:b.custName||'',phone:b.phone||'',kind:b.payMode==='EMI'?'EMI payment':'Credit payment',ref:'Bill '+(b.billNo||b.id),item:b.model||'',amount:num(r.amount),mode:r.mode||'Cash',total:total,paidTotal:total-running,balance:running,billId:b.id,jobId:'',note:r.note||'',migrated:true};
        var d=String(rec.date).split('/');var day=d.length===3?d[2]+d[1]+d[0]:'00000000';
        rec.no='RC-'+day+'-'+pad(rcs.filter(function(x){return String(x.no).indexOf('RC-'+day)===0}).length+1,3);
        rcs.push(rec);r.rcNo=rec.no;r.rcId=rec.id;r.balanceAfter=running;
      });
      b.advance=orig;b.advLocked=true;changed=true;
    });
    if(changed){
      localStorage.setItem(BILLS,JSON.stringify(bills));save(rcs);
      try{if(typeof savedBills!=='undefined')savedBills=bills}catch(e){}
      try{if(typeof renderBillHistory==='function')renderBillHistory()}catch(e){}
    }
    localStorage.setItem(MIG,'1');
  }catch(e){console.warn('receipt migration',e)}
}
window.skReceiptsMigrate=migrate;

/* ---------- receipt view ---------- */
function receiptHtml(r){
  var s=shop();
  var row=function(a,b,strong){return '<tr><td>'+esc(a)+'</td><td'+(strong?' class="b"':'')+'>'+b+'</td></tr>'};
  return '<div class="skrc-paper" id="skrcPaper"><div class="skrc-head"><b>'+esc(s.name)+'</b>'+(s.addr?'<small>'+esc(s.addr)+'</small>':'')+(s.phone?'<small>Phone: '+esc(s.phone)+'</small>':'')+'</div>'+
    '<div class="skrc-title">PAYMENT RECEIPT</div>'+
    '<table class="skrc-t">'+row('Receipt No',esc(r.no))+row('Date',esc(r.date))+row('Received from',esc(r.customer||'—'))+(r.phone?row('Phone',esc(r.phone)):'')+
    row('For',esc(r.kind)+(r.ref?' • '+esc(r.ref):''))+(r.item?row('Item',esc(r.item)):'')+row('Payment mode',esc(r.mode))+'</table>'+
    '<div class="skrc-amt"><span>Amount received</span><b>'+money(r.amount)+'</b></div>'+
    '<table class="skrc-t">'+row('Total amount',money(r.total))+row('Paid so far',money(r.paidTotal))+'</table>'+
    '<div class="skrc-bal'+(r.balance>0?' due':' clear')+'"><span>'+(r.balance>0?'Balance due':'Balance')+'</span><b>'+(r.balance>0?money(r.balance):'NIL — fully paid')+'</b></div>'+
    '<div class="skrc-foot">Thank you!</div></div>';
}
function waText(r){
  var s=shop();
  return '*'+s.name+'*\n*PAYMENT RECEIPT*\nReceipt No: '+r.no+'\nDate: '+r.date+'\nReceived from: '+(r.customer||'')+'\nFor: '+r.kind+(r.ref?' • '+r.ref:'')+(r.item?'\nItem: '+r.item:'')+
    '\nMode: '+r.mode+'\n\n*Amount received: '+money(r.amount)+'*\nTotal: '+money(r.total)+'\nPaid so far: '+money(r.paidTotal)+'\n*'+(r.balance>0?'Balance due: '+money(r.balance):'Balance: NIL (fully paid)')+'*\n\nThank you!'+(s.phone?'\n'+s.phone:'');
}
function pdfBlob(){
  var el=$('skrcPaper');if(!el||typeof html2pdf!=='function')return Promise.reject(new Error('PDF tool not ready'));
  var clone=el.cloneNode(true);clone.style.cssText='width:360px;background:#fff;color:#0f172a;padding:16px;position:fixed;left:-9999px;top:0';document.body.appendChild(clone);
  return html2pdf().set({margin:6,filename:'Receipt.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a5',orientation:'portrait'}}).from(clone).outputPdf('blob').then(function(b){clone.remove();return b},function(e){clone.remove();throw e});
}
function shareFile(r){
  toast('Preparing receipt…');
  pdfBlob().then(function(blob){
    var f=new File([blob],r.no+'.pdf',{type:'application/pdf'});
    if(navigator.canShare&&navigator.canShare({files:[f]})&&navigator.share)return navigator.share({files:[f],title:'Receipt '+r.no,text:waText(r)});
    var u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=r.no+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},4000);toast('Receipt PDF downloaded');
  }).catch(function(e){if(e&&e.name==='AbortError')return;console.warn(e);toast('❌ Could not make the PDF. Use WhatsApp text instead.')});
}
function shareWa(r){
  var ph=String(r.phone||'').replace(/\D/g,'');if(ph.length===10)ph='91'+ph;
  window.open('https://wa.me/'+(ph||'')+'?text='+encodeURIComponent(waText(r)),'_blank');
}
function find(id){return all().find(function(x){return x.id===id||x.no===id})}
window.skReceiptOpen=function(id){
  var r=find(id);if(!r){toast('Receipt not found');return}
  var d=$('skrcDlg');if(d)d.remove();
  d=document.createElement('div');d.id='skrcDlg';d.className='skrc-dlg';
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>Receipt</b></div><div class="skrc-body">'+receiptHtml(r)+'</div>'+
    '<div class="skrc-act"><button type="button" data-a="edit" class="ed">✏️ Edit</button><button type="button" data-a="wa" class="wa">WhatsApp</button><button type="button" data-a="pdf" class="pdf">Share PDF</button></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')){d.remove();return}
    var b=e.target.closest('[data-a]');if(!b)return;
    if(b.dataset.a==='edit'){d.remove();editForm(r)}else if(b.dataset.a==='wa')shareWa(r);else shareFile(r);
  });
};
function forBill(billId){return all().filter(function(r){return r.billId===billId}).sort(function(a,b){return String(a.createdAt)<String(b.createdAt)?-1:1})}
window.skReceiptsForBill=forBill;

/* "Payments after sale" block under a saved bill (outside the invoice paper, so the bill and its PDF stay as sold) */
function paymentsBlock(b){
  var list=forBill(b.id);if(!list.length&&!(b.payMode==='Credit'||b.payMode==='EMI'))return '';
  if(!list.length&&num(b.balance)<=0)return '';
  var pays=list.filter(function(r){return r.kind!=='Down payment'});
  var h='<div class="skrc-after"><div class="skrc-after-h">Payments after sale</div>';
  var dp=list.filter(function(r){return r.kind==='Down payment'})[0];
  if(dp)h+='<button type="button" class="skrc-item" onclick="skReceiptOpen(\''+dp.id+'\')"><span><b>'+money(dp.amount)+'</b><small>Down payment • '+esc(dp.date)+'</small></span><em>'+esc(dp.no)+' ›</em></button>';
  if(!pays.length)h+='<div class="skrc-none">No payments after the sale yet.</div>';
  pays.forEach(function(r){h+='<button type="button" class="skrc-item" onclick="skReceiptOpen(\''+r.id+'\')"><span><b>'+money(r.amount)+'</b><small>'+esc(r.date)+' • '+esc(r.mode)+' • balance '+money(r.balance)+'</small></span><em>'+esc(r.no)+' ›</em></button>'});
  h+='<div class="skrc-cur"><span>Current balance</span><b class="'+(num(b.balance)>0?'due':'clear')+'">'+(num(b.balance)>0?money(b.balance):'NIL — fully paid')+'</b></div></div>';
  return h;
}
var origView=window.viewSavedBill;
if(typeof origView==='function'){
  window.viewSavedBill=function(i){
    var r=origView.apply(this,arguments);
    try{
      var c=$('viewBillContent'),b=window.__skInvoiceExportBill;
      if(c&&b){var old=c.querySelector('.skrc-after');if(old)old.remove();var h=paymentsBlock(b);if(h){var w=document.createElement('div');w.innerHTML=h;var n=w.firstChild;var paper=c.querySelector('.sk-invoice-paper');if(paper&&paper.parentNode)paper.parentNode.insertBefore(n,paper.nextSibling);else c.appendChild(n)}}
    }catch(e){console.warn('payments block',e)}
    return r;
  };
}
/* buttons in the Customer Ledger bill cards */
window.skReceiptsListForBill=function(billId){
  var list=forBill(billId);if(!list.length){toast('No receipts for this bill yet');return}
  var d=$('skrcList');if(d)d.remove();
  d=document.createElement('div');d.id='skrcList';d.className='skrc-dlg';
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>Receipts</b></div><div class="skrc-body"><div class="skrc-after">'+
    list.slice().reverse().map(function(r){return '<button type="button" class="skrc-item" data-id="'+r.id+'"><span><b>'+money(r.amount)+'</b><small>'+esc(r.kind)+' • '+esc(r.date)+' • balance '+(r.balance>0?money(r.balance):'NIL')+'</small></span><em>'+esc(r.no)+' ›</em></button>'}).join('')+'</div></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')){d.remove();return}
    var b=e.target.closest('[data-id]');if(b){d.remove();window.skReceiptOpen(b.dataset.id)}
  });
};

/* all receipts of one customer (any bill, repair or account payment) */
function key(n,ph){var d=String(ph||'').replace(/\D/g,'');return d?d.slice(-10):String(n||'').trim().toLowerCase()}
window.skReceiptsForCustomer=function(name,phone){
  var k=key(name,phone),list=all().filter(function(r){return key(r.customer,r.phone)===k});
  if(!list.length){toast('No receipts for this customer yet');return}
  showList('Receipts • '+(name||''),list.slice().sort(function(a,b){return String(b.createdAt)<String(a.createdAt)?-1:1}));
};
function showList(title,list){
  var d=$('skrcList');if(d)d.remove();
  d=document.createElement('div');d.id='skrcList';d.className='skrc-dlg';
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>'+esc(title)+'</b></div><div class="skrc-body"><div class="skrc-after">'+
    list.map(function(r){return '<button type="button" class="skrc-item" data-id="'+r.id+'"><span><b>'+money(r.amount)+'</b><small>'+esc(r.kind)+(r.ref?' • '+esc(r.ref):'')+' • '+esc(r.date)+' • balance '+(r.balance>0?money(r.balance):'NIL')+'</small></span><em>'+esc(r.no)+' ›</em></button>'}).join('')+'</div></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')){d.remove();return}
    var b=e.target.closest('[data-id]');if(b){d.remove();window.skReceiptOpen(b.dataset.id)}
  });
}
function ledgerArr(){return arr('sk_credit_ledger_v1')}
/* save an edited receipt and keep the bill / ledger / later receipts in step */
function applyEdit(r,v){
  var a=all(),i=a.findIndex(function(x){return x.id===r.id});if(i<0)return 'Receipt not found';
  var cur=a[i],old=num(cur.amount),amt=cur.kind==='Down payment'||/^Repair/.test(cur.kind)?old:num(v.amount);
  if(!(amt>0))return 'Enter an amount above 0';
  var delta=amt-old,bills=arr(BILLS),bi=cur.billId?bills.findIndex(function(b){return b&&b.id===cur.billId}):-1,b=bi>=0?bills[bi]:null;
  if(delta>0&&b&&delta>num(b.balance))return 'Amount is more than the balance of this bill (max '+money(old+num(b.balance))+')';
  if(delta>0&&!b&&cur.balance<delta)return 'Amount is more than the balance (max '+money(old+cur.balance)+')';
  var d=dmy(v.date);if(!/^\d{2}\/\d{2}\/\d{4}$/.test(d))return 'Date must be DD/MM/YYYY';
  var oldMode=cur.mode,oldDate=cur.date;
  cur.amount=amt;cur.date=d;cur.mode=v.mode||cur.mode;cur.note=v.note||'';cur.customer=v.customer||cur.customer;cur.phone=v.phone;cur.edited=new Date().toISOString();
  if(delta){
    cur.balance=Math.max(0,num(cur.balance)-delta);cur.paidTotal=num(cur.paidTotal)+delta;
    a.forEach(function(x){if(x!==cur&&String(x.createdAt)>String(cur.createdAt)&&((cur.billId&&x.billId===cur.billId)||(!cur.billId&&!x.billId&&x.ref===cur.ref&&key(x.customer,x.phone)===key(cur.customer,cur.phone)))){x.balance=Math.max(0,num(x.balance)-delta);x.paidTotal=num(x.paidTotal)+delta}});
  }
  if(b&&cur.kind!=='Down payment'){
    if(delta)b.balance=Math.max(0,num(b.balance)-delta);
    (b.paymentReceipts||[]).forEach(function(pr){if(pr.rcId===cur.id){pr.amount=amt;pr.date=d;pr.mode=cur.mode;pr.balanceAfter=cur.balance}});
    localStorage.setItem(BILLS,JSON.stringify(bills));try{if(typeof savedBills!=='undefined')savedBills=bills}catch(e){}
  }
  /* the matching credit-ledger payment row */
  var L=ledgerArr(),li=L.findIndex(function(e){return e&&e.type==='payment'&&num(e.amount)===old&&String(e.billId||'')===String(cur.billId||'')&&(cur.billId||key(e.name,e.phone)===key(cur.customer,cur.phone))&&String(e.mode||'')===String(oldMode||'')&&dmy(e.date)===oldDate});
  if(li>=0){L[li].amount=amt;L[li].mode=cur.mode;L[li].date=d;if(v.customer){L[li].name=v.customer;L[li].phone=v.phone}localStorage.setItem('sk_credit_ledger_v1',JSON.stringify(L))}
  save(a);
  try{if(typeof window.skImportFromBills==='function')window.skImportFromBills(true)}catch(e){}
  try{if(typeof renderBillHistory==='function')renderBillHistory()}catch(e){}
  try{if(typeof window.skCPRender==='function')window.skCPRender()}catch(e){}
  return '';
}
function editForm(r){
  var d=$('skrcEdit');if(d)d.remove();
  var lock=r.kind==='Down payment'||/^Repair/.test(r.kind);
  d=document.createElement('div');d.id='skrcEdit';d.className='skrc-dlg skrc-edit';
  var modes=['Cash','GPay','PhonePe','Paytm','Card','Bank transfer','Other'];if(modes.indexOf(r.mode)<0)modes.unshift(r.mode);
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>Edit receipt '+esc(r.no)+'</b></div><div class="skrc-body skrc-form">'+
    '<label>Customer name<input id="skrcEn" value="'+esc(r.customer)+'"></label><label>Phone<input id="skrcEp" inputmode="tel" value="'+esc(r.phone)+'"></label>'+
    '<label>Amount received (₹)<input id="skrcEa" type="number" inputmode="decimal" min="1" value="'+r.amount+'"'+(lock?' disabled':'')+'></label>'+(lock?'<small class="skrc-hint">The amount of a down payment / repair payment is changed from the bill or repair job.</small>':'')+
    '<label>Date (DD/MM/YYYY)<input id="skrcEd" value="'+esc(r.date)+'" placeholder="DD/MM/YYYY"></label>'+
    '<label>Payment mode<select id="skrcEm">'+modes.map(function(m){return '<option'+(m===r.mode?' selected':'')+'>'+esc(m)+'</option>'}).join('')+'</select></label>'+
    '<label>Note<input id="skrcEt" value="'+esc(r.note||'')+'"></label><div class="skrc-msg" id="skrcEmsg"></div></div>'+
    '<div class="skrc-act"><button type="button" data-a="cancel" class="pdf" style="background:#64748b">Cancel</button><button type="button" data-a="save" class="wa">Save changes</button></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')||(e.target.dataset&&e.target.dataset.a==='cancel')){d.remove();return}
    if(e.target.dataset&&e.target.dataset.a==='save'){
      var err=applyEdit(r,{customer:$('skrcEn').value.trim(),phone:$('skrcEp').value.trim(),amount:$('skrcEa').value,date:$('skrcEd').value.trim(),mode:$('skrcEm').value,note:$('skrcEt').value.trim()});
      if(err){$('skrcEmsg').textContent=err;return}
      d.remove();toast('✅ Receipt updated');window.skReceiptOpen(r.id);
    }
  });
}
window.skReceiptEdit=function(id){var r=find(id);if(r)editForm(r)};
/* receipt that belongs to a credit-ledger payment row (same bill, amount and date) */
window.skReceiptForEntry=function(e){
  var d=dmy(e.date);
  return all().filter(function(r){return r.billId&&r.billId===String(e.billId||'')&&num(r.amount)===num(e.amount)&&r.date===d&&r.kind!=='Down payment'})[0]||null;
};
window.skReceiptEditForEntry=function(e){var r=window.skReceiptForEntry(e);if(!r)return false;editForm(r);return true};
setTimeout(migrate,1500);
window.addEventListener('sk-role-ready',function(){setTimeout(migrate,2500)});
})();
