/* V5.11.55: one trusted clock for the whole app.
   Online  -> the time is taken from the Firebase server (HTTP "Date" header), so a wrong clock on one phone cannot win over another phone.
   Offline -> the phone's own time is used.  The time is only kept in the background (never shown on bills / receipts). */
(function(){
  var off=0,ok=false,busy=false;
  window.skNow=function(){return Math.round(Date.now()+off)};
  window.skTimeOnline=function(){return ok};
  /* unique, time-ordered id: <time in ms>-<4 random characters> */
  window.skUid=function(){return window.skNow()+'-'+Math.random().toString(36).slice(2,6)};
  function sync(){
    if(busy||(typeof navigator!=='undefined'&&navigator.onLine===false))return;
    busy=true;var t0=Date.now();
    fetch('/manifest.webmanifest?_t='+t0,{method:'HEAD',cache:'no-store'}).then(function(r){
      var d=r.headers.get('date'),s=d?Date.parse(d):NaN,t1=Date.now();
      if(!isNaN(s)){off=(s+500)-(t0+t1)/2;ok=true}   /* the header is whole seconds: use the middle of that second */
    }).catch(function(){}).then(function(){busy=false});
  }
  sync();setInterval(sync,10*60*1000);
  window.addEventListener('online',sync);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)sync()});
})();
