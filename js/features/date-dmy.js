/* SK MOBILES v5.7.0 — every calendar (date) field shows the date as dd/mm/yyyy, whatever the phone's language/region is.
   The stored value stays ISO (yyyy-mm-dd) so all existing code works unchanged; only what is displayed changes. */
(function(){
'use strict';
var SKIP='.sk-date-native,.skcr-datebtn input,.skdr-datebox input,.sk-dmy-off';
function fmt(v){var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v||'');return m?m[3]+'/'+m[2]+'/'+m[1]:''}
function attach(i){
  i.dataset.skDmy='1';
  var w=document.createElement('span');w.className='sk-dmy';
  var cs=getComputedStyle(i);
  if(cs.flexGrow!=='0')w.style.flex=cs.flex;
  i.parentNode.insertBefore(w,i);w.appendChild(i);
  var t=document.createElement('span');t.className='sk-dmy-txt';t.setAttribute('aria-hidden','true');w.appendChild(t);
  function sync(){
    var v=fmt(i.value);t.textContent=v||'dd/mm/yyyy';t.classList.toggle('empty',!v);
    var c=getComputedStyle(i);t.style.fontSize=c.fontSize;t.style.fontWeight=c.fontWeight;
  }
  i.addEventListener('input',sync);i.addEventListener('change',sync);
  var d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  if(d&&d.configurable){try{Object.defineProperty(i,'value',{configurable:true,get:function(){return d.get.call(i)},set:function(v){d.set.call(i,v);sync()}})}catch(x){}}
  sync();
}
function scan(){document.querySelectorAll('input[type="date"]').forEach(function(i){if(!i.dataset.skDmy&&!i.matches(SKIP)&&!i.closest('.sk-date-wrap')){try{attach(i)}catch(e){}}})}
var tm=0;function later(){clearTimeout(tm);tm=setTimeout(scan,120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
if(document.body)new MutationObserver(function(m){for(var k=0;k<m.length;k++)if(m[k].addedNodes.length){later();break}}).observe(document.body,{childList:true,subtree:true});
})();
