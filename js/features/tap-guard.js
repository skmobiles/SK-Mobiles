/* SK MOBILES V5.9.8 — reliable taps on the Home boxes.
   1) Tracks when a finger is on the screen so cloud-sync redraws wait until the tap is finished (see firebase-sync.js).
   2) On touch phones the Home boxes are no longer HTML "draggable": a long press there started a browser drag that
      could swallow the next taps until the app was refreshed. (Re-ordering by drag only ever worked with a mouse.)
   No data is read or written. */
(function(){
'use strict';
if(window.__skTapGuard)return;window.__skTapGuard=true;
var down=0,last=0;
function on(){down++;last=Date.now()}
function off(){down=Math.max(0,down-1);last=Date.now()}
document.addEventListener('pointerdown',on,true);
document.addEventListener('pointerup',off,true);
document.addEventListener('pointercancel',off,true);
document.addEventListener('touchstart',function(){last=Date.now()},{capture:true,passive:true});
window.__skTouchBusy=function(){if(down>0&&Date.now()-last>4000)down=0;return down>0||Date.now()-last<450};
var coarse=window.matchMedia&&window.matchMedia('(pointer: coarse)').matches;
if(!coarse)return;
function undrag(root){(root||document).querySelectorAll('.draggable-card[draggable="true"]').forEach(function(el){el.setAttribute('draggable','false')})}
var raf=0;
function sched(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;undrag()})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){undrag();var c=document.getElementById('cardsContainer');if(c)new MutationObserver(sched).observe(c,{childList:true,subtree:true})});
else{undrag();var c=document.getElementById('cardsContainer');if(c)new MutationObserver(sched).observe(c,{childList:true,subtree:true})}
document.addEventListener('dragstart',function(e){if(e.target&&e.target.closest&&e.target.closest('.draggable-card'))e.preventDefault()},true);
/* Long-press to re-order Home boxes on phones: hold a box ~0.5 s until it lifts, slide it to the new place, lift the finger.
   A normal short tap still opens the box. The new order is saved like the old desktop drag (sk_order_<list id>). */
var LP_MS=500,MOVE_TOL=10,lp=null;
function cardAt(x,y,skip){skip.style.pointerEvents='none';var el=document.elementFromPoint(x,y);skip.style.pointerEvents='';return el&&el.closest?el.closest('.draggable-card'):null}
function saveOrder(box){try{var ids=[].map.call(box.querySelectorAll('.draggable-card'),function(c){return c.dataset.cardId});localStorage.setItem('sk_order_'+box.id,JSON.stringify(ids))}catch(e){}}
document.addEventListener('pointerdown',function(e){
  if(e.pointerType==='mouse')return;
  var card=e.target.closest&&e.target.closest('#homeMetricGrid .draggable-card,#homeActionCardsContainer .draggable-card');if(!card)return;
  lp={card:card,box:card.parentElement,x:e.clientX,y:e.clientY,on:false,t:setTimeout(function(){
    if(!lp)return;lp.on=true;card.classList.add('sk-lp-drag');document.body.classList.add('sk-lp-active');
    try{navigator.vibrate&&navigator.vibrate(25)}catch(x){}
  },LP_MS)};
},true);
document.addEventListener('pointermove',function(e){
  if(!lp)return;
  if(!lp.on){if(Math.abs(e.clientX-lp.x)>MOVE_TOL||Math.abs(e.clientY-lp.y)>MOVE_TOL){clearTimeout(lp.t);lp=null}return}
  var over=cardAt(e.clientX,e.clientY,lp.card);
  if(over&&over!==lp.card&&over.parentElement===lp.box){
    var all=[].slice.call(lp.box.querySelectorAll('.draggable-card')),a=all.indexOf(lp.card),b=all.indexOf(over);
    lp.box.insertBefore(lp.card,a<b?over.nextSibling:over);
  }
},true);
document.addEventListener('touchmove',function(e){if(lp&&lp.on)e.preventDefault()},{capture:true,passive:false});
function end(){
  if(!lp)return;clearTimeout(lp.t);var was=lp.on,card=lp.card,box=lp.box;lp=null;
  if(!was)return;
  card.classList.remove('sk-lp-drag');document.body.classList.remove('sk-lp-active');saveOrder(box);
  if(typeof window.showToast==='function')window.showToast('Position updated!');
  /* swallow the click that follows the long press */
  var stop=function(ev){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();};
  document.addEventListener('click',stop,{capture:true,once:true});setTimeout(function(){document.removeEventListener('click',stop,true)},350);
}
document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',function(){if(lp&&lp.on)end();else if(lp){clearTimeout(lp.t);lp=null}},true);
document.addEventListener('contextmenu',function(e){if(lp||(e.target.closest&&e.target.closest('#homeMetricGrid .draggable-card,#homeActionCardsContainer .draggable-card')))e.preventDefault()},true);
})();
