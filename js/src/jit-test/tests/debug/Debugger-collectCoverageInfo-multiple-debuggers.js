// Test that multiple debuggers with separate debuggees can toggle
// collectCoverageInfo independently without blocking each other.

var g1 = newGlobal({ newCompartment: true });
var g2 = newGlobal({ newCompartment: true });
var g3 = newGlobal({ newCompartment: true });

// Create two separate debuggers
var dbg1 = new Debugger();
var dbg2 = new Debugger();

// dbg1 debugs g1, dbg2 debugs g2, g3 is not debugged
dbg1.addDebuggee(g1);
dbg2.addDebuggee(g2);

// Set up interleaved call chain: g1 -> g2 -> g3
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

// Test 1: dbg1 cannot toggle coverage when its debuggee (g1) is on the stack
var dbg1ToggleAttempted = false;
dbg1.onDebuggerStatement = function() {
  // Stack: g3.func3 (not debugged) -> g2.func2 (dbg2's debuggee) -> g1.func1 (dbg1's debuggee)

  var caught = false;
  try {
    dbg1.collectCoverageInfo = true;
    dbg1ToggleAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(dbg1ToggleAttempted, false);
};

// dbg2 should also not be able to toggle when its debuggee (g2) is on the stack
var dbg2ToggleAttempted = false;
dbg2.onDebuggerStatement = function() {
  // Stack: g3.func3 (not debugged) -> g2.func2 (dbg2's debuggee) -> g1.func1 (dbg1's debuggee)

  var caught = false;
  try {
    dbg2.collectCoverageInfo = true;
    dbg2ToggleAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(dbg2ToggleAttempted, false);
};

g1.func1();

dbg1.onDebuggerStatement = undefined;
dbg2.onDebuggerStatement = undefined;

// Test 2: dbg1 can toggle coverage when only dbg2's debuggee is on the stack
g2.dbg1 = dbg1;
g2.evaluate(`
  function testDbg1Toggle() {
    // At this point only g2 is on the stack, which is dbg2's debuggee but not dbg1's
    // So dbg1 should be able to toggle its coverage
    dbg1.collectCoverageInfo = true;
    dbg1.collectCoverageInfo = false;
    dbg1.collectCoverageInfo = true;
  }
`);

g2.testDbg1Toggle();

// Test 3: dbg2 can toggle coverage when only dbg1's debuggee is on the stack
g1.dbg2 = dbg2;
g1.evaluate(`
  function testDbg2Toggle() {
    // At this point only g1 is on the stack, which is dbg1's debuggee but not dbg2's
    // So dbg2 should be able to toggle its coverage
    dbg2.collectCoverageInfo = true;
    dbg2.collectCoverageInfo = false;
    dbg2.collectCoverageInfo = true;
  }
`);

g1.testDbg2Toggle();

// Test 4: Both debuggers can toggle when g3 (neither's debuggee) is on the stack
g3.dbg1 = dbg1;
g3.dbg2 = dbg2;
g3.evaluate(`
  function testBothToggle() {
    // At this point only g3 is on the stack, which is not a debuggee of either debugger
    // So both debuggers should be able to toggle their coverage
    dbg1.collectCoverageInfo = false;
    dbg2.collectCoverageInfo = false;

    dbg1.collectCoverageInfo = true;
    dbg2.collectCoverageInfo = true;

    dbg1.collectCoverageInfo = false;
    dbg2.collectCoverageInfo = false;
  }
`);

g3.testBothToggle();

// Test 5: Complex scenario - dbg1's debuggee calls dbg2's debuggee
// Create a new call chain for clearer testing
g1.evaluate(`
  function func1b() {
    return g2.func2b();
  }
`);

g2.evaluate(`
  function func2b() {
    debugger;
    return 100;
  }
`);

dbg1.collectCoverageInfo = true;
dbg2.collectCoverageInfo = true;

var dbg1DisableAttempted = false;
var dbg2DisableAttempted = false;

dbg1.onDebuggerStatement = function() {
  // Stack: g2.func2b (dbg2's debuggee) -> g1.func1b (dbg1's debuggee)

  // dbg1 cannot toggle because g1.func1b is on the stack
  var caught = false;
  try {
    dbg1.collectCoverageInfo = false;
    dbg1DisableAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(dbg1DisableAttempted, false);
};

dbg2.onDebuggerStatement = function() {
  // Stack: g2.func2b (dbg2's debuggee) -> g1.func1b (dbg1's debuggee)

  // dbg2 cannot toggle because g2.func2b is on the stack
  var caught = false;
  try {
    dbg2.collectCoverageInfo = false;
    dbg2DisableAttempted = true;
  } catch (e) {
    caught = true;
    assertEq(e.message, "can't start debugging: a debuggee script is on the stack");
  }
  assertEq(caught, true);
  assertEq(dbg2DisableAttempted, false);
};

g1.func1b();

// Clean up
dbg1.onDebuggerStatement = undefined;
dbg2.onDebuggerStatement = undefined;
dbg1.collectCoverageInfo = false;
dbg2.collectCoverageInfo = false;
