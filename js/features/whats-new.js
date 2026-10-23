/* SK MOBILES V5.11.66 — "Updated" dot.
   After the app updates to a new version, a soft glowing dot shows on the version badge in the home header.
   It stays until the shop taps the badge and reads "What's new" once; then it disappears (until the next update).
   The "seen" version is stored on this phone only (key dv_seen_version is not synced).
   To announce a release: add its notes to NOTES below (newest first). */
(function(){
'use strict';
var SEEN='dv_seen_version';
var NOTES={
 '5.11.66':['Blue glowing dot on the version badge shows when the app has updated — tap it to read what changed.'],
 '5.11.65':['Credit limit / overdue warning when adding credit (limit in EMI Reminder Settings).','Workers need the Admin PIN to change or delete credit entries older than 7 days.','Promised date on the Outstanding details page.'],
 '5.11.64':['Outstanding details and Send history are now pages; edit entries before sending history.','Change log for credit / payment entries (customer ⋮ menu, Storage Health).','Duplicate credit / payment warning.'],
 '5.11.63':['Outstanding cards open their bill / repair job / entry.','Penalty on overdue EMI (add, waive, delete).','Remove dealer (hide) with restore.']
};
function ver(){var m=document.querySelector('meta[name="sk-app-version"]');return m?String(m.content||'').trim():''}
function seen(){try{return localStorage.getItem(SEEN)||''}catch(e){return ''}}
function needDot(){var v=ver();return !!v&&seen()!==v}
function mark(){
  var on=needDot();
  document.querySelectorAll('.sk-home-ver').forEach(function(el){el.classList.toggle('sk-has-update',on);if(on)el.setAttribute('role','button')});
}
function esc(v){return String(v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
window.skWhatsNewOpen=function(){
  var v=ver(),old=document.getElementById('skWhatsNew');if(old)old.remove();
  var keys=Object.keys(NOTES).sort(function(a,b){return a<b?1:-1}).slice(0,4);
  var m=document.createElement('div');m.id='skWhatsNew';
  m.innerHTML='<div class="skwn-card" role="dialog" aria-modal="true"><div class="skwn-h"><span class="skwn-ic">✨</span><div><b>What\'s new</b><small>You are on V'+esc(v)+'</small></div></div><div class="skwn-body">'+keys.map(function(k){return '<div class="skwn-v">V'+esc(k)+(k===v?' <i>current</i>':'')+'</div><ul>'+NOTES[k].map(function(t){return '<li>'+esc(t)+'</li>'}).join('')+'</ul>'}).join('')+'</div><button type="button" class="skwn-ok">Got it</button></div>';
  document.body.appendChild(m);
  function close(){m.remove()}
  m.addEventListener('click',function(e){if(e.target===m||e.target.classList.contains('skwn-ok'))close()});
  try{localStorage.setItem(SEEN,v)}catch(e){}
  mark();
};
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('.sk-home-ver');if(t)window.skWhatsNewOpen()});
function boot(){
  mark();
  try{new MutationObserver(function(){mark()}).observe(document.body,{childList:true,subtree:true,characterData:true})}catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
