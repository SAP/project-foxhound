// |jit-test| --fuzzing-safe

// With --fuzzing-safe, HandleInterrupt must not invoke the Debugger's onStep
// hook, to prevent fuzzer-generated handlers from running JS while interrupting
// inside a native (e.g. TypedArrayJoinKernel) that assumes stable state.

var g = newGlobal({ newCompartment: true });
g.evaluate(`
  var ab = new ArrayBuffer(64);
  var ta = new Int32Array(ab);
`);

var dbg = new Debugger(g);
var detached = false;

dbg.onEnterFrame = function (frame) {
  if (frame.type !== "eval") {
    return;
  }
  var lastOff = -1;
  frame.onStep = function () {
    var off = frame.offset;
    interruptIf(true);
    if (off === lastOff && !detached) {
      detached = true;
      g.ab.transfer();
    }
    lastOff = off;
  };
};

setInterruptCallback("true");
g.eval(`
  interruptIf(true);
  ta.join(',');
`);

// With the --fuzzing-safe flag, HandleInterrupt skips onStep, so the buffer
// is never detached.
assertEq(detached, false);
