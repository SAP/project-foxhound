// Ensure the OptimizeGetIteratorBytecodeFuse is popped when setting a debugger
// breakpoint or step hook. OptimizeGetIteratorFuse is left intact.

function testOnStep() {
  var g = newGlobal({newCompartment: true});
  var dbg = new Debugger(g);
  dbg.onEnterFrame = function(frame) {
    frame.onStep = function() {};
  };
  assertEq(g.getFuseState().OptimizeGetIteratorBytecodeFuse.intact, true);
  g.evaluate("1 + 1;");
  assertEq(g.getFuseState().OptimizeGetIteratorBytecodeFuse.intact, false);
  assertEq(g.getFuseState().OptimizeGetIteratorFuse.intact, true);
}
testOnStep();

function testBreakpoint() {
  var g = newGlobal({newCompartment: true});
  var dbg = new Debugger(g);
  dbg.onEnterFrame = function(frame) {
    frame.script.setBreakpoint(frame.script.mainOffset, {hit: function() {}});
  };
  assertEq(g.getFuseState().OptimizeGetIteratorBytecodeFuse.intact, true);
  g.evaluate("1 + 1;");
  assertEq(g.getFuseState().OptimizeGetIteratorBytecodeFuse.intact, false);
  assertEq(g.getFuseState().OptimizeGetIteratorFuse.intact, true);
}
testBreakpoint();
