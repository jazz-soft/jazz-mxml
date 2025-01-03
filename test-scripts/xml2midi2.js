#!/usr/bin/env node
const fs = require('fs');
const MXML = require('../jazz-mxml');

if (process.argv.length < 3) {
  console.log('Usage: ' + process.argv[1].split(/[\\/]/).slice(-1) + ' <input> [<output>]');
  process.exit(0);
}

const input = process.argv[2];
const output = process.argv[3];

var data;
try {
  data = fs.readFileSync(input);
}
catch (e) {
  console.error('Cannot read file:', input);
  console.error(e.message);
  process.exit(1);
}

(async function() {
  var xml = new MXML(MXML.zipInfo(data) ? await MXML.unzip(data) : new TextDecoder().decode(data));
  if (!xml.isPartwise() && !xml.isTimewise()) {
    console.error('Not a valid MusicXML file:', input);
    process.exit(1);
  }
  data = xml.midi2();
  if (!data) {
    console.error('Cannot generate MIDI');
    process.exit(1);
  }
  try {
    if (output) fs.writeFileSync(output, data.dump(), 'binary');
    else console.log(data.toString());
  }
  catch (e) {
    console.error('Cannot write file:', output);
    console.error(e.message);
    process.exit(1);
  }
})();
