function C0(o) {
  return o.idx
}

let origArr = [{x:1}];
let sharedArr = null;

class Middle extends C0 {
  constructor() {
    sharedArr = [...origArr];
    super(...sharedArr);
  }
}

for (var i = 0; i < 10; i++) {
  class D extends Middle {}
  new D();
}

origArr = [];
for (var i = 0; i < 50; i++) {
  origArr.push({idx: i});
}
gc();

var proxyNewTarget = new Proxy(function(){}, {
  get: function(target, prop, receiver) {
    sharedArr.length = 0;
    origArr = null;
    gc();
    return Reflect.get(target, prop, receiver);
  }
});

Reflect.construct(Middle, [], proxyNewTarget);
