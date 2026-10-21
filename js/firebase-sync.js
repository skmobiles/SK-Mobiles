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

  /* V5.10.0: sign-in with Google. Only the owner is fixed; every other person gets a role from the owner
     in Settings -> People (stored in users/{uid}.role and enforced by firestore.rules). */
  const OWNER_EMAIL = "skmobilesdpi@gmail.com";
  const STAFF_ROLES = ["admin","manager","worker"];
  let currentRole = "";
  let unsubscribeOwnUser = null;

  const MANAGER_PERMISSION_DEFAULTS = {
    managerAccess:true, billing:false, orders:false, inventory:false, credit:false, repair:false,
    toolsNotes:false, dataFolder:false, settings:false, profile:true, backup:false, restore:false,
    shopSettings:false, userManagement:false, recycleBin:false, editDelete:false
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
  let cloudAutoBackupLastMs = 0;
  const CLOUD_AUTO_BACKUP_MIN_INTERVAL = 24 * 60 * 60 * 1000;
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

  // Automatically detects all sk_ and skx_ keys
  function isSyncableKey(key) {
    if (!key) return false;
    // Skip only device-specific settings such as login/theme
    if (key === SYNC_META_KEY || key === "sk_current_role_v1" || key === "sk_current_worker_id_v1" || key === "sk_theme" || key === "sk_appearance_settings" || key === "sk_bill_draft" || key === REPAIR_KEY || key === BILL_KEY) {
      /* V5.11.48: bills sync one by one (uploadBills); syncing the whole list too let one device overwrite the other's new bills. */
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
    try{ if(typeof savedBills !== "undefined") savedBills = a; }catch(e){}
    refreshAllUI();
  }

  // Refresh all UI sections as soon as data changes
  /* V5.11.48: keep the in-memory lists of the app equal to what was just synced, so the next save never writes an old copy back */
  function isProtectedDataKey(key){
    key = String(key||"");
    return /^(sk_inventory|sk_orders|sk_credit_ledger_v1|sk_receipts_v1|sk_used_mobile_stock_v1|skx_outside_pay_v1|sk_recycle_bin_v1)$/.test(key) || universalBase.has(key);
  }

  function syncAppGlobals(key){
    try{
      if(key==="sk_inventory"||key===null){ const v=JSON.parse(localStorage.getItem("sk_inventory")||"null"); if(Array.isArray(v)&&typeof inventory!=="undefined"){ inventory=v; window.inventory=v; } }
      if(key==="sk_orders"||key===null){ const v=JSON.parse(localStorage.getItem("sk_orders")||"null"); if(Array.isArray(v)&&typeof ordersList!=="undefined"){ ordersList=v; } }
    }catch(e){}
  }

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
      /* V5.9.8: never redraw the screen in the middle of a tap - a button replaced between finger-down and finger-up
         loses the tap (home boxes "did nothing" while cloud updates were arriving). Wait until the finger is lifted. */
      if(window.__skTouchBusy && window.__skTouchBusy()){ refreshUiFrame=setTimeout(run,350); return; }
      try {
        if(typeof savedBills !== "undefined") savedBills = localBills();
        syncAppGlobals(null);
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
    const bid=b&&(b.id||b.billId||b.billNo);
    if(!bid) return null;
    return Object.assign({}, b, { id: String(bid) });
  }

  function emailRole(email){
    return String(email||"").trim().toLowerCase() === OWNER_EMAIL ? "admin" : "";
  }

  async function ensureFirebase(){
    if(!window.firebase) throw new Error("Firebase SDK not loaded.");
    if(!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    // Restore the signed-in Firebase session on this browser/device.
    // Role and permissions are still revalidated by handleUser/ensureUserProfile.
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch(e) {
      console.warn("Firebase local persistence setup failed:", e);
      throw e;
    }
    return true;
  }

  function showLoginStep(step, user, role){
    const signIn = document.getElementById("skLoginSignIn");
    const wait = document.getElementById("skLoginWaiting");
    if(signIn) signIn.hidden = step !== "signin";
    if(wait) wait.hidden = step !== "waiting";
    if(step === "waiting"){
      const who = document.getElementById("skLoginWaitWho");
      const title = document.getElementById("skLoginWaitTitle");
      const text = document.getElementById("skLoginWaitText");
      if(who) who.textContent = ((user && user.displayName) ? user.displayName + " " : "") + "(" + ((user && user.email) || "") + ")";
      if(title) title.textContent = role === "none" ? "No access" : "Waiting for access";
      if(text) text.textContent = role === "none"
        ? "The owner has turned off access for this account. Ask the owner if you need access again."
        : "The owner has to give you access. Keep this page open — the app opens by itself once you have access.";
    }
  }

  function injectLoginUI(){
    const btn = document.getElementById("skGoogleLoginBtn");
    if(btn && !btn.dataset.bound){
      btn.dataset.bound = "1";
      btn.addEventListener("click", async ()=>{
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        msg("⏳ Opening Google sign-in…");
        btn.disabled = true;
        try {
          await auth.signInWithPopup(provider);
          msg("");
        } catch(e) {
          const code = e && e.code || "";
          if(code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || code === "auth/web-storage-unsupported"){
            try { await auth.signInWithRedirect(provider); return; } catch(e2){ console.error(e2); }
          }
          if(code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") msg("");
          else if(code === "auth/unauthorized-domain") msg("❌ This web address is not allowed for sign-in yet (Firebase → Authentication → Authorized domains).");
          else if(code === "auth/operation-not-allowed") msg("❌ Google sign-in is not turned on yet (Firebase → Authentication → Sign-in method → Google).");
          else { console.error(e); msg("❌ Sign-in failed: " + (e && e.message || code)); }
        } finally {
          btn.disabled = false;
        }
      });
    }
    const other = document.getElementById("skLoginOtherAccount");
    if(other && !other.dataset.bound){
      other.dataset.bound = "1";
      other.addEventListener("click", async ()=>{ try { await auth.signOut(); } catch(e){} showLoginStep("signin"); });
    }
    showLoginStep("signin");
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
    const email = String(user.email||"").trim().toLowerCase();
    const ref = db.collection("users").doc(user.uid);
    let snap = await ref.get();
    if(!snap.exists){
      const isOwner = email === OWNER_EMAIL && user.emailVerified !== false;
      await ref.set({
        email: user.email,
        name: user.displayName || "",
        photo: user.photoURL || "",
        role: isOwner ? "admin" : "pending",
        active: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      snap = await ref.get();
    } else {
      /* keep name / photo fresh; the role itself can only be changed by the owner */
      const d = snap.data() || {};
      /* V5.10.4: older records have no "active" field; add it (role untouched) so the security rules can read it */
      if(d.active === undefined){
        try { await ref.update({ active: true }); snap = await ref.get(); } catch(e){ console.warn("active field not added", e); }
      }
      if((user.displayName && d.name !== user.displayName) || (user.photoURL && d.photo !== user.photoURL)){
        try { await ref.update({ name: user.displayName || d.name || "", photo: user.photoURL || d.photo || "", lastSeenAt: firebase.firestore.FieldValue.serverTimestamp() }); } catch(e){}
      }
    }
    const data = snap.data() || {};
    let role = String(data.role || "pending");
    if(data.active === false) role = "none";
    if(STAFF_ROLES.indexOf(role) < 0) return role;            /* pending / none: no app access */
    if(role === "manager"){
      const perms = await getManagerPermissions();
      localStorage.setItem("sk_manager_permissions_v1", JSON.stringify(perms));
      if(perms.managerAccess === false) throw new Error("Manager access is disabled by Admin.");
    }
    return role;
  }

  /* own user record: when the owner changes this person's role, reopen the app with the new role */
  function watchOwnUser(user, roleNow){
    if(unsubscribeOwnUser){ unsubscribeOwnUser(); unsubscribeOwnUser = null; }
    unsubscribeOwnUser = db.collection("users").doc(user.uid).onSnapshot(snap=>{
      if(!snap.exists) return;
      const d = snap.data() || {};
      const r = d.active === false ? "none" : String(d.role || "pending");
      if(r !== roleNow){
        if(unsubscribeOwnUser){ unsubscribeOwnUser(); unsubscribeOwnUser = null; }
        if(STAFF_ROLES.indexOf(roleNow) >= 0) { location.reload(); return; }   /* role taken away or changed while working */
        handleUser(user);                                                      /* access just granted */
      }
    }, err=>console.warn("Own user listener failed:", err));
  }

  /* ---------- Settings -> People (owner only) ---------- */
  window.skPeopleWatch = function(cb){
    if(!db || currentRole !== "admin") return function(){};
    return db.collection("users").onSnapshot(qs=>{
      const list = [];
      qs.forEach(doc=>{ const d = doc.data() || {}; list.push({ uid: doc.id, email: d.email || "", name: d.name || "", photo: d.photo || "", role: d.active === false ? "none" : String(d.role || "pending"), createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0 }); });
      cb(list, auth.currentUser && auth.currentUser.uid);
    }, err=>{ console.warn("People list failed:", err); cb(null, null, err); });
  };
  window.skPeopleSetRole = async function(uid, role){
    if(currentRole !== "admin") throw new Error("Owner only");
    if(["manager","worker","none"].indexOf(role) < 0) throw new Error("Unknown role");
    if(auth.currentUser && uid === auth.currentUser.uid) throw new Error("You cannot change your own role");
    await db.collection("users").doc(uid).update({ role: role, active: role !== "none", updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: auth.currentUser.uid });
  };
  window.skPeopleRemove = async function(uid){
    if(currentRole !== "admin") throw new Error("Owner only");
    if(auth.currentUser && uid === auth.currentUser.uid) throw new Error("You cannot remove yourself");
    await db.collection("users").doc(uid).delete();
  };
  window.skCurrentRole = function(){ return currentRole || String(localStorage.getItem(ROLE_KEY)||"").toLowerCase(); };

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
    if(!auth?.currentUser || currentRole!=="admin") throw new Error("Admin access only");
    const ref=db.collection("shops").doc(SHOP_ID).collection("permissions").doc(MANAGER_PERMISSION_DOC);
    const current=await getManagerPermissions();
    current[key]=!!value;
    current.managerAccess=current.managerAccess!==false;
    await ref.set({permissions:current,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});
    return current;
  }

  
  function managerCanSyncKey(key){
    /*
     * IMPORTANT:
     * Manager feature permissions control which UI modules/actions are
     * available to the manager. They must NOT block the background
     * replication layer, otherwise data created on one authorised device
     * can remain local-only and never reach the other devices.
     *
     * Firestore rules are the server-side security boundary. All active
     * SK MOBILES staff accounts are allowed to replicate shop data.
     */
    return true;
  }

  window.skFirebaseGetManagerPermissions=async function(){ return getManagerPermissions(); };
  window.skFirebaseSetManagerPermission=async function(key,value){ return setManagerPermission(key,value); };
  window.skFirebaseSetManagerPermissions=async function(obj){
    if(!auth?.currentUser || currentRole!=="admin") throw new Error("Admin access only");
    const current=await getManagerPermissions();
    Object.keys(obj||{}).forEach(k=>{ if(Object.prototype.hasOwnProperty.call(MANAGER_PERMISSION_DEFAULTS,k)) current[k]=!!obj[k]; });
    const ref=db.collection("shops").doc(SHOP_ID).collection("permissions").doc(MANAGER_PERMISSION_DOC);
    await ref.set({permissions:current,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedBy:auth.currentUser.uid},{merge:true});
    return current;
  };

  function billRef(id){
    return db.collection("shops").doc(SHOP_ID).collection("bills").doc(String(id));
  }

  /* V5.11.48: per-bill fingerprint of the last synced content, so only changed bills are uploaded and a local edit is not overwritten by an old cloud copy */
  const billHashes = new Map();
  let billUploadPending = false;
  function billFingerprint(b){
    const c = Object.assign({}, b);
    delete c._syncUpdatedAt; delete c._syncUpdatedBy; delete c._deleted; delete c.isDeleted;
    return syncHash(JSON.stringify(c));
  }

  async function uploadBills(){
    if(!auth?.currentUser || !db || applyingRemote || !remoteReady || window.__skRestoring) return;
    if(syncingLocal){ billUploadPending = true; return; }
    // Billing feature permissions control UI actions; they must not block
    // realtime replication of already-authorised shop data.
    syncingLocal = true;
    try {
      const local = localBills().map(normalizeBill).filter(Boolean);
      const localIds = new Set(local.map(b => b.id));
      const batch = db.batch();
      const pendingHashes = new Map();
      let billWrites = 0;
      local.forEach(b => {
        const fp = billFingerprint(b);
        if(billHashes.get(b.id) === fp) return;
        pendingHashes.set(b.id, fp);
        billWrites++;
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
      let tombs = 0;
      for(const id of lastKnownBillIds){ if(!localIds.has(id)) tombs++; }
      if(billWrites || tombs) await batch.commit();
      pendingHashes.forEach((fp,id)=>billHashes.set(id,fp));
      lastKnownBillIds = localIds;
    } catch(e){
      console.error("Bill upload failed", e);
    } finally {
      syncingLocal = false;
      if(billUploadPending){ billUploadPending = false; setTimeout(()=>{ uploadBills().catch(()=>{}); }, 200); }
    }
  }

  
  
  async function startBillSync(){
    if(unsubscribeBills) unsubscribeBills();
    remoteReady = false;
    const ref = db.collection("shops").doc(SHOP_ID).collection("bills");
    let initialized = false;

    // Use the first realtime snapshot as the initial baseline. A separate ref.get()
    // immediately before onSnapshot() downloaded every bill twice at login.
    unsubscribeBills = ref.onSnapshot(async snapshot => {
      try {
        // Do not establish the baseline from a possibly incomplete local cache.
        if(!initialized && snapshot.metadata && snapshot.metadata.fromCache) return;
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
        /* V5.11.48: a bill edited on this phone and not uploaded yet must not be replaced by the older cloud copy */
        const keepLocalIds = new Set();
        localBills().forEach(lb => {
          const id = String(lb?.id || lb?.billId || lb?.billNo || "");
          const rb = remoteMap.get(id);
          if(!id || !rb) return;
          const known = billHashes.get(id);
          if(known && billFingerprint(normalizeBill(lb)) !== known && billFingerprint(rb) === known) keepLocalIds.add(id);
        });
        keepLocalIds.forEach(id => { const lb = localBills().find(x => String(x?.id || x?.billId || x?.billNo || "") === id); if(lb) merged.set(id, normalizeBill(lb)); });
        remoteMap.forEach((rb,id) => { if(!keepLocalIds.has(id)) billHashes.set(id, billFingerprint(rb)); });
        // Preserve local bills that have not reached Firebase yet; remote
        // tombstones still win because their IDs remain in remoteIdsNow.
        localNow.forEach(b => {
          const id = String(b?.id || b?.billId || b?.billNo || "");
          if(id && !remoteIdsNow.has(id)) merged.set(id, normalizeBill(b));
        });
        setLocalBills([...merged.values()].filter(Boolean));
        lastKnownBillIds = new Set([...remoteMap.keys(), ...[...merged.keys()].filter(id => !remoteIdsNow.has(id))]);

        if(!initialized){
          initialized = true;
          remoteReady = true;
          await uploadBills();
        } else if(keepLocalIds.size || [...merged.keys()].some(id => !remoteIdsNow.has(id))){
          uploadBills().catch(()=>{});
        }
      } catch(e) {
        console.error("Bill snapshot error", e);
      }
    }, err => {
      console.error("Firebase connection error", err);
      realtimeSyncStatus("❌ Realtime Sync error • " + (err?.code || "Firebase connection"));
    });
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
      /* V5.11.48: never delete most of the cloud list in one go (e.g. after a bad local read) */
      let tombCandidates=0, knownLive=0;
      for(const [id, meta] of repairKnownRemote.entries()){ if(meta?.deleted) continue; knownLive++; if(!localIds.has(id)) tombCandidates++; }
      const skipTombstones = window.__skRjCorrupt || (knownLive>=5 && tombCandidates>Math.max(3,Math.floor(knownLive*0.5)));
      if(skipTombstones && tombCandidates) console.warn("Repair sync: skipped deleting "+tombCandidates+" cloud jobs (safety guard)");
      for(const [id, meta] of repairKnownRemote.entries()){
        if(skipTombstones) break;
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
    let initialized = false;
    let snapshotQueue = Promise.resolve();

    // The initial onSnapshot contains the current collection and can serve as
    // the baseline. Avoid reading the entire repairJobs collection with get()
    // and then downloading it again when the listener starts.
    unsubscribeRepairJobs = ref.onSnapshot(snapshot=>{
      snapshotQueue = snapshotQueue.then(async ()=>{
        if(!initialized && snapshot.metadata && snapshot.metadata.fromCache) return;
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
          if(oldRaw!==nextRaw) setRepairJobsLocal(next);

          if(!initialized){
            initialized=true;
            repairSyncReady=true;
            await uploadRepairJobs(false);
          } else if(localWins){
            uploadRepairJobs(false).catch(()=>{});
          }
        }catch(e){ console.error("Repair Jobs realtime snapshot error",e); }
      }).catch(e=>console.error("Repair Jobs snapshot queue error",e));
    }, err=>{
      console.error("Repair Jobs realtime listener error",err);
      realtimeSyncStatus("❌ Realtime Sync error • Repair Jobs listener");
    });
  }

  // Watches all sk_ cloud data in real time
  const universalLastSyncedHash = new Map();
  const universalDirtyKeys = new Set();
  let universalSyncStarted = false;

  function syncHash(value){
    const s = String(value ?? "");
    let h = 2166136261;
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); }
    return (h >>> 0).toString(16);
  }

  /* V5.11.48: lists (ledger, receipts, used stock, outside payments, recycle bin, ...) are merged item by item (by id) with the last
     synced copy as the base, so two phones adding records at the same time keep both, and a delete on one phone is not undone by the other. */
  const universalBase = new Map();
  function parseList(str){
    try{
      const a = JSON.parse(str);
      if(!Array.isArray(a)) return null;
      for(const x of a){ if(!x || typeof x !== "object" || x.id === undefined || x.id === null || x.id === "") return null; }
      return a;
    }catch(e){ return null; }
  }
  function setUniversalBase(key, str){
    const a = parseList(str);
    if(a) universalBase.set(String(key), a); else universalBase.delete(String(key));
  }
  function itemTime(x){
    for(const k of ["_syncUpdatedAt","updatedAtMs","updatedAt","editedAt","createdAt","date"]){
      const v = x && x[k];
      if(typeof v === "number" && isFinite(v)) return v;
      const n = Date.parse(String(v || ""));
      if(!isNaN(n)) return n;
    }
    return 0;
  }
  function mergeLists(base, local, remote){
    const key = x => String(x.id);
    const B = new Map((base||[]).map(x => [key(x), JSON.stringify(x)]));
    const L = new Map(local.map(x => [key(x), x]));
    const R = new Map(remote.map(x => [key(x), x]));
    const out = [];
    const used = new Set();
    const hasBase = !!base;
    for(const [id, r] of R){
      used.add(id);
      const l = L.get(id);
      const rs = JSON.stringify(r);
      if(!l){
        if(hasBase && B.has(id) && B.get(id) === rs) continue;   // deleted here, unchanged there
        out.push(r); continue;                                   // added there (or edited there)
      }
      const ls = JSON.stringify(l);
      if(ls === rs){ out.push(r); continue; }
      if(hasBase && B.has(id)){
        if(B.get(id) === ls){ out.push(r); continue; }            // only changed there
        if(B.get(id) === rs){ out.push(l); continue; }            // only changed here
      }
      out.push(itemTime(l) > itemTime(r) ? l : r);               // both changed: newer wins
    }
    for(const [id, l] of L){
      if(used.has(id)) continue;
      if(hasBase && B.has(id) && B.get(id) === JSON.stringify(l)) continue; // deleted there, unchanged here
      out.push(l);                                                // added here (or edited here)
    }
    return out;
  }
  /* returns the merged JSON text, or null when this key is not a list of records */
  function tryMergeKey(key, localVal, cloudVal){
    const l = parseList(localVal), r = parseList(cloudVal);
    if(!l || !r) return null;
    const merged = mergeLists(universalBase.get(String(key)) || null, l, r);
    return JSON.stringify(merged);
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
      setUniversalBase(key, rawData);
      universalDirtyKeys.delete(String(key));
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
    remoteReady = false;
    realtimeSyncStatus("⏳ Realtime Sync connecting...");
    universalLastSyncedHash.clear();
    const dataColRef = db.collection("shops").doc(SHOP_ID).collection("data");
    let initialized = false;
    let snapshotQueue = Promise.resolve();

    // Use one realtime listener for both initial reconciliation and ongoing
    // changes. The former get()+onSnapshot() pattern read every sync document
    // twice during login (once for get, again for the listener's first snapshot).
    unsubscribeAllData = dataColRef.onSnapshot(snapshot => {
      snapshotQueue = snapshotQueue.then(async () => {
        if(!initialized && snapshot.metadata && snapshot.metadata.fromCache) return;
        if(!initialized){
          const remoteKeys = new Set();
          let hasChanges = false;
          const localWins = new Set();

          snapshot.docs.forEach(doc => {
            const key = String(doc.id);
            if(!isSyncableKey(key)) return;
            remoteKeys.add(key);
            const data = doc.data() || {};
            const cloudVal = data.data;
            if(typeof cloudVal !== "string") return;
            const remoteTime = Number(data.updatedAtMs || 0);
            const localVal = localStorage.getItem(key);
            const localTime = localChangeTime(key);

            if(localVal !== null && localVal !== cloudVal){
              const mergedVal = tryMergeKey(key, localVal, cloudVal);
              if(mergedVal !== null){
                if(mergedVal !== localVal){
                  applyingRemote = true;
                  try { localStorage.setItem(key, mergedVal); hasChanges = true; syncAppGlobals(key); }
                  finally { applyingRemote = false; }
                }
                setUniversalBase(key, cloudVal);
                if(mergedVal !== cloudVal){ localWins.add(key); universalLastSyncedHash.set(key, syncHash(cloudVal)); }
                else universalLastSyncedHash.set(key, syncHash(cloudVal));
                markRemoteBaseline(key, remoteTime || Date.now());
                return;
              }
            }
            if(localVal !== null && localVal !== cloudVal && localTime > remoteTime){
              localWins.add(key);
              universalLastSyncedHash.set(key, syncHash(localVal));
              return;
            }
            if(cloudVal !== localVal){
              applyingRemote = true;
              try { localStorage.setItem(key, cloudVal); hasChanges = true; syncAppGlobals(key); }
              finally { applyingRemote = false; }
            }
            setUniversalBase(key, cloudVal);
            universalLastSyncedHash.set(key, syncHash(cloudVal));
            markRemoteBaseline(key, remoteTime || Date.now());
          });

          // Mark initialized before awaits; queued snapshots are processed in
          // order after this baseline reconciliation completes.
          initialized = true;
          remoteReady = true;
          for(const key of localWins) await syncKeyToCloud(key, true);
          await syncMissingLocalDataToCloud(snapshot);
          universalSyncStarted = true;
          realtimeSyncStatus("🟢 Realtime Auto Sync: ON • All app data connected");
          if(hasChanges) refreshAllUI();
          return;
        }

        if (applyingRemote) return;
        let changed = false;
        snapshot.docChanges().forEach(change => {
          const key = String(change.doc.id);
          if(!isSyncableKey(key)) return;
          if(change.type === "removed"){
            if(isProtectedDataKey(key)) return;
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
          if(localVal !== null && localVal !== cloudVal){
            const mergedVal = tryMergeKey(key, localVal, cloudVal);
            if(mergedVal !== null){
              if(mergedVal !== localVal){
                applyingRemote = true;
                try { localStorage.setItem(key, mergedVal); changed = true; syncAppGlobals(key); }
                finally { applyingRemote = false; }
              }
              setUniversalBase(key, cloudVal);
              universalLastSyncedHash.set(key, syncHash(cloudVal));
              markRemoteBaseline(key, remoteTime || Date.now());
              if(mergedVal !== cloudVal) setTimeout(()=>{ syncKeyToCloud(key, true); }, 0);
              return;
            }
          }
          if(localVal !== null && localVal !== cloudVal && localTime > remoteTime){
            syncKeyToCloud(key, true);
            return;
          }
          setUniversalBase(key, cloudVal);
          universalLastSyncedHash.set(key, syncHash(cloudVal));
          if(cloudVal !== localVal){
            applyingRemote = true;
            try { localStorage.setItem(key, cloudVal); changed = true; syncAppGlobals(key); }
            finally { applyingRemote = false; }
          }
          markRemoteBaseline(key, remoteTime || Date.now());
        });
        if(changed) refreshAllUI();
      }).catch(e=>{
        console.error("Universal data sync initialization/update failed", e);
        realtimeSyncStatus("❌ Realtime Sync failed • " + (e?.code || e?.message || "Firebase error"));
      });
    }, err => {
      console.error("Universal data sync error", err);
      realtimeSyncStatus("❌ Realtime Sync failed • Check Firebase connection/rules");
    });
  }

  function startSyncSafetyReconcile(){
    if(window.__skFirebaseSyncReconcile) clearInterval(window.__skFirebaseSyncReconcile);
    // Safety retry only for keys that were actually changed locally.
    // Do NOT scan/write every localStorage key on a fixed short interval.
    // The old full scan could create a large number of unnecessary Firestore
    // operations when several devices were open at once.
    window.__skFirebaseSyncReconcile = setInterval(() => {
      if(!auth?.currentUser || !remoteReady || !universalSyncStarted || applyingRemote) return;
      const pending=[...universalDirtyKeys];
      pending.forEach(key => syncKeyToCloud(key).catch(()=>{}));
      if(repairSyncReady) uploadRepairJobs(false);
      // Bills are uploaded by the localStorage write hook and by initial sync.
      // Do not rewrite every bill on a periodic timer.
    }, 60000);
  }

  // Hook that captures every localStorage change
  function hookLocalBillWrites(){
    if(window.__skFirebaseStorageHook) return;
    window.__skFirebaseStorageHook = true;

    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;

    Storage.prototype.setItem = function(key, value){
      const result = originalSet.apply(this, arguments);
      if(this === localStorage && !applyingRemote && auth?.currentUser && isSyncableKey(key)) {
        markLocalChange(key, Date.now());
        universalDirtyKeys.add(String(key));
      }
      if(this === localStorage && !applyingRemote && auth?.currentUser && remoteReady){
        if(key === BILL_KEY){
          if(window.__skRestoring) return result;
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
        } else if(isSyncableKey(key) && isProtectedDataKey(key)){
          /* V5.11.48: removing a shop data list on one phone (e.g. clearing a damaged copy) must not delete it on every phone */
        } else if(isSyncableKey(key)){
          const ref = db.collection("shops").doc(SHOP_ID).collection("data").doc(key);
          ref.delete().then(() => {
            universalLastSyncedHash.delete(String(key));
            delete syncMeta[String(key)];
            persistSyncMetaSoon();
          }).catch(e => console.error(key + " cloud delete failed", e));
        }
      }
      return result;
    };
  }

  // ----------------------------------------------------
  // CLOUD BACKUP & RESTORE
  // ----------------------------------------------------
  const CLOUD_BACKUP_ROOT = "cloudBackups";
  /* V5.10.1: 280 000 characters per piece stays under Firestore's 1 MiB-per-document limit even for non-English or emoji text (up to 3-4 bytes per character); 650 000 could go over. */
  const CLOUD_BACKUP_CHUNK = 280000;

  function cloudBackupStatus(text){
    const el = document.getElementById("skCloudBackupStatus");
    if(el) el.textContent = text || "";
  }

  function realtimeSyncStatus(text){
    const el = document.getElementById("skRealtimeSyncStatus");
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
    // Full cloud backups are separate from realtime sync. Throttle them so
    // ordinary localStorage writes do not create a new backup every few seconds.
    if(cloudAutoBackupLastMs && (Date.now() - cloudAutoBackupLastMs) < CLOUD_AUTO_BACKUP_MIN_INTERVAL) return;
    clearTimeout(cloudAutoBackupTimer);
    cloudAutoBackupTimer = setTimeout(async function(){
      if(cloudAutoBackupRunning || cloudRestoreApplying || !auth?.currentUser || !db || !cloudBackupAllowed()) return;
      cloudAutoBackupRunning = true;
      try{
        await window.skCloudBackupNow(true);
        cloudAutoBackupLastMs = Date.now();
        toast("☁️ Cloud Backup ✓");
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
      if(this === localStorage && !applyingRemote && !cloudRestoreApplying && isSyncableKey(key)) scheduleCloudAutoBackup(key);
      return result;
    };
    Storage.prototype.removeItem = function(key){
      const result = originalRemove.apply(this, arguments);
      if(this === localStorage && !applyingRemote && !cloudRestoreApplying && isSyncableKey(key)) scheduleCloudAutoBackup(key);
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

  /* V5.10.1: a batch may hold at most 500 writes AND about 10 MiB; split by both (450 writes of 650 KB each failed with "request too large").
     V5.10.2: security rules allow only ~1000 checks per request, so a 400-write batch was refused as "permission-denied".
     Now 20 writes per batch; if a batch is still refused, the writes are retried one by one to find which part is blocked. */
  function cloudPartName(ref){
    const p = String(ref && ref.path || "");
    return p.indexOf("/chunks/") >= 0 ? "backup pieces (chunks)" : p.indexOf("/items/") >= 0 ? "backup items" : "backup record";
  }
  async function cloudWriteBatches(writes){
    const MAX_OPS = 20, MAX_BYTES = 7 * 1024 * 1024;
    const size = d => { try { return new Blob([JSON.stringify(d)]).size; } catch(e){ return JSON.stringify(d).length * 3; } };
    const groups = []; let cur = [], bytes = 0;
    for(const w of writes){
      const b = size(w.data) + 200;
      if(cur.length && (cur.length >= MAX_OPS || bytes + b > MAX_BYTES)){ groups.push(cur); cur = []; bytes = 0; }
      cur.push(w); bytes += b;
    }
    if(cur.length) groups.push(cur);
    for(const g of groups){
      const batch = db.batch();
      g.forEach(w => batch.set(w.ref, w.data, w.options||{}));
      try{ await batch.commit(); }
      catch(e){
        if(!e || e.code !== "permission-denied") throw e;
        for(const w of g){
          try{ await w.ref.set(w.data, w.options||{}); }
          catch(e2){ if(e2 && e2.code === "permission-denied") e2.skPart = cloudPartName(w.ref); throw e2; }
        }
      }
    }
  }

  window.skCloudCanBackup = function(){ return !!(auth?.currentUser && db && cloudBackupAllowed() && navigator.onLine !== false); };
  function cloudBackupEvent(ok, at, why){ try{ window.dispatchEvent(new CustomEvent("sk-cloud-backup",{detail:{ok:ok,at:at||Date.now(),why:why||""}})); }catch(e){} }

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
      try{ await backupRef.set({
        app: "SK Mobiles",
        version: 1,
        status: "complete",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAtMs: Date.now(),
        createdBy: auth.currentUser.uid,
        createdByEmail: auth.currentUser.email || "",
        itemCount,
        chunkCount
      }, {merge:true}); }catch(e3){ if(e3 && e3.code === "permission-denied") e3.skPart = "backup record"; throw e3; }
      cloudBackupStatus("✅ Cloud backup saved • " + itemCount + " data items");
      cloudBackupEvent(true);
      if(!silent) toast("☁️ Cloud Backup completed");
    }catch(e){
      console.error("Cloud backup error", e);
      let why = (e && e.code === "permission-denied") ? "no permission to save " + (e.skPart || "backup") + " — publish the latest Firestore rules"
        : (e && (e.code === "unavailable" || e.code === "deadline-exceeded")) ? "no internet connection"
        : (e && e.code === "resource-exhausted") ? "Firebase free daily limit reached — try again tomorrow"
        : ((e && (e.code || e.message)) || "unknown error");
      let who = "";
      if(e && e.code === "permission-denied"){
        /* V5.10.4: say which account and which cloud role the rules saw */
        try{
          const u = auth.currentUser, us = await db.collection("users").doc(u.uid).get(), d = us.exists ? (us.data()||{}) : null;
          who = " (signed in as " + (u.email||"?") + " • cloud role: " + (d ? String(d.role||"none") + (d.active === false ? ", turned off" : "") : "no record") + ")";
        }catch(e4){ who = " (signed in as " + ((auth.currentUser&&auth.currentUser.email)||"?") + ")"; }
      }
      why = why + who;
      window.__skLastBackupError = why;
      cloudBackupStatus("❌ Cloud backup failed: " + why);
      cloudBackupEvent(false, null, why);
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
      window.__skRestoring = true; /* V5.11.48: a restore must never delete newer bills in the cloud */
      keys.filter(k => !/^(sk_current_|sk_sync_meta)/.test(k)).forEach(key => localStorage.setItem(key, restored[key]));
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

  // Attach direct click handlers to buttons
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
      currentRole = "";
      if(unsubscribeOwnUser){ unsubscribeOwnUser(); unsubscribeOwnUser = null; }
      showLoginStep("signin");
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
      if(STAFF_ROLES.indexOf(role) < 0){
        currentRole = "";
        localStorage.removeItem(ROLE_KEY);
        localStorage.removeItem(WORKER_KEY);
        gate(true);
        showLoginStep("waiting", user, role);
        msg("");
        watchOwnUser(user, role);
        return;
      }
      currentRole = role;
      try{ window.dispatchEvent(new Event("sk-role-ready")); }catch(e){}
      watchOwnUser(user, role);
      showLoginStep("signin");
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
      realtimeSyncStatus("🟢 Realtime Auto Sync: ON • " + role.toUpperCase() + " • All app data connected");
      toast("☁️ Auto Sync: ON • " + role.toUpperCase() + " login • All modules real-time synced");
    } catch(e) {
      console.error(e);
      msg("❌ " + e.message);
      await auth.signOut().catch(()=>{});
      gate(true);
    }
  }

  async function init(){
    try {
      await ensureFirebase();
      injectLoginUI();
      hookLocalBillWrites();
      hookCloudAutoBackup();
      bindBackupButtons();
      gate(true);
      auth.getRedirectResult().catch(e=>{ if(e && e.code && e.code !== "auth/no-auth-event") msg("❌ Sign-in failed: " + (e.message || e.code)); });
      auth.onAuthStateChanged(handleUser);
    } catch(e) {
      console.error(e);
      msg("❌ Firebase initialization failed.");
    }
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();