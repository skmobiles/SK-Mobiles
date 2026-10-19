/* SK MOBILES V5.10.0 — Settings -> People & access (owner only).
   Everyone signs in with Google. A new person shows up here under "Waiting for access";
   the owner picks Manager / Worker / No access. The role is stored in users/{uid}.role and checked by firestore.rules. */
(function(){
'use strict';
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function toast(t){try{if(typeof showToast==='function')showToast(t)}catch(e){}}
var COLORS=['#2563eb','#7c3aed','#16a34a','#ea580c','#db2777','#0891b2','#ca8a04'];
var ROLE_LABEL={admin:'Owner',manager:'Manager',worker:'Worker',none:'No access',pending:'Waiting'};
var unsub=null,lastHtml='';

function ensureSection(){
  var sh=document.querySelector('#settingsModal > .modal-sheet');if(!sh)return null;
  var sec=$('skPeopleSection');
  if(!sec){
    sec=document.createElement('section');sec.id='skPeopleSection';sec.className='st-section skpp';
    sec.innerHTML='<div class="skpp-body"><div class="skpp-empty">Loading…</div></div>';
    var t=sh.querySelector(':scope > .modal-title');sh.insertBefore(sec,t?t.nextSibling:sh.firstChild);
  }
  return sec;
}
function avatar(p,i){
  var c=COLORS[i%COLORS.length],l=(p.name||p.email||'?').trim().charAt(0).toUpperCase();
  if(p.photo)return '<img class="skpp-av" src="'+esc(p.photo)+'" alt="" referrerpolicy="no-referrer" onerror="this.outerHTML=\'<span class=&quot;skpp-av&quot; style=&quot;background:'+c+'22;color:'+c+'&quot;>'+esc(l)+'</span>\'">';
  return '<span class="skpp-av" style="background:'+c+'22;color:'+c+'">'+esc(l)+'</span>';
}
function row(p,i,me){
  var who='<span class="skpp-who"><b>'+esc(p.name||(p.email||'Unknown user').split('@')[0])+(p.role==='pending'?'<em class="skpp-new">New</em>':'')+'</b><small>'+esc(p.email)+'</small></span>';
  var ctl;
  if(p.role==='admin'||p.uid===me)ctl='<span class="skpp-owner">'+(p.role==='admin'?'Owner':ROLE_LABEL[p.role]||p.role)+'</span>';
  else ctl='<select class="skpp-role'+(p.role==='none'?' is-none':'')+(p.role==='pending'?' is-pending':'')+'" data-uid="'+esc(p.uid)+'" data-was="'+esc(p.role)+'" aria-label="Role for '+esc(p.email)+'">'+
    (p.role==='pending'?'<option value="pending" selected disabled>Choose role</option>':'')+
    '<option value="manager"'+(p.role==='manager'?' selected':'')+'>Manager</option>'+
    '<option value="worker"'+(p.role==='worker'?' selected':'')+'>Worker</option>'+
    '<option value="none"'+(p.role==='none'?' selected':'')+'>No access</option></select>';
  var rm=(p.role==='admin'||p.uid===me)?'':'<button type="button" class="skpp-rm" data-uid="'+esc(p.uid)+'" aria-label="Remove '+esc(p.email||'user')+'" title="Remove">&#128465;</button>';
  return '<div class="skpp-row'+(p.role==='pending'?' is-pending':'')+'">'+avatar(p,i)+who+ctl+rm+'</div>';
}
function render(list,me,err){
  var sec=ensureSection();if(!sec)return;var body=sec.querySelector('.skpp-body');
  if(err||!list){body.innerHTML='<div class="skpp-empty">Could not load the people list. Check the internet connection and that the new Firestore rules are published.</div>';lastHtml='';return}
  var order={admin:0,manager:1,worker:2,none:3};
  var waiting=list.filter(function(p){return p.role==='pending'}).sort(function(a,b){return b.createdAt-a.createdAt});
  var staff=list.filter(function(p){return p.role!=='pending'}).sort(function(a,b){var oa=a.role in order?order[a.role]:9,ob=b.role in order?order[b.role]:9;return oa-ob||String(a.name||a.email).localeCompare(String(b.name||b.email))});
  var h='';
  if(waiting.length)h+='<div class="skpp-h">Waiting for access</div><div class="skpp-list">'+waiting.map(function(p,i){return row(p,i,me)}).join('')+'</div>';
  h+='<div class="skpp-h">Staff</div><div class="skpp-list">'+staff.map(function(p,i){return row(p,i+waiting.length,me)}).join('')+'</div>';
  h+='<div class="skpp-note"><b>How to add someone:</b> ask them to open this app on their phone and tap <b>Sign in with Google</b>. They appear above under “Waiting for access” — choose a role and the app opens for them.<br><br><b>Manager</b> — what the Manager permissions allow (Admin Control).<br><b>Worker</b> — bills and repair entries; no Settings.<br><b>No access</b> — sees nothing; their old entries stay.</div>';
  if(h!==lastHtml){lastHtml=h;body.innerHTML=h}
}
function start(){
  if(unsub||typeof window.skPeopleWatch!=='function')return;
  if(typeof window.skCurrentRole==='function'&&window.skCurrentRole()!=='admin')return;
  ensureSection();
  unsub=window.skPeopleWatch(render);
}
function stop(){if(unsub){try{unsub()}catch(e){}unsub=null;lastHtml=''}}
document.addEventListener('change',async function(e){
  var s=e.target&&e.target.closest&&e.target.closest('#skPeopleSection select.skpp-role');if(!s)return;
  var uid=s.getAttribute('data-uid'),was=s.getAttribute('data-was'),role=s.value;
  var email=(s.closest('.skpp-row').querySelector('small')||{}).textContent||'';
  if(role==='none'&&!confirm('Turn off access for '+email+'? They will not see any data. Their old entries stay.')){s.value=was;return}
  s.disabled=true;
  try{await window.skPeopleSetRole(uid,role);toast('✅ '+email+' → '+(ROLE_LABEL[role]||role))}
  catch(err){console.error(err);s.value=was;toast('❌ Could not change the role: '+(err&&err.message||err))}
  finally{s.disabled=false}
});
document.addEventListener('click',async function(e){
  var b=e.target&&e.target.closest&&e.target.closest('#skPeopleSection .skpp-rm');if(!b)return;
  var row=b.closest('.skpp-row'),email=(row.querySelector('small')||{}).textContent||'this user';
  if(!confirm('Remove '+email+' from the list? They lose access. Their old entries stay. If they sign in again they will appear under "Waiting for access".'))return;
  b.disabled=true;
  try{await window.skPeopleRemove(b.getAttribute('data-uid'));toast('✅ Removed '+email)}
  catch(err){console.error(err);b.disabled=false;toast('❌ Could not remove: '+(err&&err.message||err))}
});
/* listen only while Settings is open */
function check(){var m=$('settingsModal');if(m&&m.classList.contains('active'))start();else stop()}
window.addEventListener('sk-role-ready',function(){stop();check()});
/* Menu (left drawer): People & access at the very top, owner only */
function menuBtn(){
  var g=document.querySelector('#leftDrawer .left-drawer-content > .drawer-group');if(!g)return;
  var b=$('skPeopleMenuBtn');
  if(!b){
    b=document.createElement('button');b.type='button';b.id='skPeopleMenuBtn';b.className='menu-drawer-btn';
    b.innerHTML='<span class="menu-icon-pod" aria-hidden="true" style="color:#2563eb"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16 14.2a5 5 0 0 1 5.5 5"/></svg></span><span class="menu-btn-label">People &amp; access</span><span class="menu-arrow">\u203a</span>';
    b.onclick=function(){
      try{toggleModal('settingsModal',true);toggleLeftDrawer(false)}catch(e){}
      setTimeout(function(){if(typeof window.skStOpenPart==='function')window.skStOpenPart('People & access')},150);
    };
    var t=g.querySelector('.drawer-group-title');g.insertBefore(b,t?t.nextSibling:g.firstChild);
  }
  b.style.display=(typeof window.skCurrentRole==='function'&&window.skCurrentRole()==='admin')?'':'none';
}
window.addEventListener('sk-role-ready',menuBtn);
function boot(){
  menuBtn();var dr=$('leftDrawer');if(dr)new MutationObserver(menuBtn).observe(dr,{attributes:true,attributeFilter:['class']});
  var m=$('settingsModal');if(!m)return;
  new MutationObserver(check).observe(m,{attributes:true,attributeFilter:['class']});check();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
