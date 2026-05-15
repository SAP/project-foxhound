// |jit-test| --inlining-entry-threshold=1; --trial-inlining-warmup-threshold=50; --baseline-warmup-threshold=200; --ion-warmup-threshold=1000; --no-threads; --no-cgc

let options = getJitCompilerOptions();
if (!options['blinterp.enable'] ||
    !options['baseline.enable'] ||
    options['ion.warmup.trigger'] <= 100) {
  print("Unsupported jit options");
  quit();
}

function foo(o) {
  return o.x;
}

function bar(o) {
  return foo(o);
}

function test() {
  with ({}) {}
  for (var i = 0; i < 50; i++) {
    bar({x: 1})
    bar({a: 0, x: 1})
  }
  let ICs = disblic(bar);
  if (/;   IR:/.test(ICs)) { // Only assert if we can actually dump IR.
    assertEq(/CallInlinedFunction/.test(ICs), true);
  }
}
test();
