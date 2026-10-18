/* SK MOBILES v5.8.0 — App Lock (PIN + fingerprint) and Staff PINs.
   - The shop phone stays signed in to Firebase; this lock only asks for a PIN / fingerprint when the app is opened
     (and after it was in the background for a while). It does NOT replace the Firebase login.
   - Staff PINs give a staff member a limited view (hidden screens). This is an on-device restriction; the real data
     security is still Firebase Auth + Firestore rules.
   - Lock settings and staff are stored on THIS device only (keys skl_*), so they are never uploaded to Firestore. */
(function(){
'use strict';
var T=window.skTools||{esc:function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})},toast:function(t){if(typeof window.showToast==='function')window.showToast(t)}};
var esc=T.esc,LOCK_KEY='skl_lock_v1',STAFF_KEY='skl_staff_v1';
var PERMS=[['billing','Bills & Orders'],['repair','Repair jobs'],['stock','Stock / Inventory'],['credit','Customer credit'],['reports','Reports'],['settings','Settings & Admin']];
var DEFAULT_PERMS={billing:true,repair:true,stock:true,credit:false,reports:false,settings:false};
var MODALS={
  billing:['billingModal','viewBillModal','orderModal'],
  repair:['skRepairJobsModal','skRepairDetailModal','skUrgentRepairModal','repairSparesModal'],
  stock:['itemEditorModal','modelsModal','skUsedStockModal','skUsedFilterModal','skAccessoriesPage'],
  credit:['skCreditLedgerPage','skCreditLedgerModal','skCreditCustomerModal','skCreditEntryModal','skCreditActionModal','skEmiReminderModal','skCreditRemindModal'],
  settings:['settingsModal','skAdminPanelModal','skAdminProfileModal','skRecycleBinModal','skKeepImportModal','sklSettingsModal']
};
var FNS={
  credit:['skOpenCreditLedger','skOpenCreditReminders'],
  reports:['skOpenMonthReport','skOpenDailyReport','skOpenAging'],
  stock:['skGoToInventoryFilter'],
  repair:['skOpenRepairJobs','skOpenPendingRepairJobs'],
  settings:['skOpenAdminPanel','skOpenRecycleBin','skOpenLockSettings']
};
/* elements whose onclick / id contains one of these words are hidden for a staff member without that permission */
var HIDE={
  billing:['billingModal','orderModal','navBilling','navOrders'],
  repair:['skOpenRepairJobs','skOpenPendingRepairJobs'],
  stock:['skGoToInventoryFilter','skOpenAging','navGlass','navCombo'],
  credit:['skOpenCreditLedger','skOpenCreditReminders','metric-credit'],
  reports:['skOpenMonthReport','skOpenDailyReport'],
  settings:['settingsModal','skOpenAdminPanel','skOpenRecycleBin','skOpenLockSettings','skOpenRoleProfile']
};
var MODAL_PERM={};Object.keys(MODALS).forEach(function(p){MODALS[p].forEach(function(id){MODAL_PERM[id]=p})});

function jget(k,d){try{var v=JSON.parse(localStorage.getItem(k)||'null');return v==null?d:v}catch(e){return d}}
function jset(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function lockCfg(){var c=jget(LOCK_KEY,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{}}
function staff(){var a=jget(STAFF_KEY,[]);return Array.isArray(a)?a:[]}
function ss(k,v){try{if(v===undefined)return sessionStorage.getItem(k);if(v===null)sessionStorage.removeItem(k);else sessionStorage.setItem(k,v)}catch(e){}return null}
function role(){try{return localStorage.getItem('sk_current_role_v1')||''}catch(e){return''}}
function who(){return ss('skl_who')||''}
function curStaff(){var w=who();return w?staff().filter(function(s){return s.id===w})[0]||null:null}
function allowed(perm){var s=curStaff();return !s||!!(s.perms&&s.perms[perm])}
function sec(){return window.skPinSec}
function validPin(v){return /^\d{4,8}$/.test(v)}

/* ---------- styles ---------- */
function css(){
  if(document.getElementById('sklCss'))return;
  var s=document.createElement('style');s.id='sklCss';
  s.textContent='.skl-hide{display:none!important}'+
  '#sklLock{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:18px;background:linear-gradient(160deg,#0f172a,#1e1b4b 55%,#312e81);color:#fff;font-family:inherit}'+
  '#sklLock.on{display:flex}'+
  '#sklLock .sklc{width:min(360px,100%);text-align:center}'+
  '#sklLock img{width:64px;height:64px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 4px rgba(255,255,255,.15)}'+
  '#sklLock h2{margin:10px 0 2px;font-size:1.25rem;letter-spacing:.04em}'+
  '#sklLock p{margin:0 0 14px;font-size:.78rem;opacity:.75}'+
  '#sklLock .sklw{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:12px}'+
  '#sklLock .sklw button{border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);color:#fff;border-radius:999px;padding:7px 14px;font-size:.78rem;font-weight:700}'+
  '#sklLock .sklw button.on{background:#fff;color:#312e81;border-color:#fff}'+
  '#sklLock input{width:100%;box-sizing:border-box;text-align:center;letter-spacing:.5em;font-size:1.4rem;padding:13px;border-radius:14px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;outline:none}'+
  '#sklLock .sklb{width:100%;margin-top:10px;border:0;border-radius:14px;padding:13px;font-size:.95rem;font-weight:800;background:#6366f1;color:#fff}'+
  '#sklLock .sklb.bio{background:rgba(255,255,255,.14);display:none}'+
  '#sklLock .sklb.bio.on{display:block}'+
  '#sklLock .sklm{min-height:20px;margin-top:10px;font-size:.8rem;color:#fca5a5}'+
  '#sklLock .sklf{margin-top:6px;background:none;border:0;color:#c7d2fe;font-size:.75rem;text-decoration:underline}'+
  '.sklrow{display:flex;align-items:center;gap:10px;padding:9px 10px;border:1px solid var(--card-border,#e2e8f0);border-radius:12px;margin-bottom:8px;background:var(--pill-bg,#f8fafc)}'+
  '.sklrow b{flex:1;font-size:.85rem}.sklrow small{display:block;font-weight:500;color:var(--text-muted,#64748b);font-size:.68rem}'+
  '.sklrow button{border:1px solid var(--card-border,#cbd5e1);background:var(--card-bg,#fff);border-radius:10px;padding:6px 10px;font-size:.72rem;font-weight:700;color:inherit}'+
  '.sklsec{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted,#64748b);margin:12px 0 6px}'+
  '.sklf2 input[type=text],.sklf2 input[type=password],.sklf2 select{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--card-border,#cbd5e1);border-radius:10px;background:var(--input-bg,#fff);color:inherit;margin-bottom:8px;font-size:.9rem}'+
  '.sklf2 label.sklck{display:flex;align-items:center;gap:8px;font-size:.82rem;padding:5px 0}';
  document.head.appendChild(s);
}

/* ---------- lock screen ---------- */
var pick='';  /* '' = owner, else staff id */
function lockEl(){
  var el=document.getElementById('sklLock');if(el)return el;
  el=document.createElement('div');el.id='sklLock';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.innerHTML='<div class="sklc"><img id="sklLogo" alt="" src="Logo.png" onerror="this.style.display=\'none\'"><h2>SK MOBILES</h2><p id="sklSub">Enter PIN to open the app</p>'+
    '<div class="sklw" id="sklWho"></div>'+
    '<input id="sklPin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" placeholder="PIN" aria-label="PIN">'+
    '<button type="button" class="sklb" id="sklGo">Unlock</button>'+
    '<button type="button" class="sklb bio" id="sklBio">👆 Use fingerprint</button>'+
    '<div class="sklm" id="sklMsg" aria-live="polite"></div>'+
    '<button type="button" class="sklf" id="sklForgot">Forgot PIN? Sign in again</button></div>';
  document.body.appendChild(el);
  el.querySelector('#sklGo').onclick=tryPin;
  el.querySelector('#sklBio').onclick=tryBio;
  el.querySelector('#sklForgot').onclick=forgot;
  el.querySelector('#sklPin').addEventListener('keydown',function(e){if(e.key==='Enter')tryPin()});
  return el;
}
function msg(t){var m=document.getElementById('sklMsg');if(m)m.textContent=t||''}
function drawWho(){
  var box=document.getElementById('sklWho');if(!box)return;
  var list=staff();
  box.style.display=list.length?'flex':'none';
  box.innerHTML='<button type="button" data-w="" class="'+(pick===''?'on':'')+'">Owner</button>'+list.map(function(s){return '<button type="button" data-w="'+esc(s.id)+'" class="'+(pick===s.id?'on':'')+'">'+esc(s.name)+'</button>'}).join('');
  Array.prototype.forEach.call(box.querySelectorAll('button'),function(b){b.onclick=function(){pick=b.getAttribute('data-w')||'';msg('');drawWho();bioBtn();var p=document.getElementById('sklPin');if(p){p.value='';p.focus()}}});
}
function bioBtn(){var b=document.getElementById('sklBio');if(b)b.classList.toggle('on',pick===''&&!!lockCfg().cred&&bioSupported())}
function bioSupported(){return !!(window.PublicKeyCredential&&navigator.credentials&&navigator.credentials.get)}
function showLock(auto){
  css();var el=lockEl();
  pick='';drawWho();bioBtn();
  var p=document.getElementById('sklPin');if(p)p.value='';msg('');
  el.classList.add('on');document.documentElement.classList.remove('skl-pre');
  document.body.style.overflow='hidden';
  if(auto!==false&&lockCfg().cred&&bioSupported())setTimeout(function(){tryBio(true)},250);
}
function hideLock(){
  var el=document.getElementById('sklLock');if(el)el.classList.remove('on');
  document.documentElement.classList.remove('skl-pre');
  document.body.style.overflow='';
  ss('skl_ok','1');
}
function unlockAs(id){
  ss('skl_who',id||null);
  hideLock();applyStaff();
  var s=curStaff();T.toast(s?'👤 Welcome, '+s.name:'🔓 Unlocked');
}
function tryPin(){
  var S=sec(),p=(document.getElementById('sklPin').value||'').trim();
  if(!S){msg('Security module not loaded');return}
  var lk=S.lockedSeconds();if(lk>0){msg('⏳ Too many attempts. Try again in '+lk+'s');return}
  var hash=pick===''?lockCfg().pin:(staff().filter(function(s){return s.id===pick})[0]||{}).pin;
  if(!hash||!S.verify(hash,p)){var l2=S.recordFail();msg(l2>0?'⏳ Too many attempts. Try again in '+l2+'s':'❌ Wrong PIN');document.getElementById('sklPin').value='';return}
  S.recordSuccess();unlockAs(pick);
}
function b64u(buf){var b=new Uint8Array(buf),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var r=atob(s),a=new Uint8Array(r.length);for(var i=0;i<r.length;i++)a[i]=r.charCodeAt(i);return a}
function rnd(n){var a=new Uint8Array(n);(window.crypto||{getRandomValues:function(x){for(var i=0;i<x.length;i++)x[i]=Math.floor(Math.random()*256)}}).getRandomValues(a);return a}
function tryBio(quiet){
  var c=lockCfg();if(!c.cred||!bioSupported()||pick!=='')return;
  navigator.credentials.get({publicKey:{challenge:rnd(32),allowCredentials:[{type:'public-key',id:unb64u(c.cred),transports:['internal']}],userVerification:'required',timeout:60000}})
    .then(function(r){if(r)unlockAs('')})
    .catch(function(){if(quiet!==true)msg('Fingerprint not recognised. Use your PIN.')});
}
function registerBio(){
  if(!bioSupported()||!navigator.credentials.create){T.toast('Fingerprint is not supported on this phone / browser');return Promise.resolve(false)}
  return navigator.credentials.create({publicKey:{challenge:rnd(32),rp:{name:'SK Mobiles'},user:{id:rnd(16),name:'owner',displayName:'SK Mobiles Owner'},
    pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}})
  .then(function(cr){var c=lockCfg();c.cred=b64u(cr.rawId);jset(LOCK_KEY,c);T.toast('👆 Fingerprint enabled');return true})
  .catch(function(){T.toast('Fingerprint setup was cancelled');return false});
}
function forgot(){
  if(!confirm('Sign out and sign in again with your email and password?\n\nThe app lock will be switched off; you can turn it on again afterwards.'))return;
  var done=function(){
    if(role()){T.toast('Could not sign out. Try again.');return}
    var c=lockCfg();c.on=false;jset(LOCK_KEY,c);ss('skl_who',null);ss('skl_ok','1');hideLock();
  };
  try{var r=typeof window.skLogout==='function'?window.skLogout():null;if(r&&r.then)r.then(done,done);else setTimeout(done,300)}catch(e){done()}
}

/* ---------- staff restrictions ---------- */
var obs=null,scanTimer=0;
function deniedPerms(){var s=curStaff();if(!s)return[];return PERMS.map(function(p){return p[0]}).filter(function(k){return !(s.perms&&s.perms[k])})}
function scan(){
  scanTimer=0;
  var den=deniedPerms();
  Array.prototype.forEach.call(document.querySelectorAll('.skl-hide'),function(e){e.classList.remove('skl-hide')});
  if(!den.length)return;
  var words=[];den.forEach(function(p){(HIDE[p]||[]).forEach(function(w){words.push(w)})});
  Array.prototype.forEach.call(document.querySelectorAll('[onclick],.nav-item,.menu-drawer-btn,[data-action]'),function(el){
    var t=(el.getAttribute('onclick')||'')+' '+(el.id||'')+' '+(el.getAttribute('data-action')||'');
    for(var i=0;i<words.length;i++){if(t.indexOf(words[i])>-1){el.classList.add('skl-hide');return}}
  });
}
function scanSoon(){if(!scanTimer)scanTimer=setTimeout(scan,60)}
function closeDenied(el){
  el.classList.remove('active');
  if(!document.querySelector('.modal-overlay.active'))document.body.classList.remove('modal-open');
  T.toast('🔒 Not allowed for your login');
}
function applyStaff(){
  var s=curStaff();
  document.body.classList.toggle('skl-staff',!!s);
  if(obs){obs.disconnect();obs=null}
  scan();
  if(!s)return;
  /* close any denied modal that is already open */
  deniedPerms().forEach(function(p){(MODALS[p]||[]).forEach(function(id){var e=document.getElementById(id);if(e&&e.classList.contains('active'))closeDenied(e)})});
  obs=new MutationObserver(function(list){
    var rescan=false;
    list.forEach(function(r){
      if(r.type==='attributes'){var t=r.target,p=t.id&&MODAL_PERM[t.id];if(p&&!allowed(p)&&t.classList.contains('active'))closeDenied(t)}
      else rescan=true;
    });
    if(rescan)scanSoon();
  });
  obs.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  wrapAll();
}
function wrapAll(){
  Object.keys(FNS).forEach(function(p){FNS[p].forEach(function(n){
    var f=window[n];if(typeof f!=='function'||f.__sklw)return;
    var w=function(){if(!allowed(p)){T.toast('🔒 Not allowed for your login');return}return f.apply(this,arguments)};
    w.__sklw=1;window[n]=w;
  })});
  var lo=window.skLogout;
  if(typeof lo==='function'&&!lo.__sklw){var w2=function(){if(curStaff()){T.toast('🔒 Ask the owner to sign out');return}return lo.apply(this,arguments)};w2.__sklw=1;window.skLogout=w2}
}

/* ---------- settings (owner) ---------- */
var editing=null;
function isOwnerNow(){return !curStaff()&&role()==='admin'}
window.skOpenLockSettings=function(){
  if(!isOwnerNow()){T.toast('🔒 Admin access only');return}
  css();T.modal('sklSettingsModal','🔐 App Lock & Staff','<div class="sklf2" id="sklBody"></div>');
  editing=null;render();T.open('sklSettingsModal');
};
function render(){
  var b=document.getElementById('sklBody');if(!b)return;
  var c=lockCfg(),list=staff(),h='';
  h+='<div class="sklsec">App lock</div>';
  h+='<div class="sklrow"><b>'+(c.on?'🔒 Lock is ON':'🔓 Lock is OFF')+'<small>'+(c.on?'PIN is asked when the app opens or after it stays in the background':'Anyone who opens the phone can use the app')+'</small></b>'+
     (c.on?'<button type="button" data-a="off">Turn off</button>':'')+'</div>';
  h+='<div class="sklsec">'+(c.pin?'Change owner PIN':'Set owner PIN')+'</div>'+
     '<input type="password" inputmode="numeric" maxlength="8" id="sklNp" placeholder="New PIN (4-8 digits)" autocomplete="off">'+
     '<input type="password" inputmode="numeric" maxlength="8" id="sklNp2" placeholder="Confirm PIN" autocomplete="off">'+
     '<button type="button" class="submit-btn" data-a="savepin">'+(c.pin?'Change PIN':'Save PIN & turn lock on')+'</button>';
  if(c.pin){
    h+='<div class="sklsec">Fingerprint</div><div class="sklrow"><b>'+(c.cred?'👆 Fingerprint is ON':'Fingerprint is OFF')+'<small>'+(bioSupported()?'Uses this phone\'s fingerprint / screen lock':'Not supported on this phone / browser')+'</small></b>'+
       (c.cred?'<button type="button" data-a="biooff">Remove</button>':'<button type="button" data-a="bioon">Enable</button>')+'</div>';
    h+='<div class="sklsec">Lock again after</div><select id="sklAuto">'+[1,2,5,10,30].map(function(m){return '<option value="'+m+'"'+((c.auto||2)===m?' selected':'')+'>'+m+' min in background</option>'}).join('')+'</select>';
  }
  h+='<div class="sklsec">Staff logins (this phone)</div>';
  if(!c.pin)h+='<div class="sklrow"><b><small>Set the owner PIN first, then add staff.</small></b></div>';
  else{
    h+=list.length?list.map(function(s,i){
      var on=PERMS.filter(function(p){return s.perms&&s.perms[p[0]]}).map(function(p){return p[1]}).join(', ')||'No screens';
      return '<div class="sklrow"><b>'+esc(s.name)+'<small>'+esc(on)+'</small></b><button type="button" data-a="edit" data-i="'+i+'">Edit</button><button type="button" data-a="del" data-i="'+i+'">Delete</button></div>';
    }).join(''):'<div class="sklrow"><b><small>No staff added yet.</small></b></div>';
    var e=editing!==null?(editing>=0?list[editing]:{name:'',perms:DEFAULT_PERMS}):null;
    if(e){
      h+='<div class="sklsec">'+(editing>=0?'Edit staff':'Add staff')+'</div><input type="text" id="sklSn" placeholder="Staff name" value="'+esc(e.name||'')+'" maxlength="30">'+
         '<input type="password" inputmode="numeric" maxlength="8" id="sklSp" placeholder="'+(editing>=0?'New PIN (leave empty to keep)':'PIN (4-8 digits)')+'" autocomplete="off">'+
         PERMS.map(function(p){return '<label class="sklck"><input type="checkbox" data-p="'+p[0]+'"'+(e.perms&&e.perms[p[0]]?' checked':'')+'> '+esc(p[1])+'</label>'}).join('')+
         '<button type="button" class="submit-btn" data-a="savestaff">Save staff</button> <button type="button" class="sklrow" style="display:inline-block;margin-top:8px" data-a="cancel">Cancel</button>';
    }else h+='<button type="button" class="submit-btn" data-a="add">+ Add staff</button>';
  }
  h+='<p style="font-size:.68rem;color:var(--text-muted,#64748b);margin-top:12px;line-height:1.5">Staff see only the screens you allow. This is a limit on this phone; data security is still the Firebase login. Lock and staff are saved on this phone only.</p>';
  b.innerHTML=h;
  var sel=document.getElementById('sklAuto');if(sel)sel.onchange=function(){var x=lockCfg();x.auto=parseInt(sel.value,10)||2;jset(LOCK_KEY,x)};
  Array.prototype.forEach.call(b.querySelectorAll('[data-a]'),function(btn){btn.onclick=function(){act(btn.getAttribute('data-a'),parseInt(btn.getAttribute('data-i'),10))}});
}
function act(a,i){
  var c=lockCfg(),S=sec(),list=staff();
  if(a==='off'){if(confirm('Turn off the app lock?')){c.on=false;jset(LOCK_KEY,c);render()}}
  else if(a==='savepin'){
    var p1=(document.getElementById('sklNp').value||'').trim(),p2=(document.getElementById('sklNp2').value||'').trim();
    if(!validPin(p1)){T.toast('PIN must be 4-8 digits');return}
    if(p1!==p2){T.toast('PINs do not match');return}
    if(!S){T.toast('Security module not loaded');return}
    c.pin=S.hash(p1);c.on=true;if(!c.auto)c.auto=2;jset(LOCK_KEY,c);ss('skl_ok','1');T.toast('🔒 App lock is ON');render();
  }
  else if(a==='bioon'){registerBio().then(render)}
  else if(a==='biooff'){c.cred='';jset(LOCK_KEY,c);render()}
  else if(a==='add'){editing=-1;render()}
  else if(a==='edit'){editing=i;render()}
  else if(a==='cancel'){editing=null;render()}
  else if(a==='del'){if(confirm('Delete this staff login?')){list.splice(i,1);jset(STAFF_KEY,list);render()}}
  else if(a==='savestaff'){
    var name=(document.getElementById('sklSn').value||'').trim(),pin=(document.getElementById('sklSp').value||'').trim();
    if(!name){T.toast('Enter staff name');return}
    var cur=editing>=0?list[editing]:null;
    if(!cur&&!validPin(pin)){T.toast('PIN must be 4-8 digits');return}
    if(pin&&!validPin(pin)){T.toast('PIN must be 4-8 digits');return}
    if(!S){T.toast('Security module not loaded');return}
    var perms={};Array.prototype.forEach.call(document.querySelectorAll('#sklBody input[data-p]'),function(x){perms[x.getAttribute('data-p')]=!!x.checked});
    var rec=cur||{id:'ST-'+Date.now().toString(36)+Math.random().toString(36).slice(2,5)};
    rec.name=name;rec.perms=perms;if(pin)rec.pin=S.hash(pin);
    if(!cur)list.push(rec);
    jset(STAFF_KEY,list);editing=null;T.toast('Staff saved');render();
  }
}

/* ---------- boot ---------- */
function lockNow(){
  var c=lockCfg();if(!c.on||!c.pin){T.toast('Turn on the app lock first (Menu → App Lock & Staff)');return}
  ss('skl_ok',null);ss('skl_who',null);applyStaff();showLock();
}
window.skLockNow=lockNow;
function drawers(){
  if(!T.drawer)return true;
  var ok=T.drawer('skDrAppLock','App Lock & Staff','<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>','menu-icon-admin','skOpenLockSettings()',['skDrReviews','skDrBulk','skProfileAccountMenuBtn']);
  var ok2=T.drawer('skDrLockNow','Lock App Now','<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3M12 15v2"/>','menu-icon-admin','skLockNow()',['skDrAppLock']);
  return ok&&ok2;
}
function boot(){
  css();
  var c=lockCfg();
  if(c.on&&c.pin&&role()&&!ss('skl_ok'))showLock();
  else document.documentElement.classList.remove('skl-pre');
  applyStaff();wrapAll();
  var n=0,t=setInterval(function(){wrapAll();var d=drawers();if(curStaff())scanSoon();if(++n>40||(d&&n>8))clearInterval(t)},500);
  document.addEventListener('visibilitychange',function(){
    var c2=lockCfg();
    if(document.hidden){ss('skl_hid',String(Date.now()));return}
    if(!(c2.on&&c2.pin&&role()))return;
    var h=parseInt(ss('skl_hid')||'0',10),mins=(c2.auto||2);
    if(h&&Date.now()-h>mins*60000){ss('skl_ok',null);ss('skl_who',null);applyStaff();showLock()}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
