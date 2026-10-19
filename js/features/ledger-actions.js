/* SK MOBILES V5.11.9 — Customer Ledger history rows.
   Tap a row  -> full details (date, amount, mode, note, bill, receipt) with Edit / Delete.
   Long press -> small menu: Edit / Delete.
   Delete goes through the Recycle Bin (30 days). Deleting a payment made against a bill puts the amount back on the
   bill's balance and removes its receipt; Restore puts everything back. */
(function(){
'use strict';
var LEDGER='sk_credit_ledger_v1',BILLS='sk_bills',RC='sk_receipts_v1';
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function arr(k){try{var a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function num(v){var n=Number(v);return isFinite(n)?n:0}
function money(n){return '₹'+num(n).toLocaleString('en-IN')}
function toast(t){try{if(typeof showToast==='function')showToast(t)}catch(e){}}
function pad(n){return String(n).padStart(2,'0')}
function dmy(v){
  if(!v)return '';var s=String(v),m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);if(m)return pad(m[1])+'/'+pad(m[2])+'/'+m[3];
  var d=new Date(v);return isNaN(d)?s:pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear();
}
function find(id){return arr(LEDGER).filter(function(e){return e&&String(e.id)===String(id)})[0]||null}
function linked(e){return String(e.source||'')==='bill'||String(e.source||'')==='repair-job'||/^RJ-CREDIT-/.test(String(e.id||''))||!!e.repairJobId}
function close(id){var d=$(id);if(d)d.remove()}
function edit(id){close('skLaDetail');close('skLaMenu');if(typeof window.skCPEditLedgerEntry==='function')window.skCPEditLedgerEntry(encodeURIComponent(id))}

/* ---------- delete (through the Recycle Bin) ---------- */
window.skLedgerDelete=function(id){
  var L=arr(LEDGER),i=L.findIndex(function(e){return e&&String(e.id)===String(id)});
  if(i<0){toast('Entry not found');return}
  var e=L[i];
  if(linked(e)){toast('This entry is linked to a Bill / Repair Job. Change it from the original record.');return}
  if(e.billId&&e.type!=='payment'){toast('This credit is added to a bill. Change it from the bill.');return}
  if(!confirm('Delete this '+(e.type==='payment'?'payment':'credit')+' of '+money(e.amount)+' ('+dmy(e.date)+') for '+(e.name||'customer')+'?\n\nIt moves to the Recycle Bin for 30 days.'+(e.billId&&e.type==='payment'?'\nThe amount is put back on the bill balance and its receipt is removed.':'')))return;
  var payload=JSON.parse(JSON.stringify(e)),fix=null;
  if(e.billId&&e.type==='payment'){
    var bills=arr(BILLS),bi=bills.findIndex(function(b){return b&&b.id===e.billId}),b=bi>=0?bills[bi]:null;
    var rcs=arr(RC),d=dmy(e.date),ri=rcs.findIndex(function(r){return r.billId===e.billId&&num(r.amount)===num(e.amount)&&r.date===d&&r.kind!=='Down payment'}),rc=ri>=0?rcs[ri]:null;
    if(b){
      var pr=Array.isArray(b.paymentReceipts)?b.paymentReceipts:[],pi=pr.findIndex(function(x){return x&&x.type==='payment'&&((rc&&x.rcId===rc.id)||(num(x.amount)===num(e.amount)&&dmy(x.date)===d))});
      fix={billId:e.billId,amount:num(e.amount),pr:pi>=0?pr[pi]:null,rc:rc||null};
      if(pi>=0)pr.splice(pi,1);
      b.balance=Math.min(num(b.price),num(b.balance)+num(e.amount));
      localStorage.setItem(BILLS,JSON.stringify(bills));
      try{if(typeof savedBills!=='undefined')savedBills=bills}catch(x){}
    }
    if(ri>=0){
      /* later receipts of this bill: the balance after them goes up by the deleted amount */
      rcs.forEach(function(r,k){if(k!==ri&&r.billId===e.billId&&String(r.createdAt)>String(rc.createdAt)){r.balance=num(r.balance)+num(e.amount);r.paidTotal=Math.max(0,num(r.paidTotal)-num(e.amount))}});
      rcs.splice(ri,1);localStorage.setItem(RC,JSON.stringify(rcs));
    }
  }
  if(fix)payload._skRestore=fix;
  try{if(typeof window.moveToTrash==='function')window.moveToTrash(payload,'credit',(e.type==='payment'?'Payment ':'Credit ')+money(e.amount)+' • '+(e.name||'Customer'))}catch(x){console.warn(x)}
  L.splice(i,1);localStorage.setItem(LEDGER,JSON.stringify(L));
  close('skLaDetail');close('skLaMenu');
  try{if(typeof window.skImportFromBills==='function')window.skImportFromBills(true)}catch(x){}
  try{if(typeof renderBillHistory==='function')renderBillHistory()}catch(x){}
  try{window.skCPRender&&window.skCPRender()}catch(x){}
  try{if(e.key&&typeof window.skCPOpenCustomer==='function')window.skCPOpenCustomer(e.key)}catch(x){}
};

/* Restore from the Recycle Bin: put the bill balance and the receipt back too */
(function(){
  var orig=window.restoreFromTrash;if(typeof orig!=='function')return;
  window.restoreFromTrash=async function(trashId){
    var list=[];try{list=JSON.parse(localStorage.getItem('sk_recycle_bin_v1')||'[]')}catch(x){}
    var item=list.filter(function(x){return String(x.trashId)===String(trashId)})[0],fix=item&&item.type==='credit'&&item.data&&item.data._skRestore;
    var r=await orig.apply(this,arguments);
    try{
      var still=[];try{still=JSON.parse(localStorage.getItem('sk_recycle_bin_v1')||'[]')}catch(x){}
      var gone=!still.some(function(x){return String(x.trashId)===String(trashId)});
      if(item&&item.type==='credit'&&item.data){
        var L=arr(LEDGER),k=L.findIndex(function(e){return e&&String(e.id)===String(item.data.id)});
        if(gone&&fix&&k>=0){
          var bills=arr(BILLS),b=bills.filter(function(x){return x&&x.id===fix.billId})[0];
          if(b){b.balance=Math.max(0,num(b.balance)-fix.amount);b.paymentReceipts=Array.isArray(b.paymentReceipts)?b.paymentReceipts:[];if(fix.pr)b.paymentReceipts.push(fix.pr);localStorage.setItem(BILLS,JSON.stringify(bills));try{if(typeof savedBills!=='undefined')savedBills=bills}catch(x){}}
          if(fix.rc){var rcs=arr(RC);if(!rcs.some(function(x){return x.id===fix.rc.id})){rcs.push(fix.rc);rcs.forEach(function(x){if(x.billId===fix.billId&&String(x.createdAt)>String(fix.rc.createdAt)){x.balance=Math.max(0,num(x.balance)-fix.amount);x.paidTotal=num(x.paidTotal)+fix.amount}});localStorage.setItem(RC,JSON.stringify(rcs))}}
        }
        if(k>=0&&L[k]._skRestore){delete L[k]._skRestore;localStorage.setItem(LEDGER,JSON.stringify(L))}
        try{window.skCPRender&&window.skCPRender()}catch(x){}
      }
    }catch(x){console.warn('restore fix',x)}
    return r;
  };
})();

/* ---------- details popup ---------- */
function sheet(idv,title,body,actions){
  close(idv);
  var d=document.createElement('div');d.id=idv;d.className='skrc-dlg';
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>'+esc(title)+'</b></div><div class="skrc-body">'+body+'</div>'+(actions?'<div class="skrc-act">'+actions+'</div>':'')+'</div>';
  document.body.appendChild(d);return d;
}
function detail(id){
  var e=find(id);if(!e)return;
  var bill=e.billId?arr(BILLS).filter(function(b){return b&&b.id===e.billId})[0]:null,rc=(e.type==='payment'&&e.billId&&window.skReceiptForEntry)?window.skReceiptForEntry(e):null;
  var row=function(a,b){return b?'<tr><td>'+esc(a)+'</td><td>'+b+'</td></tr>':''};
  var body='<div class="skrc-paper"><div class="skrc-amt" style="'+(e.type==='payment'?'':'background:#fee2e2;color:#b91c1c')+'"><span>'+(e.type==='payment'?'Payment received':e.type==='discount'?'Discount':'Credit given')+'</span><b>'+money(e.amount)+'</b></div>'+
    '<table class="skrc-t">'+row('Customer',esc(e.name))+row('Phone',esc(e.phone))+row('Date',esc(dmy(e.date)))+row('Mode',esc(e.mode))+(e.dueDate?row('Due date',esc(dmy(e.dueDate))):'')+row('Bill',bill?esc(bill.billNo||bill.id)+(bill.model?' • '+esc(bill.model):''):'')+row('Details',esc(String(e.details||'').replace(/\s*•\s*Ledger only/ig,'')))+row('Receipt',rc?esc(rc.no):'')+'</table></div>'+
    (rc?'<button type="button" class="skrc-item" data-a="rc"><span><b>Open receipt</b><small>'+esc(rc.no)+' • balance '+(rc.balance>0?money(rc.balance):'NIL')+'</small></span><em>›</em></button>':'')+
    (linked(e)?'<div class="skrc-hint">This entry is linked to a Bill / Repair Job. Change it from the original record.</div>':'');
  var acts=linked(e)?'':'<button type="button" data-a="edit" class="ed">✏️ Edit</button><button type="button" data-a="del" style="background:#dc2626;color:#fff">🗑️ Delete</button>';
  var d=sheet('skLaDetail','Entry details',body,acts);
  d.addEventListener('click',function(ev){
    if(ev.target===d||ev.target.closest('.skrc-x')){d.remove();return}
    var b=ev.target.closest('[data-a]');if(!b)return;var a=b.dataset.a;
    if(a==='edit')edit(id);else if(a==='del')window.skLedgerDelete(id);else if(a==='rc'&&rc){d.remove();window.skReceiptOpen(rc.id)}
  });
}
function menu(id){
  var e=find(id);if(!e)return;
  if(linked(e)){detail(id);return}
  var d=sheet('skLaMenu',(e.type==='payment'?'Payment ':'Credit ')+money(e.amount),'<div class="skrc-hint">'+esc(e.name||'')+' • '+esc(dmy(e.date))+'</div>','<button type="button" data-a="edit" class="ed">✏️ Edit</button><button type="button" data-a="del" style="background:#dc2626;color:#fff">🗑️ Delete</button>');
  d.addEventListener('click',function(ev){
    if(ev.target===d||ev.target.closest('.skrc-x')){d.remove();return}
    var b=ev.target.closest('[data-a]');if(!b)return;
    if(b.dataset.a==='edit')edit(id);else window.skLedgerDelete(id);
  });
}
window.skLedgerDetail=detail;window.skLedgerMenu=menu;

/* ---------- row gestures ---------- */
var timer=0,sx=0,sy=0,held=0;
function rowOf(t){return t&&t.closest?t.closest('#skCPDetailView .skcl-row[data-eid]'):null}
document.addEventListener('pointerdown',function(ev){
  var r=rowOf(ev.target);if(!r||ev.target.closest('.skcl-edit'))return;
  sx=ev.clientX;sy=ev.clientY;clearTimeout(timer);
  timer=setTimeout(function(){held=Date.now();try{if(navigator.vibrate)navigator.vibrate(15)}catch(x){}menu(r.getAttribute('data-eid'))},520);
},true);
['pointerup','pointercancel','pointerleave'].forEach(function(n){document.addEventListener(n,function(){clearTimeout(timer)},true)});
document.addEventListener('pointermove',function(ev){if(timer&&(Math.abs(ev.clientX-sx)>10||Math.abs(ev.clientY-sy)>10))clearTimeout(timer)},true);
document.addEventListener('contextmenu',function(ev){var r=rowOf(ev.target);if(r){ev.preventDefault()}},true);
document.addEventListener('click',function(ev){
  var r=rowOf(ev.target);if(!r||ev.target.closest('.skcl-edit'))return;
  if(Date.now()-held<900){ev.preventDefault();ev.stopPropagation();return}
  detail(r.getAttribute('data-eid'));
},true);
})();
