function testNonConstructor(sb) {
  Assert.equal(
    sb.eval(`
      try {
        let nonCtor = wrappedNonCtor;
        new nonCtor();
      } catch (e) {
        e.message;
      }
    `),
    "nonCtor is not a constructor"
  );
}

function testBoundNonConstructor(sb) {
  Assert.equal(
    sb.eval(`
      try {
        let boundNonCtor = wrappedBoundNonCtor;
        new boundNonCtor();
      } catch (e) {
        e.message;
      }
    `),
    "boundNonCtor is not a constructor"
  );
}

function testProxyNonConstructor(sb) {
  Assert.equal(
    sb.eval(`
      try {
        let proxyNonCtor = wrappedProxyNonCtor;
        new proxyNonCtor();
      } catch (e) {
        e.message;
      }
    `),
    "proxyNonCtor is not a constructor"
  );
}

function testConstructor(sb) {
  Assert.equal(sb.eval("wrappedCtor()"), true);
  Assert.equal(sb.eval("typeof new wrappedCtor()"), "object");
}

function testBoundConstructor(sb) {
  Assert.equal(sb.eval("wrappedBoundCtor()"), true);
  Assert.equal(sb.eval("typeof new wrappedBoundCtor()"), "object");
}

function testProxyConstructor(sb) {
  Assert.equal(sb.eval("wrappedProxyCtor()"), true);
  Assert.equal(sb.eval("typeof new wrappedProxyCtor()"), "object");
}

function run_test() {
  var sb = new Cu.Sandbox(null);
  sb.wrappedNonCtor = Cu.exportFunction(() => true, sb);
  sb.wrappedBoundNonCtor = Cu.exportFunction((() => true).bind(null), sb);
  sb.wrappedProxyNonCtor = Cu.exportFunction(new Proxy(() => true, {}), sb);
  sb.wrappedCtor = Cu.exportFunction(function() {
    return true;
  }, sb);
  sb.wrappedBoundCtor = Cu.exportFunction(
    (function() {
      return true;
    }).bind(null),
    sb
  );
  sb.wrappedProxyCtor = Cu.exportFunction(
    new Proxy(function() {
      return true;
    }, {}),
    sb
  );

  testNonConstructor(sb);
  testBoundNonConstructor(sb);
  testProxyNonConstructor(sb);
  testConstructor(sb);
  testBoundConstructor(sb);
  testProxyConstructor(sb);
}
