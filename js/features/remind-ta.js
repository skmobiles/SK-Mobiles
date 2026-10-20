/* SK MOBILES V5.11.10 — Tamil version of the customer reminders (credit reminder and repair "not collected" reminders).
   The only file in the app that contains Tamil text. Before a reminder opens WhatsApp, a small popup lets the shop choose English or Tamil. */
(function(){
'use strict';
function rs(n){return '₹'+Math.round(Number(n)||0).toLocaleString('en-IN')}
function pad(n){return String(n).padStart(2,'0')}
var UPI_OK=/^[\w.\-]{2,}@[A-Za-z][\w.\-]{1,}$/;
function pay(upi,amount,shop,tn){
  upi=String(upi||'').trim();if(!UPI_OK.test(upi)||!(amount>0))return '';
  return '\n\n*'+rs(amount)+' இப்போது செலுத்த* (GPay / PhonePe / Paytm):\n'+location.origin+'/pay.html?pa='+encodeURIComponent(upi)+'&pn='+encodeURIComponent(shop)+'&am='+Math.round(amount)+'&tn='+encodeURIComponent(tn)+'&ts='+Date.now()+'\nUPI ID: '+upi+'\n(இந்த link 3 நாட்களுக்கு மட்டும் செல்லும்.)';
}
/* repair: j=job, d=days ready, lv=7|30|60, due=balance */
window.skTaRepair=function(j,d,lv,due,shop,upi){
  var n=j.customer||'வாடிக்கையாளர்',m=j.model||'மொபைல்',bal=due>0?' செலுத்த வேண்டிய தொகை '+rs(due)+'.':'',t;
  if(lv===7)t='அன்புள்ள '+n+', '+shop+'-இல் இருந்து வணக்கம். உங்கள் '+m+' பழுது நீக்கப்பட்டு, எடுத்துக்கொள்ள தயாராக உள்ளது.'+bal+' தங்களுக்கு வசதியான நேரத்தில் வந்து பெற்றுக்கொள்ளவும். உங்கள் ஆதரவுக்கு நன்றி 🙏';
  else if(lv===30)t='அன்புள்ள '+n+', '+shop+'-இல் இருந்து வணக்கம். உங்கள் பழுது நீக்கப்பட்ட '+m+' தயாராகி '+d+' நாட்கள் ஆகின்றன.'+bal+' எங்கள் விதிமுறைப்படி, பழுது நீக்கப்பட்ட சாதனத்தை தயாரான தேதியிலிருந்து 30 நாட்களுக்குள் பெற்றுக்கொள்ள வேண்டும். அதன் பிறகு சாதனம் வாடிக்கையாளரின் சொந்த பொறுப்பில் இருக்கும்; இழப்பு அல்லது சேதத்திற்கு கடை பொறுப்பாகாது. தயவுசெய்து விரைவில் பெற்றுக்கொள்ளவும். நன்றி 🙏';
  else t='அன்புள்ள '+n+', '+shop+'-இல் இருந்து முக்கிய அறிவிப்பு. உங்கள் பழுது நீக்கப்பட்ட '+m+' தயாராகி '+d+' நாட்கள் ஆகியும் பெற்றுக்கொள்ளப்படவில்லை.'+bal+' எங்கள் விதிமுறைப்படி, 60 நாட்களுக்குள் பெற்றுக்கொள்ளப்படாத சாதனங்களுக்கு கடை பொறுப்பாகாது; சட்டம் அனுமதிக்கும் அளவுக்கு, சாதனத்தை அகற்றவோ அல்லது நிலுவையில் உள்ள பழுது கட்டணத்தில் ஈடு செய்யவோ கடைக்கு உரிமை உண்டு. இந்த செய்தி கிடைத்த 7 நாட்களுக்குள் பெற்றுக்கொள்ளுமாறு தாழ்மையுடன் கேட்டுக்கொள்கிறோம். தங்கள் ஒத்துழைப்புக்கு நன்றி 🙏';
  return t+pay(upi,due,shop,'Repair '+(j.id||''));
};
/* credit: r={name,balance,due,overdue}, due/today as DD/MM/YYYY strings */
window.skTaCredit=function(r,shop,dueText,upi,todayText){
  var L='━━━━━━━━━━━━',box=[L];
  (r.items||[]).forEach(function(i){box.push('📱 மொபைல்: '+i.model);box.push('🧾 பில்: '+(i.id||'---')+(i.date?' • '+i.date:''));if(i.price>0)box.push('💵 மொத்தம்: '+rs(i.price));if(i.adv>0)box.push('✅ முன்பணம் செலுத்தியது: '+rs(i.adv))});
  box.push('⚠️ *நிலுவை: '+rs(r.balance)+'*');
  if(dueText)box.push('📅 *'+(r.overdue?'செலுத்த வேண்டிய தேதி (கடந்தது): ':'செலுத்த வேண்டிய தேதி: ')+dueText+'*');
  box.push(L);
  var t='அன்புள்ள '+(r.name||'வாடிக்கையாளர்')+', '+shop+'-இல் இருந்து வணக்கம் 🙏\n\nஉங்கள் கணக்கில் நிலுவை பற்றிய நினைவூட்டல்.\n\n'+box.join('\n')+'\n\nதங்களுக்கு வசதியான நேரத்தில் செலுத்தவும். ஏற்கனவே செலுத்தியிருந்தால் இந்த செய்தியை புறக்கணிக்கவும். உங்கள் ஆதரவுக்கு நன்றி 🙏';
  var p=pay(upi,Number(r.balance)||0,shop,'Credit balance');
  return t+(p?p.replace('(இந்த link 3 நாட்களுக்கு மட்டும் செல்லும்.)','('+(todayText||'')+' நிலவரப்படி. இந்த link 3 நாட்களுக்கு மட்டும் செல்லும்.)'):'');
};
/* language choice popup: cb('en'|'ta') */
window.skRemindLang=function(cb){
  var last='en';try{last=localStorage.getItem('sk_remind_lang')==='ta'?'ta':'en'}catch(e){}
  var old=document.getElementById('skRlDlg');if(old)old.remove();
  var d=document.createElement('div');d.id='skRlDlg';d.className='skrc-dlg';
  d.innerHTML='<div class="skrc-sheet"><div class="skrc-bar"><button type="button" class="skrc-x" aria-label="Close">←</button><b>Send reminder in</b></div><div class="skrc-body"><div class="skrc-hint">Choose the language of the WhatsApp message.</div></div>'+
    '<div class="skrc-act"><button type="button" data-l="en" class="pdf">English'+(last==='en'?' ✓':'')+'</button><button type="button" data-l="ta" class="wa">தமிழ்'+(last==='ta'?' ✓':'')+'</button></div></div>';
  document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d||e.target.closest('.skrc-x')){d.remove();return}
    var b=e.target.closest('[data-l]');if(!b)return;var l=b.dataset.l;
    try{localStorage.setItem('sk_remind_lang',l)}catch(x){}
    d.remove();cb(l);
  });
};
})();
