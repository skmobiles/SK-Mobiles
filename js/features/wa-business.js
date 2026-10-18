/* SK MOBILES V5.9.2 — WhatsApp buttons open WhatsApp Business on Android.
   Every "WhatsApp" button in the app opens a https://wa.me/... link. On Android this file turns that link into an
   Android intent for WhatsApp Business (package com.whatsapp.w4b). If WhatsApp Business is not installed, Android
   falls back to the normal wa.me link (normal WhatsApp). Other phones / desktop are unchanged.
   File sharing (PDF via the Share sheet) cannot be pointed at one app by a web page — pick WhatsApp Business there.
   No data is read or written. */
(function(){
'use strict';
if(window.__skWaBusiness)return;window.__skWaBusiness=true;
var isAndroid=/Android/i.test(navigator.userAgent||'');
var RX=/^https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i;
function toIntent(url){
  try{
    var u=new URL(url),phone='',text=u.searchParams.get('text')||'';
    if(/wa\.me$/i.test(u.hostname))phone=u.pathname.replace(/[^0-9]/g,'');
    else phone=(u.searchParams.get('phone')||'').replace(/[^0-9]/g,'');
    var q=[];if(phone)q.push('phone='+phone);if(text)q.push('text='+encodeURIComponent(text));
    return 'intent://send/?'+q.join('&')+'#Intent;scheme=whatsapp;package=com.whatsapp.w4b;S.browser_fallback_url='+encodeURIComponent(url)+';end';
  }catch(e){return null}
}
window.skWaIntent=toIntent;
if(!isAndroid)return;
var nativeOpen=window.open;
window.open=function(url){
  if(typeof url==='string'&&RX.test(url)){var it=toIntent(url);if(it){try{window.location.href=it;return null}catch(e){}}}
  return nativeOpen.apply(window,arguments);
};
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;
  var h=a.getAttribute('href')||'';if(!RX.test(h))return;
  var it=toIntent(h);if(!it)return;e.preventDefault();window.location.href=it;
},true);
})();
