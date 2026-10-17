/* SK MOBILES v5.7.2 — Android / browser Back button, one step at a time.
   Every open page, popup or inner view (customer detail, used-stock form, bill popup…) gets one history entry.
   Back closes only the top-most one; closing with the on-screen buttons removes its entry again.
   When nothing is open, the app's own Home/root handling in app.js still applies. */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function isOn(el){return !!el&&el.classList.contains('active')}
function vis(el){if(!el||!el.isConnected)return false;var cs=getComputedStyle(el);return cs.display!=='none'&&cs.visibility!=='hidden'}

var stack=[];          /* [{key,el,close}] in the order they opened */
var depth=0;           /* history entries pushed by this module and still on the stack */
var ignore=0;          /* popstate events caused by our own history.go() */
var eph=0;

/* ---- how to close each kind of layer ---- */
var MODAL_CLOSERS={
  skCreditLedgerPage:function(){if(window.skCPBackToHome)window.skCPBackToHome()},
  skAccessoriesPage:function(){if(window.skCloseAccessoriesPage)window.skCloseAccessoriesPage()},
  skUrgentRepairModal:function(){if(window.skCloseUrgentRepairModal)window.skCloseUrgentRepairModal()}
};
function closeModal(id){
  var f=MODAL_CLOSERS[id];
  if(f){f();return}
  if(typeof window.toggleModal==='function')window.toggleModal(id,false);
  else{var e=$(id);if(e)e.classList.remove('active')}
}
function layersNow(){
  var out=[];
  document.querySelectorAll('.modal-overlay.active').forEach(function(el){
    if(el.id)out.push({key:el.id,el:el,close:function(){closeModal(el.id)},still:function(){return isOn(el)}});
  });
  var dr=$('leftDrawer');
  if(isOn(dr))out.push({key:'leftDrawer',el:dr,close:function(){if(window.toggleLeftDrawer)window.toggleLeftDrawer(false);else dr.classList.remove('active')},still:function(){return isOn(dr)}});
  /* short-lived popups created on the fly */
  document.querySelectorAll('.skwp-overlay,.skph-view,.sk-used-detail-overlay,.sk-scan-overlay').forEach(function(el){
    if(!el.__bkKey)el.__bkKey='eph'+(++eph);
    out.push({key:el.__bkKey,el:el,close:function(){
      var x=el.classList.contains('sk-scan-overlay')?el.querySelector('.sk-scan-x'):null;
      if(x)x.click();else el.remove();
    },still:function(){return el.isConnected}});
  });
  /* inner views: Back goes to the list the user came from */
  var led=$('skCPDetailView');
  if(isOn($('skCreditLedgerPage'))&&led&&led.style.display==='block')out.push({key:'sub:ledger',close:function(){if(window.skCPBackToList)window.skCPBackToList()},still:function(){return led.style.display==='block'}});
  var used=$('skUsedStockModal');
  if(isOn(used)&&used.classList.contains('sk-used-form-page'))out.push({key:'sub:usedform',close:function(){if(window.skUsedBack)window.skUsedBack();if(isOn(used)&&used.classList.contains('sk-used-form-page')&&window.skUsedShowManagement)window.skUsedShowManagement()},still:function(){return used.classList.contains('sk-used-form-page')}});
  var cu=$('skCuDetail');
  if(isOn($('skCustModal'))&&cu&&cu.style.display!=='none'&&cu.style.display!=='')out.push({key:'sub:cust',close:function(){if(window.skCuBack)window.skCuBack()},still:function(){return cu.style.display!=='none'&&cu.style.display!==''}});
  var dl=$('skDlBody');
  if(isOn($('skDealerModal'))&&dl&&dl.querySelector('.skdl-back'))out.push({key:'sub:dealer',close:function(){if(window.skDlOpen)window.skDlOpen(null)},still:function(){return !!dl.querySelector('.skdl-back')}});
  return out;
}

/* ---- history bookkeeping ---- */
function z(l){if(!l.el)return 1e9;var n=parseInt(getComputedStyle(l.el).zIndex,10);return isNaN(n)?0:n}
function push(key){
  try{history.pushState({skMobilesApp:true,skOv:key,filter:(typeof currentFilter==='string'?currentFilter:'home'),modal:null},document.title,location.href);depth++}catch(e){}
}
function sync(){
  var now=layersNow(),keys={};
  now.forEach(function(l){keys[l.key]=l});
  /* closed by on-screen buttons */
  stack=stack.filter(function(l){return !!keys[l.key]});
  /* newly opened */
  var fresh=now.filter(function(l){return !stack.some(function(s){return s.key===l.key})});
  /* layers that appear in the same moment: the one with the higher z-index is on top */
  fresh.sort(function(a,b){var sa=a.key.indexOf('sub:')===0?1:0,sb=b.key.indexOf('sub:')===0?1:0;return sa-sb||z(a)-z(b)});
  fresh.forEach(function(l){stack.push(l);push(l.key)});
  /* drop history entries that no longer have a layer */
  var extra=depth-stack.length;
  if(extra>0){ignore++;depth=stack.length;try{history.go(-extra)}catch(e){ignore--}}
}
var raf=0;
function schedule(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;try{sync()}catch(e){console.warn('back-nav',e)}})}

window.addEventListener('popstate',function(e){
  if(ignore>0){ignore--;e.stopImmediatePropagation();return}
  if(!stack.length)return;                 /* nothing open: app.js handles Home/root */
  e.stopImmediatePropagation();
  depth=Math.max(0,depth-1);
  var top=stack.pop();
  try{top.close()}catch(err){console.warn('back-nav close',err)}
  /* make sure it really closed */
  if(top.still&&top.still()){
    if(top.el&&top.el.classList){top.el.classList.remove('active','open');if(top.el.classList.contains('skwp-overlay')||top.el.classList.contains('skph-view'))top.el.remove()}
  }
  schedule();
},true);

/* old per-page history hooks in app.js are replaced by this module */
['skAppHistoryModal','skAppHistoryDrawer','skAppHistoryRepairOpen','skAppHistoryRepairClose'].forEach(function(n){window[n]=function(){}});

function boot(){
  try{if(history.state&&history.state.skOv)history.replaceState({skMobilesApp:true,filter:history.state.filter||'home',modal:null},document.title,location.href)}catch(e){}
  try{new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class','style'],childList:true,subtree:true})}catch(e){}
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
