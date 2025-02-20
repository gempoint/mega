var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// lib/crypto/index.mjs
var import_stream2 = require("stream");
var import_pumpify = __toESM(require("pumpify"), 1);

// lib/util.mjs
var import_stream = require("stream");
function streamToCb(stream, cb) {
  const chunks = [];
  let complete;
  stream.on("data", (d) => chunks.push(d));
  stream.on("end", () => {
    if (!complete) {
      complete = true;
      cb(null, Buffer.concat(chunks));
    }
  });
  stream.on("error", (e) => {
    if (!complete) {
      complete = true;
      cb(e);
    }
  });
}
function chunkSizeSafe(size) {
  let last;
  return new import_stream.Transform({
    transform(chunk, encoding, callback) {
      if (last)
        chunk = Buffer.concat([last, chunk]);
      const end = Math.floor(chunk.length / size) * size;
      if (!end) {
        last = last ? Buffer.concat([last, chunk]) : chunk;
      } else if (chunk.length > end) {
        last = chunk.slice(end);
        this.push(chunk.slice(0, end));
      } else {
        last = void 0;
        this.push(chunk);
      }
      callback();
    },
    flush(callback) {
      if (last)
        this.push(last);
      callback();
    }
  });
}
function detectSize(targetStream, cb) {
  const chunks = [];
  let size = 0;
  return new import_stream.Transform({
    transform(chunk, encoding, callback) {
      chunks.push(chunk);
      size += chunk.length;
      callback();
    },
    flush(callback) {
      cb(size);
      function handleChunk() {
        while (chunks.length) {
          const needDrain = !targetStream.write(chunks.shift());
          if (needDrain)
            return targetStream.once("drain", handleChunk);
        }
        targetStream.end();
        callback();
      }
      handleChunk();
    }
  });
}
function createPromise(originalCb) {
  let cb;
  const promise = new Promise((resolve, reject) => {
    cb = (err, arg) => {
      if (err)
        return reject(err);
      resolve(arg);
    };
  });
  if (originalCb) {
    promise.then((arg) => originalCb(null, arg), originalCb);
  }
  return [cb, promise];
}

// lib/crypto/index.mjs
var import_secure_random = __toESM(require("secure-random"), 1);

// lib/crypto/aes.mjs
var import_crypto = __toESM(require("crypto"), 1);
function prepareKey(password) {
  let i, j, r;
  let pkey = Buffer.from([147, 196, 103, 227, 125, 176, 199, 164, 209, 190, 63, 129, 1, 82, 203, 86]);
  for (r = 65536; r--; ) {
    for (j = 0; j < password.length; j += 16) {
      const key = Buffer.alloc(16);
      for (i = 0; i < 16; i += 4) {
        if (i + j < password.length) {
          password.copy(key, i, i + j, i + j + 4);
        }
      }
      pkey = import_crypto.default.createCipheriv("aes-128-ecb", key, Buffer.alloc(0)).setAutoPadding(false).update(pkey);
    }
  }
  return pkey;
}
function prepareKeyV2(password, info, cb) {
  const salt = Buffer.from(info.s, "base64");
  const iterations = 1e5;
  const digest = "sha512";
  import_crypto.default.pbkdf2(password, salt, iterations, 32, digest, cb);
}
var AES = class {
  constructor(key) {
    if (key.length !== 16)
      throw Error("Wrong key length. Key must be 128bit.");
    this.key = key;
  }
  encryptCBC(buffer) {
    const iv = Buffer.alloc(16, 0);
    const cipher = import_crypto.default.createCipheriv("aes-128-cbc", this.key, iv).setAutoPadding(false);
    const result = Buffer.concat([cipher.update(buffer), cipher.final()]);
    result.copy(buffer);
    return result;
  }
  decryptCBC(buffer) {
    const iv = Buffer.alloc(16, 0);
    const decipher = import_crypto.default.createDecipheriv("aes-128-cbc", this.key, iv).setAutoPadding(false);
    const result = Buffer.concat([decipher.update(buffer), decipher.final()]);
    result.copy(buffer);
    return result;
  }
  stringhash(buffer) {
    const h32 = [0, 0, 0, 0];
    for (let i = 0; i < buffer.length; i += 4) {
      if (buffer.length - i < 4) {
        const len = buffer.length - i;
        h32[i / 4 & 3] ^= buffer.readIntBE(i, len) << (4 - len) * 8;
      } else {
        h32[i / 4 & 3] ^= buffer.readInt32BE(i);
      }
    }
    let hash = Buffer.allocUnsafe(16);
    for (let i = 0; i < 4; i++) {
      hash.writeInt32BE(h32[i], i * 4, true);
    }
    const cipher = import_crypto.default.createCipheriv("aes-128-ecb", this.key, Buffer.alloc(0));
    for (let i = 16384; i--; )
      hash = cipher.update(hash);
    const result = Buffer.allocUnsafe(8);
    hash.copy(result, 0, 0, 4);
    hash.copy(result, 4, 8, 12);
    return result;
  }
  encryptECB(buffer) {
    const cipher = import_crypto.default.createCipheriv("aes-128-ecb", this.key, Buffer.alloc(0)).setAutoPadding(false);
    const result = cipher.update(buffer);
    result.copy(buffer);
    return result;
  }
  decryptECB(buffer) {
    const decipher = import_crypto.default.createDecipheriv("aes-128-ecb", this.key, Buffer.alloc(0)).setAutoPadding(false);
    const result = decipher.update(buffer);
    result.copy(buffer);
    return result;
  }
};
var CTR = class {
  constructor(aes, nonce, start = 0) {
    this.key = aes.key;
    this.nonce = nonce.slice(0, 8);
    const iv = Buffer.alloc(16);
    this.nonce.copy(iv, 0);
    if (start !== 0) {
      this.incrementCTRBuffer(iv, start / 16);
    }
    this.encrypt = (buffer) => {
      this.encryptCipher = import_crypto.default.createCipheriv("aes-128-ctr", this.key, iv);
      this.encrypt = this._encrypt;
      return this.encrypt(buffer);
    };
    this.decrypt = (buffer) => {
      this.decryptCipher = import_crypto.default.createDecipheriv("aes-128-ctr", this.key, iv);
      this.decrypt = this._decrypt;
      return this.decrypt(buffer);
    };
  }
  _encrypt(buffer) {
    this.encryptCipher.update(buffer).copy(buffer);
    return buffer;
  }
  _decrypt(buffer) {
    this.decryptCipher.update(buffer).copy(buffer);
    return buffer;
  }
  incrementCTRBuffer(buf, cnt) {
    const len = buf.length;
    let i = len - 1;
    let mod;
    while (cnt !== 0) {
      mod = (cnt + buf[i]) % 256;
      cnt = Math.floor((cnt + buf[i]) / 256);
      buf[i] = mod;
      i -= 1;
      if (i < 0) {
        i = len - 1;
      }
    }
  }
};
var MAC = class {
  constructor(aes, nonce) {
    this.key = aes.key;
    this.nonce = nonce.slice(0, 8);
    this.macCipher = import_crypto.default.createCipheriv("aes-128-ecb", this.key, Buffer.alloc(0));
    this.posNext = this.increment = 131072;
    this.pos = 0;
    this.macs = [];
    this.mac = Buffer.alloc(16);
    this.nonce.copy(this.mac, 0);
    this.nonce.copy(this.mac, 8);
  }
  condense() {
    if (this.mac) {
      this.macs.push(this.mac);
      this.mac = void 0;
    }
    let mac = Buffer.alloc(16, 0);
    for (const item of this.macs) {
      for (let j = 0; j < 16; j++)
        mac[j] ^= item[j];
      mac = this.macCipher.update(mac);
    }
    const macBuffer = Buffer.allocUnsafe(8);
    macBuffer.writeInt32BE(mac.readInt32BE(0) ^ mac.readInt32BE(4), 0);
    macBuffer.writeInt32BE(mac.readInt32BE(8) ^ mac.readInt32BE(12), 4);
    return macBuffer;
  }
  update(buffer) {
    for (let i = 0; i < buffer.length; i += 16) {
      for (let j = 0; j < 16; j++)
        this.mac[j] ^= buffer[i + j];
      this.mac = this.macCipher.update(this.mac);
      this.checkBounding();
    }
  }
  checkBounding() {
    this.pos += 16;
    if (this.pos >= this.posNext) {
      this.macs.push(Buffer.from(this.mac));
      this.nonce.copy(this.mac, 0);
      this.nonce.copy(this.mac, 8);
      if (this.increment < 1048576) {
        this.increment += 131072;
      }
      this.posNext += this.increment;
    }
  }
};

// lib/crypto/index.mjs
function formatKey(key) {
  return typeof key === "string" ? d64(key) : key;
}
function e64(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
function d64(s) {
  return Buffer.from(s, "base64");
}
function getCipher(key) {
  return new AES(unmergeKeyMac(key).slice(0, 16));
}
function megaEncrypt(key, options = {}) {
  const start = options.start || 0;
  if (start !== 0) {
    throw Error("Encryption cannot start midstream otherwise MAC verification will fail.");
  }
  key = formatKey(key);
  if (!key) {
    key = (0, import_secure_random.default)(24);
  }
  if (!(key instanceof Buffer)) {
    key = Buffer.from(key);
  }
  let stream = new import_stream2.Transform({
    transform(chunk, encoding, callback) {
      mac.update(chunk);
      const data = ctr.encrypt(chunk);
      callback(null, Buffer.from(data));
    },
    flush(callback) {
      stream.mac = mac.condense();
      stream.key = mergeKeyMac(key, stream.mac);
      callback();
    }
  });
  if (key.length !== 24)
    throw Error("Wrong key length. Key must be 192bit.");
  const aes = new AES(key.slice(0, 16));
  const ctr = new CTR(aes, key.slice(16), start);
  const mac = new MAC(aes, key.slice(16));
  stream = (0, import_pumpify.default)(chunkSizeSafe(16), stream);
  return stream;
}
function megaDecrypt(key, options = {}) {
  const start = options.start || 0;
  if (start !== 0)
    options.disableVerification = true;
  if (start % 16 !== 0)
    throw Error("start argument of megaDecrypt must be a multiple of 16");
  key = formatKey(key);
  if (!(key instanceof Buffer)) {
    key = Buffer.from(key);
  }
  const aes = getCipher(key);
  const ctr = new CTR(aes, key.slice(16), start);
  const mac = !options.disableVerification && new MAC(aes, key.slice(16));
  let stream = new import_stream2.Transform({
    transform(chunk, encoding, callback) {
      const data = ctr.decrypt(chunk);
      if (mac)
        mac.update(data);
      callback(null, Buffer.from(data));
    },
    flush(callback) {
      if (mac)
        stream.mac = mac.condense();
      if (!options.disableVerification && !stream.mac.equals(key.slice(24))) {
        callback(Error("MAC verification failed"));
        return;
      }
      callback();
    }
  });
  stream = (0, import_pumpify.default)(chunkSizeSafe(16), stream);
  return stream;
}
function megaVerify(key) {
  key = formatKey(key);
  if (!(key instanceof Buffer)) {
    key = Buffer.from(key);
  }
  let stream = new import_stream2.Transform({
    transform(chunk, encoding, callback) {
      mac.update(chunk);
      callback(null, chunk);
    },
    flush(callback) {
      stream.mac = mac.condense();
      if (!stream.mac.equals(key.slice(24))) {
        callback(Error("MAC verification failed"));
        return;
      }
      callback();
    }
  });
  if (key.length !== 32)
    throw Error("Wrong key length. Key must be 256bit.");
  const aes = getCipher(key);
  const mac = new MAC(aes, key.slice(16));
  stream = (0, import_pumpify.default)(chunkSizeSafe(16), stream);
  return stream;
}
function unmergeKeyMac(key) {
  const newKey = Buffer.alloc(32);
  key.copy(newKey);
  for (let i = 0; i < 16; i++) {
    newKey.writeUInt8(newKey.readUInt8(i) ^ newKey.readUInt8(16 + i, true), i);
  }
  return newKey;
}
function mergeKeyMac(key, mac) {
  const newKey = Buffer.alloc(32);
  key.copy(newKey);
  mac.copy(newKey, 24);
  for (let i = 0; i < 16; i++) {
    newKey.writeUInt8(newKey.readUInt8(i) ^ newKey.readUInt8(16 + i), i);
  }
  return newKey;
}
function constantTimeCompare(bufferA, bufferB) {
  if (bufferA.length !== bufferB.length)
    return false;
  const len = bufferA.length;
  let result = 0;
  for (let i = 0; i < len; i++) {
    result |= bufferA[i] ^ bufferB[i];
  }
  return result === 0;
}

// lib/crypto/rsa.mjs
var globalState = {};
var bs = 28;
var bx2 = 1 << bs;
var bm = bx2 - 1;
var bd = bs >> 1;
var bdm = (1 << bd) - 1;
var log2 = Math.log(2);
function zeros(n) {
  const r = [];
  while (n-- > 0)
    r[n] = 0;
  return r;
}
function zclip(r) {
  let n = r.length;
  if (r[n - 1])
    return r;
  while (n > 1 && r[n - 1] === 0)
    n--;
  return r.slice(0, n);
}
function nbits(x) {
  let n = 1;
  let t;
  if ((t = x >>> 16) !== 0) {
    x = t;
    n += 16;
  }
  if ((t = x >> 8) !== 0) {
    x = t;
    n += 8;
  }
  if ((t = x >> 4) !== 0) {
    x = t;
    n += 4;
  }
  if ((t = x >> 2) !== 0) {
    x = t;
    n += 2;
  }
  if ((t = x >> 1) !== 0) {
    x = t;
    n += 1;
  }
  return n;
}
function badd(a, b) {
  const al = a.length;
  const bl = b.length;
  if (al < bl)
    return badd(b, a);
  const r = [];
  let c = 0;
  let n = 0;
  for (; n < bl; n++) {
    c += a[n] + b[n];
    r[n] = c & bm;
    c >>>= bs;
  }
  for (; n < al; n++) {
    c += a[n];
    r[n] = c & bm;
    c >>>= bs;
  }
  if (c)
    r[n] = c;
  return r;
}
function bsub(a, b) {
  const al = a.length;
  const bl = b.length;
  if (bl > al)
    return [];
  if (bl === al) {
    if (b[bl - 1] > a[bl - 1])
      return [];
    if (bl === 1)
      return [a[0] - b[0]];
  }
  const r = [];
  let c = 0;
  let n;
  for (n = 0; n < bl; n++) {
    c += a[n] - b[n];
    r[n] = c & bm;
    c >>= bs;
  }
  for (; n < al; n++) {
    c += a[n];
    r[n] = c & bm;
    c >>= bs;
  }
  if (c)
    return [];
  return zclip(r);
}
function ip(w, n, x, y, c) {
  const xl = x & bdm;
  const xh = x >> bd;
  const yl = y & bdm;
  const yh = y >> bd;
  const m = xh * yl + yh * xl;
  const l = xl * yl + ((m & bdm) << bd) + w[n] + c;
  w[n] = l & bm;
  c = xh * yh + (m >> bd) + (l >> bs);
  return c;
}
function bsqr(x) {
  const t = x.length;
  const n = 2 * t;
  const r = zeros(n);
  let c = 0;
  let i, j;
  for (i = 0; i < t; i++) {
    c = ip(r, 2 * i, x[i], x[i], 0);
    for (j = i + 1; j < t; j++) {
      c = ip(r, i + j, 2 * x[j], x[i], c);
    }
    r[i + t] = c;
  }
  return zclip(r);
}
function bmul(x, y) {
  const n = x.length;
  const t = y.length;
  const r = zeros(n + t - 1);
  let c, i, j;
  for (i = 0; i < t; i++) {
    c = 0;
    for (j = 0; j < n; j++) {
      c = ip(r, i + j, x[j], y[i], c);
    }
    r[i + n] = c;
  }
  return zclip(r);
}
function toppart(x, start, len) {
  let n = 0;
  while (start >= 0 && len-- > 0)
    n = n * bx2 + x[start--];
  return n;
}
function bdiv(a, b) {
  let n = a.length - 1;
  const t = b.length - 1;
  let nmt = n - t;
  let x, qq, xx;
  let i;
  if (n < t || n === t && (a[n] < b[n] || n > 0 && a[n] === b[n] && a[n - 1] < b[n - 1])) {
    globalState.q = [0];
    globalState.mod = a;
    return globalState;
  }
  if (n === t && toppart(a, t, 2) / toppart(b, t, 2) < 4) {
    x = a.concat();
    qq = 0;
    for (; ; ) {
      xx = bsub(x, b);
      if (xx.length === 0)
        break;
      x = xx;
      qq++;
    }
    globalState.q = [qq];
    globalState.mod = x;
    return globalState;
  }
  const shift2 = Math.floor(Math.log(b[t]) / log2) + 1;
  const shift = bs - shift2;
  x = a.concat();
  const y = b.concat();
  if (shift) {
    for (i = t; i > 0; i--)
      y[i] = y[i] << shift & bm | y[i - 1] >> shift2;
    y[0] = y[0] << shift & bm;
    if (x[n] & (bm << shift2 & bm)) {
      x[++n] = 0;
      nmt++;
    }
    for (i = n; i > 0; i--)
      x[i] = x[i] << shift & bm | x[i - 1] >> shift2;
    x[0] = x[0] << shift & bm;
  }
  let x2;
  const q = zeros(nmt + 1);
  let y2 = zeros(nmt).concat(y);
  for (; ; ) {
    x2 = bsub(x, y2);
    if (x2.length === 0)
      break;
    q[nmt]++;
    x = x2;
  }
  const yt = y[t];
  const top = toppart(y, t, 2);
  let m;
  for (i = n; i > t; i--) {
    m = i - t - 1;
    if (i >= x.length) {
      q[m] = 1;
    } else if (x[i] === yt) {
      q[m] = bm;
    } else {
      q[m] = Math.floor(toppart(x, i, 2) / yt);
    }
    const topx = toppart(x, i, 3);
    while (q[m] * top > topx)
      q[m]--;
    y2 = y2.slice(1);
    x2 = bsub(x, bmul([q[m]], y2));
    if (x2.length === 0) {
      q[m]--;
      x2 = bsub(x, bmul([q[m]], y2));
    }
    x = x2;
  }
  if (shift) {
    for (i = 0; i < x.length - 1; i++)
      x[i] = x[i] >> shift | x[i + 1] << shift2 & bm;
    x[x.length - 1] >>= shift;
  }
  globalState.q = zclip(q);
  globalState.mod = zclip(x);
  return globalState;
}
function simplemod(i, m) {
  let c = 0;
  let v;
  for (let n = i.length - 1; n >= 0; n--) {
    v = i[n];
    c = ((v >> bd) + (c << bd)) % m;
    c = ((v & bdm) + (c << bd)) % m;
  }
  return c;
}
function bmod(p, m) {
  if (m.length === 1) {
    if (p.length === 1)
      return [p[0] % m[0]];
    if (m[0] < bdm)
      return [simplemod(p, m[0])];
  }
  const r = bdiv(p, m);
  return r.mod;
}
function bmod2(x, m, mu) {
  const xl = x.length - (m.length << 1);
  if (xl > 0)
    return bmod2(x.slice(0, xl).concat(bmod2(x.slice(xl), m, mu)), m, mu);
  const ml1 = m.length + 1;
  const ml2 = m.length - 1;
  let rr;
  const q3 = bmul(x.slice(ml2), mu).slice(ml1);
  const r1 = x.slice(0, ml1);
  const r2 = bmul(q3, m).slice(0, ml1);
  let r = bsub(r1, r2);
  if (r.length === 0) {
    r1[ml1] = 1;
    r = bsub(r1, r2);
  }
  for (let n = 0; ; n++) {
    rr = bsub(r, m);
    if (rr.length === 0)
      break;
    r = rr;
    if (n >= 3)
      return bmod2(r, m, mu);
  }
  return r;
}
function bmodexp(g, e, m) {
  let a = g.concat();
  let l = e.length - 1;
  let n = m.length * 2;
  let mu = zeros(n + 1);
  mu[n] = 1;
  mu = bdiv(mu, m).q;
  n = nbits(e[l]) - 2;
  for (; l >= 0; l--) {
    for (; n >= 0; n -= 1) {
      a = bmod2(bsqr(a), m, mu);
      if (e[l] & 1 << n)
        a = bmod2(bmul(a, g), m, mu);
    }
    n = bs - 1;
  }
  return a;
}
function RSAdecrypt(m, d, p, q, u) {
  const xp = bmodexp(bmod(m, p), bmod(d, bsub(p, [1])), p);
  const xq = bmodexp(bmod(m, q), bmod(d, bsub(q, [1])), q);
  let t = bsub(xq, xp);
  if (t.length === 0) {
    t = bsub(xp, xq);
    t = bmod(bmul(t, u), q);
    t = bsub(q, t);
  } else {
    t = bmod(bmul(t, u), q);
  }
  return badd(bmul(t, p), xp);
}
function mpi2b(s) {
  let bn = 1;
  const r = [0];
  let rn = 0;
  let sb = 256;
  let sn = s.length;
  let c;
  if (sn < 2)
    return 0;
  const len = (sn - 2) * 8;
  const bits = s.charCodeAt(0) * 256 + s.charCodeAt(1);
  if (bits > len || bits < len - 8)
    return 0;
  for (let n = 0; n < len; n++) {
    if ((sb <<= 1) > 255) {
      sb = 1;
      c = s.charCodeAt(--sn);
    }
    if (bn > bm) {
      bn = 1;
      r[++rn] = 0;
    }
    if (c & sb)
      r[rn] |= bn;
    bn <<= 1;
  }
  return r;
}
function b2s(b) {
  let bn = 1;
  let bc = 0;
  const r = [0];
  let rb = 1;
  let rn = 0;
  const bits = b.length * bs;
  let rr = "";
  let n;
  for (n = 0; n < bits; n++) {
    if (b[bc] & bn)
      r[rn] |= rb;
    if ((rb <<= 1) > 255) {
      rb = 1;
      r[++rn] = 0;
    }
    if ((bn <<= 1) > bm) {
      bn = 1;
      bc++;
    }
  }
  while (rn >= 0 && r[rn] === 0)
    rn--;
  for (n = 0; n <= rn; n++)
    rr = String.fromCharCode(r[n]) + rr;
  return rr;
}
function cryptoDecodePrivKey(privk) {
  const pubkey = [];
  for (let i = 0; i < 4; i++) {
    const l = (privk[0] * 256 + privk[1] + 7 >> 3) + 2;
    pubkey[i] = mpi2b(privk.toString("binary").substr(0, l));
    if (typeof pubkey[i] === "number") {
      if (i !== 4 || privk.length >= 16)
        return false;
      break;
    }
    privk = privk.slice(l);
  }
  return pubkey;
}
function cryptoRsaDecrypt(ciphertext, privkey) {
  const integerCiphertext = mpi2b(ciphertext.toString("binary"));
  const plaintext = b2s(RSAdecrypt(integerCiphertext, privkey[2], privkey[0], privkey[1], privkey[3]));
  return Buffer.from(plaintext, "binary");
}

// lib/api.mjs
var import_events = require("events");
var import_http = require("http");
var import_https = require("https");
var import_node_fetch = __toESM(require("node-fetch"), 1);

// lib/abort-controller-polyfill.mjs
var import_abort_controller = __toESM(require("abort-controller"), 1);
var abortController = globalThis.AbortController || import_abort_controller.default;
var abort_controller_polyfill_default = abortController;

// lib/api.mjs
var MAX_RETRIES = 4;
var ERRORS = {
  1: "EINTERNAL (-1): An internal error has occurred. Please submit a bug report, detailing the exact circumstances in which this error occurred.",
  2: "EARGS (-2): You have passed invalid arguments to this command.",
  3: "EAGAIN (-3): A temporary congestion or server malfunction prevented your request from being processed. No data was altered. Retried " + MAX_RETRIES + " times.",
  4: "ERATELIMIT (-4): You have exceeded your command weight per time quota. Please wait a few seconds, then try again (this should never happen in sane real-life applications).",
  5: "EFAILED (-5): The upload failed. Please restart it from scratch.",
  6: "ETOOMANY (-6): Too many concurrent IP addresses are accessing this upload target URL.",
  7: "ERANGE (-7): The upload file packet is out of range or not starting and ending on a chunk boundary.",
  8: "EEXPIRED (-8): The upload target URL you are trying to access has expired. Please request a fresh one.",
  9: "ENOENT (-9): Object (typically, node or user) not found. Wrong password?",
  10: "ECIRCULAR (-10): Circular linkage attempted",
  11: "EACCESS (-11): Access violation (e.g., trying to write to a read-only share)",
  12: "EEXIST (-12): Trying to create an object that already exists",
  13: "EINCOMPLETE (-13): Trying to access an incomplete resource",
  14: "EKEY (-14): A decryption operation failed (never returned by the API)",
  15: "ESID (-15): Invalid or expired user session, please relogin",
  16: "EBLOCKED (-16): User blocked",
  17: "EOVERQUOTA (-17): Request over quota",
  18: "ETEMPUNAVAIL (-18): Resource temporarily not available, please try again later"
};
var DEFAULT_GATEWAY = "https://g.api.mega.co.nz/";
var DEFAULT_HTTP_AGENT = false ? null : new import_http.Agent({ keepAlive: true });
var DEFAULT_HTTPS_AGENT = false ? null : new import_https.Agent({ keepAlive: true });
var API = class extends import_events.EventEmitter {
  constructor(keepalive, opt = {}) {
    super();
    this.keepalive = keepalive;
    this.counterId = Math.random().toString().substr(2, 10);
    this.gateway = opt.gateway || DEFAULT_GATEWAY;
    const packageVersion = "1.0.6";
    this.userAgent = opt.userAgent === null ? null : `${opt.userAgent || ""} megajs/${packageVersion}`.trim();
    this.httpAgent = opt.httpAgent || DEFAULT_HTTP_AGENT;
    this.httpsAgent = opt.httpsAgent || DEFAULT_HTTPS_AGENT;
    this.fetch = opt.fetch || this.defaultFetch.bind(this);
    this.closed = false;
  }
  defaultFetch(url, opts) {
    if (!opts)
      opts = {};
    if (!opts.agent) {
      opts.agent = (url2) => url2.protocol === "http:" ? this.httpAgent : this.httpsAgent;
    }
    if (this.userAgent) {
      if (!opts.headers)
        opts.headers = {};
      if (!opts.headers["user-agent"])
        opts.headers["user-agent"] = this.userAgent;
    }
    return (0, import_node_fetch.default)(url, opts);
  }
  request(json, originalCb, retryno = 0) {
    const isLogout = json.a === "sml";
    if (this.closed && !isLogout)
      throw Error("API is closed");
    const [cb, promise] = createPromise(originalCb);
    const qs = { id: (this.counterId++).toString() };
    if (this.sid) {
      qs.sid = this.sid;
    }
    if (typeof json._querystring === "object") {
      Object.assign(qs, json._querystring);
      delete json._querystring;
    }
    this.fetch(`${this.gateway}cs?${new URLSearchParams(qs)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([json])
    }).then((response) => response.json()).then((resp) => {
      if (this.closed && !isLogout)
        return;
      if (!resp)
        return cb(Error("Empty response"));
      if (resp.length)
        resp = resp[0];
      let err;
      if (typeof resp === "number" && resp < 0) {
        if (resp === -3) {
          if (retryno < MAX_RETRIES) {
            return setTimeout(() => {
              this.request(json, cb, retryno + 1);
            }, Math.pow(2, retryno + 1) * 1e3);
          }
        }
        err = Error(ERRORS[-resp]);
      } else {
        if (this.keepalive && resp && resp.sn) {
          this.pull(resp.sn);
        }
      }
      cb(err, resp);
    }).catch((err) => {
      cb(err);
    });
    return promise;
  }
  pull(sn, retryno = 0) {
    const controller = new abort_controller_polyfill_default();
    this.sn = controller;
    this.fetch(`${this.gateway}sc?${new URLSearchParams({ sn, sid: this.sid })}`, {
      method: "POST",
      signal: controller.signal
    }).then((response) => response.json()).then((resp) => {
      this.sn = void 0;
      if (this.closed)
        return;
      if (typeof resp === "number" && resp < 0) {
        if (resp === -3) {
          if (retryno < MAX_RETRIES) {
            return setTimeout(() => {
              this.pull(sn, retryno + 1);
            }, Math.pow(2, retryno + 1) * 1e3);
          }
        }
        throw Error(ERRORS[-resp]);
      }
      if (resp.w) {
        this.wait(resp.w, sn);
      } else if (resp.sn) {
        if (resp.a) {
          this.emit("sc", resp.a);
        }
        this.pull(resp.sn);
      }
    }).catch(ignoreAbortError);
  }
  wait(url, sn) {
    const controller = new abort_controller_polyfill_default();
    this.sn = controller;
    this.fetch(url, {
      method: "POST",
      signal: controller.signal
    }).then(() => {
      this.sn = void 0;
      this.pull(sn);
    }).catch(ignoreAbortError);
  }
  close() {
    if (this.sn)
      this.sn.abort();
    this.closed = true;
  }
  static getGlobalApi() {
    if (!API.globalApi) {
      API.globalApi = new API();
    }
    return API.globalApi;
  }
};
function ignoreAbortError(error) {
  if (error.name !== "AbortError")
    throw error;
}
var api_default = API;

// lib/storage.mjs
var import_events3 = require("events");

// lib/file.mjs
var import_events2 = require("events");
var import_stream3 = require("stream");
var import_stream_skip = __toESM(require("stream-skip"), 1);
var File = class extends import_events2.EventEmitter {
  constructor(opt) {
    super();
    this.checkConstructorArgument(opt.downloadId);
    this.checkConstructorArgument(opt.key);
    this.checkConstructorArgument(opt.loadedFile);
    this.downloadId = opt.downloadId;
    this.key = opt.key ? formatKey(opt.key) : null;
    this.type = opt.directory ? 1 : 0;
    this.directory = !!opt.directory;
    this.api = opt.api || api_default.getGlobalApi();
    if (!(this.api instanceof api_default)) {
      throw Error("api must be a instance of API");
    }
    this.loadedFile = opt.loadedFile;
  }
  get createdAt() {
    if (typeof this.timestamp !== "undefined") {
      return this.timestamp * 1e3;
    }
  }
  checkConstructorArgument(value) {
    if (typeof value === "string" && !/^[\w-]+$/.test(value)) {
      throw Error(`Invalid argument: "${value}"`);
    }
  }
  loadMetadata(aes, opt) {
    this.size = opt.s || 0;
    this.timestamp = opt.ts || 0;
    this.type = opt.t;
    this.directory = !!opt.t;
    this.owner = opt.u;
    this.name = null;
    if (!aes || !opt.k)
      return;
    const parts = opt.k.split(":");
    this.key = formatKey(parts[parts.length - 1]);
    aes.decryptECB(this.key);
    if (opt.a) {
      this.decryptAttributes(opt.a);
    }
  }
  decryptAttributes(at) {
    if (!this.key)
      return this;
    at = d64(at);
    getCipher(this.key).decryptCBC(at);
    const unpackedAttribtes = File.unpackAttributes(at);
    if (unpackedAttribtes) {
      this.parseAttributes(unpackedAttribtes);
    }
  }
  parseAttributes(at) {
    this.attributes = at;
    this.name = at.n;
    this.label = LABEL_NAMES[at.lbl || 0];
    this.favorited = !!at.fav;
  }
  loadAttributes(originalCb) {
    const [cb, promise] = createPromise(originalCb);
    const req = this.directory ? {
      a: "f",
      c: 1,
      ca: 1,
      r: 1,
      _querystring: {
        n: this.downloadId
      }
    } : {
      a: "g",
      p: this.downloadId
    };
    this.api.request(req, (err, response) => {
      if (err)
        return cb(err);
      if (this.directory) {
        const filesMap = /* @__PURE__ */ Object.create(null);
        const nodes = response.f;
        const folder = nodes.find(
          (node) => node.k && node.h === node.k.split(":")[0]
        );
        const aes = this.key ? new AES(this.key) : null;
        this.nodeId = folder.h;
        this.timestamp = folder.ts;
        filesMap[folder.h] = this;
        for (const file of nodes) {
          if (file === folder)
            continue;
          const fileObj = new File(file, this.storage);
          fileObj.loadMetadata(aes, file);
          fileObj.downloadId = [this.downloadId, file.h];
          filesMap[file.h] = fileObj;
        }
        for (const file of nodes) {
          const parent = filesMap[file.p];
          if (parent) {
            const fileObj = filesMap[file.h];
            if (!parent.children)
              parent.children = [];
            parent.children.push(fileObj);
            fileObj.parent = parent;
          }
        }
        this.loadMetadata(aes, folder);
        if (this.key && !this.attributes) {
          return cb(Error("Attributes could not be decrypted with provided key."));
        }
        if (this.loadedFile) {
          const loadedNode = filesMap[this.loadedFile];
          if (typeof loadedNode === "undefined") {
            cb(Error("Node (file or folder) not found in folder"));
          } else {
            cb(null, loadedNode);
          }
        } else {
          cb(null, this);
        }
      } else {
        this.size = response.s;
        this.decryptAttributes(response.at);
        if (this.key && !this.attributes) {
          return cb(Error("Attributes could not be decrypted with provided key."));
        }
        cb(null, this);
      }
    });
    return promise;
  }
  download(options, cb) {
    if (typeof options === "function") {
      cb = options;
      options = {};
    }
    if (!options)
      options = {};
    const start = options.start || 0;
    const apiStart = options.returnCiphertext ? start : start - start % 16;
    let end = options.end || null;
    const maxConnections = options.maxConnections || 4;
    const initialChunkSize = options.initialChunkSize || 128 * 1024;
    const chunkSizeIncrement = options.chunkSizeIncrement || 128 * 1024;
    const maxChunkSize = options.maxChunkSize || 1024 * 1024;
    const ssl = options.forceHttps ?? false ? 2 : 0;
    const req = {
      a: "g",
      g: 1,
      ssl
    };
    if (this.nodeId) {
      req.n = this.nodeId;
    } else if (Array.isArray(this.downloadId)) {
      req._querystring = {
        n: this.downloadId[0]
      };
      req.n = this.downloadId[1];
    } else {
      req.p = this.downloadId;
    }
    if (this.directory)
      throw Error("Can't download: folder download isn't supported");
    if (!this.key && !options.returnCiphertext)
      throw Error("Can't download: key isn't defined");
    const decryptStream = this.key && !options.returnCiphertext ? megaDecrypt(this.key, {
      start: apiStart,
      disableVerification: apiStart !== 0 || end !== null
    }) : new import_stream3.PassThrough();
    const stream = apiStart === start ? decryptStream : decryptStream.pipe(new import_stream_skip.default({
      skip: start - apiStart
    }));
    const handleRetries = options.handleRetries || File.defaultHandleRetries;
    this.api.request(req, (err, response) => {
      if (err)
        return stream.emit("error", err);
      if (typeof response.g !== "string" || response.g.substr(0, 4) !== "http") {
        return stream.emit("error", Error("MEGA servers returned an invalid response, maybe caused by rate limit"));
      }
      if (response.s === 0)
        return stream.end();
      if (!end)
        end = response.s - 1;
      if (start > end)
        return stream.emit("error", Error("You can't download past the end of the file."));
      function handleMegaErrors(resp) {
        if (resp.status === 200)
          return;
        if (resp.status === 509) {
          const timeLimit = resp.headers.get("x-mega-time-left");
          const error = Error("Bandwidth limit reached: " + timeLimit + " seconds until it resets");
          error.timeLimit = timeLimit;
          stream.emit("error", error);
          return;
        }
        stream.emit("error", Error("MEGA returned a " + resp.status + " status code"));
      }
      function handleError(err2) {
        stream.emit("error", err2);
      }
      let i = 0;
      stream.on("data", (d) => {
        i += d.length;
        stream.emit("progress", {
          bytesLoaded: i,
          bytesTotal: response.s
        });
      });
      if (maxConnections === 1) {
        const controller = new abort_controller_polyfill_default();
        stream.on("close", () => {
          controller.abort();
        });
        this.api.fetch(response.g + "/" + apiStart + "-" + end, {
          signal: controller.signal
        }).then((response2) => {
          handleMegaErrors(response2);
          const body = response2.body;
          if (!body) {
            throw Error("Missing response body");
          } else if (body.pipe) {
            response2.body.pipe(decryptStream);
          } else if (body.getReader) {
            const reader = body.getReader();
            const read = ({ done, value }) => {
              if (done) {
                decryptStream.end();
              } else {
                decryptStream.write(value);
                return reader.read().then(read);
              }
            };
            reader.read().then(read);
          } else {
            throw Error("Single connection streaming not supported by fetch");
          }
        }).catch(handleError);
        return;
      }
      const chunkBuffer = {};
      let lastStartedChunk = 0;
      let nextChunk = 0;
      let stopped = false;
      let currentOffset = apiStart;
      let chunkSize = initialChunkSize;
      stream.on("error", () => {
        stopped = true;
      });
      stream.on("close", () => {
        stopped = true;
      });
      const getChunk = () => {
        if (currentOffset > end) {
          stopped = true;
          if (lastStartedChunk === nextChunk) {
            decryptStream.end();
          }
          return;
        }
        const chunkOffset = currentOffset;
        const chunkMax = Math.min(end, chunkOffset + chunkSize - 1);
        const chunkNumber = lastStartedChunk++;
        let tries = 0;
        const tryFetchChunk = () => {
          tries++;
          this.api.fetch(response.g + "/" + chunkOffset + "-" + chunkMax).then((response2) => {
            handleMegaErrors(response2);
            return response2.arrayBuffer();
          }).then((data) => {
            const dataBuffer = Buffer.from(data);
            chunkBuffer[chunkNumber] = dataBuffer;
            if (nextChunk === chunkNumber) {
              handleStreamWrite();
            }
          }, (error) => {
            handleRetries(tries, error, (error2) => {
              if (error2) {
                handleError(error2);
              } else {
                tryFetchChunk();
              }
            });
          });
        };
        tryFetchChunk();
        currentOffset = chunkMax + 1;
        if (chunkSize < maxChunkSize) {
          chunkSize = chunkSize + chunkSizeIncrement;
        }
      };
      const handleStreamWrite = () => {
        let shouldWaitDrain;
        while (true) {
          const bufferChunk = chunkBuffer[nextChunk];
          if (!bufferChunk)
            break;
          shouldWaitDrain = !decryptStream.write(bufferChunk);
          delete chunkBuffer[nextChunk];
          nextChunk++;
          if (shouldWaitDrain)
            break;
        }
        if (stopped && lastStartedChunk === nextChunk) {
          decryptStream.end();
        }
        if (shouldWaitDrain) {
          decryptStream.once("drain", handleStreamWrite);
        } else {
          getChunk();
        }
      };
      for (let i2 = 0; i2 < maxConnections; i2++) {
        getChunk();
      }
    });
    if (cb)
      streamToCb(stream, cb);
    return stream;
  }
  downloadBuffer(options, originalCb) {
    const [cb, promise] = createPromise(originalCb);
    this.download(options, cb);
    return promise;
  }
  link(options, originalCb) {
    if (arguments.length === 1 && typeof options === "function") {
      originalCb = options;
      options = {
        noKey: false
      };
    }
    const [cb, promise] = createPromise(originalCb);
    if (typeof options === "boolean") {
      options = {
        noKey: options
      };
    }
    let url = `https://mega.nz/${this.directory ? "folder" : "file"}/${this.downloadId}`;
    if (!options.noKey && this.key)
      url += `#${e64(this.key)}`;
    if (!options.noKey && this.loadedFile) {
      url += `/file/${this.loadedFile}`;
    }
    cb(null, url);
    return promise;
  }
  static fromURL(opt, extraOpt = {}) {
    if (typeof opt === "object") {
      return new File(opt);
    }
    const url = new URL(opt);
    if (url.hostname !== "mega.nz" && url.hostname !== "mega.co.nz")
      throw Error("Invalid URL: wrong hostname");
    if (!url.hash)
      throw Error("Invalid URL: no hash");
    if (url.pathname.match(/\/(file|folder)\//) !== null) {
      const split = url.hash.substr(1).split("/file/");
      const fileHandler = url.pathname.substring(
        url.pathname.lastIndexOf("/") + 1,
        url.pathname.length + 1
      );
      const fileKey = split[0];
      if (fileHandler && !fileKey || !fileHandler && fileKey)
        throw Error("Invalid URL: too few arguments");
      return new File({
        downloadId: fileHandler,
        key: fileKey,
        directory: url.pathname.indexOf("/folder/") >= 0,
        loadedFile: split[1],
        ...extraOpt
      });
    } else {
      const split = url.hash.split("!");
      if (split[0] !== "#" && split[0] !== "#F")
        throw Error("Invalid URL: format not recognized");
      if (split.length <= 1)
        throw Error("Invalid URL: too few arguments");
      if (split.length >= (split[0] === "#" ? 4 : 5))
        throw Error("Invalid URL: too many arguments");
      return new File({
        downloadId: split[1],
        key: split[2],
        directory: split[0] === "#F",
        loadedFile: split[3],
        ...extraOpt
      });
    }
  }
  static unpackAttributes(at) {
    let end = 0;
    while (end < at.length && at.readUInt8(end))
      end++;
    at = at.slice(0, end).toString();
    if (at.substr(0, 6) !== 'MEGA{"')
      return;
    try {
      return JSON.parse(at.substr(4));
    } catch (e) {
    }
  }
  static defaultHandleRetries(tries, error, cb) {
    if (tries > 8) {
      cb(error);
    } else {
      setTimeout(cb, 1e3 * Math.pow(2, tries));
    }
  }
};
var LABEL_NAMES = ["", "red", "orange", "yellow", "green", "blue", "purple", "grey"];
var file_default = File;

// lib/mutable-file.mjs
var import_secure_random2 = __toESM(require("secure-random"), 1);
var import_stream4 = require("stream");
var KEY_CACHE = {};
var MutableFile = class extends file_default {
  constructor(opt, storage) {
    super(opt);
    this.storage = storage;
    this.api = storage.api;
    this.nodeId = opt.h;
    this.timestamp = opt.ts;
    this.type = opt.t;
    this.directory = !!this.type;
    if (opt.k) {
      const idKeyPairs = opt.k.split("/");
      let aes = storage.aes;
      for (const idKeyPair of idKeyPairs) {
        const id = idKeyPair.split(":")[0];
        if (id === storage.user) {
          opt.k = idKeyPair;
          break;
        }
        const shareKey = storage.shareKeys[id];
        if (shareKey) {
          opt.k = idKeyPair;
          aes = KEY_CACHE[id];
          if (!aes) {
            aes = KEY_CACHE[id] = new AES(shareKey);
          }
          break;
        }
      }
      this.loadMetadata(aes, opt);
    }
  }
  loadAttributes() {
    throw Error("This is not needed for files loaded from logged in sessions");
  }
  mkdir(opt, originalCb) {
    if (!this.directory)
      throw Error("node isn't a directory");
    const [cb, promise] = createPromise(originalCb);
    if (typeof opt === "string") {
      opt = { name: opt };
    }
    if (!opt.attributes)
      opt.attributes = {};
    if (opt.name)
      opt.attributes.n = opt.name;
    if (!opt.attributes.n) {
      throw Error("file name is required");
    }
    if (!opt.target)
      opt.target = this;
    if (!opt.key)
      opt.key = Buffer.from((0, import_secure_random2.default)(16));
    if (opt.key.length !== 16) {
      throw Error("wrong key length, must be 128bit");
    }
    const key = opt.key;
    const at = MutableFile.packAttributes(opt.attributes);
    getCipher(key).encryptCBC(at);
    const storedKey = Buffer.from(key);
    this.storage.aes.encryptECB(storedKey);
    const request = {
      a: "p",
      t: opt.target.nodeId ? opt.target.nodeId : opt.target,
      n: [{
        h: "xxxxxxxx",
        t: 1,
        a: e64(at),
        k: e64(storedKey)
      }]
    };
    const shares = getShares(this.storage.shareKeys, this);
    if (shares.length > 0) {
      request.cr = makeCryptoRequest(this.storage, [{
        nodeId: "xxxxxxxx",
        key
      }], shares);
    }
    this.api.request(request, (err, response) => {
      if (err)
        return cb(err);
      const file = this.storage._importFile(response.f[0]);
      this.storage.emit("add", file);
      cb(null, file);
    });
    return promise;
  }
  upload(opt, source, originalCb) {
    if (!this.directory)
      throw Error("node is not a directory");
    if (arguments.length === 2 && typeof source === "function") {
      [originalCb, source] = [source, null];
    }
    const [cb, promise] = createPromise(originalCb);
    if (typeof opt === "string") {
      opt = { name: opt };
    }
    if (!opt.attributes)
      opt.attributes = {};
    if (opt.name)
      opt.attributes.n = opt.name;
    if (!opt.attributes.n) {
      throw Error("File name is required.");
    }
    if (!(typeof opt.size === "number" && opt.size >= 0) && !(source && typeof source.pipe !== "function" && typeof source.length === "number") && !opt.allowUploadBuffering) {
      throw Error("Specify a file size or set allowUploadBuffering to true");
    }
    if (!opt.target)
      opt.target = this;
    let finalKey;
    let key = formatKey(opt.key);
    if (!key)
      key = (0, import_secure_random2.default)(24);
    if (!(key instanceof Buffer))
      key = Buffer.from(key);
    const keySize = opt.uploadCiphertext ? 32 : 24;
    if (key.length !== keySize) {
      throw Error("Wrong key length. Key must be 192bit");
    }
    if (opt.uploadCiphertext) {
      finalKey = key;
      key = unmergeKeyMac(key).slice(0, 24);
    }
    opt.key = key;
    const hashes = [];
    const checkCallbacks = (err, type, hash, encrypter) => {
      if (err)
        return returnError(err);
      if (!hash || hash.length === 0) {
        returnError(Error("Server returned a invalid response while uploading"));
        return;
      }
      const errorCheck = Number(hash.toString());
      if (errorCheck < 0) {
        returnError(Error("Server returned error " + errorCheck + " while uploading"));
        return;
      }
      hashes[type] = hash;
      if (type === 0 && !finalKey)
        finalKey = encrypter.key;
      if (opt.thumbnailImage && !hashes[1])
        return;
      if (opt.previewImage && !hashes[2])
        return;
      if (!hashes[0])
        return;
      const at = MutableFile.packAttributes(opt.attributes);
      getCipher(finalKey).encryptCBC(at);
      const storedKey = Buffer.from(finalKey);
      this.storage.aes.encryptECB(storedKey);
      const fileObject = {
        h: e64(hashes[0]),
        t: 0,
        a: e64(at),
        k: e64(storedKey)
      };
      if (hashes.length !== 1) {
        fileObject.fa = hashes.slice(1).map((hash2, index) => {
          return index + "*" + e64(hash2);
        }).filter((e) => e).join("/");
      }
      const request = {
        a: "p",
        t: opt.target.nodeId ? opt.target.nodeId : opt.target,
        n: [fileObject]
      };
      const shares = getShares(this.storage.shareKeys, this);
      if (shares.length > 0) {
        request.cr = makeCryptoRequest(this.storage, [{
          nodeId: fileObject.h,
          key: finalKey
        }], shares);
      }
      this.api.request(request, (err2, response) => {
        if (err2)
          return returnError(err2);
        const file = this.storage._importFile(response.f[0]);
        this.storage.emit("add", file);
        stream.emit("complete", file);
        if (cb)
          cb(null, file);
      });
    };
    if (opt.thumbnailImage) {
      this._uploadAttribute(opt, opt.thumbnailImage, 1, checkCallbacks);
    }
    if (opt.previewImage) {
      this._uploadAttribute(opt, opt.previewImage, 2, checkCallbacks);
    }
    const stream = this._upload(opt, source, 0, checkCallbacks);
    function returnError(e) {
      if (stream.listenerCount("error")) {
        stream.emit("error", e);
      } else {
        cb(e);
      }
    }
    stream.complete = promise;
    return stream;
  }
  _upload(opt, source, type, cb) {
    const encrypter = opt.uploadCiphertext ? new import_stream4.PassThrough() : megaEncrypt(opt.key);
    let stream = encrypter;
    let size = opt.size;
    if (source && typeof source.pipe !== "function") {
      size = source.length;
      stream.end(source);
    }
    if (size != null) {
      if (size === 0)
        encrypter.end();
      this._uploadWithSize(stream, size, encrypter, type, opt, cb);
    } else {
      stream = detectSize(stream, (size2) => {
        this._uploadWithSize(stream, size2, encrypter, type, opt, cb);
      });
    }
    if (source && typeof source.pipe === "function") {
      source.pipe(stream);
    }
    return stream;
  }
  _uploadAttribute(opt, source, type, cb) {
    const gotBuffer = (err, buffer) => {
      if (err)
        return cb(err);
      const len = buffer.length;
      const rest = Math.ceil(len / 16) * 16 - len;
      if (rest !== 0) {
        buffer = Buffer.concat([buffer, Buffer.alloc(rest)]);
      }
      const encrypter = opt.handle ? getCipher(opt.key) : new AES(opt.key.slice(0, 16));
      encrypter.encryptCBC(buffer);
      const stream = new import_stream4.PassThrough();
      stream.end(buffer);
      this._uploadWithSize(stream, buffer.length, stream, type, opt, cb);
    };
    if (source instanceof Buffer) {
      gotBuffer(null, source);
      return;
    }
    streamToCb(source, gotBuffer);
  }
  _uploadWithSize(stream, size, source, type, opt, cb) {
    const ssl = opt.forceHttps ?? false ? 2 : 0;
    const getUrlRequest = type === 0 ? { a: "u", ssl, s: size, ms: 0, r: 0, e: 0, v: 2 } : { a: "ufa", ssl, s: size };
    if (opt.handle) {
      getUrlRequest.h = opt.handle;
    }
    const initialChunkSize = type === 0 ? opt.initialChunkSize || 128 * 1024 : size;
    const chunkSizeIncrement = opt.chunkSizeIncrement || 128 * 1024;
    const maxChunkSize = opt.maxChunkSize || 1024 * 1024;
    const maxConnections = opt.maxConnections || 4;
    const handleRetries = opt.handleRetries || file_default.defaultHandleRetries;
    let currentChunkSize = initialChunkSize;
    let activeConnections = 0;
    let isReading = false;
    let position = 0;
    let remainingBuffer;
    let uploadBuffer, uploadURL;
    let chunkSize, chunkPos;
    const handleChunk = () => {
      chunkSize = Math.min(currentChunkSize, size - position);
      uploadBuffer = Buffer.alloc(chunkSize);
      activeConnections++;
      if (currentChunkSize < maxChunkSize) {
        currentChunkSize += chunkSizeIncrement;
      }
      chunkPos = 0;
      if (remainingBuffer) {
        remainingBuffer.copy(uploadBuffer);
        chunkPos = Math.min(remainingBuffer.length, chunkSize);
        remainingBuffer = remainingBuffer.length > chunkSize ? remainingBuffer.slice(chunkSize) : null;
      }
      if (chunkPos === chunkSize) {
        sendChunk();
      } else {
        isReading = true;
        handleData();
      }
    };
    const sendChunk = () => {
      const chunkPosition = position;
      const chunkBuffer = uploadBuffer;
      let tries = 0;
      const trySendChunk = () => {
        tries++;
        this.api.fetch(uploadURL + "/" + (type === 0 ? chunkPosition : type - 1), {
          method: "POST",
          body: chunkBuffer,
          headers: {
            "content-length": chunkBuffer.length
          }
        }).then((response) => {
          if (response.status !== 200) {
            throw Error("MEGA returned a " + response.status + " status code");
          }
          return response.arrayBuffer();
        }).then((hash) => {
          const hashBuffer = Buffer.from(hash);
          if (hashBuffer.length > 0) {
            source.end();
            process.nextTick(() => {
              cb(null, type, hashBuffer, source);
            });
          } else if (position < size && !isReading) {
            handleChunk();
          }
        }, (error) => {
          handleRetries(tries, error, (error2) => {
            if (error2) {
              stream.emit("error", error2);
            } else {
              trySendChunk();
            }
          });
        });
      };
      trySendChunk();
      uploadBuffer = null;
      position += chunkSize;
      if (position < size && !isReading && activeConnections < maxConnections) {
        handleChunk();
      }
    };
    let sizeCheck = 0;
    const handleData = () => {
      while (true) {
        const data = source.read();
        if (data === null) {
          source.once("readable", handleData);
          break;
        }
        sizeCheck += data.length;
        stream.emit("progress", { bytesLoaded: sizeCheck, bytesTotal: size });
        data.copy(uploadBuffer, chunkPos);
        chunkPos += data.length;
        if (chunkPos >= chunkSize) {
          isReading = false;
          remainingBuffer = data.slice(data.length - (chunkPos - chunkSize));
          sendChunk();
          break;
        }
      }
    };
    source.on("end", () => {
      if (size && sizeCheck !== size) {
        stream.emit("error", Error("Specified data size does not match: " + size + " !== " + sizeCheck));
      }
    });
    this.api.request(getUrlRequest, (err, resp) => {
      if (err)
        return cb(err);
      uploadURL = resp.p;
      handleChunk();
    });
  }
  uploadAttribute(type, data, originalCb) {
    const [cb, promise] = createPromise(originalCb);
    if (typeof type === "string") {
      type = ["thumbnail", "preview"].indexOf(type);
    }
    if (type !== 0 && type !== 1)
      throw Error("Invalid attribute type");
    this._uploadAttribute({
      key: this.key,
      handle: this.nodeId
    }, data, type + 1, (err, streamType, hash, encrypter) => {
      if (err)
        return cb(err);
      const request = {
        a: "pfa",
        n: this.nodeId,
        fa: type + "*" + e64(hash)
      };
      this.api.request(request, (err2, response) => {
        if (err2)
          return cb(err2);
        cb(null, this);
      });
    });
    return promise;
  }
  delete(permanent, cb) {
    if (typeof permanent === "function") {
      cb = permanent;
      permanent = void 0;
    }
    if (typeof permanent === "undefined") {
      permanent = this.parent === this.storage.trash;
    }
    if (permanent)
      return this.api.request({ a: "d", n: this.nodeId }, cb);
    return this.moveTo(this.storage.trash, cb);
  }
  moveTo(target, cb) {
    if (typeof target === "string") {
      target = this.storage.files[target];
    }
    if (!(target instanceof file_default)) {
      throw Error("target must be a folder or a nodeId");
    }
    const request = { a: "m", n: this.nodeId, t: target.nodeId };
    const shares = getShares(this.storage.shareKeys, target);
    if (shares.length > 0) {
      request.cr = makeCryptoRequest(this.storage, [this], shares);
    }
    return this.api.request(request, cb);
  }
  setAttributes(attributes, originalCb) {
    const [cb, promise] = createPromise(originalCb);
    Object.assign(this.attributes, attributes);
    const newAttributes = MutableFile.packAttributes(this.attributes);
    getCipher(this.key).encryptCBC(newAttributes);
    this.api.request({ a: "a", n: this.nodeId, at: e64(newAttributes) }, (error) => {
      this.parseAttributes(this.attributes);
      cb(error);
    });
    return promise;
  }
  rename(filename, cb) {
    return this.setAttributes({
      n: filename
    }, cb);
  }
  setLabel(label, cb) {
    if (typeof label === "string")
      label = LABEL_NAMES.indexOf(label);
    if (typeof label !== "number" || Math.floor(label) !== label || label < 0 || label > 7) {
      throw Error("label must be a integer between 0 and 7 or a valid label name");
    }
    return this.setAttributes({
      lbl: label
    }, cb);
  }
  setFavorite(isFavorite, cb) {
    return this.setAttributes({
      fav: isFavorite ? 1 : 0
    }, cb);
  }
  link(options, originalCb) {
    if (arguments.length === 1 && typeof options === "function") {
      originalCb = options;
      options = {
        noKey: false
      };
    }
    if (typeof options === "boolean") {
      options = {
        noKey: options
      };
    }
    if (!options)
      options = {};
    const folderKey = options.__folderKey;
    if (this.directory && !folderKey) {
      return this.shareFolder(options, originalCb);
    }
    const [cb, promise] = createPromise(originalCb);
    this.api.request({ a: "l", n: this.nodeId }, (err, id) => {
      if (err)
        return cb(err);
      let url = `https://mega.nz/${folderKey ? "folder" : "file"}/${id}`;
      if (!options.noKey && this.key)
        url += `#${e64(folderKey || this.key)}`;
      cb(null, url);
    });
    return promise;
  }
  shareFolder(options, originalCb) {
    if (!this.directory)
      throw Error("node isn't a folder");
    const handler = this.nodeId;
    const storedShareKey = this.storage.shareKeys[handler];
    if (storedShareKey) {
      return this.link(Object.assign({
        __folderKey: storedShareKey
      }, options), originalCb);
    }
    let shareKey = formatKey(options.key);
    if (!shareKey) {
      shareKey = (0, import_secure_random2.default)(16);
    }
    if (!(shareKey instanceof Buffer)) {
      shareKey = Buffer.from(shareKey);
    }
    const [cb, promise] = createPromise(originalCb);
    if (shareKey.length !== 16) {
      cb(Error("share key must be 16 byte / 22 characters"));
      return promise;
    }
    this.storage.shareKeys[handler] = shareKey;
    const authKey = Buffer.from(handler + handler);
    this.storage.aes.encryptECB(authKey);
    const request = {
      a: "s2",
      n: handler,
      s: [{ u: "EXP", r: 0 }],
      ok: e64(this.storage.aes.encryptECB(Buffer.from(shareKey))),
      ha: e64(authKey),
      cr: makeCryptoRequest(this.storage, this)
    };
    this.api.request(request, (err) => {
      if (err)
        return cb(err);
      this.link(Object.assign({
        __folderKey: shareKey
      }, options), cb);
    });
    return promise;
  }
  unshare(cb) {
    if (this.directory)
      return this.unshareFolder(cb);
    return this.api.request({
      a: "l",
      n: this.nodeId,
      d: 1
    }, cb);
  }
  unshareFolder(cb) {
    if (!this.directory)
      throw Error("node isn't a folder");
    delete this.storage.shareKeys[this.nodeId];
    return this.api.request({
      a: "s2",
      n: this.nodeId,
      s: [{ u: "EXP", r: "" }]
    }, cb);
  }
  importFile(sharedFile, originalCb) {
    const [cb, promise] = createPromise(originalCb);
    if (!this.directory)
      throw Error("importFile can only be called on directories");
    if (typeof sharedFile === "string")
      sharedFile = file_default.fromURL(sharedFile);
    if (!(sharedFile instanceof file_default))
      throw Error("First argument of importFile should be a File or a URL string");
    if (!sharedFile.key) {
      cb(Error("Can't import files without encryption keys"));
      return promise;
    }
    const afterGotAttributes = (err, file) => {
      if (err)
        return cb(err);
      const attributes = MutableFile.packAttributes(file.attributes);
      getCipher(file.key).encryptCBC(attributes);
      const downloadId = Array.isArray(file.downloadId) ? file.downloadId[1] : file.downloadId;
      const request = {
        a: "p",
        t: this.nodeId,
        n: [{
          ph: downloadId,
          t: 0,
          a: e64(attributes),
          k: e64(this.storage.aes.encryptECB(file.key))
        }]
      };
      this.api.request(request, (err2, response) => {
        if (err2)
          return cb(err2);
        const file2 = this.storage._importFile(response.f[0]);
        this.storage.emit("add", file2);
        cb(null, file2);
      });
    };
    if (sharedFile.attributes) {
      afterGotAttributes(null, sharedFile);
    } else {
      sharedFile.loadAttributes(afterGotAttributes);
    }
    return promise;
  }
  static packAttributes(attributes) {
    let at = JSON.stringify(attributes);
    at = Buffer.from(`MEGA${at}`);
    const ret = Buffer.alloc(Math.ceil(at.length / 16) * 16);
    at.copy(ret);
    return ret;
  }
};
function makeCryptoRequest(storage, sources, shares) {
  const shareKeys = storage.shareKeys;
  if (!Array.isArray(sources)) {
    sources = selfAndChildren(sources);
  }
  if (!shares) {
    shares = sources.map((source) => getShares(shareKeys, source)).reduce((arr, el) => arr.concat(el)).filter((el, index, arr) => index === arr.indexOf(el));
  }
  const cryptoRequest = [
    shares,
    sources.map((node) => node.nodeId),
    []
  ];
  for (let i = shares.length; i--; ) {
    const aes = new AES(shareKeys[shares[i]]);
    for (let j = sources.length; j--; ) {
      const fileKey = Buffer.from(sources[j].key);
      if (fileKey && (fileKey.length === 32 || fileKey.length === 16)) {
        cryptoRequest[2].push(i, j, e64(aes.encryptECB(fileKey)));
      }
    }
  }
  return cryptoRequest;
}
function selfAndChildren(node) {
  return [node].concat((node.children || []).map(selfAndChildren).reduce((arr, el) => arr.concat(el), []));
}
function getShares(shareKeys, node) {
  const handle = node.nodeId;
  const parent = node.parent;
  const shares = [];
  if (shareKeys[handle]) {
    shares.push(handle);
  }
  return parent ? shares.concat(getShares(shareKeys, parent)) : shares;
}
var mutable_file_default = MutableFile;

// lib/storage.mjs
var Storage = class extends import_events3.EventEmitter {
  constructor(options, originalCb) {
    super();
    if (arguments.length === 1 && typeof options === "function") {
      originalCb = options;
      options = {};
    }
    if (!options.email) {
      throw Error("starting a session without credentials isn't supported");
    }
    if (!originalCb) {
      originalCb = (err) => {
        if (err)
          throw err;
      };
    }
    const [cb, promise] = createPromise(originalCb);
    this.ready = promise;
    options.keepalive = options.keepalive === void 0 ? true : !!options.keepalive;
    options.autoload = options.autoload === void 0 ? true : !!options.autoload;
    options.autologin = options.autologin === void 0 ? true : !!options.autologin;
    this.api = new api_default(options.keepalive, options);
    this.files = {};
    this.options = options;
    if (options.autologin) {
      this.login(cb);
    } else {
      cb(null, this);
    }
    this.status = "closed";
  }
  login(originalCb) {
    const [cb, promise] = createPromise(originalCb);
    const ready = () => {
      this.status = "ready";
      cb(null, this);
      this.emit("ready", this);
    };
    const loadUser = (cb2) => {
      this.api.request({ a: "ug" }, (err, response) => {
        if (err)
          return cb2(err);
        this.name = response.name;
        this.user = response.u;
        if (this.options.autoload) {
          this.reload(true, (err2) => {
            if (err2)
              return cb2(err2);
            ready();
          });
        } else {
          ready();
        }
      });
    };
    this.email = this.options.email.toLowerCase();
    const handleV1Account = (cb2) => {
      const pw = prepareKey(Buffer.from(this.options.password));
      delete this.options.password;
      const aes = new AES(pw);
      const uh = e64(aes.stringhash(Buffer.from(this.email)));
      const request = { a: "us", user: this.email, uh };
      finishLogin(request, aes, cb2);
    };
    const handleV2Account = (info, cb2) => {
      prepareKeyV2(Buffer.from(this.options.password), info, (err, result) => {
        if (err)
          return cb2(err);
        delete this.options.password;
        const aes = new AES(result.slice(0, 16));
        const uh = e64(result.slice(16));
        const request = { a: "us", user: this.email, uh };
        finishLogin(request, aes, cb2);
      });
    };
    const finishLogin = (request, aes, cb2) => {
      this.api.request(request, (err, response) => {
        if (err)
          return cb2(err);
        this.key = formatKey(response.k);
        aes.decryptECB(this.key);
        this.aes = new AES(this.key);
        const t = formatKey(response.csid);
        const privk = this.aes.decryptECB(formatKey(response.privk));
        const rsaPrivk = cryptoDecodePrivKey(privk);
        if (!rsaPrivk)
          throw Error("invalid credentials");
        const sid = e64(cryptoRsaDecrypt(t, rsaPrivk).slice(0, 43));
        this.api.sid = this.sid = sid;
        this.RSAPrivateKey = rsaPrivk;
        loadUser(cb2);
      });
    };
    this.api.request({ a: "us0", user: this.email }, (err, response) => {
      if (err)
        return cb(err);
      if (response.v === 1)
        return handleV1Account(cb);
      if (response.v === 2)
        return handleV2Account(response, cb);
      cb(Error("Account version not supported"));
    });
    this.status = "connecting";
    return promise;
  }
  reload(force, originalCb) {
    if (typeof force === "function")
      [force, originalCb] = [originalCb, force];
    const [cb, promise] = createPromise(originalCb);
    if (this.status === "connecting" && !force) {
      this.once("ready", () => {
        this.reload(force, cb);
      });
      return promise;
    }
    this.mounts = [];
    this.api.request({ a: "f", c: 1 }, (err, response) => {
      if (err)
        return cb(err);
      this.shareKeys = response.ok.reduce((shares, share) => {
        const handler = share.h;
        const auth = this.aes.encryptECB(Buffer.from(handler + handler));
        if (constantTimeCompare(formatKey(share.ha), auth)) {
          shares[handler] = this.aes.decryptECB(formatKey(share.k));
        }
        return shares;
      }, {});
      response.f.forEach((file) => this._importFile(file));
      cb(null, this.mounts);
    });
    this.api.on("sc", (arr) => {
      const deleted = {};
      arr.forEach((o) => {
        if (o.a === "u") {
          const file = this.files[o.n];
          if (file) {
            file.timestamp = o.ts;
            file.decryptAttributes(o.at);
            file.emit("update");
            this.emit("update", file);
          }
        } else if (o.a === "d") {
          deleted[o.n] = true;
        } else if (o.a === "t") {
          o.t.f.forEach((f) => {
            const file = this.files[f.h];
            if (file) {
              delete deleted[f.h];
              const oldparent = file.parent;
              if (oldparent.nodeId === f.p)
                return;
              oldparent.children.splice(oldparent.children.indexOf(file), 1);
              file.parent = this.files[f.p];
              if (!file.parent.children)
                file.parent.children = [];
              file.parent.children.push(file);
              file.emit("move", oldparent);
              this.emit("move", file, oldparent);
            } else {
              this.emit("add", this._importFile(f));
            }
          });
        }
      });
      Object.keys(deleted).forEach((n) => {
        const file = this.files[n];
        const parent = file.parent;
        parent.children.splice(parent.children.indexOf(file), 1);
        this.emit("delete", file);
        file.emit("delete");
      });
    });
    return promise;
  }
  _importFile(f) {
    if (!this.files[f.h]) {
      const file = this.files[f.h] = new mutable_file_default(f, this);
      if (f.t === NODE_TYPE_DRIVE) {
        this.root = file;
        file.name = "Cloud Drive";
      }
      if (f.t === NODE_TYPE_RUBBISH_BIN) {
        this.trash = file;
        file.name = "Rubbish Bin";
      }
      if (f.t === NODE_TYPE_INBOX) {
        this.inbox = file;
        file.name = "Inbox";
      }
      if (f.t > 1) {
        this.mounts.push(file);
      }
      if (f.p) {
        const parent = this.files[f.p];
        if (parent) {
          if (!parent.children)
            parent.children = [];
          parent.children.push(file);
          file.parent = parent;
        }
      }
    }
    return this.files[f.h];
  }
  mkdir(opt, cb) {
    if (this.status !== "ready") {
      throw Error("storage is not ready");
    }
    return this.root.mkdir(opt, cb);
  }
  upload(opt, buffer, cb) {
    if (this.status !== "ready") {
      throw Error("storage is not ready");
    }
    return this.root.upload(opt, buffer, cb);
  }
  close(cb) {
    this.status = "closed";
    this.api.close();
    return this.api.request({ a: "sml" }, cb);
  }
  getAccountInfo(originalCb) {
    const [cb, promise] = createPromise(originalCb);
    this.api.request({ a: "uq", strg: 1, xfer: 1, pro: 1 }, (err, response) => {
      if (err)
        cb(err);
      const account = {};
      account.type = response.utype;
      account.spaceUsed = response.cstrg;
      account.spaceTotal = response.mstrg;
      account.downloadBandwidthTotal = response.mxfer || Math.pow(1024, 5) * 10;
      account.downloadBandwidthUsed = response.caxfer || 0;
      account.sharedBandwidthUsed = response.csxfer || 0;
      account.sharedBandwidthLimit = response.srvratio;
      cb(null, account);
    });
    return promise;
  }
  toJSON() {
    return {
      key: e64(this.key),
      sid: this.sid,
      name: this.name,
      user: this.user,
      options: this.options
    };
  }
  static fromJSON(json) {
    const storage = new Storage(Object.assign(json.options, {
      autoload: false,
      autologin: false
    }));
    storage.key = d64(json.key);
    storage.aes = new AES(storage.key);
    storage.api.sid = storage.sid = json.sid;
    storage.name = json.name;
    storage.user = json.user;
    return storage;
  }
};
var NODE_TYPE_DRIVE = 2;
var NODE_TYPE_INBOX = 3;
var NODE_TYPE_RUBBISH_BIN = 4;
var storage_default = Storage;

// lib/mega.js
function mega(options, cb) {
  return new storage_default(options, cb);
}
mega.Storage = storage_default;
mega.File = file_default;
mega.API = api_default;
mega.file = file_default.fromURL;
mega.encrypt = megaEncrypt;
mega.decrypt = megaDecrypt;
mega.verify = megaVerify;
module.exports = mega;
