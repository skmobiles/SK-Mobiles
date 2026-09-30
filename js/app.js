/* --- HELPER FUNCTIONS --- */
function skISOToDMY(d) {
  if (!d) return '';
  const parts = d.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : d;
}
function skDateToISO(d) {
  if (!d) return '';
  const parts = d.split('/');
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : d;
}
function skDateTimeToISO(dt) { return dt || ''; }
function skISOToDMYTime(dt) { return dt || ''; }

function skOpenCreditLedger() {
  if (typeof switchBillTab === 'function') {
    toggleModal('billingModal', true);
    switchBillTab('history');
    const filter = document.getElementById('billHistoryPayFilter');
    if (filter) {
      filter.value = 'Credit';
      renderBillHistory();
    }
  }
}


window.skV43CloudSync = function() {
  console.log("SK Cloud sync triggered.");
};

const MASTER_INVENTORY = [
  {
    id: "SK-EXC-110",
    title: "6.90 | Punch Center | UV (3 Models)",
    category: "glass",
    subType: "uv",
    spec: "Punch Center",
    stock: 15,
    ordered: false,
    note: "Size: 6.9 | Type: Curved / Edge | UV: UV",
    models: ["Galaxy S20 Ultra", "Galaxy Note 20 Ultra", "Galaxy S25 Ultra"]
  },
  {
    id: "SK-EXC-109",
    title: "6.90 | Punch Center | Normal (1 Models)",
    category: "glass",
    subType: "11d",
    spec: "Punch Center",
    stock: 15,
    ordered: false,
    note: "Size: 6.9 | Type: Flat | UV: Normal",
    models: ["Galaxy S26 Ultra"]
  },
  {
    id: "SK-EXC-108",
    title: "6.90 | Dynamic Island | Normal (3 Models)",
    category: "glass",
    subType: "11d",
    spec: "Dynamic Island",
    stock: 15,
    ordered: false,
    note: "Size: 6.9 | Type: Flat | UV: Normal",
    models: ["iPhone 16 Pro Max", "iPhone 17 Pro Max", "iPhone 18 Pro Max"]
  }
];

let currentPayMode = 'Cash';
let inventory = [];
let currentFilter = 'home';
let currentSearchTerm = '';
let ordersList = [];
let savedBills = [];

window.addEventListener('DOMContentLoaded', () => {
  loadInitialData();
  applyShopConfig();
  applySavedLogo();
  restoreDraft();
  loadRepairSparesNote();
  renderCards();
  updateOrderBadge();
  updateBillHistoryCount();
  
  const currentTheme = localStorage.getItem('sk_theme') || 'light';
  setTheme(currentTheme);
});

function loadInitialData() {
  const storedInv = localStorage.getItem('sk_inventory');
  if (storedInv) {
    inventory = JSON.parse(storedInv);
  } else {
    inventory = JSON.parse(JSON.stringify(MASTER_INVENTORY));
    saveInventory();
  }

  const storedOrders = localStorage.getItem('sk_orders');
  if (storedOrders) ordersList = JSON.parse(storedOrders);

  const storedBills = localStorage.getItem('sk_bills');
  if (storedBills) {
    let rawBills = Array.isArray(JSON.parse(storedBills)) ? JSON.parse(storedBills) : [];
    const seenIds = new Set();
    savedBills = rawBills.filter(b => {
      if (!b || typeof b !== 'object') return false;
      if (!b.id) b.id = `SK-B-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
      if (seenIds.has(String(b.id))) return false;
      seenIds.add(String(b.id));
      b.price = Number(b.price || 0);
      b.advance = Number(b.advance || 0);
      b.balance = Number.isFinite(Number(b.balance)) ? Number(b.balance) : Math.max(0, b.price - b.advance);
      if (!Array.isArray(b.payments)) b.payments = [];
      return true;
    });
    localStorage.setItem('sk_bills', JSON.stringify(savedBills));
  }
}

function saveInventory() {
  localStorage.setItem('sk_inventory', JSON.stringify(inventory));
}

function saveOrders() {
  localStorage.setItem('sk_orders', JSON.stringify(ordersList));
  updateOrderBadge();
}

function handleInputClear(el) {
  el.value = '';
}

function loadRepairSparesNote() {
  const savedNote = localStorage.getItem('sk_repair_tools_note');
  if (savedNote && document.getElementById('repairSparesNoteInput')) {
    document.getElementById('repairSparesNoteInput').value = savedNote;
  }
}

function saveRepairSparesNote() {
  const note = document.getElementById('repairSparesNoteInput').value;
  localStorage.setItem('sk_repair_tools_note', note);
  showToast("Repair Tools & IC notes saved!");
  toggleModal('repairSparesModal', false);
}

function shareRepairNotesWhatsApp() {
  const note = document.getElementById('repairSparesNoteInput').value.trim();
  if (!note) {
    showToast("Notes empty-ah irukku!");
    return;
  }
  const msg = `*SK MOBILES - Repair Tools & IC Spares Required:*\n\n${note}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function handleBillingModalClose() {
  if (typeof saveDraft === 'function') saveDraft();
  toggleModal('billingModal', false);
}

function handleNewBillClick() {
  document.getElementById('usedMobileBillingForm').reset();
  document.getElementById('billAdvance').value = "0";
  document.getElementById('billEmiMonths').value = "3";
  document.getElementById('billEmiInterest').value = "0";
  selectPayMode('Cash');
  clearDraft();
  updateBillPreview();
  switchBillTab('new');
  showToast("New bill opened!");
}

function autoSaveCurrentFormSilently(allowCloseSave = false) {
  const custName = document.getElementById('billCustName').value.trim();
  const model = document.getElementById('billModel').value.trim();
  const price = parseFloat(document.getElementById('billTotalPrice').value) || 0;
  const phone = document.getElementById('billCustPhone').value.trim();
  const brand = document.getElementById('billBrand').value.trim();
  const hasBillData = custName || phone || brand || model || price > 0 ||
    document.getElementById('billImei1').value.trim() ||
    document.getElementById('billImei2').value.trim();

  if ((custName && model && price > 0) || (allowCloseSave && hasBillData)) {
    const newEntry = {
      id: localStorage.getItem('sk_v49_current_bill_no') || `SK-B-${Date.now().toString().slice(-6)}`,
      billNo: localStorage.getItem('sk_v49_current_bill_no') || '',
      date: new Date().toLocaleDateString('en-IN'),
      custName,
      phone: document.getElementById('billCustPhone').value || '',
      address: document.getElementById('billCustAddress').value || '',
      brand: document.getElementById('billBrand').value || '',
      model,
      ram: document.getElementById('billRam').value || '',
      storage: document.getElementById('billStorage').value || '',
      color: document.getElementById('billColor').value || '',
      imei1: document.getElementById('billImei1').value || '',
      billType: localStorage.getItem('sk_v49_current_bill_type') || 'New Mobile',
      payMode: currentPayMode,
      price: price,
      advance: parseFloat(document.getElementById('billAdvance').value) || 0,
      balance: parseFloat(document.getElementById('billBalanceDisplay')?.innerText.replace(/\D/g,'')) || 0,
      creditDueDate: document.getElementById('billCreditDate')?.value || '',
      payments: [],
      emiHtml: currentPayMode === 'EMI' ? document.getElementById('pvEmiScheduleTbody').innerHTML : ''
    };

    const billId = String(newEntry.id);
    const existingIndex = savedBills.findIndex(b => String(b.id) === billId);
    if (existingIndex >= 0) {
      const old = savedBills[existingIndex];
      newEntry.payments = Array.isArray(old.payments) ? old.payments : [];
      savedBills[existingIndex] = { ...old, ...newEntry, payments: newEntry.payments };
    } else {
      savedBills.unshift(newEntry);
    }
    localStorage.setItem('sk_bills', JSON.stringify(savedBills));
    updateBillHistoryCount();
    clearDraft();
  }
}

function saveShopCustomConfig() {
  const name = document.getElementById('cfgShopName').value.trim() || 'SK MOBILES';
  const addr = document.getElementById('cfgShopAddress').value.trim();
  const phone = document.getElementById('cfgShopPhone').value.trim();

  localStorage.setItem('sk_shop_name', name);
  localStorage.setItem('sk_shop_addr', addr);
  localStorage.setItem('sk_shop_phone', phone);

  applyShopConfig();
  showToast("Shop Profile updated!");
}

function saveCustomTerms() {
  const terms = document.getElementById('cfgTermsConditions').value;
  localStorage.setItem('sk_terms', terms);
  updateBillPreview();
  showToast("Terms updated!");
}

function resetDefaultTerms() {
  const defaultTerms = 
`1. Sold items are not returnable.
2. 7 Days Testing Warranty only.
3. No warranty for physical or liquid damage.
4. Customer has checked the IMEI and device condition before purchase.`;
  document.getElementById('cfgTermsConditions').value = defaultTerms;
  localStorage.setItem('sk_terms', defaultTerms);
  updateBillPreview();
  showToast("Reset to default terms!");
}

function applyShopConfig() {
  const name = localStorage.getItem('sk_shop_name') || 'SK MOBILES';
  const addr = localStorage.getItem('sk_shop_addr') || 'Shree Sai Complex, Salem Main Rd,\nOld Quarters Bus Stop, Old Quarters,\nDharmapuri, Tamil Nadu 636705 .';
  const phone = localStorage.getItem('sk_shop_phone') || '766 766 6362';

  if (document.getElementById('cfgShopName')) document.getElementById('cfgShopName').value = name;
  if (document.getElementById('cfgShopAddress')) document.getElementById('cfgShopAddress').value = addr;
  if (document.getElementById('cfgShopPhone')) document.getElementById('cfgShopPhone').value = phone;

  if (document.getElementById('appHeaderTitle')) document.getElementById('appHeaderTitle').innerText = name;
  if (document.getElementById('pvShopNameDisplay')) document.getElementById('pvShopNameDisplay').innerText = name;
  if (document.getElementById('pvShopAddressDisplay')) document.getElementById('pvShopAddressDisplay').innerHTML = addr.replace(/\n/g, '<br>');
  if (document.getElementById('pvShopPhoneDisplay')) document.getElementById('pvShopPhoneDisplay').innerText = phone;

  const threshold = localStorage.getItem('sk_low_threshold') || '3';
  if (document.getElementById('cfgLowStockThreshold')) document.getElementById('cfgLowStockThreshold').value = threshold;
  if (document.getElementById('pillLowStockVal')) document.getElementById('pillLowStockVal').innerText = threshold;

  const terms = localStorage.getItem('sk_terms');
  if (terms && document.getElementById('cfgTermsConditions')) document.getElementById('cfgTermsConditions').value = terms;
}

function saveLowStockThreshold(val) {
  const v = Math.max(1, parseInt(val) || 3);
  localStorage.setItem('sk_low_threshold', v);
  const pill = document.getElementById('pillLowStockVal');
  if (pill) pill.innerText = v;
  renderCards();
  showToast("Low stock limit: " + v);
}

function uploadShopLogo(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const logoData = e.target.result;
      localStorage.setItem('sk_custom_logo', logoData);
      applySavedLogo();
      showToast("Logo updated successfully!");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function resetShopLogo() {
  localStorage.removeItem('sk_custom_logo');
  applySavedLogo();
  showToast("Reset to default Logo.png!");
}

function applySavedLogo() {
  const savedLogo = localStorage.getItem('sk_custom_logo') || 'Logo.png';
  const headerLogo = document.getElementById('appHeaderLogo');
  const invoiceLogo = document.getElementById('invoiceLogoImg');
  const previewLogo = document.getElementById('settingsLogoPreview');

  if (headerLogo) headerLogo.src = savedLogo;
  if (invoiceLogo) invoiceLogo.src = savedLogo;
  if (previewLogo) previewLogo.src = savedLogo;
}

function toggleModal(modalId, show) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  if (show) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    if (modalId === 'orderModal') renderOrders();
    if (modalId === 'repairSparesModal') loadRepairSparesNote();
    if (modalId === 'billingModal') {
      switchBillTab('new');
      restoreDraft();
      updateBillPreview();
    }
  } else {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    if (modalId === 'viewBillModal') {
      toggleModal('billingModal', true);
    }
  }
}

function toggleLeftDrawer(show) {
  const drawer = document.getElementById('leftDrawer');
  if (drawer) {
    if (show) drawer.classList.add('active');
    else drawer.classList.remove('active');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2200);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sk_theme', theme);
  showToast("Theme applied: " + theme.toUpperCase());
}

function saveDraft() {
  const draft = {
    custName: document.getElementById('billCustName')?.value || '',
    phone: document.getElementById('billCustPhone')?.value || '',
    address: document.getElementById('billCustAddress')?.value || '',
    brand: document.getElementById('billBrand')?.value || '',
    model: document.getElementById('billModel')?.value || '',
    ram: document.getElementById('billRam')?.value || '',
    storage: document.getElementById('billStorage')?.value || '',
    color: document.getElementById('billColor')?.value || '',
    package: document.getElementById('billPackage')?.value || 'Full Kit (Box + Charger + Bill)',
    imei1: document.getElementById('billImei1')?.value || '',
    imei2: document.getElementById('billImei2')?.value || '',
    payMode: currentPayMode,
    price: document.getElementById('billTotalPrice')?.value || '',
    advance: document.getElementById('billAdvance')?.value || '0',
    emiMonths: document.getElementById('billEmiMonths')?.value || '3',
    emiInterest: document.getElementById('billEmiInterest')?.value || '0',
    emiStartDate: document.getElementById('billEmiStartDate')?.value || '',
    creditDate: document.getElementById('billCreditDate')?.value || ''
  };
  localStorage.setItem('sk_bill_draft', JSON.stringify(draft));
}

function restoreDraft() {
  const draftStr = localStorage.getItem('sk_bill_draft');
  if (!draftStr) return;
  try {
    const d = JSON.parse(draftStr);
    if (document.getElementById('billCustName')) document.getElementById('billCustName').value = d.custName || '';
    if (document.getElementById('billCustPhone')) document.getElementById('billCustPhone').value = d.phone || '';
    if (document.getElementById('billCustAddress')) document.getElementById('billCustAddress').value = d.address || '';
    if (document.getElementById('billBrand')) document.getElementById('billBrand').value = d.brand || '';
    if (document.getElementById('billModel')) document.getElementById('billModel').value = d.model || '';
    if (document.getElementById('billRam')) document.getElementById('billRam').value = d.ram || '';
    if (document.getElementById('billStorage')) document.getElementById('billStorage').value = d.storage || '';
    if (document.getElementById('billColor')) document.getElementById('billColor').value = d.color || '';
    if (document.getElementById('billPackage')) document.getElementById('billPackage').value = d.package || 'Full Kit (Box + Charger + Bill)';
    if (document.getElementById('billImei1')) document.getElementById('billImei1').value = d.imei1 || '';
    if (document.getElementById('billImei2')) document.getElementById('billImei2').value = d.imei2 || '';
    if (document.getElementById('billTotalPrice')) document.getElementById('billTotalPrice').value = d.price || '';
    if (document.getElementById('billAdvance')) document.getElementById('billAdvance').value = d.advance || '0';
    if (document.getElementById('billEmiMonths')) document.getElementById('billEmiMonths').value = d.emiMonths || '3';
    if (document.getElementById('billEmiInterest')) document.getElementById('billEmiInterest').value = d.emiInterest || '0';
    if (document.getElementById('billEmiStartDate')) document.getElementById('billEmiStartDate').value = d.emiStartDate || '';
    if (document.getElementById('billCreditDate')) document.getElementById('billCreditDate').value = d.creditDate || '';

    if (d.payMode) selectPayMode(d.payMode);
    calculateBillMath();
  } catch (e) {}
}

function clearDraft() {
  localStorage.removeItem('sk_bill_draft');
}

function parseSmartDate(str) {
  if (!str) return '';
  let clean = str.trim().replace(/[-.]/g, '/');
  let d, m, y;

  if (clean.includes('/')) {
    let parts = clean.split('/');
    if (parts.length === 3) {
      d = parseInt(parts[0], 10);
      m = parseInt(parts[1], 10);
      y = parseInt(parts[2], 10);
    }
  } else {
    let digits = clean.replace(/\D/g, '');
    if (digits.length === 4) {
      d = parseInt(digits.slice(0, 1), 10);
      m = parseInt(digits.slice(1, 2), 10);
      y = parseInt(digits.slice(2, 4), 10);
    } else if (digits.length === 5) {
      d = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 3), 10);
      y = parseInt(digits.slice(3, 5), 10);
    } else if (digits.length === 6) {
      d = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10);
      y = parseInt(digits.slice(4, 6), 10);
    } else if (digits.length === 8) {
      d = parseInt(digits.slice(0, 2), 10);
      m = parseInt(digits.slice(2, 4), 10);
      y = parseInt(digits.slice(4, 8), 10);
    }
  }

  if (!d || !m || !y) return str;
  if (y < 100) y = 2000 + y;

  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

function handleSmartDateInput(input) {
  const formatted = parseSmartDate(input.value);
  if (formatted) input.value = formatted;
}

function openModelsPopup(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;

  document.getElementById('modalModelTitle').innerText = item.title;
  document.getElementById('modalModelSubtitle').innerText = `${item.models.length} Compatible Models (Stock: ${item.stock} pcs):`;
  
  const container = document.getElementById('modalModelsContainer');
  container.innerHTML = item.models.map(m => `<span class="model-chip" style="font-size:0.75rem; padding:5px 10px;">${m}</span>`).join('');
  
  toggleModal('modelsModal', true);
}

function selectPillCenter(btn) {
  const scrollContainer = document.getElementById('catScroll');
  if (scrollContainer && btn) {
    scrollContainer.scrollTo({
      left: btn.offsetLeft - scrollContainer.offsetWidth / 2 + btn.offsetWidth / 2,
      behavior: 'smooth'
    });
  }
}

let draggedElement = null;

function handleCardDragStart(e) {
  draggedElement = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleCardDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const targetCard = e.currentTarget;
  if (targetCard && targetCard !== draggedElement && targetCard.parentNode === draggedElement.parentNode) {
    targetCard.classList.add('drag-over');
  }
}

function handleCardDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleCardDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  const targetCard = e.currentTarget;
  targetCard.classList.remove('drag-over');
  if (draggedElement && targetCard && draggedElement !== targetCard && targetCard.parentNode === draggedElement.parentNode) {
    const parent = targetCard.parentNode;
    const allCards = Array.from(parent.querySelectorAll('.draggable-card'));
    const draggedIndex = allCards.indexOf(draggedElement);
    const targetIndex = allCards.indexOf(targetCard);

    if (draggedIndex < targetIndex) {
      parent.insertBefore(draggedElement, targetCard.nextSibling);
    } else {
      parent.insertBefore(draggedElement, targetCard);
    }
  }
}

function handleCardDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('.draggable-card').forEach(c => c.classList.remove('drag-over'));
  draggedElement = null;
}

function renderCards() {
  const container = document.getElementById('cardsContainer');
  if (!container) return;
  const searchRow = document.getElementById('headerSearchRow');
  const catScroll = document.getElementById('catScroll');

  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
  if (currentFilter === 'home') {
    document.getElementById('navHome')?.classList.add('active');
    if (searchRow) searchRow.style.display = 'none';
    if (catScroll) catScroll.style.display = 'none';
    
    container.innerHTML = `
      <div style="width: 100%; min-height: 78px; background: linear-gradient(135deg, #eef6ff 0%, #dbeafe 100%); border: 1.5px solid #bfdbfe; border-radius: 18px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(37,99,235,0.06); box-sizing: border-box;">
        <div>
          <div style="font-size: 10px; color: #3b82f6; font-weight: 800; text-transform: uppercase; margin-bottom: 2px;">Welcome to</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 950; line-height: 1.15;">
            <span style="background:var(--sk-shop-brand-gradient); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">SK Mobiles</span> Master
          </div>
          <div style="font-size: 11.5px; color: #64748b; margin-top: 3px; font-weight: 600;">Inventory &amp; Billing Panel</div>
        </div>
        <div style="font-size: 2.2rem; background: #ffffff; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(37,99,235,0.12); flex-shrink: 0;">📱</div>
      </div>

      <div id="homeMetricGrid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;">
        <div class="draggable-card" data-card-id="metric-stock" draggable="true" style="min-height: 82px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 10px 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="currentFilter='glass'; renderCards();">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(37,99,235,0.1); display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">📦</div>
            <div>
              <div style="font-size: 12px; color: var(--text-muted); font-weight: 700;">Total Stock</div>
              <div style="font-size: 18px; font-weight: 950; color: var(--primary); line-height: 1.1;">${inventory.reduce((acc, i) => acc + (i.stock || 0), 0)}</div>
            </div>
          </div>
          <span style="font-size: 14px; color: var(--text-muted); font-weight: 700;">›</span>
        </div>
        <div class="draggable-card" data-card-id="metric-credit" draggable="true" style="min-height: 82px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 10px 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); cursor: pointer; display: flex; align-items: center; justify-content: space-between;" onclick="skOpenCreditLedger();">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(239,68,68,0.10); display: flex; align-items: center; justify-content: center; font-size: 1.15rem;">💳</div>
            <div>
              <div style="font-size: 12px; color: var(--text-muted); font-weight: 700;">Customer Credit</div>
              <div style="font-size: 18px; font-weight: 950; color: #dc2626; line-height: 1.1;">₹ ${savedBills.reduce((sum,b) => sum + (b.payMode === 'Credit' ? Math.max(0, Number(b.balance || 0)) : 0), 0).toLocaleString('en-IN')}</div>
            </div>
          </div>
          <span style="font-size: 14px; color: var(--text-muted); font-weight: 700;">›</span>
        </div>
      </div>

      <div id="homeActionCardsContainer" style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div class="draggable-card" data-card-id="card-glass" draggable="true" style="width: 100%; height: 58px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 0 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-sizing: border-box;" onclick="currentFilter='glass'; renderCards(); window.scrollTo({top: 0, behavior: 'smooth'});">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(37,99,235,0.08); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">🛡️</div>
            <div style="min-width: 0;">
              <div style="font-weight: 850; font-size: 14px; color: var(--text);">Tempered Glass</div>
              <div style="font-size: 11px; color: var(--text-muted);">View All Glass Stock</div>
            </div>
          </div>
          <button style="width: 115px; height: 34px; background: var(--primary); color: #ffffff; border: none; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer;">View Stock →</button>
        </div>
        <div class="draggable-card" data-card-id="card-display" draggable="true" style="width: 100%; height: 58px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 16px; padding: 0 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-sizing: border-box;" onclick="currentFilter='combo'; renderCards(); window.scrollTo({top: 0, behavior: 'smooth'});">
          <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(234,88,12,0.08); display: flex; align-items: center; justify-content: center; font-size: 1.25rem; flex-shrink: 0;">📱</div>
            <div style="min-width: 0;">
              <div style="font-weight: 850; font-size: 14px; color: var(--text);">Touch Displays</div>
              <div style="font-size: 11px; color: var(--text-muted);">View Combo Folders</div>
            </div>
          </div>
          <button style="width: 115px; height: 34px; background: #ea580c; color: #ffffff; border: none; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer;">View Display →</button>
        </div>
      </div>
    `;

    if (typeof skRjRenderHomeMetric === 'function') skRjRenderHomeMetric();
    return;
  }

  if (currentFilter === 'glass') document.getElementById('navGlass')?.classList.add('active');
  else if (currentFilter === 'combo') document.getElementById('navCombo')?.classList.add('active');

  if (searchRow) searchRow.style.display = 'flex';
  if (catScroll) catScroll.style.display = 'flex';

  let cardsHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--model-bg); padding:6px 10px; border-radius:12px; border:1px solid var(--card-border); margin-bottom:2px;">
      <span style="font-size:0.72rem; font-weight:800; color:var(--text-muted);">📦 Total Items: <span id="totalItemsCountBadge">${inventory.length}</span></span>
    </div>
  `;

  const lowLimit = parseInt(localStorage.getItem('sk_low_threshold')) || 3;
  const q = currentSearchTerm.trim().toLowerCase();

  const filtered = inventory.filter(item => {
    let matchesFilter = true;
    if (currentFilter === 'low') matchesFilter = item.stock <= lowLimit;
    else if (currentFilter === 'glass') matchesFilter = item.category === 'glass';
    else if (currentFilter === 'combo') matchesFilter = item.category === 'combo';
    else if (['11d', 'privacy', 'matte', 'uv'].includes(currentFilter)) matchesFilter = item.subType === currentFilter;

    let matchesSearch = true;
    if (q !== '') {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchModels = item.models.some(m => m.toLowerCase().includes(q));
      matchesSearch = matchTitle || matchModels;
    }

    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = cardsHTML + `<div class="empty-state">No items found matching the selected filter.</div>`;
    return;
  }

  filtered.forEach(item => {
    let stockClass = '';
    let stockLabel = `<div class="stock-status-badge in-stock">● In Stock: ${item.stock} pcs</div>`;
    if (item.stock === 0) {
      stockClass = 'stock-zero';
      stockLabel = `<div class="stock-status-badge out">🔴 Out of Stock</div>`;
    } else if (item.stock <= lowLimit) {
      stockClass = 'stock-low';
      stockLabel = `<div class="stock-status-badge low">⚠️ Low Stock: Only ${item.stock} left</div>`;
    }

    const typeBadge = item.category === 'combo' ? '📱 Touch Combo' : '🛡️ Tempered Glass';
    const isTitleMatch = q !== '' && item.title.toLowerCase().includes(q);
    const stockControlsHTML = `
        <div class="stock-control-panel" onclick="event.stopPropagation()">
          ${stockLabel}
          <div class="stock-counter-group">
            <button class="stock-btn" onclick="updateStock('${item.id}', -1)">-</button>
            <input type="number" class="stock-number-input" value="${item.stock}" onfocus="handleInputClear(this)" onchange="setDirectStock('${item.id}', this.value)" min="0">
            <button class="stock-btn" onclick="updateStock('${item.id}', 1)">+</button>
          </div>
        </div>`;

    cardsHTML += `
      <div class="glass-card ${stockClass}" onclick="openModelsPopup('${item.id}')" onmousedown="handleCardTouchStart('${item.id}')" onmouseup="handleCardTouchEnd()" ontouchstart="handleCardTouchStart('${item.id}')" ontouchend="handleCardTouchEnd()">
        <div class="card-header">
          <div class="card-title-group">
            <div class="card-sku-name ${isTitleMatch ? 'highlight-title' : ''}">${item.title}</div>
            <div class="glass-spec-badge">
              <span>${typeBadge}</span>
            </div>
          </div>
          <button class="btn-quick-order ${item.ordered ? 'ordered' : ''}" onclick="event.stopPropagation(); toggleQuickOrder('${item.id}')">
            ${item.ordered ? '✓ In Order' : '+ Add to Order'}
          </button>
        </div>

        ${stockControlsHTML}

        <div class="models-section" onclick="event.stopPropagation()">
          <div class="models-header-row">
            <div class="models-count-text">📦 ${item.models.length} Models Fit</div>
            <button class="copy-btn" onclick="copyModelList('${item.id}')">📋 Copy Models</button>
          </div>
          <div class="chips-cloud">
            ${item.models.map(m => {
              const isHighlight = q !== '' && m.toLowerCase().includes(q);
              return `<span class="model-chip ${isHighlight ? 'highlight' : ''}">${m}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  });
  container.innerHTML = cardsHTML;
}

function handleSearch(input) {
  currentSearchTerm = input.value;
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = currentSearchTerm.length > 0 ? 'flex' : 'none';
  renderCards();
}

function clearSearch() {
  const input = document.getElementById('searchInput');
  if (!input) return;
  input.value = '';
  currentSearchTerm = '';
  const clearBtn = document.getElementById('clearSearchBtn');
  if (clearBtn) clearBtn.style.display = 'none';
  renderCards();
}

function filterCategory(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
    selectPillCenter(btn);
  }

  document.querySelectorAll('.bottom-nav .nav-item').forEach(el => el.classList.remove('active'));
  if (cat === 'all' || cat === 'home') document.getElementById('navHome')?.classList.add('active');
  if (cat === 'glass') document.getElementById('navGlass')?.classList.add('active');
  if (cat === 'combo') document.getElementById('navCombo')?.classList.add('active');

  renderCards();
}

function updateStock(id, delta) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  item.stock = Math.max(0, item.stock + delta);
  saveInventory();
  renderCards();
}

function setDirectStock(id, val) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  item.stock = Math.max(0, parseInt(val) || 0);
  saveInventory();
  renderCards();
}

function copyModelList(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  const text = `${item.title}:\n` + item.models.join(', ');
  navigator.clipboard.writeText(text).then(() => {
    showToast("Copied to clipboard!");
  });
}

function toggleQuickOrder(id) {
  const item = inventory.find(i => i.id === id);
  if (!item) return;
  item.ordered = !item.ordered;

  if (item.ordered) {
    if (!ordersList.some(o => o.id === item.id)) {
      ordersList.push({ id: item.id, title: item.title, qty: 10, reason: item.stock <= 3 ? 'Low Stock' : 'Demand' });
    }
    showToast("Added to orders!");
  } else {
    ordersList = ordersList.filter(o => o.id !== item.id);
    showToast("Removed from orders!");
  }

  saveInventory();
  saveOrders();
  renderCards();
}

function updateOrderBadge() {
  const count = ordersList.length;
  const badge = document.getElementById('headerOrderCount');
  if (badge) badge.innerText = count;
  const modalCount = document.getElementById('modalOrderCount');
  if (modalCount) modalCount.innerText = count;
}

function renderOrders() {
  const container = document.getElementById('orderItemsContainer');
  if (!container) return;
  if (ordersList.length === 0) {
    container.innerHTML = `<div class="empty-state">No orders added yet.</div>`;
    return;
  }
  container.innerHTML = ordersList.map(o => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--card-border);">
      <div>
        <div style="font-weight:800; font-size:0.8rem;">${o.title}</div>
        <div style="font-size:0.68rem; color:var(--text-muted);">${o.reason}</div>
      </div>
      <button class="submit-btn" style="width:auto; padding:4px 8px; font-size:0.7rem; background:#fee2e2; color:#b91c1c; border:none;" onclick="toggleQuickOrder('${o.id}')">Remove</button>
    </div>
  `).join('');
}

function switchBillTab(tab) {
  const btnNew = document.getElementById('billTabBtnNew');
  const btnHist = document.getElementById('billTabBtnHistory');
  const viewNew = document.getElementById('billNewView');
  const viewHist = document.getElementById('billHistoryView');

  if (!btnNew || !btnHist || !viewNew || !viewHist) return;

  if (tab === 'new') {
    btnNew.classList.add('active');
    btnHist.classList.remove('active');
    viewNew.style.display = 'block';
    viewHist.style.display = 'none';
  } else {
    btnHist.classList.add('active');
    btnNew.classList.remove('active');
    viewHist.style.display = 'block';
    viewNew.style.display = 'none';
    renderBillHistory();
  }
}

function selectPayMode(mode) {
  currentPayMode = mode;
  document.querySelectorAll('.pay-mode-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`payMode${mode}`);
  if (activeBtn) activeBtn.classList.add('active');

  const isCreditOrEmi = (mode === 'EMI' || mode === 'Credit');
  
  if (document.getElementById('salePriceCol')) document.getElementById('salePriceCol').style.gridColumn = isCreditOrEmi ? 'auto' : '1 / -1';
  if (document.getElementById('advancePriceCol')) document.getElementById('advancePriceCol').style.display = isCreditOrEmi ? 'block' : 'none';
  if (document.getElementById('balanceDueContainer')) document.getElementById('balanceDueContainer').style.display = isCreditOrEmi ? 'flex' : 'none';

  if (document.getElementById('pvRowAdvance')) document.getElementById('pvRowAdvance').style.display = isCreditOrEmi ? 'table-row' : 'none';
  if (document.getElementById('pvRowBalance')) document.getElementById('pvRowBalance').style.display = isCreditOrEmi ? 'table-row' : 'none';

  if (document.getElementById('emiSection')) document.getElementById('emiSection').style.display = mode === 'EMI' ? 'block' : 'none';
  if (document.getElementById('creditSection')) document.getElementById('creditSection').style.display = mode === 'Credit' ? 'block' : 'none';

  saveDraft();
  calculateBillMath();
  updateBillPreview();
}

function calculateBillMath() {
  const total = parseFloat(document.getElementById('billTotalPrice')?.value) || 0;
  const isCreditOrEmi = (currentPayMode === 'EMI' || currentPayMode === 'Credit');
  const advance = isCreditOrEmi ? (parseFloat(document.getElementById('billAdvance')?.value) || 0) : 0;
  const balance = Math.max(0, total - advance);

  const balDisp = document.getElementById('billBalanceDisplay');
  if (balDisp) balDisp.innerText = `₹ ${balance.toLocaleString('en-IN')}`;

  if (currentPayMode === 'EMI') {
    const tenure = Math.min(60, Math.max(1, parseInt(document.getElementById('billEmiMonths')?.value) || 1));
    const interestRate = parseFloat(document.getElementById('billEmiInterest')?.value) || 0;
    const interest = (balance * (interestRate / 100) * (tenure / 12));
    const totalPayable = balance + interest;
    const monthly = Math.ceil(totalPayable / tenure);
    if (document.getElementById('billMonthlyEmi')) document.getElementById('billMonthlyEmi').value = monthly;

    generateEmiScheduleTable(totalPayable, tenure, monthly);
  }

  updateBillPreview();
}

function generateEmiScheduleTable(totalPayable, tenure, monthly) {
  const rawStart = document.getElementById('billEmiStartDate')?.value;
  const startStr = parseSmartDate(rawStart) || rawStart;
  const tbody = document.getElementById('pvEmiScheduleTbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  let startDateObj = new Date();
  if (startStr && startStr.length === 10) {
    const parts = startStr.split('/');
    if (parts.length === 3) startDateObj = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
  }

  let runningBalance = totalPayable;
  let closeStr = '--';

  for (let i = 1; i <= tenure; i++) {
    const d = new Date(startDateObj);
    d.setMonth(d.getMonth() + (i - 1));
    const dtStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    if (i === tenure) closeStr = dtStr;

    runningBalance = Math.max(0, runningBalance - monthly);
    if (i === tenure) runningBalance = 0;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i}</td>
      <td>${dtStr}</td>
      <td style="text-align:right;font-weight:700;">₹ ${monthly.toLocaleString('en-IN')}</td>
      <td style="text-align:right;">₹ ${runningBalance.toLocaleString('en-IN')}</td>
    `;
    tbody.appendChild(tr);
  }

  if (document.getElementById('billEmiCloseDisplay')) document.getElementById('billEmiCloseDisplay').innerText = closeStr;
  if (document.getElementById('pvEmiClose')) document.getElementById('pvEmiClose').innerText = closeStr;
  if (document.getElementById('pvEmiDetails')) document.getElementById('pvEmiDetails').innerText = `₹ ${monthly}/mo for ${tenure} Months`;
}

function updateBillPreview() {
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  if (document.getElementById('pvBillDate')) document.getElementById('pvBillDate').innerText = dateStr;

  if (document.getElementById('pvCustName')) document.getElementById('pvCustName').innerText = document.getElementById('billCustName')?.value || '---';
  if (document.getElementById('pvCustPhone')) document.getElementById('pvCustPhone').innerText = document.getElementById('billCustPhone')?.value || '---';
  if (document.getElementById('pvCustAddress')) document.getElementById('pvCustAddress').innerText = document.getElementById('billCustAddress')?.value || '---';

  const brand = document.getElementById('billBrand')?.value || '';
  const model = document.getElementById('billModel')?.value || '';
  if (document.getElementById('pvDevice')) document.getElementById('pvDevice').innerText = (brand || model) ? `${brand} ${model}`.trim() : '---';

  const ram = document.getElementById('billRam')?.value || '';
  const storage = document.getElementById('billStorage')?.value || '';
  const color = document.getElementById('billColor')?.value || '';
  const comboSpecs = [ram, storage, color].filter(Boolean).join(' / ');
  if (document.getElementById('pvStorage')) document.getElementById('pvStorage').innerText = comboSpecs || '---';

  if (document.getElementById('pvImei1')) document.getElementById('pvImei1').innerText = document.getElementById('billImei1')?.value || '---';

  const imei2 = document.getElementById('billImei2')?.value || '';
  const imei2Row = document.getElementById('pvImei2Row');
  if (imei2 && imei2Row) {
    imei2Row.style.display = 'table-row';
    document.getElementById('pvImei2').innerText = imei2;
  } else if (imei2Row) {
    imei2Row.style.display = 'none';
  }

  if (document.getElementById('pvPackage')) document.getElementById('pvPackage').innerText = document.getElementById('billPackage')?.value || '';
  if (document.getElementById('pvPayMode')) document.getElementById('pvPayMode').innerHTML = `<span style="background:var(--pill-bg);color:var(--text);padding:2px 8px;border-radius:8px;">${currentPayMode}</span>`;

  const total = parseFloat(document.getElementById('billTotalPrice')?.value) || 0;
  const isCreditOrEmi = (currentPayMode === 'EMI' || currentPayMode === 'Credit');
  const advance = isCreditOrEmi ? (parseFloat(document.getElementById('billAdvance')?.value) || 0) : 0;
  const balance = Math.max(0, total - advance);

  if (document.getElementById('pvTotalPrice')) document.getElementById('pvTotalPrice').innerText = `₹ ${total.toLocaleString('en-IN')}`;
  if (document.getElementById('pvAdvance')) document.getElementById('pvAdvance').innerText = `₹ ${advance.toLocaleString('en-IN')}`;
  if (document.getElementById('pvBalance')) document.getElementById('pvBalance').innerText = `₹ ${balance.toLocaleString('en-IN')}`;

  if (document.getElementById('pvEmiYellowBox')) document.getElementById('pvEmiYellowBox').style.display = currentPayMode === 'EMI' ? 'block' : 'none';
  if (document.getElementById('pvEmiScheduleSection')) document.getElementById('pvEmiScheduleSection').style.display = currentPayMode === 'EMI' ? 'block' : 'none';

  const pvCreditBox = document.getElementById('pvCreditBox');
  if (pvCreditBox) {
    if (currentPayMode === 'Credit') {
      pvCreditBox.style.display = 'block';
      const rawCredit = document.getElementById('billCreditDate')?.value || '';
      document.getElementById('pvCreditDetails').innerText = parseSmartDate(rawCredit) || rawCredit || '---';
    } else {
      pvCreditBox.style.display = 'none';
    }
  }

  const terms = localStorage.getItem('sk_terms') || document.getElementById('cfgTermsConditions')?.value || '';
  if (document.getElementById('pvTerms')) document.getElementById('pvTerms').innerText = terms;
}

function saveUsedBill() {
  autoSaveCurrentFormSilently(true);
  updateBillHistoryCount();
  renderBillHistory();
  renderCards();
  if (typeof window.skV43CloudSync === 'function') window.skV43CloudSync();
  showToast("Bill successfully saved!");
  switchBillTab('history');
}

function updateBillHistoryCount() {
  const el = document.getElementById('billHistoryCount');
  if (el) el.innerText = savedBills.length;
}

function renderBillHistory() {
  const container = document.getElementById('billHistoryContainer');
  if (!container) return;
  const q = (document.getElementById('billHistorySearch')?.value || '').toLowerCase();

  container.innerHTML = '';

  const filtered = savedBills.filter(b => {
    return b.custName.toLowerCase().includes(q) || b.phone.includes(q) || b.model.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state">No saved billing history found.</div>`;
    return;
  }

  filtered.forEach((b) => {
    const originalIdx = savedBills.findIndex(x => x.id === b.id);
    const item = document.createElement('div');
    item.style.cssText = "background:var(--card-bg); border:1px solid var(--card-border); border-radius:18px; padding:12px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;";
    item.innerHTML = `
      <div>
        <div style="font-weight:800; font-size:0.88rem; color:var(--text);">${b.custName} (${b.model})</div>
        <div style="font-size:0.72rem; color:var(--text-muted); margin-top:2px;">📞 ${b.phone} • ${skISOToDMY(b.date)} • <span style="background:var(--pill-bg); padding:2px 6px; border-radius:6px; font-weight:700;">${b.payMode}</span></div>
        <div style="font-weight:900; color:var(--primary); font-size:0.84rem; margin-top:4px;">₹ ${b.price.toLocaleString('en-IN')}</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" onclick="viewSavedBill(${originalIdx})" style="background:var(--pill-bg); border:1px solid var(--card-border); color:var(--text); border-radius:10px; width:34px; height:34px; cursor:pointer;" title="View Bill">👁️</button>
        <button type="button" onclick="deleteSavedBill(${originalIdx})" style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:var(--danger); border-radius:10px; width:34px; height:34px; cursor:pointer;" title="Delete Bill">🗑️</button>
      </div>
    `;
    container.appendChild(item);
  });
}

function viewSavedBill(idx) {
  const b = savedBills[idx];
  if (!b) return;
  window.__skActiveSavedBill = b;

  const container = document.getElementById('viewBillContent');
  if (!container) return;
  container.innerHTML = `
    <div style="background:#fff; color:#1e293b; padding:20px; border-radius:18px; font-family:'Plus Jakarta Sans',sans-serif;">
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #edf0f6; padding-bottom:12px; margin-bottom:12px;">
        <div style="font-weight:950; color:#d9166f; font-size:1.3rem;">SK MOBILES</div>
        <div style="text-align:right; font-size:0.75rem;"><strong>Bill No:</strong> ${b.id}<br><strong>Date:</strong> ${skISOToDMY(b.date)}</div>
      </div>
      <div style="font-size:0.75rem; background:#f8fafc; padding:10px; border-radius:12px; margin-bottom:12px; border:1px solid #e2e8f0;">
        <div><strong>Customer:</strong> ${b.custName}</div>
        <div><strong>Phone:</strong> ${b.phone}</div>
        <div><strong>Address:</strong> ${b.address || '---'}</div>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:0.75rem; margin-bottom:12px;">
        <tr style="background:#f1f5f9; border-bottom:1px solid #cbd5e1;"><th style="padding:7px; text-align:left;">Description</th><th style="padding:7px; text-align:right;">Details</th></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:7px; color:#475569;">Device Model</td><td style="padding:7px; text-align:right; font-weight:800;">${b.brand || ''} ${b.model}</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:7px; color:#475569;">IMEI 1</td><td style="padding:7px; text-align:right; font-family:monospace; font-weight:700;">${b.imei1 || '---'}</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:7px; color:#475569;">Payment Mode</td><td style="padding:7px; text-align:right; font-weight:800;">${b.payMode || 'Cash'}</td></tr>
        <tr style="border-bottom:1px solid #e2e8f0; background:#f8fafc;"><td style="padding:7px; font-weight:700;">Total Amount</td><td style="padding:7px; text-align:right; font-weight:900; color:#2563eb;">₹ ${b.price.toLocaleString('en-IN')}</td></tr>
        ${b.payMode === 'EMI' || b.payMode === 'Credit' ? `<tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:7px; color:#16a34a; font-weight:700;">Down Payment</td><td style="padding:7px; text-align:right; color:#16a34a; font-weight:700;">₹ ${b.advance?.toLocaleString('en-IN') || 0}</td></tr><tr style="border-bottom:2px solid #0f172a;"><td style="padding:7px; color:#dc2626; font-weight:700;">Balance Due</td><td style="padding:7px; text-align:right; color:#dc2626; font-weight:900;">₹ ${b.balance?.toLocaleString('en-IN') || 0}</td></tr>` : ''}
      </table>
      <div style="display:flex; gap:8px; margin-top:14px;">
        <button type="button" onclick="downloadInvoicePDF()" class="submit-btn" style="flex:1; padding:8px; font-size:0.75rem;">📄 Download PDF</button>
      </div>
    </div>
  `;
  toggleModal('viewBillModal', true);
}

function deleteSavedBill(idx) {
  if (!confirm("Are you sure you want to delete this bill?")) return;
  savedBills.splice(idx, 1);
  localStorage.setItem('sk_bills', JSON.stringify(savedBills));
  updateBillHistoryCount();
  renderBillHistory();
  renderCards();
  if (typeof window.skV43CloudSync === 'function') window.skV43CloudSync();
  showToast("Bill deleted!");
}

function sendBillToWhatsAppAsPDF() {
  const source = document.getElementById('printableInvoiceCard');
  if (!source) return;

  const rawPhone = document.getElementById('billCustPhone')?.value.replace(/\D/g, '') || '';
  const phone = rawPhone.length === 10 ? rawPhone : (rawPhone.length === 12 && rawPhone.startsWith('91') ? rawPhone.slice(2) : rawPhone);
  
  showToast("Preparing WhatsApp PDF share...");

  const clone = source.cloneNode(true);
  clone.style.width = '750px';
  clone.style.maxWidth = '750px';
  clone.style.margin = '0 auto';
  clone.style.padding = '24px 30px';
  clone.style.boxSizing = 'border-box';
  clone.style.background = '#ffffff';

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-99999px';
  holder.style.top = '0';
  holder.style.background = '#ffffff';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  const opt = {
    margin: [15, 15, 15, 15],
    filename: ((document.getElementById('pvBillNo')?.innerText || 'SK-Bill') + '.pdf'),
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(clone).outputPdf('blob').then((pdfBlob) => {
    holder.remove();
    const pdfFile = new File([pdfBlob], ((document.getElementById('pvBillNo')?.innerText || 'SK-Bill') + '.pdf'), { type: 'application/pdf' });
    
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      navigator.share({
        files: [pdfFile],
        title: 'SK Mobiles Invoice',
        text: 'Here is your purchase invoice PDF from SK Mobiles.'
      }).catch(() => {});
    } else {
      html2pdf().set(opt).from(clone).save();
      const name = document.getElementById('billCustName')?.value || 'Customer';
      const msg = `Hello ${name}, here is your bill invoice PDF from SK Mobiles. Thank you!`;
      window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  });
}

function printInvoiceDirect() {
  const source = document.getElementById('printableInvoiceCard');
  if (!source) return;

  const clone = source.cloneNode(true);
  const w = window.open('', '_blank');
  if (!w) {
    showToast("Please allow popups to print!");
    return;
  }

  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SK MOBILES - Invoice</title><link rel="stylesheet" href="style.css"></head><body>${clone.outerHTML}</body></html>`);
  w.document.close();
  setTimeout(() => {
    w.focus();
    w.print();
    w.close();
  }, 400);
}

function downloadInvoicePDF() {
  const saved = window.__skActiveSavedBill;
  const source = saved ? document.querySelector('#viewBillContent > div') : document.getElementById('printableInvoiceCard');
  if (!source) return;

  const clone = source.cloneNode(true);
  clone.querySelectorAll('button').forEach(b => b.remove());
  clone.style.width = '750px';
  clone.style.maxWidth = '750px';
  clone.style.margin = '0 auto';
  clone.style.padding = '24px 30px';
  clone.style.boxSizing = 'border-box';
  clone.style.background = '#ffffff';
  clone.style.color = '#1e293b';

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-99999px';
  holder.style.top = '0';
  holder.style.width = '750px';
  holder.style.background = '#ffffff';
  holder.appendChild(clone);
  document.body.appendChild(holder);

  const billNo = saved?.id || document.getElementById('pvBillNo')?.innerText || 'SK-Bill';
  const opt = {
    margin: [15, 15, 15, 15],
    filename: billNo + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(clone).save().finally(() => {
    holder.remove();
  });
}

let longPressTimer = null;
function handleCardTouchStart(id) {
  longPressTimer = setTimeout(() => {
    if (navigator.vibrate) navigator.vibrate(80);
    const sel = document.getElementById('selectedContextId');
    if (sel) sel.value = id;
    toggleModal('longPressMenuModal', true);
  }, 600);
}

function handleCardTouchEnd() {
  clearTimeout(longPressTimer);
}

function triggerEditFromContext() {
  const id = document.getElementById('selectedContextId')?.value;
  toggleModal('longPressMenuModal', false);
  const item = inventory.find(i => i.id === id);
  if (item) {
    const newStock = prompt("Enter new stock count:", item.stock);
    if (newStock !== null) {
      item.stock = Math.max(0, parseInt(newStock) || 0);
      saveInventory();
      renderCards();
      showToast("Stock updated!");
    }
  }
}

function triggerDeleteFromContext() {
  const id = document.getElementById('selectedContextId')?.value;
  toggleModal('longPressMenuModal', false);
  if (!confirm("Are you sure you want to delete this inventory item?")) return;
  inventory = inventory.filter(i => i.id !== id);
  saveInventory();
  renderCards();
  showToast("Item deleted!");
}

/* --- REPAIR JOBS ENGINE --- */
(function(){
  'use strict';
  const KEY = 'skx_repair_jobs_v2';
  let rjTab = 'jobs';

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }
  function load(){
    try {
      const a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a : [];
    } catch(e) { return []; }
  }
  function save(a){ localStorage.setItem(KEY, JSON.stringify(a)); }
  function today(){ return new Date().toISOString().slice(0,10); }
  function isPending(j){ return j.status !== 'Delivered'; }
  function statusNext(s){
    const x = ['Received','Checking','Repairing','Ready'];
    const i = x.indexOf(s);
    return i < 0 ? 'Ready' : x[Math.min(i+1, x.length-1)];
  }

  window.skOpenRepairJobs = function(){
    const m = document.getElementById('skRepairJobsModal');
    if (!m) return;
    m.classList.add('active');
    document.body.classList.add('modal-open');
    skRjSwitchTab('jobs');
    skRjRenderJobs();
  };

  window.skCloseRepairJobs = function(){
    document.getElementById('skRepairJobsModal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
  };

  window.skCloseRepairDetail = function(){
    document.getElementById('skRepairDetailModal')?.classList.remove('active');
  };

  window.skRjSwitchTab = function(tab){
    rjTab = tab;
    const jobs = (tab === 'jobs');
    const jobsView = document.getElementById('skRjJobsView');
    const histView = document.getElementById('skRjHistoryView');
    if (jobsView) jobsView.style.display = jobs ? 'block' : 'none';
    if (histView) histView.style.display = jobs ? 'none' : 'block';
    document.getElementById('skRjJobsTab')?.classList.toggle('active', jobs);
    document.getElementById('skRjHistoryTab')?.classList.toggle('active', !jobs);
    if (jobs) skRjRenderJobs(); else skRjRenderHistory();
  };

  window.skRjSaveJob = function(e){
    if (e) e.preventDefault();
    const id = document.getElementById('skRjEditId')?.value;
    const a = load();
    const existing = id ? a.find(x => x.id === id) : null;
    const job = {
      id: id || ('RJ-' + Date.now()),
      customer: document.getElementById('skRjCustomer')?.value.trim() || '',
      phone: document.getElementById('skRjPhone')?.value.trim() || '',
      model: document.getElementById('skRjModel')?.value.trim() || '',
      imei: document.getElementById('skRjImei')?.value.trim() || '',
      workType: document.getElementById('skRjWorkType')?.value || 'Normal',
      schedule: skDateTimeToISO(document.getElementById('skRjSchedule')?.value || ''),
      problem: document.getElementById('skRjProblem')?.value.trim() || '',
      date: skDateToISO(document.getElementById('skRjDate')?.value || '') || today(),
      estimate: Number(document.getElementById('skRjEstimate')?.value) || 0,
      status: document.getElementById('skRjStatus')?.value || 'Received',
      note: document.getElementById('skRjNote')?.value.trim() || '',
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!job.customer || !job.model || !job.problem) {
      showToast('Customer, Model & Problem required');
      return false;
    }

    if (existing) a[a.findIndex(x => x.id === id)] = job;
    else a.unshift(job);

    save(a);
    skRjResetForm();
    skRjRenderJobs();
    skRjRenderHomeMetric();
    showToast(existing ? 'Repair job updated' : 'Repair job saved');
    return false;
  };

  window.skRjResetForm = function(){
    document.getElementById('skRjForm')?.reset();
    if (document.getElementById('skRjEditId')) document.getElementById('skRjEditId').value = '';
    if (document.getElementById('skRjDate')) document.getElementById('skRjDate').value = skISOToDMY(today());
    if (document.getElementById('skRjSaveBtn')) document.getElementById('skRjSaveBtn').textContent = '💾 Save Repair Job';
    if (document.getElementById('skRjCancelEdit')) document.getElementById('skRjCancelEdit').style.display = 'none';
  };

  window.skRjEdit = function(id){
    const j = load().find(x => x.id === id);
    if (!j) return;
    skRjSwitchTab('jobs');
    document.getElementById('skRjEditId').value = j.id;
    document.getElementById('skRjCustomer').value = j.customer || '';
    document.getElementById('skRjPhone').value = j.phone || '';
    document.getElementById('skRjModel').value = j.model || '';
    document.getElementById('skRjImei').value = j.imei || '';
    document.getElementById('skRjWorkType').value = j.workType || 'Normal';
    document.getElementById('skRjSchedule').value = skISOToDMYTime(j.schedule || '');
    document.getElementById('skRjProblem').value = j.problem || '';
    document.getElementById('skRjDate').value = skISOToDMY(j.date || today());
    document.getElementById('skRjEstimate').value = j.estimate || '';
    document.getElementById('skRjStatus').value = j.status || 'Received';
    document.getElementById('skRjNote').value = j.note || '';
    document.getElementById('skRjSaveBtn').textContent = '✏️️ Update Repair Job';
    document.getElementById('skRjCancelEdit').style.display = 'block';
  };

  window.skRjNext = function(id){
    const a = load(), i = a.findIndex(x => x.id === id);
    if (i < 0) return;
    const old = a[i].status;
    a[i].status = (old === 'Ready') ? 'Delivered' : statusNext(old);
    a[i].updatedAt = new Date().toISOString();
    save(a);
    skRjRenderJobs();
    skRjRenderHistory();
    skRjRenderHomeMetric();
  };

  window.skRjDelete = function(id){
    if (!confirm('Delete this repair job?')) return;
    save(load().filter(x => x.id !== id));
    skRjRenderJobs();
    skRjRenderHistory();
    skRjRenderHomeMetric();
  };

  window.skRjShowDetail = function(id){
    const j = load().find(x => x.id === id);
    if (!j) return;
    const detailContent = document.getElementById('skRepairDetailContent');
    if (!detailContent) return;
    detailContent.innerHTML = `
      <div style="background:var(--model-bg); border:1px solid var(--card-border); border-radius:15px; padding:12px">
        <div style="font-weight:900; font-size:.95rem">${esc(j.customer)} · ${esc(j.model)}</div>
        <div style="font-size:.72rem; color:var(--text-muted); margin-top:5px">📞 ${esc(j.phone || '—')} · IMEI: ${esc(j.imei || '—')}</div>
        <div style="margin-top:9px; font-size:.76rem"><b>Problem:</b><br>${esc(j.problem)}</div>
        <div style="margin-top:8px; font-size:.72rem; color:var(--text-muted)">📅 ${esc(skISOToDMY(j.date))} · Status: <b>${esc(j.status)}</b></div>
        <div style="margin-top:6px; font-size:.72rem">Estimate: <b>₹${Number(j.estimate || 0).toLocaleString('en-IN')}</b></div>
      </div>`;
    document.getElementById('skRepairDetailModal')?.classList.add('active');
  };

  window.skRjRenderJobs = function(){
    const list = document.getElementById('skRjJobsList');
    if (!list) return;
    const pending = load().filter(isPending);
    const countEl = document.getElementById('skRjPendingCount');
    if (countEl) countEl.textContent = pending.length;

    list.innerHTML = pending.length ? pending.map(j => `
      <div class="sk-rj-card" onclick="skRjShowDetail('${j.id}')">
        <div class="sk-rj-card-top">
          <div>
            <div class="sk-rj-name">${esc(j.customer)} · ${esc(j.model)}</div>
            <div class="sk-rj-meta">${esc(skISOToDMY(j.date))} · ${esc(j.problem)}</div>
          </div>
          <span class="sk-rj-status">${esc(j.status)}</span>
        </div>
        <div class="sk-rj-actions">
          <button type="button" class="sk-rj-next" onclick="event.stopPropagation(); skRjNext('${j.id}')">Next</button>
          <button type="button" class="sk-rj-edit" onclick="event.stopPropagation(); skRjEdit('${j.id}')">Edit</button>
        </div>
      </div>
    `).join('') : '<div class="sk-rj-empty">No pending repair jobs.</div>';
  };

  window.skRjRenderHistory = function(){
    const list = document.getElementById('skRjHistoryList');
    if (!list) return;
    const historyJobs = load().filter(j => j.status === 'Ready' || j.status === 'Delivered');
    const countEl = document.getElementById('skRjHistoryCount');
    if (countEl) countEl.textContent = historyJobs.length;

    list.innerHTML = historyJobs.length ? historyJobs.map(j => `
      <div class="sk-rj-card" onclick="skRjShowDetail('${j.id}')">
        <div class="sk-rj-card-top">
          <div>
            <div class="sk-rj-name">${esc(j.customer)} · ${esc(j.model)}</div>
            <div class="sk-rj-meta">${esc(skISOToDMY(j.date))} · ${esc(j.status)}</div>
          </div>
          <span class="sk-rj-status">${esc(j.status)}</span>
        </div>
      </div>
    `).join('') : '<div class="sk-rj-empty">No repair history found.</div>';
  };

  window.skRjExportHistory = function(){
    const rows = load().filter(j => ['Ready','Delivered'].includes(j.status));
    if (!rows.length) { showToast('No repair history to export'); return; }
    if (typeof XLSX === 'undefined') { showToast('Excel library not loaded'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Repair History');
    XLSX.writeFile(wb, `SK_Repair_History_${today()}.xlsx`);
  };

  window.skRjRenderHomeMetric = function(){
    const grid = document.getElementById('homeMetricGrid');
    if (!grid) return;
    document.getElementById('skHomeRepairMetric')?.remove();
    const pending = load().filter(isPending);
    const el = document.createElement('div');
    el.id = 'skHomeRepairMetric';
    el.className = 'draggable-card';
    el.style.cssText = "min-height:82px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:16px; padding:10px 12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;";
    el.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px">
        <div style="width:38px; height:38px; border-radius:12px; background:rgba(239,68,68,.10); display:flex; align-items:center; justify-content:center; font-size:1.15rem">🔧</div>
        <div>
          <div style="font-size:12px; color:var(--text-muted); font-weight:700">Repair Jobs</div>
          <div style="font-size:18px; font-weight:950; color:var(--primary); line-height:1.1">${pending.length}</div>
        </div>
      </div>
      <span style="font-size:14px; color:var(--text-muted); font-weight:700">›</span>`;
    el.onclick = function() { skOpenRepairJobs(); };
    grid.appendChild(el);
  };
})();

/* --- LOGOUT & PERMISSIONS SHIM --- */
function skLogout() {
  localStorage.removeItem('sk_current_role_v1');
  showToast("Logged out successfully");
}