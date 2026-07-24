// Bug: toggling collectCoverageInfo via eval-in-frame after setting a breakpoint
// causes scripts to end up with mismatched observing state, triggering an assertion.

var g1 = newGlobal({ newCompartment: true });
var g2 = newGlobal({ newCompartment: true });

g1.g2 = g2;
g2.g1 = g1;

g1.evaluate(`
  function outer() {
    return g2.middle();
  }
  function inner() {
    debugger;
  }
`);

g2.evaluate(`
  function middle() {
    return g1.inner();
  }
`);

var dbg1 = new Debugger(g1);
dbg1.collectCoverageInfo = true;

var dbg2 = new Debugger(g2);

// Warmup to baseline.
for (var i = 0; i < 30; i++) {
  g1.outer();
}

dbg1.onDebuggerStatement = function() {
  // Set a breakpoint
  var script = dbg1.findScripts({global: g1, displayName: "outer"})[0];
  var offsets = script.getAllOffsets();
  for (var line in offsets) {
    if (offsets[line] && offsets[line].length > 0) {
      script.setBreakpoint(offsets[line][0], {});
      break;
    }
  }

  // Toggle coverage via eval in g2's frame
  var g2Frame = dbg2.getNewestFrame();
  g2.toggle = function() {
    dbg1.collectCoverageInfo = false;
  };
  g2Frame.eval("toggle()");
};

g1.outer();

// Turning the coverage off shouldn't trigger any assertion failures around the observing flag.
dbg1.collectCoverageInfo = false;
