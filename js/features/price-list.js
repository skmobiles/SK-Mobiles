/* SK MOBILES v5.6.162 — Price list / catalogue: used mobiles in stock (customer price) and accessories with a price,
   shared as an image (WhatsApp share sheet), PDF, or plain text. Read-only over existing data. */
(function(){
'use strict';
function arr(k){try{var v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch(e){return[]}}
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function shop(k,d){return localStorage.getItem(k)||d}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
var useUsed=true,useAcc=true,mode='customer',showMore=true;

function data(){
  var pk=mode==='dealer'?'dealerPrice':'customerPrice';
  var used=useUsed?arr('sk_used_mobile_stock_v1').filter(function(r){return r&&r.status!=='Sold'&&num(r[pk])>0}).map(function(r){
    var extra=showMore?[r.kit,r.issue].filter(Boolean).join(' • '):'';
    return {name:r.model||'Used mobile',spec:[r.ram,r.storage,r.colour].filter(Boolean).join(' / '),extra:extra,price:num(r[pk])};
  }):[];
  var acc=useAcc?arr('sk_accessories_v1').filter(function(r){return r&&num(r.price)>0&&num(r.stock)>0}).map(function(r){
    return {name:r.name||'Accessory',spec:[r.brand&&r.brand!=='Universal'?r.brand:'',r.category].filter(Boolean).join(' • '),extra:'',price:num(r.price)};
  }):[];
  used.sort(function(a,b){return a.price-b.price});
  acc.sort(function(a,b){return a.name.localeCompare(b.name)});
  return {used:used,acc:acc};
}
function dateLabel(){var d=new Date();return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()}
function rowsHtml(list){
  return list.map(function(r){
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px dashed #e2e8f0"><div><div style="font-size:14px;font-weight:600;color:#0f172a">'+esc(r.name)+'</div>'+(r.spec?'<div style="font-size:11px;color:#64748b;margin-top:1px">'+esc(r.spec)+'</div>':'')+(r.extra?'<div style="font-size:11px;color:#94a3b8;margin-top:1px">'+esc(r.extra)+'</div>':'')+'</div><div style="font-weight:700;font-size:14px;white-space:nowrap;color:#0f172a">'+money(r.price)+'</div></div>';
  }).join('');
}
function sec(t){return '<div style="margin:14px 0 2px;font-size:13px;font-weight:700;color:#2563eb">'+t+'</div>'}
function cardHtml(){
  var d=data(),h='<div id="skPlCard" style="background:#fff;color:#0f172a;border:1px solid #dbe4f5;border-radius:16px;padding:18px;font-family:Inter,Arial,sans-serif"><div style="padding-bottom:10px;border-bottom:2px solid #2563eb;margin-bottom:4px"><div style="font-size:19px;font-weight:700;color:#1e3a8a">'+esc(shop('sk_shop_name','SK MOBILES'))+'</div><div style="font-size:12px;color:#64748b;margin-top:2px">Price List'+(mode==='dealer'?' (Dealer rates)':'')+' • '+dateLabel()+'</div></div>';
  if(d.used.length)h+=sec('📱 Used Mobiles')+rowsHtml(d.used);
  if(d.acc.length)h+=sec('🎧 Accessories')+rowsHtml(d.acc);
  if(!d.used.length&&!d.acc.length)h+='<div style="padding:24px 8px;text-align:center;color:#64748b;font-size:13px">No priced items in stock.<br><span style="font-size:11px">Used mobiles need a customer price; accessories need a price and stock.</span></div>';
  var ph=shop('sk_shop_phone','');
  h+='<div style="margin-top:14px;font-size:11px;color:#64748b;text-align:center">'+(ph?'📞 '+esc(ph)+' • ':'')+'Prices may change without notice</div></div>';
  return h;
}
function render(){
  var b=document.getElementById('skPlBody');if(b)b.innerHTML=cardHtml();
  var d=data(),n=d.used.length+d.acc.length;
  var c=document.getElementById('skPlCount');if(c)c.textContent=n+' items';
  var a=document.getElementById('skPlActions');if(a)a.style.display=n?'':'none';
}
function text(){
  var d=data(),t='*'+shop('sk_shop_name','SK MOBILES')+' — Price List* ('+dateLabel()+')\n';
  if(d.used.length){t+='\n📱 *Used Mobiles*\n';d.used.forEach(function(r){t+='• '+r.name+(r.spec?' ('+r.spec+')':'')+' — '+money(r.price)+(r.extra?' ['+r.extra+']':'')+'\n'})}
  if(d.acc.length){t+='\n🎧 *Accessories*\n';d.acc.forEach(function(r){t+='• '+r.name+(r.spec?' ('+r.spec+')':'')+' — '+money(r.price)+'\n'})}
  return t;
}
function offscreen(){
  var box=document.createElement('div');
  box.style.cssText='position:fixed;left:-9999px;top:0;width:520px;background:#fff';
  box.className='skpl-export';box.innerHTML=cardHtml();document.body.appendChild(box);return box;
}
function needLib(){
  if(typeof html2pdf!=='function'){toast('Export library not loaded (internet needed once). Try again.');return false}
  return true;
}
function saveBlob(blob,name,type){
  var file=null;try{file=new File([blob],name,{type:type})}catch(e){}
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
    return navigator.share({files:[file],title:'Price List'}).catch(function(){});
  }
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500);
  toast('✅ Downloaded');
}
window.skPlImage=function(){
  if(!needLib())return;
  var box=offscreen();
  html2pdf().set({html2canvas:{scale:2,backgroundColor:'#ffffff'}}).from(box).toCanvas().get('canvas').then(function(cv){
    cv.toBlob(function(b){box.remove();if(b)saveBlob(b,'SK_Price_List.png','image/png');else toast('❌ Could not create image')},'image/png');
  }).catch(function(){box.remove();toast('❌ Could not create image')});
};
window.skPlPdf=function(){
  if(!needLib())return;
  var box=offscreen();
  html2pdf().set({margin:8,filename:'SK_Price_List.pdf',image:{type:'jpeg',quality:.95},html2canvas:{scale:2,backgroundColor:'#ffffff'},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}})
    .from(box).outputPdf('blob').then(function(b){box.remove();saveBlob(b,'SK_Price_List.pdf','application/pdf')}).catch(function(){box.remove();toast('❌ PDF failed')});
};
window.skPlText=function(){window.open('https://wa.me/?text='+encodeURIComponent(text()),'_blank','noopener')};
window.skPlToggle=function(which,on){if(which==='used')useUsed=!!on;else if(which==='more')showMore=!!on;else useAcc=!!on;render()};
window.skPlMode=function(m){mode=m==='dealer'?'dealer':'customer';var a=document.querySelectorAll('#skPriceListModal .skpl-seg button');a.forEach(function(b){b.classList.toggle('on',b.dataset.m===mode)});render()};
function ensureModal(){
  if(document.getElementById('skPriceListModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skPriceListModal';
  el.innerHTML='<div class="modal-sheet skdr-sheet"><div class="modal-title"><span>🏷️ Price List</span><button class="modal-close-btn" onclick="toggleModal(\'skPriceListModal\',false)">✕</button></div>'+
   '<div class="skpl-seg"><button type="button" data-m="customer" class="on" onclick="skPlMode(\'customer\')">Customer price</button><button type="button" data-m="dealer" onclick="skPlMode(\'dealer\')">Dealer price</button></div>'+
   '<div class="skpl-opts"><label><input type="checkbox" checked onchange="skPlToggle(\'used\',this.checked)"> Used mobiles</label><label><input type="checkbox" checked onchange="skPlToggle(\'acc\',this.checked)"> Accessories</label><label><input type="checkbox" checked onchange="skPlToggle(\'more\',this.checked)"> Kit &amp; notes</label><em id="skPlCount"></em></div>'+
   '<div id="skPlBody"></div>'+
   '<div id="skPlActions"><div class="skdr-actions skdr-two"><button type="button" class="submit-btn whatsapp-green" onclick="skPlImage()">🖼️ Share image</button><button type="button" class="submit-btn" onclick="skPlPdf()">📄 PDF</button></div>'+
   '<div class="skdr-actions"><button type="button" class="submit-btn" onclick="skPlText()">💬 Send as text</button></div></div></div>';
  document.body.appendChild(el);
}
window.skOpenPriceList=function(){ensureModal();useUsed=true;useAcc=true;showMore=true;mode='customer';render();window.skPlMode('customer');if(typeof window.toggleModal==='function')window.toggleModal('skPriceListModal',true)};
function addDrawer(){
  var ref=document.getElementById('skDrCreditRange')||document.getElementById('skDrMonth');
  if(!ref||document.getElementById('skDrPriceList'))return;
  var b=document.createElement('button');b.className='menu-drawer-btn';b.id='skDrPriceList';b.type='button';b.setAttribute('onclick','skOpenPriceList(); toggleLeftDrawer(false);');
  b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg></span><span class="menu-btn-label">Price List</span><span class="menu-arrow">›</span>';
  ref.parentNode.insertBefore(b,ref.nextSibling);
}
function boot(){addDrawer();setTimeout(addDrawer,2200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
