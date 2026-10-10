function matchTest() {
    var a = 'Hello ';
    var b = taint('tainted');
    var c = ' World!';
    var str = a + b + c;

    // A flat match is a slice of the subject, so it carries the subject's
    // taint. It used to reuse the pattern string instead.
    var match = str.match(b)[0];
    assertEqualTaint(b, match);
    assertLastTaintOperationEquals(match, 'match');
    assertNotHasTaintOperation(str, 'match');

    // Same, with an untainted pattern: the match still comes from the subject.
    match = str.match('tainted')[0];
    assertEqualTaint(b, match);
    assertLastTaintOperationEquals(match, 'match');
    assertNotHasTaintOperation(str, 'match');

    // The reverse: a tainted pattern must not make a match of an untainted
    // subject look tainted.
    assertNotTainted('Hello tainted World!'.match(b)[0]);

    // Test basic regex matching
    match = str.match(/t.*ed/)[0];
    assertEqualTaint(b, match);
    assertLastTaintOperationEquals(match, 'match');
    assertNotHasTaintOperation(str, 'match');

    // Test capture groups
    match = str.match(/ (\w+) /);
    assertEqualTaint(b, match[0].substring(1, match[0].length -1));
    assertEqualTaint(b, match[1]);
    assertNotHasTaintOperation(str, 'match');

    // Test global matches
    match = str.match(/\w+/g);
    assertEqualTaint(b, match[1]);
    assertLastTaintOperationEquals(match[1], 'match');
    assertNotHasTaintOperation(str, 'match');

    // The optimizable-regexp fast path used to record no operation at all.
    assertLastTaintOperationEquals(str.match(/t.*ed/)[0], 'match');
    assertLastTaintOperationEquals(str.match(/\w+/g)[1], 'match');
    assertLastTaintOperationEquals(str.match(/ (\w+) /)[1], 'match');
}

runTaintTest(matchTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);

