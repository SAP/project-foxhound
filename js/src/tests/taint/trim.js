function trimTaintTest() {
    var str = multiTaint(randomString(30).trim());
    var lpad = "      ";
    var rpad = "  " + taint("           ") + " ";
    var trimMe = lpad + str + rpad;
    assertEqualTaint(trimMe.trim(), str);
    assertLastTaintOperationEquals(trimMe.trim(), 'trim');
    assertNotHasTaintOperation(trimMe, 'trim');

    assertEqualTaint(trimMe.trimLeft(), str+rpad);
    assertLastTaintOperationEquals(trimMe.trimLeft(), 'trimLeft');
    assertNotHasTaintOperation(trimMe, 'trimLeft');

    assertEqualTaint(trimMe.trimRight(), lpad+str);
    assertLastTaintOperationEquals(trimMe.trimRight(), 'trimRight');
    assertNotHasTaintOperation(trimMe, 'trimRight');
}

runTaintTest(trimTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
