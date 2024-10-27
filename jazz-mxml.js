const FXP = require('fast-xml-parser');
const specs = require('./specs.js');

const parser = new FXP.XMLParser({ ignoreAttributes: false });
const builder = new FXP.XMLBuilder({ ignoreAttributes: false, format: true });

function MXML(s) {
  if (!s || FXP.XMLValidator.validate(s) !== true) return;
  var xml = parser.parse(s);
  if (!xml['score-partwise'] && !xml['score-timewise'] && !xml['opus'] && !xml['mei']) return;
  this.txt = s;
  this.xml = parser.parse(s);
}
MXML.prototype.isValid = function() { return !!this.xml; };
MXML.prototype.isPartwise = function() { return this.isValid() && !!this.xml['score-partwise']; };
MXML.prototype.isTimewise = function() { return this.isValid() && !!this.xml['score-timewise']; };
MXML.prototype.isOpus = function() { return this.isValid() && !!this.xml['opus']; };
MXML.prototype.isMei = function() { return this.isValid() && !!this.xml['mei']; };
MXML.prototype.part2time = function() {};
MXML.prototype.time2part = MXML.prototype.part2time;
MXML.prototype.format = function () { return builder.build(this.xml); };
MXML.validate = function(s) { return FXP.XMLValidator.validate(s); };
MXML.prototype.validate = function () { return MXML.validate(this.txt); };

if (typeof DOMParser != 'undefined') {
  const dom_parser = new DOMParser();
  const xml_serial = new XMLSerializer();
  const xsl_p2t = new XSLTProcessor();
  const xsl_t2p = new XSLTProcessor();
  xsl_p2t.importStylesheet(dom_parser.parseFromString(specs.p2t_xsl, "text/xml"));
  xsl_t2p.importStylesheet(dom_parser.parseFromString(specs.t2p_xsl, "text/xml"));
  MXML.prototype.part2time = function() {
    if (this.isPartwise()) return xml_serial.serializeToString(xsl_p2t.transformToDocument(dom_parser.parseFromString(this.getText(), "text/xml")));
  };
  MXML.prototype.time2part = function() {
    if (this.isTimewise()) return xml_serial.serializeToString(xsl_t2p.transformToDocument(dom_parser.parseFromString(this.getText(), "text/xml")));
  };
}

var tostring, inflate;
if (typeof DecompressionStream != 'undefined') {
  inflate = async function(b) {
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(b);
    writer.close();
    return await new Response(ds.readable).arrayBuffer();
  };
  tostring = function(x) { return new TextDecoder().decode(x); };
}
else {
  const zlib = require('zlib');
  inflate = function(b) { return zlib.inflateRawSync(b); };
  tostring = function(x) { return String(x); };
}

function n2(b, n) { return b[n] + b[n + 1] * 0x100; }
function n4(b, n) { return b[n] + b[n + 1] * 0x100 + b[n + 2] * 0x10000 + b[n + 3] * 0x1000000; }
function dos2date(n) {
  return new Date((n >> 25) + 1980, ((n >> 21) & 15) - 1, (n >> 16) & 31, (n >> 11) & 31, (n >> 5) & 63, (n & 31) << 1);
}
function date2dos(d) {
  return (d.getSeconds() >> 1) + (d.getMinutes() << 5) + (d.getHours() << 11) + (d.getDate() << 16) + ((d.getMonth() + 1) << 21) + ((d.getFullYear() - 1980) << 25);
}
const meta_inf = 'META-INF/container.xml';
MXML.zipInfo = function(data) {
  const inf = zipInfo(data);
  if (inf) {
    var a = [];
    for (var k of inf.FFF) a.push({ name: k, size: inf.FF[k].size, date: inf.FF[k].date });
    return a;
  }
}
MXML.unzip = async function(data) {
  const inf = zipInfo(data);
  if (!inf) return;
  var FF = inf.FF;
  var FFF = inf.FFF;
  var a, k, s, s0, s1, s2, x;
  if (FF[meta_inf]) {
    a = [];
    x = parse(decompress(data, FF[meta_inf]));
    traverse(x, find('rootfile', function(x) { if (x['@_full-path']) a.push(x['@_full-path']); }));
    if (a.length) FFF = a;
  }
  for (k of FFF) {
    if (k == meta_inf) continue;
    s = await decompress(data, FF[k]);
    if (!s) continue;
    s = String(s);
    if (!s0) s0 = s;
    x = parse(s);
    if (!x) continue;
    if (!s1) s1 = s;
    if (x['score-partwise'] || x['score-timewise']) return s;
    if (x['opus'] && !s2) s2 = s;
  }
  return s2 || s1 || s0;
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
      console.log('bad zip file');
      return;
    }
    fnlen = n2(data, n + 28);
    exlen = n2(data, n + 30);
    cmlen = n2(data, n + 32);
    fname = tostring(data.subarray(n + 46, n + 46 + fnlen));
    m = n4(data, n + 42);
    if (n4(data, m) != 0x4034b50) {
      console.log('bad zip file');
      return;
    }
    FFF.push(fname);
    FF[fname] = { off: m + 30 + n2(data, m + 26) + n2(data, m + 28), len: n4(data, m + 18), size: n4(data, m + 22), date: dos2date(n4(data, m + 10)), comp: n2(data, m + 8) };
    n += 46 + fnlen + exlen + cmlen;
  }
  if (FFF.length) return { FFF: FFF, FF: FF };
}
async function decompress(data, x) {
  var b = data.subarray(x.off, x.off + x.len);
  if (x.comp == 0) {
    return tostring(b);
  }
  else if (x.comp == 8) {
    try {
      return tostring(await inflate(b));
    }
    catch (e) {
      console.log('decompress:', e.message);
      return;
    }
  }
  else {
    console.log('compression method not supported:', x.comp);
  }
}
function parse(xml) {
  try {
    if (FXP.XMLValidator.validate(xml) == true) return parser.parse(xml);
  }
  catch (e) {/**/}
}
function traverse(x, f) {
  if (Array.isArray(x)) for (var y of x) traverse(y, f);
  if (typeof x != 'object') return;
  f(x);
  for (var k of Object.keys(x)) traverse(x[k], f);
}
function find(n, f) {
  return function(x) {
    x = x[n];
    if (Array.isArray(x)) for (var y of x) f(y);
    else if (typeof x == 'object') f(x);
  };
}

module.exports = MXML;