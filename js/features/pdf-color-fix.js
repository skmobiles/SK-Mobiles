/* SK MOBILES V5.9.5 — fixes "Attempting to parse an unsupported color function 'color'" in PDF export.
   New Chrome versions report colours made with color-mix() as color(srgb …). The PDF library (html2canvas inside
   html2pdf 0.10.1) cannot read that format, so WhatsApp PDF / Download PDF / report PDFs failed.
   Just before a PDF is drawn, every such colour inside the area being printed is converted to plain rgba(),
   and the page background colour is given explicitly. Only the temporary PDF copy is touched; no data is read or written. */
(function(){
'use strict';
if(window.__skPdfColorFix)return;window.__skPdfColorFix=true;
var RX=/\b(?:color|oklch|oklab|lab|lch|hwb)\(/i;
var TOKEN=/\b(?:color|oklch|oklab|lab|lch|hwb)\((?:[^()]|\([^()]*\))*\)/gi;
var PROPS=['color','background-color','background-image','border-top-color','border-right-color','border-bottom-color','border-left-color','outline-color','box-shadow','text-shadow','text-decoration-color','column-rule-color','fill','stroke','caret-color','-webkit-text-fill-color','-webkit-text-stroke-color'];
var ctx=null;
function toRgb(c){
  try{
    if(!ctx){var cv=document.createElement('canvas');cv.width=cv.height=1;ctx=cv.getContext('2d',{willReadFrequently:true});}
    ctx.clearRect(0,0,1,1);ctx.fillStyle='rgba(0,0,0,0)';ctx.fillStyle=c;ctx.fillRect(0,0,1,1);
    var d=ctx.getImageData(0,0,1,1).data;return 'rgba('+d[0]+','+d[1]+','+d[2]+','+(Math.round(d[3]/255*1000)/1000)+')';
  }catch(e){return 'rgba(0,0,0,0)'}
}
function fix(v){return String(v).replace(TOKEN,function(m){return toRgb(m)})}
var seq=0;
function prepare(root,doc){
  doc=doc||document;var win=doc.defaultView||window;
  if(!root||!root.querySelectorAll||!root.isConnected)return;
  var css=[],els=[root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
  els.forEach(function(el){
    var cs=win.getComputedStyle(el);
    PROPS.forEach(function(p){var v=cs.getPropertyValue(p);if(v&&RX.test(v))el.style.setProperty(p,fix(v),'important');});
    ['::before','::after'].forEach(function(ps){
      var c2=win.getComputedStyle(el,ps);if(!c2||c2.content==='none'||c2.content==='normal')return;
      var rules=[];PROPS.forEach(function(p){var v=c2.getPropertyValue(p);if(v&&RX.test(v))rules.push(p+':'+fix(v)+' !important');});
      if(rules.length){if(!el.dataset.skPdf)el.dataset.skPdf=String(++seq);css.push('[data-sk-pdf="'+el.dataset.skPdf+'"]'+ps+'{'+rules.join(';')+'}');}
    });
  });
  if(css.length){var st=doc.createElement('style');st.setAttribute('data-sk-pdf-fix','1');st.textContent=css.join('\n');(doc.head||doc.documentElement).appendChild(st);if(doc===document)setTimeout(function(){st.remove()},120000);}
}
window.skPdfPrepare=prepare;
var KEEP_TAGS={HTML:1,HEAD:1,BODY:1,STYLE:1,LINK:1,META:1,TITLE:1,BASE:1};
function skPdfIgnore(el){
  try{
    if(!el||el.nodeType!==1||KEEP_TAGS[el.tagName])return false;
    var ov=el.ownerDocument&&el.ownerDocument.querySelector('.html2pdf__overlay');
    if(!ov)return false;
    if(el===ov||ov.contains(el)||el.contains(ov))return false;
    return true;
  }catch(e){return false}
}
window.skPdfIgnore=skPdfIgnore;
/* html2canvas also reads the background colour of the LIVE page (<html> and <body>), e.g. the "Subtle Slate" background.
   Give those two a plain rgba() for the time the PDF is being made, then put them back. */
var pageFixTimer=0,pageSaved=null;
function fixPage(){
  if(!pageSaved){pageSaved=[];[document.documentElement,document.body].forEach(function(el){if(!el)return;var cs=getComputedStyle(el);
    ['background-color','color'].forEach(function(p){var v=cs.getPropertyValue(p);if(v&&RX.test(v)){pageSaved.push([el,p,el.style.getPropertyValue(p),el.style.getPropertyPriority(p)]);el.style.setProperty(p,fix(v),'important');}});});}
  clearTimeout(pageFixTimer);pageFixTimer=setTimeout(restorePage,30000);
}
function restorePage(){if(!pageSaved)return;pageSaved.forEach(function(x){if(x[2])x[0].style.setProperty(x[1],x[2],x[3]);else x[0].style.removeProperty(x[1]);});pageSaved=null;}
window.skPdfFixPage=fixPage;
/* inside the copy of the page that html2canvas draws from: fix the root, body and the PDF container */
function cleanDoc(cd){
  var win=cd.defaultView;if(!win)return;
  [cd.documentElement,cd.body].forEach(function(el){if(!el)return;var cs=win.getComputedStyle(el);PROPS.forEach(function(p){var v=cs.getPropertyValue(p);if(v&&RX.test(v))el.style.setProperty(p,fix(v),'important')})});
  var root=cd.querySelector('.html2pdf__overlay')||cd.body;prepare(root,cd);
}
window.skPdfCleanDoc=cleanDoc;
function patch(){
  var H=window.html2pdf;if(typeof H!=='function'||H.__skPatched)return !!(H&&H.__skPatched);
  var wrapped=function(){
    var w=H.apply(this,arguments);
    if(w&&typeof w.from==='function'){var f=w.from;w.from=function(src){try{fixPage();if(src&&src.nodeType===1)prepare(src)}catch(e){}return f.apply(this,arguments)};}
    if(w&&typeof w.set==='function'){var s=w.set;w.set=function(o){try{fixPage();if(o&&typeof o==='object'){o.html2canvas=o.html2canvas||{};if(o.html2canvas.backgroundColor===undefined)o.html2canvas.backgroundColor='#ffffff';/* V5.9.8 speed: html2canvas copies the WHOLE app (all pages and popups) before drawing; on a phone that froze the app
   for many seconds. Only the PDF area (and the page head with its styles) is copied now. */
if(!o.html2canvas.ignoreElements)o.html2canvas.ignoreElements=skPdfIgnore;
var oc=o.html2canvas.onclone;o.html2canvas.onclone=function(cd){try{cleanDoc(cd)}catch(e){}if(typeof oc==='function')return oc.apply(this,arguments)};}}catch(e){}return s.apply(this,arguments)};}
    return w;
  };
  for(var k in H){try{wrapped[k]=H[k]}catch(e){}}
  try{var Wk=H.Worker;if(Wk&&Wk.prototype&&!Wk.prototype.__skFrom){var pf=Wk.prototype.from;Wk.prototype.from=function(src){try{fixPage();if(src&&src.nodeType===1)prepare(src)}catch(e){}return pf.apply(this,arguments)};Wk.prototype.__skFrom=1;}}catch(e){}
  wrapped.__skPatched=true;window.html2pdf=wrapped;return true;
}
if(!patch()){
  document.addEventListener('DOMContentLoaded',patch);window.addEventListener('load',patch);
  var n=0,t=setInterval(function(){if(patch()||++n>60)clearInterval(t)},500);
}
})();
