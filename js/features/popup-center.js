/* SK MOBILES v5.8.2 — Short popup windows open in the centre of the screen.
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
/* V5.9.14: real pages always stay full-screen pages, even when they have little content */
var PAGES=/^(skCreditLedgerPage|billingModal|settingsModal|skRepairJobsModal|skAccessoriesPage|skMonthReportModal|skDailyReportModal|skStorageHealthModal|skAdminPanelModal|itemEditorModal|toolsOthersNoteModal|viewBillModal|skUsedStockModal|skBulkModal|skReviewModal)$/;
function evaluate(o){
  if(!o||!o.isConnected)return;
  if(PAGES.test(o.id||'')){if(o.classList.contains(CLS))o.classList.remove(CLS);return}
  var s=o.firstElementChild;
  if(!visible(o)||!s){if(o.classList.contains(CLS))o.classList.remove(CLS);return}
  /* V5.9.14: measure the content itself - full pages are now stretched to the screen, so the box height no longer tells */
  var sr=s.getBoundingClientRect(),cs=getComputedStyle(s),bottom=0;
  Array.prototype.forEach.call(s.children,function(c){var r=c.getBoundingClientRect();if(r.height>0)bottom=Math.max(bottom,r.bottom-sr.top+s.scrollTop+(parseFloat(getComputedStyle(c).marginBottom)||0))});
  var h=bottom+(parseFloat(cs.paddingBottom)||0),r=h/window.innerHeight,on=o.classList.contains(CLS);
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
/* V5.9.14: mark sheets whose content scrolls, so their bottom edge can fade (same scroll look everywhere) */
var sct=0;
function markScroll(){document.querySelectorAll('.modal-overlay.active > .modal-sheet').forEach(function(s){var on=s.scrollHeight>s.clientHeight+4;if(on!==s.classList.contains('sk-scrolls'))s.classList.toggle('sk-scrolls',on)})}
function markSoon(){clearTimeout(sct);sct=setTimeout(markScroll,120)}
function bootMark(){new MutationObserver(markSoon).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});window.addEventListener('resize',markSoon);markSoon()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){boot();bootMark()});else{boot();bootMark()}
})();
