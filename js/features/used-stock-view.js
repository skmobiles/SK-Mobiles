/* SK MOBILES v5.6.166 — Used Mobile register view switch: All / In stock / Sold.
   The filtering itself is in skUsedRender (window.__skUsedView); this adds the chips. The choice is remembered for the session only. */
(function(){
'use strict';
function get(){try{return sessionStorage.getItem('skUsedView')||'all'}catch(e){return 'all'}}
function put(v){try{sessionStorage.setItem('skUsedView',v)}catch(e){}}
window.__skUsedView=get();
window.skUsedSetView=function(v){
  window.__skUsedView=v;put(v);
  document.querySelectorAll('#skUsedViewChips button').forEach(function(b){b.classList.toggle('on',b.dataset.v===v)});
  if(typeof window.skUsedRender==='function')window.skUsedRender();
};
function inject(){
  var row=document.querySelector('#skUsedRegisterPanel .sk-used-search-row');
  if(!row||document.getElementById('skUsedViewChips'))return;
  var d=document.createElement('div');d.id='skUsedViewChips';d.className='sk-used-view-chips';
  d.innerHTML=[['all','All'],['stock','In stock'],['sold','Sold']].map(function(x){
    return '<button type="button" data-v="'+x[0]+'" class="'+(get()===x[0]?'on':'')+'" onclick="skUsedSetView(\''+x[0]+'\')">'+x[1]+'</button>';
  }).join('');
  row.parentNode.insertBefore(d,row.nextSibling);
  /* v5.6.166: search + All/In stock/Sold sit right above the purchase action buttons */
  var acts=document.getElementById('skUsedPurchaseActions');
  if(acts&&!document.getElementById('skUsedFindBar')){
    var f=document.createElement('section');f.id='skUsedFindBar';f.className='sk-used-findbar';
    acts.parentNode.insertBefore(f,acts);f.appendChild(row);f.appendChild(d);
  }
}
function boot(){inject();if(window.__skUsedView!=='all'&&typeof window.skUsedRender==='function')setTimeout(function(){try{window.skUsedRender()}catch(e){}},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
