// |jit-test| --setpref=experimental.self_hosted_cache=true; --baseline-eager
var gB = newGlobal();
for (var i=0;i<300;i++) [1,2,3].map(x=>x+1);
gB.eval("for (var i=0;i<300;i++) [1,2,3].map(x=>x+1);");
gB.enableProf = enableGeckoProfiling;
gB.eval("globalThis.runInner = function(){ return [4,5,6].map(function(x){ enableProf(); return x+1; }); };");
var r = [1,2,3].map(function(x){ return gB.runInner(); });
disableGeckoProfiling();
print("done " + r);
