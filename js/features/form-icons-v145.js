/* SK Mobiles v5.6.166 — adds a small coloured icon in front of every form label.
   Purely visual: labels/inputs/ids/handlers are untouched. */
(function(){
  'use strict';
  var P={
   user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
   phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
   pin:'<path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
   device:'<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
   tag:'<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
   chip:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
   disk:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
   palette:'<path d="M12 3a9 9 0 0 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.2-2.5 1.6-2.5H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
   box:'<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
   barcode:'<path d="M4 5v14M7 5v14M11 5v14M14 5v14M17 5v14M20 5v14"/>',
   rupee:'<path d="M7 5h10M7 9h10M7 5c5 0 7 2 7 4s-2 4-7 4l7 6"/>',
   cal:'<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
   note:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
   wallet:'<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M16 13h2M3 10h18M6 6l9-3 2 3"/>',
   wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.3-.5-.5-2.3z"/>',
   check:'<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/>',
   mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
   store:'<path d="M4 9l1.5-5h13L20 9"/><path d="M5 9v11h14V9"/><path d="M10 20v-5h4v5"/>',
   search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
   img:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
   list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
   percent:'<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.2"/><circle cx="17" cy="17" r="2.2"/>',
   clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
   hash:'<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>'
  };
  var RULES=[
   [/e-?mail/i,'mail','c-orange'],[/phone|whatsapp|mobile no|contact/i,'phone','c-blue'],
   [/address|location|place/i,'pin','c-green'],[/customer|dealer|name of|^name|owner|worker|user/i,'user','c-blue'],
   [/imei|serial/i,'barcode','c-slate'],[/\bram\b/i,'chip','c-violet'],[/storage|rom/i,'disk','c-teal'],
   [/colou?r/i,'palette','c-pink'],[/package|kit|box/i,'box','c-amber'],
   [/brand|model|device|mobile|item title|accessory/i,'device','c-blue'],
   [/price|amount|estimate|advance|balance|cost|paid|payment \(|emi amount|total|₹|rupee/i,'rupee','c-green'],
   [/interest|%/i,'percent','c-orange'],[/month/i,'cal','c-violet'],
   [/date|due/i,'cal','c-violet'],[/time/i,'clock','c-violet'],
   [/payment mode|mode|method/i,'wallet','c-amber'],[/category|type/i,'tag','c-orange'],
   [/status/i,'check','c-green'],[/problem|repair|issue|work|fault/i,'wrench','c-red'],
   [/stock|qty|quantity|count/i,'hash','c-teal'],[/search|find/i,'search','c-slate'],
   [/image|photo|logo/i,'img','c-pink'],[/compatible|models?/i,'list','c-violet'],
   [/note|detail|remark|terms|purchase|description|info/i,'note','c-slate'],[/shop|store/i,'store','c-blue'],
   [/bill|sales/i,'note','c-blue']
  ];
  function pick(t){for(var i=0;i<RULES.length;i++)if(RULES[i][0].test(t))return RULES[i];return ['','note','c-slate']}
  function mk(rule){
    var s=document.createElement('span');s.className='sk-fi '+rule[2];s.setAttribute('aria-hidden','true');
    s.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+(P[rule[1]]||P.note)+'</svg>';
    return s;
  }
  function labelText(l){var t='';for(var n=l.firstChild;n;n=n.nextSibling){if(n.nodeType===3)t+=n.nodeValue;else if(n.nodeType===1&&!/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(n.tagName)&&!/sk-fi|ski/.test(n.className||''))t+=n.textContent}return t.replace(/[^\w\s()\/%₹.&-]/g,' ').trim()}
  function enhance(l){
    if(l.dataset.skFi==='1'||l.querySelector(':scope > .sk-fi,:scope > .ski,:scope > svg'))return;
    if(l.closest('#settingsModal,.st-studio,.sk-invoice-paper,#viewBillContent,#skUsedStockModal'))return;
    var t=labelText(l);if(!t)return;
    l.dataset.skFi='1';
    if(l.querySelector(':scope > input,:scope > select,:scope > textarea')){
      var sp=document.createElement('span');sp.className='sk-fl';
      var nodes=[];for(var n=l.firstChild;n;n=n.nextSibling){if(n.nodeType===3||(n.nodeType===1&&!/^(INPUT|SELECT|TEXTAREA|BUTTON|DIV)$/.test(n.tagName)))nodes.push(n);else break}
      sp.appendChild(mk(pick(t)));var tx=document.createElement('span');sp.appendChild(tx);
      l.insertBefore(sp,l.firstChild);nodes.forEach(function(n){tx.appendChild(n)});
    }else l.insertBefore(mk(pick(t)),l.firstChild);
  }
  function scan(root){(root||document).querySelectorAll('.modal-sheet label.form-label,.modal-sheet .form-label,.sk-rj-filter-label').forEach(enhance)}
  function boot(){scan(document);
    try{var tm;new MutationObserver(function(){clearTimeout(tm);tm=setTimeout(function(){scan(document)},120)}).observe(document.body,{childList:true,subtree:true})}catch(e){}}
  window.skAddFormIcons=scan;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
