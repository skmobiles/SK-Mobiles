/* SK MOBILES v5.8.1 — small shared helpers for the newer tools (bulk WhatsApp, stock aging, backup, customer QR). */
(function(){
'use strict';
var T=window.skTools={};
T.esc=function(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})};
T.num=function(v){v=Number(v);return isFinite(v)?v:0};
T.money=function(n){return '₹'+Math.round(T.num(n)).toLocaleString('en-IN')};
T.arr=function(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}};
T.toast=function(t){if(typeof window.showToast==='function')window.showToast(t)};
T.digits10=function(p){var d=String(p||'').replace(/\D/g,'');return d.length>=10?d.slice(-10):''};
T.shop=function(k,d){try{return localStorage.getItem(k)||d}catch(e){return d}};
T.p2=function(n){return String(n).padStart(2,'0')};
T.parseDate=function(s){
  if(!s)return null;if(s instanceof Date)return isNaN(s)?null:s;
  var x=String(s).trim(),m=x.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  m=x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return new Date(+m[1],+m[2]-1,+m[3]);
  var d=new Date(x);return isNaN(d)?null:d;
};
T.dmy=function(d){d=T.parseDate(d);return d?T.p2(d.getDate())+'/'+T.p2(d.getMonth()+1)+'/'+d.getFullYear():''};
T.daysAgo=function(d){d=T.parseDate(d);if(!d)return null;var t=new Date();t=new Date(t.getFullYear(),t.getMonth(),t.getDate());return Math.round((t-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/86400000)};
T.ic=function(n,c){return '<i class="ski ski-in c-'+c+'" data-i="'+n+'" aria-hidden="true"></i>'};
T.waLink=function(phone,text){var d=T.digits10(phone);return 'https://wa.me/'+(d?'91'+d:'')+'?text='+encodeURIComponent(text)};
T.avStyle=function(name){var h=0,t=String(name||'?');for(var i=0;i<t.length;i++)h=(h*31+t.charCodeAt(i))%360;return 'background:linear-gradient(135deg,hsl('+h+',72%,56%),hsl('+((h+40)%360)+',68%,44%))'};
T.avatar=function(name){var st=T.avStyle(name);return '<span class="skcm-av" style="'+st+'">'+T.esc(String(name||'?').charAt(0).toUpperCase())+'</span>'};
/* A popup with the shared design: title (icon is added from colorful-ui by the overlay id), body, optional actions. */
T.modal=function(id,title,body){
  var el=document.getElementById(id);
  if(!el){el=document.createElement('div');el.className='modal-overlay';el.id=id;document.body.appendChild(el)}
  el.innerHTML='<div class="modal-sheet skpop"><div class="modal-title"><span>'+T.esc(title)+'</span><button class="modal-close-btn" onclick="toggleModal(\''+id+'\',false)">✕</button></div>'+body+'</div>';
  return el;
};
T.open=function(id){if(typeof window.toggleModal==='function')window.toggleModal(id,true)};
T.close=function(id){if(typeof window.toggleModal==='function')window.toggleModal(id,false)};
/* drawer entry placed after the first existing reference button */
T.drawer=function(id,label,svgInner,pod,onclick,afterIds){
  if(document.getElementById(id))return true;
  var ref=null;for(var i=0;i<afterIds.length&&!ref;i++)ref=document.getElementById(afterIds[i]);
  if(!ref)return false;
  var b=document.createElement('button');b.className='menu-drawer-btn';b.id=id;b.type='button';b.setAttribute('onclick',onclick+'; toggleLeftDrawer(false);');
  b.innerHTML='<span class="menu-icon-pod '+pod+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+svgInner+'</svg></span><span class="menu-btn-label">'+T.esc(label)+'</span><span class="menu-arrow">›</span>';
  ref.parentNode.insertBefore(b,ref.nextSibling);return true;
};
})();
