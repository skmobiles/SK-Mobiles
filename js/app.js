/* SK MOBILES V6 — CLEAN CORE
   Fresh implementation. No legacy V4/V5 patch layers.
   Local-first persistence; credit/EMI are derived from bills.
*/
(() => {
  'use strict';

  const STORE = 'skm_v6_state';
  const VERSION = '6.0.0';
  const app = document.getElementById('app');
  const modalRoot = document.getElementById('modalRoot');
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];

  const todayISO = () => {
    const d = new Date();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${d.getFullYear()}-${m}-${day}`;
  };
  const dmy = iso => {
    if (!iso) return '';
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };
  const money = n => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2})}`;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = p => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const plusMonth = iso => {
    const d = new Date(`${iso}T00:00:00`);
    d.setMonth(d.getMonth()+1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const defaultState = () => ({
    version: VERSION,
    settings: {
      shopName:'SK MOBILES',
      shopAddress:'Shree Sai Complex, Salem Main Rd,\\nOld Quarters Bus Stop, Old Quarters,\\nDharmapuri, Tamil Nadu 636705.',
      shopPhone:'766 766 6362',
      terms:'1. Sold items are not returnable.\\n2. 7 Days Testing Warranty only.\\n3. No warranty for physical or liquid damage.\\n4. Customer has checked the IMEI and device condition before purchase.'
    },
    counters:{bill:0},
    bills:[],
    repairs:[],
    inventory:[],
    deletedBillIds:[],
    deletedBillNos:[],
    audit:[]
  });

  let state = loadState();
  let currentPage = 'home';
  let billingTab = 'new';
  let repairTab = 'jobs';
  let editingBillId = null;
  let editingRepairId = null;
  let currentBillDraft = null;

  function loadState(){
    try {
      const raw = localStorage.getItem(STORE);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const base = defaultState();
      const merged = {...base,...parsed,settings:{...base.settings,...(parsed.settings||{})},counters:{...base.counters,...(parsed.counters||{})}};
      merged.bills = Array.isArray(merged.bills) ? dedupeBills(merged.bills) : [];
      merged.repairs = Array.isArray(merged.repairs) ? merged.repairs : [];
      merged.inventory = Array.isArray(merged.inventory) ? merged.inventory : [];
      merged.deletedBillIds = Array.isArray(merged.deletedBillIds) ? merged.deletedBillIds : [];
      merged.deletedBillNos = Array.isArray(merged.deletedBillNos) ? merged.deletedBillNos : [];
      return merged;
    } catch(e){
      console.error(e);
      return defaultState();
    }
  }

  function persist(reason='update'){
    state.version = VERSION;
    state.audit.push({id:uid('audit'),reason,at:new Date().toISOString()});
    if (state.audit.length > 100) state.audit = state.audit.slice(-100);
    localStorage.setItem(STORE, JSON.stringify(state));
    setSaveStatus('Saved');
  }

  function setSaveStatus(text){
    const el = $('#saveStatus');
    if (el) {
      el.textContent = text;
      clearTimeout(setSaveStatus.t);
      setSaveStatus.t=setTimeout(()=>el.textContent='Ready',1200);
    }
  }

  function toast(msg, type='ok'){
    const el=$('#toast');
    el.textContent=msg;
    el.className=`toast show ${type}`;
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>el.className='toast',2600);
  }

  function nextBillNo(){
    state.counters.bill = Math.max(0, Number(state.counters.bill)||0) + 1;
    return `SK-3009-${String(state.counters.bill).padStart(3,'0')}`;
  }

  function dedupeBills(list){
    const map=new Map();
    for(const raw of list){
      if(!raw || !raw.id) continue;
      if(raw.id && state?.deletedBillIds?.includes?.(raw.id)) continue;
      if(raw.billNo && state?.deletedBillNos?.includes?.(raw.billNo)) continue;
      const existing=map.get(raw.billNo || raw.id);
      if(!existing){ map.set(raw.billNo||raw.id, normalizeBill(raw)); continue; }
      const a=new Date(existing.updatedAt||existing.createdAt||0).getTime();
      const b=new Date(raw.updatedAt||raw.createdAt||0).getTime();
      if(b>=a) map.set(raw.billNo||raw.id, normalizeBill({...existing,...raw,payments:mergePayments(existing.payments,raw.payments)}));
      else existing.payments=mergePayments(existing.payments,raw.payments);
    }
    return [...map.values()];
  }

  function mergePayments(a=[],b=[]){
    const map=new Map();
    for(const p of [...(a||[]),...(b||[])]) if(p?.id) map.set(p.id,p);
    return [...map.values()].sort((x,y)=>new Date(x.at)-new Date(y.at));
  }

  function normalizeBill(b){
    return {
      id:b.id||uid('bill'),
      billNo:b.billNo||'',
      type:b.type||'New Mobile',
      createdAt:b.createdAt||new Date().toISOString(),
      updatedAt:b.updatedAt||b.createdAt||new Date().toISOString(),
      customer:{name:b.customer?.name||'',phone:b.customer?.phone||'',address:b.customer?.address||''},
      device:{brand:b.device?.brand||'',model:b.device?.model||'',ram:b.device?.ram||'',storage:b.device?.storage||'',colour:b.device?.colour||'',package:b.device?.package||'Full Kit (Box + Charger + Bill)',imei1:b.device?.imei1||'',imei2:b.device?.imei2||''},
      payment:{mode:b.payment?.mode||'Cash',total:Number(b.payment?.total)||0,advance:Number(b.payment?.advance)||0,creditDueDate:b.payment?.creditDueDate||'',emiMonths:Number(b.payment?.emiMonths)||0,emiInterest:Number(b.payment?.emiInterest)||0,emiStartDate:b.payment?.emiStartDate||''},
      payments:Array.isArray(b.payments)?b.payments:[],
      snapshot:b.snapshot||null
    };
  }

  function billBalance(b){
    const down=Number(b.payment.advance)||0;
    const paid=(b.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0);
    return Math.max(0,Number(b.payment.total||0)-down-paid);
  }

  function billPaid(b){
    return Math.min(Number(b.payment.total||0),Number(b.payment.advance||0)+(b.payments||[]).reduce((s,p)=>s+Number(p.amount||0),0));
  }

  function emiSchedule(b){
    const months=Number(b.payment.emiMonths)||0;
    if(months<1) return [];
    const balance=Math.max(0,Number(b.payment.total)-Number(b.payment.advance));
    const start=b.payment.emiStartDate||plusMonth(todayISO());
    const base=Math.floor((balance/months)*100)/100;
    return Array.from({length:months},(_,i)=>{
      const due=new Date(`${start}T00:00:00`);
      due.setMonth(due.getMonth()+i);
      const amount=i===months-1 ? Number((balance-base*(months-1)).toFixed(2)) : base;
      return {n:i+1,due:`${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`,amount};
    });
  }

  function buildInvoiceSnapshot(b){
    const bal=billBalance(b);
    const paid=billPaid(b);
    const schedule=emiSchedule(b);
    return {
      shop:{...state.settings},
      bill:{id:b.id,billNo:b.billNo,type:b.type,date:b.createdAt.slice(0,10)},
      customer:{...b.customer},
      device:{...b.device},
      payment:{...b.payment,balance:bal,paid},
      schedule,
      terms:state.settings.terms
    };
  }

  function render(){
    const tpl=document.getElementById(`${currentPage}Template`);
    if(!tpl){ app.innerHTML='<section class="page"><h1>Page not found</h1></section>'; return; }
    app.innerHTML=tpl.innerHTML;
    $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===currentPage));
    if(currentPage==='home') renderHome();
    if(currentPage==='billing') renderBilling();
    if(currentPage==='credit') renderCredit();
    if(currentPage==='repair') renderRepair();
    if(currentPage==='inventory') renderInventory();
    if(currentPage==='backup') renderBackup();
  }

  function go(page){
    currentPage=page;
    closeDrawer();
    render();
    window.scrollTo({top:0,behavior:'instant'});
  }

  function renderHome(){
    $('#mBills').textContent=state.bills.length;
    const outstanding=state.bills.reduce((s,b)=>s+billBalance(b),0);
    $('#mCredit').textContent=money(outstanding);
    $('#mRepair').textContent=state.repairs.filter(r=>!['Completed','Delivered','Cancelled'].includes(r.status)).length;
    $('#mStock').textContent=state.inventory.filter(i=>Number(i.stock)<=Number(i.low||2)).length;
    const urgent=state.repairs.filter(r=>r.workType==='Urgent'&&!['Completed','Delivered','Cancelled'].includes(r.status)).slice(0,5);
    $('#urgentList').innerHTML=urgent.length?urgent.map(repairCard).join(''):'<div class="empty">No urgent pending repair jobs.</div>';
    const recent=[...state.bills].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,5);
    $('#recentBills').innerHTML=recent.length?recent.map(billCompact).join(''):'<div class="empty">No bills saved yet.</div>';
  }

  function billCompact(b){
    return `<button class="list-row" data-action="view-bill" data-id="${esc(b.id)}"><span><strong>${esc(b.customer.name||'Walk-in')}</strong><small>${esc(b.billNo)} • ${dmy(b.createdAt.slice(0,10))} • ${esc(b.payment.mode)}</small></span><b>${money(b.payment.total)}</b></button>`;
  }

  function repairCard(r){
    return `<button class="list-row" data-action="view-repair" data-id="${esc(r.id)}"><span><strong>🔧 ${esc(r.customer||'Customer')}</strong><small>${esc(r.phone)} • ${esc(r.model)} • ${esc(r.workType)}</small></span><b>${esc(r.status)}</b></button>`;
  }

  function renderBilling(){
    $('#historyCount').textContent=state.bills.length;
    $('#billingNew').classList.toggle('hidden',billingTab!=='new');
    $('#billingHistory').classList.toggle('hidden',billingTab!=='history');
    $$('#billingTemplate + *').forEach(()=>{});
    if(billingTab==='new') renderNewBillForm();
    else renderBillHistory();
    $$('#billingNew + *');
  }

  function renderNewBillForm(b=null){
    const edit=b?normalizeBill(b):null;
    if(!currentBillDraft || edit) currentBillDraft=edit||emptyBill();
    const x=currentBillDraft;
    $('#billingNew').innerHTML=`
      <div class="bill-workspace">
        <form id="billForm" class="panel">
          <div class="form-head"><h2>${edit?'✏️ Edit Bill':'🧾 New Bill'}</h2><span class="pill">${esc(x.billNo||'New')}</span></div>
          <div class="type-tabs">
            ${['New Mobile','Used Mobile','Keypad Mobile'].map(t=>`<button type="button" class="${x.type===t?'active':''}" data-bill-type="${t}">${t==='New Mobile'?'📱':t==='Used Mobile'?'📱':'☎️'} ${t}</button>`).join('')}
          </div>
          <h3>👤 Customer Details</h3>
          <div class="form-grid two">
            <label>Customer Name *<input id="fName" value="${esc(x.customer.name)}" required></label>
            <label>Phone / WhatsApp *<input id="fPhone" value="${esc(x.customer.phone)}" required></label>
          </div>
          <label>Customer Address<textarea id="fAddress">${esc(x.customer.address)}</textarea></label>
          <h3>📱 Mobile Details</h3>
          <div class="form-grid two">
            <label>Brand *<input id="fBrand" value="${esc(x.device.brand)}" required></label>
            <label>Model *<input id="fModel" value="${esc(x.device.model)}" required></label>
          </div>
          <div class="form-grid three">
            <label>RAM<input id="fRam" value="${esc(x.device.ram)}"></label>
            <label>Storage<input id="fStorage" value="${esc(x.device.storage)}"></label>
            <label>Colour<input id="fColour" value="${esc(x.device.colour)}"></label>
          </div>
          <label>Package<select id="fPackage"><option>Full Kit (Box + Charger + Bill)</option><option>Box + Charger</option><option>Device Only</option></select></label>
          <div class="form-grid two"><label>IMEI 1 *<input id="fImei1" value="${esc(x.device.imei1)}"></label><label>IMEI 2<input id="fImei2" value="${esc(x.device.imei2)}"></label></div>
          <h3>💳 Price & Payment</h3>
          <div class="pay-tabs">${['Cash','GPay','EMI','Credit'].map(m=>`<button type="button" class="${x.payment.mode===m?'active':''}" data-pay-mode="${m}">${m}</button>`).join('')}</div>
          <div class="form-grid two">
            <label>Total Amount (₹) *<input id="fTotal" type="number" min="0" step="0.01" value="${x.payment.total||''}" required></label>
            <label>Down Payment (₹)<input id="fAdvance" type="number" min="0" step="0.01" value="${x.payment.advance||0}"></label>
          </div>
          <div class="balance-box"><span>Balance Due</span><strong id="fBalance">${money(Math.max(0,(x.payment.total||0)-(x.payment.advance||0)))}</strong></div>
          <div id="emiFields" class="${x.payment.mode==='EMI'?'':'hidden'}">
            <div class="form-grid three">
              <label>EMI Months<input id="fEmiMonths" type="number" min="1" value="${x.payment.emiMonths||3}"></label>
              <label>Interest %<input id="fEmiInterest" type="number" min="0" step="0.01" value="${x.payment.emiInterest||0}"></label>
              <label>EMI Start Date<input id="fEmiStart" type="date" value="${x.payment.emiStartDate||plusMonth(todayISO())}"></label>
            </div>
          </div>
          <div id="creditFields" class="${x.payment.mode==='Credit'?'':'hidden'}">
            <label>Credit Due Date<input id="fCreditDate" type="date" value="${x.payment.creditDueDate||plusMonth(todayISO())}"></label>
          </div>
          <div class="action-row"><button type="submit" class="primary wide">${edit?'💾 Update Bill':'💾 Save Bill'}</button><button type="button" class="secondary" data-action="clear-bill">Clear</button></div>
        </form>
        <aside class="panel invoice-panel"><div class="panel-head"><h2>🧾 Live Invoice Preview</h2><span class="pill">Same source for Print/PDF</span></div><div id="invoicePreview"></div><div class="action-row sticky-actions"><button class="secondary" data-action="print-draft">🖨️ Print</button><button class="primary" data-action="download-draft">⬇️ Download</button></div></aside>
      </div>`;
    $('#fPackage').value=x.device.package||'Full Kit (Box + Charger + Bill)';
    bindBillForm();
    updateDraftFromForm(false);
    renderInvoicePreview(currentBillDraft);
  }

  function emptyBill(){
    return normalizeBill({id:uid('bill'),billNo:'',type:'New Mobile',customer:{},device:{package:'Full Kit (Box + Charger + Bill)'},payment:{mode:'Cash',total:0,advance:0}});
  }

  function bindBillForm(){
    $('#billForm').addEventListener('input',()=>updateDraftFromForm(true));
    $('#billForm').addEventListener('change',()=>updateDraftFromForm(true));
    $('#billForm').addEventListener('submit',e=>{e.preventDefault();saveBillFromForm();});
    $$('[data-bill-type]').forEach(b=>b.addEventListener('click',()=>{currentBillDraft.type=b.dataset.billType; renderNewBillForm(currentBillDraft.billNo?currentBillDraft:null);}));
    $$('[data-pay-mode]').forEach(b=>b.addEventListener('click',()=>{updateDraftFromForm(false); currentBillDraft.payment.mode=b.dataset.payMode; renderNewBillForm(currentBillDraft.billNo?currentBillDraft:null);}));
  }

  function updateDraftFromForm(showPreview=true){
    if(!$('#billForm')) return;
    const x=currentBillDraft;
    x.customer={name:$('#fName').value.trim(),phone:$('#fPhone').value.trim(),address:$('#fAddress').value.trim()};
    x.device={brand:$('#fBrand').value.trim(),model:$('#fModel').value.trim(),ram:$('#fRam').value.trim(),storage:$('#fStorage').value.trim(),colour:$('#fColour').value.trim(),package:$('#fPackage').value,imei1:$('#fImei1').value.trim(),imei2:$('#fImei2').value.trim()};
    x.payment.total=Number($('#fTotal').value)||0;
    x.payment.advance=Number($('#fAdvance').value)||0;
    if($('#fEmiMonths')) x.payment.emiMonths=Number($('#fEmiMonths').value)||0;
    if($('#fEmiInterest')) x.payment.emiInterest=Number($('#fEmiInterest').value)||0;
    if($('#fEmiStart')) x.payment.emiStartDate=$('#fEmiStart').value;
    if($('#fCreditDate')) x.payment.creditDueDate=$('#fCreditDate').value;
    const bal=Math.max(0,x.payment.total-x.payment.advance);
    $('#fBalance').textContent=money(bal);
    if(showPreview) renderInvoicePreview(x);
  }

  function saveBillFromForm(){
    updateDraftFromForm(false);
    const b=normalizeBill(currentBillDraft);
    if(!b.customer.name||!b.customer.phone||!b.device.model||b.payment.total<=0){toast('Please complete customer, model and amount','error');return;}
    if(b.payment.advance>b.payment.total){toast('Advance cannot exceed total amount','error');return;}
    if(!b.billNo){
      b.billNo=nextBillNo();
      b.createdAt=new Date().toISOString();
    } else {
      const old=state.bills.find(x=>x.id===b.id);
      b.createdAt=old?.createdAt||b.createdAt;
      b.payments=old?.payments||b.payments;
    }
    b.updatedAt=new Date().toISOString();
    b.snapshot=buildInvoiceSnapshot(b);
    const idx=state.bills.findIndex(x=>x.id===b.id);
    if(idx>=0) state.bills[idx]=b; else state.bills.push(b);
    state.bills=dedupeBills(state.bills);
    persist(idx>=0?'bill-update':'bill-create');
    editingBillId=null;
    currentBillDraft=null;
    toast(idx>=0?'Bill updated successfully':'Bill saved successfully');
    billingTab='history';
    renderBilling();
  }

  function renderInvoicePreview(b){
    const snap=buildInvoiceSnapshot(normalizeBill(b));
    const rows=[
      ['Device Model',`${snap.device.brand||''} ${snap.device.model||''}`.trim()],
      ['RAM / Storage / Colour',[snap.device.ram,snap.device.storage,snap.device.colour].filter(Boolean).join(' / ')],
      ['IMEI1',snap.device.imei1||'—'],
      ['Package',snap.device.package||'—'],
      ['Payment Mode',snap.payment.mode],
      ['Amount',money(snap.payment.total)],
      ['Down Payment',money(snap.payment.advance)],
      ['Balance Due',money(snap.payment.balance)]
    ];
    $('#invoicePreview').innerHTML=invoiceMarkup(snap,rows,true);
  }

  function invoiceMarkup(s,rows,compact=false){
    const schedule=s.schedule||[];
    return `<div class="invoice-sheet ${compact?'compact':''}">
      <div class="invoice-brand"><div class="invoice-logo">SK</div><div><h2>${esc(s.shop.shopName)}</h2><p>${esc(s.shop.shopAddress).replace(/\n/g,'<br>')}</p><b>☎ ${esc(s.shop.shopPhone)}</b></div></div>
      <div class="invoice-meta"><span>Bill No: <b>${esc(s.bill.billNo||'DRAFT')}</b></span><span>Date: <b>${dmy(s.bill.date||todayISO())}</b></span></div>
      <span class="invoice-type">${esc(s.bill.type)}</span>
      <div class="invoice-customer"><b>Customer:</b> ${esc(s.customer.name)}<br><b>Phone / WhatsApp:</b> ${esc(s.customer.phone)}<br><b>Address:</b> ${esc(s.customer.address)}</div>
      <table class="invoice-table"><thead><tr><th>Description</th><th>Details</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>
      ${s.payment.mode==='Credit'?`<div class="due-box">Credit Due Date: ${dmy(s.payment.creditDueDate)}</div>`:''}
      ${s.payment.mode==='EMI'&&schedule.length?`<div class="emi-box"><h3>EMI Repayment Schedule</h3>${schedule.map(r=>`<div class="emi-row"><span>${r.n}</span><span>${dmy(r.due)}</span><b>${money(r.amount)}</b><span>${money(Math.max(0,s.payment.balance-r.amount*r.n))}</span></div>`).join('')}</div>`:''}
      <div class="terms"><b>Terms & Conditions</b><p>${esc(s.terms).replace(/\n/g,'<br>')}</p></div>
      <div class="signatures"><span>Customer Signature</span><span>For ${esc(s.shop.shopName)}<br>Authorized Signature / Seal</span></div>
    </div>`;
  }

  function renderBillHistory(){
    const root=$('#billingHistory');
    root.innerHTML=`<div class="filterbar"><input id="billSearch" placeholder="Search customer, phone, model, bill no..."><select id="billPayFilter"><option value="all">All Payments</option><option>Cash</option><option>GPay</option><option>EMI</option><option>Credit</option></select><input id="billDateFilter" type="date"></div><div id="billList" class="card-list"></div>`;
    const apply=()=>{
      const q=($('#billSearch').value||'').toLowerCase();
      const pm=$('#billPayFilter').value;
      const dt=$('#billDateFilter').value;
      const list=state.bills.filter(b=>(!q||JSON.stringify(b).toLowerCase().includes(q))&&(pm==='all'||b.payment.mode===pm)&&(!dt||b.createdAt.slice(0,10)===dt)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
      $('#billList').innerHTML=list.length?list.map(billHistoryCard).join(''):'<div class="empty">No bills found.</div>';
    };
    ['billSearch','billPayFilter','billDateFilter'].forEach(id=>$('#'+id).addEventListener('input',apply));
    apply();
  }

  function billHistoryCard(b){
    const bal=billBalance(b);
    return `<article class="data-card"><div class="data-main"><h3>${esc(b.customer.name||'Customer')}</h3><p>☎ ${esc(b.customer.phone)} • ${dmy(b.createdAt.slice(0,10))} • <span class="pill">${esc(b.payment.mode)}</span></p><strong>${money(b.payment.total)}</strong>${bal>0?`<small>Balance ${money(bal)}</small>`:'<small class="paid">Paid / Closed</small>'}</div><div class="data-actions"><button data-action="view-bill" data-id="${esc(b.id)}">👁️</button><button data-action="edit-bill" data-id="${esc(b.id)}">✏️</button>${bal>0?`<button data-action="pay-bill" data-id="${esc(b.id)}">💳</button>`:''}<button class="danger-icon" data-action="delete-bill" data-id="${esc(b.id)}">🗑️</button></div></article>`;
  }

  function openBillView(id){
    const b=state.bills.find(x=>x.id===id); if(!b)return;
    const snap=buildInvoiceSnapshot(b);
    showModal(`<div class="modal large"><div class="modal-head"><h2>🧾 Bill Details</h2><button class="icon-btn" data-close-modal>✕</button></div><div class="view-invoice">${invoiceMarkup(snap,(snap.payment.mode==='Credit'||snap.payment.mode==='EMI')?[
      ['Device Model',`${snap.device.brand} ${snap.device.model}`],['RAM / Storage / Colour',[snap.device.ram,snap.device.storage,snap.device.colour].filter(Boolean).join(' / ')],['IMEI1',snap.device.imei1||'—'],['Package',snap.device.package],['Payment Mode',snap.payment.mode],['Total Amount',money(snap.payment.total)],['Down Payment',money(snap.payment.advance)],['Balance Due',money(snap.payment.balance)]
    ]:[['Device Model',`${snap.device.brand} ${snap.device.model}`],['RAM / Storage / Colour',[snap.device.ram,snap.device.storage,snap.device.colour].filter(Boolean).join(' / ')],['IMEI1',snap.device.imei1||'—'],['Package',snap.device.package],['Payment Mode',snap.payment.mode],['Total Amount',money(snap.payment.total)],['Down Payment',money(snap.payment.advance)],['Balance Due',money(snap.payment.balance)]])}</div><div class="action-row"><button class="primary" data-action="print-bill" data-id="${esc(id)}">🖨️ Print</button><button class="secondary" data-action="download-bill" data-id="${esc(id)}">⬇️ Download</button></div><h3>💳 Payment / Receipt History</h3><div class="receipt-list">${(b.payments||[]).length?(b.payments||[]).map(p=>`<div class="receipt-row"><span>${dmy(p.at.slice(0,10))}<small>${esc(p.mode)} • Receipt ${esc(p.receiptNo)}</small></span><b>${money(p.amount)}</b><button data-action="receipt" data-id="${esc(b.id)}" data-payment="${esc(p.id)}">🧾 Receipt</button></div>`).join(''):'<div class="empty">No payments recorded.</div>'}</div></div>`);
  }

  function showModal(content){
    modalRoot.innerHTML=`<div class="modal-overlay" id="activeModal">${content}</div>`;
    $('#activeModal').addEventListener('click',e=>{if(e.target.id==='activeModal'||e.target.closest('[data-close-modal]')) closeModal();});
  }
  function closeModal(){modalRoot.innerHTML='';}

  function editBill(id){
    const b=state.bills.find(x=>x.id===id);if(!b)return;
    editingBillId=id; currentPage='billing'; billingTab='new'; currentBillDraft=structuredClone(b); render();
  }

  function deleteBill(id){
    const b=state.bills.find(x=>x.id===id); if(!b)return;
    if(!confirm(`Delete ${b.billNo}? This cannot be undone from the app.`)) return;
    state.bills=state.bills.filter(x=>x.id!==id);
    if(!state.deletedBillIds.includes(id))state.deletedBillIds.push(id);
    if(b.billNo&&!state.deletedBillNos.includes(b.billNo))state.deletedBillNos.push(b.billNo);
    persist('bill-delete');
    toast('Bill deleted permanently');
    render();
  }

  function paymentModal(id){
    const b=state.bills.find(x=>x.id===id); if(!b)return;
    const bal=billBalance(b); if(bal<=0){toast('This bill is already fully paid');return;}
    showModal(`<div class="modal"><div class="modal-head"><h2>💳 Credit / EMI Payment</h2><button class="icon-btn" data-close-modal>✕</button></div><p><b>${esc(b.customer.name)}</b> • ${esc(b.billNo)}<br>Current Balance: <strong class="danger-text">${money(bal)}</strong></p><label>Payment Amount<input id="payAmount" type="number" min="0.01" max="${bal}" value="${bal}"></label><label>Payment Mode<select id="payMode"><option>Cash</option><option>GPay</option><option>Bank</option><option>Credit Payment</option><option>EMI Payment</option></select></label><label>Note<input id="payNote" placeholder="Optional"></label><button class="primary wide" id="savePayment">💾 Save Payment</button></div>`);
    $('#savePayment').onclick=()=>{
      const amount=Number($('#payAmount').value)||0;
      if(amount<=0||amount>billBalance(b)+0.001){toast('Invalid payment amount','error');return;}
      const payment={id:uid('pay'),receiptNo:`R-${Date.now().toString().slice(-8)}`,amount,mode:$('#payMode').value,note:$('#payNote').value.trim(),at:new Date().toISOString()};
      b.payments=mergePayments(b.payments,[payment]);
      b.updatedAt=new Date().toISOString();
      b.snapshot=buildInvoiceSnapshot(b);
      persist('bill-payment');
      closeModal(); toast('Payment saved and receipt attached');
      if(currentPage==='credit')renderCredit(); else render();
    };
  }

  function receiptModal(b,pid){
    const p=b.payments.find(x=>x.id===pid);if(!p)return;
    const html=`<div class="modal"><div class="modal-head"><h2>🧾 Payment Receipt</h2><button class="icon-btn" data-close-modal>✕</button></div><div class="receipt-print" id="receiptPrint"><div class="invoice-brand"><div class="invoice-logo">SK</div><div><h2>${esc(state.settings.shopName)}</h2><p>${esc(state.settings.shopAddress).replace(/\n/g,'<br>')}</p></div></div><hr><h3>Payment Receipt</h3><p><b>Receipt No:</b> ${esc(p.receiptNo)}</p><p><b>Bill No:</b> ${esc(b.billNo)}</p><p><b>Customer:</b> ${esc(b.customer.name)}</p><p><b>Payment:</b> ${money(p.amount)}</p><p><b>Mode:</b> ${esc(p.mode)}</p><p><b>Date:</b> ${dmy(p.at.slice(0,10))}</p><p><b>Balance:</b> ${money(billBalance(b))}</p></div><div class="action-row"><button class="primary" data-action="print-receipt">🖨️ Print</button></div></div>`;
    showModal(html);
  }

  function renderCredit(){
    const groups=new Map();
    for(const b of state.bills){
      const bal=billBalance(b);
      const key=b.customer.phone||b.customer.name||b.id;
      if(!groups.has(key))groups.set(key,{name:b.customer.name,phone:b.customer.phone,bills:[],balance:0});
      const g=groups.get(key);g.bills.push(b);g.balance+=bal;
    }
    const list=[...groups.values()];
    const outstanding=list.reduce((s,g)=>s+g.balance,0);
    $('#cCustomers').textContent=list.filter(g=>g.balance>0).length;
    $('#cOutstanding').textContent=money(outstanding);
    $('#cDue').textContent=list.reduce((s,g)=>s+g.bills.filter(b=>b.payment.mode==='EMI'&&billBalance(b)>0&&emiSchedule(b).some(e=>e.due<=todayISO())).length,0);
    const renderList=()=>{
      const q=($('#creditSearch').value||'').toLowerCase(), st=$('#creditStatus').value;
      const filtered=list.filter(g=>(!q||`${g.name} ${g.phone}`.toLowerCase().includes(q))&&(st==='all'||(st==='outstanding'&&g.balance>0)||(st==='paid'&&g.balance<=0)||(st==='emi'&&g.bills.some(b=>b.payment.mode==='EMI'&&billBalance(b)>0))));
      $('#creditList').innerHTML=filtered.length?filtered.map(g=>`<article class="data-card"><div class="avatar">${esc((g.name||'?').slice(0,1).toUpperCase())}</div><div class="data-main"><h3>${esc(g.name||'Customer')}</h3><p>☎ ${esc(g.phone||'')} • ${g.bills.length} bill(s)</p><strong class="${g.balance?'danger-text':'paid'}">${money(g.balance)}</strong></div><div class="data-actions"><button data-action="credit-customer" data-phone="${esc(g.phone)}">📜 History</button>${g.balance>0?`<button data-action="pay-customer" data-phone="${esc(g.phone)}">💰 Payment</button>`:''}</div></article>`).join(''):'<div class="empty">No credit customers found.</div>';
    };
    $('#creditSearch').oninput=renderList; $('#creditStatus').onchange=renderList; renderList();
  }

  function creditCustomer(phone){
    const bills=state.bills.filter(b=>b.customer.phone===phone);
    if(!bills.length)return;
    const total=bills.reduce((s,b)=>s+Number(b.payment.total||0),0);
    const paid=bills.reduce((s,b)=>s+billPaid(b),0);
    const balance=bills.reduce((s,b)=>s+billBalance(b),0);
    showModal(`<div class="modal large"><div class="modal-head"><h2>📜 ${esc(bills[0].customer.name)} — Credit History</h2><button class="icon-btn" data-close-modal>✕</button></div><div class="metric-grid three"><div class="metric"><strong>${money(total)}</strong><small>Total</small></div><div class="metric"><strong>${money(paid)}</strong><small>Paid</small></div><div class="metric"><strong>${money(balance)}</strong><small>Balance</small></div></div><div class="receipt-list">${bills.map(b=>`<div class="credit-bill"><div><b>${esc(b.billNo)}</b><small>${dmy(b.createdAt.slice(0,10))} • ${esc(b.payment.mode)}</small></div><strong>${money(billBalance(b))}</strong><button data-action="view-bill" data-id="${esc(b.id)}">View</button></div>${(b.payments||[]).map(p=>`<div class="receipt-row sub"><span>🧾 ${esc(p.receiptNo)}<small>${esc(p.mode)} • ${dmy(p.at.slice(0,10))}</small></span><b>${money(p.amount)}</b><button data-action="receipt" data-id="${esc(b.id)}" data-payment="${esc(p.id)}">Receipt</button></div>`).join('')}`).join('')}</div></div>`);
  }

  function addCreditModal(){
    showModal(`<div class="modal"><div class="modal-head"><h2>＋ Add Credit</h2><button class="icon-btn" data-close-modal>✕</button></div><label>Customer Name *<input id="acName" required></label><label>Phone / WhatsApp<input id="acPhone"></label><label>Total Amount *<input id="acTotal" type="number" min="0"></label><label>Advance<input id="acAdvance" type="number" min="0" value="0"></label><div class="balance-box"><span>Balance</span><strong id="acBalance">₹0</strong></div><label>Date<input id="acDate" type="date" value="${todayISO()}"></label><label>EMI Start Date (optional)<input id="acEmiStart" type="date" value="${plusMonth(todayISO())}"></label><label>Details<textarea id="acDetails" placeholder="Purchase / service details"></textarea></label><button class="primary wide" id="saveCredit">💾 Save Credit</button></div>`);
    const calc=()=>{$('#acBalance').textContent=money(Math.max(0,(Number($('#acTotal').value)||0)-(Number($('#acAdvance').value)||0)));};
    $('#acTotal').oninput=calc;$('#acAdvance').oninput=calc;
    $('#saveCredit').onclick=()=>{
      const total=Number($('#acTotal').value)||0, adv=Number($('#acAdvance').value)||0;
      if(!$('#acName').value.trim()||total<=0||adv>total){toast('Enter valid credit details','error');return;}
      const b=normalizeBill({id:uid('bill'),billNo:nextBillNo(),type:'Credit Entry',createdAt:new Date(`${$('#acDate').value}T12:00:00`).toISOString(),customer:{name:$('#acName').value.trim(),phone:$('#acPhone').value.trim()},device:{model:$('#acDetails').value.trim(),package:'Credit Entry'},payment:{mode:'Credit',total,advance:adv,creditDueDate:plusMonth($('#acDate').value),emiStartDate:$('#acEmiStart').value,emiMonths:0},payments:adv>0?[{id:uid('pay'),receiptNo:`R-${Date.now().toString().slice(-8)}`,amount:adv,mode:'Advance',note:'Credit entry advance',at:new Date().toISOString()}]:[]});
      b.snapshot=buildInvoiceSnapshot(b);state.bills.push(b);persist('credit-create');closeModal();toast(adv>0?'Credit saved with advance receipt':'Credit saved');renderCredit();
    };
  }

  function payCustomer(phone){
    const b=state.bills.filter(x=>x.customer.phone===phone).find(x=>billBalance(x)>0);
    if(b)paymentModal(b.id); else toast('No outstanding bill');
  }

  function renderRepair(){
    $('#repairCount').textContent=state.repairs.filter(r=>!['Completed','Delivered','Cancelled'].includes(r.status)).length;
    $('#repairJobsView').classList.toggle('hidden',repairTab!=='jobs');
    $('#repairHistoryView').classList.toggle('hidden',repairTab!=='history');
    if(repairTab==='jobs'){
      const list=state.repairs.filter(r=>!['Completed','Delivered','Cancelled'].includes(r.status));
      $('#repairJobsView').innerHTML=`<div class="card-list">${list.length?list.map(repairDataCard).join(''):'<div class="empty">No pending repair jobs.</div>'}</div>`;
    } else {
      $('#repairHistoryView').innerHTML=`<div class="filterbar"><input id="repairSearch" placeholder="Search customer / phone / model..."></div><div id="repairHistoryList" class="card-list"></div>`;
      const apply=()=>{const q=($('#repairSearch').value||'').toLowerCase();const list=state.repairs.filter(r=>JSON.stringify(r).toLowerCase().includes(q)).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));$('#repairHistoryList').innerHTML=list.length?list.map(repairDataCard).join(''):'<div class="empty">No repair jobs.</div>';};
      $('#repairSearch').oninput=apply;apply();
    }
  }

  function repairDataCard(r){
    return `<article class="data-card"><div class="data-main"><h3>🔧 ${esc(r.customer)}</h3><p>☎ ${esc(r.phone)} • ${esc(r.model)} • ${esc(r.workType)}</p><small>Received: ${dmy(r.receivedDate)}</small><strong>${money(r.estimate)} • ${esc(r.status)}</strong></div><div class="data-actions"><button data-action="edit-repair" data-id="${esc(r.id)}">✏️</button><button data-action="view-repair" data-id="${esc(r.id)}">👁️</button><button class="danger-icon" data-action="delete-repair" data-id="${esc(r.id)}">🗑️</button></div></article>`;
  }

  function repairModal(id=null){
    const r=id?state.repairs.find(x=>x.id===id):null;
    showModal(`<div class="modal"><div class="modal-head"><h2>🔧 ${r?'Edit':'New'} Repair Job</h2><button class="icon-btn" data-close-modal>✕</button></div><form id="repairForm"><div class="form-grid two"><label>Customer Name<input id="rName" value="${esc(r?.customer||'')}" required></label><label>Phone<input id="rPhone" value="${esc(r?.phone||'')}" required></label></div><div class="form-grid two"><label>Model<input id="rModel" value="${esc(r?.model||'')}" required></label><label>IMEI<input id="rImei" value="${esc(r?.imei||'')}"></label></div><label>Work Type<select id="rType"><option ${r?.workType==='Urgent'?'selected':''}>Urgent</option><option ${r?.workType==='Normal'?'selected':''}>Normal</option></select></label><label>Problem / Repair Details<textarea id="rProblem">${esc(r?.problem||'')}</textarea></label><div class="form-grid two"><label>Received Date<input id="rDate" type="date" value="${r?.receivedDate||todayISO()}"></label><label>Estimate<input id="rEstimate" type="number" value="${r?.estimate||0}"></label></div><label>Status<select id="rStatus">${['Received','Diagnosing','Waiting Parts','Ready','Delivered','Cancelled'].map(s=>`<option ${r?.status===s?'selected':''}>${s}</option>`).join('')}</select></label><label>Note<textarea id="rNote">${esc(r?.note||'')}</textarea></label><button class="primary wide" type="submit">💾 ${r?'Update':'Save'} Repair Job</button></form></div>`);
    $('#repairForm').onsubmit=e=>{
      e.preventDefault();
      const data={id:r?.id||uid('repair'),customer:$('#rName').value.trim(),phone:$('#rPhone').value.trim(),model:$('#rModel').value.trim(),imei:$('#rImei').value.trim(),workType:$('#rType').value,problem:$('#rProblem').value.trim(),receivedDate:$('#rDate').value||todayISO(),estimate:Number($('#rEstimate').value)||0,status:$('#rStatus').value,note:$('#rNote').value.trim(),createdAt:r?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
      if(!data.customer||!data.phone||!data.model){toast('Enter customer, phone and model','error');return;}
      const idx=state.repairs.findIndex(x=>x.id===data.id);if(idx>=0)state.repairs[idx]=data;else state.repairs.push(data);
      persist(idx>=0?'repair-update':'repair-create');closeModal();toast(idx>=0?'Repair updated':'Repair saved');renderRepair();
    };
  }

  function viewRepair(id){
    const r=state.repairs.find(x=>x.id===id);if(!r)return;
    showModal(`<div class="modal"><div class="modal-head"><h2>🔧 Repair Job</h2><button class="icon-btn" data-close-modal>✕</button></div><div class="detail-grid"><b>Customer</b><span>${esc(r.customer)}</span><b>Phone</b><span>${esc(r.phone)}</span><b>Model</b><span>${esc(r.model)}</span><b>IMEI</b><span>${esc(r.imei||'—')}</span><b>Work</b><span>${esc(r.workType)}</span><b>Received</b><span>${dmy(r.receivedDate)}</span><b>Status</b><span>${esc(r.status)}</span><b>Estimate</b><span>${money(r.estimate)}</span><b>Problem</b><span>${esc(r.problem)}</span><b>Note</b><span>${esc(r.note||'')}</span></div></div>`);
  }

  function deleteRepair(id){
    if(!confirm('Delete this repair job?'))return;
    state.repairs=state.repairs.filter(r=>r.id!==id);persist('repair-delete');toast('Repair job deleted');renderRepair();
  }

  function renderInventory(){
    const apply=()=>{
      const q=($('#stockSearch').value||'').toLowerCase(), f=$('#stockFilter').value;
      const list=state.inventory.filter(i=>(!q||JSON.stringify(i).toLowerCase().includes(q))&&(f==='all'||(f==='low'&&i.stock<=i.low)||(f==='out'&&i.stock<=0)));
      $('#inventoryList').innerHTML=list.length?list.map(i=>`<article class="data-card"><div class="data-main"><h3>${esc(i.name)}</h3><p>${esc(i.category||'Product')} • ${esc(i.model||'')}</p><strong>Stock: ${i.stock}</strong></div><div class="data-actions"><button data-action="edit-product" data-id="${esc(i.id)}">✏️</button><button class="danger-icon" data-action="delete-product" data-id="${esc(i.id)}">🗑️</button></div></article>`).join(''):'<div class="empty">No products.</div>';
    };
    $('#stockSearch').oninput=apply;$('#stockFilter').onchange=apply;apply();
  }

  function productModal(id=null){
    const p=id?state.inventory.find(x=>x.id===id):null;
    showModal(`<div class="modal"><div class="modal-head"><h2>📦 ${p?'Edit':'New'} Product</h2><button class="icon-btn" data-close-modal>✕</button></div><form id="productForm"><label>Product / Model<input id="pName" value="${esc(p?.name||'')}" required></label><label>Category<input id="pCat" value="${esc(p?.category||'')}"></label><label>Stock<input id="pStock" type="number" min="0" value="${p?.stock??0}"></label><label>Low Stock Threshold<input id="pLow" type="number" min="0" value="${p?.low??2}"></label><button class="primary wide">💾 Save Product</button></form></div>`);
    $('#productForm').onsubmit=e=>{e.preventDefault();const x={id:p?.id||uid('prod'),name:$('#pName').value.trim(),category:$('#pCat').value.trim(),stock:Number($('#pStock').value)||0,low:Number($('#pLow').value)||0};const i=state.inventory.findIndex(z=>z.id===x.id);if(i>=0)state.inventory[i]=x;else state.inventory.push(x);persist('inventory-save');closeModal();toast('Product saved');renderInventory();};
  }

  function deleteProduct(id){if(!confirm('Delete product?'))return;state.inventory=state.inventory.filter(x=>x.id!==id);persist('inventory-delete');toast('Product deleted');renderInventory();}

  function renderBackup(){
    // template already contains controls; no extra work.
  }

  function exportBackup(){
    const payload={format:'SKM-V6-BACKUP',version:VERSION,exportedAt:new Date().toISOString(),state};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`SK_Mobiles_V6_Backup_${todayISO()}.json`;a.click();URL.revokeObjectURL(a.href);toast('JSON backup downloaded');
  }

  async function restoreBackup(){
    const input=$('#restoreInput'), file=input?.files?.[0];if(!file){toast('Select a JSON backup first','error');return;}
    try{
      const text=await file.text(), payload=JSON.parse(text);
      if(payload.format!=='SKM-V6-BACKUP'||!payload.state)throw new Error('Invalid V6 backup');
      if(!confirm('Restore this backup? Current V6 data will be replaced.'))return;
      state=JSON.parse(JSON.stringify(payload.state));
      state.bills=dedupeBills(Array.isArray(state.bills)?state.bills:[]);
      persist('backup-restore');toast('Backup restored');render();
    }catch(e){toast(`Restore failed: ${e.message}`,'error');}
  }

  function printHtml(html){
    const w=window.open('','_blank','noopener,noreferrer,width=900,height=900');
    if(!w){toast('Allow pop-ups to print','error');return;}
    w.document.write(`<!doctype html><html><head><title>SK MOBILES Invoice</title><meta name="viewport" content="width=device-width"><style>${printStyles()}</style></head><body>${html}</body></html>`);
    w.document.close();w.focus();setTimeout(()=>w.print(),300);
  }

  function printBill(id){
    const b=state.bills.find(x=>x.id===id);if(!b)return;
    const s=buildInvoiceSnapshot(b);
    const rows=[['Device Model',`${s.device.brand} ${s.device.model}`],['RAM / Storage / Colour',[s.device.ram,s.device.storage,s.device.colour].filter(Boolean).join(' / ')],['IMEI1',s.device.imei1||'—'],['Package',s.device.package],['Payment Mode',s.payment.mode],['Amount',money(s.payment.total)],['Down Payment',money(s.payment.advance)],['Balance Due',money(s.payment.balance)]];
    printHtml(invoiceMarkup(s,rows));
  }

  function downloadBill(id){
    const b=state.bills.find(x=>x.id===id);if(!b)return;
    // Browser-native PDF path: open the exact same print document, then Save as PDF.
    printBill(id);
    toast('In print window choose “Save as PDF”');
  }

  function printDraft(){
    if(!currentBillDraft)return;
    updateDraftFromForm(false);
    const b=normalizeBill(currentBillDraft);if(!b.billNo)b.billNo='DRAFT';
    const s=buildInvoiceSnapshot(b);const rows=[['Device Model',`${s.device.brand} ${s.device.model}`],['RAM / Storage / Colour',[s.device.ram,s.device.storage,s.device.colour].filter(Boolean).join(' / ')],['IMEI1',s.device.imei1||'—'],['Package',s.device.package],['Payment Mode',s.payment.mode],['Amount',money(s.payment.total)],['Down Payment',money(s.payment.advance)],['Balance Due',money(s.payment.balance)]];
    printHtml(invoiceMarkup(s,rows));
  }

  function printStyles(){return `
    *{box-sizing:border-box}body{margin:0;background:#fff;color:#172033;font:14px Arial,sans-serif}.invoice-sheet{width:100%;max-width:760px;margin:0 auto;padding:24px;background:#fff}.invoice-brand{display:flex;gap:16px;align-items:center;border-bottom:1px solid #dce3ef;padding-bottom:16px}.invoice-logo{width:78px;height:78px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid #e11d48;color:#e11d48;font-weight:900;font-size:25px;box-shadow:0 3px 12px #bbb}.invoice-brand h2{margin:0;color:#d81b68;font-size:28px}.invoice-brand p{margin:5px 0;white-space:pre-line;line-height:1.4}.invoice-meta{display:flex;justify-content:space-between;background:#f7f8fc;border:1px solid #dce3ef;border-radius:8px;padding:9px;margin:12px 0}.invoice-type{display:inline-block;padding:6px 12px;background:#f59e0b;color:#111;border-radius:18px;font-weight:800;margin-bottom:10px}.invoice-customer{background:#f5f8fb;border:1px solid #dce3ef;border-radius:10px;padding:12px;margin-bottom:12px}.invoice-table{width:100%;border-collapse:collapse}.invoice-table th,.invoice-table td{padding:8px;border-bottom:1px solid #dce3ef;text-align:left}.invoice-table th{background:#eef3f9}.invoice-table td:last-child,.invoice-table th:last-child{text-align:right}.due-box{margin-top:12px;padding:10px;border:1px solid #fca5a5;background:#fee2e2;border-radius:10px;color:#b91c1c}.emi-box{margin-top:14px;border:2px solid #fde68a;border-radius:12px;padding:10px}.emi-box h3{margin:0 0 8px;color:#92400e}.emi-row{display:grid;grid-template-columns:35px 1fr 100px 100px;padding:8px;border-bottom:1px solid #e5e7eb}.terms{margin-top:20px;border-top:1px solid #dce3ef;padding-top:12px;font-size:11px}.signatures{display:flex;justify-content:space-between;margin-top:40px;font-size:11px;text-align:center}.signatures span{min-width:180px;border-top:1px solid #999;padding-top:6px}@page{size:A4;margin:10mm}@media print{.invoice-sheet{max-width:none;padding:0}.emi-box{break-inside:avoid}.invoice-table{break-inside:avoid}}`;
  }

  document.addEventListener('click',e=>{
    const page=e.target.closest('[data-page]');if(page&&!page.closest('#drawer')){go(page.dataset.page);return;}
    const nav=e.target.closest('.nav-btn');if(nav){go(nav.dataset.page);return;}
    const act=e.target.closest('[data-action]');if(!act)return;
    const a=act.dataset.action,id=act.dataset.id;
    if(a==='new-bill'){currentBillDraft=null;editingBillId=null;go('billing');billingTab='new';renderBilling();}
    if(a==='view-bill')openBillView(id);
    if(a==='edit-bill')editBill(id);
    if(a==='delete-bill')deleteBill(id);
    if(a==='pay-bill')paymentModal(id);
    if(a==='receipt'){const b=state.bills.find(x=>x.id===id);receiptModal(b,act.dataset.payment);}
    if(a==='print-bill')printBill(id);
    if(a==='download-bill')downloadBill(id);
    if(a==='print-draft')printDraft();
    if(a==='download-draft')printDraft();
    if(a==='clear-bill'){currentBillDraft=emptyBill();renderNewBillForm();}
    if(a==='add-credit')addCreditModal();
    if(a==='credit-payment'){const b=state.bills.find(x=>billBalance(x)>0);if(b)paymentModal(b.id);else toast('No outstanding credit');}
    if(a==='credit-customer')creditCustomer(act.dataset.phone);
    if(a==='pay-customer')payCustomer(act.dataset.phone);
    if(a==='new-repair')repairModal();
    if(a==='edit-repair')repairModal(id);
    if(a==='view-repair')viewRepair(id);
    if(a==='delete-repair')deleteRepair(id);
    if(a==='new-product')productModal();
    if(a==='edit-product')productModal(id);
    if(a==='delete-product')deleteProduct(id);
    if(a==='export-backup')exportBackup();
    if(a==='restore-backup')restoreBackup();
    if(a==='print-receipt'){const el=$('#receiptPrint');if(el)printHtml(el.outerHTML);}
  });

  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-bill-tab]');
    if(tab){billingTab=tab.dataset.billTab;$$('[data-bill-tab]').forEach(x=>x.classList.toggle('active',x===tab));renderBilling();}
    const rt=e.target.closest('[data-repair-tab]');
    if(rt){repairTab=rt.dataset.repairTab;$$('[data-repair-tab]').forEach(x=>x.classList.toggle('active',x===rt));renderRepair();}
  });

  $('#menuBtn').onclick=()=>{ $('#drawer').classList.add('open');$('#drawerShade').classList.add('open'); };
  $('#drawerClose').onclick=closeDrawer; $('#drawerShade').onclick=closeDrawer;
  function closeDrawer(){$('#drawer').classList.remove('open');$('#drawerShade').classList.remove('open');}
  $('#settingsBtn').onclick=()=>{
    showModal(`<div class="modal"><div class="modal-head"><h2>⚙️ Settings</h2><button class="icon-btn" data-close-modal>✕</button></div><label>Shop Name<input id="sName" value="${esc(state.settings.shopName)}"></label><label>Address<textarea id="sAddress">${esc(state.settings.shopAddress)}</textarea></label><label>Phone<input id="sPhone" value="${esc(state.settings.shopPhone)}"></label><label>Terms & Conditions<textarea id="sTerms">${esc(state.settings.terms)}</textarea></label><button class="primary wide" id="saveSettings">Save Settings</button></div>`);
    $('#saveSettings').onclick=()=>{state.settings.shopName=$('#sName').value.trim()||'SK MOBILES';state.settings.shopAddress=$('#sAddress').value;state.settings.shopPhone=$('#sPhone').value;state.settings.terms=$('#sTerms').value;persist('settings');closeModal();toast('Settings saved');};
  };

  render();
})();