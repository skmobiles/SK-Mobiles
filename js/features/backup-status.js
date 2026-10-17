/* SK Mobiles v5.7.1 — Home backup status button.
   Green = every change is backed up to the cloud, Red = changes not backed up yet.
   Tap = cloud backup now; if cloud backup is not possible, the app restarts. */
(function(){
  'use strict';
  var KEY='bk_status_v1', btn, state={backupMs:0,changeMs:0}, running=false;
  var SKIP=/^(sk_current_|sk_recovery_backup_|sk_theme|sk_appearance|sk_bill_draft|sk_font|sk_icon|sk_credit_reminder_log|sk_low_threshold|sk_last_|sk_sync_)/;
  function load(){try{var v=JSON.parse(localStorage.getItem(KEY)||'{}');state.backupMs=+v.backupMs||0;state.changeMs=+v.changeMs||0;}catch(e){}}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}
  function toast(t){if(typeof window.showToast==='function')window.showToast(t);}
  function role(){try{return String(localStorage.getItem('sk_current_role_v1')||'').toLowerCase();}catch(e){return '';}}
  function paint(){
    if(!btn)btn=document.getElementById('skBkBtn'); if(!btn)return;
    var r=role(); btn.style.display=(r==='admin'||r==='manager')?'':'none';
    var s=running?'busy':(state.backupMs&&state.backupMs>=state.changeMs?'ok':'due');
    btn.setAttribute('data-state',s);
    var t=state.backupMs?window.skStamp(state.backupMs):'never';
    btn.title=s==='ok'?'Cloud backup up to date • '+t:s==='busy'?'Backing up…':'Not backed up • last: '+t+' • tap to backup';
    btn.setAttribute('aria-label',btn.title);
  }
  function markChange(key){
    if(!key||typeof key!=='string'||key===KEY||SKIP.test(key)||!(key.indexOf('sk_')===0||key.indexOf('skx_')===0))return;
    state.changeMs=Date.now(); if(!state.backupMs)state.backupMs=0; save(); paint();
  }
  function hook(){
    if(window.__skBkHook)return; window.__skBkHook=true;
    var set=Storage.prototype.setItem, rem=Storage.prototype.removeItem;
    Storage.prototype.setItem=function(k,v){var old=this===localStorage?localStorage.getItem(k):null;var r=set.apply(this,arguments);if(this===localStorage&&old!==String(v))markChange(k);return r;};
    Storage.prototype.removeItem=function(k){var r=rem.apply(this,arguments);if(this===localStorage)markChange(k);return r;};
  }
  window.addEventListener('sk-cloud-backup',function(e){
    var d=e.detail||{};
    if(d.ok){state.backupMs=Math.max(Date.now(),state.changeMs);save();}
    running=false;paint();
  });
  window.skBackupTap=async function(){
    if(running)return;
    if(!(typeof window.skCloudCanBackup==='function'&&window.skCloudCanBackup())){
      toast('☁️ Cloud backup is not possible right now — restarting the app…');
      setTimeout(function(){location.reload();},900);return;
    }
    running=true;paint();
    var before=state.backupMs;
    try{await window.skCloudBackupNow(false);}catch(e){}
    running=false;paint();
    if(state.backupMs===before||state.backupMs<state.changeMs){
      toast('❌ Backup failed — restarting the app…');
      setTimeout(function(){location.reload();},1100);
    }else toast('✅ Cloud backup completed');
  };
  function boot(){load();hook();paint();setInterval(paint,5000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
