const FXP = require('fast-xml-parser');
const specs = require('./specs.js');
if (typeof JZZ == 'undefined') {
  JZZ = require('jzz');
  require('jzz-midi-smf')(JZZ);
}

const XML_prolog = '<?xml version="1.0" encoding="UTF-8"?>';
const XML_partwise = '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">';
const XML_timewise = '<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 4.0 Timewise//EN" "http://www.musicxml.org/dtds/timewise.dtd">';

const parser = new FXP.XMLParser({ ignoreAttributes: false, preserveOrder: true, ignorePiTags: true });
const builder = new FXP.XMLBuilder({ ignoreAttributes: false, preserveOrder: true, format: true });

function MXML(s) {
  if (!s || FXP.XMLValidator.validate(s) !== true) return;
  var xml = parser.parse(s);
  if (xml.length != 1 || !xml[0]['score-partwise'] && !xml[0]['score-timewise'] && !xml[0]['opus'] && !xml[0]['mei']) return;
  this.txt = s;
  this.xml = xml;
}
MXML.prototype.isValid = function() { return !!this.xml; };
MXML.prototype.isPartwise = function() { return this.isValid() && !!this.xml[0]['score-partwise']; };
MXML.prototype.isTimewise = function() { return this.isValid() && !!this.xml[0]['score-timewise']; };
MXML.prototype.isOpus = function() { return this.isValid() && !!this.xml[0]['opus']; };
MXML.prototype.isMei = function() { return this.isValid() && !!this.xml[0]['mei']; };
MXML.prototype.format = function () { return builder.build(this.xml); };
MXML.validate = function(s) { return FXP.XMLValidator.validate(s); };
MXML.prototype.validate = function () { return MXML.validate(this.txt); };
function for_tag(a, t, f) { for (var x of a) if (x[t]) f(x, x[t]); }
function copy_mxl_headers(src, dst) {
  function push(x) { dst.push(x); }
  for (var tag of ['work', 'movement-number', 'movement-title', 'identification', 'defaults', 'credit', 'part-list']) for_tag(src, tag, push);
}
function copy_attributes(src, dst) { if (src[':@']) dst[':@'] = src[':@']; }
function get_attribute(x, a) { if (x[':@']) return x[':@']['@_' + a]; }
function flip_measures(src, dst, tag1, id1, tag2, id2) {
  var a1 = [], a2 = [];
  var aa1 = {}, aa2 = {}, aaa = {};
  var x, w, k, n;
  for_tag(src, tag1, function(x) {
    k = get_attribute(x, id1);
    if (!aa1[k]) {
      a1.push(k);
      aa1[k] = x[':@'] || {};
      aaa[k] = {};
    }
    for_tag(x[tag1], tag2, function(x) {
      n = get_attribute(x, id2);
      if (!aa2[n]) {
        a2.push(n);
        aa2[n] = x[':@'] || {};
      }
      aaa[k][n] = x[tag2];
    });
  });
  for (n of a2) {
    x = {};
    x[tag2] = [];
    x[':@'] = aa2[n];
    for (k of a1) {
      w = {};
      w[tag1] = aaa[k][n];
      w[':@'] = aa1[k];
      x[tag2].push(w);
    }
    dst.push(x);
  }
}
MXML.prototype.part2time = function() {
  if (!this.isPartwise()) return;
  var pw = this.xml[0];
  var tw = { 'score-timewise': [] };
  copy_mxl_headers(pw['score-partwise'], tw['score-timewise']);
  copy_attributes(pw, tw);
  flip_measures(pw['score-partwise'], tw['score-timewise'], 'part', 'id', 'measure', 'number');
  return [XML_prolog, XML_timewise, builder.build([tw]).trim()].join('\n');
};
MXML.prototype.time2part = function() {
  if (!this.isTimewise()) return;
  var tw = this.xml[0];
  var pw = { 'score-partwise': [] };
  copy_mxl_headers(tw['score-timewise'], pw['score-partwise']);
  copy_attributes(tw, pw);
  flip_measures(tw['score-timewise'], pw['score-partwise'], 'measure', 'number', 'part', 'id');
  return [XML_prolog, XML_partwise, builder.build([pw]).trim()].join('\n');
};
MXML.prototype.midi = function() { return new Flow(this).midi(); };
MXML.prototype.midi2 = function() { return new Flow(this).midi2(); };

async function inflate(b) {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(b);
  writer.close();
  return await new Response(ds.readable).arrayBuffer();
}
async function deflate(b) {
  const ds = new CompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(b);
  writer.close();
  return await new Response(ds.readable);
};
function tostring(x) { return new TextDecoder().decode(x); }
function tobuffer(x) { return new TextEncoder().encode(x); }
function n2(b, n) { return b[n] + b[n + 1] * 0x100; }
function n4(b, n) { return b[n] + b[n + 1] * 0x100 + b[n + 2] * 0x10000 + b[n + 3] * 0x1000000; }
function ww(b, n, x, w) { for (var i = 0; i < w; i++) { b[n + i] = x & 255; x >>= 8; } }
function w2(b, n, x) { ww(b, n, x, 2); }
function w4(b, n, x) { ww(b, n, x, 4); }
function wb(b, n, x) { for (var i = 0; i < x.length; i++) b[n + i] = x[i]; }
function dos2date(n) {
  return new Date((n >> 25) + 1980, ((n >> 21) & 15) - 1, (n >> 16) & 31, (n >> 11) & 31, (n >> 5) & 63, (n & 31) << 1);
}
function date2dos(d) {
  return (d.getSeconds() >> 1) + (d.getMinutes() << 5) + (d.getHours() << 11) + (d.getDate() << 16) + ((d.getMonth() + 1) << 21) + ((d.getFullYear() - 1980) << 25);
}
const meta_inf = 'META-INF/container.xml';
const meta_xml = '<?xml version="1.0" encoding="UTF-8"?><container><rootfiles><rootfile full-path="data.xml"></rootfile></rootfiles></container>';
MXML.zipInfo = function(data) {
  const inf = zipInfo(data);
  if (inf) {
    var a = [];
    for (var k of inf.FFF) a.push({ name: k, size: inf.FF[k].size, date: inf.FF[k].date });
    return a;
  }
};
MXML.unzip = async function(data) {
  const inf = zipInfo(data);
  if (!inf) return;
  var FF = inf.FF;
  var FFF = inf.FFF;
  var a, k, s, s0, s1, s2, x;
  if (FF[meta_inf]) {
    a = [];
    x = parse(await decompress(data, FF[meta_inf]));
    traverse(x, find('rootfile', function(x) { if (x[':@'] && x[':@']['@_full-path']) a.push(x[':@']['@_full-path']); }));
    if (a.length) FFF = a;
  }
  for (k of FFF) {
    if (k == meta_inf) continue;
    s = await decompress(data, FF[k]);
    if (!s) continue;
    s = String(s);
    if (!s0) s0 = s;
    x = parse(s);
    if (!x || !x.length) continue;
    if (!s1) s1 = s;
    if (x[0]['score-partwise'] || x[0]['score-timewise']) return s;
    if (x[0]['opus'] && !s2) s2 = s;
  }
  return s2 || s1 || s0;
}
MXML.zip = async function(data, name) {
  var x;
  var date = date2dos(new Date());
  var A = name ? [{ data: data, name: tobuffer(name) }] : [{ data: tobuffer(meta_xml), name: tobuffer(meta_inf) }, { data: data, name: tobuffer('data.xml') }];
  var n = 0;
  for (x of A) {
    x.off = n;
    x.crc = crc(x.data);
    x.buff = await deflate(x.data);
    if (x.buff.length < x.data.length) x.comp = 8;
    else {
      x.buff = x.data;
      x.comp = 0;
    }
    n += 30 + x.name.length + x.buff.length;
  }
  var m = n;
  for (x of A) n += 46 + x.name.length;
  var B = new Uint8Array(n + 22);
  n = 0;
  for (x of A) {
    w4(B, n, 0x04034b50);
    w2(B, n + 4, 20);
    w2(B, n + 6, 0);
    w2(B, n + 8, x.comp);
    w4(B, n + 10, date);
    w4(B, n + 14, x.crc);
    w4(B, n + 18, x.buff.length);
    w4(B, n + 22, x.data.length);
    w2(B, n + 26, x.name.length);
    w2(B, n + 28, 0);
    wb(B, n + 30, x.name);
    wb(B, n + 30 + x.name.length, x.buff);
    n += 30 + x.name.length + x.buff.length;
  }
  for (x of A) {
    w4(B, n, 0x02014b50);
    w2(B, n + 4, 20);
    w2(B, n + 6, 20);
    w2(B, n + 8, 0);
    w2(B, n + 10, x.comp);
    w4(B, n + 12, date);
    w4(B, n + 16, x.crc);
    w4(B, n + 20, x.buff.length);
    w4(B, n + 24, x.data.length);
    w2(B, n + 28, x.name.length);
    w2(B, n + 30, 0);
    w2(B, n + 32, 0);
    w2(B, n + 34, 0);
    w2(B, n + 36, 0);
    w4(B, n + 38, 0);
    w4(B, n + 42, x.off);
    wb(B, n + 46, x.name);
    n += 46 + x.name.length;
  }
  w4(B, n, 0x06054b50);
  w2(B, n + 4, 0);
  w2(B, n + 6, 0);
  w2(B, n + 8, A.length);
  w2(B, n + 10, A.length);
  w4(B, n + 12, n - m);
  w4(B, n + 16, m);
  w2(B, n + 20, 0);
  return B;
}
function zipInfo(data) {
  var i, m, n;
  var nrec, fnlen, exlen, cmlen, fname;
  var FF = {};
  var FFF = [];
  i = data.length > 65557 ? data.length - 65557 : 0;
  for (n = data.length - 22; n >= i; n--) if (data[n] == 80 && data[n + 1] == 75 && data[n + 2] == 5 && data[n + 3] == 6) break;
  if (n < i) return;
  nrec = n2(data, n + 8);
  n = n4(data, n + 16);
  for (i = 0; i < nrec; i++) {
    if (n4(data, n) != 0x2014b50) {
      console.warn('bad zip file');
      return;
    }
    fnlen = n2(data, n + 28);
    exlen = n2(data, n + 30);
    cmlen = n2(data, n + 32);
    fname = tostring(data.subarray(n + 46, n + 46 + fnlen));
    m = n4(data, n + 42);
    if (n4(data, m) != 0x4034b50) {
      console.warn('bad zip file');
      return;
    }
    FFF.push(fname);
    FF[fname] = {
      off: m + 30 + n2(data, m + 26) + n2(data, m + 28),
      len: n4(data, n + 20), // n4(data, m + 18),
      size: n4(data, n + 24), // n4(data, m + 22),
      date: dos2date(n4(data, n + 12)), //dos2date(n4(data, m + 10)),
      comp: n2(data, n + 10) // n2(data, m + 8)
    };
    n += 46 + fnlen + exlen + cmlen;
  }
  if (FFF.length) return { FFF: FFF, FF: FF };
}
async function decompress(data, x) {
  if (!x.len) return;
  var b = data.subarray(x.off, x.off + x.len);
  if (x.comp == 0) {
    return tostring(b);
  }
  else if (x.comp == 8) {
    try {
      return tostring(await inflate(b));
    }
    catch (e) {
      console.warn('decompress:', e.message);
      return;
    }
  }
  else {
    console.warn('compression method not supported:', x.comp);
  }
}
function parse(xml) {
  try {
    if (FXP.XMLValidator.validate(xml) == true) return parser.parse(xml);
  }
  catch (e) {/**/}
}
function find(n, f) { return function(x) { if (x[n]) f(x); }; }
function traverse(x, f) {
  if (Array.isArray(x)) for (var y of x) traverse(y, f);
  else {
    if (typeof x != 'object') return;
    f(x);
    for (var k of Object.keys(x)) traverse(x[k], f);
  }
}
var T0, T1, T2, T3, T4, T5, T6, T7, T8, T9, Ta, Tb, Tc, Td, Te, Tf;
(function() {
  var c, v, n;
  var A = [], TT = [];
  T0 = [];
  for (n = 0; n < 256; n++) {
    c = n;
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
    T0[n] = c;
  }
  for (n = 0; n != 256; n++) A[n] = T0[n];
  for (n = 0; n != 256; n++) {
    v = T0[n];
    for (c = 256 + n; c < 4096; c += 256) v = A[c] = (v >>> 8) ^ T0[v & 0xFF];
  }
  for (n = 1; n != 16; n++) TT[n - 1] = A.slice(n * 256, n * 256 + 256);
  T1 = TT[0];  T2 = TT[1];  T3 = TT[2];  T4 = TT[3];  T5 = TT[4];
  T6 = TT[5];  T7 = TT[6];  T8 = TT[7];  T9 = TT[8];  Ta = TT[9];
  Tb = TT[10]; Tc = TT[11]; Td = TT[12]; Te = TT[13]; Tf = TT[14];
})();
function crc(B) {
  var C = -1;
  var L = B.length - 15;
  var i;
  for(i = 0; i < L;) {
    C = Tf[B[i++] ^ (C & 255)] ^
    Te[B[i++] ^ ((C >> 8) & 255)] ^
    Td[B[i++] ^ ((C >> 16) & 255)] ^
    Tc[B[i++] ^ (C >>> 24)] ^
    Tb[B[i++]] ^ Ta[B[i++]] ^ T9[B[i++]] ^ T8[B[i++]] ^
    T7[B[i++]] ^ T6[B[i++]] ^ T5[B[i++]] ^ T4[B[i++]] ^
    T3[B[i++]] ^ T2[B[i++]] ^ T1[B[i++]] ^ T0[B[i++]];
  }
  L += 15;
  while (i < L) C = (C >>> 8) ^ T0[(C ^ B[i++]) & 0xFF];
  return ~C;
}

function Flow(X) {
  var DOC = new DOM({'/': X.xml});
  var x, d, k, k0, k1, SC;
  var p, P, PP = [], PPP = {};
  var m, M, MM = [], MMM = {};
  var score = {};
  var V = new Voice();
  if (X.isPartwise()) {
    SC = DOC.get('score-partwise')[0];
    for (P of SC.get('part')) {
      p = P.attr('id');
      if (!PPP[p]) {
        PP.push(p);
        PPP[p] = P;
      }
      for (M of P.get('measure')) {
        m = M.attr('number');
        if (!MMM[m]) {
          MM.push(m);
          MMM[m] = M;
          score[m] = {};
        }
        score[m][p] = M;
      }
    }
  }
  else if (X.isTimewise()) {
    SC = DOC.get('score-timewise')[0];
    for (M of SC.get('measure')) {
      m = M.attr('number');
      if (!MMM[m]) {
        MM.push(m);
        MMM[m] = M;
        score[m] = {};
      }
      for (P of M.get('part')) {
        p = P.attr('id');
        if (!PPP[p]) {
          PP.push(p);
          PPP[p] = P;
        }
        score[m][p] = P;
      }
    }
  }
  for (P of SC.get('part-list', 'score-part')) {
    p = P.attr('id');
    for (M of P.get('midi-instrument')) V.set(p, M);
  }
  this.H = V.dump();
  for (m of MM) {
    for (p of PP) {
      M = score[m][p];
      if (!M) continue;
      k0 = 0; k1 = 0;
//console.log(m, p, M.value('attributes', 'divisions'), M.value('attributes', 'time', 'beats'), '/', M.value('attributes', 'time', 'beat-type'));
      for (x of M.sub) {
        if (x.tag == 'note') {
          d = x.value('duration') || 0;
          if (!x.get('chord').length) {
            k0 = k1;
            k1 += d;
          }
//console.log(k0, k1, V.get(p, x));
        }
        else if (x.tag == 'backup') {
          d = x.value('duration') || 0;
          k1 -= d;
        }
        else if (x.tag == 'forward') {
          d = x.value('duration') || 0;
          k1 += d;
        }
        //else console.log('skip:', x.tag);
      }
    }
  }
}
function _push_midi(trk, x, t) {
  trk = trk.tick(t || 0);
  if (x.type == 'prog') {
    if (x.bank != undefined) trk.bank(x.ch, x.bank);
    trk.program(x.ch, x.prog);
  }
}
function _push_midi2(clip, x, t) {
  clip = clip.tick(t || 0);
  var g = x.gr || 0;
  if (x.type == 'prog') {
    clip.tick(t).umpProgram(g, x.ch, x.prog, x.bank);
  }
}
Flow.prototype.midi = function() {
  var smf = new JZZ.MIDI.SMF();
  var trk = new JZZ.MIDI.SMF.MTrk();
  var x, t = 0;
  smf.push(trk);
  for (x of this.H) _push_midi(trk, x);
  return smf;
}
Flow.prototype.midi2 = function() {
  var clip = new JZZ.MIDI.Clip();
  var x, t = 0;
  for (x of this.H) _push_midi2(clip, x);
  return clip;
}

function _bad_value(t, v) { throw new Error(['Bad', t, 'value:', v].join(' '));}
function _cp_int(obj, pr, x, tag, min, max, d) {
  var v = x.value(tag);
  if (v == undefined) return;
  if (v != parseInt(v) || v < min || v > max) _bad_value(tag, v);
  obj[pr] = v + (d || 0);
}
function _cp_float(obj, pr, x, tag, min, max) {
  var v = x.value(tag);
  if (v == undefined) return;
  if (v != parseFloat(v) || v < min || v > max) _bad_value(tag, v);
  obj[pr] = v;
}

function Voice() { this.PP = {}; }
Voice.prototype.set = function(pp, x) {
  if (!this.PP[pp]) this.PP[pp] = {};
  var id = x.attr('id');
  var v = {};
  _cp_int(v, 'ch', x, 'midi-channel', 1, 16, -1);
  _cp_int(v, 'prog', x, 'midi-program', 1, 128, -1);
  _cp_int(v, 'bank', x, 'midi-bank', 1, 16384, -1);
  _cp_int(v, 'note', x, 'midi-unpitched', 1, 128, -1);
  _cp_float(v, 'vol', x, 'volume', 0, 100);
  _cp_float(v, 'pan', x, 'pan', -180, 180);
  this.PP[pp][id] = v;
  if (!this.PP[pp][undefined]) this.PP[pp][undefined] = v;
};
Voice.prototype.get = function(pp, x) {
  if (x.get('rest').length) return;
  var p = x.get('pitch')[0];
  var r = { ch: 0 };
  if (p) {
    var m = {C: 0, D: 2, E: 4, F:5, G: 7, A: 9, B: 11}[p.value('step')];
    var k = p.value('octave');
    if (m == parseInt(m) || k == parseInt(k)) r.note = m + (k + 1) * 12 + (p.value('alter') || 0);
  }
  var id = x.attr('instrument', 'id');
  var v;
  if (this.PP[pp]) v = this.PP[pp][id];
  if (v) {
    if (v.note != undefined) r.note = v.note;
    if (v.ch != undefined) r.ch = v.ch;
  }
  if (r.note != undefined) return r;
}
Voice.prototype.dump = function() {
  var v, g, c;
  var X = {};
  var A = [];
  for (var pp of Object.keys(this.PP)) {
    for (var id of Object.keys(this.PP[pp])) {
      v = this.PP[pp][id];
      g = v.gr || 0;
      c = v.ch || 0;
      if (!X[g]) X[g] = {};
      if (!X[g][c]) X[g][c] = {};
      else if (X[g][c].bank != v.bank || X[g][c].prog != v.prog) console.log('Program mismatch: group ' + g + ', channel ' + c, X[g][c].bank, v.bank, X[g][c].prog, v.prog, X[g][c]);
      X[g][c] = { type: 'prog', gr: g, ch: c, bank: v.bank, prog: v.prog };
    }
  }
  for (g of Object.keys(X).sort()) for (c of Object.keys(X[g]).sort()) A.push(X[g][c]);
  return A;
}

function DOM(obj, sup) {
  if (typeof obj['#text'] != 'undefined') {
    this.tag = '#';
    this.val = obj['#text'];
  }
  else {
    for (var t of Object.keys(obj)) {
      if (t != ':@' && t != '#text') {
        this.tag = t;
      }
    }
    if (obj[':@']) {
      this.atr = {};
      for (var a of Object.keys(obj[':@'])) this.atr[a.substring(2)] = obj[':@'][a];
    }
    var sub = [];
    if (obj[this.tag]) for (var x of obj[this.tag]) sub.push(new DOM(x, this));
    if (sub.length) this.sub = sub;
  }
  if (sup) this.sup = sup;
  this.obj = obj;
}
DOM.prototype.get = function(...args) {
  if (!args.length) return [this];
  var a = [];
  var t = args.shift();
  if (this.sub) for (var x of this.sub) if (x.tag == t) a = a.concat(x.get(...args));
  return a;
}
DOM.prototype.attr = function(...args) {
  if (!args.length) return;
  var t = args.pop();
  var a = this.get(...args);
  if (a.length == 1 && a[0].atr) return a[0].atr[t];
}
DOM.prototype.value = function(...args) {
  args.push('#');
  var a = this.get(...args);
  if (a.length == 1) return a[0].val;
}

module.exports = MXML;