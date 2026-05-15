function f() {
  dbg.addDebuggee(g);
  dbg.removeDebuggee(g);
}
var g = newGlobal({newCompartment: true});
var dbg = new Debugger();
dbg.onEnterFrame = f;
oomTest(f);
oomTest(f);
oomTest(f);
