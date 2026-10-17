/* SK MOBILES v5.6.165 — stops list/page flicker. When the app re-draws a list with exactly the same HTML it drew last time
   (this happens after every cloud-sync refresh and many button taps), the browser used to throw away and rebuild every row,
   which showed as a blink and reset scroll/touch state. Now an identical re-draw is skipped. Safe: the skip only happens when
   the element still holds exactly what was drawn before (nothing else changed it). No data is read or written. */
(function(){
'use strict';
if(window.__skNoFlicker)return;window.__skNoFlicker=true;
var d=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
if(!d||!d.set||!d.get)return;
var seen=new WeakMap();
Object.defineProperty(Element.prototype,'innerHTML',{
  configurable:true,enumerable:d.enumerable,
  get:function(){return d.get.call(this)},
  set:function(v){
    var s=String(v);
    if(s.length>160){
      var r=seen.get(this);
      if(r&&r.a===s&&d.get.call(this)===r.s&&!this.querySelector('input,textarea,select'))return;
      d.set.call(this,s);
      seen.set(this,{a:s,s:d.get.call(this)});
      return;
    }
    d.set.call(this,v);
  }
});
})();
