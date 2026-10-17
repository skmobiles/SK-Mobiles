/* SK MOBILES v5.6.157 — IMEI / serial barcode scanner.
   Adds a camera button inside every IMEI field. Uses the phone's built-in BarcodeDetector (Chrome Android);
   falls back to the ZXing library (loaded on first use) when BarcodeDetector is not available.
   Only fills the field the user tapped; no stored data is touched. */
(function(){
'use strict';
var IDS=['billImei1','billImei2','billExchImei','skUsedImei'];
var ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 9v6M10 9v6M13 9v6M16 9v6"/></svg>';
var ZX_URL='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
var FORMATS=['code_128','code_39','code_93','ean_13','ean_8','itf','codabar','upc_a','upc_e','data_matrix','qr_code'];
var st=null; /* running scanner state */

function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function luhn(d){var s=0,alt=false;for(var i=d.length-1;i>=0;i--){var n=+d[i];if(alt){n*=2;if(n>9)n-=9}s+=n;alt=!alt}return s%10===0}
/* IMEI candidates inside one decoded text */
function imeis(raw){
  var out=[],t=String(raw||'');
  var m=t.match(/\d{15}/g)||[];
  m.forEach(function(x){if(out.indexOf(x)<0)out.push(x)});
  return out;
}

function fill(input,val){
  input.value=val;
  ['input','change'].forEach(function(ev){try{input.dispatchEvent(new Event(ev,{bubbles:true}))}catch(e){}});
}

/* decide what to do with decoded texts; returns true when finished */
function handle(texts){
  if(!st)return true;
  var input=st.input,isSerialOk=(input.id==='skUsedImei');
  var all=[];texts.forEach(function(t){imeis(t).forEach(function(x){if(all.indexOf(x)<0)all.push(x)})});
  var good=all.filter(luhn);
  var pick=good[0]||null;
  if(!pick&&all[0]){ /* 15 digits but failing the check digit: accept once seen twice */
    st.seen=st.seen||{};st.seen[all[0]]=(st.seen[all[0]]||0)+1;
    if(st.seen[all[0]]>=2)pick=all[0];
  }
  if(!pick&&isSerialOk){
    for(var i=0;i<texts.length;i++){
      var s=String(texts[i]||'').trim();
      if(/^[A-Za-z0-9\-]{8,24}$/.test(s)){st.seenS=st.seenS||{};st.seenS[s]=(st.seenS[s]||0)+1;if(st.seenS[s]>=2){pick=s;break}}
    }
  }
  if(!pick)return false;
  fill(input,pick);
  if(input.id==='billImei1'){
    var second=(good.length>1?good:all).filter(function(x){return x!==pick})[0];
    var i2=document.getElementById('billImei2');
    if(second&&i2&&!i2.value)fill(i2,second);
  }
  try{if(navigator.vibrate)navigator.vibrate(60)}catch(e){}
  toast('✅ Scanned: '+pick);
  close();
  return true;
}

function close(){
  if(!st)return;
  var s=st;st=null;
  s.stopped=true;clearTimeout(s.timer);
  try{if(s.reader&&s.reader.reset)s.reader.reset()}catch(e){}
  try{if(s.stream)s.stream.getTracks().forEach(function(t){t.stop()})}catch(e){}
  if(s.overlay)s.overlay.remove();
  document.removeEventListener('keydown',onKey);
}
function onKey(e){if(e.key==='Escape')close()}

function loadZxing(){
  return new Promise(function(res,rej){
    if(window.ZXing)return res(window.ZXing);
    var sc=document.createElement('script');sc.src=ZX_URL;sc.onload=function(){window.ZXing?res(window.ZXing):rej(new Error('zxing'))};
    sc.onerror=function(){rej(new Error('zxing load'))};document.head.appendChild(sc);
  });
}

async function start(input){
  if(st)close();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){toast('Camera is not supported in this browser. Please type the IMEI.');return}
  var ov=document.createElement('div');ov.id='skScanOverlay';ov.className='sk-scan-overlay';
  ov.innerHTML='<video playsinline muted autoplay></video><div class="sk-scan-frame"><i></i></div>'+
    '<div class="sk-scan-top"><b>Scan IMEI barcode</b><button type="button" class="sk-scan-x" aria-label="Close">✕</button></div>'+
    '<div class="sk-scan-hint">Place the barcode inside the frame • phone box or *#06#</div>'+
    '<button type="button" class="sk-scan-torch" style="display:none">🔦 Light</button>';
  document.body.appendChild(ov);
  st={input:input,overlay:ov};
  var me=st;
  ov.querySelector('.sk-scan-x').onclick=close;
  document.addEventListener('keydown',onKey);
  var video=ov.querySelector('video');
  try{
    me.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    if(me.stopped){me.stream.getTracks().forEach(function(t){t.stop()});return}
    video.srcObject=me.stream;await video.play();
  }catch(e){
    close();
    toast(e&&e.name==='NotAllowedError'?'Please allow camera permission (Settings → Site permissions)':'Could not open the camera');return;
  }
  /* torch */
  try{
    var tr=me.stream.getVideoTracks()[0],cap=tr.getCapabilities&&tr.getCapabilities();
    if(cap&&cap.torch){var tb=ov.querySelector('.sk-scan-torch'),on=false;tb.style.display='';
      tb.onclick=function(){on=!on;tr.applyConstraints({advanced:[{torch:on}]}).catch(function(){})}}
  }catch(e){}
  /* detector */
  if(window.BarcodeDetector){
    var det;
    try{var sup=await window.BarcodeDetector.getSupportedFormats();var f=FORMATS.filter(function(x){return sup.indexOf(x)>=0});det=new window.BarcodeDetector(f.length?{formats:f}:undefined)}
    catch(e){try{det=new window.BarcodeDetector()}catch(e2){det=null}}
    if(det){
      var tick=async function(){
        if(me.stopped)return;
        try{
          if(video.readyState>=2){var r=await det.detect(video);if(r&&r.length&&handle(r.map(function(x){return x.rawValue})))return}
        }catch(e){}
        if(!me.stopped)me.timer=setTimeout(tick,130);
      };
      tick();return;
    }
  }
  /* fallback: ZXing */
  try{
    var Z=await loadZxing();if(me.stopped)return;
    me.reader=new Z.BrowserMultiFormatReader();
    me.reader.decodeFromVideoElementContinuously(video,function(result){
      if(result&&!me.stopped)handle([result.getText()]);
    });
  }catch(e){close();toast('Scanner could not load (check internet). Please type the IMEI.')}
}

/* ---------- install buttons ---------- */
function install(){
  IDS.forEach(function(id){
    var input=document.getElementById(id);
    if(!input||input.dataset.skScan==='1')return;
    input.dataset.skScan='1';
    var wrap=document.createElement('span');wrap.className='sk-scan-wrap';
    input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
    var b=document.createElement('button');b.type='button';b.className='sk-scan-btn';
    b.setAttribute('aria-label','Scan IMEI barcode');b.title='Scan IMEI barcode';b.innerHTML=ICON;
    b.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();start(input)});
    wrap.appendChild(b);
  });
}
function boot(){
  install();
  try{new MutationObserver(function(){install()}).observe(document.body,{childList:true,subtree:true})}catch(e){}
}
window.skScanImei=function(id){var i=document.getElementById(id);if(i)start(i)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
