function charConversionTest() {
    var str = randomMultiTaintedString();

    // Ensure at least one upper and one lower case character
    str = 'Ab' + str + String.tainted('aB');

    var lower = str.toLowerCase();
    var upper = str.toUpperCase();

    assertLastTaintOperationEquals(lower, 'toLowerCase');
    assertLastTaintOperationEquals(upper, 'toUpperCase');

    assertEqualTaint(lower, str);
    assertEqualTaint(upper, str);

    // Ensure taint operation is present even if string is all lower case already
    str = taint('asdf');
    lower = str.toLowerCase();
    assertLastTaintOperationEquals(lower, 'toLowerCase');
    assertNotHasTaintOperation(str, 'toLowerCase');
    assertEqualTaint(lower, str);

    // Ensure taint operation is present even if string is all upper case already
    str = taint('ASDF');
    upper = str.toUpperCase();
    assertLastTaintOperationEquals(upper, 'toUpperCase');
    assertNotHasTaintOperation(str, 'toUpperCase');
    assertEqualTaint(upper, str);
}

// The conversions used to hand back their own input when nothing changed, and
// then record the operation on it, and they read unrooted pointers across the
// allocations the operation needs. Run them hot enough for the GC to move a
// string mid-call.
function charConversionGCTest() {
    var run = function(fn) {
        var r;
        for (var i = 0; i < 20000; i++) {
            r = fn(taint('abc'));
        }
        return r;
    };
    var cases = [
        ['toLowerCase', s => s.toLowerCase()],
        ['toUpperCase', s => s.toUpperCase()],
        ['toLocaleLowerCase', s => s.toLocaleLowerCase()],
        ['toLocaleUpperCase', s => s.toLocaleUpperCase()],
    ];
    for (var i = 0; i < cases.length; i++) {
        var fn = cases[i][1];
        fn(taint('abc'));
        assertFullTainted(run(fn));
    }
}

runTaintTest(charConversionTest);

// Not through runTaintTest: this one drives its own warmup loop.
charConversionGCTest();

if (typeof reportCompare === 'function')
  reportCompare(true, true);
