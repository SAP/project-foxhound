// |jit-test| --fast-warmup; --no-threads

setJitCompilerOption("baseline.warmup.trigger", 0);
setJitCompilerOption("ion.warmup.trigger", 100);

var uceFault = function (i) {
  if (i > 98)
    uceFault = function (i) {return true;};
  return false;
}

function test() {
  var f = function inner(i) {
    // JSOp::Callee is used for the reference to |inner|.
    // MCallee can be recovered.
    var foo = inner;
    assertRecoveredOnBailout(foo, true);
    if (uceFault(i) || uceFault(i)) {
      assertEq(foo, inner);
    }
  };
  with ({}); // No inlining.
  for (var i = 0; i < 100; i++) {
    f(i);
  }
}
test();
