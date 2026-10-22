/* SK MOBILES V5.9.15 — "clean" page style for Customer Credit Ledger and Settings.
   Presentation only: every button below calls the same function the old layout called.
   - Ledger customer view: simple top bar (← name ⋮), one summary card, plain history list with a small ✎ per entry.
   - Settings: grouped list (Shop / Look / Permissions / Data); tapping a row shows only that part. */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function svg(p,extra){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'+(extra||'')+'>'+p+'</svg>'}
var IC={
  back:svg('<path d="M15 5l-7 7 7 7"/>'),
  more:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>',
  pencil:svg('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  user:svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  qr:svg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M21 14v7h-7"/>'),
  share:svg('<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>'),
  trash:svg('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  close:svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  chev:svg('<path d="M9 6l6 6-6 6"/>')
};

/* ====================== Customer Credit Ledger ====================== */
var menuEl=null;
function closeMenu(){if(menuEl){menuEl.remove();menuEl=null}}
function ledgerKey(view){var b=view.querySelector('button[data-k]');return b?decodeURIComponent(b.getAttribute('data-k')):''}
function openMenu(btn,view){
  closeMenu();
  var k=ledgerKey(view);
  var items=[
    ['Edit customer',IC.user,'#2563eb',function(){var w=view.querySelector('.skcp-det-who');if(w)w.click()}],
    ['Close ledger',IC.close,'#64748b',function(){if(window.skCPBackToHome)window.skCPBackToHome()}],
    ['Delete customer',IC.trash,'#dc2626',function(){if(k&&window.skCPDeleteCustomer)window.skCPDeleteCustomer(k)}]
  ];
  menuEl=document.createElement('div');menuEl.className='skcl-menu';menuEl.setAttribute('role','menu');
  items.forEach(function(it,i){
    var b=document.createElement('button');b.type='button';b.setAttribute('role','menuitem');
    b.className='skcl-mi'+(i===items.length-1?' is-danger':'');
    b.innerHTML='<span style="color:'+it[2]+'">'+it[1]+'</span>'+esc(it[0]);
    b.onclick=function(e){e.stopPropagation();closeMenu();it[3]()};
    menuEl.appendChild(b);
  });
  document.body.appendChild(menuEl);
  var r=btn.getBoundingClientRect();
  menuEl.style.top=Math.round(r.bottom+4)+'px';
  menuEl.style.right=Math.max(8,Math.round(window.innerWidth-r.right))+'px';
}
document.addEventListener('click',function(e){if(menuEl&&!menuEl.contains(e.target))closeMenu()},true);

function cleanLedger(){
  var page=$('skCreditLedgerPage'),view=$('skCPDetailView');if(!page||!view)return;
  var on=page.classList.contains('active')&&view.style.display==='block';
  if(page.classList.contains('skcl-detail')!==on)page.classList.toggle('skcl-detail',on);
  var title=page.querySelector('.modal-sheet > .modal-title');
  var bar=title&&title.querySelector('.skcl-bar');
  if(!on){if(bar)bar.remove();closeMenu();return}
  if(!title)return;
  /* top bar: ← name / phone ⋮ */
  var who=view.querySelector('.skcp-det-who'),nb=who&&who.querySelector('b');
  var name=nb?nb.textContent.trim():'';
  /* V5.11.56: the address / Alt line (added by the customer page) is not part of the phone; the Alt number is shown after the phone with a space (before, they were glued: "9385948418Alt: 9441695965", and the bar blinked) */
  var cl=who?who.cloneNode(true):null,addrEl=who&&who.querySelector('.skcm-addr'),alt='';
  if(addrEl){var am=String(addrEl.getAttribute('data-t')||'').match(/Alt:\s*([^•]+)/);if(am)alt=am[1].trim()}
  if(cl){var ad=cl.querySelectorAll('.skcm-addr');for(var i=0;i<ad.length;i++)ad[i].remove()}
  var phone=cl?(cl.textContent||'').replace(name,'').replace(/📞/g,'').trim().split(/\s{2,}|\n/)[0]:'';
  var sig=name+'|'+phone+'|'+alt;
  if(!bar){bar=document.createElement('div');bar.className='skcl-bar';title.appendChild(bar)}
  if(bar.getAttribute('data-sig')!==sig){
    bar.setAttribute('data-sig',sig);
    bar.innerHTML='<button type="button" class="skcl-ib skcl-back" aria-label="Back to customers">'+IC.back+'</button>'+
      '<div class="skcl-who"><b>'+esc(name)+'</b><small>'+esc(phone)+(alt?'<span class="skcl-alt">Alt: '+esc(alt)+'</span>':'')+'</small></div>'+
      '<button type="button" class="skcl-ib skcl-more" aria-label="More options">'+IC.more+'</button>';
    bar.querySelector('.skcl-back').onclick=function(){closeMenu();if(window.skCPBackToList)window.skCPBackToList()};
    bar.querySelector('.skcl-more').onclick=function(e){e.stopPropagation();if(menuEl)closeMenu();else openMenu(this,view)};
  }
  /* summary card */
  var box=view.querySelector('.skcp-detail-box');
  if(box){
    var v=Array.prototype.map.call(box.querySelectorAll('.skcp-mini b'),function(b){return b.textContent.trim()});
    var sum=box.querySelector('.skcl-sum'),txt=v.join('|');
    if(!sum){sum=document.createElement('div');sum.className='skcl-sum';box.insertBefore(sum,box.firstChild)}
    if(sum.getAttribute('data-v')!==txt){sum.setAttribute('data-v',txt);sum.innerHTML='<small>Outstanding</small><b>'+esc(v[0]||'₹0')+'</b><span>Credit '+esc(v[1]||'₹0')+' · Paid '+esc(v[2]||'₹0')+'</span><em class="skcl-tap">Tap for full details ›</em>'}
  }
  /* Customer QR + Send history as one row of links under the buttons.
     Our own two links call the same functions; the original buttons stay where their modules put them (hidden),
     so those modules never add a second copy. */
  var links=view.querySelector('.skcl-links');
  if(!links&&box){
    links=document.createElement('div');links.className='skcl-links';
    links.innerHTML='<button type="button" class="skcl-link" data-a="hist">'+IC.share+'Send history</button>';
    links.addEventListener('click',function(e){var b=e.target.closest('.skcl-link');if(!b)return;
      if(b.getAttribute('data-a')==='qr'){if(window.skQrOpen)window.skQrOpen('ledger')}
      else{var hb=view.querySelector('.skcp-hist-btn');if(hb)hb.click();else if(window.skCPSendHistory)window.skCPSendHistory()}});
    box.parentNode.insertBefore(links,box.nextSibling);
  }
  /* section headings */
  Array.prototype.forEach.call(view.children,function(c){
    if(c.classList.contains('skcl-h')||c.children.length||!/HISTORY/i.test(c.textContent||''))return;
    c.classList.add('skcl-h');c.setAttribute('data-t',/SALES/i.test(c.textContent)?'Sales bills':'Credit / payment history');
  });
  /* history entries -> plain rows with a small ✎ */
  Array.prototype.forEach.call(view.querySelectorAll('.skcp-bill-card:not(.skcl-row)'),function(card){
    if(card.querySelector('.skcp-bill-top'))return;           /* sales bill cards keep their layout */
    var head=card.querySelector('b');if(!head)return;
    var m=(head.textContent||'').match(/(PAYMENT|CREDIT|DISCOUNT)\s*•\s*(.*)$/i);if(!m)return;
    var type=m[1].toLowerCase(),amt=m[2].trim();
    var lines=card.querySelectorAll(':scope > div:not(.skcp-open-job-hint)');var sub=lines.length>1?lines[lines.length-1].textContent.trim():'';
    sub=sub.replace(/\s*•\s*/g,' · ').replace(/ · $/,'');
    var btn=card.querySelector('button');
    var label=type==='payment'?'Payment':(type==='discount'?'Discount':'Credit');
    card.classList.add('skcl-row');
    var em=btn&&(btn.getAttribute('onclick')||'').match(/skCPEditLedgerEntry\('([^']*)'\)/);if(em)card.setAttribute('data-eid',decodeURIComponent(em[1]));
    card.innerHTML='<div class="skcl-l"><span class="skcl-a">'+label+'</span><small>'+esc(sub)+'</small></div><b class="skcl-m'+(type==='credit'?'':' is-pay')+'">'+esc(type==='credit'?amt:'− '+amt.replace(/^−\s*/,''))+'</b>';
    if(btn){var t=(btn.textContent||'Edit').trim();btn.className='skcl-edit';btn.removeAttribute('style');btn.setAttribute('aria-label',t);btn.title=t;btn.innerHTML=IC.pencil;card.appendChild(btn)}
  });
  /* group consecutive rows into one rounded list */
  var kids=Array.prototype.slice.call(view.children),grp=null;
  kids.forEach(function(c){
    if(c.classList.contains('skcl-row')){
      if(!grp){grp=document.createElement('div');grp.className='skcl-list';view.insertBefore(grp,c)}
      grp.appendChild(c);
    }else if(!c.classList.contains('skcl-list'))grp=null;else grp=c;
  });
}


/* ---------- ledger: customer list (main view) ---------- */
var WA_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.3z"/></svg>';
function soften(av){
  var bg=av.getAttribute('style')||'';var m=bg.match(/#[0-9a-f]{6}/i);if(!m)return;
  var c=m[0];av.style.setProperty('background',c+'22','important');av.style.setProperty('color',c,'important');av.setAttribute('data-skcl','1');
}
function cleanLedgerList(){
  var page=$('skCreditLedgerPage'),mv=$('skCPMainView');if(!page||!mv||!page.classList.contains('active'))return;
  /* one total card instead of four boxes */
  var g=function(id){var e=$(id);return e?e.textContent.trim():''};
  var tot=mv.querySelector('.skcl-total');
  if(!tot){tot=document.createElement('div');tot.className='skcl-sum skcl-total';mv.insertBefore(tot,mv.firstChild)}
  var all=g('skCPAllCount'),emi=g('skCPEmiCount'),out=g('skCPOutstandingTotal'),sig=[all,emi,out].join('|');
  if(tot.getAttribute('data-v')!==sig){tot.setAttribute('data-v',sig);tot.innerHTML='<small>Total outstanding</small><b>'+esc(out||'₹0')+'</b><span>'+esc(all||'0')+' customer'+(all==='1'?'':'s')+' · '+esc(emi||'0')+' on EMI</span>'}
  /* customer rows */
  Array.prototype.forEach.call(mv.querySelectorAll('#skCPList .skcp-row:not([data-skcl])'),function(r){
    r.setAttribute('data-skcl','1');
    var av=r.querySelector('.sk-credit-avatar');if(av)soften(av);
    var sub=r.querySelector('.skcp-sub');if(sub)sub.textContent=(sub.textContent||'').replace(/📞/g,'').replace(/\s*•\s*/g,' · ').trim();
    var st=r.querySelector('.skcp-bill');if(st){var t=(st.textContent||'').trim().toUpperCase();st.textContent=t==='OUTSTANDING'?'due':t.toLowerCase();if(t==='OUTSTANDING')st.classList.add('is-due')}
    Array.prototype.forEach.call(r.querySelectorAll('button'),function(b){
      if(/WhatsApp/i.test(b.title||'')){b.classList.add('skcl-wa');b.removeAttribute('style');b.innerHTML=WA_IC;b.setAttribute('aria-label','WhatsApp reminder')}
      else if(/Delete/i.test(b.title||''))b.classList.add('skcl-del');
    });
  });
}
/* ============================ Settings ============================ */
var ST_ROWS=[
  ['Staff',[
    ['People & access','#2563eb','<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 5.5 5"/>',['id:skPeopleSection'],null,null,'admin']
  ]],
  ['Shop',[
    ['Shop profile & address','#f97316','<path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M9 20v-6h6v6"/>',['sec:SHOP PROFILE']],
    ['Shop logo','#8b5cf6','<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',['sec:BRAND LOGO']],
    ['Bill terms & conditions','#0ea5e9','<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',['sec:TERMS']]
  ]],
  ['Look',[
    ['Style profiles','#ec4899','<path d="M12 3a9 9 0 1 0 9 9c0-1-1-1.5-2-1.5h-2a2 2 0 0 1-2-2V7c0-1-.5-2-1.5-2z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/>',['look:1-CLICK','look:MORE THEMES'],'look'],
    ['Theme','#6366f1','<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',['look:THEME MODE','look:DARK MODES'],'look','theme'],
    ['Accent colour','#2563eb','<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',['look:ACCENT COLOR'],'look','accent'],
    ['Background','#14b8a6','<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M3 15l5-4 4 3 3-2 6 4"/>',['look:SHELL BACKGROUND'],'look'],
    ['Corners & card surface','#f59e0b','<path d="M4 12V8a4 4 0 0 1 4-4h4M20 12v4a4 4 0 0 1-4 4h-4"/>',['look:CORNER RADIUS','look:CARD SURFACE'],'look'],
    ['Buttons','#22c55e','<rect x="3" y="8" width="18" height="8" rx="4"/>',['look:BUTTON STYLE'],'look'],
    ['Header & bottom bar','#0284c7','<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 8h18M8 16h8"/>',['look:NAVIGATION'],'look','nav'],
    ['Text size & scale','#a855f7','<path d="M4 7V5h16v2M9 19h6M12 5v14"/>',['look:INTERFACE SCALE'],'look','scale'],
    ['Spring bounce','#0d9488','<path d="M12 3v4M12 17v4M8 7l4 3 4-3M8 17l4-3 4 3"/>',['id:skSpringSection'],null,'spring'],
    ['Effects & feedback','#ef4444','<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',['look:VISUAL EFFECTS'],'look'],
    ['Reset look to default','#64748b','<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',['reset'],'action']
  ]],
  ['Permissions',[
    ['Camera & notifications','#16a34a','<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',['id:skGeneralPermissionsBox']]
  ]],
  ['Data',[
    ['Backup & restore','#2563eb','<path d="M12 3v12M7 10l5 5 5-5M4 19h16"/>',['sec:DATA BACKUP','id:skCloudBackupSection']],
    ['Cloud backup','#0ea5e9','<path d="M7 18a5 5 0 0 1-.6-9.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z"/>',['sec:FIREBASE']],
    ['App data folder','#ca8a04','<path d="M3 7h6l2 2h10v10H3z"/>',['sec:APP DATA FOLDER','id:skAppDataFolderSection']]
  ]]
];
function stSheet(){var m=$('settingsModal');return m?m.querySelector(':scope > .modal-sheet'):null}
function heading(el){var h=el.querySelector('h1,h2,h3,h4,.st-title,[class*=title]');return ((h&&h.textContent)||el.textContent||'').trim().toUpperCase()}
function findTargets(spec){
  var sh=stSheet();if(!sh)return [];
  var out=[];
  spec.forEach(function(s){
    var p=s.split(':'),kind=p[0],key=(p[1]||'').toUpperCase();
    if(kind==='id'){var e=$(p[1]);if(e)out.push(e)}
    else if(kind==='sec'){Array.prototype.forEach.call(sh.querySelectorAll(':scope > section.st-section'),function(e){if(heading(e).indexOf(key)===0)out.push(e)})}
    else if(kind==='look'){var st=$('skUiAppearanceStudio');if(st)Array.prototype.forEach.call(st.querySelectorAll(':scope > section.st-section'),function(e){if(heading(e).indexOf(key)===0)out.push(e)})}
  });
  return out;
}
function stValue(kind){
  var r=document.documentElement;
  try{
    if(kind==='theme'){var on=document.querySelector('#skUiAppearanceStudio .st-mode.active');var lb=on&&(on.querySelector('b,strong,.st-mode-title')||on);var t=lb?(lb.childNodes[0]&&lb.childNodes[0].nodeType===3?lb.childNodes[0].nodeValue:lb.textContent):'';t=String(t||'').trim().split(/\n/)[0];if(t.length>14)t=t.replace(/(Light|Dark|System|Auto Night).*/,'$1');return esc(t)}
    if(kind==='nav')return r.getAttribute('data-ui-nav')==='fixed'?'Fixed dock':'Floating';
    if(kind==='scale'){var s=r.getAttribute('data-ui-scale')||'normal';return s.charAt(0).toUpperCase()+s.slice(1)}
    if(kind==='accent')return '<i class="skst-dot"></i>';
    if(kind==='spring')return typeof window.skSpringLabel==='function'?window.skSpringLabel():'';
  }catch(e){}
  return '';
}
function buildList(sh){
  var list=sh.querySelector(':scope > .skst-list');
  if(!list){
    list=document.createElement('div');list.className='skst-list';
    var t=sh.querySelector(':scope > .modal-title');sh.insertBefore(list,t?t.nextSibling:sh.firstChild);
  }
  var html='';
  ST_ROWS.forEach(function(g,gi){
    html+='<div class="skst-h">'+esc(g[0])+'</div><div class="skst-group">';
    var vis=g[1].filter(function(r){return !r[6]||(typeof window.skCurrentRole==='function'&&window.skCurrentRole()===r[6])});
    if(!vis.length){html=html.replace(/<div class="skst-h">[^<]*<\/div><div class="skst-group">$/,'');html+='<!--skip-->';return}
    g[1].forEach(function(r,ri){
      if(r[6]&&!(typeof window.skCurrentRole==='function'&&window.skCurrentRole()===r[6]))return;
      var val=r[5]?stValue(r[5]):'';
      html+='<button type="button" class="skst-row" data-g="'+gi+'" data-r="'+ri+'"><span class="skst-ic" style="color:'+r[1]+'">'+svg(r[2])+'</span><span class="skst-l">'+esc(r[0])+'</span><span class="skst-v">'+val+'</span>'+(r[4]==='action'?'':'<span class="skst-chev">'+IC.chev+'</span>')+'</button>';
    });
    html+='</div>';
  });
  if(list.getAttribute('data-html')!==html){list.setAttribute('data-html',html);list.innerHTML=html}
  if(!list.__wired){list.__wired=1;list.addEventListener('click',function(e){var b=e.target.closest('.skst-row');if(!b)return;var r=ST_ROWS[+b.getAttribute('data-g')][1][+b.getAttribute('data-r')];stOpen(r)})}
}
function stTitle(sh,label){
  var t=sh.querySelector(':scope > .modal-title');if(!t)return;
  var bar=t.querySelector('.skst-bar');
  if(!bar){bar=document.createElement('div');bar.className='skst-bar';t.insertBefore(bar,t.firstChild)}
  var sig=label||'';if(bar.getAttribute('data-sig')===sig)return;bar.setAttribute('data-sig',sig);
  bar.innerHTML=(label?'<button type="button" class="skcl-ib skst-back" aria-label="Back to settings">'+IC.back+'</button>':'')+'<b>'+esc(label||'Settings')+'</b>';
  var bk=bar.querySelector('.skst-back');if(bk)bk.onclick=function(){window.skStBack()};
}
function clearShown(sh){Array.prototype.forEach.call(sh.querySelectorAll('[data-skst]'),function(e){e.removeAttribute('data-skst')})}
function stOpen(r){
  var sh=stSheet();if(!sh)return;
  if(r[4]==='action'){var rb=sh.querySelector('.st-reset-row');if(rb)rb.click();return}
  clearShown(sh);
  var els=findTargets(r[3]);
  els.forEach(function(e){e.setAttribute('data-skst','1')});
  if(r[4]==='look'){var st=$('skUiAppearanceStudio');if(st)st.setAttribute('data-skst','1');var lp=$('skLivePreview');if(lp)lp.setAttribute('data-skst','1')}
  sh.classList.remove('skst-listmode');sh.classList.add('skst-open');
  stTitle(sh,r[0]);sh.scrollTop=0;
}
window.skStBack=function(){
  var sh=stSheet();if(!sh)return;
  clearShown(sh);sh.classList.remove('skst-open');sh.classList.add('skst-listmode');
  buildList(sh);stTitle(sh,'');sh.scrollTop=0;
};
/* open one part directly (used by the menu's "App Data Folder" shortcut) */
window.skStOpenPart=function(label){
  for(var g=0;g<ST_ROWS.length;g++)for(var i=0;i<ST_ROWS[g][1].length;i++)if(ST_ROWS[g][1][i][0]===label){stOpen(ST_ROWS[g][1][i]);return true}
  return false;
};
var stWasOn=false;
window.addEventListener('sk-role-ready',function(){var sh=stSheet();if(sh&&sh.classList.contains('skst-listmode'))buildList(sh)});
function cleanSettings(){
  var m=$('settingsModal'),sh=stSheet();if(!m||!sh)return;
  var on=m.classList.contains('active');
  if(on&&!stWasOn){window.skStBack()}           /* every time Settings opens it starts at the list */
  else if(on&&sh.classList.contains('skst-listmode'))buildList(sh);
  stWasOn=on;
}
/* menu shortcut "App Data Folder" → open that part instead of scrolling a long page */
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest&&e.target.closest('#leftDrawer .menu-drawer-btn');
  if(!b||!/App Data Folder/.test(b.textContent||''))return;
  setTimeout(function(){if($('settingsModal')&&$('settingsModal').classList.contains('active'))window.skStOpenPart('App data folder')},250);
},true);


/* ---------- numbers that must stay on one line: shrink the font until they fit their box ---------- */
var FIT_SEL='#skUsedStatsGrid strong,#skCPDetailView .skcl-sum b,#skCPMainView .skcl-total b';
function fitText(){
  /* V5.9.21: only when a page that has such numbers is open (checking hidden ones forced a page layout on every tap) */
  var u=$('skUsedStockModal'),l=$('skCreditLedgerPage');
  if(!(u&&u.classList.contains('active'))&&!(l&&l.classList.contains('active')))return;
  Array.prototype.forEach.call(document.querySelectorAll(FIT_SEL),function(el){
    if(!el.offsetParent)return;
    var key=el.textContent+'|'+el.clientWidth;if(el.__fitKey===key)return;
    el.style.removeProperty('font-size');
    var size=parseFloat(getComputedStyle(el).fontSize)||16,min=11,guard=20;
    while(el.scrollWidth>el.clientWidth+1&&size>min&&guard--){size-=1;el.style.setProperty('font-size',size+'px','important')}
    el.__fitKey=el.textContent+'|'+el.clientWidth;
  });
}
window.addEventListener('resize',function(){setTimeout(fitText,100)});

/* ---------- menu: round the first and last visible row of every group ---------- */
function cleanMenu(){
  var d=$('leftDrawer');if(!d||!d.classList.contains('active'))return;
  Array.prototype.forEach.call(d.querySelectorAll('.drawer-group'),function(g){
    var vis=Array.prototype.filter.call(g.querySelectorAll(':scope > .menu-drawer-btn'),function(b){return getComputedStyle(b).display!=='none'});
    Array.prototype.forEach.call(g.querySelectorAll(':scope > .menu-drawer-btn'),function(b,i){
      var f=b===vis[0],l=b===vis[vis.length-1];
      if(b.classList.contains('skm-first')!==f)b.classList.toggle('skm-first',f);
      if(b.classList.contains('skm-last')!==l)b.classList.toggle('skm-last',l);
    });
  });
}
/* ---------- bottom bar tapped while the menu is open: close the menu, then the tap does its normal job ---------- */
document.addEventListener('click',function(e){
  var n=e.target&&e.target.closest&&e.target.closest('nav.bottom-nav .nav-item');if(!n)return;
  var d=$('leftDrawer');if(d&&d.classList.contains('active')&&typeof window.toggleLeftDrawer==='function')window.toggleLeftDrawer(false);
},true);


/* ---------- V5.9.23: Home / Tempered / Display switch with the same smooth entry as pages ---------- */
(function(){
  var reduce=function(){return document.documentElement.getAttribute('data-ui-motion')==='on'};
  function play(){var c=$('cardsContainer');if(!c||!c.animate||reduce())return;
    try{c.animate([{opacity:0,transform:'translate3d(0,14px,0)'},{opacity:1,transform:'none'}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'})}catch(e){}}
  function wrap(name){var o=window[name];if(typeof o!=='function'||o.__skIn)return false;
    var w=function(){var r=o.apply(this,arguments);play();return r};w.__skIn=1;window[name]=w;return true}
  function hook(){var a=wrap('skGoToInventoryFilter'),b=wrap('skGoHomeFromAppShell');return (a||window.skGoToInventoryFilter&&window.skGoToInventoryFilter.__skIn)&&(b||window.skGoHomeFromAppShell&&window.skGoHomeFromAppShell.__skIn)}
  if(!hook()){var n=0,t=setInterval(function(){if(hook()||++n>40)clearInterval(t)},250)}
})();
/* ============================ wiring ============================ */
var raf=0,syncDepth=0,fitPending=0;
function run(){raf=0;try{cleanLedger()}catch(e){console.warn('clean ledger',e)}try{cleanLedgerList()}catch(e){console.warn('clean ledger list',e)}try{cleanSettings()}catch(e){console.warn('clean settings',e)}if(!fitPending){fitPending=1;requestAnimationFrame(function(){fitPending=0;try{fitText()}catch(e){}})}try{cleanMenu()}catch(e){}}
function schedule(){if(!raf)raf=requestAnimationFrame(run)}
function boot(){
  new (window.__skNativeMO||MutationObserver)(function(ms){
    for(var i=0;i<ms.length;i++){var t=ms[i].target;
      if(t.nodeType===1&&(t.id==='skCreditLedgerPage'||t.id==='settingsModal'||t.id==='skCPDetailView'||(t.closest&&t.closest('#skCPDetailView,#skCPMainView,#settingsModal,#skUsedStatsGrid'))||t.id==='skUsedStockModal'||t.id==='leftDrawer')){if(raf){cancelAnimationFrame(raf);raf=0}if(syncDepth<3){syncDepth++;try{run()}finally{Promise.resolve().then(function(){syncDepth=0})}}else schedule();return}}
  }).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style']});
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

/* V5.11.44: comfortable reading size - nothing in the app UI is smaller than 11.5px (bill/PDF sheets are left as designed). */
(function(){
  'use strict';
  var MIN=11.5, SKIP='[id^="pv"],#invoiceMainSheet,#viewBillContent,.invoice-preview,svg,canvas,script,style,#skNavFade,nav.bottom-nav,.drawer-footer-badge,.sk-home-ver,#skAppVersionBadge,.app-sub,.box-photo-scan-btn,.search-icon-left';
  var q=[],timer=0,seen=new WeakSet();
  function fixEl(e){
    try{
      if(e.nodeType!==1)return;
      var has=false,t='';
      for(var n=e.firstChild;n;n=n.nextSibling){if(n.nodeType===3&&n.nodeValue.trim()){has=true;t+=n.nodeValue.trim();}}
      if(!has||t.length<4||e.closest(SKIP))return;
      var fs=parseFloat(getComputedStyle(e).fontSize);
      if(fs>0&&fs<MIN-0.05)e.style.setProperty('font-size',MIN+'px','important');
    }catch(x){}
  }
  function scan(root){
    if(!root||root.nodeType!==1)return;
    fixEl(root);
    var all=root.querySelectorAll('*'),lim=Math.min(all.length,4000);
    for(var i=0;i<lim;i++)fixEl(all[i]);
  }
  function flush(){
    timer=0;var list=q.splice(0);
    (window.requestIdleCallback||function(f){setTimeout(f,0);})(function(){for(var i=0;i<list.length;i++)scan(list[i]);},{timeout:1200});
  }
  function enqueue(n){
    if(!n||n.nodeType!==1)return;
    if(n.parentElement===document.body&&!/overlay|modal|dialog|sheet|toast/i.test(String(n.className)+' '+n.id))return;
    q.push(n);if(!timer)timer=setTimeout(flush,450);
  }
  function boot(){
    var run=window.requestIdleCallback?function(f){requestIdleCallback(f,{timeout:1500});}:function(f){setTimeout(f,600);};
    run(function(){q.push(document.querySelector('.app-viewport')||document.body);
      document.querySelectorAll('.modal-overlay').forEach(function(m){q.push(m);seen.add(m);});if(!timer)timer=setTimeout(flush,50);});
    new MutationObserver(function(ms){
      for(var i=0;i<ms.length;i++){
        var m=ms[i];
        if(m.type==='childList'){for(var j=0;j<m.addedNodes.length;j++)enqueue(m.addedNodes[j]);}
        else if(m.type==='attributes'&&m.target.classList&&m.target.classList.contains('modal-overlay')&&m.target.classList.contains('active')&&!seen.has(m.target)){seen.add(m.target);enqueue(m.target);}
      }
    }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
