function f() {}
[x] = (() => {
  y = (function () {})();
  z = class e {
    #m() {}
  };
  return [f];
})();
this.gczeal(10, 10);
for (let i = 0; i < 500000; i++) {
  (function () {
    this.setGrayBitsInvalid();
  })();
}
