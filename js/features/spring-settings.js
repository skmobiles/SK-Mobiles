/* SK MOBILES V5.11.19 — Settings -> Spring bounce: on/off, strength, Home pull-to-reload on/off.
   Stored per phone in localStorage key `skdev_spring` (deliberately NOT sk_/skx_, so it is not synced to other phones). */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
var KEY='skdev_spring';
function get(){var c={on:true,level:'medium',refresh:true};try{var j=JSON.parse(localStorage.getItem(KEY)||'null');if(j){if(j.on===false)c.on=false;if(['low','medium','high'].indexOf(j.level)>=0)c.level=j.level;if(j.refresh===false)c.refresh=false}}catch(e){}return c}
function put(c){try{localStorage.setItem(KEY,JSON.stringify(c))}catch(e){}}
window.skSpringLabel=function(){var c=get();return c.on?('On · '+c.level.charAt(0).toUpperCase()+c.level.slice(1)):'Off'};
function section(){
  var sh=document.querySelector('#settingsModal > .modal-sheet');if(!sh)return null;
  var sec=$('skSpringSection');
  if(!sec){sec=document.createElement('section');sec.id='skSpringSection';sec.className='st-section skspr';var t=sh.querySelector(':scope > .modal-title');sh.insertBefore(sec,t?t.nextSibling:sh.firstChild)}
  return sec;
}
function sw(id,on,label,sub){return '<div class="skspr-row"><span class="skspr-tx"><b>'+label+'</b><small>'+sub+'</small></span><button type="button" class="skspr-sw'+(on?' on':'')+'" id="'+id+'" role="switch" aria-checked="'+on+'" aria-label="'+label+'"><i></i></button></div>'}
function render(){
  var sec=section();if(!sec)return;var c=get();
  var seg=['low','medium','high'].map(function(l){return '<button type="button" class="skspr-seg'+(c.level===l?' on':'')+'" data-lv="'+l+'"'+(c.on?'':' disabled')+'>'+l.charAt(0).toUpperCase()+l.slice(1)+'</button>'}).join('');
  sec.innerHTML='<div class="skspr-card">'+sw('skSprOn',c.on,'Spring bounce','Pages, popups and menus spring at the top / bottom.')+
    '<div class="skspr-row skspr-col"><span class="skspr-tx"><b>Strength</b><small>How far it pulls and how much it bounces.</small></span><div class="skspr-segs">'+seg+'</div></div>'+
    sw('skSprRef',c.refresh,'Pull down to reload (Home)','At the top of Home, pull down and release to reload the app.')+'</div>'+
    '<div class="skspr-note">This setting is saved on this phone only. Turn it Off on a slow phone to save battery and make scrolling lighter.</div>';
  if(!c.on){var r=sec.querySelector('#skSprRef');if(r){r.disabled=true}}
}
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('#skSpringSection button');if(!b)return;
  var c=get();
  if(b.id==='skSprOn')c.on=!c.on;
  else if(b.id==='skSprRef')c.refresh=!c.refresh;
  else if(b.getAttribute('data-lv'))c.level=b.getAttribute('data-lv');
  else return;
  put(c);render();
  try{var l=document.querySelector('#settingsModal .skst-row[data-spring]');}catch(x){}
});
function boot(){render()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
