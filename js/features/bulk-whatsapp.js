/* SK MOBILES v5.7.0 — Bulk WhatsApp: pick who (all / dues / EMI / recent / inactive customers) and a ready message
   (festival offer, due reminder, EMI reminder, thank you). Every customer gets one row with a Send button that opens
   WhatsApp with the message already written using their name and amount. WhatsApp itself does not allow a message to
   be sent to many people automatically, so the "Send next" button moves through the list one tap at a time.
   Read-only over existing data. */
(function(){
'use strict';
var T=window.skTools,esc=T.esc;
var aud='due',tpl='due',sent={},list=[];
var TPL={
  festival:{n:'Festival offer',t:'Hello {name}, wishing you and your family a very Happy Festival! 🎉\nSpecial offers on mobiles, accessories and repairs at {shop} this week. Visit us soon.\n📞 {phone}'},
  due:{n:'Due reminder',t:'Hello {name}, this is a gentle reminder from {shop}. Your pending balance is {amount}. Kindly pay at your earliest convenience. Thank you 🙏'},
  emi:{n:'EMI reminder',t:'Hello {name}, your EMI payment at {shop} is due. Pending amount: {amount}. Please pay on time. Thank you 🙏'},
  thanks:{n:'Thank you',t:'Hello {name}, thank you for shopping with {shop}! For any support or service, call us on {phone}. 🙏'},
  custom:{n:'Custom',t:'Hello {name}, '}
};
var AUD=[['due','Pending dues'],['emi','EMI'],['all','All customers'],['recent','Bought in 30 days'],['inactive','Not visited 90+ days']];
function customers(){
  var cs=[];try{cs=window.skCPGetCustomers?window.skCPGetCustomers():[]}catch(e){}
  return cs.map(function(c){
    var last=null;(c.bills||[]).forEach(function(x){var d=T.parseDate(x.b&&x.b.date);if(d&&(!last||d>last))last=d});
    return {name:c.name,phone:T.digits10(c.phone),bal:T.num(c.balance),emi:!!c.hasEmi,last:last};
  });
}
function pick(){
  var now=new Date(),all=customers();
  var withPhone=all.filter(function(c){return c.phone});
  var skipped=all.length-withPhone.length;
  var out=withPhone.filter(function(c){
    if(aud==='due')return c.bal>0;
    if(aud==='emi')return c.emi&&c.bal>0;
    if(aud==='recent')return c.last&&(now-c.last)/86400000<=30;
    if(aud==='inactive')return c.last&&(now-c.last)/86400000>90;
    return true;
  });
  out.sort(function(a,b){return aud==='due'||aud==='emi'?b.bal-a.bal:a.name.localeCompare(b.name)});
  return {rows:out,skipped:skipped};
}
function msgFor(c){
  var t=(document.getElementById('skBlkText')||{}).value||'';
  return t.replace(/\{name\}/g,c.name).replace(/\{amount\}/g,T.money(c.bal)).replace(/\{shop\}/g,T.shop('sk_shop_name','SK Mobiles')).replace(/\{phone\}/g,T.shop('sk_shop_phone',''));
}
function chips(arr,cur,fn){return arr.map(function(a){return '<button type="button" class="skbk-chip sk-keepr'+(a[0]===cur?' on':'')+'" onclick="'+fn+'(\''+a[0]+'\')">'+esc(a[1])+'</button>'}).join('')}
function render(){
  var p=pick();list=p.rows;
  var left=list.filter(function(c){return !sent[c.phone]}).length;
  var h=document.getElementById('skBlkRows');if(!h)return;
  h.innerHTML=list.length?list.map(function(c,i){
    var done=!!sent[c.phone];
    return '<div class="skbk-row'+(done?' done':'')+'">'+T.avatar(c.name)+'<span class="skcm-tx"><b>'+esc(c.name)+'</b><small>'+esc(c.phone)+(c.bal>0?' • Due '+T.money(c.bal):'')+'</small></span>'+
      '<button type="button" class="skbk-send sk-keepr" onclick="skBlkSend('+i+')">'+(done?'✓ Sent':'Send')+'</button></div>';
  }).join(''):'<div class="skcm-empty">No customers in this group</div>';
  var c=document.getElementById('skBlkCount');if(c)c.textContent=list.length+' customers'+(p.skipped?' • '+p.skipped+' without phone skipped':'');
  var n=document.getElementById('skBlkNext');if(n){n.disabled=!left;n.innerHTML='📲 Send next'+(left?' ('+left+' left)':' — all done')}
}
window.skBlkAud=function(a){aud=a;sent={};var w=document.getElementById('skBlkAud');if(w)w.innerHTML=chips(AUD,aud,'skBlkAud');render()};
window.skBlkTpl=function(t){tpl=t;var x=document.getElementById('skBlkText');if(x)x.value=TPL[t].t;var w=document.getElementById('skBlkTpl');if(w)w.innerHTML=chips(Object.keys(TPL).map(function(k){return[k,TPL[k].n]}),tpl,'skBlkTpl')};
window.skBlkSend=function(i){
  var c=list[i];if(!c)return;
  sent[c.phone]=1;window.open(T.waLink(c.phone,msgFor(c)),'_blank','noopener');render();
};
window.skBlkNext=function(){
  for(var i=0;i<list.length;i++)if(!sent[list[i].phone]){window.skBlkSend(i);return}
};
window.skOpenBulk=function(){
  sent={};aud='due';tpl='due';
  T.modal('skBulkModal','Bulk WhatsApp',
    '<div class="skpop-note">'+T.ic('info','blue')+'<span>WhatsApp does not allow sending to many people at once. Choose a group and a message, then tap <b>Send</b> for each customer. The name and amount are filled in for you.</span></div>'+
    '<div class="skpop-fld"><span>'+T.ic('users','blue')+'Who</span><div class="skbk-chips" id="skBlkAud"></div></div>'+
    '<div class="skpop-fld"><span>'+T.ic('megaphone','orange')+'Message</span><div class="skbk-chips" id="skBlkTpl"></div>'+
    '<textarea id="skBlkText" rows="4"></textarea><small class="skbk-hint">You can use {name}, {amount}, {shop}, {phone}</small></div>'+
    '<div class="skbk-meta" id="skBlkCount"></div><div class="skbk-rows" id="skBlkRows"></div>'+
    '<div class="skpop-actions"><button type="button" class="submit-btn whatsapp-green sk-keepr" id="skBlkNext" onclick="skBlkNext()"></button></div>');
  window.skBlkAud('due');window.skBlkTpl('due');T.open('skBulkModal');
};
function boot(){var n=0,t=setInterval(function(){if(T.drawer('skDrBulk','Bulk WhatsApp','<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.6c0 3.3 2.7 6 6 6l1-1.6-2-1-.9.8a4 4 0 0 1-2-2l.8-.9-1-2z"/>','menu-icon-credit','skOpenBulk()',['skDrPriceList','skDrCreditRange','skDrMonth'])||++n>20)clearInterval(t)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
