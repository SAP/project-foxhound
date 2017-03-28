function trimTaintTest() {
    var str = multiTaint(randomString(30).trim());
    var lpad = "      ";
    var rpad = "  " + taint("           ") + " ";
    var trimMe = lpad + str + rpad;
    assertEqualTaint(trimMe.trim(), str);
    assertLastTaintOperationEquals(trimMe.trim(), 'trim');

    assertEqualTaint(trimMe.trimLeft(), str+rpad);
    assertLastTaintOperationEquals(trimMe.trimLeft(), 'trimLeft');

    assertEqualTaint(trimMe.trimRight(), lpad+str);
    assertLastTaintOperationEquals(trimMe.trimRight(), 'trimRight');
}

runTaintTest(trimTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
