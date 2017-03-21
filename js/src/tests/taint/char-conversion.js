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
    assertEqualTaint(lower, str);
}

runTaintTest(charConversionTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
