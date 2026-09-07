gczeal(10);
const f1 = (function () {
  let x3 = { __proto__: null };
  function f4(x5) {
    x3[x5] = {
      ["loads"]: { __proto__: null },
      ["stores"]: { __proto__: null },
    };
  }
  function f2(x5, x6) {
    let x3;
    Object.setPrototypeOf(x6, new Proxy(Object.getPrototypeOf(x6), {
      get(x12345, x7, xyz12345) {
        if (xyz12345 === x3) return Reflect.get(x12345, x7);
        (function(){f4()})(x5);
        return Reflect.get(x12345, x7, xyz12345);
      },
      set() {},
    }));
  }
  function f3(x5, x6) {
      f2(x5, x6);
  }
  return {
    f2: f3,
  };
})();
for (
  let x1 = 15n;
  x1--;
  (() => {
    (() => {
      (() => {
        let [x1] = (() => {
          f1.f2("", newGlobal);
          return [10];
        })();
      })();
    })();
    enableTrackAllocations();
  })()
) {}
(() => {
  let [x2] = (() => {
    f1.f2("", String);
    return [String];
  })();
  --x2;
})();
for (let k = 0; k < 5000; k++) {
  f1.f2("", k);
  f1.f2("", 10);
  oomAfterAllocations(10);
  gcslice();
  resetOOMFailure();
}
