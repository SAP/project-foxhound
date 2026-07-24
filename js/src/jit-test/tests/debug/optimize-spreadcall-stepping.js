// Test for the debugger making a spread argument array non-packed between the
// JSOp::OptimizeSpreadCall and JSOp::SpreadCall ops. This is handled by popping
// a fuse.

let g = newGlobal({newCompartment: true});
let dbg = new Debugger(g);

// Try multiple step offsets to reliably hit between OptimizeSpreadCall and
// SpreadCall.
for (let targetStep = 1; targetStep <= 15; targetStep++) {
  let triggered = false;
  dbg.onEnterFrame = function(frame) {
    if (frame.callee?.name === "doSpreadCall" && !triggered) {
      triggered = true;
      let stepCount = 0;
      frame.onStep = function () {
        stepCount++;
        if (stepCount === targetStep) {
          // Delete array element to create a hole, breaking the packed invariant.
          frame.eval("delete arr[0]");
        }
      };
    }
  };
  g.evaluate(`
    var arr = [1, 2, 3];
    function callTarget(x, y, z) {
      return x + y + z;
    }
    function doSpreadCall() {
      // Spread call with OptimizeSpreadCall => SpreadCall ops.
      return callTarget(...arr);
    }
    doSpreadCall();
  `);
}
