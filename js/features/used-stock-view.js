/* SK MOBILES v5.7.0 — Used Mobile register view switch: All / In stock / Sold.
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
}
function boot(){inject();if(window.__skUsedView!=='all'&&typeof window.skUsedRender==='function')setTimeout(function(){try{window.skUsedRender()}catch(e){}},300)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
