/* SK MOBILES - Comprehensive Realtime Sync & Cloud Backup
   Bills, Inventory, Job Cards, EMI/Credit & Settings Instant Sync */
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

  const ROLE_KEY = "sk_current_role_v1";
  const WORKER_KEY = "sk_current_worker_id_v1";
  const SHOP_ID = "SK-MOBILES";
  const BILL_KEY = "sk_bills";

  // செயலியில் உள்ள அனைத்து முக்கிய தரவுகளுக்கான முழுமையான பட்டியல்
  const REALTIME_KEYS = [
    "sk_inventory",
    "skx_repair_jobs_v2",
    "sk_emi_reminder_v1",
    "sk_workers_v1",
    "sk_shop_phone"
  ];

  let auth, db, unsubscribeBills = null;
  let unsubscribeGlobal = [];
  let remoteReady = false;
  let applyingRemote = false;
  let syncingLocal = false;
  let lastKnownBillIds = new Set();
  let syncTimer = null;
  const syncKeyTimers = {};
  let cloudAutoBackupTimer = null;
  let cloudAutoBackupRunning = false;
  let cloudRestoreApplying = false;

  function msg(t){
    const el = document.getElementById("skRoleMsg");
    if(el) el.textContent = t || "";
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

  function refreshAllUI(){
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
      if(typeof renderDashboard === "function") renderDashboard();
      if(typeof updateStats === "function") updateStats();
      if(typeof loadAllData === "function") loadAllData();
    } catch(e){}
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
    return true;
  }

  function injectLoginUI(){
    const card = document.querySelector("#skRoleGate .sk-login-card");
    if(!card || document.getElementById("skFirebaseLoginBlock")) return;
    const block = document.createElement("div");
    block.id = "skFirebaseLoginBlock";
    block.innerHTML = `
      <div style="margin:12px 0 8px;border-top:1px solid var(--card-border,#ddd);padding-top:12px">
        <div style="font-weight:800;font-size:.9rem;margin-bottom:8px">🔐 Email & Password Login</div>
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

    const doLogin = async ()=>{
      const email = (document.getElementById("skFirebaseEmail")?.value || "").trim().toLowerCase();
      const password = document.getElementById("skFirebasePassword")?.value || "";
      if(!email || !password){ msg("❌ Email மற்றும் Password உள்ளிடவும்."); return; }
      if(!emailRole(email)){ msg("❌ இந்த Email பதிவு செய்யப்படவில்லை."); return; }
      msg("⏳ Login செய்கிறது...");
      try {
        await auth.signInWithEmailAndPassword(email, password);
      } catch(e) {
        console.error(e);
        msg("❌ Login failed: " + (e.code === "auth/invalid-credential" ? "Email அல்லது Password தவறாக உள்ளது." : e.message));
      }
    };
    document.getElementById("skFirebaseLoginBtn").addEventListener("click", doLogin);
    document.getElementById("skFirebasePassword").addEventListener("keydown", e=>{ if(e.key==="Enter") doLogin(); });
  }

  function gate(show){
    const g = document.getElementById("skRoleGate");
    if(g) g.classList.toggle("sk-show", !!show);
    document.body.style.overflow = show ? "hidden" : "";
  }

  async function ensureUserProfile(user){
    const expectedRole = emailRole(user.email);
    if(!expectedRole) throw new Error("இந்த Email அனுமதிக்கப்படவில்லை.");
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
      return expectedRole;
    }
    const data = snap.data() || {};
    if(data.role !== expectedRole) throw new Error("Role அமைப்பு பொருந்தவில்லை.");
    if(data.active === false) throw new Error("இந்த கணக்கு முடக்கப்பட்டுள்ளது.");
    return data.role;
  }

  function billRef(id){
    return db.collection("shops").doc(SHOP_ID).collection("bills").doc(String(id));
  }

  async function uploadBills(){
    if(!auth?.currentUser || !db || applyingRemote || !remoteReady || syncingLocal) return;
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
    replaceLocalBillsFromRemote(snap.docs);
    remoteReady = true;

    unsubscribeBills = ref.onSnapshot(snapshot => {
      try {
        snapshot.docChanges().forEach(change => {
          const data = change.doc.data() || {};
          const docId = String(change.doc.id);
          if(data.isDeleted === true || data._deleted === true || change.type === "removed") {
            removeBillFromLocalStorage(docId);
            lastKnownBillIds.delete(docId);
          }
        });

        const activeRemote = [];
        snapshot.docs.forEach(d => {
          const r = d.data() || {};
          if(r.isDeleted === true || r._deleted === true) return;
          activeRemote.push(Object.assign({}, r, { id: String(r.id || d.id) }));
        });

        setLocalBills(activeRemote);
        lastKnownBillIds = new Set(activeRemote.map(b => String(b.id)));
      } catch(e) {
        console.error("Bill snapshot error", e);
      }
    }, err => console.error("Firebase connection error", err));
  }

  // ----------------------------------------------------
  // அனைத்து மாட்யூல்களுக்குமான ரியல்டைம் ஒத்திசைவு
  // ----------------------------------------------------
  function syncKeyToCloud(key) {
    if (!auth?.currentUser || !db || applyingRemote || !remoteReady) return;
    try {
      const rawData = localStorage.getItem(key);
      if (rawData === null) return;
      const ref = db.collection("shops").doc(SHOP_ID).collection("data").doc(key);
      ref.set({
        data: rawData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser.uid
      }, { merge: true });
    } catch(e) {
      console.error(key + " cloud sync failed", e);
    }
  }

  function startGlobalSync() {
    unsubscribeGlobal.forEach(unsub => { try { unsub(); } catch(e){} });
    unsubscribeGlobal = [];

    REALTIME_KEYS.forEach(key => {
      const ref = db.collection("shops").doc(SHOP_ID).collection("data").doc(key);
      const unsub = ref.onSnapshot(docSnap => {
        if (!docSnap.exists || applyingRemote) return;
        const cloudVal = (docSnap.data() || {}).data;
        const localVal = localStorage.getItem(key);
        if (cloudVal && cloudVal !== localVal) {
          applyingRemote = true;
          try {
            localStorage.setItem(key, cloudVal);
            refreshAllUI();
          } finally {
            applyingRemote = false;
          }
        }
      }, err => console.error(key + " sync error", err));
      unsubscribeGlobal.push(unsub);
    });
  }

  function hookLocalBillWrites(){
    if(window.__skFirebaseStorageHook) return;
    window.__skFirebaseStorageHook = true;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value){
      const result = original.apply(this, arguments);
      if(this === localStorage && !applyingRemote && auth?.currentUser && remoteReady){
        if(key === BILL_KEY){
          clearTimeout(syncTimer);
          syncTimer = setTimeout(uploadBills, 50);
        } else if(REALTIME_KEYS.includes(key)){
          clearTimeout(syncKeyTimers[key]);
          syncKeyTimers[key] = setTimeout(() => syncKeyToCloud(key), 80);
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
    return role === "admin" || role === "manager";
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
    if(!auth?.currentUser || !db){ toast("❌ Firebase Login தேவை"); return; }
    if(!cloudBackupAllowed()){ toast("🔒 Cloud Backup Admin/Manager-க்கு மட்டும்"); return; }
    try{
      cloudBackupStatus(silent ? "⏳ Auto cloud sync..." : "⏳ Cloud backup உருவாக்கப்படுகிறது...");
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
    if(!auth?.currentUser || !db){ toast("❌ Firebase Login தேவை"); return; }
    if(!cloudBackupAllowed()){ toast("🔒 Cloud Restore Admin/Manager-க்கு மட்டும்"); return; }
    if(!confirm("Latest Cloud Backup-ஐ இந்த device-க்கு restore செய்யவா?")) return;
    try{
      cloudRestoreApplying = true;
      cloudBackupStatus("⏳ Latest cloud backup தேடப்படுகிறது...");
      const base = db.collection("shops").doc(SHOP_ID).collection(CLOUD_BACKUP_ROOT);
      const snaps = await base.orderBy("createdAtMs","desc").limit(20).get();
      const latest = snaps.docs.find(d => (d.data()||{}).status === "complete");
      if(!latest) throw new Error("Cloud backup கிடைக்கவில்லை");
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
      toast("☁️ Cloud Restore completed. App reload ஆகிறது...");
      setTimeout(() => location.reload(), 700);
    }catch(e){
      console.error("Restore error", e);
      cloudBackupStatus("❌ Cloud restore failed");
      toast("❌ Cloud Restore failed: " + (e.message||"Error"));
    }finally{
      cloudRestoreApplying = false;
    }
  };

  async function handleUser(user){
    if(!user){ 
      if(unsubscribeBills){ unsubscribeBills(); unsubscribeBills = null; }
      unsubscribeGlobal.forEach(unsub => { try { unsub(); } catch(e){} });
      unsubscribeGlobal = [];
      remoteReady = false;
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(WORKER_KEY);
      gate(true);
      return;
    }
    try {
      const role = await ensureUserProfile(user);
      localStorage.setItem(ROLE_KEY, role);
      if(role === "worker") localStorage.setItem(WORKER_KEY, user.uid);
      else localStorage.removeItem(WORKER_KEY);
      document.body.classList.toggle("sk-worker-mode", role === "worker");
      gate(false);
      msg("");
      try { if(typeof applyRestrictions === "function") applyRestrictions(); } catch(e){}
      try { if(typeof refreshAdminButton === "function") refreshAdminButton(); } catch(e){}
      await startBillSync();
      startGlobalSync();
      hookCloudAutoBackup();
      scheduleCloudAutoBackup("login");
      toast("☁️ " + role.toUpperCase() + " login • PC/Mobile sync connected");
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