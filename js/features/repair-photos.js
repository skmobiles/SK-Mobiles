/* SK MOBILES V5.11.49 — Repair job photos were removed (they made the data too large to sync and back up).
   This file only cleans up: it removes the photo box from the form / job views and, once, deletes the photos
   stored inside repair jobs and inside Recycle Bin copies of repair jobs. */
(function(){
'use strict';
var KEY='skx_repair_jobs_v2',BIN='sk_recycle_bin_v1',DONE='sk_photos_removed_v5_11_49';
window.skPhClear=function(){};
function strip(list,stamp){
  var changed=false;
  if(!Array.isArray(list))return false;
  list.forEach(function(j){
    if(j&&typeof j==='object'){
      if('photos' in j){delete j.photos;if(stamp)j.updatedAt=new Date().toISOString();changed=true}
      if(j.data&&typeof j.data==='object'&&'photos' in j.data){delete j.data.photos;changed=true}
    }
  });
  return changed;
}
function clean(){
  try{
    if(localStorage.getItem(DONE))return;
    var jobs=JSON.parse(localStorage.getItem(KEY)||'null');
    if(Array.isArray(jobs)&&strip(jobs,true))localStorage.setItem(KEY,JSON.stringify(jobs));
    var bin=JSON.parse(localStorage.getItem(BIN)||'null');
    if(Array.isArray(bin)&&strip(bin))localStorage.setItem(BIN,JSON.stringify(bin));
    localStorage.setItem(DONE,'1');
  }catch(e){}
}
function hideBox(){
  var s=document.createElement('style');
  s.textContent='.skph-row,.skph-gallery,#skRjPhotoAdd,#skRjPhotoCount,#skRjPhotoWrap,[id^="skRjPhoto"]{display:none!important}';
  document.head.appendChild(s);
}
hideBox();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(clean,1500)});else setTimeout(clean,1500);
})();
