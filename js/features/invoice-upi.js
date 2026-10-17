/* SK MOBILES v5.6.157 — UPI "Scan & Pay" QR on the invoice (Settings → Shop Profile → UPI ID).
   Needs js/features/qr-mini.js. Shows only when a UPI ID is saved. */
(function(){
'use strict';
var K_UPI='sk_shop_upi',K_MODE='sk_upi_qr_mode';
function ls(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
function num(v){v=Number(v);return isFinite(v)?v:0}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function shop(){return ls('sk_shop_name')||'SK MOBILES'}
function validUpi(v){return /^[\w.\-]{2,}@[A-Za-z][\w.\-]{1,}$/.test(String(v||'').trim())}

function ensureBlock(){
  var b=document.getElementById('pvUpiBlock');if(b)return b;
  var terms=document.getElementById('pvTerms');if(!terms||!terms.parentElement)return null;
  b=document.createElement('div');b.id='pvUpiBlock';
  b.style.cssText='display:none;align-items:center;gap:12px;border:1px solid #cbd5e1;border-radius:12px;padding:8px 10px;margin:0 0 12px;background:#f8fafc;page-break-inside:avoid;break-inside:avoid;';
  b.innerHTML='<img id="pvUpiQr" alt="UPI QR" style="width:92px;height:92px;flex:0 0 92px;background:#fff;border-radius:6px"/>'+
    '<div style="font-size:.72rem;line-height:1.45;color:#334155"><div style="font-weight:700;font-size:.8rem;color:#0f172a">Scan &amp; Pay</div>'+
    '<div id="pvUpiAmt" style="font-weight:700;color:#15803d;font-size:.9rem"></div><div id="pvUpiId" style="word-break:break-all"></div>'+
    '<div style="color:#64748b">GPay • PhonePe • Paytm • any UPI app</div></div>';
  terms.parentElement.parentElement.insertBefore(b,terms.parentElement);
  return b;
}
/* info: {price, advance, balance, payMode, billNo} */
function refresh(info){
  var b=ensureBlock();if(!b)return;
  var upi=ls(K_UPI).trim(),mode=ls(K_MODE)||'due';
  var price=num(info&&info.price),bal=num(info&&info.balance);
  var credit=info&&(info.payMode==='Credit'||info.payMode==='EMI');
  if(!credit)bal=0;
  var show=validUpi(upi)&&mode!=='off'&&price>0&&(mode==='always'||bal>0);
  if(!show||typeof window.skQrDataUrl!=='function'){b.style.display='none';return}
  var amt=bal>0?bal:price;
  var uri='upi://pay?pa='+encodeURIComponent(upi).replace(/%40/g,'@')+'&pn='+encodeURIComponent(shop())+'&am='+amt.toFixed(2)+'&cu=INR'+
    (info.billNo?'&tn='+encodeURIComponent('Bill '+info.billNo):'');
  var img=document.getElementById('pvUpiQr');
  try{img.src=window.skQrDataUrl(uri,260)}catch(e){b.style.display='none';return}
  document.getElementById('pvUpiAmt').textContent=(bal>0?'Balance due ':'Amount ')+money(amt);
  document.getElementById('pvUpiId').textContent='UPI: '+upi;
  b.style.display='flex';
}
window.skUpiRefresh=refresh;

function liveInfo(){
  var g=function(id){var e=document.getElementById(id);return e?e.value:''};
  var price=typeof window.skBillNetPrice==='function'?window.skBillNetPrice():num(g('billTotalPrice')),adv=num(g('billAdvance'));
  var pm=(typeof currentPayMode!=='undefined')?currentPayMode:'Cash';
  var no=(document.getElementById('pvBillNo')||{}).innerText||'';
  return {price:price,advance:adv,balance:Math.max(0,price-adv),payMode:pm,billNo:String(no).trim()};
}
function wrap(){
  if(typeof window.updateBillPreview==='function'&&!window.updateBillPreview.__upi){
    var o=window.updateBillPreview,w=function(){var r=o.apply(this,arguments);try{if(!window.__skInvoiceExportBill)refresh(liveInfo())}catch(e){}return r};
    w.__upi=1;window.updateBillPreview=w;
  }
  if(typeof window.renderSavedBillToLiveInvoicePreview==='function'&&!window.renderSavedBillToLiveInvoicePreview.__upi){
    var o2=window.renderSavedBillToLiveInvoicePreview,w2=function(b){var r=o2.apply(this,arguments);try{refresh(b||{})}catch(e){}return r};
    w2.__upi=1;window.renderSavedBillToLiveInvoicePreview=w2;
  }
}

/* ---- Settings fields ---- */
function injectSettings(){
  if(document.getElementById('cfgShopUpi'))return;
  var gst=document.getElementById('cfgShopGst');if(!gst)return;
  var field=gst.closest('.st-field');if(!field||!field.parentElement)return;
  var d=document.createElement('div');d.className='st-field';d.id='skUpiField';
  d.innerHTML='<span class="st-tile sm c-green"><svg class="st-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v.01M14 21h3M21 17v4"/></svg></span>'+
   '<div class="st-field-body"><label class="st-flabel">UPI ID (QR on bills)</label><div class="st-input-wrap"><input class="form-input" id="cfgShopUpi" type="text" placeholder="shopname@okaxis" autocapitalize="off" autocomplete="off"/></div>'+
   '<select class="form-input" id="cfgUpiMode" style="margin-top:6px"><option value="due">Show QR when balance is due</option><option value="always">Always show QR</option><option value="off">Do not show QR</option></select></div>';
  field.parentElement.insertBefore(d,field.nextSibling);
  var i=document.getElementById('cfgShopUpi'),m=document.getElementById('cfgUpiMode');
  function load(){i.value=ls(K_UPI);m.value=ls(K_MODE)||'due'}
  load();
  i.addEventListener('change',function(){
    var v=i.value.trim();
    if(v&&!validUpi(v)){if(typeof window.showToast==='function')window.showToast('Enter a valid UPI ID, e.g. shopname@okaxis');return}
    try{localStorage.setItem(K_UPI,v)}catch(e){}
    if(typeof window.showToast==='function')window.showToast(v?'UPI ID saved':'UPI ID removed');
    if(typeof window.updateBillPreview==='function')window.updateBillPreview();
  });
  m.addEventListener('change',function(){try{localStorage.setItem(K_MODE,m.value)}catch(e){}if(typeof window.updateBillPreview==='function')window.updateBillPreview()});
  var s=document.getElementById('settingsModal');
  if(s&&window.MutationObserver)new MutationObserver(function(){if(s.classList.contains('active'))load()}).observe(s,{attributes:true,attributeFilter:['class']});
}
function boot(){ensureBlock();injectSettings();wrap();setTimeout(function(){wrap();ensureBlock();injectSettings()},1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
