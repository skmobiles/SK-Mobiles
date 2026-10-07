/* SK MOBILES - Universal Realtime Auto-Sync Engine
   Zero-Maintenance: Automatically Syncs All sk_ and skx_ Data Modules Across All Devices */
(function(){
  'use strict';

  const FB_CONFIG = {
    apiKey: "AIzaSyDufQNy7l9M3ue_32u3gcH3TZUhPlrSILA",
    authDomain: "sk-mobiles-2d61d.firebaseapp.com",
    projectId: "sk-mobiles-2d61d",
    storageBucket: "sk-mobiles-2d61d.firebasestorage.app",
    messagingSenderId: "705961182597",
    appId: "1:705961182597:web:fa8238739d140b250df0ec"
  };

  const ROLE_BY_EMAIL = {
    "skmobilesdpi@gmail.com": "admin",
    "lavanyam.com94@gmail.com": "manager",
    "sriyogi6@gmail.com": "worker"
  };

  const MANAGER_PERMISSION_DEFAULTS = {
    managerAccess:true, billing:false, orders:false, inventory:false, credit:false, repair:false,
    toolsNotes:false, dataFolder:false, settings:false, profile:true, backup:false, restore:false,
    shopSettings:false, userManagement:false, recycleBin:false
  };
  const MANAGER_PERMISSION_DOC = "manager";

  const ROLE_KEY = "sk_current_role_v1";
  const WORKER_KEY = "sk_current_worker_id_v1";
  const SHOP_ID = "SK-MOBILES";
  const BILL_KEY = "sk_bills";

  let auth, db, unsubscribeBills = null, unsubscribeAllData = null, unsubscribeRepairJobs = null, unsubscribeManagerPermissions = null;
  let remoteReady = false;
  let applyingRemote = false;
  let syncingLocal = false;
  let lastKnownBillIds = new Set();
  let syncTimer = null;
  const syncKeyTimers = {};
  let cloudAutoBackupTimer = null;
  let cloudAutoBackupRunning = false;
  let cloudRestoreApplying = false;
  let refreshUiFrame = 0;
  const REPAIR_KEY = "skx_repair_jobs_v2";
  const REPAIR_COLLECTION = "repairJobs";
  let repairSyncReady = false;
  let repairApplyingRemote = false;
  let repairKnownRemote = new Map();
  let repairSyncTimer = null;
  const SYNC_META_KEY = "sk_sync_meta_v1";

  function readSyncMeta(){
    try { const x = JSON.parse(localStorage.getItem(SYNC_META_KEY) || "{}"); return x && typeof x === "object" ? x : {}; }
    catch(e){ return {}; }
  }
  let syncMeta = readSyncMeta();
  let syncMetaWriteTimer = null;
  function persistSyncMetaSoon(){
    clearTimeout(syncMetaWriteTimer);
    syncMetaWriteTimer = setTimeout(function(){
      syncMetaWriteTimer = null;
      try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(syncMeta)); } catch(e){}
    }, 250);
  }
  function localChangeTime(key){ return Number(syncMeta[key]?.updatedAtMs || 0); }
  function markLocalChange(key, updatedAtMs){
    if(!isSyncableKey(key)) return;
    syncMeta[key] = {updatedAtMs:Number(updatedAtMs)||Date.now()};
    persistSyncMetaSoon();
  }
  function markRemoteBaseline(key, updatedAtMs){
    if(!isSyncableKey(key)) return;
    syncMeta[key] = {updatedAtMs:Number(updatedAtMs)||Date.now()};
    persistSyncMetaSoon();
  }

  // தானாகவே அனைத்து sk_ மற்றும் skx_ விசைகளையும் கண்டறியும் அமைப்பு
  function isSyncableKey(key) {
    if (!key) return false;
    // உள்நுழைவு/தீம் போன்ற சாதன தனிப்பட்ட அமைப்புகளை மட்டும் தவிர்த்தல்
    if (key === SYNC_META_KEY || key === "sk_current_role_v1" || key === "sk_current_worker_id_v1" || key === "sk_theme" || key === "sk_bill_draft" || key === REPAIR_KEY) {
      return false;
    }
    return key.startsWith("sk_") || key.startsWith("skx_");
  }

  function msg(t){
    const text = t || "";
    const el = document.getElementById("skRoleMsg");
    if(el) el.textContent = text;
    const modern = document.getElementById("skLoginMsg");
    if(modern) modern.textContent = text;
  }

  function toast(t){
    try { if(typeof showToast === "function") showToast(t); } catch(e){}
  }

  function localBills(){
    try {
      const a = JSON.parse(localStorage.getItem(BILL_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch(e){ return []; }
  }

  function setLocalBills(a){
    applyingRemote = true;
    try { localStorage.setItem(BILL_KEY, JSON.stringify(a)); } finally { applyingRemote = false; }
    refreshAllUI();
  }

  // தரவு மாறியவுடன் அனைத்து UI பகுதிகளையும் உடனுக்குடன் புதுப்பித்தல்
  function refreshAllUI(){
    /* During the three-part login bootstrap, wait until bills/repairs/data have
       all reached their baseline. Rendering each intermediate state causes a
       large amount of synchronous DOM work on startup. */
    if(window.__skInitialSyncBatch){
      window.__skInitialSyncRefreshPending=true;
      return;
    }
    /* Coalesce bursts of Firebase/localStorage updates into one paint.
       This prevents visible page flicker when several synced keys arrive together. */
    if(refreshUiFrame) return;
    const run = function(){
      refreshUiFrame = 0;
      try {
        if(typeof savedBills !== "undefined") savedBills = localBills();
        if(typeof updateBillHistoryCount === "function") updateBillHistoryCount();
        if(typeof renderBillHistory === "function") renderBillHistory();
        if(typeof loadSavedBills === "function") loadSavedBills();
        if(typeof displayBills === "function") displayBills();
        if(typeof renderInventory === "function") renderInventory();
        if(typeof renderJobCards === "function") renderJobCards();
        if(typeof renderJobs === "function") renderJobs();
        if(typeof renderRepairJobs === "function") renderRepairJobs();
        if(typeof renderCreditList === "function") renderCreditList();
        if(typeof renderDueList === "function") renderDueList();
        if(typeof renderCustomerLedger === "function") renderCustomerLedger();
        if(typeof renderLedgerList === "function") renderLedgerList();
        if(typeof renderDashboard === "function") renderDashboard();
        if(typeof updateStats === "function") updateStats();
        if(typeof loadAllData === "function") loadAllData();
      } catch(e){}
    };
    refreshUiFrame=setTimeout(run,120);
  }

  function normalizeBill(b){
    if(!b || !b.id) return null;
    return Object.assign({}, b, { id: String(b.id) });
  }

  function emailRole(email){
    return ROLE_BY_EMAIL[String(email||"").trim().toLowerCase()] || "";
  }

  function ensureFirebase(){
    if(!window.firebase) throw new Error("Firebase SDK not loaded.");
    if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    // Strict login mode: Firebase must not restore an old authenticated
    // session automatically. Every login requires the email + password.
    try {
      auth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(function(e){
        console.warn("Firebase auth persistence setup failed:", e);
      });
    } catch(e) {
      console.warn("Firebase auth persistence setup failed:", e);
    }
    return true;
  }

  function injectLoginUI(){
    const modernModal = document.getElementById("skLoginModal");
    const modernEmail = document.getElementById("loginEmailInput");
    const modernPassword = document.getElementById("loginPasswordInput");
    const modernBtn = document.getElementById("skFirebaseLoginBtn");

    const doLogin = async ()=>{
      const email = (modernEmail?.value || document.getElementById("skFirebaseEmail")?.value || "").trim().toLowerCase();
      const password = modernPassword?.value || document.getElementById("skFirebasePassword")?.value || "";
      if(!email || !password){ msg("❌ Enter Email and Password."); return; }
      if(!emailRole(email)){ msg("❌ This Email is not registered."); return; }
      msg("⏳ Logging in...");
      if(modernBtn) modernBtn.disabled = true;
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch(e) {
        console.error(e);
        msg("❌ Login failed: " + (e.code === "auth/invalid-credential" ? "Email or Password is incorrect." : e.message));
      } finally {
        if(modernBtn) modernBtn.disabled = false;
      }
    };

    if(modernModal && modernEmail && modernPassword && modernBtn){
      if(!modernBtn.dataset.firebaseBound){
        modernBtn.dataset.firebaseBound = "1";
        modernBtn.addEventListener("click", doLogin);
        modernPassword.addEventListener("keydown", e=>{ if(e.key === "Enter") doLogin(); });
        const toggle = document.getElementById("skLoginPasswordToggle");
        if(toggle && !toggle.dataset.bound){
          toggle.dataset.bound = "1";
          toggle.addEventListener("click", ()=>{
            const visible = modernPassword.type === "text";
            modernPassword.type = visible ? "password" : "text";
            toggle.textContent = visible ? "Show" : "Hide";
            toggle.setAttribute("aria-label", visible ? "Show password" : "Hide password");
            toggle.setAttribute("aria-pressed", String(!visible));
            modernPassword.focus();
          });
        }
      }

      // Keep the older role-gate login UI hidden when the supplied modern modal exists.
      const card = document.querySelector("#skRoleGate .sk-login-card");
      if(card){
        const oldGrid = card.querySelector(".sk-role-grid");
        const oldLabel = card.querySelector('label[for="skRolePin"]');
        const oldPin = card.querySelector("#skRolePin");
        const oldWorker = card.querySelector("#skWorkerLoginSelect");
        const oldBtn = card.querySelector("#skRoleLoginBtn");
        [oldGrid, oldLabel, oldPin, oldWorker, oldBtn].forEach(el=>{ if(el) el.style.display="none"; });
      }
      return;
    }

    // Backward-compatible fallback for copies where the supplied modal is absent.
    const card = document.querySelector("#skRoleGate .sk-login-card");
    if(!card || document.getElementById("skFirebaseLoginBlock")) return;
    const block = document.createElement("div");
    block.id = "skFirebaseLoginBlock";
    block.innerHTML = `
      <div style="margin:12px 0 8px;border-top:1px solid var(--card-border,#ddd);padding-top:12px">
        <div style="font-weight:800;font-size:.9rem;margin-bottom:8px">🔐 Email &amp; Password Login</div>
        <input id="skFirebaseEmail" class="sk-login-input" type="email" autocomplete="username" placeholder="Email address">
        <input id="skFirebasePassword" class="sk-login-input" type="password" autocomplete="current-password" placeholder="Password" style="margin-top:7px">
        <button id="skFirebaseLoginBtn" class="sk-login-btn" type="button" style="margin-top:8px">☁️ Firebase Login</button>
        <div style="font-size:.68rem;color:var(--text-muted,#64748b);margin-top:6px">Admin • Manager • Worker</div>
      </div>`;
    card.appendChild(block);
    const oldGrid = card.querySelector(".sk-role-grid");
    const oldLabel = card.querySelector('label[for="skRolePin"]');
    const oldPin = card.querySelector("#skRolePin");
    const oldWorker = card.querySelector("#skWorkerLoginSelect");
    const oldBtn = card.querySelector("#skRoleLoginBtn");
    [oldGrid, oldLabel, oldPin, oldWorker, oldBtn].forEach(el=>{ if(el) el.style.display="none"; });
    const fallbackBtn=document.getElementById("skFirebaseLoginBtn");
    const fallbackEmail=document.getElementById("skFirebaseEmail");
    const fallbackPassword=document.getElementById("skFirebasePassword");
    fallbackBtn.addEventListener("click", doLogin);
    fallbackPassword.addEventListener("keydown", e=>{ if(e.key==="Enter") doLogin(); });
  }

  function gate(show){
    const modern = document.getElementById("skLoginModal");
    const g = document.getElementById("skRoleGate");
    if(modern){
      modern.classList.toggle("active", !!show);
      if(g) g.classList.remove("sk-show");
    } else if(g){
      g.classList.toggle("sk-show", !!show);
    }
    document.body.style.overflow = show ? "hidden" : "";
  }

  async function ensureUserProfile(user){
    const expectedRole = emailRole(user.email);
    if(!expectedRole) throw new Error("This Email is not authorized.");
    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();
    if(!snap.exists){
      await ref.set({
        email: user.email,
        role: expectedRole,
        name: expectedRole === "admin" ? "Admin" : expectedRole === "manager" ? "Manager" : "Worker",
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    const data = (await ref.get()).data() || {};
    if(data.role !== expectedRole) throw new Error("Role configuration does not match.");
    if(data.active === false) throw new Error("This account is disabled.");
    if(expectedRole === "manager"){
      const perms=await getManagerPermissions();
      localStorage.setItem("sk_manager_permissions_v1",JSON.stringify(perms));
      if(perms.managerAccess===false) throw new Error("Manager access is disabled by Admin.");
    }
    return data.role;
  }

  async function getManagerPermissions(){
    if(!db) return {...MANAGER_PERMISSION_DEFAULTS};
    const ref=db.collection("shops").doc(SHOP_ID).collection("permissions").doc(MANAGER_PERMISSION_DOC);
    const snap=await ref.get();
    const remote=snap.exists && snap.data() && typeof snap.data().permissions === "object" ? snap.data().permissions : {};
    return {...MANAGER_PERMISSION_DEFAULTS,...remote};
  }

  async function setManagerPermission(key,value){
    const allowed=Object.prototype.hasOwnProperty.call(MANAGER_PERMISSION_DEFAULTS,key);
    if(!allowed) throw new Error("Unknown Manager permission");
    if(!auth?.currentUser || emailRole(auth.currentUser.email)!=="admin") throw new Error("Admin access only");
    const ref=db.collection("shops").doc(SHOP_ID).collection("permissions").doc(MANAGER_PERMISSION_DOC);
    const current=await getManagerPermissions();
    current[key]=!!value;
    current.managerAccess=current.managerAccess!==false;
    await ref.set({permissions:current,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});
    return current;
  }

  function managerPermission(key){
    try{
      const p=JSON.parse(localStorage.getItem("sk_manager_permissions_v1")||"{}");
      return p[key] !== false;
    }catch(e){ return !!MANAGER_PERMISSION_DEFAULTS[key]; }
  }

  function managerCanSyncKey(key){
    const role=String(localStorage.getItem(ROLE_KEY)||"").toLowerCase();
    if(role!=="manager") return true;
    const k=String(key||"");
    if(k==="sk_bills") return managerPermission("billing");
    if(k==="sk_orders") return managerPermission("orders");
    if(k==="sk_inventory" || k==="sk_low_threshold") return managerPermission("inventory");
    if(k==="sk_credit_ledger_v1") return managerPermission("credit");
    if(k==="sk_repair_tools_note" || k==="sk_tools_others_order_note") return managerPermission("toolsNotes");
    if(k==="sk_workers_v1" || k==="sk_worker_pin_v1") return managerPermission("userManagement");
    if(k==="sk_shop_name" || k==="sk_shop_addr" || k==="sk_shop_phone" || k==="sk_terms" || k==="sk_custom_logo") return managerPermission("shopSettings");
    if(k==="sk_theme" || k==="sk_theme_depth" || k==="sk_font_family" || k==="sk_icon_pack" || k==="sk_appearance_settings" || k==="sk_theme_panel_collapsed") return managerPermission("settings");
    if(k==="sk_recycle_bin_v1") return managerPermission("recycleBin");
    return true;
  }

  window.skFirebaseGetManagerPermissions=async function(){ return getManagerPermissions(); };
  window.skFirebaseSetManagerPermission=async function(key,value){ return setManagerPermission(key,value); };

  function billRef(id){
    return db.collection("shops").doc(SHOP_ID).collection("bills").doc(String(id));
  }

  async function uploadBills(){
    if(!auth?.currentUser || !db || applyingRemote || !remoteReady || syncingLocal) return;
    if(!managerCanSyncKey(BILL_KEY)) return;
    syncingLocal = true;
    try {
      const local = localBills().map(normalizeBill).filter(Boolean);
      const localIds = new Set(local.map(b => b.id));
      const batch = db.batch();
      local.forEach(b => {
        const copy = Object.assign({}, b, {
          _syncUpdatedAt: Date.now(),
          _syncUpdatedBy: auth.currentUser.uid
        });
        if(copy.isDeleted !== true && copy._deleted !== true){
          copy._deleted = false;
        }
        batch.set(billRef(b.id), copy, {merge:true});
      });
      for(const id of lastKnownBillIds){
        if(!localIds.has(id)){
          batch.set(billRef(id), {
            id, isDeleted: true, _deleted: true, _syncUpdatedAt: Date.now(),
            _syncUpdatedBy: auth.currentUser.uid
          }, {merge:true});
        }
      }
      if(local.length || lastKnownBillIds.size) await batch.commit();
      lastKnownBillIds = localIds;
    } catch(e){
      console.error("Bill upload failed", e);
    } finally {
      syncingLocal = false;
    }
  }

  function replaceLocalBillsFromRemote(remoteDocs){
    const remote = [];
    remoteDocs.forEach(d => {
      const r = d.data() || {};
      if(r.isDeleted === true || r._deleted === true) return;
      const id = String(r.id || d.id);
      const clean = Object.assign({}, r, {id});
      delete clean._deleted; delete clean._syncUpdatedBy; delete clean._syncUpdatedAt;
      remote.push(clean);
    });
    setLocalBills(remote);
    lastKnownBillIds = new Set(remote.map(b => String(b.id)));
  }

  function removeBillFromLocalStorage(billId){
    const target = String(billId || '');
    if(!target) return;
    const current = localBills();
    const filtered = current.filter(b => String(b?.id || '') !== target && String(b?.billId || '') !== target && String(b?.billNo || '') !== target);
    if(filtered.length !== current.length){
      setLocalBills(filtered);
    }
  }

  async function startBillSync(){
    if(unsubscribeBills) unsubscribeBills();
    remoteReady = false;
    const ref = db.collection("shops").doc(SHOP_ID).collection("bills");
    const snap = await ref.get();
    const localBefore = localBills();
    const remoteIds = new Set();
    const mergedInitial = new Map();
    snap.docs.forEach(d => {
      const r = d.data() || {};
      const id = String(r.id || d.id);
      remoteIds.add(id);
      if(r.isDeleted === true || r._deleted === true) return;
      mergedInitial.set(id, Object.assign({}, r, {id}));
    });
    // Never discard a local bill that has not reached Firebase yet.
    localBefore.forEach(b => {
      const id = String(b?.id || b?.billId || b?.billNo || "");
      if(id && !remoteIds.has(id)) mergedInitial.set(id, normalizeBill(b));
    });
    setLocalBills([...mergedInitial.values()].filter(Boolean));
    remoteReady = true;
    await uploadBills();

    unsubscribeBills = ref.onSnapshot(snapshot => {
      try {
        const remoteIdsNow = new Set();
        const remoteMap = new Map();
        snapshot.docs.forEach(d => {
          const r = d.data() || {};
          const id = String(r.id || d.id);
          remoteIdsNow.add(id);
          if(r.isDeleted === true || r._deleted === true) return;
          remoteMap.set(id, Object.assign({}, r, {id}));
        });
        const localNow = localBills();
        const merged = new Map(remoteMap);
        // Preserve only genuinely local/unpublished bills; Firebase tombstones win.
        localNow.forEach(b => {
          const id = String(b?.id || b?.billId || b?.billNo || "");
          if(id && !remoteIdsNow.has(id)) merged.set(id, normalizeBill(b));
        });
        setLocalBills([...merged.values()].filter(Boolean));
        lastKnownBillIds = new Set([...remoteMap.keys(), ...[...merged.keys()].filter(id => !remoteIdsNow.has(id))]);
        if([...merged.keys()].some(id => !remoteIdsNow.has(id))) uploadBills().catch(()=>{});
      } catch(e) {
        console.error("Bill snapshot error", e);
      }
    }, err => console.error("Firebase connection error", err));
  }

  // ----------------------------------------------------
  // Repair Jobs: dedicated per-job realtime sync.
  // This intentionally does not use the whole-array generic data mirror.
  // ----------------------------------------------------
  function repairRef(id){
    return db.collection("shops").doc(SHOP_ID).collection(REPAIR_COLLECTION).doc(String(id));
  }

  function repairJobsLocal(){
    try{
      const a = JSON.parse(localStorage.getItem(REPAIR_KEY) || "[]");
      return Array.isArray(a) ? a : [];
    }catch(e){ return []; }
  }

  function setRepairJobsLocal(a){
    repairApplyingRemote = true;
    try { localStorage.setItem(REPAIR_KEY, JSON.stringify(Array.isArray(a) ? a : [])); }
    finally { repairApplyingRemote = false; }
    refreshAllUI();
  }

  function repairTime(job){
    const candidates = [job && job._syncUpdatedAt, job && job.updatedAt, job && job.createdAt];
    for(const value of candidates){
      if(typeof value === "number" && isFinite(value)) return value;
      const n = Date.parse(String(value || ""));
      if(!isNaN(n)) return n;
    }
    return 0;
  }

  function repairNormalize(job){
    if(!job || !job.id) return null;
    const out = Object.assign({}, job, {id:String(job.id)});
    delete out._syncUpdatedBy;
    delete out._deleted;
    delete out.isDeleted;
    delete out._syncUpdatedAt;
    return out;
  }

  async function uploadRepairJobs(force){
    if(!auth?.currentUser || !db || !repairSyncReady || repairApplyingRemote || applyingRemote) return;
    // Repair Jobs cloud synchronization is independent of the Manager UI permission.
    // The permission controls access to the Repair feature; it must not leave this
    // device's existing repair data stranded locally. Firestore rules remain the
    // server-side security boundary for who may write repairJobs.
    try{
      const local = repairJobsLocal().map(repairNormalize).filter(Boolean);
      const localIds = new Set(local.map(j => String(j.id)));
      const batch = db.batch();
      let writes = 0;
      const now = Date.now();

      const pendingMeta = new Map();
      const pendingTombstones = new Map();

      for(const job of local){
        const id = String(job.id);
        const rawHash = syncHash(JSON.stringify(job));
        const previous = repairKnownRemote.get(id);
        const localTime = repairTime(job) || now;
        if(!force && previous && previous.hash === rawHash && !previous.deleted) continue;
        batch.set(repairRef(id), Object.assign({}, job, {
          _syncUpdatedAt: localTime,
          _syncUpdatedBy: auth.currentUser.uid,
          _deleted: false,
          isDeleted: false
        }), {merge:true});
        pendingMeta.set(id, {hash:rawHash, updatedAt:localTime, deleted:false});
        writes++;
      }

      // Publish tombstones for jobs removed locally so another device cannot
      // resurrect them from its older local array.  Do not update
      // repairKnownRemote until the Firestore batch actually commits; otherwise
      // a transient write failure can permanently suppress the retry.
      for(const [id, meta] of repairKnownRemote.entries()){
        if(localIds.has(id) || meta?.deleted) continue;
        batch.set(repairRef(id), {
          id,
          _deleted:true,
          isDeleted:true,
          _syncUpdatedAt:now,
          _syncUpdatedBy:auth.currentUser.uid
        }, {merge:true});
        pendingTombstones.set(id, {hash:"", updatedAt:now, deleted:true});
        writes++;
      }
      if(writes){
        await batch.commit();
        pendingMeta.forEach((meta,id)=>repairKnownRemote.set(id,meta));
        pendingTombstones.forEach((meta,id)=>repairKnownRemote.set(id,meta));
      }
    }catch(e){
      console.error("Repair Jobs cloud sync failed", e);
    }
  }

  async function startRepairJobSync(){
    if(unsubscribeRepairJobs) unsubscribeRepairJobs();
    repairSyncReady = false;
    repairKnownRemote = new Map();
    const ref = db.collection("shops").doc(SHOP_ID).collection(REPAIR_COLLECTION);

    try{
      const snap = await ref.get();
      const remoteMap = new Map();
      const tombstones = new Map();
      snap.docs.forEach(d=>{
        const r = d.data() || {};
        const id = String(r.id || d.id);
        const meta = {
          hash: r._deleted || r.isDeleted ? "" : syncHash(JSON.stringify(repairNormalize(r))),
          updatedAt: Number(r._syncUpdatedAt) || repairTime(r),
          deleted: r._deleted === true || r.isDeleted === true
        };
        repairKnownRemote.set(id, meta);
        if(meta.deleted) tombstones.set(id, meta);
        else remoteMap.set(id, repairNormalize(r));
      });

      const local = repairJobsLocal();
      const merged = new Map(remoteMap);
      local.forEach(job=>{
        const id = String(job?.id || "");
        if(!id) return;
        const remote = remoteMap.get(id);
        const remoteMeta = repairKnownRemote.get(id);
        const localTime = repairTime(job);
        const remoteTime = Number(remoteMeta?.updatedAt || 0);
        if(!remote || localTime > remoteTime){
          merged.set(id, repairNormalize(job));
        } else if(remoteMeta?.deleted && localTime <= remoteTime){
          merged.delete(id);
        }
      });

      // If local contains jobs that are newer than cloud, keep them and upload.
      // If cloud is newer, cloud becomes the local source of truth.
      setRepairJobsLocal([...merged.values()].filter(Boolean));
      repairSyncReady = true;
      await uploadRepairJobs(false);

      unsubscribeRepairJobs = ref.onSnapshot(snapshot=>{
        if(repairApplyingRemote) return;
        try{
          const remoteMapNow = new Map();
          const remoteMetaNow = new Map();
          snapshot.docs.forEach(d=>{
            const r=d.data()||{};
            const id=String(r.id||d.id);
            const deleted=r._deleted===true || r.isDeleted===true;
            const meta={
              hash:deleted?"":syncHash(JSON.stringify(repairNormalize(r))),
              updatedAt:Number(r._syncUpdatedAt)||repairTime(r),
              deleted
            };
            remoteMetaNow.set(id,meta);
            if(!deleted) remoteMapNow.set(id,repairNormalize(r));
          });

          const local=repairJobsLocal();
          const merged=new Map(remoteMapNow);
          let localWins=false;
          local.forEach(job=>{
            const id=String(job?.id||""); if(!id) return;
            const localTime=repairTime(job);
            const rm=remoteMetaNow.get(id);
            const remoteTime=Number(rm?.updatedAt||0);
            if(!rm || localTime>remoteTime){
              merged.set(id,repairNormalize(job));
              localWins=true;
            } else if(rm.deleted && localTime<=remoteTime){
              merged.delete(id);
            }
          });

          const next=[...merged.values()].filter(Boolean);
          const oldRaw=JSON.stringify(local);
          const nextRaw=JSON.stringify(next);
          repairKnownRemote=remoteMetaNow;
          if(oldRaw!==nextRaw){
            setRepairJobsLocal(next);
          }
          if(localWins) uploadRepairJobs(false).catch(()=>{});
        }catch(e){ console.error("Repair Jobs realtime snapshot error",e); }
      }, err=>console.error("Repair Jobs realtime listener error",err));
    }catch(e){
      console.error("Repair Jobs realtime initialization failed",e);
      repairSyncReady=false;
    }
  }

  // கிளவுடில் உள்ள அனைத்து sk_ டேட்டாக்களையும் நிகழ்நேரத்தில் கண்காணிக்கும் அமைப்பு
  const universalLastSyncedHash = new Map();
  let universalSyncStarted = false;

  function syncHash(value){
    const s = String(value ?? "");
    let h = 2166136261;
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
    return (h >>> 0).toString(16);
  }

  async function syncKeyToCloud(key, force=false) {
    if (!auth?.currentUser || !db || applyingRemote || !remoteReady || !isSyncableKey(key)) return;
    if (!managerCanSyncKey(key)) return;
    try {
      const rawData = localStorage.getItem(key);
      if (rawData === null) return;
      const hash = syncHash(rawData);
      if (!force && universalLastSyncedHash.get(key) === hash) return;
      const ref = db.collection("shops").doc(SHOP_ID).collection("data").doc(key);
      const updatedAtMs = Math.max(Date.now(), localChangeTime(key));
      await ref.set({
        data: rawData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAtMs,
        updatedBy: auth.currentUser.uid
      }, { merge: true });
      universalLastSyncedHash.set(key, hash);
      markRemoteBaseline(key, updatedAtMs);
    } catch(e) {
      console.error(key + " cloud sync failed", e);
    }
  }

  async function syncMissingLocalDataToCloud(snapshot) {
    if (!auth?.currentUser || !db || !remoteReady || applyingRemote) return;
    const remoteKeys = new Set(snapshot.docs.map(d => String(d.id)));
    const jobs = [];
    for(let i=0; i<localStorage.length; i++){
      const key = localStorage.key(i);
      if(!isSyncableKey(key) || remoteKeys.has(key)) continue;
      const rawData = localStorage.getItem(key);
      if(rawData === null) continue;
      jobs.push(syncKeyToCloud(key, true));
    }
    if(jobs.length) await Promise.allSettled(jobs);
  }

  async function startUniversalDataSync() {
    if (unsubscribeAllData) unsubscribeAllData();
    universalSyncStarted = false;
    universalLastSyncedHash.clear();
    const dataColRef = db.collection("shops").doc(SHOP_ID).collection("data");

    try {
      // Complete the first snapshot before accepting it as the sync baseline.
      // This removes the login-time race where a local write could be mistaken
      // for the current cloud state or vice versa.
      const initial = await dataColRef.get();
      const remoteKeys = new Set();
      let hasChanges = false;

      const localWins = new Set();
      initial.docs.forEach(doc => {
        const key = String(doc.id);
        if(!isSyncableKey(key)) return;
        remoteKeys.add(key);
        const data = doc.data() || {};
        const cloudVal = data.data;
        if(typeof cloudVal !== "string") return;
        const remoteTime = Number(data.updatedAtMs || 0);
        const localVal = localStorage.getItem(key);
        const localTime = localChangeTime(key);

        // If this device changed the key after the cloud version it last saw,
        // preserve that local write and publish it instead of blindly replacing
        // it during login. This is the core fix for Manager/Admin divergence.
        if(localVal !== null && localVal !== cloudVal && localTime > remoteTime){
          localWins.add(key);
          universalLastSyncedHash.set(key, syncHash(localVal));
          return;
        }

        if(cloudVal !== localVal){
          applyingRemote = true;
          try { localStorage.setItem(key, cloudVal); hasChanges = true; }
          finally { applyingRemote = false; }
        }
        universalLastSyncedHash.set(key, syncHash(cloudVal));
        markRemoteBaseline(key, remoteTime || Date.now());
      });

      remoteReady = true;
      // Upload local-newer keys first, then publish any keys missing in cloud.
      for(const key of localWins) await syncKeyToCloud(key, true);
      await syncMissingLocalDataToCloud(initial);

      // Register the realtime listener only after the initial baseline is ready.
      unsubscribeAllData = dataColRef.onSnapshot(snapshot => {
        if (applyingRemote) return;
        let changed = false;
        snapshot.docChanges().forEach(change => {
          const key = String(change.doc.id);
          if(!isSyncableKey(key)) return;

          if(change.type === "removed"){
            if(localStorage.getItem(key) !== null){
              applyingRemote = true;
              try { localStorage.removeItem(key); changed = true; }
              finally { applyingRemote = false; }
            }
            universalLastSyncedHash.delete(key);
            return;
          }

          const data = change.doc.data() || {};
          const cloudVal = data.data;
          if(typeof cloudVal !== "string") return;
          const localVal = localStorage.getItem(key);
          const remoteTime = Number(data.updatedAtMs || 0);
          const localTime = localChangeTime(key);
          if(localVal !== null && localVal !== cloudVal && localTime > remoteTime){
            syncKeyToCloud(key, true);
            return;
          }
          universalLastSyncedHash.set(key, syncHash(cloudVal));
          if(cloudVal !== localVal){
            applyingRemote = true;
            try { localStorage.setItem(key, cloudVal); changed = true; }
            finally { applyingRemote = false; }
          }
          markRemoteBaseline(key, remoteTime || Date.now());
        });

        // Initial catch-up is already completed before the realtime listener is attached.
        // Avoid rescanning and resyncing every localStorage key on every snapshot.
        if(changed) refreshAllUI();
      }, err => console.error("Universal data sync error", err));

      universalSyncStarted = true;
      if(hasChanges) refreshAllUI();
    } catch(e){
      console.error("Universal data sync initialization failed", e);
      universalSyncStarted = false;
    }
  }

  function startSyncSafetyReconcile(){
    if(window.__skFirebaseSyncReconcile) clearInterval(window.__skFirebaseSyncReconcile);
    window.__skFirebaseSyncReconcile = setInterval(() => {
      if(!auth?.currentUser || !remoteReady || !universalSyncStarted || applyingRemote) return;
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(isSyncableKey(key)) syncKeyToCloud(key);
      }
      if(repairSyncReady) uploadRepairJobs(false);
      if(auth?.currentUser) uploadBills().catch(()=>{});
    }, 15000);
  }

  // லோக்கல் ஸ்டோரேஜில் நடக்கும் அனைத்து மாற்றங்களையும் பிடிக்கும் கொக்கி
  function hookLocalBillWrites(){
    if(window.__skFirebaseStorageHook) return;
    window.__skFirebaseStorageHook = true;

    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;

    Storage.prototype.setItem = function(key, value){
      const result = originalSet.apply(this, arguments);
      if(this === localStorage && !applyingRemote && auth?.currentUser && isSyncableKey(key)) markLocalChange(key, Date.now());
      if(this === localStorage && !applyingRemote && auth?.currentUser && remoteReady){
        if(key === BILL_KEY){
          clearTimeout(syncTimer);
          syncTimer = setTimeout(() => { uploadBills().catch?.(()=>{}); }, 50);
        } else if(key === REPAIR_KEY){
          clearTimeout(repairSyncTimer);
          repairSyncTimer = setTimeout(() => { uploadRepairJobs(false); }, 80);
        } else if(isSyncableKey(key)){
          clearTimeout(syncKeyTimers[key]);
          syncKeyTimers[key] = setTimeout(() => { syncKeyToCloud(key); }, 80);
        }
      }
      return result;
    };

    // Deletions must also propagate. Otherwise a removed key can be
    // resurrected from Firestore on another device.
    Storage.prototype.removeItem = function(key){
      const result = originalRemove.apply(this, arguments);
      if(this === localStorage && !applyingRemote && auth?.currentUser && isSyncableKey(key)) markLocalChange(key, Date.now());
      if(this === localStorage && !applyingRemote && auth?.currentUser && remoteReady){
        if(key === REPAIR_KEY){
          clearTimeout(repairSyncTimer);
          repairSyncTimer = setTimeout(() => { uploadRepairJobs(false); }, 80);
        } else if(isSyncableKey(key)){
          const ref = db.collection("shops").doc(SHOP_ID).collection("data").doc(key);
          ref.delete().catch(e => console.error(key + " cloud delete failed", e));
        }
      }
      return result;
    };
  }

  // ----------------------------------------------------
  // CLOUD BACKUP & RESTORE
  // ----------------------------------------------------
  const CLOUD_BACKUP_ROOT = "cloudBackups";
  const CLOUD_BACKUP_CHUNK = 650000;

  function cloudBackupStatus(text){
    const el = document.getElementById("skCloudBackupStatus");
    if(el) el.textContent = text || "";
  }

  function cloudBackupAllowed(){
    const role = String(localStorage.getItem(ROLE_KEY)||"").toLowerCase();
    if(role === "admin") return true;
    if(role !== "manager") return false;
    try{
      const p = JSON.parse(localStorage.getItem("sk_manager_permissions_v1")||"{}");
      return p.backup !== false;
    }catch(e){ return true; }
  }

  function cloudAutoBackupKeyAllowed(key){
    const k = String(key||"");
    if(!k || cloudRestoreApplying || applyingRemote) return false;
    if(k.indexOf("sk_current_") === 0 || k === "sk_bill_draft" || k === "sk_theme" || k === "sk_theme_depth" || k.indexOf("sk_recovery_backup_") === 0) return false;
    return true;
  }

  function scheduleCloudAutoBackup(key){
    if(!cloudAutoBackupKeyAllowed(key)) return;
    if(!auth?.currentUser || !db || !cloudBackupAllowed()) return;
    clearTimeout(cloudAutoBackupTimer);
    cloudAutoBackupTimer = setTimeout(async function(){
      if(cloudAutoBackupRunning || cloudRestoreApplying || !auth?.currentUser || !db || !cloudBackupAllowed()) return;
      cloudAutoBackupRunning = true;
      try{
        await window.skCloudBackupNow(true);
        toast("☁️ Cloud Sync ✓");
      }catch(e){ console.error("Auto backup error", e); }
      finally{ cloudAutoBackupRunning = false; }
    }, 5000);
  }

  function hookCloudAutoBackup(){
    if(window.__skCloudAutoBackupHook) return;
    window.__skCloudAutoBackupHook = true;
    const original = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value){
      const result = original.apply(this, arguments);
      if(this === localStorage) scheduleCloudAutoBackup(key);
      return result;
    };
    Storage.prototype.removeItem = function(key){
      const result = originalRemove.apply(this, arguments);
      if(this === localStorage) scheduleCloudAutoBackup(key);
      return result;
    };
  }

  function cloudBackupStorage(){
    const out = {};
    for(let i=0; i<localStorage.length; i++){
      const key = localStorage.key(i);
      if(key !== null) out[key] = localStorage.getItem(key);
    }
    return out;
  }

  function cloudDocId(value){
    try{ return btoa(unescape(encodeURIComponent(String(value)))).replace(/[\/+=]/g, "_").slice(0, 140); }
    catch(e){ return String(value).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 140); }
  }

  async function cloudWriteBatches(writes){
    for(let i=0; i<writes.length; i+=450){
      const batch = db.batch();
      writes.slice(i, i+450).forEach(w => batch.set(w.ref, w.data, w.options||{}));
      await batch.commit();
    }
  }

  window.skCloudBackupNow = async function(silent){
    if(!auth?.currentUser || !db){ toast("❌ Firebase Login required"); return; }
    if(!cloudBackupAllowed()){ toast("🔒 Cloud Backup for Admin/Manager only"); return; }
    try{
      cloudBackupStatus(silent ? "⏳ Auto cloud sync..." : "⏳ Creating cloud backup...");
      const data = cloudBackupStorage();
      const backupId = "backup_" + Date.now();
      const backupRef = db.collection("shops").doc(SHOP_ID).collection(CLOUD_BACKUP_ROOT).doc(backupId);
      const itemRefs = db.collection("shops").doc(SHOP_ID).collection(CLOUD_BACKUP_ROOT).doc(backupId).collection("items");
      const writes = [];
      let itemCount = 0, chunkCount = 0;
      Object.keys(data).forEach(key=>{
        const raw = String(data[key] ?? "");
        const ref = itemRefs.doc(cloudDocId(key));
        const chunks = [];
        for(let i=0; i<raw.length; i+=CLOUD_BACKUP_CHUNK) chunks.push(raw.slice(i, i+CLOUD_BACKUP_CHUNK));
        writes.push({ref, data:{key, chunkCount:chunks.length, bytes:raw.length}, options:{merge:true}});
        chunks.forEach((chunk, index)=>{
          writes.push({ref:ref.collection("chunks").doc(String(index).padStart(6, "0")), data:{value:chunk}, options:{merge:true}});
          chunkCount++;
        });
        itemCount++;
      });
      await cloudWriteBatches(writes);
      await backupRef.set({
        app: "SK Mobiles",
        version: 1,
        status: "complete",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        createdBy: auth.currentUser.uid,
        createdByEmail: auth.currentUser.email || "",
        itemCount,
        chunkCount
      }, {merge:true});
      cloudBackupStatus("✅ Cloud backup saved • " + itemCount + " data items");
      if(!silent) toast("☁️ Cloud Backup completed");
    }catch(e){
      console.error("Cloud backup error", e);
      cloudBackupStatus("❌ Cloud backup failed");
    }
  };

  window.skCloudRestoreLatest = async function(){
    if(!auth?.currentUser || !db){ toast("❌ Firebase Login required"); return; }
    const currentRole = String(localStorage.getItem(ROLE_KEY)||"").toLowerCase();
    let restoreAllowed = currentRole === "admin";
    if(currentRole === "manager"){
      try{
        const p = JSON.parse(localStorage.getItem("sk_manager_permissions_v1")||"{}");
        restoreAllowed = p.restore === true;
      }catch(e){ restoreAllowed = false; }
    }
    if(!restoreAllowed){ toast("🔒 Cloud Restore permission denied"); return; }
    if(!confirm("Restore the latest Cloud Backup to this device?")) return;
    try{
      cloudRestoreApplying = true;
      cloudBackupStatus("⏳ Searching for latest cloud backup...");
      const base = db.collection("shops").doc(SHOP_ID).collection(CLOUD_BACKUP_ROOT);
      const snaps = await base.orderBy("createdAtMs","desc").limit(20).get();
      const latest = snaps.docs.find(d => (d.data()||{}).status === "complete");
      if(!latest) throw new Error("Cloud backup not found");
      const itemsSnap = await latest.ref.collection("items").get();
      const restored = {};
      for(const itemDoc of itemsSnap.docs){
        const meta = itemDoc.data() || {};
        const chunkSnap = await itemDoc.ref.collection("chunks").orderBy(firebase.firestore.FieldPath.documentId()).get();
        if(chunkSnap.empty){
          restored[meta.key] = String(meta.value||"");
        }else{
          restored[meta.key] = chunkSnap.docs.map(d => String((d.data()||{}).value||"")).join("");
        }
      }
      const keys = Object.keys(restored);
      if(!keys.length) throw new Error("Cloud backup empty");
      keys.forEach(key => localStorage.setItem(key, restored[key]));
      cloudBackupStatus("✅ Latest cloud backup restored • " + keys.length + " data items");
      toast("☁️ Cloud Restore completed. App is reloading...");
      setTimeout(() => location.reload(), 700);
    }catch(e){
      console.error("Restore error", e);
      cloudBackupStatus("❌ Cloud restore failed");
      toast("❌ Cloud Restore failed: " + (e.message||"Error"));
    }finally{
      cloudRestoreApplying = false;
    }
  };

  function startManagerPermissionListener(){
    if(unsubscribeManagerPermissions){ unsubscribeManagerPermissions(); unsubscribeManagerPermissions=null; }
    if(String(localStorage.getItem(ROLE_KEY)||"").toLowerCase()!=="manager" || !db) return;
    const ref=db.collection("shops").doc(SHOP_ID).collection("permissions").doc(MANAGER_PERMISSION_DOC);
    unsubscribeManagerPermissions=ref.onSnapshot(async snap=>{
      const remote=snap.exists && snap.data() && typeof snap.data().permissions === "object" ? snap.data().permissions : {};
      const perms={...MANAGER_PERMISSION_DEFAULTS,...remote};
      try{localStorage.setItem("sk_manager_permissions_v1",JSON.stringify(perms));}catch(e){}
      if(perms.managerAccess===false){
        toast("🔒 Manager access disabled by Admin");
        try{await auth.signOut();}catch(e){}
        return;
      }
      try{if(typeof window.skApplyRoleRestrictions==='function')window.skApplyRoleRestrictions();}catch(e){}
    },err=>console.warn("Manager permission listener failed:",err));
  }

  // பட்டன்களுக்கு நேரடி கிளிக் நிகழ்வு வழங்குதல்
  function bindBackupButtons() {
    document.querySelectorAll("button").forEach(btn => {
      const text = btn.textContent || "";
      if (text.includes("Backup Now")) {
        btn.onclick = () => window.skCloudBackupNow();
      }
      if (text.includes("Restore Latest")) {
        btn.onclick = () => window.skCloudRestoreLatest();
      }
    });
  }

  // Explicit application logout: terminate the Firebase session and clear
  // only device-local login state. Business/app data must remain untouched.
  window.skFirebaseLogout = async function(){
    try {
      if(auth && auth.currentUser) await auth.signOut();
    } catch(e) {
      console.error("Firebase logout failed:", e);
    }
    try {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(WORKER_KEY);
      const email = document.getElementById("loginEmailInput");
      const password = document.getElementById("loginPasswordInput");
      if(email) email.value = "";
      if(password) password.value = "";
    } catch(e){}
    gate(true);
  };

  async function handleUser(user){
    if(!user){ 
      if(unsubscribeBills){ unsubscribeBills(); unsubscribeBills = null; }
      if(unsubscribeAllData){ unsubscribeAllData(); unsubscribeAllData = null; }
      if(unsubscribeRepairJobs){ unsubscribeRepairJobs(); unsubscribeRepairJobs = null; }
      if(unsubscribeManagerPermissions){ unsubscribeManagerPermissions(); unsubscribeManagerPermissions = null; }
      repairSyncReady = false;
      repairKnownRemote = new Map();
      remoteReady = false;
      universalSyncStarted = false;
      if(window.__skFirebaseSyncReconcile){ clearInterval(window.__skFirebaseSyncReconcile); window.__skFirebaseSyncReconcile=null; }
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(WORKER_KEY);
      try {
        const email = document.getElementById("loginEmailInput");
        const password = document.getElementById("loginPasswordInput");
        if(email) email.value = "";
        if(password) password.value = "";
      } catch(e){}
      gate(true);
      return;
    }
    try {
      const role = await ensureUserProfile(user);
      localStorage.setItem(ROLE_KEY, role);
      if(role === "worker") localStorage.setItem(WORKER_KEY, user.uid);
      else localStorage.removeItem(WORKER_KEY);
      if(role === "manager") startManagerPermissionListener();
      else if(unsubscribeManagerPermissions){ unsubscribeManagerPermissions(); unsubscribeManagerPermissions=null; }
      document.body.classList.toggle("sk-worker-mode", role === "worker");
      if(typeof window.skRefreshRoleBadge === "function") window.skRefreshRoleBadge();
      gate(false);
      msg("");
      try { if(typeof applyRestrictions === "function") applyRestrictions(); } catch(e){}
      try { if(typeof refreshAdminButton === "function") refreshAdminButton(); } catch(e){}
      /* Bootstrap all realtime sources first, then render the UI once. */
      window.__skInitialSyncBatch=true;
      window.__skInitialSyncRefreshPending=false;
      try{
        await startBillSync();
        await startRepairJobSync();
        await startUniversalDataSync();
      }finally{
        window.__skInitialSyncBatch=false;
      }
      if(window.__skInitialSyncRefreshPending){
        window.__skInitialSyncRefreshPending=false;
        refreshAllUI();
      }
      startSyncSafetyReconcile();
      hookCloudAutoBackup();
      bindBackupButtons();
      scheduleCloudAutoBackup("login");
      toast("☁️ " + role.toUpperCase() + " login • All modules real-time synced");
    } catch(e) {
      console.error(e);
      msg("❌ " + e.message);
      await auth.signOut().catch(()=>{});
      gate(true);
    }
  }

  function init(){
    try {
      ensureFirebase();
      injectLoginUI();
      hookLocalBillWrites();
      hookCloudAutoBackup();
      bindBackupButtons();
      gate(true);
      auth.onAuthStateChanged(handleUser);
    } catch(e) {
      console.error(e);
      msg("❌ Firebase initialization failed.");
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();