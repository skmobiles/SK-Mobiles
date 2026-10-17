/* SK MOBILES v5.7.2 — Credit List (date to date): customer-wise pending credit for a chosen period,
   with days pending, WhatsApp (whole list or one customer statement) and PDF. Read-only over existing data. */
(function(){
'use strict';
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
function keyOf(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function today(){return keyOf(new Date())}
function dmy(k){var m=String(k||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(k||'')}
function digits(v){return String(v||'').replace(/\D/g,'')}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function daysSince(k){
  if(!k)return 0;var a=k.split('-'),b=today().split('-');
  return Math.max(0,Math.round((Date.UTC(+b[0],+b[1]-1,+b[2])-Date.UTC(+a[0],+a[1]-1,+a[2]))/86400000));
}
var from='',to='',rows=[];

function build(){
  var cs=[];try{cs=typeof window.skCPGetCustomers==='function'?window.skCPGetCustomers():[]}catch(e){}
  var inR=function(k){return !!k&&(!from||k>=from)&&(!to||k<=to)};
  var out=[];
  cs.forEach(function(c){
    var items=[];
    (c.bills||[]).forEach(function(x){
      var b=x.b,bal=num(b.balance),k=toKey(b.date);
      if(bal>0&&k)items.push({date:k,label:[b.brand,b.model].filter(Boolean).join(' ')||'Bill '+(b.billNo||''),total:num(b.price),paid:Math.max(0,num(b.price)-bal),balance:bal});
    });
    (c.entries||[]).forEach(function(e){
      if((e.type==='credit'||e.type==='emi')&&String(e.source||'')!=='bill'&&!e.billId&&num(e.amount)>0){
        var k=toKey(e.date);if(k)items.push({date:k,label:String(e.source||'')==='repair-job'?'Repair job':(e.note||'Credit'),total:num(e.amount),paid:0,balance:num(e.amount)});
      }
    });
    items.sort(function(a,b){return a.date<b.date?-1:1});
    /* Payments recorded in the ledger are not on the bills themselves: take them off the oldest credit first, so this list
       always agrees with the Customer Credit Ledger balance (c.balance), whatever period is chosen. */
    var all=items.reduce(function(a,i){return a+i.balance},0),left=Math.max(0,all-num(c.balance));
    items.forEach(function(i){if(left<=0)return;var cut=Math.min(i.balance,left);i.balance-=cut;i.paid+=cut;left-=cut});
    items=items.filter(function(i){return i.balance>0&&inR(i.date)});
    if(!items.length)return;
    items.sort(function(a,b){return a.date<b.date?-1:1});
    var bal=items.reduce(function(a,i){return a+i.balance},0);
    out.push({key:c.key,name:c.name,phone:c.phone||'',items:items,balance:bal,first:items[0].date,days:daysSince(items[0].date)});
  });
  out.sort(function(a,b){return b.days-a.days||b.balance-a.balance});
  return out;
}
function periodLabel(){return (from?dmy(from):'Start')+' to '+(to?dmy(to):dmy(today()))}
function render(){
  var body=document.getElementById('skCrgBody');if(!body)return;
  rows=build();
  var total=rows.reduce(function(a,r){return a+r.balance},0);
  var h='<div class="skdr-hero"><small>PENDING CREDIT • '+esc(periodLabel())+'</small><b>'+money(total)+'</b><small>'+rows.length+' customers</small></div>';
  if(!rows.length)h+='<div class="skdr-empty">No pending credit in this period. 🎉</div>';
  else h+='<div class="skdr-card">'+rows.map(function(r,i){
    return '<div class="skcrg-row"><div class="skcrg-main"><b>'+esc(r.name)+'</b><small>'+(r.phone?esc(r.phone)+' • ':'')+r.items.length+' bill'+(r.items.length>1?'s':'')+' • since '+dmy(r.first)+'</small>'+
      '<i class="skcr-tag'+(r.days>=30?' bad':'')+'">'+r.days+' days pending</i></div><div class="skcr-amt">'+money(r.balance)+'</div>'+
      '<button type="button" class="skcp-btn skcr-wa" '+(digits(r.phone)?'':'disabled ')+'aria-label="WhatsApp statement" onclick="skCrgSend('+i+')">💬</button></div>';
  }).join('')+'</div>';
  body.innerHTML=h;
  var a=document.getElementById('skCrgActions');if(a)a.style.display=rows.length?'':'none';
}
function stmt(r){
  var t='Hello '+r.name+', pending balance statement from '+shopName()+' ('+periodLabel()+'):\n';
  r.items.forEach(function(i){t+='• '+dmy(i.date)+' '+i.label+' — Total '+money(i.total)+', Paid '+money(i.paid)+', Balance '+money(i.balance)+'\n'});
  return t+'Total pending: '+money(r.balance)+'\nKindly pay at the earliest. Thank you 🙏';
}
function listText(){
  var total=rows.reduce(function(a,r){return a+r.balance},0);
  var t='📒 *'+shopName()+' — Credit List*\n'+periodLabel()+'\n\n';
  rows.forEach(function(r,i){t+=(i+1)+'. '+r.name+(r.phone?' ('+r.phone+')':'')+' — '+money(r.balance)+' • '+r.days+' days\n'});
  return t+'\nTotal pending: '+money(total);
}
function openWa(phone,text){
  var d=digits(phone);if(d.length===10)d='91'+d;
  window.open('https://wa.me/'+(d||'')+'?text='+encodeURIComponent(text),'_blank','noopener');
}
window.skCrgSend=function(i){var r=rows[i];if(!r)return;if(!digits(r.phone)){toast('No phone number');return}openWa(r.phone,stmt(r))};
window.skCrgShare=function(){openWa('',listText())};
window.skCrgSet=function(which,v){if(which==='from')from=v||'';else to=v||'';render()};
window.skCrgPreset=function(n){
  var d=new Date();to=keyOf(d);
  if(n==='all'){from=''}else if(n==='month'){from=to.slice(0,8)+'01'}else{var s=new Date();s.setDate(s.getDate()-n);from=keyOf(s)}
  var f=document.getElementById('skCrgFrom'),t=document.getElementById('skCrgTo');if(f)f.value=from;if(t)t.value=to;render();
};
window.skCrgPdf=function(){
  if(typeof html2pdf!=='function'){toast('PDF library not loaded (internet needed once). Try again.');return}
  var total=rows.reduce(function(a,r){return a+r.balance},0);
  var box=document.createElement('div');
  box.style.cssText='position:fixed;left:-9999px;top:0;width:700px;padding:24px;background:#fff;color:#0f172a;font-family:Inter,Arial,sans-serif;font-size:12px';
  var td='padding:6px 8px;border-bottom:1px solid #e2e8f0';
  box.innerHTML='<h2 style="margin:0 0 2px">'+esc(shopName())+'</h2><div style="color:#64748b;margin-bottom:12px">Credit List — '+esc(periodLabel())+'</div>'+
   '<table style="width:100%;border-collapse:collapse"><tr style="background:#f1f5f9;font-weight:700"><td style="'+td+'">Customer</td><td style="'+td+'">Phone</td><td style="'+td+'">Since</td><td style="'+td+';text-align:right">Days</td><td style="'+td+';text-align:right">Balance</td></tr>'+
   rows.map(function(r){return '<tr><td style="'+td+'">'+esc(r.name)+'</td><td style="'+td+'">'+esc(r.phone)+'</td><td style="'+td+'">'+dmy(r.first)+'</td><td style="'+td+';text-align:right">'+r.days+'</td><td style="'+td+';text-align:right;font-weight:600">'+money(r.balance)+'</td></tr>'}).join('')+
   '<tr><td colspan="4" style="padding:8px;font-weight:700">Total pending</td><td style="padding:8px;text-align:right;font-weight:700">'+money(total)+'</td></tr></table>';
  document.body.appendChild(box);
  html2pdf().set({margin:8,filename:'SK_Mobiles_Credit_List.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}})
    .from(box).save().then(function(){box.remove();toast('✅ PDF downloaded')}).catch(function(){box.remove();toast('❌ PDF failed')});
};
function ensureModal(){
  if(document.getElementById('skCreditRangeModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skCreditRangeModal';
  el.innerHTML='<div class="modal-sheet skdr-sheet"><div class="modal-title"><span>📒 Credit List</span><button class="modal-close-btn" onclick="toggleModal(\'skCreditRangeModal\',false)">✕</button></div>'+
   '<div class="skcrg-dates"><label>From<input type="date" id="skCrgFrom" onchange="skCrgSet(\'from\',this.value)"/></label><label>To<input type="date" id="skCrgTo" onchange="skCrgSet(\'to\',this.value)"/></label></div>'+
   '<div class="skcrg-chips"><button type="button" onclick="skCrgPreset(7)">7 days</button><button type="button" onclick="skCrgPreset(30)">30 days</button><button type="button" onclick="skCrgPreset(\'month\')">This month</button><button type="button" onclick="skCrgPreset(\'all\')">All</button></div>'+
   '<div id="skCrgBody"></div>'+
   '<div id="skCrgActions" class="skdr-actions skdr-two"><button type="button" class="submit-btn whatsapp-green" onclick="skCrgShare()">📤 WhatsApp list</button><button type="button" class="submit-btn" onclick="skCrgPdf()">📄 PDF</button></div></div>';
  document.body.appendChild(el);
}
window.skOpenCreditRange=function(){
  ensureModal();
  var d=new Date();to=keyOf(d);from=to.slice(0,8)+'01';
  document.getElementById('skCrgFrom').value=from;document.getElementById('skCrgTo').value=to;
  render();if(typeof window.toggleModal==='function')window.toggleModal('skCreditRangeModal',true);
};
function addUi(){
  var ref=document.getElementById('skDrMonth')||document.querySelector('.menu-drawer-btn[onclick*="skOpenDailyReport"]');
  if(ref&&!document.getElementById('skDrCreditRange')){
    var b=document.createElement('button');b.className='menu-drawer-btn';b.id='skDrCreditRange';b.type='button';b.setAttribute('onclick','skOpenCreditRange(); toggleLeftDrawer(false);');
    b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M9 9h6M9 13h6"/></svg></span><span class="menu-btn-label">Credit List</span><span class="menu-arrow">›</span>';
    ref.parentNode.insertBefore(b,ref.nextSibling);
  }
  var m=document.querySelector('#skCreditRemindModal .skdr-sheet');
  if(m&&!document.getElementById('skCrgLink')){
    var l=document.createElement('div');l.className='skdr-actions';l.innerHTML='<button type="button" id="skCrgLink" class="submit-btn" onclick="toggleModal(\'skCreditRemindModal\',false);skOpenCreditRange()">📒 Credit list (date to date)</button>';
    m.appendChild(l);
  }
}
function boot(){addUi();setTimeout(addUi,1800);
  try{new MutationObserver(function(){if(!document.getElementById('skCrgLink')&&document.querySelector('#skCreditRemindModal .skdr-sheet'))addUi()}).observe(document.body,{childList:true,subtree:true})}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
