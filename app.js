const PIN_HASH_KEY = 'sk_app_master_pin_hash_v1';
const USER_EMAIL_KEY = 'sk_app_logged_email_v1';
const DEFAULT_THEME = 'light';

const state = {
  inventory: [
    { id: 1, title: 'iPhone 14 Tempered Glass', stock: 18, category: 'Glass', lowStock: false },
    { id: 2, title: 'Samsung A54 Touch Combo', stock: 4, category: 'Combo', lowStock: true },
    { id: 3, title: 'OnePlus 11 Screen Guard', stock: 12, category: 'Glass', lowStock: false }
  ]
};

const ui = {
  gate: document.getElementById('skRoleGate'),
  gateSubTitle: document.getElementById('skGateSubTitle'),
  viewFirstLogin: document.getElementById('skViewFirstLogin'),
  viewSetPin: document.getElementById('skViewSetPin'),
  viewPinOnly: document.getElementById('skViewPinOnly'),
  roleMsg: document.getElementById('skRoleMsg'),
  quickPinInput: document.getElementById('skQuickPinInput'),
  inventoryList: document.getElementById('inventoryList'),
  toast: document.getElementById('toast'),
  themeModal: document.getElementById('themeModal'),
  themeButtons: [...document.querySelectorAll('.theme-chip')]
};

function showMsg(text, isError = true) {
  ui.roleMsg.textContent = text;
  ui.roleMsg.style.color = isError ? '#dc2626' : '#16a34a';
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => ui.toast.classList.remove('show'), 1800);
}

async function sha256(value) {
  const buffer = new TextEncoder().encode(String(value));
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('sk_app_theme_v1', theme);
  ui.themeButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.theme === theme);
  });
}

function initializeTheme() {
  const savedTheme = localStorage.getItem('sk_app_theme_v1') || DEFAULT_THEME;
  setTheme(savedTheme);
}

function switchView(view) {
  ui.viewFirstLogin.style.display = view === 'first' ? 'block' : 'none';
  ui.viewSetPin.style.display = view === 'setpin' ? 'block' : 'none';
  ui.viewPinOnly.style.display = view === 'pinonly' ? 'block' : 'none';

  if (view === 'first') ui.gateSubTitle.textContent = 'Gmail & Password Login';
  if (view === 'setpin') ui.gateSubTitle.textContent = 'Setup 4-Digit Security PIN';
  if (view === 'pinonly') ui.gateSubTitle.textContent = 'Enter 4-Digit PIN to unlock';

  showMsg('');
}

function checkAuthFlow() {
  const savedPinHash = localStorage.getItem(PIN_HASH_KEY);
  switchView(savedPinHash ? 'pinonly' : 'first');
}

function renderInventory() {
  ui.inventoryList.innerHTML = state.inventory
    .map((item) => {
      const stockClass = item.stock <= 5 ? 'low' : '';
      return `
        <article class="inventory-item" data-id="${item.id}">
          <div class="inventory-item-header">
            <div class="inventory-item-title">${item.title}</div>
            <span class="inventory-item-stock ${stockClass}">${item.stock} in stock</span>
          </div>
          <div class="inventory-item-meta">
            Category: ${item.category}<br />
            Low stock alert: ${item.stock <= 5 ? 'Enabled' : 'Normal'}
          </div>
        </article>
      `;
    })
    .join('');
}

async function handleFirstLogin() {
  const email = document.getElementById('skRoleEmail').value.trim();
  const password = document.getElementById('skRolePassword').value.trim();

  if (!email || !email.includes('@')) {
    showMsg('Valid Gmail / Email address enter seiyavum.');
    return;
  }

  if (!password || password.length < 4) {
    showMsg('Password enter seiyavum.');
    return;
  }

  localStorage.setItem(USER_EMAIL_KEY, email);
  showMsg('Login verified! Set 4-digit PIN.', false);

  setTimeout(() => {
    switchView('setpin');
    document.getElementById('skNewPinInput').focus();
  }, 400);
}

async function handleSavePin() {
  const pin1 = (document.getElementById('skNewPinInput').value || '').trim();
  const pin2 = (document.getElementById('skConfirmPinInput').value || '').trim();

  if (!/^\d{4}$/.test(pin1)) {
    showMsg('PIN kandippaaga 4 digits irukka vendum.');
    return;
  }

  if (pin1 !== pin2) {
    showMsg('PIN mismatch. Irandum seriyaaga irukka vendum.');
    return;
  }

  const hashed = await sha256(pin1);
  localStorage.setItem(PIN_HASH_KEY, hashed);
  showMsg('PIN set successfully! Restarting app...', false);

  setTimeout(() => {
    window.location.reload();
  }, 600);
}

async function handlePinUnlock() {
  const pin = (ui.quickPinInput.value || '').trim();

  if (!/^\d{4}$/.test(pin)) {
    showMsg('4 digit PIN enter seiyavum.');
    return;
  }

  const hashed = await sha256(pin);
  const saved = localStorage.getItem(PIN_HASH_KEY);

  if (hashed === saved) {
    ui.gate.classList.remove('sk-show');
    showMsg('');
    showToast('App unlocked');
  } else {
    showMsg('Thavaraana PIN. Meedum muyarchikkavum.');
    ui.quickPinInput.value = '';
  }
}

function toggleThemeModal(isOpen) {
  ui.themeModal.classList.toggle('open', isOpen);
  ui.themeModal.setAttribute('aria-hidden', String(!isOpen));
}

function bindEvents() {
  document.getElementById('skFirstLoginBtn').addEventListener('click', handleFirstLogin);
  document.getElementById('skSavePinBtn').addEventListener('click', handleSavePin);
  document.getElementById('skPinSubmitBtn').addEventListener('click', handlePinUnlock);

  ui.quickPinInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handlePinUnlock();
  });

  ui.quickPinInput.addEventListener('input', () => {
    if (ui.quickPinInput.value.length === 4) handlePinUnlock();
  });

  document.getElementById('skResetPinFlowBtn').addEventListener('click', () => {
    if (window.confirm('Gmail login-ku maari PIN reset seiyya virumbugirīrgala?')) {
      localStorage.removeItem(PIN_HASH_KEY);
      switchView('first');
    }
  });

  document.getElementById('openThemeMenu').addEventListener('click', () => toggleThemeModal(true));
  document.getElementById('closeThemeModal').addEventListener('click', () => toggleThemeModal(false));
  ui.themeModal.addEventListener('click', (event) => {
    if (event.target === ui.themeModal) toggleThemeModal(false);
  });

  ui.themeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      setTheme(button.dataset.theme);
      toggleThemeModal(false);
    });
  });

  document.getElementById('addSampleItem').addEventListener('click', () => {
    const nextId = state.inventory.length + 1;
    state.inventory.push({
      id: nextId,
      title: `Sample Glass ${nextId}`,
      stock: 7,
      category: 'Glass',
      lowStock: false
    });
    renderInventory();
    showToast('Sample item added');
  });
}

function init() {
  initializeTheme();
  renderInventory();
  checkAuthFlow();
  bindEvents();
}

window.addEventListener('DOMContentLoaded', init);
