/* SK MOBILES v5.6.161 — Repair job photos (max 3, compressed ~25-40 KB each, saved inside the job).
   Photos are removed automatically 90 days after delivery (the job itself stays). Firebase Storage is paid-only,
   so the images are kept tiny and stored in the job record. */
(function(){
'use strict';
var MAX=3,DIM=640,KEY='skx_repair_jobs_v2',KEEP_MS=90*86400000;
var cur=[];
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}

function compress(file){
  return new Promise(function(res,rej){
    var url=URL.createObjectURL(file),img=new Image();
    img.onload=function(){
      try{
        var w=img.naturalWidth,h=img.naturalHeight,s=Math.min(1,DIM/Math.max(w,h));
        var cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(w*s));cv.height=Math.max(1,Math.round(h*s));
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
        var q=.62,out=cv.toDataURL('image/jpeg',q);
        while(out.length>60000&&q>.3){q-=.08;out=cv.toDataURL('image/jpeg',q)}
        URL.revokeObjectURL(url);res(out);
      }catch(e){URL.revokeObjectURL(url);rej(e)}
    };
    img.onerror=function(){URL.revokeObjectURL(url);rej(new Error('bad image'))};
    img.src=url;
  });
}
function drawThumbs(){
  var box=document.getElementById('skRjPhotoThumbs');if(!box)return;
  box.innerHTML=cur.map(function(src,i){
    return '<div class="skph-th"><img src="'+src+'" alt="Photo '+(i+1)+'" onclick="skPhView('+i+')"/><button type="button" aria-label="Remove photo" onclick="skPhDel('+i+')">✕</button></div>';
  }).join('');
  var add=document.getElementById('skRjPhotoAdd');if(add)add.style.display=cur.length>=MAX?'none':'';
  var c=document.getElementById('skRjPhotoCount');if(c)c.textContent=cur.length+'/'+MAX;
}
window.skPhDel=function(i){cur.splice(i,1);drawThumbs()};
window.skPhView=function(i,list){
  var arr=list||cur,src=arr[i];if(!src)return;
  var ov=document.createElement('div');ov.className='skph-view';
  ov.innerHTML='<img src="'+src+'" alt="Photo"/><button type="button" aria-label="Close">✕</button>';
  ov.onclick=function(){ov.remove()};document.body.appendChild(ov);
};
function inject(){
  if(document.getElementById('skRjPhotoWrap'))return;
  var note=document.getElementById('skRjNote');if(!note||!note.parentElement)return;
  var d=document.createElement('div');d.className='form-group';d.id='skRjPhotoWrap';
  d.innerHTML='<label class="form-label">Phone photos <span id="skRjPhotoCount" style="color:var(--text-muted,#64748b);font-weight:500">0/'+MAX+'</span></label>'+
    '<div class="skph-row"><div id="skRjPhotoThumbs" class="skph-thumbs"></div>'+
    '<label class="skph-add" id="skRjPhotoAdd"><input type="file" accept="image/*" capture="environment" id="skRjPhotoInput" style="display:none"/>'+
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg><span>Add photo</span></label></div>'+
    '<div class="skph-hint">Scratches / condition when received. Photos are compressed and removed 90 days after delivery.</div>';
  note.parentElement.parentElement.insertBefore(d,note.parentElement.nextSibling);
  document.getElementById('skRjPhotoInput').addEventListener('change',async function(e){
    var files=Array.prototype.slice.call(e.target.files||[]);e.target.value='';
    for(var i=0;i<files.length&&cur.length<MAX;i++){
      try{cur.push(await compress(files[i]))}catch(err){toast('Could not read that photo')}
    }
    drawThumbs();
  });
  drawThumbs();
}
function wrap(){
  if(typeof window.skRjSaveJob==='function'&&!window.skRjSaveJob.__ph){
    var o=window.skRjSaveJob,w=function(){window.__skRjPhotosNow=cur.slice();try{return o.apply(this,arguments)}finally{window.__skRjPhotosNow=null}};
    w.__ph=1;window.skRjSaveJob=w;
  }
  if(typeof window.skRjResetForm==='function'&&!window.skRjResetForm.__ph){
    var o2=window.skRjResetForm,w2=function(){cur=[];drawThumbs();return o2.apply(this,arguments)};
    w2.__ph=1;window.skRjResetForm=w2;
  }
  if(typeof window.skRjEdit==='function'&&!window.skRjEdit.__ph){
    var o3=window.skRjEdit,w3=function(id){
      var r=o3.apply(this,arguments);
      try{var j=JSON.parse(localStorage.getItem(KEY)||'[]').find(function(x){return x.id===id});cur=Array.isArray(j&&j.photos)?j.photos.slice(0,MAX):[];inject();drawThumbs()}catch(e){}
      return r;
    };
    w3.__ph=1;window.skRjEdit=w3;
  }
  if(typeof window.skRjShowDetail==='function'&&!window.skRjShowDetail.__ph){
    var o4=window.skRjShowDetail,w4=function(id){
      var r=o4.apply(this,arguments);
      try{
        var j=JSON.parse(localStorage.getItem(KEY)||'[]').find(function(x){return x.id===id});
        var root=document.querySelector('#skRepairDetailContent .rjd');
        if(j&&Array.isArray(j.photos)&&j.photos.length&&root){
          var g=document.createElement('div');g.className='skph-gallery';
          g.innerHTML='<small>PHOTOS</small><div>'+j.photos.map(function(s,i){return '<img src="'+s+'" alt="Photo '+(i+1)+'" data-i="'+i+'"/>'}).join('')+'</div>';
          g.addEventListener('click',function(e){var t=e.target.closest('img');if(t)window.skPhView(+t.dataset.i,j.photos)});
          var note=root.querySelector('.rjd-note');if(note)root.insertBefore(g,note);else root.appendChild(g);
        }
      }catch(e){}
      return r;
    };
    w4.__ph=1;window.skRjShowDetail=w4;
  }
}
/* remove photos of jobs delivered more than 90 days ago */
function cleanup(){
  try{
    var a=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(a))return;
    var now=Date.now(),changed=false;
    a.forEach(function(j){
      if(j&&j.status==='Delivered'&&Array.isArray(j.photos)&&j.photos.length){
        var t=Date.parse(j.deliveredAt||j.updatedAt||'');
        if(t&&now-t>KEEP_MS){j.photos=[];changed=true}
      }
    });
    if(changed)localStorage.setItem(KEY,JSON.stringify(a));
  }catch(e){}
}
window.__skPhCleanup=cleanup;
function boot(){inject();wrap();setTimeout(function(){inject();wrap()},1500);setTimeout(cleanup,8000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
