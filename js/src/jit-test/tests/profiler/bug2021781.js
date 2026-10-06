// |jit-test| skip-if: !hasFunction.oomTest; --baseline-warmup-threshold=1

enableGeckoProfiling();
var g = newGlobal({ newCompartment: true });
var x = Debugger();
x.addDebuggee(g);
x.onEnterFrame = (function() {});
g.eval("function f() { oomTest(function(){}); }");
g.f();
