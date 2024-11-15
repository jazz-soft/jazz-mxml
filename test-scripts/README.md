# test scripts

## xml2mxl
Convert (uncompressed) MusicXML to (compressed) MXL:  
`node xml2mxl.js <input.xml> <output.mxl>`

## mxl2xml
Convert (compressed) MXL to (uncompressed) MusicXML:  
`node mxl2xml.js <input.mxl> <output.xml>`  
If the output file is not specified, print to standard output.

## part2time
Convert partwise MusicXML to timewise MusicXML:  
`node part2time.js <input.xml> <output.xml>`  
If the output file is not specified, print to standard output.

## time2part
Convert timewise MusicXML to partwise MusicXML:  
`node time2part.js <input.xml> <output.xml>`  
If the output file is not specified, print to standard output.

## note:
To use these as standalone scripts, run `npm install jazz-mxml`,  
and change `const MXML = require('../jazz-mxml');` to `const MXML = require('jazz-mxml');`