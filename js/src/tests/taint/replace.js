function strReplaceTest() {
    // Basic replace() test
    var str = taint('asdf');
    var rep = str.replace('s', '');
    assertFullTainted(rep);
    str = taint('asdfasdfasdfasdf');
    rep = str.replace('s', '');
    assertFullTainted(rep);

    // Test replacing with non-tainted characters
    str = taint('asdf');
    rep = str.replace('s', 'x');
    assertRangesTainted(rep, [0, 1], [2, STR_END]);
    assertLastTaintOperationEquals(rep, 'replace');

    // Test replacing with tainted characters
    str = taint('asdf');
    rep = str.replace('s', taint('x'));
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replace');

    // Test "untainting"
    str = 'foo' + taint('bar') + 'baz';
    rep = str.replace('bar', '');
    assertNotTainted(rep);

    // Test removal of non-tainted parts
    rep = str.replace('foo', '');
    assertRangeTainted(rep, [0, 3]);
    rep = str.replace('baz', '');
    assertRangeTainted(rep, [3, 6]);
    rep = str.replace('foo', '').replace('baz', '');
    assertFullTainted(rep);
    // TODO check operation

    // Test regex removal
    str = '000' + taint('asdf') + '111';
    rep = str.replace(/\d+/, '');
    assertRangeTainted(rep, [0, 4]);
    rep = str.replace(/\d+/g, '');
    assertFullTainted(rep);
    rep = str.replace(/[a-z]+/, '');
    assertNotTainted(rep);
    // TODO check operation
}

runTaintTest(strReplaceTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
