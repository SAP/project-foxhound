class Base { constructor(o) { return o; } }
class A extends Base {
  #y = 0;
  get #x() {
    assertEq(this, p1);
    return 1;
  }
  set #x(v) {
    assertEq(this, p1);
  }
  static test(o) {
    o.#x = o.#x;
    o.#y = o.#y + 1;
    assertEq(o.#y, 1);
  }
}
var target = {};
var p1 = new Proxy(target, {});
new A(p1);
A.test(p1);