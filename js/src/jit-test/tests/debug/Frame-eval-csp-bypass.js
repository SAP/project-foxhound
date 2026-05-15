// Test that debugger evaluation can bypass CSP restrictions when bypassCSP option is set.

var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);

// Create a function to trigger a debugger statement before enabling CSP.
g.eval("function triggerDebugger() { debugger; }");

// Create functions that will use eval/new Function and which will be called
// from Frame.eval.
g.eval("function triggerEval() { return eval('2 + 2'); }");
g.eval("function triggerNewFunction() { return new Function('return 2 + 2')(); }");

const EXPECTED_VALUE = 4;
function assertSuccess(expression, options = {}) {
  let evaluated = false;
  dbg.onDebuggerStatement = function (frame) {
    assertEq(frame.eval(expression, options).return, EXPECTED_VALUE);
    evaluated = true;
  };
  g.triggerDebugger();
  assertEq(evaluated, true);
}

function assertThrows(expression, options = {}) {
  let evaluated = false;
  dbg.onDebuggerStatement = function (frame) {
    assertEq(frame.eval(expression, options).throw !== undefined, true);
    evaluated = true;
  };
  g.triggerDebugger();
  assertEq(evaluated, true);
}

// Smoke test without enabling CSP

// evaluation without eval/new Function always succeeds
assertSuccess("2 + 2");
assertSuccess("2 + 2", { bypassCSP: false });
assertSuccess("2 + 2", { bypassCSP: true });

// Default value for bypassCSP
assertSuccess("eval('2 + 2')");
assertSuccess("new Function('return 2 + 2')()");
assertSuccess("triggerEval()");
assertSuccess("triggerNewFunction()");

// bypassCSP=false
assertSuccess("eval('2 + 2')", { bypassCSP: false });
assertSuccess("new Function('return 2 + 2')()", { bypassCSP: false });
assertSuccess("triggerEval()", { bypassCSP: false });
assertSuccess("triggerNewFunction()", { bypassCSP: false });

// bypassCSP=true
assertSuccess("eval('2 + 2')", { bypassCSP: true });
assertSuccess("new Function('return 2 + 2')()", { bypassCSP: true });
assertSuccess("triggerEval()", { bypassCSP: true });
assertSuccess("triggerNewFunction()", { bypassCSP: true });

// Enable CSP
setCSPEnabled(true);

// evaluation without eval/new Function always succeeds
assertSuccess("2 + 2");
assertSuccess("2 + 2", { bypassCSP: false });
assertSuccess("2 + 2", { bypassCSP: true });

// Default value for bypassCSP, should all fail
assertThrows("eval('2 + 2')");
assertThrows("new Function('return 2 + 2')()");
assertThrows("triggerEval()");
assertThrows("triggerNewFunction()");

// bypassCSP=false, should all fail
assertThrows("eval('2 + 2')", { bypassCSP: false });
assertThrows("new Function('return 2 + 2')()", { bypassCSP: false });
assertThrows("triggerEval()", { bypassCSP: false });
assertThrows("triggerNewFunction()", { bypassCSP: false });

// bypassCSP=true, should all succeed
assertSuccess("eval('2 + 2')", { bypassCSP: true });
assertSuccess("new Function('return 2 + 2')()", { bypassCSP: true });
assertSuccess("triggerEval()", { bypassCSP: true });
assertSuccess("triggerNewFunction()", { bypassCSP: true });

// Define a few functions using eval with and without bypassCSP.
// They should both behave the same when triggered from a later Frame.eval, and
// only the bypassCSP flag for the later Frame.eval should matter.
dbg.onDebuggerStatement = function (frame) {
  frame.eval("globalThis.fnWithBypass = () => eval('2 + 2')", { bypassCSP: true });
  frame.eval("globalThis.fnWithoutBypass = () => eval('2 + 2')", { bypassCSP: false });
};
g.triggerDebugger();

// Call the function defined with bypassCSP=true, should only work when
// bypassCSP is true for the current Frame.eval.
assertThrows("globalThis.fnWithBypass()");
assertThrows("globalThis.fnWithBypass()", { bypassCSP: false });
assertSuccess("globalThis.fnWithBypass()", { bypassCSP: true });

// Call the function defined with bypassCSP=false, should only work when
// bypassCSP is true for the current Frame.eval.
assertThrows("globalThis.fnWithoutBypass()");
assertThrows("globalThis.fnWithoutBypass()", { bypassCSP: false });
assertSuccess("globalThis.fnWithoutBypass()", { bypassCSP: true });

// Test for async frames.
const asyncEvalExpression = `(async function() {
try {
  globalThis.evalBeforeAwaitSuccess = false;
  globalThis.evalAfterAwaitSuccess = false;
  eval("1 + 1");
  globalThis.evalBeforeAwaitSuccess = true;
  await 1;
  eval("2 + 2");
  globalThis.evalAfterAwaitSuccess = true;
} catch {}
})()`;

// Test async code with bypassCSP=true, only the eval before the await should be
// successful.
dbg.onDebuggerStatement = function (frame) {
  frame.onPop = completion => {
    frame.eval(asyncEvalExpression, { bypassCSP: true });
    dbg.removeDebuggee(g); // avoid the DebuggeeWouldRun exception
    drainJobQueue();
    dbg.addDebuggee(g);
  }
};
g.triggerDebugger();

dbg.onDebuggerStatement = function (frame) {
  assertEq(frame.eval("globalThis.evalBeforeAwaitSuccess", options).return, true);
  assertEq(frame.eval("globalThis.evalAfterAwaitSuccess", options).return, false);
};
g.triggerDebugger();

// Test async code with bypassCSP=false, all eval should fail.
dbg.onDebuggerStatement = function (frame) {
  frame.onPop = completion => {
    frame.eval(asyncEvalExpression, { bypassCSP: false });
    dbg.removeDebuggee(g); // avoid the DebuggeeWouldRun exception
    drainJobQueue();
    dbg.addDebuggee(g);
  }
};
g.triggerDebugger();
drainJobQueue();

dbg.onDebuggerStatement = function (frame) {
  assertEq(frame.eval("globalThis.evalBeforeAwaitSuccess", options).return, false);
  assertEq(frame.eval("globalThis.evalAfterAwaitSuccess", options).return, false);
};
g.triggerDebugger();
