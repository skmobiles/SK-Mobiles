/* SK MOBILES v5.8.2 — Dealer payment tracker.
   Bought = used-mobile purchases (dealer + purchase price) + repair spare-part purchases (dealer + amount).
   Paid   = payments entered here (key skx_dealer_payments_v1, synced like every other skx_ key).
   Purchases are treated as already paid; only ones marked "Pay later" count as owed. Balance = credit purchases - Paid. Only purchases on/after the "count from" date are included, so old, already-settled
   purchases do not show up as pending. */
(function(){
'use strict';
var CRED_KEY='skx_dealer_credit_v1',PAY_KEY='skx_dealer_payments_v1',START_KEY='skx_dealer_start_v1',ENT_KEY='skx_dealer_entries_v1',USED_KEY='sk_used_mobile_stock_v1',REP_KEY='skx_repair_jobs_v2';
function read(k,f){try{var v=JSON.parse(localStorage.getItem(k)||'');return v==null?f:v}catch(e){return f}}
function arr(k){var v=read(k,[]);return Array.isArray(v)?v:[]}
function num(v){v=Number(v);return isFinite(v)?v:0}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function money(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function p2(n){return String(n).padStart(2,'0')}
function toKey(s){
  if(!s)return '';s=String(s).trim();var m;
  if((m=s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)))return m[3]+'-'+p2(m[2])+'-'+p2(m[1]);
  if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
  var d=new Date(s);return isNaN(d)?'':d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());
}
function today(){var d=new Date();return d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate())}
function fmt(k){var a=String(k).split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0]:String(k||'')}
function toast(t){if(typeof window.showToast==='function')window.showToast(t)}
function startKey(){var s=localStorage.getItem(START_KEY);return s||(today().slice(0,8)+'01')}
function shopName(){return localStorage.getItem('sk_shop_name')||'SK MOBILES'}

function credSet(){var v=read(CRED_KEY,{});return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}
/* V5.11.51: spare purchases of repair jobs delivered more than 10 days ago are hidden (unless marked Pay later) */
function oldDelivered(j){
  if(String(j.status||'')!=='Delivered')return false;
  var t=Date.parse(j.deliveredAt||j.updatedAt||j.date||'');if(isNaN(t))return false;
  return (Date.now()-t)/86400000>10;
}
function compute(){
  var start=startKey(),map={},cs=credSet(),ents=arr(ENT_KEY);
  function get(name){
    var n=String(name||'').trim();if(!n)return null;
    var k=n.toLowerCase();if(!map[k])map[k]={name:n,bought:0,credit:0,paid:0,old:0,ret:0,buys:[],pays:[],olds:[],rets:[]};return map[k];
  }
  var retBy={};ents.forEach(function(e){if(e.type==='return'&&e.refId)retBy[e.refId]=e});
  arr(USED_KEY).forEach(function(r){
    if(r.exchange)return;var d=get(r.dealer);if(!d)return;var dt=toKey(r.date);
    if(dt&&dt<start)return;
    var id='u:'+(r.imei||r.id||dt+num(r.cost)),cr=!!cs[id];d.bought+=num(r.cost);if(cr)d.credit+=num(r.cost);d.buys.push({id:id,credit:cr,date:dt,label:(r.model||'Used mobile')+(r.imei?' • '+String(r.imei).slice(-6):''),amount:num(r.cost),ret:retBy[id]||null});
  });
  arr(REP_KEY).forEach(function(j){
    var amt=num(j.dealerPurchaseAmount);if(!amt)return;var d=get(j.dealerName);if(!d)return;var dt=toKey(j.date||j.createdAt);
    if(dt&&dt<start)return;
    var id='r:'+(j.id||dt+amt),cr=!!cs[id];
    if(!cr&&oldDelivered(j))return;
    d.bought+=amt;if(cr)d.credit+=amt;d.buys.push({id:id,credit:cr,date:dt,label:'Spare parts • '+(j.model||'Repair'),amount:amt,ret:retBy[id]||null});
  });
  arr(PAY_KEY).forEach(function(p){
    var d=get(p.dealer);if(!d)return;var dt=toKey(p.date);
    d.paid+=num(p.amount);d.pays.push({id:p.id,date:dt,note:p.note||'',amount:num(p.amount)});
  });
  ents.forEach(function(e){
    var d=get(e.dealer);if(!d)return;var o={id:e.id,date:toKey(e.date),note:e.note||'',label:e.label||'',amount:num(e.amount)};
    if(e.type==='old'){d.old+=o.amount;d.olds.push(o)}else if(e.type==='return'){d.ret+=o.amount;d.rets.push(o)}
  });
  var list=Object.keys(map).filter(function(k){var d=map[k];return d.buys.length||d.pays.length||d.olds.length||d.rets.length}).map(function(k){var d=map[k];d.balance=d.credit+d.old-d.paid-d.ret;
    [d.buys,d.pays,d.olds,d.rets].forEach(function(a){a.sort(function(x,y){return x.date<y.date?1:-1})});return d})
    .sort(function(a,b){return b.balance-a.balance||a.name.localeCompare(b.name)});
  var total=0;list.forEach(function(d){if(d.balance>0)total+=d.balance});
  return {list:list,total:total,start:start};
}

var AV=[['#2563eb','#dbeafe'],['#16a34a','#dcfce7'],['#d97706','#fef3c7'],['#7c3aed','#ede9fe'],['#db2777','#fce7f3'],['#0891b2','#cffafe']];
function av(name){var h=0,n=String(name||'?');for(var i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%997;var c=AV[h%AV.length];return '<i class="skdl3-av" style="color:'+c[0]+';background:'+c[1]+'">'+esc(n.trim().charAt(0).toUpperCase()||'?')+'</i>'}
var view=null,mode=''; /* view = dealer key being viewed (null = list); mode = open form: pay | old | ret */
function qa(s){return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function tabs(){
  return '<div class="skdl2-tabs">'+[['pay','＋ Payment'],['old','＋ Old balance'],['ret','↩ Return spare']].map(function(t){return '<button type="button" class="'+(mode===t[0]?'on':'')+'" onclick="skDlMode(\''+t[0]+'\')">'+t[1]+'</button>'}).join('')+'</div>';
}
function formHtml(d,D){
  if(!mode)return '';
  var dt='<input type="date" id="skDlDate" value="'+today()+'"/>',note='<input type="text" id="skDlNote" placeholder="Note (optional)"/>';
  if(mode==='pay')return '<div class="skdl2-form"><h4>Add payment</h4><input type="number" id="skDlAmt" min="0" step="0.01" inputmode="decimal" placeholder="Amount ₹"/>'+dt+note+
    '<button type="button" class="submit-btn" onclick="skDlAddPay()">Save payment</button>'+(d&&d.balance>0?'<button type="button" class="submit-btn skdl-settle" onclick="skDlSettle()">Pay full balance '+money(d.balance)+'</button>':'')+'</div>';
  if(mode==='old'){
    var nm=d?'<div class="skdl2-hint">Dealer: <b>'+esc(d.name)+'</b></div>':'<input type="text" id="skDlName" list="skDlNames" placeholder="Dealer name" autocomplete="off"/><datalist id="skDlNames">'+D.list.map(function(x){return '<option value="'+esc(x.name)+'">'}).join('')+'</datalist>';
    return '<div class="skdl2-form"><h4>Add old balance</h4>'+nm+'<input type="number" id="skDlAmt" min="0" step="0.01" inputmode="decimal" placeholder="Amount you owe ₹"/>'+dt+note+'<button type="button" class="submit-btn" onclick="skDlAddOld()">Save old balance</button></div>';
  }
  if(!d)return '<div class="skdl2-form"><h4>Return spare to dealer</h4><select id="skDlPick" onchange="skDlPickDealer(this.value)"><option value="">Select dealer…</option>'+D.list.map(function(x){return '<option value="'+esc(x.name.toLowerCase())+'">'+esc(x.name)+'</option>'}).join('')+'</select></div>';
  var open=d.buys.filter(function(b){return !b.ret});
  return '<div class="skdl2-form"><h4>Return spare to '+esc(d.name)+'</h4>'+(open.length?
    '<div class="skdl2-hint">Tap the purchase that was returned</div>'+open.map(function(b){
      return '<label class="skdl2-pick"><input type="radio" name="skDlRet" value="'+esc(b.id)+'" data-amt="'+b.amount+'" onchange="document.getElementById(\'skDlAmt\').value=this.dataset.amt"/><span>'+esc(b.label)+'<small>'+fmt(b.date)+'</small></span><b>'+money(b.amount)+'</b></label>';
    }).join('')+'<input type="number" id="skDlAmt" min="0" step="0.01" inputmode="decimal" placeholder="Return amount ₹"/>'+dt+note+
    '<button type="button" class="submit-btn" onclick="skDlAddRet()">Save return</button><div class="skdl2-hint">The returned amount is reduced from what you owe this dealer.</div>':
    '<div class="skdl2-hint">No purchases left to return for this dealer.</div>')+'</div>';
}
function render(){
  var body=document.getElementById('skDlBody');if(!body)return;
  var D=compute(),d=null;
  if(view){d=D.list.filter(function(x){return x.name.toLowerCase()===view})[0];if(!d){view=null}}
  if(d){body.innerHTML=detailHtml(d,D);return}
  var dueN=D.list.filter(function(x){return x.balance>0}).length;
  var h='<div class="skdl3-sum"><small>Total to pay dealers</small><b>'+money(D.total)+'</b><span>'+D.list.length+' dealers · '+dueN+' with balance</span></div>'+
   '<div class="skdl-start"><span>Count from date</span><input type="date" id="skDlStart" value="'+esc(D.start)+'" onchange="skDlSetStart(this.value)"/></div>'+
   '<div class="skdl2-tabs two"><button type="button" class="'+(mode==='old'?'on':'')+'" onclick="skDlMode(\'old\')">＋ Old balance</button><button type="button" class="'+(mode==='ret'?'on':'')+'" onclick="skDlMode(\'ret\')">↩ Return spare</button></div>'+
   (mode==='old'||mode==='ret'?formHtml(null,D):'');
  if(!D.list.length)h+='<div class="skdr-empty">No dealer purchases yet. Add a dealer name in Used Mobile purchase or Repair spare parts.</div>';
  else h+=(D.list.length>4?'<input type="search" id="skDlSearch" class="skdl3-search" placeholder="Search dealer…" oninput="skDlFind(this.value)" autocomplete="off"/>':'')+'<div class="skdl2-list">'+D.list.map(function(x){
    var cls=x.balance>0?'skdl-due':(x.balance<0?'skdl-adv':'skdl-ok');
    return '<div class="skdl2-row" data-n="'+esc(x.name.toLowerCase())+'" onclick="skDlOpen(\''+esc(qa(x.name.toLowerCase()))+'\')">'+av(x.name)+'<span>'+esc(x.name)+'<small>Bought '+money(x.bought)+(x.old?' · Old '+money(x.old):'')+(x.ret?' · Returned '+money(x.ret):'')+' · Paid '+money(x.paid)+'</small></span><b class="'+cls+'">'+money(Math.abs(x.balance))+'<em>'+(x.balance>0?'due':(x.balance<0?'advance':'settled'))+'</em></b></div>';
  }).join('')+'</div>';
  body.innerHTML=h;
}
function row(l,sub,amt,x,cls){return '<div class="skdl2-row plain'+(cls?' '+cls:'')+'"><span>'+l+'<small>'+sub+'</small></span><b>'+amt+(x||'')+'</b></div>'}
function detailHtml(d,D){
  var bal=d.balance;
  var xb=function(fn,id){return ' <button type="button" class="skdl-x" aria-label="Delete" onclick="'+fn+'(\''+qa(esc(id))+'\')">✕</button>'};
  var h='<button type="button" class="skdl-back" onclick="skDlOpen(null)">‹ All dealers</button>'+
   '<div class="skdl3-sum with-av">'+av(d.name)+'<div><small>'+esc(d.name)+' — '+(bal<0?'advance paid':'balance to pay')+'</small><b>'+money(Math.abs(bal))+'</b><span>Bought '+money(d.bought)+' · Paid '+money(d.paid)+(d.ret?' · Returned '+money(d.ret):'')+'</span></div></div>'+tabs()+formHtml(d,D);
  h+='<div class="skdl2-sec"><h4>Purchases <small>(paid by default — tap Pay later only if you owe the dealer)</small></h4>'+(d.buys.length?d.buys.map(function(b){
    var st=b.ret?'<span class="skdl2-ret">Returned '+fmt(b.ret.date)+'</span>':(b.credit?'Pay later (credit)':'Paid');
    return row(esc(b.label),fmt(b.date)+' • '+st,money(b.amount),b.ret?'':' <button type="button" class="skdl-x skdl-tg" onclick="skDlCred(\''+qa(esc(b.id))+'\')">'+(b.credit?'Mark paid':'Pay later')+'</button>',b.ret?'ret':'');
  }).join(''):'<div class="skdr-empty">No purchases in this period</div>')+'</div>';
  if(d.olds.length)h+='<div class="skdl2-sec"><h4>Old balance added</h4>'+d.olds.map(function(o){return row(esc(o.note||'Old balance'),fmt(o.date),'+'+money(o.amount),xb('skDlDelEnt',o.id))}).join('')+'</div>';
  if(d.rets.length)h+='<div class="skdl2-sec"><h4>Returned to dealer</h4>'+d.rets.map(function(o){return row(esc(o.label||'Returned spare'),fmt(o.date)+(o.note?' • '+esc(o.note):''),'−'+money(o.amount),xb('skDlDelEnt',o.id))}).join('')+'</div>';
  h+='<div class="skdl2-sec"><h4>Payments given</h4>'+(d.pays.length?d.pays.map(function(p){return row(esc(p.note||'Payment'),fmt(p.date),money(p.amount),xb('skDlDelPay',p.id))}).join(''):'<div class="skdr-empty">No payments yet</div>')+'</div>'+
   '<div class="skdr-actions"><button type="button" class="submit-btn whatsapp-green" onclick="skDlShare()">📤 Share on WhatsApp</button></div>';
  return h;
}
function ensureModal(){
  if(document.getElementById('skDealerModal'))return;
  var el=document.createElement('div');el.className='modal-overlay';el.id='skDealerModal';
  el.innerHTML='<div class="modal-sheet skdr-sheet"><div class="modal-title"><span>🤝 Dealer Payments</span><button class="modal-close-btn" onclick="toggleModal(\'skDealerModal\',false)">✕</button></div><div id="skDlBody"></div></div>';
  document.body.appendChild(el);
}
window.skOpenDealerTracker=function(){ensureModal();view=null;mode='';render();if(typeof window.toggleModal==='function')window.toggleModal('skDealerModal',true)};
window.skDlOpen=function(k){view=k;mode='';render();var s=document.querySelector('#skDealerModal .skdr-sheet');if(s)s.scrollTop=0};
window.skDlFind=function(v){v=String(v||'').toLowerCase().trim();document.querySelectorAll('#skDlBody .skdl2-row[data-n]').forEach(function(r){r.style.display=!v||r.getAttribute('data-n').indexOf(v)>=0?'':'none'})};
window.skDlMode=function(m){mode=mode===m?'':m;render()};
window.skDlPickDealer=function(k){if(k){view=k;mode='ret';render()}};
window.skDlCred=function(id){var c=credSet();if(c[id])delete c[id];else c[id]=1;try{localStorage.setItem(CRED_KEY,JSON.stringify(c))}catch(e){}render()};
window.skDlSetStart=function(v){if(!v)return;try{localStorage.setItem(START_KEY,v)}catch(e){}render()};
function curDealer(){var D=compute();return D.list.filter(function(x){return x.name.toLowerCase()===view})[0]}
function addPay(name,amount,date,note){
  var a=arr(PAY_KEY);a.push({id:'DP-'+Date.now(),dealer:name,amount:amount,date:date||today(),note:note||'',createdAt:new Date().toISOString()});
  try{localStorage.setItem(PAY_KEY,JSON.stringify(a))}catch(e){toast('Could not save');return false}
  return true;
}
window.skDlAddPay=function(){
  var d=curDealer();if(!d)return;
  var amt=num(document.getElementById('skDlAmt').value);
  if(!(amt>0)){toast('Enter a valid amount');return}
  if(addPay(d.name,amt,document.getElementById('skDlDate').value,document.getElementById('skDlNote').value.trim())){toast('✅ Payment saved');mode='';render()}
};

function addEnt(e){
  var a=arr(ENT_KEY);e.id='DE-'+Date.now()+'-'+Math.floor(Math.random()*1000);e.createdAt=new Date().toISOString();a.push(e);
  try{localStorage.setItem(ENT_KEY,JSON.stringify(a))}catch(x){toast('Could not save');return false}
  return true;
}
window.skDlAddOld=function(){
  var d=curDealer(),name=d?d.name:String((document.getElementById('skDlName')||{}).value||'').trim();
  if(!name){toast('Enter the dealer name');return}
  var amt=num(document.getElementById('skDlAmt').value);if(!(amt>0)){toast('Enter a valid amount');return}
  if(addEnt({type:'old',dealer:name,amount:amt,date:document.getElementById('skDlDate').value||today(),note:document.getElementById('skDlNote').value.trim()})){toast('✅ Old balance added');mode='';view=name.toLowerCase();render()}
};
window.skDlAddRet=function(){
  var d=curDealer();if(!d)return;
  var r=document.querySelector('#skDlBody input[name=skDlRet]:checked');if(!r){toast('Select the returned purchase');return}
  var b=d.buys.filter(function(x){return x.id===r.value})[0];if(!b||b.ret){toast('Already returned');return}
  var amt=num(document.getElementById('skDlAmt').value);if(!(amt>0)||amt>b.amount){toast('Enter a return amount up to '+money(b.amount));return}
  if(addEnt({type:'return',dealer:d.name,amount:amt,refId:b.id,label:b.label,date:document.getElementById('skDlDate').value||today(),note:document.getElementById('skDlNote').value.trim()})){toast('✅ Return saved');mode='';render()}
};
window.skDlDelEnt=function(id){
  if(!confirm('Delete this entry?'))return;
  var a=arr(ENT_KEY).filter(function(p){return p.id!==id});
  try{localStorage.setItem(ENT_KEY,JSON.stringify(a))}catch(e){}
  render();
};
window.skDlSettle=function(){
  var d=curDealer();if(!d||d.balance<=0)return;
  if(!confirm('Record payment of '+money(d.balance)+' to '+d.name+'?'))return;
  if(addPay(d.name,d.balance,today(),'Full settlement')){toast('✅ Settled');render()}
};
window.skDlDelPay=function(id){
  if(!confirm('Delete this payment entry?'))return;
  var a=arr(PAY_KEY).filter(function(p){return p.id!==id});
  try{localStorage.setItem(PAY_KEY,JSON.stringify(a))}catch(e){}
  render();
};
window.skDlShare=function(){
  var d=curDealer();if(!d)return;
  var t=shopName()+' — Dealer account\n'+d.name+'\nBought: '+money(d.bought)+'\nOn credit: '+money(d.credit)+(d.old?'\nOld balance: '+money(d.old):'')+(d.ret?'\nReturned: '+money(d.ret):'')+'\nPaid: '+money(d.paid)+'\n'+(d.balance<0?'Advance: ':'Balance: ')+money(Math.abs(d.balance));
  window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank','noopener');
};
function addDrawer(){
  var ref=document.getElementById('skDrMonth')||document.querySelector('.menu-drawer-btn[onclick*="skOpenDailyReport"]');
  if(!ref||document.getElementById('skDrDealer'))return;
  var b=document.createElement('button');b.className='menu-drawer-btn';b.id='skDrDealer';b.type='button';b.setAttribute('onclick','skOpenDealerTracker(); toggleLeftDrawer(false);');
  b.innerHTML='<span class="menu-icon-pod menu-icon-billing" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 7h18v12H3z"/><path d="M3 11h18M8 15h3"/><path d="M8 7V5h8v2"/></svg></span><span class="menu-btn-label">Dealer Payments</span><span class="menu-arrow">›</span>';
  ref.parentNode.insertBefore(b,ref.nextSibling);
}
function boot(){addDrawer();setTimeout(addDrawer,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
