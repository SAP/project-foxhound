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
}

runTaintTest(charConversionTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
