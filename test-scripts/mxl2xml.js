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
  try {
    data = await MXML.unzip(data);
  }
  catch (e) {
    console.error('Cannot uncompress file:', input);
    console.error(e.message);
    process.exit(1);
  }
  try {
    if (output) fs.writeFileSync(output, data, 'utf8');
    else console.log(data);
  }
  catch (e) {
    console.error('Cannot write file:', output);
    console.error(e.message);
    process.exit(1);
  }
})();
