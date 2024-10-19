const FXP = require('fast-xml-parser');
const specs = require('./specs.js');

const parser = new FXP.XMLParser({ ignoreAttributes: false });

function MXML(s) {
  if (!s || FXP.XMLValidator.validate(s) !== true) return;
  var xml = parser.parse(s);
  if (!xml['score-partwise'] && !xml['score-timewise']) return;
  this.txt = s;
  this.xml = parser.parse(s);
//console.log('XML:', this.xml);
}
MXML.prototype.isValid = function() { return !!this.xml; };
MXML.prototype.isPartwise = function() { return this.isValid() && !!this.xml['score-partwise']; };
MXML.prototype.isTimewise = function() { return this.isValid() && !!this.xml['score-timewise']; };

module.exports = MXML;