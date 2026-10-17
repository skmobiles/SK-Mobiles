/* SK MOBILES — Colorful icon UI layer (presentation only).
 * - Defines one inline-SVG icon library and publishes each icon as a CSS variable (--ico-<name>)
 *   so css/colorful-ui.css can draw tinted icon tiles anywhere without touching app logic.
 * - Replaces leading emoji in static UI labels (titles, buttons, section headings) with matching
 *   coloured icons. Business logic, data and event handlers are never modified.
 */
(function(){
  'use strict';

  /* ---------- icon library (24x24, stroke) ---------- */
  var I = {
    save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    whatsapp:'<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 8.6c0 3.3 2.7 6 6 6l1-1.6-2-1-.9.8a4 4 0 0 1-2-2l.8-.9-1-2z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h6"/>',
    phone:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
    recycle:'<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5M3 12A9 9 0 0 1 18.5 5.8L21 8M21 3v5h-5"/>',
    keypad:'<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M9 6.5h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M9 18.5h.01M12 18.5h.01M15 18.5h.01"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    box:'<path d="m12 3 9 5-9 5-9-5z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
    shield:'<path d="M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    trash:'<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
    wrench:'<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2.1 2.1 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z"/><path d="m14 5 5-2 2 2-2 5"/>',
    toolbox:'<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18M11 13v2h2v-2"/>',
    tools:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    crown:'<path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z"/>',
    card:'<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19M6 15h4"/>',
    folder:'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    receipt:'<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
    briefcase:'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
    sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
    flame:'<path d="M12 22c4 0 7-2.7 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 12 0 4.3 3 7 7 7z"/>',
    eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    drop:'<path d="M12 2.7s7 7 7 12a7 7 0 0 1-14 0c0-5 7-12 7-12z"/>',
    hourglass:'<path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2 4l3 2-3 2a5 5 0 0 0-2 4v4M17 2v4a5 5 0 0 1-2 4l-3 2 3 2a5 5 0 0 1 2 4v4"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    dot:'<circle cx="12" cy="12" r="5" fill="currentColor"/>',
    check:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="m8 12 3 3 5-6"/>',
    money:'<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.5-1.5-3-1.5s-3 .8-3 2.2c0 3 6 1.8 6 4.6 0 1.4-1.5 2.2-3 2.2s-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
    note:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    layers:'<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
    cart:'<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
    home:'<path d="m3 10.7 9-7.2 9 7.2"/><path d="M5.5 9.6V20.5h13V9.6M9.5 20.5v-6h5v6"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    chart:'<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    pencil:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    store:'<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6"/>',
    chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    barcode:'<path d="M3 5v14M6 5v14M10 5v14M13 5v14M17 5v14M21 5v14"/>',
    filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
    refresh:'<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    tag:'<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><path d="M7 7h.01"/>',
    chevron:'<path d="m9 6 6 6-6 6"/>',
    call:'<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    cloud:'<path d="M17.5 19a4.5 4.5 0 1 0-1-8.9A6 6 0 0 0 4.4 12 3.5 3.5 0 0 0 6 19z"/><path d="m9 13 2 2 4-4"/>'
  };

  /* ---------- emoji -> icon + colour ---------- */
  var E = {
    '💾':['save','blue'],'💬':['whatsapp','green'],'➕':['plus','blue'],'＋':['plus','blue'],'📋':['clipboard','purple'],
    '📱':['phone','blue'],'♻':['recycle','green'],'⌨':['keypad','slate'],'👤':['user','blue'],'📦':['box','orange'],
    '🛡':['shield','blue'],'⚠':['alert','orange'],'🗑':['trash','red'],'🔧':['wrench','green'],'🧰':['toolbox','red'],
    '🛠':['tools','purple'],'⚡':['bolt','amber'],'👑':['crown','amber'],'💳':['card','amber'],'📁':['folder','amber'],
    '⚙':['gear','slate'],'🔔':['bell','amber'],'📷':['camera','purple'],'🧾':['receipt','blue'],'👔':['briefcase','purple'],
    '✨':['sparkle','purple'],'🔥':['flame','red'],'👁':['eye','purple'],'💧':['drop','sky'],'⏳':['hourglass','amber'],
    '📜':['history','purple'],'🟢':['dot','green'],'☑':['check','blue'],'💰':['money','amber'],'📝':['note','blue'],
    '🔄':['recycle','sky'],'🔒':['lock','slate'],'⬇':['download','blue'],'⬆':['upload','blue'],'🧑':['user','blue'],
    '🖼':['image','purple'],'🏪':['store','orange'],'🏷':['tag','orange'],'📊':['chart','orange'],'📅':['calendar','blue'],
    '🔍':['search','blue'],'📂':['folder','amber'],'✏':['pencil','orange'],'📞':['call','green'],'🛒':['cart','orange'],'ℹ':['info','blue']
  };
  var EMO_RE = new RegExp('^\\s*(' + Object.keys(E).join('|') + ')[\\uFE0F\\u200D]*\\s*');

  /* modal headers that have no emoji: id -> [icon, colour] */
  var MODAL_ICON = {
    settingsModal:['gear','blue'], orderModal:['box','orange'], skRepairJobsModal:['wrench','green'],
    skAdminPanelModal:['crown','amber'], skRecycleBinModal:['trash','red'], skAccessoriesPage:['bolt','amber'],
    modelsModal:['phone','blue'], viewBillModal:['receipt','blue'], itemEditorModal:['box','blue'],
    skCreditLedgerPage:['card','amber'], skCreditLedgerModal:['card','amber'], skCreditCustomerModal:['user','blue'],
    skCreditEntryModal:['card','amber'], skEmiReminderModal:['bell','amber'], skWorkerProfileModal:['user','blue'],
    skWorkerEditModal:['user','blue'], skAdminProfileModal:['crown','amber'], skRepairDetailModal:['wrench','green'],
    skUrgentRepairModal:['alert','red'], skKeepImportModal:['upload','blue'], skFontPickerModal:['sparkle','purple'],
    skUsedFilterModal:['search','blue'], skCreditActionModal:['money','amber'], skSignatureModal:['note','blue']
  };

  /* headers that are not .modal-title: selector -> [icon, colour] */
  var TILE_EXTRA = [
    ['#skUsedFilterTitle', 'filter', 'blue'],
    ['.drawer-title', 'store', 'blue']
  ];
  var TILE_SEL = '.modal-title span, .modal-title b, .repair-spares-title, .tools-others-title, .bill-section-title, .sk-admin-title, .sk-credit-title, h2, h3';
  var ALLOW = '.bill-history-meta-item, .bill-history-view, .bill-history-edit, .bill-history-delete, .sk-rj-history-actions, button, .modal-title, .repair-spares-title, .tools-others-title, .bill-section-title, .sk-admin-title, .sk-admin-box, h1, h2, h3, h4, label, summary, .sk-rj-tab, .active-category-notice, .menu-item, .drawer-item, .sk-menu-item, .menu-label, .sk-credit-btn, .skcp-btn, .skcp-filter, .sk-section-title, .section-title, .form-section-title, #skAdminCurrentRole';
  var DENY = 'option, textarea, input, script, style, .ski, #orderItemsContainer, .sk-credit-list, .skcp-list, #recycleBinItemsContainer, .no-ski, [contenteditable]';

  /* ---------- publish icon CSS variables once ---------- */
  function uri(inner){
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22') + '")';
  }
  function publishVars(){
    if (document.getElementById('skCuiVars')) return;
    var css = ':root{' + Object.keys(I).map(function(k){ return '--ico-' + k + ':' + uri(I[k]); }).join(';') + '}';
    var st = document.createElement('style'); st.id = 'skCuiVars'; st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- decorators ---------- */
  function mk(icon, color, tile){
    var i = document.createElement('i');
    i.className = 'ski ' + (tile ? 'ski-tile' : 'ski-in') + ' c-' + color;
    i.setAttribute('data-i', icon);
    i.setAttribute('aria-hidden', 'true');
    return i;
  }

  /* white-ish text means a solid coloured button: keep the icon white too */
  function isLight(rgb){
    var m = String(rgb).match(/[\d.]+/g); if (!m || m.length < 3) return false;
    return (0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2]) > 200;
  }
  function replaceEmoji(root){
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var hits = [], n;
    while ((n = walker.nextNode())){
      var v = n.nodeValue;
      if (!v || v.length > 200 || !EMO_RE.test(v)) continue;
      var p = n.parentElement;
      if (!p || p.closest(DENY) || !p.closest(ALLOW)) continue;
      /* only when the emoji leads the element's own content */
      var first = p.firstChild; while (first && first.nodeType === 3 && !first.nodeValue.trim() && first !== n) first = first.nextSibling;
      if (first !== n) continue;
      hits.push(n);
    }
    hits.forEach(function(node){
      var m = node.nodeValue.match(EMO_RE); if (!m) return;
      var key = m[1], def = E[key]; if (!def) return;
      var p = node.parentElement;
      var tile = !!p.closest(TILE_SEL) && !p.closest('button');
      node.nodeValue = node.nodeValue.slice(m[0].length);
      var ic = mk(def[0], def[1], tile);
      if (!tile) { var b = p.closest('button, .submit-btn, a'); if (b && isLight(getComputedStyle(b).color)) ic.classList.add('on-dark'); }
      p.insertBefore(ic, node);
    });
  }

  function titleTiles(root){
    var titles = root.querySelectorAll ? root.querySelectorAll('.modal-title:not([data-cui])') : [];
    Array.prototype.forEach.call(titles, function(t){
      if (t.querySelector('.ski-tile, .billing-title-icon, .sk-used-recycle-mark')) { t.setAttribute('data-cui', '1'); return; }
      var host = t.closest('.modal-overlay'); var def = host && MODAL_ICON[host.id];
      if (!def) { t.setAttribute('data-cui', '1'); return; }
      var target = t.querySelector(':scope > span') || t;
      target.insertBefore(mk(def[0], def[1], true), target.firstChild);
      t.setAttribute('data-cui', '1');
    });
  }

  function extraTiles(){
    TILE_EXTRA.forEach(function(d){
      var el = document.querySelector(d[0]);
      if (!el || el.querySelector(':scope > .ski-tile')) return;
      el.insertBefore(mk(d[1], d[2], true), el.firstChild);
    });
  }

  var queued = false;
  function run(){
    queued = false;
    try { publishVars(); replaceEmoji(document.body); titleTiles(document); extraTiles(); } catch (e) {}
  }
  function schedule(){ if (!queued){ queued = true; (window.requestAnimationFrame || setTimeout)(run); } }

  function init(){
    document.documentElement.classList.add('sk-cui');
    run();
    new MutationObserver(function(muts){
      for (var i = 0; i < muts.length; i++){
        var m = muts[i];
        if (m.type === 'childList' && m.addedNodes.length){ schedule(); return; }
        if (m.type === 'characterData'){ schedule(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  /* App Data Folder: the menu shows it twice (a JS-injected shortcut at the top and the real entry under
     Technical & Data). The top copy is hidden by CSS; the real entry now also scrolls to the folder section. */
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('#leftDrawer .menu-drawer-btn');
    if (!b || b.id === 'skDataFolderMenuBtn' || !/App Data Folder/.test(b.textContent || '')) return;
    setTimeout(function(){
      var sec = document.getElementById('skAppDataFolderSection');
      if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 160);
  }, true);

  
  window.skCuiRefresh = run;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
