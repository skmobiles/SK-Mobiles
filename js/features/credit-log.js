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
