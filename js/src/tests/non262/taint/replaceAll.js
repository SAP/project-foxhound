function strReplaceAllTest() {
    // Basic replaceAll() test
    var str = taint('asdf');
    var rep = str.replaceAll('s', '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    str = taint('asdfasdfasdfasdf');
    rep = str.replaceAll('s', '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test replacing with non-tainted characters
    str = taint('asdf');
    rep = str.replaceAll('s', 'x');
    assertRangesTainted(rep, [0, 1], [2, STR_END]);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test replacing with tainted characters
    str = taint('asdf');
    rep = str.replaceAll('s', taint('x'));
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test "untainting"
    str = 'foo' + taint('bar') + 'baz';
    rep = str.replaceAll('bar', '');
    assertNotTainted(rep);
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test removal of non-tainted parts
    rep = str.replaceAll('foo', '');
    assertRangeTainted(rep, [0, 3]);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    rep = str.replaceAll('foo', '').replaceAll('baz', '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test no match: the operation is recorded on the copy, not on the source
    var a = taint('a');
    var b = a.replaceAll('x', 'y');
    assertFullTainted(b);
    assertLastTaintOperationEquals(b, 'replaceAll');
    assertNotHasTaintOperation(a, 'replaceAll');

    // Test a search string longer than the subject
    b = a.replaceAll('xyz', 'y');
    assertFullTainted(b);
    assertLastTaintOperationEquals(b, 'replaceAll');
    assertNotHasTaintOperation(a, 'replaceAll');

    // Test the empty search string, which interleaves the replacement
    str = taint('ab');
    rep = str.replaceAll('', '-');
    assertRangesTainted(rep, [1, 2], [3, 4]);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test function call
    str = taint('aba');
    rep = str.replaceAll('a', x => x + 1);
    assertNotTainted(rep.substring(0, 2));
    assertRangeTainted(rep, [2, 3]);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    str = 'aba';
    rep = str.replaceAll(taint('a'), x => x + 1);
    assertRangesTainted(rep, [0, 1], [3, 4]);
    assertLastTaintOperationEquals(rep, 'replaceAll');

    // Test global regex removal
    str = '000' + taint('asdf') + '111';
    rep = str.replaceAll(/\d+/g, '');
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    rep = str.replaceAll(/[a-z]+/g, '');
    assertNotTainted(rep);
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test global regex with a function replacement
    str = taint('aba');
    rep = str.replaceAll(/a/g, x => x + 1);
    assertRangesTainted(rep, [0, 1], [2, 4]);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');

    // Test a user-defined @@replace
    str = taint('asdf');
    var searcher = {
        [Symbol.replace](s, r) {
            return s + r;
        },
    };
    rep = str.replaceAll(searcher, taint('x'));
    assertFullTainted(rep);
    assertLastTaintOperationEquals(rep, 'replaceAll');
    assertNotHasTaintOperation(str, 'replaceAll');
}

runTaintTest(strReplaceAllTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
