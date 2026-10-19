/* SK MOBILES V5.11.16 — iPhone-style spring at the end of every scrolling page / popup / menu.
   - Dragging past the top/bottom gets heavier the further you pull (rubber band).
   - Letting go: a real damped spring carries the speed you released with, one soft overshoot.
   - A fast scroll that runs into the end feeds its speed into the same spring (fast = bigger, slow = smaller).
   - Home page only, at the very top: pull down far enough and release to reload.
   Uses the CSS `translate` property on the scroller's children (page = .app-viewport). No data keys. */
(function(){
'use strict';
if(window.__skSpring)return;window.__skSpring=1;
var NO='input,textarea,select,canvas,[data-no-spring],.leaflet-container';
var K=130,C=14,REFRESH_AT=60;
var st=null,phys=new WeakMap(),fl=new WeakMap();
function docScroller(){return document.scrollingElement||document.documentElement}
function isDoc(sc){return sc===docScroller()||sc===document.body||sc===document.documentElement}
function canScroll(el){
  if(isDoc(el))return docScroller().scrollHeight>docScroller().clientHeight+2;
  var cs=getComputedStyle(el);if(cs.overflowY!=='auto'&&cs.overflowY!=='scroll')return false;
  return el.scrollHeight>el.clientHeight+2;
}
function findScroller(n){
  while(n&&n!==document.body&&n!==document.documentElement){if(n.nodeType===1&&canScroll(n))return n;n=n.parentNode}
  return canScroll(document.documentElement)?docScroller():null;
}
function targets(sc){
  if(isDoc(sc)){var v=document.querySelector('.app-viewport');return v?[v]:[]}
  return Array.prototype.slice.call(sc.children).filter(function(c){return c.tagName!=='SCRIPT'&&c.tagName!=='STYLE'});
}
function scTop(sc){return isDoc(sc)?(window.pageYOffset||docScroller().scrollTop):sc.scrollTop}
function atTop(sc){return scTop(sc)<=0}
function atBot(sc){var d=isDoc(sc)?docScroller():sc;return d.scrollTop+d.clientHeight>=d.scrollHeight-1}
function dimOf(sc){return (isDoc(sc)?window.innerHeight:sc.clientHeight)||600}
function band(sc,d){var dim=dimOf(sc);return (d<0?-1:1)*dim*(1-1/(Math.abs(d)*.55/dim+1))*.55}

/* ---- spring engine, one per scroller ---- */
function P(sc){var p=phys.get(sc);if(!p){p={sc:sc,x:0,v:0,raf:0,last:0};phys.set(sc,p)}return p}
function render(p){var ts=targets(p.sc),s=p.x?'0 '+p.x.toFixed(2)+'px':'';for(var i=0;i<ts.length;i++)ts[i].style.translate=s}
function stop(p){if(p.raf){cancelAnimationFrame(p.raf);p.raf=0}}
function kick(p,hold){
  stop(p);p.last=performance.now();
  (function step(t){
    var dt=Math.min((t-p.last)/1000,.032);p.last=t;
    var target=hold||0,a=-K*(p.x-target)-C*p.v;p.v+=a*dt;p.x+=p.v*dt;render(p);
    if(Math.abs(p.x-target)<.3&&Math.abs(p.v)<4){p.x=target;p.v=0;render(p);p.raf=0;return}
    p.raf=requestAnimationFrame(step);
  })(p.last);
}

/* ---- finger drag ---- */
document.addEventListener('touchstart',function(e){
  if(e.touches.length!==1){st=null;return}
  var t=e.target;if(t&&t.closest&&t.closest(NO)){st=null;return}
  var sc=findScroller(t);if(!sc){st=null;return}
  var p=P(sc);stop(p);p.x=0;p.v=0;render(p);
  st={p:p,sc:sc,home:isDoc(sc)&&!!(t.closest&&t.closest('.app-viewport')),y0:e.touches[0].clientY,x0:e.touches[0].clientX,on:false,dead:false,dir:0,hist:[]};
},{passive:true,capture:true});

document.addEventListener('touchmove',function(e){
  if(!st||st.dead)return;
  var y=e.touches[0].clientY,dy=y-st.y0,dx=e.touches[0].clientX-st.x0;
  if(!st.on){
    if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>8){st.dead=true;return}
    if(!((dy>0&&atTop(st.sc))||(dy<0&&atBot(st.sc))))return;
    st.on=true;st.dir=dy>0?1:-1;st.y0=y;dy=0;
  }
  if(e.cancelable)e.preventDefault();
  var d=y-st.y0;if((st.dir>0&&d<0)||(st.dir<0&&d>0))d=0;
  st.p.x=band(st.sc,d);st.p.v=0;render(st.p);
  var now=performance.now();st.hist.push([now,st.p.x]);if(st.hist.length>6)st.hist.shift();
  if(st.home&&st.dir>0)ind(st.p.x);
},{passive:false,capture:true});

function end(){
  if(!st)return;var s=st;st=null;if(!s.on)return;
  var h=s.hist,n=h.length,v=0;
  if(n>1&&performance.now()-h[n-1][0]<120){var a=h[0],b=h[n-1];if(b[0]>a[0])v=(b[1]-a[1])/((b[0]-a[0])/1000)}
  var p=s.p;
  if(s.home&&s.dir>0&&p.x>=REFRESH_AT){indSpin();p.v=0;kick(p,36);setTimeout(function(){location.reload()},450);return}
  if(s.home)indHide();
  p.v=v;kick(p);
}
document.addEventListener('touchend',end,{passive:true,capture:true});
document.addEventListener('touchcancel',end,{passive:true,capture:true});

/* ---- fast scroll that runs into the end ---- */
document.addEventListener('scroll',function(e){
  var tg=e.target,sc=(tg===document||tg===window||tg===document.documentElement||tg===document.body)?docScroller():tg;
  if(!sc||sc.nodeType!==1)return;
  var f=fl.get(sc);if(!f){f={t:0,time:0,ve:0};fl.set(sc,f)}
  var top=scTop(sc),now=performance.now(),dt=now-f.time,raw=dt>0&&dt<100?(top-f.t)/dt:0;
  f.ve=dt<100?f.ve*.5+raw*.5:raw;f.t=top;f.time=now;
  if(st&&st.on)return;
  var p=P(sc);if(p.raf)return;
  var max=sc.scrollHeight-sc.clientHeight,ve=f.ve;
  if((top<=0&&ve<-.5)||(top>=max-1&&ve>.5)){
    p.x=0;p.v=Math.max(-1100,Math.min(1100,-ve*1000*.55));kick(p);
  }
},{passive:true,capture:true});

/* ---- Home pull-to-reload indicator ---- */
var IND=null,spinA=null;
function ind(x){
  if(!IND){IND=document.createElement('div');IND.id='skPtr';IND.setAttribute('aria-hidden','true');
    IND.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);width:38px;height:38px;margin-left:-19px;border-radius:50%;background:#fff;box-shadow:0 4px 14px rgba(15,23,42,.25);display:grid;place-items:center;z-index:2147483000;font-size:20px;color:#2563eb;pointer-events:none;opacity:0;transition:opacity .15s';
    IND.textContent='↻';document.body.appendChild(IND)}
  var q=Math.min(x/REFRESH_AT,1);IND.style.opacity=String(Math.min(q*1.4,1));IND.style.transform='translateY('+Math.min(x*.6,40)+'px) rotate('+(q*270)+'deg)';
}
function indSpin(){if(!IND)return;IND.style.opacity='1';try{spinA=IND.animate([{transform:'translateY(36px) rotate(0deg)'},{transform:'translateY(36px) rotate(360deg)'}],{duration:700,iterations:Infinity,easing:'linear'})}catch(e){}}
function indHide(){if(IND)IND.style.opacity='0'}
})();
