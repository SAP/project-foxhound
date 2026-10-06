// Test for Debugger.getNewestFrame's evalInFramePrev-following behavior when
// multiple debuggers and debuggees are involved.

let G1 = newGlobal({newCompartment: true});
let G2 = newGlobal({newCompartment: true});
G2.G1 = G1;
G1.G2 = G2;

// Set up the following call stack (oldest to youngest):
//
//   G1.A => G2.B => G1.C => G2.D
G1.evaluate(`
  function A() { return G2.B(); }
  function C() { return G2.D(); }
`);
G2.evaluate(`
  function B() { return G1.C(); }
  function D() { debugger; return 5; }
`);

let dbg1 = new Debugger(G1);  // observes only G1
let dbg2 = new Debugger(G2);  // observes only G2

let callCount = 0;
dbg2.onDebuggerStatement = function (frame) {
  callCount++;
  if (callCount === 1) {
    // Hit the debugger-statement in G2.D. Perform an eval in
    // G2.B's frame to create an eval frame with evalInFramePrev
    // pointing to B's frame.
    //
    // The eval code contains another debugger-statement which will trigger
    // the code below.
    assertEq(frame.callee.name, "D");
    var frameB = frame.older;
    assertEq(frameB.callee.name, "B");
    assertEq(frameB.older, null);
    frameB.eval("debugger;");
    return;
  }
  // Second debugger-statement (from the debugger-eval code).
  // The stack now looks like this:
  //
  //   Debugger eval frame with evalInFramePrev ---+
  //   G2.D                                        |
  //   G1.C                                        |
  //   G2.B   <------------------------------------+
  //   G1.A
  //
  // If we now call dbg1.getNewestFrame(), we skip G1.C so get G1.A.
  assertEq(callCount, 2);
  var frameA = dbg1.getNewestFrame();
  assertEq(frameA.callee.name, "A");
  assertEq(frameA.older, null);
};
assertEq(G1.A(), 5);
assertEq(callCount, 2);
