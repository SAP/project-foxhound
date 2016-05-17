function charConversionTest() {
    var str = randomMultiTaintedString();

    var lower = str.toLowerCase();
    var upper = str.toUpperCase();

    assertHasTaintOperation(lower, 'toLowerCase');
    assertHasTaintOperation(upper, 'toUpperCase');

    assertEqualTaint(lower, str);
    assertEqualTaint(upper, str);
}

runTaintTest(charConversionTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
