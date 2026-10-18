/* SK MOBILES v5.8.0 — Daily closing report and credit reminders.
   Read-only over existing data (sk_bills, sk_credit_ledger_v1, skx_repair_jobs_v2). The only value this file writes is
   sk_credit_reminder_log_v1 (which customer was reminded on which day). */
(function(){
'use strict';

/* ---------- helpers ---------- */
function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'');return v==null?f:v}catch(e){return f}}
function arr(k){var v=read(k,[]);return Array.isArray(v)?v:[]}
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function p2(n){return String(n).padStart(2,'0')}
function keyOf(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function today(){return keyOf(new Date())}
function dmy(k){var m=String(k||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'/'+m[2]+'/'+m[1]:String(k||'')}
/* any stored date (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, full ISO timestamp) -> local YYYY-MM-DD */
function toKey(s){
  if(!s)return '';s=String(s).trim();var m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))return m[3]+'-'+p2(m[2])+'-'+p2(m[1]);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  var d=new Date(s);return isNaN(d)?'':keyOf(d);
}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}
function digits(p){var d=String(p||'').replace(/\D/g,'');return d.length===10?'91'+d:d}
function openWa(phone,text){
  var d=phone?digits(phone):'';
  window.open('https://wa.me/'+d+'?text='+encodeURIComponent(text),'_blank','noopener');
}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function ensure(id,html){
  var el=document.getElementById(id);if(el)return el;
  el=document.createElement('div');el.className='modal-overlay';el.id=id;el.innerHTML=html;
  document.body.appendChild(el);return el;
}

/* ============================================================
   1. DAILY CLOSING REPORT
   ============================================================ */
var rptDay=today();

function buildReport(day){
  var bills=arr('sk_bills').filter(function(b){return toKey(b.date)===day});
  var sales={count:bills.length,total:0,received:0,credit:0,newM:0,usedM:0,keypad:0,rows:[]};
  bills.forEach(function(b){
    var price=num(b.price),mode=b.payMode||'Cash',isCr=(mode==='Credit'||mode==='EMI');
    var got=isCr?num(b.advance):price;
    sales.total+=price;sales.received+=got;sales.credit+=Math.max(0,price-got);
    if(b.mobileType==='Used Mobile')sales.usedM++;else if(b.mobileType==='Keypad Mobile')sales.keypad++;else sales.newM++;
    sales.rows.push({name:b.custName||'Customer',model:[b.brand,b.model].filter(Boolean).join(' '),price:price,mode:mode});
  });

  var jobs=arr('skx_repair_jobs_v2');
  var rep={received:0,delivered:0,collected:0,rows:[]};
  jobs.forEach(function(j){
    if(toKey(j.createdAt||j.date)===day)rep.received++;
    if(j.status==='Delivered'&&toKey(j.deliveredAt)===day)rep.delivered++;
    (Array.isArray(j.paymentHistory)?j.paymentHistory:[]).forEach(function(p){
      if(toKey(p.date)===day){rep.collected+=num(p.amount);rep.rows.push({name:j.customer||'Customer',model:j.model||'',amount:num(p.amount)})}
    });
  });

  var pays=arr('sk_credit_ledger_v1').filter(function(e){return e.type==='payment'&&toKey(e.date)===day});
  var cred={count:pays.length,total:0,rows:[]};
  pays.forEach(function(e){cred.total+=num(e.amount);cred.rows.push({name:e.name||'Customer',amount:num(e.amount),mode:e.mode||'Cash'})});

  var out=0;
  try{out=typeof window.skOutstandingTotalForHome==='function'?window.skOutstandingTotalForHome():0}catch(e){}

  return {day:day,sales:sales,rep:rep,cred:cred,outstanding:out,
    collection:sales.received+rep.collected+cred.total};
}

function reportText(r){
  var L=[];
  L.push('📊 *'+shopName()+' — Daily Report*');
  L.push('📅 '+dmy(r.day));L.push('');
  L.push('💰 *Total collection: '+money(r.collection)+'*');L.push('');
  L.push('🛒 *Sales* ('+r.sales.count+' bills)');
  L.push('• Sale value: '+money(r.sales.total));
  L.push('• Received: '+money(r.sales.received));
  if(r.sales.credit)L.push('• Given on credit/EMI: '+money(r.sales.credit));
  L.push('');
  L.push('🔧 *Repairs*');
  L.push('• New jobs: '+r.rep.received+' • Delivered: '+r.rep.delivered);
  L.push('• Collected: '+money(r.rep.collected));L.push('');
  L.push('💳 *Credit collected*: '+money(r.cred.total)+' ('+r.cred.count+' payments)');L.push('');
  L.push('📌 Total outstanding now: '+money(r.outstanding));
  return L.join('\n');
}

function renderReport(){
  var r=buildReport(rptDay),box=document.getElementById('skDrBody');if(!box)return;
  var lbl=document.getElementById('skDrDate');if(lbl)lbl.textContent=dmy(rptDay)+(rptDay===today()?' • Today':'');
  var nat=document.getElementById('skDrNative');if(nat)nat.value=rptDay;
  function row(a,b,c){return '<div class="skdr-line"><span>'+a+'</span><b>'+b+'</b>'+(c?'<em>'+c+'</em>':'')+'</div>'}
  var h='';
  h+='<div class="skdr-hero"><small>TOTAL COLLECTION</small><b>'+money(r.collection)+'</b></div>';
  h+='<div class="skdr-card"><h4>🛒 Sales</h4>'+
     row('Bills',r.sales.count,'New '+r.sales.newM+' • Used '+r.sales.usedM+' • Keypad '+r.sales.keypad)+
     row('Sale value',money(r.sales.total))+row('Received',money(r.sales.received))+
     row('Credit / EMI given',money(r.sales.credit))+'</div>';
  h+='<div class="skdr-card"><h4>🔧 Repairs</h4>'+
     row('New jobs',r.rep.received)+row('Delivered',r.rep.delivered)+row('Collected',money(r.rep.collected))+'</div>';
  h+='<div class="skdr-card"><h4>💳 Credit collected</h4>'+
     row('Payments',r.cred.count)+row('Amount',money(r.cred.total))+'</div>';
  h+='<div class="skdr-card"><h4>📌 Position now</h4>'+
     row('Total outstanding',money(r.outstanding))+'</div>';
  var list='';
  r.sales.rows.forEach(function(x){list+='<div class="skdr-item"><span>'+esc(x.name)+'<small>'+esc(x.model)+' • '+esc(x.mode)+'</small></span><b>'+money(x.price)+'</b></div>'});
  r.rep.rows.forEach(function(x){list+='<div class="skdr-item"><span>'+esc(x.name)+'<small>Repair • '+esc(x.model)+'</small></span><b>'+money(x.amount)+'</b></div>'});
  r.cred.rows.forEach(function(x){list+='<div class="skdr-item"><span>'+esc(x.name)+'<small>Credit payment • '+esc(x.mode)+'</small></span><b>'+money(x.amount)+'</b></div>'});
  h+='<div class="skdr-card"><h4>🧾 Entries</h4>'+(list||'<div class="skdr-empty">No entries for this day.</div>')+'</div>';
  box.innerHTML=h;
}

function openReport(day){
  rptDay=day||today();
  ensure('skDailyReportModal',
   '<div class="modal-sheet skdr-sheet">'+
   '<div class="modal-title"><span>📊 Daily Report</span><button class="modal-close-btn" onclick="toggleModal(\'skDailyReportModal\',false)">✕</button></div>'+
   '<div class="skdr-nav">'+
   '<button type="button" class="skdr-nb" onclick="skDrStep(-1)" aria-label="Previous day">‹</button>'+
   '<label class="skdr-datebox"><span id="skDrDate"></span><input type="date" id="skDrNative" onchange="skDrSet(this.value)"></label>'+
   '<button type="button" class="skdr-nb" onclick="skDrStep(1)" aria-label="Next day">›</button>'+
   '<button type="button" class="skdr-today" onclick="skDrSet(\'\')">Today</button></div>'+
   '<div id="skDrBody"></div>'+
   '<div class="skdr-actions skdr-two">'+
   '<button type="button" class="submit-btn whatsapp-green" onclick="skDrShare()">📤 WhatsApp</button>'+
   '<button type="button" class="submit-btn" onclick="skDrCopy()">📋 Copy</button></div></div>');
  renderReport();
  if(typeof window.toggleModal==='function')window.toggleModal('skDailyReportModal',true);
}
window.skOpenDailyReport=openReport;
window.skDrSet=function(v){rptDay=toKey(v)||today();renderReport()};
window.skDrStep=function(n){var p=rptDay.split('-'),d=new Date(+p[0],+p[1]-1,+p[2]+n);rptDay=keyOf(d);renderReport()};
window.skDrShare=function(){openWa('',reportText(buildReport(rptDay)))};
window.skDrCopy=function(){
  var t=reportText(buildReport(rptDay));
  try{navigator.clipboard.writeText(t).then(function(){toast('Report copied')},function(){toast('Copy failed')})}
  catch(e){toast('Copy not supported')}
};

/* ============================================================
   2. CREDIT REMINDERS
   ============================================================ */
var LOG_KEY='sk_credit_reminder_log_v1';
function remindLog(){var v=read(LOG_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
var DUE_KEY='skx_credit_due_override_v1';
function dueMap(){var v=read(DUE_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
function dueKeyFor(c){
  var best='';
  var man=dueMap()[c.key];if(man&&toKey(man))return toKey(man);
  (c.entries||[]).forEach(function(e){
    if((e.type==='emi'||e.type==='credit')&&e.dueDate&&num(e.amount)>0){var k=toKey(e.dueDate);if(k&&(!best||k<best))best=k}
  });
  (c.bills||[]).forEach(function(x){
    if(num(x.b.balance)>0&&x.b.creditDueDate){var k=toKey(x.b.creditDueDate);if(k&&(!best||k<best))best=k}
  });
  return best;
}
function daysPending(c,t){
  var first='';
  (c.bills||[]).forEach(function(x){if(num(x.b.balance)>0){var k=toKey(x.b.date);if(k&&(!first||k<first))first=k}});
  (c.entries||[]).forEach(function(e){if((e.type==='credit'||e.type==='emi')&&String(e.source||'')!=='bill'&&!e.billId&&num(e.amount)>0){var k=toKey(e.date);if(k&&(!first||k<first))first=k}});
  if(!first)return -1;
  var a=first.split('-'),b=t.split('-');
  return Math.max(0,Math.round((Date.UTC(+b[0],+b[1]-1,+b[2])-Date.UTC(+a[0],+a[1]-1,+a[2]))/86400000));
}
function reminderRows(){
  var cs=[];try{cs=typeof window.skCPGetCustomers==='function'?window.skCPGetCustomers():[]}catch(e){}
  var t=today();
  return cs.filter(function(c){return num(c.balance)>0}).map(function(c){
    var due=dueKeyFor(c);
    return {key:c.key,name:c.name,phone:c.phone||'',manual:!!dueMap()[c.key],balance:num(c.balance),due:due,overdue:!!due&&due<t,soon:!!due&&due>=t,days:daysPending(c,t)}
  }).sort(function(a,b){
    if(a.overdue!==b.overdue)return a.overdue?-1:1;
    if(a.due&&b.due&&a.due!==b.due)return a.due<b.due?-1:1;
    if(!!a.due!==!!b.due)return a.due?-1:1;
    return b.balance-a.balance;
  });
}
function msgFor(r){
  var m='Hello '+r.name+', this is a reminder from '+shopName()+'. Your pending balance is '+money(r.balance)+'.';
  if(r.due)m+=(r.overdue?' It was due on ':' Your due date is ')+dmy(r.due)+'.';
  return m+' Kindly pay at the earliest. Thank you 🙏';
}
window.skCreditRemind=function(encKey){
  var k=decodeURIComponent(encKey),r=reminderRows().find(function(x){return x.key===k});
  if(!r){toast('No pending balance');return}
  if(!digits(r.phone)){toast('No phone number for '+r.name);return}
  openWa(r.phone,msgFor(r));
  var log=remindLog();log[k]=today();
  try{localStorage.setItem(LOG_KEY,JSON.stringify(log))}catch(e){}
  if(document.getElementById('skCreditRemindModal')?.classList.contains('active'))renderRemind();
  updateRemindStrip();
};
window.skCrSetDue=function(encKey,v){
  var k=decodeURIComponent(encKey),m=dueMap();
  if(v)m[k]=v;else delete m[k];
  try{localStorage.setItem(DUE_KEY,JSON.stringify(m))}catch(e){}
  toast(v?'Due date set to '+dmy(v):'Due date reset');
  renderRemind();updateRemindStrip();
};
function renderRemind(){
  var box=document.getElementById('skCrBody');if(!box)return;
  var rows=reminderRows(),log=remindLog(),t=today();
  if(!rows.length){box.innerHTML='<div class="skdr-empty">No pending credit. 🎉</div>';return}
  box.innerHTML=rows.map(function(r){
    var tag=r.overdue?'<i class="skcr-tag bad">Overdue '+dmy(r.due)+'</i>':(r.due?'<i class="skcr-tag">Due '+dmy(r.due)+'</i>':'');
    var ago=r.days>=0?'<i class="skcr-tag'+(r.days>=30?' bad':'')+'">'+r.days+' days pending</i>':'';
    var sent=log[r.key]===t?'<i class="skcr-tag ok">Reminded today</i>':'';
    var can=!!digits(r.phone);
    var dt='<label class="skcr-datebtn">📅 <span>'+(r.due?'Change date':'Set due date')+'</span><input type="date" value="'+esc(r.due||'')+'" onchange="skCrSetDue(\''+encodeURIComponent(r.key)+'\',this.value)" aria-label="Due date"></label>'+(r.manual?'<button type="button" class="skcr-dateclr" onclick="skCrSetDue(\''+encodeURIComponent(r.key)+'\',\'\')" aria-label="Reset due date">↺</button>':'');
    return '<div class="skcr-row"><div class="skcr-main"><b>'+esc(r.name)+'</b><small>'+(can?esc(r.phone):'No phone')+'</small><div>'+ago+tag+sent+'</div><div class="skcr-datewrap">'+dt+'</div></div>'+
      '<div class="skcr-amt">'+money(r.balance)+'</div>'+
      '<button type="button" class="skcp-btn skcr-wa" '+(can?'':'disabled ')+'onclick="skCreditRemind(\''+encodeURIComponent(r.key)+'\')" aria-label="WhatsApp reminder">💬</button></div>';
  }).join('');
}
window.skOpenCreditReminders=function(){
  ensure('skCreditRemindModal',
   '<div class="modal-sheet skdr-sheet">'+
   '<div class="modal-title"><span>🔔 Credit Reminders</span><button class="modal-close-btn" onclick="toggleModal(\'skCreditRemindModal\',false)">✕</button></div>'+
   '<div class="skcr-note">Tap 💬 to open WhatsApp with a ready message.</div>'+
   '<div id="skCrBody"></div>'+
   '<div class="skdr-actions"><button type="button" class="submit-btn" onclick="skOpenReminderSettings&&skOpenReminderSettings()">⚙️ EMI Reminder Settings</button></div></div>');
  renderRemind();
  if(typeof window.toggleModal==='function')window.toggleModal('skCreditRemindModal',true);
};
function updateRemindStrip(){
  var b=document.getElementById('skCrStrip');if(!b)return;
  var rows=reminderRows(),od=rows.filter(function(r){return r.overdue}).length;
  b.innerHTML='🔔 <span>Reminders</span><em>'+rows.length+' pending'+(od?' • '+od+' overdue':'')+'</em>';
  b.classList.toggle('has-overdue',od>0);
}
window.skCreditStripRefresh=updateRemindStrip;

/* ---------- wiring ---------- */
function wrap(name,after){
  var f=window[name];if(typeof f!=='function'||f.__skBiz)return;
  var w=function(){var r=f.apply(this,arguments);try{after()}catch(e){}return r};w.__skBiz=true;window[name]=w;
}
function init(){
  /* credit page: strip above the filters */
  var filters=document.querySelector('#skCreditLedgerPage .skcp-filters');
  if(filters&&!document.getElementById('skCrStrip')){
    var b=document.createElement('button');b.type='button';b.id='skCrStrip';b.className='skcr-strip';b.onclick=window.skOpenCreditReminders;
    filters.insertAdjacentElement('beforebegin',b);
  }
  wrap('skCPRender',updateRemindStrip);
  updateRemindStrip();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,0)},{once:true});else setTimeout(init,0);
})();
