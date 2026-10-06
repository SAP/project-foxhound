// |jit-test| slow
var N = 15000;
var mods = new Array(N + 1);
for (var i = 0; i <= N; i++) {
  var src = (i < N) ? ('import "m' + (i + 1) + '";') : 'export let leaf = 1;';
  mods[i] = registerModule('m' + i, parseModule(src, 'm' + i + '.js'));
}
for (var i = N; i >= 0; i--) moduleLink(mods[i]);    // shallow
function checkError(e) {
  assertEq(e instanceof InternalError, true);
  assertEq(e.message, "too much recursion");
}
try {
  moduleEvaluate(mods[0]).catch(checkError);   // InnerModuleEvaluation recurses N deep
} catch(e) {
  checkError(e);
}
