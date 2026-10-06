function inner(a, b) {
  var ai = a | 0;
  var bi = b | 0;
  var x = ai;
  if (ai) {
    x = bi;
    // This empty switch compiles to an MTableSwitch with only a default
    // case (single successor block).
    switch(x) {}
  }
  return x;
}
// `inner` will be inlined into `outer` to get the structure expected by
// BlockIsSingleTest.
function outer(a, b) {
  if (inner(a, b)) {
    return 1;
  }
  return 2;
}
function test() {
  with ({}) {} // Don't Ion-compile.
  var res = 0;
  for (var i = 0; i < 12000; i++) {
    res += outer(1, 2);
    res += outer(0, 0);
  }
  assertEq(res, 36000);
}
test();
