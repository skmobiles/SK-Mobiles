/* SK MOBILES — Admin Controlled Manager Permissions
   Additive role/permission layer. Business data structures are unchanged.
*/
(function(){
  'use strict';

  const ROLE_KEY = 'sk_current_role_v1';
  const PERM_KEY = 'sk_manager_permissions_v1';
  const SHOP_ID = 'SK-MOBILES';
  const DOC_PATH = ['shops', SHOP_ID, 'access', 'managerPermissions'];

  const DEFAULTS = {
    managerAccess: false,
    billing: false,
    orders: false,
    credit: false,
    inventory: false,
    repair: false,
    tools: false,
    appData: false,
    settings: false,
    backup: false,
    restore: false,
    recycleBin: false,
    shopSettings: false,
    userManagement: false,
    appearance: true
  };

  let cloudPerms = null;
  let ready = false;
  let permUnsub = null;
  let observer = null;

  function role(){
    return String(localStorage.getItem(ROLE_KEY) || '').toLowerCase();
  }
  function toast(t){
    try { if(typeof window.showToast === 'function') window.showToast(t); } catch(e){}
  }
  function readLocal(){
    let p = {...DEFAULTS};
    try {
      const x = JSON.parse(localStorage.getItem(PERM_KEY) || '{}');
      if(x && typeof x === 'object') p = {...p, ...x};
    } catch(e){}
    return p;
  }
  function saveLocal(p){
    try { localStorage.setItem(PERM_KEY, JSON.stringify({...DEFAULTS, ...p})); } catch(e){}
  }
  function perms(){
    return cloudPerms ? {...DEFAULTS, ...cloudPerms} : readLocal();
  }
  function allowed(key){
    const p = perms();
    if(role() === 'admin') return true;
    if(role() !== 'manager') return false;
    if(key === 'appearance') return true;
    return p.managerAccess === true && p[key] === true;
  }

  function dataKeyAllowed(key){
    if(role() !== 'manager') return true;
    const k=String(key||'');
    const groups={
      billing:['sk_orders'],
      credit:['sk_credit_ledger_v1','sk_emi_reminder_v1','sk_emi_notified_'],
      inventory:['sk_inventory','sk_low_threshold','sk_low_stock_order_state_v40','sk_tempered_inventory_clean_reset_v1'],
      repair:['sk_repair_tools_note','skx_repair_jobs_v2','skx_urgent_notified_ids_v1'],
      tools:['sk_tools_others_order_note','sk_keep_snapshot_v1'],
      appData:['sk_app_data_auto_sync_minutes_v40','sk_drive_api','sk_mobiles_app_data_v1'],
      recycleBin:['sk_recycle_bin_v1'],
      shopSettings:['sk_shop_name','sk_shop_addr','sk_shop_phone','sk_terms','sk_custom_logo'],
      userManagement:['sk_workers_v1','sk_worker_pin_v1'],
      settings:['sk_theme','sk_theme_depth','sk_theme_panel_collapsed','sk_font_family','sk_icon_pack','sk_appearance_settings','sk_ui_','sk_ui_sandbox_tab','sk_sync_meta_v1'],
      backup:['sk_recovery_backup_']
    };
    if(k === 'sk_admin_pin_v1' || k === 'sk_manager_permissions_v1') return false;
    for(const keyName of Object.keys(groups)){
      if(groups[keyName].some(prefix=>prefix.endsWith('_') ? k.indexOf(prefix)===0 : k===prefix)){
        return allowed(keyName);
      }
    }
    // Unknown business keys remain read-only for Manager until Admin grants a category.
    return false;
  }

  function getDb(){
    try {
      if(window.firebase && firebase.apps && firebase.apps.length) return firebase.firestore();
    } catch(e){}
    return null;
  }

  async function loadCloud(){
    const r = role();
    if(r !== 'admin' && r !== 'manager') return;
    const db = getDb();
    if(!db) return;
    try{
      const snap = await db.collection(DOC_PATH[0]).doc(DOC_PATH[1])
        .collection(DOC_PATH[2]).doc(DOC_PATH[3]).get();
      if(snap.exists){
        cloudPerms = {...DEFAULTS, ...(snap.data() || {})};
      } else {
        cloudPerms = {...DEFAULTS};
      }
      saveLocal(cloudPerms);
      ready = true;
      apply();
    }catch(e){
      console.warn('Manager permission load failed:', e);
      cloudPerms = readLocal();
      ready = true;
      apply();
    }
  }

  async function saveCloud(p){
    const db = getDb();
    if(!db) throw new Error('Firebase is not ready.');
    const clean = {...DEFAULTS, ...p};
    delete clean._updatedAt;
    await db.collection(DOC_PATH[0]).doc(DOC_PATH[1])
      .collection(DOC_PATH[2]).doc(DOC_PATH[3])
      .set({
        ...clean,
        _updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        _updatedBy: firebase.auth().currentUser?.uid || '',
        _updatedByEmail: firebase.auth().currentUser?.email || ''
      }, {merge:true});
    cloudPerms = clean;
    saveLocal(clean);
    ready = true;
  }

  function managerKey(el){
    if(!el) return null;
    const id = String(el.id || '').toLowerCase();
    const txt = String(el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    const oc = String(el.getAttribute('onclick') || '').toLowerCase();
    const all = id + ' ' + txt + ' ' + oc;

    if(el.closest('#skAdminPanelModal') || all.includes('admin control')) return 'adminOnly';
    if(/recycle bin|trash/.test(all)) return 'recycleBin';
    if(/app data folder|data folder|folder backup/.test(all)) return 'appData';
    if(/backup \(json\)|restore|backup now|cloud backup/.test(all)) return /restore/.test(all) ? 'restore' : 'backup';
    if(/app settings|appearance|theme|font|icon pack/.test(all)) return 'settings';
    if(/shop profile|terms|brand logo|bill settings/.test(all)) return 'shopSettings';
    if(/user role|manage users|worker management|add worker|edit worker/.test(all)) return 'userManagement';
    if(/customer credit|credit ledger|outstanding|payment/.test(all)) return 'credit';
    if(/repair job|repair jobs|job card|service/.test(all)) return 'repair';
    if(/inventory|stock|tempered|display|product/.test(all)) return 'inventory';
    if(/order list|orders|purchase order/.test(all)) return 'orders';
    if(/billing|bill history|new bill|invoice|sales/.test(all)) return 'billing';
    if(/tools.*notes|notes/.test(all)) return 'tools';
    return null;
  }

  function isMutationAction(el){
    if(!el) return false;
    const txt = String(el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
    const oc = String(el.getAttribute('onclick') || '').toLowerCase();
    const all = txt + ' ' + oc;
    return /(^|\b)(edit|modify|delete|remove|update|change|reset all|clear all)(\b|$)/.test(all);
  }

  function lock(el,key,reason){
    if(!el || el.dataset.skPermLock === '1') return;
    el.dataset.skPermLock = '1';
    el.dataset.skPermKey = key || '';
    el.classList.add('sk-permission-locked');
    el.setAttribute('aria-disabled','true');
    el.setAttribute('data-sk-permission-state','locked');
    if(!el.dataset.skOriginalTitle) el.dataset.skOriginalTitle = el.getAttribute('title') || '';
    if(!el.dataset.skLockBound){
      el.dataset.skLockBound = '1';
      el.addEventListener('click', function(e){
        if(role() !== 'manager') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        toast('🔒 Admin permission required');
      }, true);
    }
    if(!el.querySelector('.sk-permission-lock-icon')){
      const i=document.createElement('span');
      i.className='sk-permission-lock-icon';
      i.textContent='🔒';
      i.setAttribute('aria-hidden','true');
      el.appendChild(i);
    }
    if(reason) el.title = reason;
  }

  function unlock(el){
    if(!el || el.dataset.skPermLock !== '1') return;
    el.classList.remove('sk-permission-locked','sk-worker-blocked');
    el.setAttribute('aria-disabled','false');
    el.setAttribute('data-sk-permission-state','unlocked');
    if(el.dataset.skOriginalTitle !== undefined){
      const t=el.dataset.skOriginalTitle;
      if(t) el.setAttribute('title',t); else el.removeAttribute('title');
    }
    const i=el.querySelector('.sk-permission-lock-icon');
    if(i) i.remove();
  }

  function decorateDrawer(){
    const drawer=document.getElementById('leftDrawer');
    if(!drawer || role() !== 'manager') return;
    drawer.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      const key=managerKey(el);
      if(!key || key==='adminOnly') return;
      if(key==='appearance') return;
      if(allowed(key)) unlock(el);
      else lock(el,key,'Admin must grant this permission');
    });
    // Admin Control must never be available to Manager.
    drawer.querySelectorAll('#skAdminControlBtn').forEach(el=>el.style.display='none');
    drawer.querySelectorAll('.menu-drawer-btn').forEach(el=>{
      const t=(el.textContent||'').toLowerCase();
      if(t.includes('admin control')) el.style.display='none';
    });
  }

  function revealManagerOptions(){
    if(role() !== 'manager') return;
    const settings=document.getElementById('settingsModal');
    if(settings){
      settings.querySelectorAll('div,section').forEach(el=>{
        const t=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
        if(/shop profile|terms & conditions editor|shop brand logo|data backup & restore|cloud backup|app data folder/.test(t)){
          if(el.style.display==='none') el.style.display='';
        }
      });
    }
  }

  function decoratePageActions(){
    if(role() !== 'manager') return;
    revealManagerOptions();
    document.querySelectorAll('button,a,[role="button"]').forEach(el=>{
      if(el.closest('#skLoginModal,#skRoleGate,#skAdminPanelModal')) return;
      if(el.dataset.skAdminMutationHidden==='1') return;
      const key=managerKey(el);
      if(key==='adminOnly'){
        lock(el,key,'Admin only');
        return;
      }
      if(isMutationAction(el)){
        // Edit / Modify / Delete controls are Admin-only and are not shown to Manager.
        el.dataset.skAdminMutationHidden='1';
        el.style.display='none';
        return;
      }
      if(key && key!=='appearance'){
        if(allowed(key)) unlock(el);
        else lock(el,key,'Admin must grant this permission');
      }
    });
  }

  function hideAdminControlsForManager(){
    if(role() !== 'manager') return;
    document.querySelectorAll('[id*="Admin"],[id*="admin"]').forEach(el=>{
      if(el.id === 'skAdminPanelModal') el.classList.remove('active');
      if(el.id === 'skAdminControlBtn') el.style.display='none';
    });
    document.querySelectorAll('button,a').forEach(el=>{
      const t=(el.textContent||'').trim().toLowerCase();
      if(t === 'admin control' || t.includes('open admin control')) el.style.display='none';
    });
  }

  function apply(){
    if(!document.body) return;
    document.body.classList.toggle('sk-manager-permission-mode', role()==='manager');
    if(role()==='manager'){
      hideAdminControlsForManager();
      revealManagerOptions();
      decorateDrawer();
      decoratePageActions();
    }else{
      document.querySelectorAll('.sk-permission-locked').forEach(unlock);
      document.querySelectorAll('[data-sk-admin-mutation-hidden="1"]').forEach(el=>{
        el.style.display='';
        delete el.dataset.skAdminMutationHidden;
      });
      document.body.classList.remove('sk-manager-permission-mode');
    }
  }

  function renderAdminPanel(){
    if(role()!=='admin') return;
    const box=document.getElementById('skManagerPermissionList');
    if(!box) return;
    const p=perms();
    const rows=[
      ['billing','🧾 Mobile Billing & History'],
      ['orders','🛒 Order List'],
      ['credit','💳 Customer Credit / Payments'],
      ['inventory','📦 Inventory / Stock'],
      ['repair','🔧 Repair Jobs / Service'],
      ['tools','📝 Tools & Others Notes'],
      ['appData','📁 App Data Folder'],
      ['settings','⚙️ App Settings & Themes'],
      ['backup','☁️ Cloud Backup'],
      ['restore','☁️ Cloud Restore'],
      ['recycleBin','🗑️ Recycle Bin / Trash'],
      ['shopSettings','🏪 Shop Profile / Bill Settings'],
      ['userManagement','👥 User / Worker Management']
    ];
    box.innerHTML=rows.map(([key,label])=>{
      const checked=!!p[key];
      return `<label class="sk-manager-perm-row"><span>${label}</span><span class="sk-manager-perm-state"><input type="checkbox" data-sk-manager-perm="${key}" ${checked?'checked':''}><small>${checked?'UNLOCKED':'LOCKED'}</small></span></label>`;
    }).join('');
    box.querySelectorAll('[data-sk-manager-perm]').forEach(input=>{
      input.addEventListener('change',()=>window.skAdminSetManagerPermission(input.dataset.skManagerPerm,input.checked));
    });
  }

  async function setPermission(key,value){
    if(role()!=='admin'){ toast('🔒 Admin access only'); return; }
    const p=perms();
    p[key]=!!value;
    if(key!=='managerAccess' && p.managerAccess !== true){
      // Permission can be prepared while Manager login remains disabled.
      p[key]=!!value;
    }
    try{
      await saveCloud(p);
      if(typeof window.skRenderManagerPermissions==='function') window.skRenderManagerPermissions();
      renderAdminPanel();
      apply();
      toast('✅ Manager permission updated');
    }catch(e){
      console.error(e);
      toast('❌ Permission save failed');
    }
  }

  // Override the old local-only permission writer.
  window.skAdminSetManagerPermission = function(key,value){
    return setPermission(key,value);
  };

  // Keep managerAccess as the master switch.
  function renderMaster(){
    if(role()!=='admin') return;
    const toggle=document.getElementById('skMgrAccessToggle');
    if(toggle){
      toggle.checked = perms().managerAccess === true;
      toggle.onchange = ()=>setPermission('managerAccess',toggle.checked);
    }
  }

  function injectStyles(){
    if(document.getElementById('skManagerPermissionStyles')) return;
    const st=document.createElement('style');
    st.id='skManagerPermissionStyles';
    st.textContent=`
      .sk-permission-locked{position:relative!important;opacity:.52!important;filter:saturate(.55)!important;cursor:not-allowed!important}
      .sk-permission-locked::after{content:"";position:absolute;inset:0;border-radius:inherit;background:rgba(100,116,139,.045);pointer-events:none}
      .sk-permission-lock-icon{display:inline-flex!important;align-items:center;justify-content:center;margin-left:auto;padding-left:6px;font-size:.72rem;line-height:1}
      .sk-manager-perm-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border:1px solid var(--card-border);border-radius:10px;background:var(--pill-bg);font-size:.70rem;font-weight:800}
      .sk-manager-perm-state{display:flex;align-items:center;gap:7px}
      .sk-manager-perm-state small{font-size:.55rem;font-weight:900;opacity:.7;min-width:52px;text-align:right}
      body.sk-manager-permission-mode #skAdminControlBtn{display:none!important}
    `;
    document.head.appendChild(st);
  }

  function start(){
    injectStyles();
    if(observer) observer.disconnect();
    observer=new MutationObserver(()=>{ 
      if(role()==='manager') apply();
      if(role()==='admin'){ renderAdminPanel(); renderMaster(); }
    });
    observer.observe(document.body,{childList:true,subtree:true});
    apply();
    if(role()==='admin'){ renderAdminPanel(); renderMaster(); }
    try{
      if(window.firebase && firebase.auth){
        firebase.auth().onAuthStateChanged(async user=>{
          if(!user) return;
          await loadCloud();
          if(permUnsub){ try{permUnsub();}catch(e){} permUnsub=null; }
          const db=getDb();
          if(db){
            try{
              permUnsub=db.collection(DOC_PATH[0]).doc(DOC_PATH[1]).collection(DOC_PATH[2]).doc(DOC_PATH[3])
                .onSnapshot(snap=>{
                  cloudPerms=snap.exists ? {...DEFAULTS,...(snap.data()||{})} : {...DEFAULTS};
                  saveLocal(cloudPerms);
                  if(role()==='manager' && cloudPerms.managerAccess !== true){
                    toast('🔒 Manager access disabled by Admin');
                    try{ if(typeof window.skLogout==='function') window.skLogout(); }catch(e){}
                    return;
                  }
                  if(role()==='admin'){ renderAdminPanel(); renderMaster(); }
                  else {
                    apply();
                    try{ if(typeof window.skRefreshManagerPermissionSync==='function') window.skRefreshManagerPermissionSync(); }catch(e){}
                  }
                },err=>console.warn('Manager permission listener failed:',err));
            }catch(e){}
          }
          if(role()==='admin'){ renderAdminPanel(); renderMaster(); }
          else apply();
        });
      }
    }catch(e){}
  }

  window.skManagerPermissionAllowed = allowed;
  window.skManagerPermissionAllowsDataKey = dataKeyAllowed;
  window.skReloadManagerPermissions = loadCloud;
  window.skClearManagerPermissionCache = function(){
    if(permUnsub){ try{permUnsub();}catch(e){} permUnsub=null; }
    cloudPerms=null; ready=false;
  };
  window.skRenderCloudManagerPermissions = renderAdminPanel;

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
