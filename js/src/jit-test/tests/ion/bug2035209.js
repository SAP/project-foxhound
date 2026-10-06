try {
  var params = [];
  for (var i = 0; i < 32768; i++) params.push("a" + i);
  var getter = new Function(params.join(","), "return 42;");
  for (var i = 0; i < 200; i++) getter();
  var proto = {};
  Object.defineProperty(proto, "prop", { get: getter });
  function test(o) { return o.prop; }
  function A() { this.a = 1; }
  A.prototype = { prop: 1 };
  function B() { this.b = 2; }
  B.prototype = { prop: 2 };
  function C() { this.c = 3; }
  C.prototype = { prop: 3 };
  var objs = [new A(), new B(), new C()];
  for (var i = 0; i < 3000; i++) test(objs[i % 3]);
  function WithGetter() {}
  WithGetter.prototype = proto;
  test(new WithGetter());
} catch {}
