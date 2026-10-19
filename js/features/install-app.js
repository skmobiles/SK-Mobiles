/* SK MOBILES V5.10.3 — "Install app" button.
   Chrome shows its own install question only once per site. This keeps an Install button
   on the sign-in card and a small bar above the bottom navigation, only on phones where
   the app can be installed and is not installed yet. ✕ hides the bar for 7 days on this phone. */
(function(){
'use strict';
var KEY='skInstallHideUntil',deferred=null;
function standalone(){try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch(e){return false}}
function hiddenUntil(){try{return +localStorage.getItem(KEY)||0}catch(e){return 0}}
function ico(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>'}
function loginBtn(){
  var b=document.getElementById('skInstallLoginBtn');if(b)return b;
  var msg=document.getElementById('skLoginMsg');if(!msg)return null;
  b=document.createElement('button');b.type='button';b.id='skInstallLoginBtn';b.className='sk-install-login';b.hidden=true;
  b.innerHTML=ico()+'<span>Install app on this phone</span>';
  b.addEventListener('click',install);msg.parentNode.insertBefore(b,msg);return b;
}
function bar(){
  var d=document.getElementById('skInstallBar');if(d)return d;
  d=document.createElement('div');d.id='skInstallBar';d.className='sk-install-bar';d.hidden=true;
  d.innerHTML='<span class="sk-install-ic">'+ico()+'</span><span class="sk-install-tx"><b>Install SK Mobiles</b><small>Opens like an app</small></span><button type="button" class="sk-install-go">Install</button><button type="button" class="sk-install-x" aria-label="Hide">✕</button>';
  d.querySelector('.sk-install-go').addEventListener('click',install);
  d.querySelector('.sk-install-x').addEventListener('click',function(){try{localStorage.setItem(KEY,String(Date.now()+7*864e5))}catch(e){}update()});
  document.body.appendChild(d);return d;
}
function update(){
  var can=!!deferred&&!standalone();
  var b=loginBtn();if(b)b.hidden=!can;
  var d=bar();d.hidden=!(can&&Date.now()>hiddenUntil());
}
async function install(){
  if(!deferred)return;var p=deferred;deferred=null;update();
  try{p.prompt();await p.userChoice}catch(e){}
}
window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;update()});
window.addEventListener('appinstalled',function(){deferred=null;update();try{if(typeof showToast==='function')showToast('✅ App installed — open it from your home screen')}catch(e){}});
function boot(){update()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
