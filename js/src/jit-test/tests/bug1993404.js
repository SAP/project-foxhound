class C {
  constructor(a,b,c) {}
}
class D extends C {
  constructor(x) {
    super(...x);
  }
}
let P = new Proxy(D, {});

function foo() {
  return new P([1,2]);
}

with ({}) {}
for (var i = 0; i < 2000; i++) {
  foo();
}
