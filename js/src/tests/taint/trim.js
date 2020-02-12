function trimTaintTest() {
    var str = multiTaint(randomString(30).trim());
    var lpad = "      ";
    var rpad = "  " + taint("           ") + " ";
    var trimMe = lpad + str + rpad;
    assertLastTaintOperationEquals(trimMe.trim(), 'trim');
    assertEqualTaint(trimMe.trim(), str);
    assertNotHasTaintOperation(trimMe, 'trim');

    assertLastTaintOperationEquals(trimMe.trimLeft(), 'trimLeft');
    assertEqualTaint(trimMe.trimLeft(), str+rpad);
    assertNotHasTaintOperation(trimMe, 'trimLeft');

    assertLastTaintOperationEquals(trimMe.trimRight(), 'trimRight');
    assertEqualTaint(trimMe.trimRight(), lpad+str);
    assertNotHasTaintOperation(trimMe, 'trimRight');
}

runTaintTest(trimTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
