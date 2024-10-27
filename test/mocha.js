const fs = require('fs');
const assert = require('assert');
const MXML = require('..');
const specs = require('../specs.js');

const partwise = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>';
const timewise = '<?xml version="1.0" encoding="UTF-8" standalone="no"?><score-timewise version="4.0"><part-list><score-part id="P1"><part-name>Music</part-name></score-part></part-list><measure number="1"><part id="P1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note></part></measure></score-timewise>';

describe('constructor', function() {
  it('empty', function() {
    var X = new MXML(0);
    assert.equal(X.isValid(), false);
    assert.equal(X.isPartwise(), false);
    assert.equal(X.isTimewise(), false);
    assert.equal(X.isOpus(), false);
    assert.equal(X.isMei(), false);
  });
  it('garbage', function() {
    var X = new MXML('garbage');
    assert.equal(X.isValid(), false);
  });
  it('partwise', function() {
    var X = new MXML(partwise);
    assert.equal(X.isValid(), true);
    assert.equal(X.isPartwise(), true);
    assert.equal(X.isTimewise(), false);
  });
  it('timewise', function() {
    var X = new MXML(timewise);
    assert.equal(X.isValid(), true);
    assert.equal(X.isPartwise(), false);
    assert.equal(X.isTimewise(), true);
  });
  it('other xml', function() {
    var X = new MXML(specs.p2t_xsl);
    assert.equal(X.isValid(), false);
  });
});

describe('files', function() {
  it('xml-partwise', function() {
    var data = fs.readFileSync(__dirname + '/data/1.xml', 'utf8');
    var X = new MXML(data);
    assert.equal(X.isValid(), true);
    assert.equal(X.isPartwise(), true);
    assert.equal(X.isTimewise(), false);
    assert.equal(X.isOpus(), false);
    assert.equal(X.isMei(), false);
  });
  it('xml-opus', function() {
    var data = fs.readFileSync(__dirname + '/data/opus.xml', 'utf8');
    var X = new MXML(data);
    assert.equal(X.isValid(), true);
    assert.equal(X.isPartwise(), false);
    assert.equal(X.isTimewise(), false);
    assert.equal(X.isOpus(), true);
    assert.equal(X.isMei(), false);
  });
  it('mei', function() {
    var data = fs.readFileSync(__dirname + '/data/1.mei', 'utf8');
    var X = new MXML(data);
    assert.equal(X.isValid(), true);
    assert.equal(X.isPartwise(), false);
    assert.equal(X.isTimewise(), false);
    assert.equal(X.isOpus(), false);
    assert.equal(X.isMei(), true);
  });
});

describe('utils', function() {
  it('validate', function() {
    var X = new MXML(partwise);
    assert.equal(X.validate(), true);
    assert.equal(MXML.validate('').err.code, 'InvalidXml');
  });
  it('format', function() {
    var X = new MXML(partwise);
    assert.equal(X.txt.length, 508);
    assert.equal(X.format().length, 754);
  });
  it('part2time', function() {
    var X = new MXML(partwise);
    assert.equal(X.part2time(), undefined);
  });
  it('time2part', function() {
    var X = new MXML(timewise);
    assert.equal(X.time2part(), undefined);
  });
});
