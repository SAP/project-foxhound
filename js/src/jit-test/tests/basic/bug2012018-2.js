// Test proxy traps invoked while doing for-in enumeration over an object with
// a proxy on its proto chain + property deletion. Note that some of this is
// implementation-defined, but if our behavior changes we want to know about it.
// In particular, we should be very careful with proxy traps invoked under
// SuppressDeletedProperty. 

let target = {a: 1, b: 2, c: 3, d: 4};
let log = [];
let handler = {
  getPrototypeOf: function (t) {
    log.push("get-proto");
    return Reflect.getPrototypeOf(t);
  },
  deleteProperty: function (t, prop) {
    log.push(`delete: ${prop}`);
    return Reflect.deleteProperty(t, prop);
  },
  getOwnPropertyDescriptor: function (t, prop) {
    log.push(`get-desc: ${prop}`);
    return Reflect.getOwnPropertyDescriptor(t, prop);
  },
  ownKeys: function (t) {
    log.push("own-keys");
    return Reflect.ownKeys(t);
  }
};
let proxy = new Proxy(target, handler);
let object = Object.create(proxy);
object.a = 1;
object.c = 3;
for (let p in object) {
  log.push(`iter: ${p}`);
  delete object.c;
  delete object.d;
}
assertEq(log.join("\n"), [
  "own-keys",
  "get-desc: a",
  "get-desc: b",
  "get-desc: c",
  "get-desc: d",
  "get-proto",
  "iter: a",
  "iter: b",
  "iter: d"
].join("\n"));
