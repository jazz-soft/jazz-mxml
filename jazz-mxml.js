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

module.exports = MXML;