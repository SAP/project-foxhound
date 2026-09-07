// The global created for the interrupt-callback can't use the Debugger.
this.globalVar = 1;
setInterruptCallback(`
  try {
    var dbg = new Debugger();
    dbg.addAllGlobalsAsDebuggees();
    dbg.getDebuggees().forEach(g => {
      g.executeInGlobal("globalThis.globalVar = 2");
    });
  } catch (e) {}
  true
`);
interruptIf(true);
for (var i = 0; i < 10; i++) {}
assertEq(globalVar, 1);

// The global created for the interrupt-callback is invisible to the Debugger.
var dbg = new Debugger();
var fired = 0;
dbg.onNewGlobalObject = function() {
  fired++;
};
newGlobal();
assertEq(fired, 1);
setInterruptCallback(`true`);
interruptIf(true);
for (var i = 0; i < 10; i++) {}
assertEq(fired, 1);
