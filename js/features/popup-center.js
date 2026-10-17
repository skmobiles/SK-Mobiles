/* SK MOBILES v5.6.162 — Short popup windows open in the centre of the screen.
   Tall pages (billing, settings, lists…) keep their full-height layout. A popup counts as "short" when its content
   is less than ~80% of the screen height; this is re-checked when the content grows or shrinks. */
(function(){
'use strict';
var SEL='.modal-overlay,.sk-used-filter-overlay,.sk-used-detail-overlay';
var CLS='sk-pop-center',IN=0.8,OUT=0.9;
var ro=null,seen=typeof WeakSet==='function'?new WeakSet():null;
function visible(o){
  if(o.classList.contains('modal-overlay')&&!o.classList.contains('active'))return false;
  var cs=getComputedStyle(o);return cs.display!=='none'&&cs.visibility!=='hidden';
}
function evaluate(o){
  if(!o||!o.isConnected)return;
  var s=o.firstElementChild;
  if(!visible(o)||!s){if(o.classList.contains(CLS))o.classList.remove(CLS);return}
  var h=Math.max(s.scrollHeight,s.getBoundingClientRect().height),r=h/window.innerHeight,on=o.classList.contains(CLS);
  if(!on&&r<IN)o.classList.add(CLS);
  else if(on&&r>OUT)o.classList.remove(CLS);
  if(ro&&seen&&!seen.has(s)){seen.add(s);ro.observe(s)}
}
var raf=0,queue=new Set();
function schedule(o){
  queue.add(o);if(raf)return;
  raf=requestAnimationFrame(function(){raf=0;var q=Array.from(queue);queue.clear();q.forEach(evaluate)});
}
function scanAll(){document.querySelectorAll(SEL).forEach(schedule)}
function boot(){
  if(typeof ResizeObserver==='function')ro=new ResizeObserver(function(es){es.forEach(function(e){var o=e.target.parentElement;if(o&&o.matches&&o.matches(SEL))schedule(o)})});
  new MutationObserver(function(ms){
    ms.forEach(function(m){
      if(m.type==='attributes'){var o=m.target;if(o.matches&&o.matches(SEL))schedule(o)}
      else m.addedNodes.forEach(function(n){if(n.nodeType===1){if(n.matches&&n.matches(SEL))schedule(n);else if(n.querySelectorAll)n.querySelectorAll(SEL).forEach(schedule)}});
    });
  }).observe(document.body,{attributes:true,attributeFilter:['class','style','open'],childList:true,subtree:true});
  window.addEventListener('resize',scanAll);
  scanAll();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
