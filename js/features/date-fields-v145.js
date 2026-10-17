/* SK Mobiles v5.6.151 — date fields: normal keyboard + calendar icon in right corner.
   Presentation/input helper only. Typed values still use the existing DD/MM/YYYY logic. */
(function(){
  'use strict';
  var SEL='input[data-dmy-date],input#billEmiStartDate,input#billCreditDate,input#skRjDate,input#skCPDate,input#skCPDueDate,input[name="date"][placeholder*="DD/MM"],input[name="dueDate"][placeholder*="DD/MM"]';
  var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
  function iso(v){try{return typeof window.skDmyToISO==='function'?window.skDmyToISO(v):''}catch(e){return ''}}
  function dmy(v){try{return typeof window.skISOToDmy==='function'?window.skISOToDmy(v):v}catch(e){return v}}
  function today(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
  function fire(el,t){try{el.dispatchEvent(new Event(t,{bubbles:true}))}catch(e){}}
  function enhance(input){
    if(!input||input.dataset.skDateIcon==='1'||input.type==='hidden')return;
    input.dataset.skDateIcon='1';
    input.setAttribute('inputmode','text');input.inputMode='text';input.setAttribute('autocomplete','off');
    var wrap=document.createElement('span');wrap.className='sk-date-wrap';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    var btn=document.createElement('button');btn.type='button';btn.className='sk-date-btn';btn.setAttribute('aria-label','Open calendar');btn.innerHTML=ICON;
    var pick=document.createElement('input');pick.type='date';pick.className='sk-date-native';pick.tabIndex=-1;pick.setAttribute('aria-hidden','true');
    wrap.appendChild(btn);wrap.appendChild(pick);
    btn.addEventListener('click',function(ev){
      ev.preventDefault();ev.stopPropagation();
      pick.value=iso(input.value)||today();
      try{if(typeof pick.showPicker==='function'){pick.showPicker();return}}catch(e){}
      try{pick.focus();pick.click()}catch(e){}
    });
    pick.addEventListener('change',function(){
      if(!pick.value)return;
      input.value=dmy(pick.value);
      fire(input,'input');fire(input,'change');fire(input,'blur');
    });
  }
  function scan(root){(root||document).querySelectorAll(SEL).forEach(enhance)}
  function boot(){
    scan(document);
    try{new MutationObserver(function(muts){
      for(var i=0;i<muts.length;i++){var n=muts[i].addedNodes;for(var j=0;j<n.length;j++){var el=n[j];if(el.nodeType===1){if(el.matches&&el.matches(SEL))enhance(el);else if(el.querySelectorAll)scan(el)}}}
    }).observe(document.body,{childList:true,subtree:true})}catch(e){}
  }
  window.skEnhanceDateFields=scan;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
