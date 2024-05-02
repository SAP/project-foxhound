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
    // I think this is currently impossible as the original string is returned if
    // there are no letters to be changed - we can't copy the string
    // assertNotHasTaintOperation(str, 'toLowerCase');
    assertEqualTaint(lower, str);

    // Ensure taint operation is present even if string is all upper case already
    str = taint('ASDF');
    upper = str.toUpperCase();
    assertLastTaintOperationEquals(upper, 'toUpperCase');
    // I think this is currently impossible as the original string is returned if
    // there are no letters to be changed - we can't copy the string
    //    assertNotHasTaintOperation(str, 'toUpperCase');
    assertEqualTaint(upper, str);
}

runTaintTest(charConversionTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
