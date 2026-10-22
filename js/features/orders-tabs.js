/* V5.11.58: Orders popup has 3 tabs - Orders | Repair Spares | Tools & Others - and the Orders tab can take a manual order note.
   The three pages keep their own design; the same tab strip is shown on top of each and a tap switches to that page. */
(function(){
'use strict';
var TABS=[['repairSparesModal','🧰','Repair Spares'],['orderModal','📦','Orders'],['toolsOthersNoteModal','🛠️','Tools & Others']];
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function go(from,to){
  if(from===to)return;
  try{window.toggleModal(from,false)}catch(e){}
  try{window.toggleModal(to,true)}catch(e){}
}
window.skOtGo=go;
function strip(cur){
  return '<div class="skot-tabs" role="tablist">'+TABS.map(function(t){
    return '<button type="button" role="tab" class="skot-tab'+(t[0]===cur?' active':'')+'" aria-selected="'+(t[0]===cur)+'" onclick="skOtGo(\''+cur+'\',\''+t[0]+'\')"><span aria-hidden="true">'+t[1]+'</span><b>'+esc(t[2])+'</b></button>';
  }).join('')+'</div>';
}
function inject(){
  TABS.forEach(function(t){
    var m=$(t[0]);if(!m||m.querySelector('.skot-tabs'))return;
    var sheet=m.querySelector('.modal-sheet');if(!sheet)return;
    var head=sheet.querySelector('.modal-title,.repair-spares-head,.tools-others-head');
    var div=document.createElement('div');div.innerHTML=strip(t[0]);var bar=div.firstChild;
    if(head&&head.parentNode===sheet)head.insertAdjacentElement('afterend',bar);else sheet.insertBefore(bar,sheet.firstChild);
  });
  var om=$('orderModal');
  if(om&&!$('skOtManual')){
    var search=$('orderSearchInput'),anchor=search&&search.parentElement;
    var box=document.createElement('div');box.id='skOtManual';box.className='skot-manual';
    box.innerHTML='<div class="skot-mlabel">✍️ Add an order note manually</div>'+
      '<div class="skot-mrow"><input id="skOtName" class="form-input" type="text" autocomplete="off" maxlength="120" placeholder="Item / note (e.g. Charger cable - Type C)"><input id="skOtQty" class="form-input" type="number" inputmode="numeric" min="1" value="1" aria-label="Quantity"><button type="button" class="skot-add" onclick="skOtAddManual()">+ Add</button></div>';
    if(anchor)anchor.insertAdjacentElement('beforebegin',box);
    var nm=$('skOtName');if(nm)nm.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();window.skOtAddManual()}});
  }
}
window.skOtAddManual=function(){
  var role=String(localStorage.getItem('sk_current_role_v1')||'').toLowerCase();
  if(role==='manager'){try{var p=JSON.parse(localStorage.getItem('sk_manager_permissions_v1')||'{}');if(p.orders!==true){if(window.showToast)showToast('🔒 Admin permission required');return}}catch(e){}}
  var n=$('skOtName'),q=$('skOtQty');if(!n)return;
  var title=String(n.value||'').trim(),qty=Math.max(1,parseInt(q&&q.value,10)||1);
  if(!title){if(window.showToast)showToast('Type the item / note first');n.focus();return}
  if(typeof ordersList==='undefined'||!Array.isArray(ordersList))return;
  var id='M-'+(window.skUid?window.skUid():Date.now()+'-'+Math.random().toString(36).slice(2,6));
  ordersList.push({id:id,title:title,qty:qty,reason:'Manual note',manual:true});
  try{if(typeof saveOrders==='function')saveOrders();else localStorage.setItem('sk_orders',JSON.stringify(ordersList))}catch(e){}
  n.value='';if(q)q.value='1';
  try{window.renderOrders&&window.renderOrders()}catch(e){}
  if(window.showToast)showToast('Added to the order list');
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
