class C {
  constructor(a,b) { this.b = b; }
}
class C2 {
  constructor(a,b) { this.b = b; }
}

var flip = false;
function foo() {
  let c = flip ? C : C2;
  flip = !flip;
  return new c(...arguments);
}
for (var i = 0; i < 2000; i++) {
  assertEq(foo().b, undefined);
}
