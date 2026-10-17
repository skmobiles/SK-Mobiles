/* SK MOBILES v5.6.163 — Price list / catalogue: used mobiles in stock (customer price) and accessories with a price,
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

/* ---- Drawing: the list is painted straight onto a canvas (no library, works offline, same for preview / image / PDF) ---- */
var W=1080,PAD=48,PAGE_H=1528,FONT='Inter, Arial, sans-serif';
function f(w,px){return w+' '+px+'px '+FONT}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function wrap(g,t,maxW,font){
  g.font=font;var words=String(t).split(/\s+/),lines=[],cur='';
  words.forEach(function(w){var tr=cur?cur+' '+w:w;if(g.measureText(tr).width<=maxW||!cur)cur=tr;else{lines.push(cur);cur=w}});
  if(cur)lines.push(cur);return lines;
}
function shopLines(){
  var a=shop('sk_shop_addr','').split(/\n+/).map(function(x){return x.trim()}).filter(Boolean).join(', ');
  return {name:shop('sk_shop_name','SK MOBILES'),addr:a,phone:shop('sk_shop_phone','')};
}
function makeItems(g,d){
  var items=[],ROW_PAD=18,PILL_PAD=20;
  function section(title,n,color){
    items.push({h:84,keep:true,draw:function(c,y){
      c.fillStyle=color;rr(c,PAD,y+18,10,44,5);c.fill();
      c.fillStyle='#0f172a';c.font=f(700,34);c.textBaseline='middle';c.textAlign='left';c.fillText(title,PAD+26,y+41);
      var tw=c.measureText(title).width;c.font=f(600,24);c.fillStyle='#64748b';c.fillText(n+(n===1?' item':' items'),PAD+26+tw+18,y+43);
    }});
  }
  function row(r,i){
    var priceTxt=money(r.price);g.font=f(800,32);
    var pillW=Math.ceil(g.measureText(priceTxt).width)+PILL_PAD*2,textW=W-PAD*2-ROW_PAD*2-pillW-20;
    var nm=wrap(g,r.name,textW,f(700,30)),sp=r.spec?wrap(g,r.spec,textW,f(500,23)):[],ex=r.extra?wrap(g,r.extra,textW,f(500,21)):[];
    var h=ROW_PAD*2+nm.length*38+sp.length*30+ex.length*28;if(h<84)h=84;
    items.push({h:h+14,draw:function(c,y){
      c.fillStyle=i%2?'#f8fafc':'#ffffff';rr(c,PAD,y,W-PAD*2,h,18);c.fill();
      c.strokeStyle='#e2e8f0';c.lineWidth=2;rr(c,PAD+1,y+1,W-PAD*2-2,h-2,18);c.stroke();
      var ty=y+ROW_PAD;c.textAlign='left';c.textBaseline='top';
      c.fillStyle='#0f172a';c.font=f(700,30);nm.forEach(function(t){c.fillText(t,PAD+ROW_PAD,ty+4);ty+=38});
      c.fillStyle='#64748b';c.font=f(500,23);sp.forEach(function(t){c.fillText(t,PAD+ROW_PAD,ty+2);ty+=30});
      c.fillStyle='#94a3b8';c.font=f(500,21);ex.forEach(function(t){c.fillText(t,PAD+ROW_PAD,ty+2);ty+=28});
      var px=W-PAD-ROW_PAD-pillW,ph=58,py=y+(h-ph)/2;
      c.fillStyle='#e8f0ff';rr(c,px,py,pillW,ph,32);c.fill();
      c.fillStyle='#1d4ed8';c.font=f(800,32);c.textAlign='center';c.textBaseline='middle';c.fillText(priceTxt,px+pillW/2,py+ph/2+2);
    }});
  }
  if(d.used.length){section('Used Mobiles',d.used.length,'#2563eb');d.used.forEach(row)}
  if(d.acc.length){section('Accessories',d.acc.length,'#16a34a');d.acc.forEach(row)}
  if(!items.length)items.push({h:220,draw:function(c,y){
    c.fillStyle='#64748b';c.font=f(600,30);c.textAlign='center';c.textBaseline='middle';
    c.fillText('No priced items in stock',W/2,y+80);c.font=f(500,24);c.fillText('Used mobiles need a customer price; accessories need a price and stock.',W/2,y+124)}});
  return items;
}
function drawHead(c,first){
  var s=shopLines(),h=first?(s.addr||s.phone?236:200):104;
  var gr=c.createLinearGradient(0,0,W,h);gr.addColorStop(0,'#1e3a8a');gr.addColorStop(1,'#2563eb');
  c.fillStyle=gr;c.fillRect(0,0,W,h);
  c.fillStyle='rgba(255,255,255,.08)';c.beginPath();c.arc(W-60,0,200,0,7);c.fill();
  c.textAlign='left';c.textBaseline='alphabetic';c.fillStyle='#fff';
  if(first){
    c.font=f(800,54);c.fillText(s.name.toUpperCase(),PAD,86);
    c.font=f(600,26);c.fillStyle='#bfdbfe';c.fillText('PRICE LIST'+(mode==='dealer'?'  •  DEALER RATES':''),PAD,134);
    c.textAlign='right';c.font=f(600,26);c.fillStyle='#fff';c.fillText(dateLabel(),W-PAD,134);
    var line=[s.phone,s.addr].filter(Boolean).join('   |   ');
    if(line){c.textAlign='left';c.font=f(500,22);c.fillStyle='#dbeafe';var ls=wrap(c,line,W-PAD*2,f(500,22));c.fillText(ls[0]+(ls.length>1?'…':''),PAD,186)}
  }else{
    c.font=f(800,34);c.fillText(s.name.toUpperCase(),PAD,62);
    c.textAlign='right';c.font=f(600,24);c.fillStyle='#bfdbfe';c.fillText('Price List • '+dateLabel(),W-PAD,62);
  }
  return h;
}
var FOOT_H=120;
function drawFoot(c,top,pg,total){
  var s=shopLines();
  c.strokeStyle='#e2e8f0';c.lineWidth=2;c.beginPath();c.moveTo(PAD,top+10);c.lineTo(W-PAD,top+10);c.stroke();
  c.textBaseline='alphabetic';c.textAlign='center';c.fillStyle='#0f172a';c.font=f(700,28);
  c.fillText(s.phone?'Call / WhatsApp: '+s.phone:s.name,W/2,top+52);
  c.fillStyle='#94a3b8';c.font=f(500,22);c.fillText('Prices may change without notice'+(total>1?'   •   Page '+pg+' of '+total:''),W/2,top+88);
}
/* paged=false -> one tall image; paged=true -> A4 pages for the PDF */
function build(paged){
  var d=data(),m=document.createElement('canvas').getContext('2d'),items=makeItems(m,d),pages=[],cur=[],y,headH;
  function startPage(first){cur=[];pages.push({items:cur,first:first});headH=first?(shopLines().addr||shopLines().phone?236:200):104;y=headH+22}
  startPage(true);
  items.forEach(function(it,i){
    var need=it.h+(it.keep&&items[i+1]?items[i+1].h:0);
    if(paged&&cur.length&&y+need>PAGE_H-FOOT_H)startPage(false);
    cur.push({it:it,y:y});y+=it.h;
  });
  var total=pages.length;
  return pages.map(function(pg,n){
    var cv=document.createElement('canvas');cv.width=W;
    var last=pg.items[pg.items.length-1],end=last?last.y+last.it.h:300;
    cv.height=paged?PAGE_H:Math.ceil(end+FOOT_H+10);
    var c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,W,cv.height);
    drawHead(c,pg.first);
    pg.items.forEach(function(p){p.it.draw(c,p.y)});
    drawFoot(c,cv.height-FOOT_H,n+1,total);
    return cv;
  });
}
function render(){
  var d=data(),n=d.used.length+d.acc.length;
  var b=document.getElementById('skPlBody');
  if(b){var cv=build(false)[0];b.innerHTML='';var im=new Image();im.alt='Price list preview';im.src=cv.toDataURL('image/jpeg',.9);im.style.cssText='width:100%;height:auto;display:block;border-radius:14px;border:1px solid #dbe4f5';b.appendChild(im)}
  var c=document.getElementById('skPlCount');if(c)c.textContent=n+' items';
  var a=document.getElementById('skPlActions');if(a)a.style.display=n?'':'none';
}
/* ---- Tiny PDF writer: one full-page JPEG per A4 page ---- */
function b64bytes(u){var s=atob(u.split(',')[1]),a=new Uint8Array(s.length);for(var i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a}
function makePdf(cvs){
  var enc=new TextEncoder(),parts=[],pos=0,offs=[];
  function put(x){var b=typeof x==='string'?enc.encode(x):x;parts.push(b);pos+=b.length}
  function obj(n,body){offs[n]=pos;put(n+' 0 obj\n'+body+'\nendobj\n')}
  put('%PDF-1.4\n');
  var kids=cvs.map(function(_,i){return(3+i*3)+' 0 R'}).join(' ');
  obj(1,'<< /Type /Catalog /Pages 2 0 R >>');
  obj(2,'<< /Type /Pages /Kids ['+kids+'] /Count '+cvs.length+' >>');
  cvs.forEach(function(cv,i){
    var pn=3+i*3,jpg=b64bytes(cv.toDataURL('image/jpeg',.92)),content='q 595.28 0 0 841.89 0 0 cm /Im0 Do Q';
    obj(pn,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 '+(pn+2)+' 0 R >> >> /Contents '+(pn+1)+' 0 R >>');
    obj(pn+1,'<< /Length '+content.length+' >>\nstream\n'+content+'\nendstream');
    offs[pn+2]=pos;put((pn+2)+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+cv.width+' /Height '+cv.height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpg.length+' >>\nstream\n');put(jpg);put('\nendstream\nendobj\n');
  });
  var cnt=3+cvs.length*3,xr=pos;
  put('xref\n0 '+cnt+'\n0000000000 65535 f \n');
  for(var i=1;i<cnt;i++)put(String(offs[i]).padStart(10,'0')+' 00000 n \n');
  put('trailer\n<< /Size '+cnt+' /Root 1 0 R >>\nstartxref\n'+xr+'\n%%EOF');
  return new Blob(parts,{type:'application/pdf'});
}
function text(){
  var d=data(),t='*'+shop('sk_shop_name','SK MOBILES')+' — Price List* ('+dateLabel()+')\n';
  if(d.used.length){t+='\n📱 *Used Mobiles*\n';d.used.forEach(function(r){t+='• '+r.name+(r.spec?' ('+r.spec+')':'')+' — '+money(r.price)+(r.extra?' ['+r.extra+']':'')+'\n'})}
  if(d.acc.length){t+='\n🎧 *Accessories*\n';d.acc.forEach(function(r){t+='• '+r.name+(r.spec?' ('+r.spec+')':'')+' — '+money(r.price)+'\n'})}
  return t;
}
function saveBlob(blob,name,type){
  var file=null;try{file=new File([blob],name,{type:type})}catch(e){}
  function dl(){
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500);toast('✅ Downloaded');
  }
  if(file&&navigator.canShare&&navigator.canShare({files:[file]})&&navigator.share){
    return navigator.share({files:[file],title:'Price List'}).catch(function(e){if(!e||e.name!=='AbortError')dl()});
  }
  dl();
}
window.skPlImage=function(){
  try{build(false)[0].toBlob(function(b){if(b)saveBlob(b,'SK_Price_List.png','image/png');else toast('❌ Could not create image')},'image/png')}
  catch(e){toast('❌ Could not create image')}
};
window.skPlPdf=function(){
  try{saveBlob(makePdf(build(true)),'SK_Price_List.pdf','application/pdf')}catch(e){toast('❌ PDF failed')}
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
