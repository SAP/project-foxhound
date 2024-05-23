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

function trimLeftTaintTest() {
  var str = multiTaint(randomString(30).trim());
  var lpad = "      ";
  var rpad = "  " + taint("           ") + " ";
  var trimMe = lpad + str + rpad;

  assertLastTaintOperationEquals(trimMe.trimLeft(), 'trimLeft');
  assertEqualTaint(trimMe.trimLeft(), str+rpad);
  assertNotHasTaintOperation(trimMe, 'trimLeft');
}

function trimRightTaintTest() {
  var str = multiTaint(randomString(30).trim());
  var lpad = "      ";
  var rpad = "  " + taint("           ") + " ";
  var trimMe = lpad + str + rpad;

  assertLastTaintOperationEquals(trimMe.trimRight(), 'trimRight');
  assertEqualTaint(trimMe.trimRight(), lpad+str);
  assertNotHasTaintOperation(trimMe, 'trimRight');
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

//runTaintTest(trimTaintTest);
runTaintTest(trimLeftTaintTest);
runTaintTest(trimRightTaintTest);
runTaintTest(trimStartTaintTest);
runTaintTest(trimEndTaintTest);


if (typeof reportCompare === "function")
  reportCompare(true, true);
