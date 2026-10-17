/* SK MOBILES v5.7.0 — tiny offline QR code generator (byte mode, error correction M, versions 1-20).
   window.skQrMatrix(text) -> array of rows of 0/1;  window.skQrDataUrl(text, size) -> PNG data URL. */
(function(){
'use strict';
/* [totalCodewords, ecPerBlock, blocksGroup1, dataPerBlockGroup1, blocksGroup2, dataPerBlockGroup2] for level M */
var VER=[null,[26,10,1,16,0,0],[44,16,1,28,0,0],[70,26,1,44,0,0],[100,18,2,32,0,0],[134,24,2,43,0,0],[172,16,4,27,0,0],
 [196,18,4,31,0,0],[242,22,2,38,2,39],[292,22,3,36,2,37],[346,26,4,43,1,44],
 /* versions 11-20 (checked module-for-module against an independent encoder) */
 [404,30,1,50,4,51],[466,22,6,36,2,37],[532,22,8,37,1,38],[581,24,4,40,5,41],[655,24,5,41,5,42],[733,28,7,45,3,46],[815,28,10,46,1,47],[901,26,9,43,4,44],[991,26,3,44,11,45],[1085,26,3,41,13,42]];
var ALIGN=[null,[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50]];
(function(){for(var v=11;v<VER.length;v++){var last=4*v+10,cnt=Math.floor(v/7)+2,step=Math.ceil((last-6)/(cnt-1)/2)*2,a=[6];for(var i=cnt-2;i>=0;i--)a.push(last-step*i);ALIGN[v]=a}})();

/* GF(256) */
var EXP=new Array(512),LOG=new Array(256);
(function(){var x=1;for(var i=0;i<255;i++){EXP[i]=x;LOG[x]=i;x<<=1;if(x&256)x^=0x11D}for(var j=255;j<512;j++)EXP[j]=EXP[j-255]})();
function gmul(a,b){return a&&b?EXP[LOG[a]+LOG[b]]:0}
function rsGen(n){var g=[1];for(var i=0;i<n;i++){var ng=new Array(g.length+1).fill(0);for(var j=0;j<g.length;j++){ng[j]^=g[j];ng[j+1]^=gmul(g[j],EXP[i])}g=ng}return g}
function rsEc(data,n){
  var g=rsGen(n),res=new Array(n).fill(0);
  for(var i=0;i<data.length;i++){
    var f=data[i]^res[0];res.shift();res.push(0);
    if(f)for(var j=0;j<n;j++)res[j]^=gmul(g[j+1],f);
  }
  return res;
}
function utf8(str){return unescape(encodeURIComponent(str)).split('').map(function(c){return c.charCodeAt(0)})}

function pickVersion(len){
  for(var v=1;v<VER.length;v++){
    var info=VER[v],data=info[2]*info[3]+info[4]*info[5];
    var cap=Math.floor((data*8-4-(v<10?8:16))/8);
    if(len<=cap)return v;
  }
  return 0;
}
function buildCodewords(bytes,v){
  var info=VER[v],dataCw=info[2]*info[3]+info[4]*info[5],bits=[];
  function put(val,n){for(var i=n-1;i>=0;i--)bits.push((val>>i)&1)}
  put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(function(b){put(b,8)});
  var cap=dataCw*8;
  for(var t=0;t<4&&bits.length<cap;t++)bits.push(0);
  while(bits.length%8)bits.push(0);
  var cw=[];for(var i=0;i<bits.length;i+=8){var b=0;for(var k=0;k<8;k++)b=(b<<1)|bits[i+k];cw.push(b)}
  for(var pad=0xEC;cw.length<dataCw;pad^=0xEC^0x11)cw.push(pad);
  /* split into blocks */
  var blocks=[],pos=0,ecLen=info[1];
  for(var g=0;g<info[2];g++){blocks.push(cw.slice(pos,pos+info[3]));pos+=info[3]}
  for(var h=0;h<info[4];h++){blocks.push(cw.slice(pos,pos+info[5]));pos+=info[5]}
  var ecs=blocks.map(function(b){return rsEc(b,ecLen)});
  var out=[],maxD=Math.max(info[3],info[5]);
  for(var c=0;c<maxD;c++)blocks.forEach(function(b){if(c<b.length)out.push(b[c])});
  for(var e=0;e<ecLen;e++)ecs.forEach(function(b){out.push(b[e])});
  return out;
}
function bch(val,poly,bitsLen){
  var d=val<<bitsLen,pl=poly.toString(2).length;
  while(d.toString(2).length>=pl)d^=poly<<(d.toString(2).length-pl);
  return (val<<bitsLen)|d;
}
function formatBits(mask){return bch((0<<3)|mask,0x537,10)^0x5412}   /* ec level M = 00 */
function versionBits(v){return bch(v,0x1F25,12)}

function makeMatrix(v){
  var n=17+4*v,M=[],R=[];
  for(var i=0;i<n;i++){M.push(new Array(n).fill(0));R.push(new Array(n).fill(false))}
  function set(r,c,val){M[r][c]=val?1:0;R[r][c]=true}
  function finder(r0,c0){
    for(var r=-1;r<=7;r++)for(var c=-1;c<=7;c++){
      var rr=r0+r,cc=c0+c;if(rr<0||cc<0||rr>=n||cc>=n)continue;
      var on=(r>=0&&r<=6&&(c===0||c===6))||(c>=0&&c<=6&&(r===0||r===6))||(r>=2&&r<=4&&c>=2&&c<=4);
      set(rr,cc,on);
    }
  }
  finder(0,0);finder(0,n-7);finder(n-7,0);
  for(var t=8;t<n-8;t++){set(6,t,t%2===0);set(t,6,t%2===0)}
  var al=ALIGN[v];
  al.forEach(function(r){al.forEach(function(c){
    if((r===6&&c===6)||(r===6&&c===al[al.length-1])||(c===6&&r===al[al.length-1]))return;
    for(var dr=-2;dr<=2;dr++)for(var dc=-2;dc<=2;dc++)set(r+dr,c+dc,Math.max(Math.abs(dr),Math.abs(dc))!==1);
  })});
  set(n-8,8,1); /* dark module */
  /* reserve format areas */
  for(var k=0;k<9;k++){if(!R[8][k])set(8,k,0);if(!R[k][8])set(k,8,0)}
  for(var q=0;q<8;q++){if(!R[8][n-1-q])set(8,n-1-q,0);if(!R[n-1-q][8])set(n-1-q,8,0)}
  set(n-8,8,1);
  if(v>=7){
    var vb=versionBits(v);
    for(var a=0;a<18;a++){var bit=(vb>>a)&1,r=Math.floor(a/3),c=a%3+n-11;set(r,c,bit);set(c,r,bit)}
  }
  return {M:M,R:R,n:n};
}
function place(mx,cw){
  var n=mx.n,M=mx.M,R=mx.R,bits=[];
  cw.forEach(function(b){for(var i=7;i>=0;i--)bits.push((b>>i)&1)});
  var idx=0,up=true;
  for(var col=n-1;col>0;col-=2){
    if(col===6)col--;
    for(var i=0;i<n;i++){
      var r=up?n-1-i:i;
      for(var dc=0;dc<2;dc++){
        var c=col-dc;
        if(R[r][c])continue;
        M[r][c]=idx<bits.length?bits[idx]:0;idx++;
      }
    }
    up=!up;
  }
}
var MASKS=[function(r,c){return (r+c)%2===0},function(r){return r%2===0},function(r,c){return c%3===0},function(r,c){return (r+c)%3===0},
 function(r,c){return (Math.floor(r/2)+Math.floor(c/3))%2===0},function(r,c){return (r*c)%2+(r*c)%3===0},
 function(r,c){return ((r*c)%2+(r*c)%3)%2===0},function(r,c){return ((r+c)%2+(r*c)%3)%2===0}];
function applyMask(mx,m){
  var n=mx.n,out=mx.M.map(function(row){return row.slice()});
  for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(!mx.R[r][c]&&MASKS[m](r,c))out[r][c]^=1;
  /* format info */
  var fb=formatBits(m);
  function bit(i){return (fb>>i)&1}
  for(var i=0;i<=5;i++)out[i][8]=bit(i);
  out[7][8]=bit(6);out[8][8]=bit(7);out[8][7]=bit(8);
  for(var j=9;j<15;j++)out[8][14-j]=bit(j);
  for(var k=0;k<8;k++)out[8][n-1-k]=bit(k);
  for(var l=8;l<15;l++)out[n-15+l][8]=bit(l);
  out[n-8][8]=1;
  return out;
}
function penalty(m){
  var n=m.length,p=0,r,c,run,i;
  for(r=0;r<n;r++){run=1;for(c=1;c<n;c++){if(m[r][c]===m[r][c-1]){run++;if(c===n-1&&run>=5)p+=3+run-5}else{if(run>=5)p+=3+run-5;run=1}}}
  for(c=0;c<n;c++){run=1;for(r=1;r<n;r++){if(m[r][c]===m[r-1][c]){run++;if(r===n-1&&run>=5)p+=3+run-5}else{if(run>=5)p+=3+run-5;run=1}}}
  for(r=0;r<n-1;r++)for(c=0;c<n-1;c++){var s=m[r][c]+m[r][c+1]+m[r+1][c]+m[r+1][c+1];if(s===0||s===4)p+=3}
  var pat1=[1,0,1,1,1,0,1,0,0,0,0],pat2=[0,0,0,0,1,0,1,1,1,0,1];
  function chk(get){for(var a=0;a<n;a++)for(var b=0;b<=n-11;b++){var ok1=true,ok2=true;for(i=0;i<11;i++){var v=get(a,b+i);if(v!==pat1[i])ok1=false;if(v!==pat2[i])ok2=false}if(ok1)p+=40;if(ok2)p+=40}}
  chk(function(a,b){return m[a][b]});chk(function(a,b){return m[b][a]});
  var dark=0;for(r=0;r<n;r++)for(c=0;c<n;c++)dark+=m[r][c];
  p+=Math.floor(Math.abs(dark*100/(n*n)-50)/5)*10;
  return p;
}
window.skQrMatrix=function(text){
  var bytes=utf8(String(text)),v=pickVersion(bytes.length);
  if(!v)return null;
  var mx=makeMatrix(v);place(mx,buildCodewords(bytes,v));
  var best=null,bp=1e9;
  for(var m=0;m<8;m++){var cand=applyMask(mx,m),pe=penalty(cand);if(pe<bp){bp=pe;best=cand}}
  return best;
};
window.skQrDataUrl=function(text,size){
  var m=window.skQrMatrix(text);if(!m)return '';
  var n=m.length,quiet=4,total=n+quiet*2,scale=Math.max(2,Math.floor((size||240)/total));
  var cv=document.createElement('canvas');cv.width=cv.height=total*scale;
  var ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.fillStyle='#000';
  for(var r=0;r<n;r++)for(var c=0;c<n;c++)if(m[r][c])ctx.fillRect((c+quiet)*scale,(r+quiet)*scale,scale,scale);
  return cv.toDataURL('image/png');
};
})();
