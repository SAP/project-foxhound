var g = newGlobal({newCompartment: true});
var dbg = new Debugger();
var dbgGlobal = dbg.addDebuggee(g);

dbg.onDebuggerStatement = function(frame) {
  dbgGlobal.forceLexicalInitializationByName("w");
  for (var i = 0; i < 20; i++) {
    var rv = frame.eval("readW()");
    assertEq(Object.hasOwn(rv, "return"), true);
    assertEq(rv.return, undefined);
  }
};

g.evaluate(`
  function readW() { return w; }
  function initValue() { debugger; return 123; }

  let w = initValue();

  for (let i = 0; i < 15; i++) {
    assertEq(readW(), 123);
  }
`);
