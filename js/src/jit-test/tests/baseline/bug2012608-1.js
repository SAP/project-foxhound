class C {
  constructor() {
    assertEq(arguments[0], 1);
  }
}

class D extends C {
  constructor() {
    super(...arr)
  }
}

let arr = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];
for (var i = 0; i < 500; i++) {
  class E extends D {}
  new E()
}

var proxyNewTarget = new Proxy(function(){}, {
  get: function(target, prop, receiver) {
    arr[0] = "oops";
    return target[prop];
  }
});

Reflect.construct(D, arr, proxyNewTarget);
