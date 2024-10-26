const FXP = require('fast-xml-parser');
const specs = require('./specs.js');

const parser = new FXP.XMLParser({ ignoreAttributes: false });
const builder = new FXP.XMLBuilder({ ignoreAttributes: false, format: true });

function MXML(s) {
  if (!s || FXP.XMLValidator.validate(s) !== true) return;
  var xml = parser.parse(s);
  if (!xml['score-partwise'] && !xml['score-timewise']) return;
  this.txt = s;
  this.xml = parser.parse(s);
}
MXML.prototype.isValid = function() { return !!this.xml; };
MXML.prototype.isPartwise = function() { return this.isValid() && !!this.xml['score-partwise']; };
MXML.prototype.isTimewise = function() { return this.isValid() && !!this.xml['score-timewise']; };
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
  xsl_p2t.importStylesheet(parser.parseFromString(specs.p2t, "text/xml"));
  xsl_t2p.importStylesheet(parser.parseFromString(specs.t2p, "text/xml"));
  MXML.prototype.part2time = function() {
    if (this.isPartwise()) return xml_serial.serializeToString(xsl_p2t.transformToDocument(dom_parser.parseFromString(this.getText(), "text/xml")));
  };
  MXML.prototype.time2part = function() {
    if (this.isTimewise()) return xml_serial.serializeToString(xsl_t2p.transformToDocument(dom_parser.parseFromString(this.getText(), "text/xml")));
  };
}

function n2(b, n) { return b[n] + b[n + 1] * 0x100; }
function n4(b, n) { return b[n] + b[n + 1] * 0x100 + b[n + 2] * 0x10000 + b[n + 3] * 0x1000000; }
function dos2date(n) {
  return new Date((n >> 25) + 1980, ((n >> 21) & 15) - 1, (n >> 16) & 31, (n >> 11) & 31, (n >> 5) & 63, (n & 31) << 1);
}
function date2dos(d) {
  return (d.getSeconds() >> 1) + (d.getMinutes() << 5) + (d.getHours() << 11) + (d.getDate() << 16) + ((d.getMonth() + 1) << 21) + ((d.getFullYear() - 1980) << 25);
}
MXML.unzip = function(data) {
  var i, k, m, n, s;
  var nrec, fnlen, exlen, cmlen, fname;
  var FF = {};
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
    fname = String(data.subarray(n + 46, n + 46 + fnlen));
    m = n4(data, n + 42);
    if (n4(data, m) != 0x4034b50) {
      console.log('bad zip file');
      return;
    }
    FF[fname] = { off: m + 30 + n2(data, m + 26) + n2(data, m + 28), len: n4(data, m + 18), comp: n2(data, m + 8) };
    n += 46 + fnlen + exlen + cmlen;
  }
  k = Object.keys(FF);
  if (FF['META-INF/container.xml']) {
    s = decompress(data, FF['META-INF/container.xml']);
//console.log(s);
  }
  else {
    s = k[0];
  }
  if (FF[s]) return decompress(data, FF[s]);
}
function decompress(data, x) {
  var b = data.subarray(x.off, x.off + x.len);
  if (x.comp == 0) {
    return String(b);
  }
  else if (x.comp == 8) {
    var zlib = require('zlib');
    try {
      return String(zlib.inflateRawSync(b));
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

module.exports = MXML;