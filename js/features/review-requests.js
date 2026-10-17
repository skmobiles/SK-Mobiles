/* SK MOBILES v5.6.166 — Reviews & Offers.
   Keeps a separate contact list (name + number) of customers who bought a mobile or got a repair finished, and lets the
   shop send them (1) a WhatsApp message with the shop's review link and (2) new offers. Contacts are saved in their own
   key (skx_marketing_contacts_v1); bills, repairs and credit data are only read, never changed. */
(function(){
'use strict';
var T=window.skTools,esc=T.esc,KEY='skx_marketing_contacts_v1',LINK='skx_review_link_v1';
var tab='review',kind='all',list=[],sent={};
var MSG={
  review:'Hello {name}, thank you for choosing {shop}! 🙏\nIf you are happy with our {service}, please give us a rating here:\n{link}\nYour feedback means a lot to us.',
  offer:'Hello {name}, new offers are live at {shop}! 🎉\nSpecial prices on mobiles, accessories and repairs. Visit us or call {phone}.'
};
function load(){try{var v=JSON.parse(localStorage.getItem(KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return{}}}
function save(o){try{localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}}
function iso(d){return d?d.getFullYear()+'-'+T.p2(d.getMonth()+1)+'-'+T.p2(d.getDate()):''}
/* add or refresh contacts from bills and finished repairs; returns the store */
function sync(){
  var s=load(),ch=false;
  function add(name,phone,k,when){
    var p=T.digits10(phone);if(!p)return;
    var d=T.parseDate(when),dt=iso(d),c=s[p];
    if(!c){c=s[p]={name:name||'Customer',kinds:[],last:'',reviewAt:'',offerAt:''};ch=true}
    if(c.kinds.indexOf(k)<0){c.kinds.push(k);ch=true}
    if(dt&&dt>(c.lastBy&&c.lastBy[k]||'')){c.lastBy=c.lastBy||{};c.lastBy[k]=dt;ch=true}
    if(dt&&dt>c.last){c.last=dt;ch=true}
    if(name&&c.name!==name&&dt>=c.last){c.name=name;ch=true}
  }
  T.arr('sk_bills').forEach(function(b){if(b)add(b.custName,b.phone,'purchase',b.date)});
  T.arr('skx_repair_jobs_v2').forEach(function(j){if(j&&j.status==='Delivered')add(j.customer,j.phone,'repair',j.deliveredAt||j.updatedAt||j.createdAt||j.date)});
  if(ch)save(s);return s;
}
function getLink(){return (T.shop(LINK,'')||'').trim()}
function pick(){
  var s=sync(),now=new Date(),out=[];
  Object.keys(s).forEach(function(p){
    var c=s[p];
    if(kind!=='all'&&c.kinds.indexOf(kind)<0)return;
    if(tab==='review'){
      var d=T.parseDate(c.last);if(!d||(now-d)/86400000>45)return;
      if(c.reviewAt&&c.reviewAt>=c.last)return;
    }
    out.push({phone:p,name:c.name,kinds:c.kinds,last:c.last,reviewAt:c.reviewAt,offerAt:c.offerAt});
  });
  out.sort(function(a,b){return a.last<b.last?1:a.last>b.last?-1:0});
  return out;
}
function msgFor(c){
  var t=(document.getElementById('skRvText')||{}).value||'';
  var svc=c.kinds.indexOf('repair')>=0&&c.kinds.indexOf('purchase')<0?'repair service':c.kinds.indexOf('repair')>=0?'purchase and service':'purchase';
  return t.replace(/\{name\}/g,c.name).replace(/\{shop\}/g,T.shop('sk_shop_name','SK Mobiles')).replace(/\{phone\}/g,T.shop('sk_shop_phone','')).replace(/\{service\}/g,svc).replace(/\{link\}/g,getLink());
}
function chips(arr,cur,fn){return arr.map(function(a){return '<button type="button" class="skbk-chip sk-keepr'+(a[0]===cur?' on':'')+'" onclick="'+fn+'(\''+a[0]+'\')">'+esc(a[1])+'</button>'}).join('')}
function label(c){return c.kinds.map(function(k){return k==='repair'?'Repair':'Mobile'}).join(' + ')}
function render(){
  list=pick();
  var h=document.getElementById('skRvRows');if(!h)return;
  var left=list.filter(function(c){return !sent[c.phone]}).length;
  h.innerHTML=list.length?list.map(function(c,i){
    var done=!!sent[c.phone],when=tab==='review'?c.reviewAt:c.offerAt;
    return '<div class="skbk-row'+(done?' done':'')+'">'+T.avatar(c.name)+'<span class="skcm-tx"><b>'+esc(c.name)+'</b><small>'+esc(c.phone)+' • '+label(c)+(c.last?' • '+esc(T.dmy(c.last)):'')+(when?' • sent '+esc(T.dmy(when)):'')+'</small></span>'+
      '<button type="button" class="skbk-send sk-keepr" onclick="skRvSend('+i+')">'+(done?'✓ Sent':'Send')+'</button></div>';
  }).join(''):'<div class="skcm-empty">'+(tab==='review'?'No customers waiting for a review request':'No saved contacts yet')+'</div>';
  var n=document.getElementById('skRvNext');if(n){n.disabled=!left;n.innerHTML='📲 Send next'+(left?' ('+left+' left)':' — all done')}
  var m=document.getElementById('skRvCount');if(m)m.textContent=list.length+' contacts'+(tab==='review'&&!getLink()?' • Add your review link first':'');
}
function setTab(t){
  tab=t;sent={};
  var w=document.getElementById('skRvTab');if(w)w.innerHTML=chips([['review','Ask for review'],['offer','Send offers']],tab,'skRvTab');
  var x=document.getElementById('skRvText');if(x)x.value=MSG[t];
  var k=document.getElementById('skRvKind');if(k)k.innerHTML=chips([['all','All'],['purchase','Mobile buyers'],['repair','Repair']],kind,'skRvKind');
  render();
}
window.skRvTab=setTab;
window.skRvKind=function(k){kind=k;sent={};var w=document.getElementById('skRvKind');if(w)w.innerHTML=chips([['all','All'],['purchase','Mobile buyers'],['repair','Repair']],kind,'skRvKind');render()};
window.skRvSaveLink=function(){
  var v=((document.getElementById('skRvLink')||{}).value||'').trim();
  if(v&&!/^https?:\/\//i.test(v))v='https://'+v;
  try{localStorage.setItem(LINK,v)}catch(e){}
  var i=document.getElementById('skRvLink');if(i)i.value=v;T.toast(v?'Review link saved':'Review link cleared');render();
};
window.skRvSend=function(i){
  var c=list[i];if(!c)return;
  if(tab==='review'&&!getLink()){T.toast('Add your review link first');var l=document.getElementById('skRvLink');if(l)l.focus();return}
  var s=load(),now=iso(new Date());
  if(s[c.phone]){if(tab==='review')s[c.phone].reviewAt=now;else s[c.phone].offerAt=now;save(s)}
  sent[c.phone]=1;window.open(T.waLink(c.phone,msgFor(c)),'_blank','noopener');
  render();
};
window.skRvNext=function(){for(var i=0;i<list.length;i++)if(!sent[list[i].phone]){window.skRvSend(i);return}};
window.skOpenReviews=function(){
  sent={};tab='review';kind='all';sync();
  T.modal('skReviewModal','Reviews & Offers',
    '<div class="skpop-note">'+T.ic('info','blue')+'<span>Customers who bought a mobile or got a repair finished are saved here automatically (name and number). Tap <b>Send</b> to WhatsApp them your review link, or send a new offer.</span></div>'+
    '<div class="skpop-fld"><span>'+T.ic('link','blue')+'Your review link</span><div class="skrv-link"><input id="skRvLink" type="url" inputmode="url" placeholder="Paste your Google review link" value="'+esc(getLink())+'"><button type="button" class="submit-btn sk-keepr" onclick="skRvSaveLink()">Save</button></div></div>'+
    '<div class="skpop-fld"><div class="skbk-chips" id="skRvTab"></div></div>'+
    '<div class="skpop-fld"><span>'+T.ic('users','blue')+'Who</span><div class="skbk-chips" id="skRvKind"></div></div>'+
    '<div class="skpop-fld"><span>'+T.ic('megaphone','orange')+'Message</span><textarea id="skRvText" rows="4"></textarea><small class="skbk-hint">You can use {name}, {link}, {service}, {shop}, {phone}</small></div>'+
    '<div class="skbk-meta" id="skRvCount"></div><div class="skbk-rows" id="skRvRows"></div>'+
    '<div class="skpop-actions"><button type="button" class="submit-btn whatsapp-green sk-keepr" id="skRvNext" onclick="skRvNext()"></button></div>');
  setTab('review');T.open('skReviewModal');
};
function boot(){var n=0,t=setInterval(function(){if(T.drawer('skDrReviews','Reviews & Offers','<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>','menu-icon-credit','skOpenReviews()',['skDrBulk','skDrPriceList','skDrMonth'])||++n>20)clearInterval(t)},500);
  setTimeout(function(){try{sync()}catch(e){}},4000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
