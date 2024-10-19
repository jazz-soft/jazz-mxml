const fs = require('fs');
const {XMLParser, XMLBuilder} = require('fast-xml-parser');

var i;
var body = [];
body.push("const mxml_xsd = '" + read_xml('musicxml.xsd') + "';");
body.push("const p2t_xsl = '" + read_xml('parttime.xsl') + "';");
body.push("const t2p_xsl = '" + read_xml('timepart.xsl') + "';");

const lines = fs.readFileSync('specs.txt', 'utf8').split(/\r?\n/);
for (i = 0; i < lines.length; i++) if (lines[i] == '<BODY>') lines[i] = body.join('\n');
fs.writeFileSync('../specs.js', lines.join('\n'), 'utf8');

function read_xml(fname) {
  const data = fs.readFileSync(fname, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false });
  const builder = new XMLBuilder({ ignoreAttributes: false });
  const xml = parser.parse(data);
  traverse(xml, function(x) { delete x['xs:annotation']});
  return builder.build(xml);
}
function traverse(x, f) {
  if (Array.isArray(x)) for (var y of x) traverse(y, f);
  if (typeof x != 'object') return; 
  f(x);
  for (var k of Object.keys(x)) traverse(x[k], f);
}