// |jit-test| --disable-tosource

// Ensure the object.toSource() path in ValueToSource is disabled when the
// toSource/uneval builtins are not defined.

function testPlain() {
  var toSourceCalled = false;
  var obj = {
    toSource() { toSourceCalled = true; },
    get [Symbol.iterator]() { return {}; }
  };
  assertEq(valueToSource(obj), "({toSource() { toSourceCalled = true; }, get [Symbol.iterator]() { return {}; }})");
  assertEq(toSourceCalled, false);
  try {
    new Int8Array(obj);
  } catch {}
  assertEq(toSourceCalled, false);
}
testPlain();

function testProxy() {
  var log = [];
  var proxy = new Proxy({}, {get(target, prop) {
    log.push(prop);
    return {};
  }});
  assertEq(valueToSource(proxy), "({})");
  assertEq(log.length, 0);
  try {
    new Int8Array(proxy);
  } catch {}
  assertEq(log.length, 1);
  assertEq(log[0], Symbol.iterator);
}
testProxy();
