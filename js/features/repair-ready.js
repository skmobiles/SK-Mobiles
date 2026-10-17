/* SK MOBILES v5.6.163 — Repair "Ready" → WhatsApp popup.
   When a repair job becomes Ready (status button or edit form), a popup offers a one-tap WhatsApp message
   to the customer with the model and the balance to pay. Nothing is sent automatically. */
(function(){
'use strict';
var KEY='skx_repair_jobs_v2';
function load(){try{var v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function tail10(v){return String(v||'').replace(/\D/g,'').slice(-10)}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}
function balanceOf(j){
  if(j.outstandingAmount!=null&&j.outstandingAmount!=='')return Math.max(0,num(j.outstandingAmount));
  return Math.max(0,num(j.estimate)-num(j.discountAmount)-num(j.paidAmount));
}
function message(j){
  var bal=balanceOf(j);
  var t='Hello '+(j.customer||'')+', your '+(j.model||'phone')+' is repaired and ready for pick-up at '+shopName()+'.';
  if(bal>0)t+=' Balance to pay: '+money(bal)+'.';
  return t+' Please collect it at your convenience. Thank you 🙏';
}
function popup(j){
  var old=document.getElementById('skRdyPop');if(old)old.remove();
  var has=tail10(j.phone).length===10,bal=balanceOf(j);
  var el=document.createElement('div');el.id='skRdyPop';el.className='skwp-overlay';
  el.innerHTML='<div class="skwp-card"><div class="skwp-ok">🛠️</div><h3>Repair ready</h3>'+
    '<p><b>'+esc(j.customer||'Customer')+'</b> • '+esc(j.model||'')+'<br><span>'+(bal>0?'Balance to pay '+esc(money(bal)):'Fully paid')+(has?' • 📞 '+esc(tail10(j.phone)):' • No phone number saved')+'</span></p>'+
    '<button type="button" class="submit-btn whatsapp-green" id="skrdySend">💬 Tell customer on WhatsApp</button>'+
    '<button type="button" class="skwp-skip" id="skrdySkip">Skip</button></div>';
  document.body.appendChild(el);
  el.addEventListener('click',function(e){if(e.target===el)el.remove()});
  document.getElementById('skrdySkip').onclick=function(){el.remove()};
  document.getElementById('skrdySend').onclick=function(){
    window.open('https://wa.me/'+(has?'91'+tail10(j.phone):'')+'?text='+encodeURIComponent(message(j)),'_blank','noopener');
    el.remove();
  };
}
function snapshot(){var m={};load().forEach(function(j){if(j&&j.id!=null)m[j.id]=j.status});return m}
function check(before){
  var after=load();
  for(var i=0;i<after.length;i++){
    var j=after[i];
    if(j&&j.status==='Ready'&&before[j.id]!=='Ready'){popup(j);return}
  }
}
function wrap(){
  ['skRjNext','skRjSaveJob'].forEach(function(name){
    var o=window[name];if(typeof o!=='function'||o.__rdy)return;
    var w=function(){
      var before=snapshot(),r=o.apply(this,arguments);
      try{setTimeout(function(){check(before)},120)}catch(e){}
      return r;
    };
    w.__rdy=1;window[name]=w;
  });
}
function boot(){wrap();setTimeout(wrap,1500)}
window.skRdyMessage=message;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
