// |jit-test| --fast-warmup
function changeProto(i) {
  with (this) {} // Don't inline.
  if (i === 1980) {
    // Mutate the prototype so that a different |toString| function must be called.
    let newProto = Object.create(null);
    newProto.toString = function() { return "hi"; };
    Object.setPrototypeOf(CustomProto, newProto);
  }
}
var CustomProto = Object.create(Object.prototype);
function f() {
  var obj = Object.create(CustomProto);
  var res = 0;
  for (var i = 0; i < 2000; i++) {
    res += obj.toString().length;
    changeProto(i);
  }
  assertEq(res, 29753);
}
f();
