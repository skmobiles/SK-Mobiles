/* SK MOBILES v5.7.1 — Adds a small (x) clear button to every search box. It appears only while text is typed;
   tapping it empties the box in one go, refreshes the list and keeps the keyboard open. Display-only helper. */
(function(){
'use strict';
var SKIP='#searchInput,.sk-sc-done';
function isSearch(i){
  if(i.tagName!=='INPUT'||i.dataset.skSc)return false;
  var t=(i.type||'text').toLowerCase();if(t!=='text'&&t!=='search')return false;
  if(i.matches(SKIP)||i.readOnly||i.disabled)return false;
  return /search/i.test(i.id||'')||/search/i.test(i.placeholder||'')||t==='search';
}
function attach(i){
  i.dataset.skSc='1';
  var w=document.createElement('span');w.className='sk-sc-wrap';
  var cs=getComputedStyle(i);
  if(cs.flexGrow!=='0'||cs.flexBasis!=='auto')w.style.flex=cs.flex;
  w.style.minWidth='0';
  i.parentNode.insertBefore(w,i);w.appendChild(i);
  var b=document.createElement('button');b.type='button';b.className='sk-sc-btn';b.setAttribute('aria-label','Clear search');b.tabIndex=-1;
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  w.appendChild(b);
  function sync(){var on=!!i.value;if(w.classList.contains('has')!==on)w.classList.toggle('has',on)}
  i.addEventListener('input',sync);i.addEventListener('change',sync);
  /* mousedown/touchstart keep focus so the keyboard does not flicker closed */
  b.addEventListener('mousedown',function(e){e.preventDefault()});
  b.addEventListener('click',function(e){
    e.preventDefault();e.stopPropagation();
    i.value='';sync();
    i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));
    try{i.focus()}catch(x){}
  });
  /* some pages set the value from code (reset / filters) */
  var d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  if(d&&d.configurable){try{Object.defineProperty(i,'value',{configurable:true,get:function(){return d.get.call(i)},set:function(v){d.set.call(i,v);sync()}})}catch(x){}}
  sync();
}
function scan(){document.querySelectorAll('input').forEach(function(i){if(isSearch(i)){try{attach(i)}catch(e){}}})}
var t=0;function later(){clearTimeout(t);t=setTimeout(scan,120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
if(document.body)new MutationObserver(function(m){for(var k=0;k<m.length;k++)if(m[k].addedNodes.length){later();break}}).observe(document.body,{childList:true,subtree:true});
})();
