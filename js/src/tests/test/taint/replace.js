function strReplaceTest() {
    // Basic replace() test
    var str = taint('asdf');
    var rep = str.replace('s', '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replace');
    str = taint('asdfasdfasdfasdf');
    rep = str.replace('s', '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    // Test replacing with non-tainted characters
    str = taint('asdf');
    rep = str.replace('s', 'x');
    assertRangesTainted(rep, [0, 1], [2, STR_END]);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    // Test replacing with tainted characters
    str = taint('asdf');
    rep = str.replace('s', taint('x'));
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    // Test "untainting"
    str = 'foo' + taint('bar') + 'baz';
    rep = str.replace('bar', '');
    assertNotTainted(rep);
    assertNotHasTaintOperation(str, 'replace');

    // Test removal of non-tainted parts
    rep = str.replace('foo', '');
    assertRangeTainted(rep, [0, 3]);
    assertLastTaintOperationEquals(rep, 'replace');
    rep = str.replace('baz', '');
    assertRangeTainted(rep, [3, 6]);
    assertLastTaintOperationEquals(rep, 'replace');
    rep = str.replace('foo', '').replace('baz', '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    // Test regex removal
    str = '000' + taint('asdf') + '111';
    rep = str.replace(/\d+/, '');
    assertRangeTainted(rep, [0, 4]);
    assertLastTaintOperationEquals(rep, 'replace');
    rep = str.replace(/\d+/g, '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replace');
    rep = str.replace(/[a-z]+/, '');
    assertNotTainted(rep);
    assertNotHasTaintOperation(str, 'replace');

    // Test no replace
    var a = taint("a");
    var b = a.replace("x", "y");
    assertNotHasTaintOperation(a, 'replace');
    assertLastTaintOperationEquals(b, 'replace');

    // Test function call
    str = taint("aba");
    rep = str.replace("a", x => x+1)
    assertNotTainted(rep.substring(0,2));
    assertRangeTainted(rep, [2, 4]);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    str = "aba";
    rep = str.replace(taint("a"), x => x+1)
    assertNotTainted(rep.substring(2,2));
    assertRangeTainted(rep, [0, 1]);
    assertLastTaintOperationEquals(rep, 'replace');

    str = taint("aba");
    rep = str.replace(taint("a"), x => x+1)
    assertNotTainted(rep.substring(1,1));
    assertRangeTainted(rep, [0, 1]);
    assertRangeTainted(rep, [2, 4]);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    str = taint("aba");
    rep = str.replace(taint("a"), x => x+x)
    assertFullTainted(rep)
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');

    str = taint("aba");
    rep = str.replace(/a/g, x => x+1)
    assertRangeTainted(rep, [2, 4]);
    assertLastTaintOperationEquals(rep, 'replace');
    assertNotHasTaintOperation(str, 'replace');
}

function whiteSpaceRegExReplaceTest() {
  var url = taint("https://www.sap.com");
  var input = url.replace(/^[ \t\r\n\f]+|[ \t\r\n\f]+$/g,"");
  console.log(input);
  assertFullTainted(input);
}

runTaintTest(strReplaceTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
