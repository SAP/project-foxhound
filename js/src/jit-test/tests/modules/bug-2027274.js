// |jit-test| slow
var leaf = parseModule("await 0; throw 1;", "l.js");
registerModule("l", leaf);
moduleLink(leaf);
moduleEvaluate(leaf).catch(() => {});
var p = "l";
for (var i = 0; i < 50000; i++) {
  var m = parseModule("import '" + p + "'; if(0) await 0;", "m" + i + ".js");
  registerModule("m" + i, m);
  moduleLink(m);
  moduleEvaluate(m).catch(() => {});
  p = "m" + i;
}
try {
  drainJobQueue();
} catch(e) {
  assertEq(e instanceof InternalError, true);
  assertEq(e.message, "too much recursion");
}
