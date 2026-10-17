/* SK MOBILES v5.6.155 — Bill WhatsApp popup, Customer history, Warranty tracker, Undo delete.
   Additive only: reads existing data; writes only warrantyDays/warrantyEnd on a bill and restores
   data the user explicitly undoes. Existing business logic is wrapped, never replaced. */
(function(){
'use strict';

/* ---------- helpers ---------- */
function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'');return v==null?f:v}catch(e){return f}}
function arr(k){var v=read(k,[]);return Array.isArray(v)?v:[]}
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function p2(n){return String(n).padStart(2,'0')}
function keyOf(d){return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function toKey(s){
  if(!s)return '';s=String(s).trim();var m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))return m[3]+'-'+p2(m[2])+'-'+p2(m[1]);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  var d=new Date(s);return isNaN(d)?'':keyOf(d);
}
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function nice(k){var m=String(k||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?m[3]+'-'+MON[+m[2]-1]+'-'+m[1]:String(k||'—')}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}
function tail10(p){var d=String(p||'').replace(/\D/g,'');return d.length>10?d.slice(-10):d}
function waNum(p){var d=tail10(p);return d.length===10?'91'+d:d}
function openWa(phone,text){window.open('https://wa.me/'+(phone?waNum(phone):'')+'?text='+encodeURIComponent(text),'_blank','noopener')}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function ensure(id,html){
  var el=document.getElementById(id);if(el)return el;
  el=document.createElement('div');el.className='modal-overlay';el.id=id;el.innerHTML=html;
  document.body.appendChild(el);return el;
}
function openModal(id){if(typeof window.toggleModal==='function')window.toggleModal(id,true)}
function daysBetween(aKey,bKey){
  var a=new Date(aKey+'T00:00:00'),b=new Date(bKey+'T00:00:00');return Math.round((b-a)/86400000);
}
function todayKey(){return keyOf(new Date())}

/* ============================================================
   WARRANTY
   ============================================================ */
var WAR=[[0,'No extra warranty'],[7,'7 Days'],[30,'1 Month'],[90,'3 Months'],[180,'6 Months'],[365,'1 Year']];
function warLabel(d){for(var i=0;i<WAR.length;i++)if(WAR[i][0]===+d)return WAR[i][1];return d+' Days'}
function addDays(key,d){var x=new Date(key+'T00:00:00');x.setDate(x.getDate()+d);return keyOf(x)}
function warEnd(b){
  var d=num(b&&b.warrantyDays);if(d<=0)return '';
  return b.warrantyEnd||addDays(toKey(b.date)||todayKey(),d);
}
window.skWarrantyLine=function(b){
  var d=num(b&&b.warrantyDays);if(d<=0)return '';
  var end=warEnd(b);
  return '\nWarranty: '+warLabel(d)+(end?' (valid till '+nice(end)+')':'');
};
function injectWarrantyField(){
  if(document.getElementById('billWarranty'))return;
  var pkg=document.getElementById('billPackage');if(!pkg)return;
  var anchor=pkg.parentElement;if(!anchor||!anchor.parentElement)return;
  var d=document.createElement('div');d.style.marginTop='8px';d.id='billWarrantyWrap';
  d.innerHTML='<label class="form-label">Warranty</label><select class="form-input" id="billWarranty" onchange="updateBillPreview()">'+
    WAR.map(function(w){return '<option value="'+w[0]+'">'+w[1]+'</option>'}).join('')+'</select>';
  anchor.parentElement.insertBefore(d,anchor.nextSibling);
}
function formWarranty(){var s=document.getElementById('billWarranty');return s?num(s.value):0}
function setBillWarranty(billId,days){
  try{
    var b=(typeof savedBills!=='undefined'?savedBills:[]).find(function(x){return x&&String(x.id)===String(billId)});
    if(!b)return;
    if(days>0){b.warrantyDays=days;b.warrantyEnd=addDays(toKey(b.date)||todayKey(),days)}
    else{delete b.warrantyDays;delete b.warrantyEnd}
    localStorage.setItem('sk_bills',JSON.stringify(savedBills));
  }catch(e){console.warn('warranty save skipped',e)}
}

/* ---- warranty tracker page ---- */
var warTab='soon';
function warRows(){
  var t=todayKey(),out=[];
  arr('sk_bills').forEach(function(b){
    var end=warEnd(b);if(!end)return;
    out.push({b:b,end:end,left:daysBetween(t,end)});
  });
  out.sort(function(a,b){return a.left-b.left});
  return out;
}
function renderWarranty(){
  var box=document.getElementById('skWarBody');if(!box)return;
  var rows=warRows();
  var soon=rows.filter(function(r){return r.left>=0&&r.left<=30}),
      active=rows.filter(function(r){return r.left>30}),
      done=rows.filter(function(r){return r.left<0}).reverse();
  var sets={soon:soon,active:active,done:done};
  var tabs=[['soon','Ending soon'],['active','Active'],['done','Expired']];
  var h='<div class="skw-tabs">'+tabs.map(function(t){
    return '<button type="button" class="skw-tab'+(warTab===t[0]?' on':'')+'" onclick="skWarTab(\''+t[0]+'\')">'+t[1]+' <b>'+sets[t[0]].length+'</b></button>'}).join('')+'</div>';
  var list=sets[warTab];
  if(!list.length)h+='<div class="skw-empty">'+(rows.length?'Nothing in this list':'Bills with warranty will appear here')+'</div>';
  list.forEach(function(r){
    var b=r.b,cls=r.left<0?'bad':r.left<=30?'warn':'ok';
    var tag=r.left<0?'Expired '+(-r.left)+' days ago':r.left===0?'Ends today':r.left+' days left';
    h+='<div class="skw-row"><div class="skw-main"><div class="skw-name">'+esc(b.custName||'Customer')+'</div>'+
      '<div class="skw-sub">'+esc([b.brand,b.model].filter(Boolean).join(' ')||'Mobile')+' • '+esc(warLabel(b.warrantyDays))+' • till '+esc(nice(r.end))+'</div></div>'+
      '<div class="skw-side"><span class="skw-chip '+cls+'">'+tag+'</span>'+
      (b.phone?'<button type="button" class="skw-wa" onclick="skWarRemind(\''+esc(b.id)+'\')" aria-label="WhatsApp">💬</button>':'')+'</div></div>';
  });
  box.innerHTML=h;
}
window.skWarTab=function(t){warTab=t;renderWarranty()};
window.skWarRemind=function(id){
  var b=arr('sk_bills').find(function(x){return String(x.id)===String(id)});if(!b)return;
  var end=warEnd(b),left=daysBetween(todayKey(),end);
  var item=[b.brand,b.model].filter(Boolean).join(' ')||'mobile';
  var msg=left>=0
    ?'Dear '+(b.custName||'Customer')+', your '+item+' warranty ('+warLabel(b.warrantyDays)+') ends on '+nice(end)+'. If you face any problem, please visit the shop. - '+shopName()
    :'Dear '+(b.custName||'Customer')+', your '+item+' warranty ended on '+nice(end)+'. For service/repair, please contact us. - '+shopName();
  openWa(b.phone,msg);
};
window.skOpenWarranty=function(){
  ensure('skWarrantyModal',
    '<div class="modal-sheet skw-sheet"><div class="modal-title"><span>🛡️ Warranty Tracker</span>'+
    '<button class="modal-close-btn" onclick="toggleModal(\'skWarrantyModal\',false)">✕</button></div><div id="skWarBody"></div></div>');
  renderWarranty();openModal('skWarrantyModal');
};

/* ============================================================
   BILL SAVED → WHATSAPP POPUP
   ============================================================ */
function billMessage(b){
  var item=[b.brand,b.model].filter(Boolean).join(' ')+(b.ram||b.storage?' ('+[b.ram,b.storage].filter(Boolean).join('/')+')':'');
  var cr=(b.payMode==='Credit'||b.payMode==='EMI');
  var L=['*'+shopName()+'*','Bill No: '+(b.billNo||b.id),'Date: '+(b.date||''),'Customer: '+(b.custName||''),'Item: '+item];
  if(b.imei1)L.push('IMEI: '+b.imei1);
  L.push('Total: '+money(b.price));
  if(cr){L.push('Advance: '+money(b.advance));L.push('Balance: '+money(b.balance))}
  L.push('Payment: '+(b.payMode||'Cash'));
  var w=window.skWarrantyLine(b).trim();if(w)L.push(w);
  L.push('','Thank you for shopping with us! 🙏');
  return L.join('\n');
}
function showBillPopup(b){
  var old=document.getElementById('skBillWaPop');if(old)old.remove();
  var el=document.createElement('div');el.id='skBillWaPop';el.className='skwp-overlay';
  var hasPhone=tail10(b.phone).length===10;
  el.innerHTML='<div class="skwp-card"><div class="skwp-ok">✅</div><h3>Bill saved</h3>'+
    '<p><b>'+esc(b.custName||'Customer')+'</b> • '+esc(money(b.price))+(hasPhone?'<br><span>📞 '+esc(tail10(b.phone))+'</span>':'<br><span>No phone number saved</span>')+'</p>'+
    '<button type="button" class="submit-btn whatsapp-green" id="skwpSend">💬 Send on WhatsApp</button>'+
    '<button type="button" class="skwp-skip" id="skwpSkip">Skip</button></div>';
  document.body.appendChild(el);
  el.addEventListener('click',function(e){if(e.target===el)el.remove()});
  document.getElementById('skwpSkip').onclick=function(){el.remove()};
  document.getElementById('skwpSend').onclick=function(){openWa(hasPhone?b.phone:'',billMessage(b));el.remove()};
}

/* ---- wrap saveUsedBill / editSavedBill ---- */
function wrapBilling(){
  if(typeof window.saveUsedBill==='function'&&!window.saveUsedBill.__sk151){
    var orig=window.saveUsedBill;
    var w=function(){
      var editId=String(window.__skEditingBillId||'');
      var firstBefore=arr('sk_bills')[0],firstId=firstBefore?String(firstBefore.id):'';
      var days=formWarranty();
      var r=orig.apply(this,arguments);
      try{
        if(editId){
          var still=(typeof savedBills!=='undefined'?savedBills:[]).some(function(x){return x&&String(x.id)===editId});
          if(still&&String(window.__skEditingBillId||'')==='')setBillWarranty(editId,days);
        }else{
          var nb=(typeof savedBills!=='undefined'?savedBills:[])[0];
          if(nb&&String(nb.id)!==firstId){
            setBillWarranty(nb.id,days);
            var sel=document.getElementById('billWarranty');if(sel)sel.value='0';
            if(typeof window.updateBillPreview==='function')window.updateBillPreview();
            showBillPopup(nb);
          }
        }
      }catch(e){console.warn('post-save hook skipped',e)}
      return r;
    };
    w.__sk151=1;window.saveUsedBill=w;
  }
  if(typeof window.updateBillPreview==='function'&&!window.updateBillPreview.__sk151){
    var op=window.updateBillPreview;
    var wp=function(){
      var r=op.apply(this,arguments);
      try{
        var t=document.getElementById('pvTerms');
        if(t&&!window.__skInvoiceExportBill&&typeof getMobileTerms==='function'&&typeof currentMobileType!=='undefined'){
          t.innerText=getMobileTerms(currentMobileType)+window.skWarrantyLine({warrantyDays:formWarranty(),date:''});
        }
      }catch(e){}
      return r;
    };
    wp.__sk151=1;window.updateBillPreview=wp;
  }
  if(typeof window.editSavedBill==='function'&&!window.editSavedBill.__sk151){
    var oe=window.editSavedBill;
    var we=function(idx){
      var r=oe.apply(this,arguments);
      try{
        var b=savedBills[idx];injectWarrantyField();
        var s=document.getElementById('billWarranty');if(s&&b){s.value=String(num(b.warrantyDays));
          if(typeof window.updateBillPreview==='function')window.updateBillPreview()}
      }catch(e){}
      return r;
    };
    we.__sk151=1;window.editSavedBill=we;
  }
}

/* ============================================================
   CUSTOMER HISTORY
   ============================================================ */
function custKey(name,phone){var p=tail10(phone);return p.length===10?'p'+p:'n'+String(name||'').trim().toLowerCase()}
function collectCustomers(){
  var map={};
  function get(name,phone){
    var k=custKey(name,phone);if(!String(name||'').trim()&&tail10(phone).length<10)return null;
    if(!map[k])map[k]={key:k,name:String(name||'').trim()||'Customer',phone:tail10(phone).length===10?tail10(phone):'',bills:[],jobs:[],bal:0};
    var c=map[k];if(!c.phone&&tail10(phone).length===10)c.phone=tail10(phone);
    if((c.name==='Customer')&&String(name||'').trim())c.name=String(name).trim();
    return c;
  }
  arr('sk_bills').forEach(function(b){var c=get(b.custName,b.phone);if(c)c.bills.push(b)});
  arr('skx_repair_jobs_v2').forEach(function(j){var c=get(j.customer,j.phone);if(c)c.jobs.push(j)});
  try{
    if(typeof window.skCPGetCustomers==='function'){
      window.skCPGetCustomers().forEach(function(cc){
        var c=get(cc.name,cc.phone);if(c)c.bal+=num(cc.balance);
      });
    }
  }catch(e){}
  return Object.keys(map).map(function(k){return map[k]});
}
var custList=[];
function renderCustList(q){
  var box=document.getElementById('skCuList');if(!box)return;
  q=String(q||'').trim().toLowerCase();
  var rows=custList.filter(function(c){return !q||c.name.toLowerCase().indexOf(q)>=0||c.phone.indexOf(q.replace(/\D/g,'')||'§')>=0});
  rows.sort(function(a,b){return b.bal-a.bal||a.name.localeCompare(b.name)});
  if(!rows.length){box.innerHTML='<div class="skw-empty">No customers found</div>';return}
  box.innerHTML=rows.slice(0,200).map(function(c){
    return '<div class="skcu-row" onclick="skCuOpen(\''+encodeURIComponent(c.key)+'\')"><span class="skcu-av">'+esc(c.name.charAt(0).toUpperCase())+'</span>'+
      '<div class="skcu-main"><div class="skcu-name">'+esc(c.name)+'</div><div class="skcu-sub">'+(c.phone?'📞 '+esc(c.phone)+' • ':'')+c.bills.length+' bills'+(c.jobs.length?' • '+c.jobs.length+' repairs':'')+'</div></div>'+
      (c.bal>0?'<span class="skcu-bal">'+money(c.bal)+'</span>':'')+'<span class="skcu-arr">›</span></div>';
  }).join('');
}
window.skCuSearch=function(v){renderCustList(v)};
window.skOpenCustomers=function(){
  custList=collectCustomers();
  ensure('skCustModal',
    '<div class="modal-sheet skcu-sheet"><div class="modal-title"><span>👥 Customers</span>'+
    '<button class="modal-close-btn" onclick="toggleModal(\'skCustModal\',false)">✕</button></div>'+
    '<input type="search" class="form-input skcu-search" id="skCuSearch" placeholder="Name / phone search..." oninput="skCuSearch(this.value)">'+
    '<div id="skCuList"></div><div id="skCuDetail" style="display:none"></div></div>');
  var s=document.getElementById('skCuSearch');if(s)s.value='';
  document.getElementById('skCuList').style.display='';document.getElementById('skCuSearch').style.display='';
  document.getElementById('skCuDetail').style.display='none';
  renderCustList('');openModal('skCustModal');
};
window.skCuBack=function(){
  document.getElementById('skCuDetail').style.display='none';
  document.getElementById('skCuList').style.display='';document.getElementById('skCuSearch').style.display='';
};
window.skCuOpen=function(enc){
  var key=decodeURIComponent(enc);
  var c=custList.find(function(x){return x.key===key});if(!c)return;
  var total=c.bills.reduce(function(a,b){return a+num(b.price)},0);
  var t=todayKey();
  var h='<button type="button" class="skcu-back" onclick="skCuBack()">‹ Back</button>'+
    '<div class="skcu-head"><span class="skcu-av big">'+esc(c.name.charAt(0).toUpperCase())+'</span><div><div class="skcu-name big">'+esc(c.name)+'</div><div class="skcu-sub">'+(c.phone?'📞 '+esc(c.phone):'No phone')+'</div></div></div>'+
    (c.phone?'<div class="skcu-actions"><a class="skcu-act call" href="tel:+91'+esc(c.phone)+'">📞 Call</a><button type="button" class="skcu-act wa" onclick="skCuWa(\''+encodeURIComponent(c.key)+'\')">💬 WhatsApp</button></div>':'')+
    '<div class="skcu-stats"><div class="s1"><b>'+c.bills.length+'</b><small>Bills</small></div><div class="s2"><b>'+money(total)+'</b><small>Purchases</small></div>'+
    '<div class="s3"><b>'+money(c.bal)+'</b><small>Credit balance</small></div><div class="s4"><b>'+c.jobs.length+'</b><small>Repairs</small></div></div>';
  h+='<h4 class="skcu-h">🧾 Bills</h4>';
  if(!c.bills.length)h+='<div class="skw-empty">No bills</div>';
  c.bills.slice().sort(function(a,b){return toKey(b.date)<toKey(a.date)?-1:1}).forEach(function(b){
    var w=warEnd(b),wl=w?daysBetween(t,w):null;
    h+='<div class="skcu-item"><div><b>'+esc([b.brand,b.model].filter(Boolean).join(' ')||'Mobile')+'</b><small>#'+esc(b.billNo||b.id)+' • '+esc(b.date||'')+' • '+esc(b.payMode||'Cash')+
      (w?' • 🛡️ '+(wl>=0?wl+'d left':'expired'):'')+'</small></div><span>'+money(b.price)+(num(b.balance)>0?'<em>Bal '+money(b.balance)+'</em>':'')+'</span></div>';
  });
  h+='<h4 class="skcu-h">🔧 Repairs</h4>';
  if(!c.jobs.length)h+='<div class="skw-empty">No repairs</div>';
  c.jobs.slice().sort(function(a,b){return String(b.createdAt||b.date||'')<String(a.createdAt||a.date||'')?-1:1}).forEach(function(j){
    h+='<div class="skcu-item"><div><b>'+esc(j.model||'Device')+'</b><small>'+esc(j.status||'Received')+' • '+esc(nice(toKey(j.createdAt||j.date)))+(j.problem?' • '+esc(j.problem):'')+'</small></div><span>'+money(num(j.estimate)-num(j.discountAmount))+'</span></div>';
  });
  document.getElementById('skCuList').style.display='none';document.getElementById('skCuSearch').style.display='none';
  var d=document.getElementById('skCuDetail');d.innerHTML=h;d.style.display='block';d.scrollTop=0;
};
window.skCuWa=function(enc){
  var key=decodeURIComponent(enc),c=custList.find(function(x){return x.key===key});if(!c)return;
  openWa(c.phone,'Hello '+c.name+', '+shopName()+' - ');
};
/* tapping the customer name on a bill-history card opens that customer's history */
document.addEventListener('click',function(e){
  var n=e.target.closest&&e.target.closest('#billHistoryView .bill-history-name');
  if(!n)return;
  var card=n.closest('.bill-history-card');if(!card)return;
  var txt=n.textContent||'',nm=txt.replace(/\s*\(.*\)\s*$/,'').trim();
  var bill=arr('sk_bills').find(function(b){return String(b.custName||'').trim()===nm});
  if(!bill)return;
  e.stopPropagation();e.preventDefault();
  window.skOpenCustomers();window.skCuOpen(encodeURIComponent(custKey(bill.custName,bill.phone)));
},true);

/* ============================================================
   UNDO DELETE
   ============================================================ */
var undoTimer=0;
function snapshot(){
  var o={};try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);o[k]=localStorage.getItem(k)}}catch(e){}
  return o;
}
var SKIP_UNDO=/^(bk_status_v1|sk_current_|sk_bill_draft)/;
function changedKeys(before){
  var now=snapshot(),out=[],k;
  for(k in before)if(!SKIP_UNDO.test(k)&&now[k]!==before[k])out.push(k);
  for(k in now)if(!SKIP_UNDO.test(k)&&!(k in before))out.push(k);
  return out;
}
function hideUndo(){var b=document.getElementById('skUndoBar');if(b)b.remove();clearTimeout(undoTimer)}
function offerUndo(before,label){
  var keys=changedKeys(before);if(!keys.length)return;
  hideUndo();
  var bar=document.createElement('div');bar.id='skUndoBar';bar.className='skun-bar';
  bar.innerHTML='<span>🗑️ '+esc(label)+' deleted</span><button type="button">↩ Undo</button>';
  document.body.appendChild(bar);
  bar.querySelector('button').onclick=function(){doUndo(before,keys,label)};
  undoTimer=setTimeout(hideUndo,10000);
}
function rerender(){
  ['renderBillHistory','updateBillHistoryCount','skRjRenderJobs','skRjRenderHistory','skRjRenderHomeMetric','skCPRender','skUsedRender','skRenderAccessories','renderCards','updateBillPreview'].forEach(function(n){
    try{if(typeof window[n]==='function')window[n]()}catch(e){}
  });
}
function doUndo(before,keys,label){
  hideUndo();
  try{
    var billsBefore=[];try{billsBefore=JSON.parse(before.sk_bills||'[]')}catch(e){}
    keys.forEach(function(k){
      if(before[k]==null)localStorage.removeItem(k);else localStorage.setItem(k,before[k]);
    });
    try{if(typeof savedBills!=='undefined'&&Array.isArray(billsBefore)&&keys.indexOf('sk_bills')>=0)savedBills=billsBefore}catch(e){}
    /* un-delete the cloud copy of restored bills */
    try{
      if(keys.indexOf('sk_bills')>=0&&window.firebase&&firebase.auth&&firebase.auth().currentUser&&firebase.firestore){
        var col=firebase.firestore().collection('shops').doc('SK-MOBILES').collection('bills');
        billsBefore.forEach(function(b){
          if(b&&b.id)col.doc(String(b.id)).set({isDeleted:false,_deleted:false,deletedAt:null,_syncUpdatedAt:Date.now()},{merge:true}).catch(function(){});
        });
      }
    }catch(e){}
    rerender();
    toast('↩️ '+label+' restored');
  }catch(e){console.warn('undo failed',e);toast('❌ Undo failed')}
}
function wrapUndo(name,label){
  var f=window[name];if(typeof f!=='function'||f.__sk151u)return;
  var w=function(){
    var before=snapshot(),r=f.apply(this,arguments);
    Promise.resolve(r).then(function(){setTimeout(function(){offerUndo(before,label)},80)});
    return r;
  };
  w.__sk151u=1;window[name]=w;
}
function wrapAll(){
  wrapBilling();
  wrapUndo('deleteBillSafely','Bill');
  wrapUndo('skRjDelete','Repair job');
  wrapUndo('skCPDeleteCustomer','Customer');
  wrapUndo('skUsedDelete','Used mobile');
  wrapUndo('skDeleteSelectedAccessories','Accessories');
  wrapUndo('deleteInventoryItem','Item');
}

/* ---------- drawer items + boot ---------- */
function addDrawerItems(){
  var ref=document.querySelector('.menu-drawer-btn[onclick*="skOpenDailyReport"]');if(!ref||document.getElementById('skDrCust'))return;
  function mk(id,label,fn,svg){
    var b=document.createElement('button');b.className='menu-drawer-btn';b.id=id;b.type='button';
    b.setAttribute('onclick',fn+'(); toggleLeftDrawer(false);');
    b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24">'+svg+'</svg></span><span class="menu-btn-label">'+label+'</span><span class="menu-arrow">›</span>';
    return b;
  }
  var c=mk('skDrCust','Customers','skOpenCustomers','<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>');
  var w=mk('skDrWar','Warranty','skOpenWarranty','<path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>');
  ref.parentNode.insertBefore(c,ref.nextSibling);ref.parentNode.insertBefore(w,c.nextSibling);
}
function boot(){injectWarrantyField();addDrawerItems();wrapAll();setTimeout(wrapAll,1500);setTimeout(function(){injectWarrantyField();addDrawerItems()},1500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
