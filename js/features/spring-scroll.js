/* SK MOBILES V5.11.12 — spring bounce at the end of every scrolling page / popup / menu.
   Two cases: (1) finger drags past the top/bottom -> content follows, springs back on release;
   (2) a normal fast scroll reaches the end -> one smooth, calm bounce.
   Uses the CSS `translate` property on the scroller's children (page = .app-viewport), so it never touches other transforms.
   No data keys, no business logic. */
(function(){
'use strict';
if(window.__skSpring)return;window.__skSpring=1;
var NO='input,textarea,select,canvas,[data-no-spring],.leaflet-container';
var st=null,fling=new WeakMap();
function docScroller(){return document.scrollingElement||document.documentElement}
function canScroll(el){
  if(el===document.documentElement||el===document.body)return docScroller().scrollHeight>docScroller().clientHeight+2;
  var cs=getComputedStyle(el);if(cs.overflowY!=='auto'&&cs.overflowY!=='scroll')return false;
  return el.scrollHeight>el.clientHeight+2;
}
function findScroller(n){
  while(n&&n!==document.body&&n!==document.documentElement){if(n.nodeType===1&&canScroll(n))return n;n=n.parentNode}
  return canScroll(document.documentElement)?docScroller():null;
}
function targets(sc){
  if(sc===docScroller()||sc===document.body||sc===document.documentElement){var v=document.querySelector('.app-viewport');return v?[v]:[]}
  return Array.prototype.slice.call(sc.children).filter(function(c){return c.tagName!=='SCRIPT'&&c.tagName!=='STYLE'});
}
function setT(ts,y){var v=y?'0 '+y+'px':'';for(var i=0;i<ts.length;i++)ts[i].style.translate=v}
function atTop(sc){return (sc===docScroller()?window.pageYOffset:sc.scrollTop)<=0}
function atBot(sc){var d=sc===docScroller()?docScroller():sc;return d.scrollTop+d.clientHeight>=d.scrollHeight-1}
function anims(ts){return ts.map(function(t){return t.__skA}).filter(Boolean)}
function stopAnims(ts){ts.forEach(function(t){if(t.__skA){try{t.__skA.cancel()}catch(e){}t.__skA=null}})}
function play(ts,keys,opt,done){
  if(!ts.length||!ts[0].animate){setT(ts,0);done&&done();return}
  ts.forEach(function(t,i){
    var a=t.animate(keys,opt);t.__skA=a;
    a.onfinish=a.oncancel=function(){if(t.__skA===a)t.__skA=null;if(i===0&&done)done()};
  });
  setT(ts,0);
}

document.addEventListener('touchstart',function(e){
  if(e.touches.length!==1){st=null;return}
  var t=e.target;if(t&&t.closest&&t.closest(NO)){st=null;return}
  var sc=findScroller(t);if(!sc){st=null;return}
  var ts=targets(sc);if(!ts.length){st=null;return}
  stopAnims(ts);setT(ts,0);
  st={sc:sc,ts:ts,y0:e.touches[0].clientY,x0:e.touches[0].clientX,on:false,dead:false,cur:0};
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
  var d=y-st.y0;
  var cur=d>0?Math.pow(d,.92):-Math.pow(-d,.92);
  /* finger moved back past the start point: no pull */
  if((st.dir>0&&d<0)||(st.dir<0&&d>0))cur=0;
  st.cur=cur;setT(st.ts,Math.round(cur*10)/10);
},{passive:false,capture:true});

function end(){
  if(!st){return}var s=st;st=null;
  if(!s.on)return;
  var from=s.cur;
  play(s.ts,[{translate:'0 '+from+'px'},{translate:'0 0px'}],{duration:900,easing:'cubic-bezier(.3,1.9,.45,1)'});
}
document.addEventListener('touchend',end,{passive:true,capture:true});
document.addEventListener('touchcancel',end,{passive:true,capture:true});

/* normal fast scroll that reaches the end */
function onScroll(e){
  var sc=e.target===document||e.target===window||e.target===document.documentElement||e.target===document.body?docScroller():e.target;
  if(!sc||sc.nodeType!==1)return;
  if(st&&st.on)return;
  var f=fling.get(sc);if(!f){f={t:0,time:0,ve:0,busy:false};fling.set(sc,f)}
  var top=sc===docScroller()?(window.pageYOffset||docScroller().scrollTop):sc.scrollTop,now=performance.now(),dt=now-f.time;
  var raw=dt>0&&dt<100?(top-f.t)/dt:0;f.ve=dt<100?f.ve*.5+raw*.5:raw;f.t=top;f.time=now;
  if(f.busy)return;
  var v=f.ve,max=sc.scrollHeight-sc.clientHeight;
  var hitTop=top<=0&&v<-0.5,hitBot=top>=max-1&&v>0.5;
  if(!hitTop&&!hitBot)return;
  var ts=targets(sc);if(!ts.length)return;
  var amp=Math.min(Math.max(Math.abs(v)*16,28),52)*(hitBot?-1:1);
  f.busy=true;stopAnims(ts);
  play(ts,[{translate:'0 0px',easing:'cubic-bezier(.2,.8,.4,1)'},{translate:'0 '+amp+'px',offset:.09,easing:'cubic-bezier(.3,1.9,.45,1)'},{translate:'0 0px'}],{duration:950},function(){f.busy=false});
}
document.addEventListener('scroll',onScroll,{passive:true,capture:true});
})();
