const state = {
  currentPage: "home",
  theme: "soft",
  accent: "#1987e8",
  radius: "modern",
  buttonRadius: "modern",
  surface: "glass",
  header: "glass",
  bottomNav: "fixed",
  scale: "normal",
  ambientGlow: true,
  haptic: true,
  reducedMotion: false
};

const navItems = [
  ["home", "⌂", "Home"],
  ["billing", "▣", "Billing"],
  ["customers", "♙", "Customers"],
  ["products", "▦", "Products"],
  ["repair", "⌁", "Repair"],
  ["credit", "₹", "Credit"],
  ["outstanding", "◉", "Outstanding"],
  ["history", "◷", "Bill History"],
  ["reports", "▥", "Reports"],
  ["spares", "⚙", "Tools / Spares"],
  ["settings", "⚙", "Settings"],
  ["admin", "♜", "Admin"]
];

const $ = (s) => document.querySelector(s);

function navigate(page) {
  state.currentPage = page;
  render();
  window.scrollTo({top:0, behavior: state.reducedMotion ? "auto" : "smooth"});
}

function navMarkup(items) {
  return `<div class="nav-list">${items.map(([id, icon, label]) =>
    `<button class="nav-item ${state.currentPage === id ? "active":""}" data-page="${id}">
      <span>${icon}</span><span>${label}</span>
    </button>`).join("")}</div>`;
}

function renderNav() {
  $("#sideNav").innerHTML = navMarkup(navItems);
  const mobile = navItems.filter(x => ["home","billing","customers","products"].includes(x[0]));
  mobile.push(["more","☰","More"]);
  $("#bottomNav").innerHTML = mobile.map(([id, icon, label]) =>
    `<button class="${state.currentPage === id ? "active":""}" data-page="${id}">${icon}<br>${label}</button>`).join("");
}

function render() {
  renderNav();
  $("#pageTitle").textContent = navItems.find(x => x[0] === state.currentPage)?.[2] || "More";
  const pages = {
    home: homePage, billing: billingPage, customers: customersPage, products: productsPage,
    repair: repairPage, credit: creditPage, outstanding: outstandingPage,
    history: historyPage, reports: reportsPage, spares: sparesPage, settings: settingsPage,
    admin: adminPage, more: morePage
  };
  $("#pageContent").innerHTML = (pages[state.currentPage] || homePage)();
  bindPageActions();
}

function homePage() {
  return `
    <div class="hero">
      <h2>SK MOBILES 2.0</h2>
      <p>Mobile shop management, billing, inventory and customer operations in one workspace.</p>
    </div>
    <div class="section-head"><h2>Quick Actions</h2><button class="link-btn" data-page="billing">View All ›</button></div>
    <div class="grid quick-grid">
      ${action("▣","New Bill","Create a bill","billing")}
      ${action("♙","Customer","Manage customers","customers")}
      ${action("▦","Products","Inventory & stock","products")}
      ${action("⌁","Repair","Repair jobs","repair")}
    </div>
    <div class="section-head"><h2>Business Overview</h2></div>
    <div class="grid stat-grid">
      ${stat("Today's Sales","₹0","success")}
      ${stat("Outstanding","₹0","warning")}
      ${stat("Credit","₹0","danger")}
      ${stat("Low Stock","0","")}
    </div>
    <div class="section-head"><h2>Recent Bills</h2><button class="link-btn" data-page="history">View All ›</button></div>
    <div class="card"><div class="empty">No bills yet. Create your first bill from Billing.</div></div>
  `;
}

function action(icon,title,sub,page) {
  return `<button class="action-card" data-page="${page}"><div class="action-icon">${icon}</div><strong>${title}</strong><small>${sub}</small></button>`;
}
function stat(label,value,cls="") {
  return `<div class="card stat"><div class="label">${label}</div><div class="value ${cls}">${value}</div></div>`;
}

function billingPage() {
  return `<div class="section-head"><h2>New Bill</h2><button class="primary-btn" data-toast="New bill ready">+ New Bill</button></div>
  <div class="card">
    <div class="form-grid">
      <div class="field"><label>Customer</label><input placeholder="Search customer..."></div>
      <div class="field"><label>Bill Number</label><input value="Auto generated" disabled></div>
    </div>
    <div class="section-head"><h2>Products</h2><button class="secondary-btn">+ Add Item</button></div>
    <div class="card"><div class="empty">No products added.</div></div>
    <div class="section-head"><h2>Bill Summary</h2></div>
    ${stat("Grand Total","₹0")}
    <div class="form-grid">
      <div class="field"><label>Paid</label><input type="number" placeholder="0"></div>
      <div class="field"><label>Payment Method</label><select><option>Cash</option><option>UPI</option><option>Card</option><option>Credit</option></select></div>
    </div>
    <div class="toolbar" style="margin-top:16px"><button class="primary-btn" data-toast="Bill saved">Save Bill</button><button class="secondary-btn">WhatsApp</button><button class="secondary-btn">PDF</button><button class="secondary-btn">Print</button></div>
  </div>`;
}

function customersPage() { return listPage("Customers","+ Add Customer","Customer","Phone","Outstanding"); }
function productsPage() { return listPage("Products","+ Add Product","Product","Price","Stock"); }
function listPage(title,add,c1,c2,c3) {
  return `<div class="section-head"><h2>${title}</h2><button class="primary-btn">${add}</button></div>
  <div class="toolbar"><input class="search" placeholder="Search ${title.toLowerCase()}..."><button class="secondary-btn">Filter</button></div>
  <div class="card table-wrap"><table><thead><tr><th>${c1}</th><th>${c2}</th><th>${c3}</th><th>Status</th></tr></thead><tbody><tr><td colspan="4">No records yet.</td></tr></tbody></table></div>`;
}

function repairPage() { return listPage("Repair Jobs","+ New Repair Job","Repair ID","Customer","Status"); }
function creditPage() { return `<div class="section-head"><h2>Credit Management</h2></div><div class="grid stat-grid">${stat("Total Credit","₹0","danger")}${stat("Customers","0")}${stat("Paid","₹0","success")}${stat("Overdue","₹0","warning")}</div><div class="card" style="margin-top:14px">No credit records yet.</div>`; }
function outstandingPage() { return `<div class="section-head"><h2>Outstanding</h2></div><div class="grid stat-grid">${stat("Total Outstanding","₹0","warning")}${stat("Due","₹0")}${stat("Partial","₹0")}${stat("Overdue","₹0","danger")}</div><div class="card" style="margin-top:14px">No outstanding records yet.</div>`; }
function historyPage() { return listPage("Bill History","","Bill #","Customer","Amount"); }
function reportsPage() { return `<div class="section-head"><h2>Reports</h2></div><div class="grid quick-grid">${action("▥","Sales","Sales reports","reports")}${action("₹","Payments","Payment reports","reports")}${action("◉","Outstanding","Outstanding report","outstanding")}${action("▦","Inventory","Stock report","products")}</div>`; }
function sparesPage() { return `<div class="section-head"><h2>Tools / IC / Spare Parts</h2><button class="primary-btn">+ Order Note</button></div><div class="card"><div class="field"><label>Order / Repair Notes</label><textarea placeholder="Enter required IC, tools or spare parts notes..."></textarea></div></div>`; }

function settingsPage() {
  return `<div class="section-head"><h2>UI & Appearance Studio</h2></div>
  <div class="settings-grid">
    <div class="card"><div class="section-head"><h2>Theme & Background</h2></div>
      <div class="option-grid">${["Pure White","Soft Off-White","Accent Gradient","Classic","Subtle Slate","Vibrant Glow","Apple Light","Apple Dark"].map((x,i)=>`<button class="option ${i===1?"selected":""}" data-theme-option="${x}">${x}<br><small>Clean modern surface</small></button>`).join("")}</div>
    </div>
    <div class="card"><div class="section-head"><h2>Accent Colour</h2></div>
      <div class="option-grid">${["#1987e8","#27a56a","#7b61ff","#e29b28","#e55353"].map(c=>`<button class="option" data-accent="${c}" style="border-top:4px solid ${c}">${c}</button>`).join("")}</div>
    </div>
    <div class="card"><div class="section-head"><h2>Corner Radius</h2></div>
      <div class="option-grid">${["Sharp","Standard","Modern","Smooth","Pill"].map(x=>`<button class="option ${x==="Modern"?"selected":""}" data-radius="${x}">${x}</button>`).join("")}</div></div>
    <div class="card"><div class="section-head"><h2>Button Radius</h2></div>
      <div class="option-grid">${["Sharp","Modern","Smooth","Full Pill"].map(x=>`<button class="option ${x==="Modern"?"selected":""}" data-button-radius="${x}">${x}</button>`).join("")}</div></div>
    <div class="card"><div class="section-head"><h2>Card Surface</h2></div>
      <div class="option-grid">${["iOS Full Glass","Glass Blur","Modern Border","Elevated Shadow","Flat Surface"].map(x=>`<button class="option ${x==="Glass Blur"?"selected":""}">${x}</button>`).join("")}</div></div>
    <div class="card"><div class="section-head"><h2>Navigation & Header</h2></div>
      <div class="option-grid"><button class="option selected">Glass Header</button><button class="option">Solid Header</button><button class="option">Minimal Header</button><button class="option selected">Fixed Dock</button><button class="option">Floating Island</button></div></div>
    <div class="card"><div class="section-head"><h2>Interface Scale</h2></div><div class="option-grid"><button class="option">Compact<br><small>92%</small></button><button class="option selected">Normal<br><small>100%</small></button><button class="option">Comfortable<br><small>108%</small></button></div></div>
    <div class="card"><div class="section-head"><h2>Visual Effects & Feedback</h2></div>
      ${toggle("Ambient Aura Glow","Subtle background effect","ambientGlow")}
      ${toggle("Haptic Touch Feedback","Touch interaction feedback","haptic")}
      ${toggle("Reduced Motion","Reduce transitions","reducedMotion")}
    </div>
  </div>`;
}

function toggle(title,sub,key) {
  return `<div class="toggle-row"><div><strong>${title}</strong><br><small>${sub}</small></div><button class="toggle ${state[key]?"on":""}" data-toggle="${key}"></button></div>`;
}
function adminPage() { return `<div class="section-head"><h2>Admin</h2></div><div class="grid quick-grid">${action("♜","Users","Admin & Manager users","admin")}${action("▣","Permissions","Role access","admin")}${action("◷","Activity Logs","Audit activity","admin")}${action("⌫","Recycle Bin","Deleted records","admin")}</div>`; }
function morePage() { return `<div class="section-head"><h2>More</h2></div><div class="grid quick-grid">${navItems.filter(x=>!["home","billing","customers","products"].includes(x[0])).map(x=>action(x[1],x[2],"Open module",x[0])).join("")}</div>`; }

function bindPageActions() {
  document.querySelectorAll("[data-page]").forEach(el => el.addEventListener("click", () => navigate(el.dataset.page)));
  document.querySelectorAll("[data-toast]").forEach(el => el.addEventListener("click", () => toast(el.dataset.toast)));
  document.querySelectorAll("[data-toggle]").forEach(el => el.addEventListener("click", () => {
    const key = el.dataset.toggle; state[key] = !state[key]; applySettings(); render();
  }));
  document.querySelectorAll("[data-accent]").forEach(el => el.addEventListener("click", () => {
    state.accent = el.dataset.accent; applySettings(); render();
  }));
  document.querySelectorAll("[data-radius]").forEach(el => el.addEventListener("click", () => {
    state.radius = el.dataset.radius; applySettings(); render();
  }));
  document.querySelectorAll("[data-button-radius]").forEach(el => el.addEventListener("click", () => {
    state.buttonRadius = el.dataset.buttonRadius; applySettings(); render();
  }));
  $("#menuBtn").onclick = () => document.querySelector(".sidebar").classList.toggle("open");
}

function applySettings() {
  const root = document.documentElement;
  root.style.setProperty("--primary", state.accent);
  const radius = {Sharp:"4px",Standard:"12px",Modern:"22px",Smooth:"28px",Pill:"999px"};
  const br = {"Sharp":"4px","Modern":"16px","Smooth":"24px","Full Pill":"999px"};
  root.style.setProperty("--radius-card", radius[state.radius]);
  root.style.setProperty("--radius-button", br[state.buttonRadius]);
  root.style.setProperty("--content-scale", state.scale === "compact" ? ".92" : state.scale === "comfortable" ? "1.08" : "1");
  root.style.setProperty("--blur", state.ambientGlow ? "18px" : "0px");
  document.body.dataset.motion = state.reducedMotion ? "reduced" : "full";
}

function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

document.addEventListener("click", e => {
  const btn = e.target.closest("[data-theme-option]");
  if (btn) toast(`${btn.dataset.themeOption} selected`);
});

applySettings();
render();
