// |jit-test| slow
var N = 15000;
var leaf = parseModule("export var x = 1;", "m" + (N - 1) + ".js");
registerModule("m" + (N - 1), leaf);
moduleLink(leaf);
for (var i = N - 2; i >= 0; i--) {
  var m = parseModule("export * from 'm" + (i + 1) + "';", "m" + i + ".js");
  registerModule("m" + i, m);
  moduleLink(m);    // shallow: child already Linked
}
var head = parseModule("import {x} from 'm0';", "head.js");
registerModule("head", head);
try {
  moduleLink(head);   // CyclicModuleResolveExport recurses N deep to resolve x
} catch(e) {
  assertEq(e instanceof InternalError, true);
  assertEq(e.message, "too much recursion");
}
