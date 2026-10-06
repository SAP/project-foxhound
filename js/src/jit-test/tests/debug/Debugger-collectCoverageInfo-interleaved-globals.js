// Test that collectCoverageInfo cannot be changed when debuggee frames are on
// the stack, even with multiple interleaved globals where only some are debuggees.

var g1 = newGlobal({ newCompartment: true });
var g2 = newGlobal({ newCompartment: true });
var g3 = newGlobal({ newCompartment: true });

var dbg = new Debugger();

// Add g1 and g3 as debuggees, but not g2
dbg.addDebuggee(g1);
dbg.addDebuggee(g3);

// Set up functions in each global that call into the next
g1.g2 = g2;
g2.g3 = g3;

g1.evaluate(`
  function func1() {
    return g2.func2();
  }
`);

g2.evaluate(`
  function func2() {
    return g3.func3();
  }
`);

g3.evaluate(`
  function func3() {
    debugger;
    return 42;
  }
`);

// Test 1: Cannot enable collectCoverageInfo while interleaved debuggee frames
// are on stack (g1 -> g2 -> g3, where g1 and g3 are debuggees but g2 is not)
var enableAttempted = false;
dbg.onDebuggerStatement = function() {
  // At this point, the stack is:
  // g3.func3 (debuggee) -> g2.func2 (non-debuggee) -> g1.func1 (debuggee)

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

g1.func1();

dbg.onDebuggerStatement = undefined;

// Test 2: Cannot disable collectCoverageInfo while interleaved debuggee frames
// are on stack
dbg.collectCoverageInfo = true;

var disableAttempted = false;
dbg.onDebuggerStatement = function() {
  // Stack: g3.func3 (debuggee) -> g2.func2 (non-debuggee) -> g1.func1 (debuggee)

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

g1.func1();

dbg.onDebuggerStatement = undefined;

// Test 3: Can toggle when only non-debuggee frames are on stack
// Set up a callback in g2 (non-debuggee) that toggles coverage
g2.dbg = dbg;
g2.evaluate(`
  function toggleCoverage() {
    // At this point, only g2 frames are on the stack (non-debuggee)
    // So toggling should succeed
    dbg.collectCoverageInfo = false;
    dbg.collectCoverageInfo = true;
    dbg.collectCoverageInfo = false;
  }
`);

g2.toggleCoverage();

// Test 4: More complex interleaving - g1 -> g2 -> g1 -> g3
g2.g1 = g1;
g1.g3 = g3;

g2.evaluate(`
  function func2b() {
    return g1.func1b();
  }
`);

g1.evaluate(`
  function func1b() {
    return g3.func3();
  }

  function func1c() {
    return g2.func2b();
  }
`);

dbg.collectCoverageInfo = true;

var complexDisableAttempted = false;
dbg.onDebuggerStatement = function() {
  // Stack: g3.func3 (debuggee) -> g1.func1b (debuggee) ->
  //        g2.func2b (non-debuggee) -> g1.func1c (debuggee)

  var caught = false;
  try {
    dbg.collectCoverageInfo = false;
    complexDisableAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(complexDisableAttempted, false);
};

g1.func1c();

dbg.onDebuggerStatement = undefined;

// Clean up
dbg.collectCoverageInfo = false;
