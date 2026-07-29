var K = 65533;
var args = [];
for (var i = 0; i < K; i++) args.push("a");
args.push("x=(a?1:2)");
var src = "(function f(a) { var x=0; function g(){return arguments.length} return g(" + args.join(",") + "); })";
var f = eval(src);
baselineCompile(f);
