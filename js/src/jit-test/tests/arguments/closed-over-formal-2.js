// |jit-test| --fast-warmup
var argIndex = -1;
function inner(a, b) {
  var closeOver = function() {
    a = 9;
  };
  closeOver();
  return [a, arguments[argIndex]];
}
function warmup() {
  with ({}) { }  // keep warmup() out of Ion
  for (var i = 0; i < 2000; i++) {
    argIndex = 1; // Non-closed-over argument `b`.
    inner(7, 8);
  }
}
warmup();
argIndex = 0; // Closed over argument `a`.
var result = inner(7, 8);
assertEq(result.toString(), "9,9");
