/* SK MOBILES v5.8.2 — Cloud guard for the Firebase free plan.
   1. Automatic backup: first open of the day + after closing time (only when data changed).
   2. Keeps only the newest backup of each of the last 14 days (older ones are deleted, incl. sub-collections).
   3. Storage Health page: size of every data key vs the 1 MB Firestore document limit, backup status, read estimate.
   Never touches the realtime sync code; uses the existing window.skCloudBackupNow(). */
(function(){
'use strict';
var SHOP='SK-MOBILES',ROOT='cloudBackups',META='bk_guard_v1';
var KEEP_DAYS=14,CLOSE_HOUR=21,DELETE_BUDGET=1000,DOC_WARN=700*1024,DOC_LIMIT=1000*1024;
var SKIP=/^(bk_|sk_current_|sk_recovery_backup_|sk_theme|sk_appearance|sk_bill_draft|sk_font|sk_icon|sk_last_|sk_sync_)/;

function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function p2(n){return String(n).padStart(2,'0')}
function dayKey(ms){var d=new Date(ms);return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function meta(){try{var v=JSON.parse(localStorage.getItem(META)||'{}');return v&&typeof v==='object'?v:{}}catch(e){return {}}}
function saveMeta(m){try{localStorage.setItem(META,JSON.stringify(m))}catch(e){}}
function strHash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(16)+':'+s.length}
function dataKeys(){
  var out=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&(k.indexOf('sk_')===0||k.indexOf('skx_')===0)&&!SKIP.test(k))out.push(k)}}catch(e){}
  return out.sort();
}
function dataHash(){
  var parts=[];dataKeys().forEach(function(k){parts.push(k+'='+strHash(localStorage.getItem(k)||''))});
  return strHash(parts.join('|'));
}
function db(){try{return window.firebase&&firebase.firestore?firebase.firestore():null}catch(e){return null}}
function backupsCol(){var d=db();return d?d.collection('shops').doc(SHOP).collection(ROOT):null}

/* ---------- pruning ---------- */
async function deleteBackup(ref,budget){
  var d=db();
  var items=await ref.collection('items').get();
  for(var i=0;i<items.docs.length;i++){
    if(budget&&budget.left<=0)throw new Error('daily delete budget used');
    var it=items.docs[i],chunks=await it.ref.collection('chunks').get(),batch=d.batch(),n=0;
    for(var j=0;j<chunks.docs.length;j++){batch.delete(chunks.docs[j].ref);n++;if(n>=400){await batch.commit();batch=d.batch();n=0}}
    batch.delete(it.ref);await batch.commit();
    if(budget)budget.left-=chunks.docs.length+1;
  }
  await ref.delete();if(budget)budget.left-=1;
}
/* decide which backup docs to delete: keep newest complete backup of each of the last KEEP_DAYS days */
function planPrune(docs,now){
  var rows=docs.map(function(x){var m=x.data()||{};return {doc:x,ms:Number(m.createdAtMs)||0,ok:m.status==='complete'}})
    .sort(function(a,b){return b.ms-a.ms});
  var keepDays={},keep=[],del=[],cutoff=now-KEEP_DAYS*86400000;
  rows.forEach(function(r){
    var dk=dayKey(r.ms||0);
    if(r.ok&&r.ms>=cutoff&&!keepDays[dk]&&Object.keys(keepDays).length<KEEP_DAYS){keepDays[dk]=1;keep.push(r)}
    else if(!r.ok&&now-r.ms<3600000){keep.push(r)}   /* a backup still being written */
    else del.push(r);
  });
  /* never delete the only complete backup */
  if(!keep.some(function(r){return r.ok})){var firstOk=del.filter(function(r){return r.ok})[0];if(firstOk){del.splice(del.indexOf(firstOk),1);keep.push(firstOk)}}
  return {keep:keep,del:del};
}
/* Firestore free plan allows 20,000 deletes per day, so old backups are removed gradually (DELETE_BUDGET per day). */
async function prune(){
  var col=backupsCol();if(!col)return {deleted:0,kept:0};
  /* once per day per device: every prune reads up to 120 backup records, so repeating it wastes the free read quota */
  var m0=meta(),t0=dayKey(Date.now());if(m0.pruneDay===t0&&!window.__skForcePrune)return {deleted:0,kept:0,pending:0,skipped:true};
  m0.pruneDay=t0;saveMeta(m0);
  var snap=await col.orderBy('createdAtMs','desc').limit(120).get();
  var plan=planPrune(snap.docs,Date.now());
  var m=meta(),today=dayKey(Date.now()),usedBefore=m.delDay===today?(m.delUsed||0):0;
  var budget={left:DELETE_BUDGET-usedBefore},start=budget.left,done=0;
  for(var i=0;i<plan.del.length&&budget.left>0;i++){
    try{await deleteBackup(plan.del[i].doc.ref,budget);done++}catch(e){console.warn('prune stopped',e);break}
  }
  m=meta();m.delDay=today;m.delUsed=usedBefore+(start-budget.left);saveMeta(m);
  return {deleted:done,kept:plan.keep.length,pending:plan.del.length-done};
}
window.skCloudPrune=prune;window.__skGuardTick=function(){return tick()};
window.__skPlanPrune=planPrune;

/* ---------- automatic backup ---------- */
var busy=false;
function canBackup(){return typeof window.skCloudCanBackup==='function'&&window.skCloudCanBackup()&&typeof window.skCloudBackupNow==='function'}
async function runBackup(reason){
  if(busy)return;busy=true;
  try{
    var m=meta(),h=dataHash(),today=dayKey(Date.now()),slot=(new Date().getHours()>=CLOSE_HOUR)?'close':'open';
    if(m.lastHash===h&&m.lastBackupMs){ /* nothing changed since the last backup: only mark the slot as done */
      m[slot+'Day']=today;saveMeta(m);return;
    }
    var okFlag=await new Promise(function(res){
      var done=false,t=setTimeout(function(){if(!done){done=true;window.removeEventListener('sk-cloud-backup',on);res(false)}},120000);
      function on(e){if(done)return;done=true;clearTimeout(t);window.removeEventListener('sk-cloud-backup',on);res(!!(e.detail&&e.detail.ok))}
      window.addEventListener('sk-cloud-backup',on);
      Promise.resolve(window.skCloudBackupNow(true)).catch(function(){});
    });
    if(okFlag){
      m=meta();m.lastHash=h;m.lastBackupMs=Date.now();m[slot+'Day']=today;saveMeta(m);
      try{await prune()}catch(e){console.warn('prune skipped',e)}
    }
  }finally{busy=false}
}
function tick(){
  if(!canBackup())return;
  var m=meta(),now=new Date(),today=dayKey(now.getTime());
  if(m.openDay!==today)return runBackup('open');
  if(now.getHours()>=CLOSE_HOUR&&m.closeDay!==today)return runBackup('close');
}

/* ---------- Storage Health page ---------- */
function kb(n){return n>=1048576?(n/1048576).toFixed(2)+' MB':Math.round(n/1024)+' KB'}
function sizes(){
  var rows=[],total=0;
  try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i),v=localStorage.getItem(k)||'',b=(k.length+v.length)*2;total+=b;rows.push({key:k,bytes:v.length*2,chars:v.length})}}catch(e){}
  rows.sort(function(a,b){return b.bytes-a.bytes});
  return {rows:rows,total:total};
}
function countOf(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v.length:0}catch(e){return 0}}

/* ---------- V5.11.53: Server check - counts on the server vs on this phone ---------- */
var srv=null; /* {busy:true} | {err:'..'} | {rows:[..],last:ms,at:ms} */
function localCount(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0)}catch(e){return 0}}
function agoText(ms){
  if(!ms)return '';var m=Math.max(0,Math.round((Date.now()-ms)/60000));
  return m<1?'just now':m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago';
}
window.skShCheck=async function(){
  var d=db();
  if(!d||!window.firebase||!firebase.auth||!firebase.auth().currentUser||navigator.onLine===false){srv={err:'Cannot reach the server right now (login / internet).'};renderHealth();return}
  srv={busy:true};renderHealth();
  try{
    var base=d.collection('shops').doc(SHOP),opt={source:'server'},last=0;
    var res=await Promise.all([base.collection('bills').get(opt),base.collection('repairJobs').get(opt),base.collection('data').get(opt)]);
    var live=function(q){return q.docs.filter(function(x){var r=x.data()||{};return r.isDeleted!==true&&r._deleted!==true}).length};
    var dataMap={};res[2].docs.forEach(function(x){var r=x.data()||{};dataMap[x.id]=r;var t=Number(r.updatedAtMs)||0;if(t>last)last=t});
    res[1].docs.forEach(function(x){var t=Number((x.data()||{})._syncUpdatedAt)||0;if(t>last)last=t});
    function srvCount(k){var r=dataMap[k];if(!r)return 0;try{var v=JSON.parse(r.data||'[]');return Array.isArray(v)?v.length:(v&&typeof v==='object'?Object.keys(v).length:0)}catch(e){return 0}}
    var rows=[['Bills',live(res[0]),localCount('sk_bills')],['Repair jobs',live(res[1]),localCount('skx_repair_jobs_v2')],
      ['Credit ledger entries',srvCount('sk_credit_ledger_v1'),localCount('sk_credit_ledger_v1')],['Used mobiles',srvCount('sk_used_mobile_stock_v1'),localCount('sk_used_mobile_stock_v1')],
      ['Receipts',srvCount('sk_receipts_v1'),localCount('sk_receipts_v1')],
      ['Dealer payments',srvCount('skx_dealer_payments_v1'),localCount('skx_dealer_payments_v1')],['Dealer old balance / returns',srvCount('skx_dealer_entries_v1'),localCount('skx_dealer_entries_v1')]];
    srv={rows:rows,last:last,at:Date.now()};
  }catch(e){srv={err:'Could not read the server: '+String(e&&e.message||e).slice(0,90)}}
  renderHealth();
};
function srvHtml(){
  var h='<div class="sksh-card"><h4>☁️ Cloud (Firebase) — server check</h4>';
  if(srv&&srv.rows){
    h+='<div class="sksh-row"><span>Last change confirmed by the server</span><b>'+(srv.last?esc(agoText(srv.last)):'—')+'</b></div>';
    h+='<div class="sksh-tbl"><div class="sksh-th"><span></span><span>On the server</span><span>In this app</span><span></span></div>'+srv.rows.map(function(r){
      var ok=r[1]===r[2];return '<div class="sksh-tr"><span>'+esc(r[0])+'</span><b>'+r[1].toLocaleString('en-IN')+'</b><b>'+r[2].toLocaleString('en-IN')+'</b><i class="'+(ok?'ok':'diff')+'">'+(ok?'✓':'differs')+'</i></div>'}).join('')+'</div>';
    h+='<div class="sksh-note">A difference right after saving is normal while it uploads — check again in a minute. If it stays, tell me. · Checked '+esc(agoText(srv.at))+'</div>';
  }else if(srv&&srv.busy)h+='<div class="sksh-note">⏳ Checking the server…</div>';
  else if(srv&&srv.err)h+='<div class="sksh-note bad">'+esc(srv.err)+'</div>';
  else h+='<div class="sksh-note">Compare what is saved on the server with what is on this phone. Uses a few reads of the free quota each time.</div>';
  h+='<div class="sksh-actions"><button type="button" class="submit-btn" onclick="skShCheck()">✓ Check data on the server</button></div></div>';
  return h;
}
/* ---------- V5.11.57: what the last cloud backup really contains ---------- */
var bkd=null; /* {busy} | {err} | {meta, sets:[{title,inBackup,inApp,last:[..],missing:[..],missingCount}], at} */
function anyTime(x){
  if(!x)return 0;var v=x._u;if(typeof v==='number')return v;
  var s=x.createdAt||x.updatedAt||x.date||'';var n=Date.parse(s);if(!isNaN(n))return n;
  var m=String(s).match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);return m?new Date(+m[3],+m[2]-1,+m[1]).getTime():0;
}
function money(n){return '₹'+(Number(n)||0).toLocaleString('en-IN')}
var FMT={
  sk_credit_ledger_v1:function(e){return (e.name||'Customer')+' — '+(e.type==='payment'?'Payment ':e.type==='emi'?'EMI ':'Credit ')+money(e.amount)+' • '+(e.date||'')+(e.details?' • '+String(e.details).slice(0,40):'')},
  sk_bills:function(b){return (b.custName||'Customer')+' — Bill '+(b.billNo||b.id||'')+' • '+money(b.price)+' • '+(b.date||'')+(b.model?' • '+b.model:'')},
  skx_repair_jobs_v2:function(j){return (j.customer||'Customer')+' — '+(j.model||'Repair')+' • '+(j.status||'')+' • '+money(j.estimate)}
};
function idOf(x){return String(x&&(x.id||x.billId||''))}
window.skShBackupPeek=async function(){
  if(!window.skCloudBackupPeek||navigator.onLine===false){bkd={err:'Cannot reach the cloud right now (login / internet).'};renderHealth();return}
  bkd={busy:true};renderHealth();
  try{
    var keys=['sk_credit_ledger_v1','sk_bills','skx_repair_jobs_v2'],r=await window.skCloudBackupPeek(keys);
    if(!r){bkd={err:'No cloud backup found yet. Tap “Backup now”.'};renderHealth();return}
    var titles={sk_credit_ledger_v1:'Credit ledger entries',sk_bills:'Bills',skx_repair_jobs_v2:'Repair jobs'},sets=[];
    keys.forEach(function(k){
      var bk=[],loc=[];try{bk=JSON.parse(r.data[k]||'[]')}catch(e){bk=[]}try{loc=JSON.parse(localStorage.getItem(k)||'[]')}catch(e){loc=[]}
      if(!Array.isArray(bk))bk=[];if(!Array.isArray(loc))loc=[];
      var ids={};bk.forEach(function(x){ids[idOf(x)]=1});
      var miss=loc.filter(function(x){return !ids[idOf(x)]});
      var last=bk.map(function(x,i){return {x:x,t:anyTime(x),i:i}}).sort(function(a,b){return b.t-a.t||b.i-a.i}).slice(0,5).map(function(o){return FMT[k](o.x)});
      sets.push({title:titles[k],missingData:r.data[k]===null,inBackup:bk.length,inApp:loc.length,last:last,missing:miss.slice(0,5).map(FMT[k]),missingCount:miss.length});
    });
    bkd={meta:r.meta,sets:sets,at:Date.now()};
  }catch(e){bkd={err:'Could not read the backup: '+String(e&&e.message||e).slice(0,90)}}
  renderHealth();
};
function bkdHtml(){
  if(!bkd)return '<div class="sksh-note">See when the last backup was made and which entries are inside it.</div>';
  if(bkd.busy)return '<div class="sksh-note">⏳ Reading the last backup…</div>';
  if(bkd.err)return '<div class="sksh-note bad">'+esc(bkd.err)+'</div>';
  var m=bkd.meta||{},t=Number(m.createdAtMs)||0,h='<div class="sksh-row"><span>Backup made</span><b>'+(t?esc(window.skStamp?window.skStamp(t):new Date(t).toLocaleString())+' ('+esc(agoText(t))+')':'—')+'</b></div>';
  if(m.createdByEmail)h+='<div class="sksh-row"><span>By</span><b>'+esc(m.createdByEmail)+'</b></div>';
  h+='<div class="sksh-row"><span>Data items in backup</span><b>'+(m.itemCount||'—')+'</b></div>';
  bkd.sets.forEach(function(s){
    h+='<div class="sksh-bkset"><div class="sksh-row"><span><b>'+esc(s.title)+'</b></span><b>'+s.inBackup+' in backup / '+s.inApp+' in app</b></div>';
    if(s.missingData&&!s.inApp)h+='<div class="sksh-note">No entries yet.</div>';
    else if(s.missingData)h+='<div class="sksh-note bad">This list is not in the backup.</div>';
    else{
      h+='<div class="sksh-note">Latest entries inside the backup:</div>'+(s.last.length?s.last.map(function(l){return '<div class="sksh-ent">'+esc(l)+'</div>'}).join(''):'<div class="sksh-ent">— none —</div>');
      h+=s.missingCount?'<div class="sksh-note bad">⚠️ '+s.missingCount+' newer entr'+(s.missingCount>1?'ies are':'y is')+' not in this backup yet:</div>'+s.missing.map(function(l){return '<div class="sksh-ent">'+esc(l)+'</div>'}).join('')+(s.missingCount>s.missing.length?'<div class="sksh-ent">… and '+(s.missingCount-s.missing.length)+' more</div>':''):'<div class="sksh-note">✅ Every entry in the app is in this backup.</div>';
    }
    h+='</div>';
  });
  return h+'<div class="sksh-note">Checked '+esc(agoText(bkd.at))+'. Tap “Backup now” to include the newest entries.</div>';
}
function renderHealth(extra){
  var box=document.getElementById('skShBody');if(!box)return;
  var s=sizes(),m=meta(),bills=countOf('sk_bills'),jobs=countOf('skx_repair_jobs_v2');
  var reads=bills+jobs+dataKeys().length;
  var risky=s.rows.filter(function(r){return /^(sk_|skx_)/.test(r.key)&&!SKIP.test(r.key)&&r.chars>=DOC_WARN});
  var lim=5*1024*1024,pct=Math.min(100,Math.round(s.total/lim*100));
  var h=srvHtml();
  try{
    var cs=window.skCPGetCustomers?window.skCPGetCustomers():[],due=cs.filter(function(c){return Number(c.balance)>0}),sum=due.reduce(function(t,c){return t+Number(c.balance)},0),home=window.skOutstandingTotalForHome?window.skOutstandingTotalForHome():sum;
    h+='<div class="sksh-card"><h4>💳 Credit check</h4><div class="sksh-row"><span>Sum of all customers owing</span><b>'+money(sum)+'</b></div><div class="sksh-row"><span>Customers with balance</span><b>'+due.length+' of '+cs.length+'</b></div><div class="sksh-row"><span>Home screen outstanding</span><b>'+money(home)+' '+(Math.round(home)===Math.round(sum)?'✓':'⚠️ differs')+'</b></div></div>';
  }catch(e){}
  h+='<div class="sksh-card"><h4>📦 Phone storage</h4><div class="sksh-bar"><i style="width:'+pct+'%" class="'+(pct>80?'bad':pct>60?'warn':'ok')+'"></i></div>'+
     '<div class="sksh-row"><span>Used (approx.)</span><b>'+kb(s.total)+' / ~5 MB</b></div></div>';
  h+='<div class="sksh-card"><h4>☁️ Cloud backup</h4>'+
     '<div class="sksh-row"><span>Last backup</span><b>'+(m.lastBackupMs?esc(window.skStamp(m.lastBackupMs)):'Never')+'</b></div>'+
     '<div class="sksh-row"><span>Auto backup</span><b>First open + after '+CLOSE_HOUR+':00</b></div>'+
     '<div class="sksh-row"><span>History kept</span><b>Last '+KEEP_DAYS+' days</b></div>'+(extra?'<div class="sksh-note">'+esc(extra)+'</div>':'')+bkdHtml()+
     '<div class="sksh-actions"><button type="button" class="submit-btn" onclick="skShBackup()">☁️ Backup now</button><button type="button" class="submit-btn" onclick="skShBackupPeek()">🔎 What is in the last backup?</button><button type="button" class="submit-btn" onclick="skShPrune()">🧹 Clean old backups</button></div></div>';
  h+='<div class="sksh-card"><h4>📊 Firebase free plan</h4>'+
     '<div class="sksh-row"><span>Bills / repair jobs</span><b>'+bills+' / '+jobs+'</b></div>'+
     '<div class="sksh-row"><span>Reads per app open (approx.)</span><b>'+reads+'</b></div>'+
     '<div class="sksh-note">Free limit: 50,000 reads/day. '+(reads>3000?'⚠️ Many records — avoid opening the app on many devices again and again.':'✅ You are well within the limit.')+'</div></div>';
  h+='<div class="sksh-card"><h4>🗂️ Data size (1 MB sync limit per item)</h4>'+(risky.length?'<div class="sksh-note bad">⚠️ These items are close to the Firestore 1 MB limit and may stop syncing. Remove big photos/images from them.</div>':'')+
     s.rows.filter(function(r){return /^(sk_|skx_)/.test(r.key)}).slice(0,12).map(function(r){
       var c=r.chars>=DOC_LIMIT?'bad':r.chars>=DOC_WARN?'warn':'ok';
       return '<div class="sksh-row"><span>'+esc(r.key)+'</span><b class="'+c+'">'+kb(r.chars)+'</b></div>'}).join('')+'</div>';
  box.innerHTML=h;
}
window.skOpenStorageHealth=function(){
  if(!document.getElementById('skStorageHealthModal')){
    var el=document.createElement('div');el.className='modal-overlay';el.id='skStorageHealthModal';
    el.innerHTML='<div class="modal-sheet sksh-sheet"><div class="modal-title"><span>🩺 Storage Health</span><button class="modal-close-btn" onclick="toggleModal(\'skStorageHealthModal\',false)">✕</button></div><div id="skShBody"></div></div>';
    document.body.appendChild(el);
  }
  renderHealth();if(typeof window.toggleModal==='function')window.toggleModal('skStorageHealthModal',true);
};
window.skShBackup=async function(){
  if(!canBackup()){toast('Cloud backup is not possible right now (login / internet / permission)');return}
  bkd=null;
  renderHealth('⏳ Backing up…');
  await new Promise(function(res){
    function on(){window.removeEventListener('sk-cloud-backup',on);res()}
    window.addEventListener('sk-cloud-backup',on);
    Promise.resolve(window.skCloudBackupNow(false)).catch(function(){});
    setTimeout(res,120000);
  });
  var m=meta();m.lastHash=dataHash();m.lastBackupMs=Date.now();saveMeta(m);
  try{await prune()}catch(e){}
  renderHealth('✅ Backup finished');
};
window.skShPrune=async function(){
  if(!canBackup()){toast('Cloud is not available right now');return}
  renderHealth('⏳ Cleaning…');
  try{var r=await prune();renderHealth('✅ Kept '+r.kept+' backups, removed '+r.deleted)}catch(e){renderHealth('❌ Clean-up failed')}
};

function addDrawer(){
  var ref=document.querySelector('.menu-drawer-btn[onclick*="skOpenDailyReport"]');if(!ref||document.getElementById('skDrHealth'))return;
  var b=document.createElement('button');b.className='menu-drawer-btn';b.id='skDrHealth';b.type='button';b.setAttribute('onclick','skOpenStorageHealth(); toggleLeftDrawer(false);');
  b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg></span><span class="menu-btn-label">Storage Health</span><span class="menu-arrow">›</span>';
  ref.parentNode.insertBefore(b,ref.nextSibling);
}
function boot(){addDrawer();setTimeout(addDrawer,1500);setInterval(tick,60000);setTimeout(tick,15000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
