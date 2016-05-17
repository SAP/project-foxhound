function strReplaceTest() {
    // Basic replace() test
    var str = taint('asdf');
    assertFullTainted(str.replace('s', ''));
    str = taint('asdfasdfasdfasdf');
    assertFullTainted(str.replace('s', ''));

    // Test replacing with non-tainted characters
    str = taint('asdf');
    assertRangesTainted(taintStr.replace('s', 'x'), [0, 1], [2, STR_END]);

    // Test replacing with tainted characters
    str = taint('asdf');
    assertFullTainted(taintStr.replace('s', taint('x')));

    // Test "untainting"
    str = 'foo' + taint('bar') + 'baz';
    assertNotTainted(str.replace('bar', ''));

    // Test removal of non-tainted parts
    assertRangeTainted(str.replace('foo', ''), [0, 3]);
    assertRangeTainted(str.replace('baz', ''), [3, 6]);
    assertFullTainted(str.replace('foo', '').replace('baz', ''));

    // Test regex removal
    str = '000' + taint('asdf') + '111';
    assertFullTainted(str.replace(/\d+/, ''));
    assertNotTainted(str.replace(/\[a-z]+/, ''));
}

runTaintTest(strReplaceTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
