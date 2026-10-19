/* SK MOBILES v5.8.2 — Adds a small (x) clear button to every search box. It appears only while text is typed;
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
function attach(i,flex){
  i.dataset.skSc='1';try{i.setAttribute('enterkeyhint','search')}catch(x){}
  var w=document.createElement('span');w.className='sk-sc-wrap';
  if(flex)w.style.flex=flex;
  w.style.minWidth='0';
  i.parentNode.insertBefore(w,i);w.appendChild(i);
  var b=document.createElement('button');b.type='button';b.className='sk-sc-btn';b.setAttribute('aria-label','Clear search');b.tabIndex=-1;
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg>';
  w.appendChild(b);
  function sync(){var on=!!i.value;if(w.classList.contains('has')!==on)w.classList.toggle('has',on)}
  i.addEventListener('input',sync);i.addEventListener('change',sync);
  /* mousedown/touchstart keep focus so the keyboard does not flicker closed */
  /* V5.11.0: clear on the FIRST touch (pointerdown) — waiting for 'click' needed a second tap on phones */
  var last=0;
  function clearNow(e){
    e.preventDefault();e.stopPropagation();
    var n=Date.now();if(n-last<350)return;last=n;
    i.value='';sync();
    i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));
    try{i.focus()}catch(x){}
  }
  b.addEventListener('pointerdown',clearNow);
  b.addEventListener('mousedown',function(e){e.preventDefault()});
  b.addEventListener('touchstart',function(e){clearNow(e)},{passive:false});
  b.addEventListener('click',clearNow);
  /* some pages set the value from code (reset / filters) */
  var d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
  if(d&&d.configurable){try{Object.defineProperty(i,'value',{configurable:true,get:function(){return d.get.call(i)},set:function(v){d.set.call(i,v);sync()}})}catch(x){}}
  sync();
}
/* V5.9.8: read all styles first, then change the page (reading between writes forced a full re-layout per box) */
function scan(){var list=[];document.querySelectorAll('input').forEach(function(i){if(isSearch(i))list.push(i)});if(!list.length)return;var flex=list.map(function(i){var cs=getComputedStyle(i);return (cs.flexGrow!=='0'||cs.flexBasis!=='auto')?cs.flex:''});list.forEach(function(i,k){try{attach(i,flex[k])}catch(e){}})}
/* V5.11.0: the keyboard's search key (Enter) hides the keyboard so the results are visible */
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.keyCode!==13)return;var i=e.target;
  if(!i||i.tagName!=='INPUT')return;var t=(i.type||'text').toLowerCase();if(t!=='text'&&t!=='search')return;
  if(!(i.dataset.skSc||/search/i.test(i.id||'')||/search/i.test(i.placeholder||'')||t==='search'))return;
  e.preventDefault();try{i.blur()}catch(x){}
},true);
var t=0;function later(){clearTimeout(t);t=setTimeout(scan,120)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
if(document.body)new MutationObserver(function(m){for(var k=0;k<m.length;k++)if(m[k].addedNodes.length){later();break}}).observe(document.body,{childList:true,subtree:true});
})();
