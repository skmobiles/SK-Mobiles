/* SK MOBILES — PIN / worker-password security helper.
 * - Stores PINs and worker passwords as salted, iterated SHA-256 hashes (format: h1$salt$iters$hex).
 * - Still accepts legacy plain-text values so existing installs keep working, and upgrades them on first use.
 * - Adds a wrong-attempt lockout for the PIN / worker login buttons.
 * NOTE: real access control is Firebase Auth + Firestore rules. This PIN gate is a local second step.
 */
(function(){
  'use strict';
  var ITERS = 3000;

  /* ---------- synchronous SHA-256 (Uint8Array -> Uint8Array) ---------- */
  var K = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);

  function sha256(bytes){
    var l = bytes.length, bitLen = l * 8;
    var padLen = ((l + 9 + 63) >> 6) << 6;
    var m = new Uint8Array(padLen);
    m.set(bytes); m[l] = 0x80;
    var dv = new DataView(m.buffer);
    dv.setUint32(padLen - 8, Math.floor(bitLen / 4294967296));
    dv.setUint32(padLen - 4, bitLen >>> 0);
    var H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    var w = new Uint32Array(64);
    for (var off = 0; off < padLen; off += 64){
      for (var i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++){
        var a = w[i-15], b = w[i-2];
        var s0 = ((a>>>7)|(a<<25)) ^ ((a>>>18)|(a<<14)) ^ (a>>>3);
        var s1 = ((b>>>17)|(b<<15)) ^ ((b>>>19)|(b<<13)) ^ (b>>>10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
      }
      var A=H[0],B=H[1],C=H[2],D=H[3],E=H[4],F=H[5],G=H[6],Hh=H[7];
      for (i = 0; i < 64; i++){
        var S1 = ((E>>>6)|(E<<26)) ^ ((E>>>11)|(E<<21)) ^ ((E>>>25)|(E<<7));
        var ch = (E & F) ^ (~E & G);
        var t1 = (Hh + S1 + ch + K[i] + w[i]) | 0;
        var S0 = ((A>>>2)|(A<<30)) ^ ((A>>>13)|(A<<19)) ^ ((A>>>22)|(A<<10));
        var mj = (A & B) ^ (A & C) ^ (B & C);
        var t2 = (S0 + mj) | 0;
        Hh = G; G = F; F = E; E = (D + t1) | 0; D = C; C = B; B = A; A = (t1 + t2) | 0;
      }
      H[0]=(H[0]+A)|0; H[1]=(H[1]+B)|0; H[2]=(H[2]+C)|0; H[3]=(H[3]+D)|0;
      H[4]=(H[4]+E)|0; H[5]=(H[5]+F)|0; H[6]=(H[6]+G)|0; H[7]=(H[7]+Hh)|0;
    }
    var out = new Uint8Array(32), odv = new DataView(out.buffer);
    for (i = 0; i < 8; i++) odv.setUint32(i * 4, H[i]);
    return out;
  }

  function utf8(s){
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    var e = unescape(encodeURIComponent(s)), a = new Uint8Array(e.length);
    for (var i = 0; i < e.length; i++) a[i] = e.charCodeAt(i);
    return a;
  }
  function toHex(u8){ var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; }
  function randHex(n){
    var a = new Uint8Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
    return toHex(a);
  }
  function derive(secret, salt, iters){
    var sb = utf8(salt), h = sha256(utf8(salt + ':' + secret));
    for (var i = 0; i < iters; i++){
      var buf = new Uint8Array(h.length + sb.length); buf.set(h); buf.set(sb, h.length);
      h = sha256(buf);
    }
    return toHex(h);
  }
  function constEq(a, b){
    a = String(a); b = String(b);
    var d = a.length ^ b.length;
    for (var i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
    return d === 0;
  }

  function isHashed(v){ return typeof v === 'string' && v.indexOf('h1$') === 0; }
  function hash(secret){
    var salt = randHex(12);
    return 'h1$' + salt + '$' + ITERS + '$' + derive(String(secret), salt, ITERS);
  }
  function verify(stored, entered){
    entered = String(entered == null ? '' : entered);
    if (stored == null || stored === '') return false;
    if (!isHashed(stored)) return constEq(stored, entered);            // legacy plain-text value
    var p = String(stored).split('$');                                   // ['h1', salt, iters, hex]
    if (p.length !== 4) return false;
    return constEq(derive(entered, p[1], parseInt(p[2], 10) || ITERS), p[3]);
  }

  /* ---------- role PIN storage ---------- */
  var KEYS = { admin: 'sk_admin_pin_v1', worker: 'sk_worker_pin_v1' };
  var BOOTSTRAP_ADMIN_PIN = ['1','2','3','4'].join(''); // first-run only; the app forces a change right after login
  function get(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }

  function hasCustomPin(role){ return !!get(KEYS[role] || KEYS.worker); }
  function matchesRole(role, entered){
    var k = KEYS[role] || KEYS.worker, stored = get(k);
    if (!stored) return role === 'admin' && constEq(BOOTSTRAP_ADMIN_PIN, String(entered == null ? '' : entered));
    return verify(stored, entered);
  }
  function setRolePin(role, pin){ set(KEYS[role] || KEYS.worker, hash(pin)); }
  /* upgrade a legacy plain-text PIN to a hash after a successful login */
  function upgradeRolePin(role, entered){
    var k = KEYS[role] || KEYS.worker, stored = get(k);
    if (stored && !isHashed(stored) && verify(stored, entered)) set(k, hash(entered));
  }
  function usingBootstrapPin(role){ return role === 'admin' && !hasCustomPin('admin'); }

  /* ---------- wrong-attempt lockout (5 fails -> 60 s, doubling) ---------- */
  var LOCK_KEY = 'sk_login_lock_v1';
  function lockState(){ try { return JSON.parse(get(LOCK_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function lockedSeconds(){
    var s = lockState(), left = Math.ceil(((s.until || 0) - Date.now()) / 1000);
    return left > 0 ? left : 0;
  }
  function recordFail(){
    var s = lockState(); s.fails = (s.fails || 0) + 1;
    if (s.fails >= 5){
      var tier = Math.min(Math.floor(s.fails / 5), 5);
      s.until = Date.now() + 60000 * Math.pow(2, tier - 1);
    }
    set(LOCK_KEY, JSON.stringify(s));
    return lockedSeconds();
  }
  function recordSuccess(){ try { localStorage.removeItem(LOCK_KEY); } catch (e) {} }

  window.skPinSec = {
    hash: hash, verify: verify, isHashed: isHashed, sha256hex: function(s){ return toHex(sha256(utf8(String(s)))); },
    matchesRole: matchesRole, setRolePin: setRolePin, upgradeRolePin: upgradeRolePin,
    usingBootstrapPin: usingBootstrapPin, hasCustomPin: hasCustomPin,
    lockedSeconds: lockedSeconds, recordFail: recordFail, recordSuccess: recordSuccess,
    randomSecret: function(){ return randHex(8); }
  };
})();
