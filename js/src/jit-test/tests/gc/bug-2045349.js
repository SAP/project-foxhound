function f() {
  createShapeSnapshot({
    get a() {},
  })[0] = [];
}
function g() {}
g.toSource = f;
var x = {};
Object.defineProperty(x, "", {
  enumerable: f,
  get: g,
});
x.toSource();
x.toSource();
