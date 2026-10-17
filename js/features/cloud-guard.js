/* SK MOBILES v5.6.166 — Cloud guard for the Firebase free plan.
   1. Automatic backup: first open of the day + after closing time (only when data changed).
   2. Keeps only the newest backup of each of the last 14 days (older ones are deleted, incl. sub-collections).
   3. Storage Health page: size of every data key vs the 1 MB Firestore document limit, backup status, read estimate.
   Never touches the realtime sync code; uses the existing window.skCloudBackupNow(). */
(function(){
'use strict';
var SHOP='SK-MOBILES',ROOT='cloudBackups',META='bk_guard_v1';
var KEEP_DAYS=14,CLOSE_HOUR=21,DELETE_BUDGET=3000,DOC_WARN=700*1024,DOC_LIMIT=1000*1024;
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
function renderHealth(extra){
  var box=document.getElementById('skShBody');if(!box)return;
  var s=sizes(),m=meta(),bills=countOf('sk_bills'),jobs=countOf('skx_repair_jobs_v2');
  var reads=bills+jobs+dataKeys().length;
  var risky=s.rows.filter(function(r){return /^(sk_|skx_)/.test(r.key)&&!SKIP.test(r.key)&&r.chars>=DOC_WARN});
  var lim=5*1024*1024,pct=Math.min(100,Math.round(s.total/lim*100));
  var h='';
  h+='<div class="sksh-card"><h4>📦 Phone storage</h4><div class="sksh-bar"><i style="width:'+pct+'%" class="'+(pct>80?'bad':pct>60?'warn':'ok')+'"></i></div>'+
     '<div class="sksh-row"><span>Used (approx.)</span><b>'+kb(s.total)+' / ~5 MB</b></div></div>';
  h+='<div class="sksh-card"><h4>☁️ Cloud backup</h4>'+
     '<div class="sksh-row"><span>Last backup</span><b>'+(m.lastBackupMs?esc(window.skStamp(m.lastBackupMs)):'Never')+'</b></div>'+
     '<div class="sksh-row"><span>Auto backup</span><b>First open + after '+CLOSE_HOUR+':00</b></div>'+
     '<div class="sksh-row"><span>History kept</span><b>Last '+KEEP_DAYS+' days</b></div>'+(extra?'<div class="sksh-note">'+esc(extra)+'</div>':'')+
     '<div class="sksh-actions"><button type="button" class="submit-btn" onclick="skShBackup()">☁️ Backup now</button><button type="button" class="submit-btn" onclick="skShPrune()">🧹 Clean old backups</button></div></div>';
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
