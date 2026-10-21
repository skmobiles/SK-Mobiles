/* V5.11.45 Outside repairs: a job can be sent to a friend / another shop (mobile or laptop), tracked until it is back,
   and what we owe each shop is kept in one place.
   Job fields added (all optional, old jobs are untouched):  job.status='Sent outside', job.outside={type,to,phone,sentDate,expectedBack,result,charge,backAt,note}, job.outsideCharge
   New key: skx_outside_pay_v1  [{id,shop,amount,date,note}]  (syncs like every skx_ key) */
(function(){
'use strict';
var KEY='skx_repair_jobs_v2',PAY='skx_outside_pay_v1';
function arr(k){try{var a=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function put(k,v){localStorage.setItem(k,JSON.stringify(v))}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
function $(id){return document.getElementById(id)}
function num(v){v=Number(v);return isFinite(v)?v:0}
function inr(n){return '₹'+Math.round(num(n)).toLocaleString('en-IN')}
function todayIso(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function toIso(s){s=String(s||'').trim();var m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);if(m){var y=m[3].length===2?'20'+m[3]:m[3],d=+m[1],mo=+m[2];if(mo>=1&&mo<=12&&d>=1&&d<=31)return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0');return''}
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);return m?m[1]+'-'+String(+m[2]).padStart(2,'0')+'-'+String(+m[3]).padStart(2,'0'):''}
function fmt(i){var m=String(i||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?m[3]+'/'+m[2]+'/'+m[1]:''}
function dayNum(i){var m=String(i||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?Math.round(Date.UTC(+m[1],+m[2]-1,+m[3])/86400000):null}
function daysSince(i){var a=dayNum(i),b=dayNum(todayIso());return a==null?0:Math.max(0,b-a)}
function shopKey(n){return String(n||'').trim().toLowerCase()}
function rerender(){try{window.skRjRenderJobs&&window.skRjRenderJobs()}catch(e){}try{window.skRjRenderHistory&&window.skRjRenderHistory()}catch(e){}try{window.skRjRenderHomeMetric&&window.skRjRenderHomeMetric()}catch(e){}}
function toast(t){try{window.showToast&&window.showToast(t)}catch(e){}}

/* ---------- form (Repair Jobs > Jobs) ---------- */
window.skOutSetType=function(t){
  var h=$('skRjOutType');if(h)h.value=t==='Laptop'?'Laptop':'Mobile';
  document.querySelectorAll('#skRjOutWrap [data-ot]').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-ot')===h.value)});
};
window.skOutToggle=function(){
  var st=$('skRjStatus'),w=$('skRjOutWrap');if(!st||!w)return;
  var on=st.value==='Sent outside';w.style.display=on?'block':'none';
  if(on){fillShops();var d=$('skRjOutSent');if(d&&!d.value)d.value=fmt(todayIso());}
};
function fillShops(){
  var dl=$('skOutShops');if(!dl)return;var seen={},html='';
  arr(KEY).forEach(function(j){var n=j&&j.outside&&j.outside.to;if(n&&!seen[shopKey(n)]){seen[shopKey(n)]=1;html+='<option value="'+esc(n)+'"></option>'}});
  dl.innerHTML=html;
}
window.skOutShopPicked=function(){
  var n=$('skRjOutTo').value,ph=$('skRjOutPhone');if(!n||!ph||ph.value)return;
  var f=arr(KEY).filter(function(j){return j&&j.outside&&shopKey(j.outside.to)===shopKey(n)&&j.outside.phone}).pop();
  if(f)ph.value=f.outside.phone;
};
window.skOutFormClear=function(){
  var w=$('skRjOutWrap');if(w)w.style.display='none';
  ['skRjOutTo','skRjOutPhone','skRjOutBack','skRjOutSent'].forEach(function(i){var e=$(i);if(e)e.value=''});
  window.skOutSetType('Mobile');
};
window.skOutFormFill=function(j){
  window.skOutFormClear();var o=j&&j.outside;if(!o)return;
  $('skRjOutTo').value=o.to||'';$('skRjOutPhone').value=o.phone||'';$('skRjOutBack').value=fmt(o.expectedBack);$('skRjOutSent').value=fmt(o.sentDate);
  window.skOutSetType(o.type);window.skOutToggle();
};
/* returns {error} or {outside} (outside=null when the status is not "Sent outside") */
window.skOutFormRead=function(existing,status){
  var old=existing&&existing.outside?existing.outside:null;
  if(status!=='Sent outside'){
    if(old&&old.result==='out'){var c=Object.assign({},old);c.result='back';c.backAt=new Date().toISOString();return{outside:c}}
    return{outside:old};
  }
  var to=$('skRjOutTo').value.trim();if(!to)return{error:'Sent to (friend / shop name) is required'};
  var back=$('skRjOutBack').value.trim(),bi=back?toIso(back):'';
  if(back&&!bi)return{error:'Expected back must be DD/MM/YYYY'};
  var si=toIso($('skRjOutSent').value)||(old&&old.sentDate)||todayIso();
  return{outside:{type:$('skRjOutType').value==='Laptop'?'Laptop':'Mobile',to:to,phone:$('skRjOutPhone').value.trim(),sentDate:si,expectedBack:bi,result:'out',charge:old?num(old.charge):0,backAt:'',note:old&&old.note||''}};
};

/* ---------- Pending list ---------- */
function isOut(j){return j&&j.status==='Sent outside'&&j.outside}
function failedBack(j){return j&&j.outside&&j.outside.result==='failed'&&j.status!=='Delivered'&&j.status!=='Ready'}
function chip(t,cls,st){return'<span class="'+cls+'"'+(st?' style="'+st+'"':'')+'>'+t+'</span>'}
window.skOutCardHtml=function(j){
  if(!isOut(j)&&!failedBack(j))return'';
  var o=j.outside,icon=o.type==='Laptop'?'💻':'📱',chips='',acts='';
  var meta=fmt(j.date)+' · '+icon+' Phone: '+esc(j.phone||'—')+'<br><span class="sk-rj-problem-highlight">'+esc(j.problem)+'</span>';
  if(isOut(j)){
    var d=daysSince(o.sentDate),over=o.expectedBack&&dayNum(todayIso())>dayNum(o.expectedBack);
    chips=chip('📤 '+esc(o.to),'sk-rj-status','background:rgba(124,58,237,.14)!important;color:#6d28d9!important')
      +chip(d===0?'⏱ Sent today':'⏱ '+(d===1?'1 day':d+' days')+' out','sk-rj-age')
      +(o.expectedBack?chip(over?'⚠ Overdue '+(dayNum(todayIso())-dayNum(o.expectedBack))+' day(s)':'Back by '+fmt(o.expectedBack).slice(0,5),'sk-rj-age'+(over?' old':'')):'');
    acts='<button type="button" class="sk-rj-next" onclick="event.stopPropagation();skOutBack(\''+esc(j.id)+'\')"><i>📥</i><span>Got back</span></button>'
      +(o.phone?'<button type="button" class="sk-rj-edit" onclick="event.stopPropagation();skRjCallPhone(\''+esc(o.phone)+'\')"><i>📞</i><span>Call</span></button>':'')
      +'<button type="button" class="sk-rj-edit" onclick="event.stopPropagation();skRjEdit(\''+esc(j.id)+'\')"><i>✏️</i><span>Edit</span></button>'
      +'<button type="button" class="sk-rj-delete" onclick="event.stopPropagation();skRjDelete(\''+esc(j.id)+'\')"><i>🗑️</i><span>Delete</span></button>';
  }else{
    chips=chip('❌ Not repaired by '+esc(o.to),'sk-rj-status','background:rgba(220,38,38,.12)!important;color:#b91c1c!important')+(num(o.charge)?chip('Outside '+inr(o.charge),'sk-rj-age'):'');
    acts='<button type="button" class="sk-rj-next" onclick="event.stopPropagation();skRjReturnOpen(\''+esc(j.id)+'\')"><i>🤝</i><span>Return to customer</span></button>'
      +'<button type="button" class="sk-rj-edit" onclick="event.stopPropagation();skRjEdit(\''+esc(j.id)+'\')"><i>✏️</i><span>Edit</span></button>'
      +'<button type="button" class="sk-rj-delete" onclick="event.stopPropagation();skRjDelete(\''+esc(j.id)+'\')"><i>🗑️</i><span>Delete</span></button>';
  }
  return'<div class="sk-rj-card" data-rj-id="'+esc(j.id)+'" style="border-color:#7c3aed !important" onclick="skRjShowDetail(\''+esc(j.id)+'\')"><div class="sk-rj-card-top"><div><div class="sk-rj-name">'+esc(j.customer)+' · '+esc(j.model)+'</div><div class="sk-rj-meta">'+meta+'</div><div class="sk-rj-delivery-meta sk-rj-chip-row">'+chips+'</div></div></div><div class="sk-rj-actions">'+acts+'</div></div>';
};

/* ---------- Outside filter view: payments summary + devices grouped by shop ---------- */
function shopTable(){
  var map={},pays=arr(PAY);
  arr(KEY).forEach(function(j){var o=j&&j.outside;if(!o||!o.to)return;var k=shopKey(o.to);var s=map[k]||(map[k]={key:k,name:o.to,sent:0,repaired:0,failed:0,out:0,charges:0,paid:0,jobs:[],last:''});
    s.name=o.to;s.sent++;s.jobs.push(j);if(o.result==='repaired')s.repaired++;else if(o.result==='failed')s.failed++;else if(o.result==='out')s.out++;
    s.charges+=num(o.charge);s.last=(o.sentDate||s.last)>s.last?(o.sentDate||s.last):s.last;});
  pays.forEach(function(p){var k=shopKey(p.shop);if(!map[k])map[k]={key:k,name:p.shop,sent:0,repaired:0,failed:0,out:0,charges:0,paid:0,jobs:[],last:''};map[k].paid+=num(p.amount)});
  return Object.keys(map).map(function(k){var s=map[k];s.due=s.charges-s.paid;return s}).sort(function(a,b){return b.due-a.due||String(b.last).localeCompare(String(a.last))});
}
window.skOutListHtml=function(outJobs){
  var shops=shopTable(),h='',total=0;
  shops.forEach(function(s){if(s.due>0)total+=s.due});
  if(shops.length){
    h+='<div class="sk-out-head">💰 Outside payments (to pay)</div>';
    shops.forEach(function(s){
      h+='<div class="sk-out-pay"><div class="sk-out-pay-top"><b>'+esc(s.name)+'</b><span class="'+(s.due>0?'due':'ok')+'">'+(s.due>0?'To pay '+inr(s.due):(s.due<0?'Advance '+inr(-s.due):'Settled'))+'</span></div>'
        +'<div class="sk-out-pay-sub">'+s.sent+' sent · '+s.repaired+' repaired · '+s.failed+' not repaired'+(s.out?' · '+s.out+' with them':'')+'</div>'
        +'<div class="sk-out-pay-row"><span>Charges '+inr(s.charges)+' · Paid '+inr(s.paid)+'</span><button type="button" class="sk-out-btn pri" onclick="skOutPayOpen(\''+esc(encodeURIComponent(s.key))+'\')">Pay</button><button type="button" class="sk-out-btn" onclick="skOutHistory(\''+esc(encodeURIComponent(s.key))+'\')">History</button></div></div>';
    });
    if(total>0)h+='<div class="sk-out-total">Total to pay: '+inr(total)+'</div>';
  }
  h+='<div class="sk-out-head sk-out-head2">📤 Currently outside · '+outJobs.length+' device'+(outJobs.length===1?'':'s')+'</div>';
  if(!outJobs.length)return h+'<div class="sk-rj-empty">No device is outside right now.</div>';
  var groups={},order=[];outJobs.forEach(function(j){var k=shopKey(j.outside.to);if(!groups[k]){groups[k]=[];order.push(k)}groups[k].push(j)});
  order.forEach(function(k){var g=groups[k];h+='<div class="sk-out-grp">'+esc(g[0].outside.to)+' · '+g.length+' device'+(g.length===1?'':'s')+'</div>'+g.map(window.skOutCardHtml).join('')});
  return h;
};

/* ---------- Got back popup ---------- */
window.skOutBack=function(id){
  var j=arr(KEY).find(function(x){return String(x.id)===String(id)});if(!j||!j.outside)return;
  var d=$('skOutBackDlg');if(d)d.remove();d=document.createElement('div');d.id='skOutBackDlg';d.className='skrc-dlg skrc-edit';
  var price=num(j.estimate);
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>Got back from '+esc(j.outside.to)+'</b></div><div class="skrc-body skrc-form">'
    +'<div class="skrc-hint">'+esc(j.customer)+' · '+esc(j.model)+' — '+esc(j.problem)+'</div>'
    +'<label>Result<select id="skOutRes"><option value="r">✅ Repaired</option><option value="f">↩ Not repaired</option></select></label>'
    +'<label>Outside charge ₹ (we pay '+esc(j.outside.to)+')<input id="skOutCharge" type="number" inputmode="decimal" min="0" value="'+(num(j.outside.charge)||'')+'" placeholder="0"></label>'
    +'<label id="skOutPriceWrap">Customer price ₹<input id="skOutPrice" type="number" inputmode="decimal" min="0" value="'+(price||'')+'" placeholder="0"></label>'
    +'<div class="skrc-hint" id="skOutProfit"></div><div class="skrc-msg" id="skOutMsg"></div></div>'
    +'<div class="skrc-act"><button type="button" data-a="cancel" class="ed">Cancel</button><button type="button" data-a="save" class="wa">Save</button></div></div>';
  document.body.appendChild(d);
  function upd(){var r=$('skOutRes').value==='r';$('skOutPriceWrap').style.display=r?'':'none';var p=num($('skOutPrice').value)-num($('skOutCharge').value);
    $('skOutProfit').textContent=r?'Our profit: '+inr(p)+' → job becomes “Ready”':'Job returns to the shop. Use “Return to customer” to hand it back.';$('skOutProfit').style.fontWeight=r?'800':'';}
  d.addEventListener('input',upd);d.addEventListener('change',upd);upd();
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')||(e.target.dataset&&e.target.dataset.a==='cancel')){d.remove();return}
    if(!e.target.dataset||e.target.dataset.a!=='save')return;
    var rep=$('skOutRes').value==='r',charge=Math.max(0,num($('skOutCharge').value)),price=Math.max(0,num($('skOutPrice').value));
    if(rep&&!price){$('skOutMsg').textContent='Enter the customer price';return}
    var a=arr(KEY),i=a.findIndex(function(x){return String(x.id)===String(id)});if(i<0)return;var job=a[i],now=new Date().toISOString();
    job.outside=Object.assign({},job.outside,{result:rep?'repaired':'failed',charge:charge,backAt:now});job.outsideCharge=charge;
    if(rep){job.estimate=price;job.outstandingAmount=Math.max(0,price-Math.max(0,num(job.discountAmount))-Math.max(0,num(job.paidAmount)));job.status='Ready';job.deliveryStatus='Ready for Delivery';}
    else{job.status='Received';job.deliveryStatus='Pending';}
    job.updatedAt=now;
    try{/* same readyAt rule as the Repair Jobs module */ if(job.status==='Ready'&&!job.readyAt)job.readyAt=now;}catch(err){}
    put(KEY,a);d.remove();rerender();
    toast(rep?'✅ Back & repaired — job is Ready (profit '+inr(price-charge)+')':'↩ Back, not repaired — return it to the customer');
  });
};

/* ---------- pay / history ---------- */
function find(kEnc){var k=decodeURIComponent(kEnc);return shopTable().find(function(s){return s.key===k})}
window.skOutPayOpen=function(kEnc){
  var s=find(kEnc);if(!s)return;var d=$('skOutPayDlg');if(d)d.remove();d=document.createElement('div');d.id='skOutPayDlg';d.className='skrc-dlg skrc-edit';
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>Pay '+esc(s.name)+'</b></div><div class="skrc-body skrc-form">'
    +'<div class="skrc-hint">Charges '+inr(s.charges)+' · Paid '+inr(s.paid)+' · To pay '+inr(Math.max(0,s.due))+'</div>'
    +'<label>Amount paid now ₹<input id="skOutPayAmt" type="number" inputmode="decimal" min="0" value="'+(s.due>0?Math.round(s.due):'')+'"></label>'
    +'<label>Note (optional)<input id="skOutPayNote" placeholder="Cash / GPay..."></label><div class="skrc-msg" id="skOutPayMsg"></div></div>'
    +'<div class="skrc-act"><button type="button" data-a="cancel" class="ed">Cancel</button><button type="button" data-a="save" class="wa">Save payment</button></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')||(e.target.dataset&&e.target.dataset.a==='cancel')){d.remove();return}
    if(!e.target.dataset||e.target.dataset.a!=='save')return;
    var amt=num($('skOutPayAmt').value);if(amt<=0){$('skOutPayMsg').textContent='Enter an amount';return}
    var p=arr(PAY);p.push({id:'OP-'+Date.now(),shop:s.name,amount:amt,date:new Date().toISOString(),note:$('skOutPayNote').value.trim()});put(PAY,p);
    d.remove();rerender();toast('Paid '+inr(amt)+' to '+s.name);
  });
};
window.skOutHistory=function(kEnc){
  var s=find(kEnc);if(!s)return;var d=$('skOutHistDlg');if(d)d.remove();d=document.createElement('div');d.id='skOutHistDlg';d.className='skrc-dlg skrc-edit';
  var jobs=s.jobs.slice().sort(function(a,b){return String(b.outside.sentDate).localeCompare(String(a.outside.sentDate))});
  var pays=arr(PAY).filter(function(p){return shopKey(p.shop)===s.key}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
  var res={out:'With them',back:'Back',repaired:'✅ Repaired',failed:'❌ Not repaired'};
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>'+esc(s.name)+' · history</b></div><div class="skrc-body">'
    +'<div class="sk-out-head">Devices</div>'+(jobs.map(function(j){var o=j.outside;return'<div class="sk-out-line"><span>'+fmt(o.sentDate)+' · '+(o.type==='Laptop'?'💻':'📱')+' '+esc(j.customer)+' · '+esc(j.model)+'<small>'+(res[o.result]||'')+'</small></span><b>'+(num(o.charge)?inr(o.charge):'—')+'</b></div>'}).join('')||'<div class="sk-rj-empty">No devices</div>')
    +'<div class="sk-out-head sk-out-head2">Payments</div>'+(pays.map(function(p){return'<div class="sk-out-line"><span>'+fmt(String(p.date).slice(0,10))+(p.note?' · '+esc(p.note):'')+'</span><b>'+inr(p.amount)+' <button type="button" class="sk-out-x" data-del="'+esc(p.id)+'" aria-label="Delete payment">✕</button></b></div>'}).join('')||'<div class="sk-rj-empty">No payments yet</div>')
    +'</div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')){d.remove();return}
    var del=e.target.closest('[data-del]');if(del&&confirm('Delete this payment entry?')){put(PAY,arr(PAY).filter(function(p){return p.id!==del.getAttribute('data-del')}));d.remove();rerender();window.skOutHistory(kEnc)}
  });
};

/* ---------- styles (theme variables only) ---------- */
var st=document.createElement('style');st.textContent=
'.sk-out-head{font-weight:800;font-size:.86rem;margin:6px 2px 8px;color:var(--text)}.sk-out-head2{margin-top:14px;color:#6d28d9}'
+'.sk-out-pay{padding:12px;border-radius:16px;background:var(--card-bg);border:1.5px solid var(--card-border);margin-bottom:8px}'
+'.sk-out-pay-top{display:flex;justify-content:space-between;gap:8px;align-items:center}.sk-out-pay-top b{font-weight:800;color:var(--text)!important;-webkit-text-fill-color:var(--text)!important}.sk-out-pay-sub,.sk-out-pay-row span{-webkit-text-fill-color:var(--text-muted)}.sk-out-line,.sk-out-line b{color:var(--text)}.sk-out-pay-top .due{font-weight:800;color:#dc2626}.sk-out-pay-top .ok{font-weight:800;color:#16a34a}'
+'.sk-out-pay-sub{font-size:.76rem;color:var(--text-muted);margin:4px 0 8px}.sk-out-pay-row{display:flex;gap:8px;align-items:center}.sk-out-pay-row span{flex:1;font-size:.76rem;color:var(--text-muted)}'
+'.sk-out-btn{border:1.5px solid var(--card-border);background:var(--card-bg);color:var(--text);border-radius:12px;padding:8px 12px;font-weight:700;font-size:.8rem}.sk-out-btn.pri{background:var(--primary);color:#fff;border-color:var(--primary)}'
+'.sk-out-total{padding:10px;border-radius:14px;background:rgba(220,38,38,.1);color:#dc2626;font-weight:800;text-align:center;margin:2px 0 4px}'
+'.sk-out-grp{font-weight:800;font-size:.84rem;margin:10px 2px 6px;color:#6d28d9}'
+'.sk-out-line{display:flex;justify-content:space-between;gap:10px;padding:9px 2px;border-bottom:1px solid var(--card-border);font-size:.82rem}.sk-out-line small{display:block;color:var(--text-muted)}.sk-out-x{border:0;background:transparent;color:#dc2626;font-size:.9rem;padding:0 4px}'
+'#skRjOutWrap{border-top:1px dashed var(--card-border);padding-top:10px;margin:6px 0 4px}.sk-out-wraphead{font-weight:800;font-size:.84rem;color:var(--primary);margin:0 2px 8px}.sk-out-types{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}';
document.head.appendChild(st);
})();
