const fs = require('fs');
const MXML = require('../jazz-mxml');

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
    if (output) fs.writeFileSync(output, data);
    else console.log(data);
  }
  catch (e) {
    console.error('Cannot write file:', output);
    console.error(e.message);
    process.exit(1);
  }
})();
