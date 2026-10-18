/* SK MOBILES v5.8.0 — Home extras: (1) choose your own 5 Quick Action buttons, (2) dark-mode button in the home header.
   Both are saved on this device only (skdev_ keys, not synced). No business data is read or written. */
(function(){
'use strict';
var T=window.skTools,PIN_KEY='skdev_quick_pins_v1';
var CAT=[
 ['bill','New Bill','file-plus','blue',"toggleModal('billingModal',true);switchBillTab('new');"],
 ['repair','New Repair','wrench','rose',"window.skOpenRepairJobs?.();"],
 ['cust','Add Customer','users','green',"window.skOpenCreditLedger?.();"],
 ['prod','Add Product','package-plus','purple',"openItemEditor();"],
 ['today','Today Report','chart','orange',"window.skOpenDailyReport?.();"],
 ['price','Price List','tag','green',"window.skOpenPriceList?.();"],
 ['review','Reviews','star','orange',"window.skOpenReviews?.();"],
 ['month','Monthly','chart','blue',"window.skOpenMonthReport?.();"],
 ['dealer','Dealers','handshake','rose',"window.skOpenDealerTracker?.();"],
 ['bulk','Bulk Msg','phone','green',"window.skOpenBulk?.();"],
 ['aging','Stock Aging','package','orange',"window.skOpenAging?.();"],
 ['backup','Backup','toolbox','purple',"window.skOpenBackup?.();"],
 ['used','Used Stock','package','purple',"window.skUsedOpen?.();window.skUsedShowManagement?.();"],
 ['usedinv','Used Inv.','phone','blue',"window.skUsedOpenInventoryPage?.();"],
 ['credit','Credit List','credit-card','rose',"window.skOpenCreditLedger?.();"],
 ['orders','Orders','package','blue',"toggleModal('orderModal',true);"],
 ['acc','Accessories','bolt','orange',"window.skOpenAccessoriesPage?.();"],
 ['glass','Tempered','shield','blue',"currentFilter='glass';renderCards();window.scrollTo({top:0,behavior:'smooth'});"],
 ['warranty','Warranty','shield','green',"window.skOpenWarranty?.();"],
 ['custs','Customers','users','purple',"window.skOpenCustomers?.();"]
];
var DEF=['bill','repair','cust','prod','today'];
function byId(id){for(var i=0;i<CAT.length;i++)if(CAT[i][0]===id)return CAT[i];return null}
function pins(){
  var v=null;try{v=JSON.parse(localStorage.getItem(PIN_KEY)||'null')}catch(e){}
  if(!Array.isArray(v))return DEF.slice();
  v=v.filter(function(x,i){return byId(x)&&v.indexOf(x)===i}).slice(0,5);
  return v.length===5?v:DEF.slice();
}
/* used by the home page template */
window.skQuickPinned=function(){return pins().map(function(id){var c=byId(id);return {icon:c[2],label:c[1],tone:c[3],action:c[4]}})};
var sel=[];
function paint(){
  var w=document.getElementById('skQpChips');if(!w)return;
  w.innerHTML=CAT.map(function(c){var on=sel.indexOf(c[0])>=0;
    return '<button type="button" class="skbk-chip sk-keepr'+(on?' on':'')+'" onclick="skQuickToggle(\''+c[0]+'\')">'+(on?'✓ ':'')+T.esc(c[1])+'</button>'}).join('');
  var n=document.getElementById('skQpCount');if(n)n.textContent=sel.length+' of 5 selected';
  var s=document.getElementById('skQpSave');if(s)s.disabled=sel.length!==5;
}
window.skQuickToggle=function(id){
  var i=sel.indexOf(id);
  if(i>=0)sel.splice(i,1);else{if(sel.length>=5){T.toast('Only 5 buttons — untick one first');return}sel.push(id)}
  paint();
};
window.skQuickEdit=function(){
  sel=pins();
  T.modal('skQuickPinModal','Quick Actions',
    '<div class="skpop-note">'+T.ic('info','blue')+'<span>Choose the <b>5 buttons</b> you use most. They appear in Quick Actions on the Home page.</span></div>'+
    '<div class="skbk-meta" id="skQpCount"></div><div class="skbk-chips" id="skQpChips"></div>'+
    '<div class="skpop-actions"><button type="button" class="submit-btn sk-keepr" id="skQpSave" onclick="skQuickSave()">Save</button>'+
    '<button type="button" class="submit-btn sk-keepr" style="background:transparent;color:var(--text);border:1px solid var(--card-border)" onclick="skQuickReset()">Reset to default</button></div>');
  paint();T.open('skQuickPinModal');
};
function refreshHome(){try{if(typeof window.renderCards==='function'&&typeof currentFilter!=='undefined'&&currentFilter==='home')window.renderCards()}catch(e){}}
window.skQuickSave=function(){
  if(sel.length!==5)return;
  try{localStorage.setItem(PIN_KEY,JSON.stringify(sel))}catch(e){}
  T.close('skQuickPinModal');T.toast('✅ Quick actions saved');refreshHome();
};
window.skQuickReset=function(){
  try{localStorage.removeItem(PIN_KEY)}catch(e){}
  T.close('skQuickPinModal');T.toast('Reset to default');refreshHome();
};
/* ---------- dark-mode button ---------- */
var MOON='<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',SUN='<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
function isDark(){try{return window.skAppearanceResolvedMode(window.skAppearanceRead())==='dark'}catch(e){return document.documentElement.getAttribute('data-theme')==='dark'}}
function paintDark(){var b=document.getElementById('skDarkBtn');if(!b)return;var d=isDark();b.querySelector('svg').innerHTML=d?SUN:MOON;b.setAttribute('aria-label',d?'Switch to light mode':'Switch to dark mode');b.title=d?'Light mode':'Dark mode'}
window.skToggleDark=function(){
  try{var st=window.skAppearanceRead();st.themeMode=isDark()?'light':'dark';window.skAppearanceApply(st,{theme:true})}catch(e){return}
  paintDark();
};
function addDark(){
  var box=document.querySelector('.sk-home-header-actions');if(!box||document.getElementById('skDarkBtn'))return;
  var b=document.createElement('button');b.id='skDarkBtn';b.type='button';b.className='sk-home-header-icon';b.setAttribute('onclick','skToggleDark()');
  b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"></svg>';box.insertBefore(b,box.firstChild);paintDark();
  new MutationObserver(paintDark).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
}
function boot(){addDark();setTimeout(addDark,1500);try{if(localStorage.getItem(PIN_KEY))setTimeout(refreshHome,400)}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
