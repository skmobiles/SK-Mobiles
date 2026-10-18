/* SK MOBILES v5.8.1 — Customer purchase-history QR. The QR holds a link to /view.html plus a small, compressed summary of the
   customer's latest bills (inside the link itself). The customer scans it with the phone camera and sees their bills in a clean page.
   Nothing is uploaded anywhere: the data lives only inside the QR / link you give that customer. */
(function(){
'use strict';
var T=window.skTools,esc=T.esc,cur=null;
function b64u(bytes){var s='',i;for(i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function utf8(str){return new TextEncoder().encode(str)}
async function pack(obj){
  var raw=utf8(JSON.stringify(obj));
  if(typeof CompressionStream==='function'){
    try{var cs=new CompressionStream('deflate-raw'),buf=await new Response(new Blob([raw]).stream().pipeThrough(cs)).arrayBuffer();return 'z'+b64u(new Uint8Array(buf))}catch(e){}
  }
  return 'p'+b64u(raw);
}
function short(d){d=T.parseDate(d);return d?T.p2(d.getDate())+'/'+T.p2(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(-2):''}
function dataFor(c,n){
  var bl=(c.bills||[]).map(function(x){return x.b}).filter(Boolean).slice().sort(function(a,b){var da=T.parseDate(a.date),db=T.parseDate(b.date);return (db?db.getTime():0)-(da?da.getTime():0)}).slice(0,n);
  return {v:1,s:T.shop('sk_shop_name','SK Mobiles'),sp:T.shop('sk_shop_phone',''),n:c.name,t:Math.round(T.num(c.balance)),u:short(new Date()),
    b:bl.map(function(b){return [short(b.date),[b.brand,b.model].filter(Boolean).join(' ').slice(0,30)||'Item',Math.round(T.num(b.price)),Math.round(T.num(b.balance))]})};
}
async function build(c){
  var base=location.origin+'/view.html#',n=Math.min(15,(c.bills||[]).length);
  for(;n>=0;n--){
    var url=base+await pack(dataFor(c,n));
    if(window.skQrMatrix&&window.skQrMatrix(url))return {url:url,count:n,total:(c.bills||[]).length};
  }
  return null;
}
function findCust(fn){var cs=[];try{cs=window.skCPGetCustomers()}catch(e){}return cs.filter(fn)[0]||null}
window.skQrOpen=async function(kind){
  var c=null;
  if(kind==='ledger'){var w=window.skCmLedgerWho&&window.skCmLedgerWho();if(w){var wp=T.digits10(w.phone),wn=String(w.name).trim().toLowerCase();c=findCust(function(x){return String(x.name).trim().toLowerCase()===wn&&T.digits10(x.phone)===wp})}}
  else{var ck=String(window.__skCuKey||''),p=ck.charAt(0)==='p'?ck.slice(1):'';c=findCust(function(x){return p?T.digits10(x.phone)===p:('n'+String(x.name).trim().toLowerCase())===ck})}
  if(!c){T.toast('Customer not found');return}
  var r=await build(c);if(!r){T.toast('Could not build the QR');return}
  cur={c:c,r:r};
  var img=window.skQrDataUrl(r.url,640);
  T.modal('skQrModal','Customer QR',
    '<div class="skpop-note">'+T.ic('info','purple')+'<span>The customer scans this QR with the phone camera and sees their bills. Nothing is uploaded — the details are inside the QR.</span></div>'+
    '<div class="skqr-box"><b>'+esc(c.name)+'</b><img alt="QR code" src="'+img+'"><small>'+(r.total?'Shows the latest '+r.count+' of '+r.total+' bills':'No bills yet — the page will show the balance only')+(r.count<r.total?' (QR size limit)':'')+'</small></div>'+
    '<div class="skpop-actions"><button type="button" class="submit-btn whatsapp-green sk-keepr" onclick="skQrShare()">📤 Share QR</button><button type="button" class="submit-btn sk-keepr" onclick="skQrCopy()">🔗 Copy link</button></div>');
  T.open('skQrModal');
};
function card(){
  var cv=document.createElement('canvas'),W=720,H=900;cv.width=W;cv.height=H;var g=cv.getContext('2d');
  g.fillStyle='#fff';g.fillRect(0,0,W,H);
  var gr=g.createLinearGradient(0,0,W,0);gr.addColorStop(0,'#1e3a8a');gr.addColorStop(1,'#2563eb');g.fillStyle=gr;g.fillRect(0,0,W,150);
  g.fillStyle='#fff';g.textAlign='center';g.font='800 44px Inter, Arial, sans-serif';g.fillText(T.shop('sk_shop_name','SK Mobiles').toUpperCase(),W/2,78);
  g.font='600 24px Inter, Arial, sans-serif';g.fillStyle='#bfdbfe';g.fillText('Your bill history',W/2,118);
  var im=new Image();im.src=window.skQrDataUrl(cur.r.url,640);
  return new Promise(function(res){im.onload=function(){
    g.drawImage(im,(W-560)/2,190,560,560);
    g.fillStyle='#0f172a';g.font='800 36px Inter, Arial, sans-serif';g.fillText(cur.c.name,W/2,800);
    g.fillStyle='#64748b';g.font='500 24px Inter, Arial, sans-serif';g.fillText('Scan with your phone camera',W/2,845);
    cv.toBlob(res,'image/png')}});
}
window.skQrShare=async function(){
  if(!cur)return;var b=await card();if(!b){T.toast('❌ Could not create image');return}
  var name='QR_'+String(cur.c.name).replace(/[^\w]+/g,'_')+'.png',f=null;try{f=new File([b],name,{type:'image/png'})}catch(e){}
  if(f&&navigator.canShare&&navigator.canShare({files:[f]})&&navigator.share){navigator.share({files:[f],title:'Bill history QR'}).catch(function(e){if(!e||e.name!=='AbortError')dl(b,name)});return}
  dl(b,name);
};
function dl(b,name){var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500);T.toast('✅ Downloaded')}
window.skQrCopy=function(){
  if(!cur)return;
  try{navigator.clipboard.writeText(cur.r.url).then(function(){T.toast('✅ Link copied')},function(){T.toast('Could not copy')})}catch(e){T.toast('Could not copy')}
};
/* buttons on the ledger page and the Customers detail */
function inject(){
  var h=document.querySelector('#skCreditLedgerPage.active .skcp-page-head');
  if(h&&!(h.nextElementSibling&&h.nextElementSibling.classList.contains('skqr-row'))&&!h.parentNode.querySelector('.skqr-row')){
    var r=document.createElement('div');r.className='skqr-row';r.innerHTML='<button type="button" class="skcm-btn sk-keepr" onclick="skQrOpen(\'ledger\')">🔲 Customer QR</button>';
    h.parentNode.insertBefore(r,h.nextSibling);
  }
  var row=document.querySelector('#skCuDetail .skcm-row');
  if(row&&!row.querySelector('.skqr-btn')){var b=document.createElement('button');b.type='button';b.className='skcm-btn skqr-btn sk-keepr';b.setAttribute('onclick',"skQrOpen('cu')");b.innerHTML='🔲 QR';row.appendChild(b)}
}
function boot(){var raf=0;new MutationObserver(function(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;inject()})}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style']})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
