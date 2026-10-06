var g1 = newGlobal({newCompartment: true});
var e1 = g1.evaluate("(c => (0,eval)(c))");
var wp1 = g1.evaluate("globalThis");

var g2 = newGlobal({sameCompartmentAs: g1, transplantWindowProxy: wp1});
g2.eval("nukeAllCCWs()");

var dbg = new Debugger;
dbg.addAllGlobalsAsDebuggees();
for (var d of dbg.getDebuggees()) {
  d.unsafeDereference();
}
e1("globalThis");
