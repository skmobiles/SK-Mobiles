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
})();
