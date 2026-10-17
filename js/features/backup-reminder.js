/* SK MOBILES v5.6.165 — Backup to phone: one-tap JSON or Excel download, one-tap restore from a backup file, and a weekly
   reminder bar. This is on top of the existing cloud backup. The "last downloaded" time is kept only on this phone. */
(function(){
'use strict';
var T=window.skTools,esc=T.esc,LAST='skdev_file_backup_v1',REM='skdev_backup_remind_v1',SNZ='skdev_backup_snooze_v1',WEEK=7*86400000;
function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
function s(k,v){try{localStorage.setItem(k,String(v))}catch(e){}}
function last(){return +g(LAST)||0}
function on(){return g(REM)!=='off'}
function role(){return String(g('sk_current_role_v1')||'').toLowerCase()}
function ageText(){var l=last();if(!l)return 'Never downloaded on this phone';var d=Math.floor((Date.now()-l)/86400000);return window.skStamp(l)+' • '+(d<1?'today':d+' day'+(d>1?'s':'')+' ago')}
function due(){var l=last();return !l||Date.now()-l>WEEK}
function mark(){s(LAST,Date.now())}
function render(){
  var st=document.getElementById('skBkpStat');
  if(st){var w=due();st.className='skbkp-stat'+(w?' warn':'');st.innerHTML=T.ic(w?'alert':'check',w?'orange':'green')+'<span><b>'+(w?'Backup file is due':'Backup file is up to date')+'</b><small>'+esc(ageText())+'</small></span>'}
  var c=document.getElementById('skBkpRem');if(c)c.checked=on();
}
window.skBkpJson=function(){
  if(typeof window.exportAppDataBackup!=='function'){T.toast('Backup is not available');return}
  window.exportAppDataBackup();mark();render();
};
window.skBkpExcel=function(){
  if(typeof XLSX==='undefined'){T.toast('Excel library not loaded (internet needed once). Use the JSON backup.');return}
  try{
    var wb=XLSX.utils.book_new(),defs=[['Bills','sk_bills'],['Credit ledger','sk_credit_ledger_v1'],['Used stock','sk_used_mobile_stock_v1'],['Repairs','skx_repair_jobs_v2'],['Accessories','sk_accessories_v1'],['Orders','sk_orders']];
    defs.forEach(function(d){
      var a=T.arr(d[1]).map(function(r){var o={};Object.keys(r||{}).forEach(function(k){var v=r[k];o[k]=v&&typeof v==='object'?JSON.stringify(v):v});return o});
      XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(a.length?a:[{}]),d[0]);
    });
    var d=new Date();XLSX.writeFile(wb,'SK_Mobiles_Data_'+d.getFullYear()+T.p2(d.getMonth()+1)+T.p2(d.getDate())+'.xlsx');
    mark();render();T.toast('✅ Excel downloaded');
  }catch(e){T.toast('❌ Excel failed — use the JSON backup')}
};
window.skBkpRestore=function(inp){if(typeof window.importAppDataBackup==='function')window.importAppDataBackup(inp)};
window.skBkpRemind=function(v){s(REM,v?'on':'off');if(!v)hideBar()};
window.skOpenBackup=function(){
  T.modal('skBackupModal','Backup & Restore',
    '<div class="skpop-note">'+T.ic('info','blue')+'<span>Keep a backup file on your phone. If anything ever goes wrong, restore it with one tap. Cloud backup keeps working as before.</span></div>'+
    '<div class="skbkp-stat" id="skBkpStat"></div>'+
    '<div class="skbkp-btns">'+
    '<button type="button" class="submit-btn sk-keepr" onclick="skBkpJson()">⬇️ Download backup (JSON)</button>'+
    '<button type="button" class="submit-btn sk-keepr" onclick="skBkpExcel()">📊 Download Excel (.xlsx)</button>'+
    '<button type="button" class="submit-btn sk-keepr" onclick="document.getElementById(\'skBkpFile\').click()">⬆️ Restore from backup file</button>'+
    '<input type="file" id="skBkpFile" accept=".json,application/json" style="display:none" onchange="skBkpRestore(this)"></div>'+
    '<label class="skbkp-tog"><span>Remind me every week</span><input type="checkbox" id="skBkpRem" onchange="skBkpRemind(this.checked)"></label>');
  render();T.open('skBackupModal');
};
function hideBar(){var b=document.getElementById('skBkpBar');if(b)b.remove()}
function showBar(){
  if(document.getElementById('skBkpBar')||!on()||!due())return;
  if(role()!=='admin'&&role()!=='manager')return;
  if(+g(SNZ)>Date.now())return;
  if(document.querySelector('.modal-overlay.active')){setTimeout(showBar,8000);return}
  if(!T.arr('sk_bills').length&&!T.arr('sk_credit_ledger_v1').length)return;
  var b=document.createElement('div');b.id='skBkpBar';b.className='skbk-bar';
  b.innerHTML='<span>'+T.ic('cloud','sky')+' Weekly backup is due</span><span><button type="button" class="later">Later</button> <button type="button" class="go">Backup</button></span>';
  b.querySelector('.later').onclick=function(){s(SNZ,Date.now()+86400000);hideBar()};
  b.querySelector('.go').onclick=function(){hideBar();window.skOpenBackup()};
  document.body.appendChild(b);
}
function boot(){
  var n=0,t=setInterval(function(){if(T.drawer('skDrBackup','Backup & Restore','<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>','menu-icon-data','skOpenBackup()',['skDrAging','skDrBulk','skDrPriceList','skDrCreditRange','skDrMonth'])||++n>20)clearInterval(t)},500);
  /* any backup download made from other screens also counts */
  setTimeout(function(){var o=window.exportAppDataBackup;if(typeof o==='function'&&!o.__skw){var w=function(){var r=o.apply(this,arguments);mark();return r};w.__skw=1;window.exportAppDataBackup=w}},1500);
  setTimeout(showBar,7000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
