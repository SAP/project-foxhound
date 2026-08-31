// |jit-test| slow
var N = 15000;
var mods = new Array(N);
mods[N - 1] = registerModule('g' + (N - 1),
    parseModule('await 1; export var leaf = 1;', 'g' + (N - 1) + '.js'));
for (var i = N - 2; i >= 0; i--) {
  mods[i] = registerModule('g' + i,
      parseModule('import "g' + (i + 1) + '";', 'g' + i + '.js'));
}
for (var i = N - 1; i >= 0; i--) moduleLink(mods[i]);
for (var i = N - 1; i >= 0; i--) moduleEvaluate(mods[i]).catch(() => {});  // shallow: dep is EvaluatingAsync
try {
  drainJobQueue();   // leaf fulfills -> GatherAvailableModuleAncestors recurses N deep
} catch(e) {
  assertEq(e instanceof InternalError, true);
  assertEq(e.message, "too much recursion");
}
