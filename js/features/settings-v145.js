/* SK Mobiles v5.8.2 — small helpers for the redesigned Settings + Tools notes.
   Presentation / convenience only. */
(function(){
  'use strict';
  function $(id){return document.getElementById(id);}
  window.skStClear=function(btn){
    var w=btn&&btn.closest('.st-input-wrap');var i=w&&w.querySelector('input,textarea');
    if(!i)return;i.value='';i.focus();
    try{i.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
  };
  window.skStOpenWhatsApp=function(){
    var raw=String(($('cfgShopPhone')||{}).value||'').replace(/\D/g,'');
    if(raw.length===12&&raw.indexOf('91')===0)raw=raw.slice(2);
    if(raw.length!==10){if(typeof showToast==='function')showToast('Enter a valid 10 digit phone number');return;}
    window.open('https://wa.me/91'+raw,'_blank','noopener');
  };
  /* Tools & Others notes */
  window.skToolsCount=function(){
    var t=$('toolsOthersNoteInput'),c=$('toolsOthersCount');if(!t||!c)return;
    c.textContent=t.value.length+' / 2000';
  };
  window.skToolsAdd=function(line){
    var t=$('toolsOthersNoteInput');if(!t)return;
    var cur=String(t.value||'').replace(/\s+$/,'');
    var n=cur?cur.split('\n').filter(function(x){return x.trim();}).length+1:1;
    var next=(cur?cur+'\n':'')+n+'. '+line;
    if(next.length>2000){if(typeof showToast==='function')showToast('Note is full (2000 characters)');return;}
    t.value=next;window.skToolsCount();t.scrollTop=t.scrollHeight;
    if(typeof showToast==='function')showToast('Added: '+line);
  };
  window.skToolsTemplates=function(){
    var q=$('toolsOthersQuick');if(!q)return;
    q.scrollIntoView({behavior:'smooth',block:'center'});
    q.classList.add('st-flash');setTimeout(function(){q.classList.remove('st-flash');},900);
  };
  function watch(){
    var m=$('toolsOthersNoteModal');
    if(m&&window.MutationObserver){
      new MutationObserver(function(){if(m.classList.contains('active'))setTimeout(window.skToolsCount,30);}).observe(m,{attributes:true,attributeFilter:['class']});
    }
    window.skToolsCount();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();

/* V5.8.3: keep the live preview just under the sticky settings title */
(function(){
  function place(){try{var pv=document.getElementById('skLivePreview');if(!pv)return;var t=pv.parentElement.querySelector('.modal-title');if(!t)return;var z=parseFloat(getComputedStyle(document.documentElement).zoom)||1;pv.style.top=Math.max(0,Math.round(t.getBoundingClientRect().height/z)-2)+'px';}catch(e){}}
  function init(){place();var pv=document.getElementById('skLivePreview');if(!pv)return;var t=pv.parentElement.querySelector('.modal-title');try{if(window.ResizeObserver&&t)new ResizeObserver(place).observe(t);}catch(e){}window.addEventListener('resize',place);var m=document.getElementById('settingsModal');if(m&&window.MutationObserver)new MutationObserver(place).observe(m,{attributes:true,attributeFilter:['class']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
