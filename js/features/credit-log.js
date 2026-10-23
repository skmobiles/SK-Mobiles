/* SK MOBILES V5.11.64 — Credit / payment change log + duplicate-entry warning.
   Every add / edit / delete of a Credit-ledger entry made on THIS phone is written to skx_credit_log_v1
   (synced like every other skx_ list, so all 3 phones see who changed what and when).
   Changes that arrive from the cloud or a restore are not logged as local actions. Read-only for the user. */
(function(){
'use strict';
var LEDGER='sk_credit_ledger_v1',LOG='skx_credit_log_v1',MAX=400,busy=false;
function num(v){v=Number(v);return isFinite(v)?v:0}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function arr(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function nowIso(){try{return window.skNow?new Date(window.skNow()).toISOString():new Date().toISOString()}catch(e){return new Date().toISOString()}}
function uid(){return 'LG-'+(window.skUid?window.skUid():Date.now()+'-'+Math.random().toString(36).slice(2,6))}
function kindOf(e){var t=String(e.type||'');if(String(e.source||'')==='penalty')return e.waived?'Penalty (waived)':'Penalty';return t==='payment'?'Payment':t==='emi'?'EMI':t==='discount'?'Discount':'Credit'}
function clean(t){return String(t||'').replace(/\s*•\s*Ledger only/ig,'').slice(0,50)}
function ownChange(){return !(window.__skApplyingRemote||window.__skRestoring)}
var FIELDS=['amount','date','type','dueDate','name','phone','mode','details','waived'];
function diff(oldArr,newArr){
  var om={},nm={},out=[];
  oldArr.forEach(function(e){if(e&&e.id)om[e.id]=e});newArr.forEach(function(e){if(e&&e.id)nm[e.id]=e});
  var added=newArr.filter(function(e){return e&&e.id&&!om[e.id]}),removed=oldArr.filter(function(e){return e&&e.id&&!nm[e.id]});
  function group(list,act){
    var by={};list.forEach(function(e){var k=(e.key||e.name)+'|'+kindOf(e);(by[k]=by[k]||[]).push(e)});
    Object.keys(by).forEach(function(k){
      var a=by[k],f=a[0],tot=a.reduce(function(s,e){return s+num(e.amount)},0);
      out.push({act:act,kind:kindOf(f),who:f.name||'',key:f.key||'',amt:tot,n:a.length,note:a.length>1?a.length+' entries':clean(f.details||f.note)});
    });
  }
  group(added,'add');group(removed,'delete');
  newArr.forEach(function(e){
    var o=e&&e.id&&om[e.id];if(!o)return;
    var ch=FIELDS.filter(function(f){return String(o[f]==null?'':o[f])!==String(e[f]==null?'':e[f])});
    if(ch.length)out.push({act:'edit',kind:kindOf(e),who:e.name||'',key:e.key||'',amt:num(e.amount),n:1,note:ch.map(function(f){return f+': '+String(o[f]==null?'':o[f]).slice(0,24)+' → '+String(e[f]==null?'':e[f]).slice(0,24)}).join(', ').slice(0,120)});
  });
  return out;
}
function writeLog(items){
  if(!items.length)return;
  var log=arr(LOG),t=nowIso(),dev=window.skDeviceLetter||'';
  items.forEach(function(it){it.id=uid();it.t=t;it.dev=dev;log.push(it)});
  if(log.length>MAX)log=log.slice(log.length-MAX);
  busy=true;try{localStorage.setItem(LOG,JSON.stringify(log))}catch(e){}finally{busy=false}
}
var orig=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  var before=null,track=(this===window.localStorage&&key===LEDGER&&!busy&&ownChange());
  if(track){try{before=arr(LEDGER)}catch(e){before=null}}
  var r=orig.apply(this,arguments);
  if(track&&before){try{writeLog(diff(before,arr(LEDGER)))}catch(e){console.warn('credit-log',e)}}
  return r;
};
/* duplicate warning: same customer, same kind, same amount within 3 minutes */
window.skCreditDupCheck=function(name,phone,type,amount){
  try{
    var key=typeof window.skCPGetCustomers==='function'?null:null,kind=type==='payment'?'Payment':'Credit',cut=Date.now()-3*60000,nm=String(name||'').trim().toLowerCase();
    var hit=arr(LOG).filter(function(l){return l.act==='add'&&l.kind===kind&&Math.round(num(l.amt))===Math.round(num(amount))&&String(l.who||'').trim().toLowerCase()===nm&&new Date(l.t).getTime()>=cut}).pop();
    if(!hit)return true;
    return confirm('Same '+kind.toLowerCase()+' of '+money(amount)+' for '+name+' was added a few minutes ago.\n\nAdd it again?');
  }catch(e){return true}
};

/* ---- V5.11.65: risk warning when adding credit (overdue / above limit) ---- */
var LIM='skx_credit_limit_v1';
function digits(v){return String(v||'').replace(/\D/g,'')}
function dmyIso(k){var a=String(k||'').split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0]:String(k||'')}
window.skCreditLimit=function(){return Math.max(0,num(localStorage.getItem(LIM)))};
window.skCreditRiskCheck=function(name,phone,type,amount){
  if(type!=='credit')return true;
  try{
    var nm=String(name||'').trim().toLowerCase(),ph=digits(phone),list=typeof window.skCPGetCustomers==='function'?window.skCPGetCustomers():[];
    var c=list.filter(function(x){return String(x.name||'').trim().toLowerCase()===nm&&digits(x.phone)===ph})[0];
    if(!c||!(num(c.balance)>0))return true;
    var msgs=[],info=window.skCreditOverdueInfo&&window.skCreditOverdueInfo(c.key);
    if(info&&info.overdue)msgs.push(c.name+' already has an OVERDUE payment (was due '+dmyIso(info.due)+'). Outstanding now '+money(c.balance)+'.');
    var L=window.skCreditLimit();
    if(L>0&&num(c.balance)+num(amount)>L)msgs.push('With this credit the outstanding becomes '+money(num(c.balance)+num(amount))+', above your limit of '+money(L)+'.');
    if(!msgs.length)return true;
    return confirm('⚠ '+msgs.join('\n\n')+'\n\nAdd this credit anyway?');
  }catch(e){return true}
};
/* limit field in EMI Reminder Settings */
(function(){
  function wire(){
    var m=document.getElementById('skEmiReminderModal');if(!m||document.getElementById('skCreditLimitInput'))return;
    var box=m.querySelector('.sk-v42-profile-box');if(!box)return;
    var g=document.createElement('div');g.className='form-group';
    g.innerHTML='<label class="form-label">Credit limit warning (₹) — 0 = off</label><input class="form-input" id="skCreditLimitInput" type="number" min="0" step="500" inputmode="numeric" placeholder="e.g. 10000"/><div style="font-size:.65rem;color:var(--text-muted);margin-top:4px;line-height:1.4">When a new credit would take a customer above this amount (or the customer already has an overdue payment) the app asks before adding.</div>';
    box.insertBefore(g,box.querySelector('.submit-btn'));
    var i=g.querySelector('input');i.value=window.skCreditLimit()||'';
    i.addEventListener('change',function(){var v=Math.max(0,Math.round(num(i.value)));try{localStorage.setItem(LIM,String(v))}catch(e){}if(typeof window.showToast==='function')window.showToast(v?'Credit limit warning set to '+money(v):'Credit limit warning off')});
  }
  document.addEventListener('click',function(){setTimeout(wire,50)},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();
/* ---- V5.11.65: old credit / payment entries (older than 7 days) need the Admin PIN when a worker edits or deletes them ---- */
var OLD_DAYS=7;
function entryAgeDays(e){var d=new Date(String(e.date||'').length===10?e.date+'T00:00:00':e.date);if(isNaN(d)){var m=String(e.date||'').match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);if(m)d=new Date(+m[3],+m[2]-1,+m[1]);}if(isNaN(d))return 0;return Math.floor((Date.now()-d.getTime())/86400000)}
window.skOldEntryGuard=function(id,go){
  try{
    if(window.__skOkId===String(id)){window.__skOkId=null;return true}
    if(localStorage.getItem('sk_current_role_v1')!=='worker')return true;
    var e=arr(LEDGER).filter(function(x){return String(x.id)===String(id)})[0];
    if(!e||entryAgeDays(e)<=OLD_DAYS)return true;
    askAdminPin(function(){window.__skOkId=String(id);if(go)go()});return false;
  }catch(x){return true}
};
function askAdminPin(done){
  var old=document.getElementById('skcpPinModal');if(old)old.remove();
  var m=document.createElement('div');m.id='skcpPinModal';
  m.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(15,23,42,.5)';
  var inp='box-sizing:border-box;width:100%;padding:12px;border:1px solid var(--card-border,#cbd5e1);border-radius:12px;background:var(--input-bg,#fff);color:inherit;font-size:1rem;text-align:center;letter-spacing:.3em';
  m.innerHTML='<form style="width:min(380px,100%);background:var(--card-bg,#fff);color:var(--text,#172033);border:1px solid var(--card-border,#cbd5e1);border-radius:18px;padding:16px;display:grid;gap:10px"><b>🔒 Admin PIN needed</b><div style="font-size:.76rem;color:var(--text-muted,#64748b)">This entry is older than '+OLD_DAYS+' days. Enter the Admin PIN to change or delete it.</div><input type="password" inputmode="numeric" autocomplete="off" name="pin" style="'+inp+'"/><div data-msg style="font-size:.74rem;color:#dc2626;min-height:1em"></div><div style="display:flex;gap:8px;justify-content:flex-end"><button type="button" data-x style="padding:10px 16px;border:1px solid var(--card-border,#cbd5e1);border-radius:99px;background:transparent;color:inherit;font-weight:700">Cancel</button><button type="submit" style="padding:10px 18px;border:0;border-radius:99px;background:#2563eb;color:#fff;font-weight:800">Unlock</button></div></form>';
  document.body.appendChild(m);
  var f=m.querySelector('form'),msg=m.querySelector('[data-msg]');
  setTimeout(function(){try{f.elements.pin.focus()}catch(e){}},80);
  m.addEventListener('click',function(ev){if(ev.target===m||ev.target.hasAttribute('data-x'))m.remove()});
  f.addEventListener('submit',function(ev){
    ev.preventDefault();var S=window.skPinSec;if(!S){m.remove();done();return}
    var lk=S.lockedSeconds?S.lockedSeconds():0;if(lk>0){msg.textContent='Too many attempts. Try again in '+lk+'s';return}
    if(S.matchesRole('admin',f.elements.pin.value.trim())){S.recordSuccess();m.remove();done()}
    else{var l2=S.recordFail();msg.textContent=l2>0?'Too many attempts. Try again in '+l2+'s':'Wrong PIN';f.elements.pin.value=''}
  });
}
/* ---- viewer ---- */
function fmtT(t){var d=new Date(t);if(isNaN(d))return '';var p=function(n){return String(n).padStart(2,'0')};return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes())}
window.skCreditLogOpen=function(key,title){
  var old=document.getElementById('skcpLogPage');if(old)old.remove();
  var log=arr(LOG).filter(function(l){return !key||String(l.key||'')===String(key)}).slice().reverse();
  var el=document.createElement('div');el.id='skcpLogPage';
  var rows=log.length?log.map(function(l){
    var ico=l.act==='add'?'＋':(l.act==='delete'?'🗑':'✎'),lab=l.act==='add'?'Added':(l.act==='delete'?'Deleted':'Edited');
    return '<div class="sklg-row"><span class="sklg-ic '+l.act+'">'+ico+'</span><div class="sklg-m"><b>'+lab+' • '+esc(l.kind)+' '+money(l.amt)+'</b><small>'+esc(l.who||'')+(l.note?' • '+esc(l.note):'')+'</small><small>'+esc(fmtT(l.t))+(l.dev?' • Phone '+esc(l.dev):'')+'</small></div></div>';
  }).join(''):'<div class="sklg-empty">No changes recorded yet. From now on every credit / payment added, edited or deleted is listed here.</div>';
  el.innerHTML='<div class="sklg-bar"><button type="button" class="sklg-back" aria-label="Back" onclick="document.getElementById(\'skcpLogPage\').remove()">‹</button><div><b>Change log</b><small>'+esc(title||'All customers')+'</small></div></div><div class="sklg-body">'+rows+'</div>';
  document.body.appendChild(el);
};
})();
