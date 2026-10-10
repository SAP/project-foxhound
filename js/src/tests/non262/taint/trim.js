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

// Warp used to transpile the trim inline cache into an inline substring, which
// carried the taint but recorded no operation, so a trim vanished from a flow
// once the surrounding script got hot. Drives its own loop, since runTaintTest's
// warmup is not enough to get the call inlined.
function trimJITTest() {
    var run = function(fn) {
        var r;
        for (var i = 0; i < 20000; i++) {
            r = fn(taint('abc'));
        }
        return r;
    };
    var cases = [
        ['trim', s => (' ' + s + ' ').trim()],
        ['trimStart', s => (' ' + s).trimStart()],
        ['trimEnd', s => (s + ' ').trimEnd()],
    ];
    for (var i = 0; i < cases.length; i++) {
        var name = cases[i][0], fn = cases[i][1];
        assertLastTaintOperationEquals(fn(taint('abc')), name);
        assertLastTaintOperationEquals(run(fn), name);
    }
}

trimJITTest();

runTaintTest(trimTaintTest);
runTaintTest(trimLeftTaintTest);
runTaintTest(trimRightTaintTest);
runTaintTest(trimStartTaintTest);
runTaintTest(trimEndTaintTest);


if (typeof reportCompare === "function")
  reportCompare(true, true);
