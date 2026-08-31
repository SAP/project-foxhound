// Test proxy traps invoked while doing for-in enumeration over a proxy +
// property deletion. Note that some of this is implementation-defined, but if
// our behavior changes we want to know about it.
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
for (let p in proxy) {
  log.push(`iter: ${p}`);
  delete proxy.d;
}
assertEq(log.join("\n"), [
  "own-keys",
  "get-desc: a",
  "get-desc: b",
  "get-desc: c",
  "get-desc: d",
  "get-proto",
  "iter: a",
  "delete: d",
  "iter: b",
  "delete: d",
  "iter: c",
  "delete: d",
].join("\n"));
