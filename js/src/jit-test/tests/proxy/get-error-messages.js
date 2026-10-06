function checkGetPropError(proxy, expected) {
  var msg = null;
  try {
    proxy.prop;
  } catch (e) {
    msg = e.message;
  }
  assertEq(msg.includes(expected), true);
}

// MustReportSameValue case.
function testSameValue() {
  var t = {};
  Object.defineProperty(t, "prop", {
    value: 1,
    writable: false,
    configurable: false
  });
  var p = new Proxy(t, {get() { return 2; }});
  for (var i = 0; i < 10; i++) {
    checkGetPropError(p, "proxy must report the same value");
  }
}
testSameValue();

// MustReportUndefined case.
function testUndefined() {
  var t = {};
  Object.defineProperty(t, "prop", {
    set: function() {},
    configurable: false
  });
  var p = new Proxy(t, {get() { return 42; }});
  for (var i = 0; i < 10; i++) {
    checkGetPropError(p, "proxy must report undefined");
  }
}
testUndefined();
