enableGeckoProfilingWithSlowAssertions();
var g = newGlobal({newCompartment: true});
var dbg = new Debugger(g);
dbg.onExceptionUnwind = function() {
  readGeckoProfilingStack();
};
g.eval(`
  function f() {
    try { [3,1,2].sort(Array.prototype.sort); } catch(e) {}
  }
  for (var i = 0; i < 50; i++) f();
`);
