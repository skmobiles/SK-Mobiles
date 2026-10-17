/* SK MOBILES v5.6.166 — Stock aging: used mobiles that are still unsold after 30 / 60 / 90+ days, oldest first, with the money
   locked in them and a one-tap way to reduce the customer price. Only the customer price of the chosen mobile changes,
   and only when you tap Save. */
(function(){
'use strict';
var T=window.skTools,esc=T.esc,KEY='sk_used_mobile_stock_v1';
var minDays=30,editing='';
function rows(){
  return T.arr(KEY).filter(function(r){return r&&r.status!=='Sold'}).map(function(r){
    var age=T.daysAgo(r.date);return {r:r,age:age==null?0:age};
  });
}
function cls(a){return a>=90?'r':a>=60?'o':a>=30?'':'g'}
function suggest(x){var pct=x.age>=90?.10:x.age>=60?.07:.04,p=T.num(x.r.customerPrice);return Math.max(0,Math.round(p*(1-pct)/100)*100)}
function render(){
  var all=rows(),list=all.filter(function(x){return x.age>=minDays}).sort(function(a,b){return b.age-a.age});
  var locked=list.reduce(function(s,x){return s+T.num(x.r.cost)},0),oldest=list.length?list[0].age:0;
  var t=document.getElementById('skAgTiles');
  if(t)t.innerHTML='<div class="skbk-tile"><b>'+list.length+'</b><small>Unsold</small></div><div class="skbk-tile"><b>'+T.money(locked)+'</b><small>Money locked</small></div><div class="skbk-tile"><b>'+oldest+'d</b><small>Oldest</small></div>';
  var c=document.getElementById('skAgChips');
  if(c)c.innerHTML=[[0,'All'],[30,'30+ days'],[60,'60+ days'],[90,'90+ days']].map(function(a){return '<button type="button" class="skbk-chip sk-keepr'+(a[0]===minDays?' on':'')+'" onclick="skAgMin('+a[0]+')">'+a[1]+'</button>'}).join('');
  var h=document.getElementById('skAgList');if(!h)return;
  h.innerHTML=list.length?list.map(function(x){
    var r=x.r,id=esc(r.imei||r.id||''),open=String(editing)===String(r.imei||r.id||''),sg=suggest(x);
    return '<div class="skag-row"><div class="skag-top"><span><b>'+esc(r.model||'Used mobile')+'</b><small>'+esc([r.ram,r.storage,r.colour].filter(Boolean).join(' / '))+(r.imei?' • IMEI '+esc(r.imei):'')+'<br>Bought '+esc(T.dmy(r.date)||'—')+'</small></span><span class="skag-age '+cls(x.age)+'">'+x.age+' days</span></div>'+
      '<div class="skag-pr"><span>Cost <b>'+T.money(r.cost)+'</b></span><span>Price <b>'+T.money(r.customerPrice)+'</b></span></div>'+
      (open?'<div class="skag-edit"><input id="skAgPrice" type="number" inputmode="numeric" value="'+Math.round(T.num(r.customerPrice))+'">'+
        '<button type="button" onclick="skAgNudge(-200)">−200</button><button type="button" onclick="skAgNudge(-500)">−500</button><button type="button" onclick="skAgNudge(-1000)">−1000</button>'+
        '<button type="button" onclick="document.getElementById(\'skAgPrice\').value='+sg+'">Suggest '+T.money(sg)+'</button>'+
        '<button type="button" class="go sk-keepr" onclick="skAgSave(\''+id+'\')">Save</button></div>':
        '<button type="button" class="skag-reduce sk-keepr" onclick="skAgEdit(\''+id+'\')">Reduce price</button>')+'</div>';
  }).join(''):'<div class="skcm-empty">Nothing unsold for '+(minDays||0)+'+ days. 👍</div>';
}
window.skAgMin=function(n){minDays=n;editing='';render()};
window.skAgEdit=function(id){editing=id;render()};
window.skAgNudge=function(d){var i=document.getElementById('skAgPrice');if(i)i.value=Math.max(0,Math.round(T.num(i.value)+d))};
window.skAgSave=function(id){
  var i=document.getElementById('skAgPrice'),v=Math.round(T.num(i&&i.value));
  if(v<=0){T.toast('Enter a price');return}
  var a=T.arr(KEY),r=a.filter(function(x){return String(x.imei||x.id||'')===String(id)})[0];if(!r)return;
  if(v<T.num(r.cost)&&!confirm('This is below the purchase cost ('+T.money(r.cost)+'). Save anyway?'))return;
  r.customerPrice=v;r.updatedAt=new Date().toISOString();
  localStorage.setItem(KEY,JSON.stringify(a));editing='';render();
  try{if(typeof window.skUsedRender==='function')window.skUsedRender()}catch(e){}
  T.toast('✅ Price updated to '+T.money(v));
};
window.skOpenAging=function(){
  minDays=30;editing='';
  T.modal('skAgingModal','Stock aging',
    '<div class="skpop-note">'+T.ic('info','amber')+'<span>Used mobiles still unsold, oldest first. Reduce the price to move them faster.</span></div>'+
    '<div class="skbk-tiles" id="skAgTiles"></div>'+
    '<div class="skbk-chips" id="skAgChips" style="margin-top:12px"></div>'+
    '<div class="skpop-list" id="skAgList"></div>');
  render();T.open('skAgingModal');
};
function boot(){var n=0,t=setInterval(function(){if(T.drawer('skDrAging','Stock Aging','<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>','menu-icon-repair','skOpenAging()',['skDrBulk','skDrPriceList','skDrCreditRange','skDrMonth'])||++n>20)clearInterval(t)},500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
