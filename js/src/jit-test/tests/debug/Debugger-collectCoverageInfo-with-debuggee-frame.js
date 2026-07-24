// Test that collectCoverageInfo cannot be changed when debuggee frames are on the stack.

var g = newGlobal({ newCompartment: true });
var dbg = new Debugger(g);

// Test 1: Cannot enable collectCoverageInfo while debuggee frame is on stack
g.evaluate(`
  function testFunc() {
    return 42;
  }
`);

var enableAttempted = false;
dbg.onDebuggerStatement = function(frame) {
  var caught = false;
  try {
    dbg.collectCoverageInfo = true;
    enableAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(enableAttempted, false);
};

g.evaluate(`
  function enableTest() {
    debugger;
  }
  enableTest();
`);

dbg.onDebuggerStatement = undefined;

// Test 2: Cannot disable collectCoverageInfo while debuggee frame is on stack
dbg.collectCoverageInfo = true;

var disableAttempted = false;
dbg.onDebuggerStatement = function(frame) {
  var caught = false;
  try {
    dbg.collectCoverageInfo = false;
    disableAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(disableAttempted, false);
};

g.evaluate(`
  function disableTest() {
    debugger;
  }
  disableTest();
`);

dbg.onDebuggerStatement = undefined;

// Test 3: Can disable collectCoverageInfo when no debuggee frames are on stack
dbg.collectCoverageInfo = false;

// Test 4: Can enable collectCoverageInfo when no debuggee frames are on stack
dbg.collectCoverageInfo = true;
dbg.collectCoverageInfo = false;
