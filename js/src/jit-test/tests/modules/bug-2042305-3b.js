// |jit-test| slow
var N = 15000;
var mods = new Array(N);
mods[N - 1] = registerModule('f' + (N - 1),
    parseModule('await 1;', 'f' + (N - 1) + '.js'));
mods[N - 2] = registerModule('f' + (N - 2),
    parseModule('import "f' + (N - 1) + '"; throw "boom";', 'f' + (N - 2) + '.js'));
for (var i = N - 3; i >= 0; i--) {
  mods[i] = registerModule('f' + i,
      parseModule('import "f' + (i + 1) + '";', 'f' + i + '.js'));
}
for (var i = N - 1; i >= 0; i--) moduleLink(mods[i]);
for (var i = N - 1; i >= 0; i--) moduleEvaluate(mods[i]).catch(() => {});  // shallow: dep is EvaluatingAsync
try {
  drainJobQueue();   // leaf fulfills -> f{N-2} throws -> AsyncModuleExecutionRejected recurses N deep
} catch(e) {
  assertEq(e instanceof InternalError, true);
  assertEq(e.message, "too much recursion");
}
