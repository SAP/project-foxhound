function trimTaintTest() {
    var str = multiTaint(randomString(30).trim());
    var lpad = "      ";
    var rpad = "  " + taint("           ") + " ";
    var trimMe = lpad + str + rpad;
    assertLastTaintOperationEquals(trimMe.trim(), 'trim');
    assertEqualTaint(trimMe.trim(), str);
    assertNotHasTaintOperation(trimMe, 'trim');

    assertLastTaintOperationEquals(trimMe.trimStart(), 'trimStart');
    assertEqualTaint(trimMe.trimLeft(), str+rpad);
    assertNotHasTaintOperation(trimMe, 'trimStart');

    assertLastTaintOperationEquals(trimMe.trimEnd(), 'trimEnd');
    assertEqualTaint(trimMe.trimRight(), lpad+str);
    assertNotHasTaintOperation(trimMe, 'trimEnd');
}

function trimLeftTaintTest() {
  var str = multiTaint(randomString(30).trim());
  var lpad = "      ";
  var rpad = "  " + taint("           ") + " ";
  var trimMe = lpad + str + rpad;

  // trimLeft is now deprecated and just redirected to trimStart
  assertLastTaintOperationEquals(trimMe.trimLeft(), 'trimStart');
  assertEqualTaint(trimMe.trimLeft(), str+rpad);
  assertNotHasTaintOperation(trimMe, 'trimStart');
}

function trimRightTaintTest() {
  var str = multiTaint(randomString(30).trim());
  var lpad = "      ";
  var rpad = "  " + taint("           ") + " ";
  var trimMe = lpad + str + rpad;

  // trimRight is now deprecated and just redirected to trimEnd
  assertLastTaintOperationEquals(trimMe.trimRight(), 'trimEnd');
  assertEqualTaint(trimMe.trimRight(), lpad+str);
  assertNotHasTaintOperation(trimMe, 'trimEnd');
}

function trimStartTaintTest() {
  var str = multiTaint(randomString(30).trim());
  var lpad = "      ";
  var rpad = "  " + taint("           ") + " ";
  var trimMe = lpad + str + rpad;

  assertLastTaintOperationEquals(trimMe.trimStart(), 'trimStart');
  assertEqualTaint(trimMe.trimStart(), str+rpad);
  assertNotHasTaintOperation(trimMe, 'trimStart');
}

function trimEndTaintTest() {
  var str = multiTaint(randomString(30).trim());
  var lpad = "      ";
  var rpad = "  " + taint("           ") + " ";
  var trimMe = lpad + str + rpad;

  assertLastTaintOperationEquals(trimMe.trimEnd(), 'trimEnd');
  assertEqualTaint(trimMe.trimEnd(), lpad+str);
  assertNotHasTaintOperation(trimMe, 'trimEnd');
}

runTaintTest(trimTaintTest);
runTaintTest(trimLeftTaintTest);
runTaintTest(trimRightTaintTest);
runTaintTest(trimStartTaintTest);
runTaintTest(trimEndTaintTest);


if (typeof reportCompare === "function")
  reportCompare(true, true);
