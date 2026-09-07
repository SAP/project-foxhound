// |jit-test| --fast-warmup
var argIndex = 0;
function inner(a) {
  var closeOver = function() {
    a = 9;
  };
  closeOver();
  return [a, arguments[argIndex]];
}
function warmup() {
  with ({}) { }  // keep warmup() out of Ion
  for (var i = 0; i < 2000; i++) {
    argIndex = 100; // Read OOB argument (LoadArgumentsObjectArgHole)
    inner(7);
  }
}
warmup();
argIndex = 0; // in-bounds
var result = inner(7);
assertEq(result.toString(), "9,9");
