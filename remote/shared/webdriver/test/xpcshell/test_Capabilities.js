/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { AppInfo } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/AppInfo.sys.mjs"
);
const { error } = ChromeUtils.importESModule(
  "chrome://remote/content/shared/webdriver/Errors.sys.mjs"
);
const {
  Capabilities,
  mergeCapabilities,
  PageLoadStrategy,
  processCapabilities,
  Proxy,
  Timeouts,
  validateCapabilities,
} = ChromeUtils.importESModule(
  "chrome://remote/content/shared/webdriver/Capabilities.sys.mjs"
);

add_task(function test_Timeouts_ctor() {
  let ts = new Timeouts();
  equal(ts.implicit, 0);
  equal(ts.pageLoad, 300000);
  equal(ts.script, 30000);
});

add_task(function test_Timeouts_toString() {
  equal(new Timeouts().toString(), "[object Timeouts]");
});

add_task(function test_Timeouts_toJSON() {
  let ts = new Timeouts();
  deepEqual(ts.toJSON(), { implicit: 0, pageLoad: 300000, script: 30000 });
});

add_task(function test_Timeouts_fromJSON() {
  let json = {
    implicit: 0,
    pageLoad: 2.0,
    script: Number.MAX_SAFE_INTEGER,
  };
  let ts = Timeouts.fromJSON(json);
  equal(ts.implicit, json.implicit);
  equal(ts.pageLoad, json.pageLoad);
  equal(ts.script, json.script);
});

add_task(function test_Timeouts_fromJSON_unrecognized_field() {
  let json = {
    sessionId: "foobar",
  };
  try {
    Timeouts.fromJSON(json);
  } catch (e) {
    equal(e.name, error.InvalidArgumentError.name);
    equal(e.message, "Unrecognized timeout: sessionId");
  }
});

add_task(function test_Timeouts_fromJSON_invalid_types() {
  for (let value of [null, [], {}, false, "10", 2.5]) {
    Assert.throws(
      () => Timeouts.fromJSON({ implicit: value }),
      /InvalidArgumentError/
    );
  }
});

add_task(function test_Timeouts_fromJSON_bounds() {
  for (let value of [-1, Number.MAX_SAFE_INTEGER + 1]) {
    Assert.throws(
      () => Timeouts.fromJSON({ script: value }),
      /InvalidArgumentError/
    );
  }
});

add_task(function test_PageLoadStrategy() {
  equal(PageLoadStrategy.None, "none");
  equal(PageLoadStrategy.Eager, "eager");
  equal(PageLoadStrategy.Normal, "normal");
});

add_task(function test_Proxy_ctor() {
  let p = new Proxy();
  let props = [
    "proxyType",
    "httpProxy",
    "sslProxy",
    "socksProxy",
    "socksVersion",
    "proxyAutoconfigUrl",
  ];
  for (let prop of props) {
    ok(prop in p, `${prop} in ${JSON.stringify(props)}`);
    equal(p[prop], null);
  }
});

add_task(function test_Proxy_init() {
  let p = new Proxy();

  // no changed made, and 5 (system) is default
  equal(p.init(), false);
  equal(Services.prefs.getIntPref("network.proxy.type"), 5);

  // pac
  p.proxyType = "pac";
  p.proxyAutoconfigUrl = "http://localhost:1234";
  ok(p.init());

  equal(Services.prefs.getIntPref("network.proxy.type"), 2);
  equal(
    Services.prefs.getStringPref("network.proxy.autoconfig_url"),
    "http://localhost:1234"
  );

  // direct
  p = new Proxy();
  p.proxyType = "direct";
  ok(p.init());
  equal(Services.prefs.getIntPref("network.proxy.type"), 0);

  // autodetect
  p = new Proxy();
  p.proxyType = "autodetect";
  ok(p.init());
  equal(Services.prefs.getIntPref("network.proxy.type"), 4);

  // system
  p = new Proxy();
  p.proxyType = "system";
  ok(p.init());
  equal(Services.prefs.getIntPref("network.proxy.type"), 5);

  // manual
  for (let proxy of ["http", "ssl", "socks"]) {
    p = new Proxy();
    p.proxyType = "manual";
    p.noProxy = ["foo", "bar"];
    p[`${proxy}Proxy`] = "foo";
    p[`${proxy}ProxyPort`] = 42;
    if (proxy === "socks") {
      p[`${proxy}Version`] = 4;
    }

    ok(p.init());
    equal(Services.prefs.getIntPref("network.proxy.type"), 1);
    equal(
      Services.prefs.getStringPref("network.proxy.no_proxies_on"),
      "foo, bar"
    );
    equal(Services.prefs.getStringPref(`network.proxy.${proxy}`), "foo");
    equal(Services.prefs.getIntPref(`network.proxy.${proxy}_port`), 42);
    if (proxy === "socks") {
      equal(Services.prefs.getIntPref(`network.proxy.${proxy}_version`), 4);
    }
  }

  // empty no proxy should reset default exclustions
  p = new Proxy();
  p.proxyType = "manual";
  p.noProxy = [];
  ok(p.init());
  equal(Services.prefs.getStringPref("network.proxy.no_proxies_on"), "");
});

add_task(function test_Proxy_toString() {
  equal(new Proxy().toString(), "[object Proxy]");
});

add_task(function test_Proxy_toJSON() {
  let p = new Proxy();
  deepEqual(p.toJSON(), {});

  // autoconfig url
  p = new Proxy();
  p.proxyType = "pac";
  p.proxyAutoconfigUrl = "foo";
  deepEqual(p.toJSON(), { proxyType: "pac", proxyAutoconfigUrl: "foo" });

  // manual proxy
  p = new Proxy();
  p.proxyType = "manual";
  deepEqual(p.toJSON(), { proxyType: "manual" });

  for (let proxy of ["httpProxy", "sslProxy", "socksProxy"]) {
    let expected = { proxyType: "manual" };

    p = new Proxy();
    p.proxyType = "manual";

    if (proxy == "socksProxy") {
      p.socksVersion = 5;
      expected.socksVersion = 5;
    }

    // without port
    p[proxy] = "foo";
    expected[proxy] = "foo";
    deepEqual(p.toJSON(), expected);

    // with port
    p[proxy] = "foo";
    p[`${proxy}Port`] = 0;
    expected[proxy] = "foo:0";
    deepEqual(p.toJSON(), expected);

    p[`${proxy}Port`] = 42;
    expected[proxy] = "foo:42";
    deepEqual(p.toJSON(), expected);

    // add brackets for IPv6 address as proxy hostname
    p[proxy] = "2001:db8::1";
    p[`${proxy}Port`] = 42;
    expected[proxy] = "foo:42";
    expected[proxy] = "[2001:db8::1]:42";
    deepEqual(p.toJSON(), expected);
  }

  // noProxy: add brackets for IPv6 address
  p = new Proxy();
  p.proxyType = "manual";
  p.noProxy = ["2001:db8::1"];
  let expected = { proxyType: "manual", noProxy: "[2001:db8::1]" };
  deepEqual(p.toJSON(), expected);
});

add_task(function test_Proxy_fromJSON() {
  let p = new Proxy();
  deepEqual(p, Proxy.fromJSON(undefined));
  deepEqual(p, Proxy.fromJSON(null));

  for (let typ of [true, 42, "foo", []]) {
    Assert.throws(() => Proxy.fromJSON(typ), /InvalidArgumentError/);
  }

  // must contain a valid proxyType
  Assert.throws(() => Proxy.fromJSON({}), /InvalidArgumentError/);
  Assert.throws(
    () => Proxy.fromJSON({ proxyType: "foo" }),
    /InvalidArgumentError/
  );

  // autoconfig url
  for (let url of [true, 42, [], {}]) {
    Assert.throws(
      () => Proxy.fromJSON({ proxyType: "pac", proxyAutoconfigUrl: url }),
      /InvalidArgumentError/
    );
  }

  p = new Proxy();
  p.proxyType = "pac";
  p.proxyAutoconfigUrl = "foo";
  deepEqual(p, Proxy.fromJSON({ proxyType: "pac", proxyAutoconfigUrl: "foo" }));

  // manual proxy
  p = new Proxy();
  p.proxyType = "manual";
  deepEqual(p, Proxy.fromJSON({ proxyType: "manual" }));

  for (let proxy of ["httpProxy", "sslProxy", "socksProxy"]) {
    let manual = { proxyType: "manual" };

    // invalid hosts
    for (let host of [
      true,
      42,
      [],
      {},
      null,
      "http://foo",
      "foo:-1",
      "foo:65536",
      "foo/test",
      "foo#42",
      "foo?foo=bar",
      "2001:db8::1",
    ]) {
      manual[proxy] = host;
      Assert.throws(() => Proxy.fromJSON(manual), /InvalidArgumentError/);
    }

    p = new Proxy();
    p.proxyType = "manual";
    if (proxy == "socksProxy") {
      manual.socksVersion = 5;
      p.socksVersion = 5;
    }

    let host_map = {
      "foo:1": { hostname: "foo", port: 1 },
      "foo:21": { hostname: "foo", port: 21 },
      "foo:80": { hostname: "foo", port: 80 },
      "foo:443": { hostname: "foo", port: 443 },
      "foo:65535": { hostname: "foo", port: 65535 },
      "127.0.0.1:42": { hostname: "127.0.0.1", port: 42 },
      "[2001:db8::1]:42": { hostname: "2001:db8::1", port: "42" },
    };

    // valid proxy hosts with port
    for (let host in host_map) {
      manual[proxy] = host;

      p[`${proxy}`] = host_map[host].hostname;
      p[`${proxy}Port`] = host_map[host].port;

      deepEqual(p, Proxy.fromJSON(manual));
    }

    // Without a port the default port of the scheme is used
    for (let host of ["foo", "foo:"]) {
      manual[proxy] = host;

      // For socks no default port is available
      p[proxy] = `foo`;
      if (proxy === "socksProxy") {
        p[`${proxy}Port`] = null;
      } else {
        let default_ports = { httpProxy: 80, sslProxy: 443 };

        p[`${proxy}Port`] = default_ports[proxy];
      }

      deepEqual(p, Proxy.fromJSON(manual));
    }
  }

  // missing required socks version
  Assert.throws(
    () => Proxy.fromJSON({ proxyType: "manual", socksProxy: "foo:1234" }),
    /InvalidArgumentError/
  );

  // Bug 1703805: Since Firefox 90 ftpProxy is no longer supported
  Assert.throws(
    () => Proxy.fromJSON({ proxyType: "manual", ftpProxy: "foo:21" }),
    /InvalidArgumentError/
  );

  // noProxy: invalid settings
  for (let noProxy of [true, 42, {}, null, "foo", [true], [42], [{}], [null]]) {
    Assert.throws(
      () => Proxy.fromJSON({ proxyType: "manual", noProxy }),
      /InvalidArgumentError/
    );
  }

  // noProxy: valid settings
  p = new Proxy();
  p.proxyType = "manual";
  for (let noProxy of [[], ["foo"], ["foo", "bar"], ["127.0.0.1"]]) {
    let manual = { proxyType: "manual", noProxy };
    p.noProxy = noProxy;
    deepEqual(p, Proxy.fromJSON(manual));
  }

  // noProxy: IPv6 needs brackets removed
  p = new Proxy();
  p.proxyType = "manual";
  p.noProxy = ["2001:db8::1"];
  let manual = { proxyType: "manual", noProxy: ["[2001:db8::1]"] };
  deepEqual(p, Proxy.fromJSON(manual));
});

add_task(function test_Capabilities_ctor_http_default() {
  const caps = new Capabilities();

  equal(true, caps.get("moz:webdriverClick"));
});

add_task(function test_Capabilities_ctor_http() {
  const caps = new Capabilities(false);

  ok(caps.has("browserName"));
  ok(caps.has("browserVersion"));
  ok(caps.has("platformName"));
  ok(["linux", "mac", "windows", "android"].includes(caps.get("platformName")));
  equal(PageLoadStrategy.Normal, caps.get("pageLoadStrategy"));
  equal(false, caps.get("acceptInsecureCerts"));
  ok(caps.get("timeouts") instanceof Timeouts);
  ok(caps.get("proxy") instanceof Proxy);
  equal(caps.get("setWindowRect"), !AppInfo.isAndroid);
  equal(caps.get("strictFileInteractability"), false);
  equal(caps.get("webSocketUrl"), null);

  equal(false, caps.get("moz:accessibilityChecks"));
  ok(caps.has("moz:buildID"));
  ok(caps.has("moz:debuggerAddress"));
  ok(caps.has("moz:platformVersion"));
  ok(caps.has("moz:processID"));
  ok(caps.has("moz:profile"));
  equal(true, caps.get("moz:webdriverClick"));
});

add_task(function test_Capabilities_ctor_bidi() {
  const caps = new Capabilities(true);

  ok(caps.has("browserName"));
  ok(caps.has("browserVersion"));
  ok(caps.has("platformName"));
  ok(["linux", "mac", "windows", "android"].includes(caps.get("platformName")));
  equal(undefined, caps.get("pageLoadStrategy"));
  equal(false, caps.get("acceptInsecureCerts"));
  ok(!caps.has("timeouts"));
  ok(caps.get("proxy") instanceof Proxy);
  ok(!caps.has("setWindowRect"));
  ok(!caps.has("strictFileInteractability"));
  ok(!caps.has("webSocketUrl"));

  ok(!caps.has("moz:accessibilityChecks"));
  ok(caps.has("moz:buildID"));
  ok(!caps.has("moz:debuggerAddress"));
  ok(caps.has("moz:platformVersion"));
  ok(caps.has("moz:processID"));
  ok(caps.has("moz:profile"));
  ok(!caps.has("moz:webdriverClick"));
});

add_task(function test_Capabilities_toString() {
  equal("[object Capabilities]", new Capabilities().toString());
});

add_task(function test_Capabilities_toJSON() {
  let caps = new Capabilities();
  let json = caps.toJSON();

  equal(caps.get("browserName"), json.browserName);
  equal(caps.get("browserVersion"), json.browserVersion);
  equal(caps.get("platformName"), json.platformName);
  equal(caps.get("pageLoadStrategy"), json.pageLoadStrategy);
  equal(caps.get("acceptInsecureCerts"), json.acceptInsecureCerts);
  deepEqual(caps.get("proxy").toJSON(), json.proxy);
  deepEqual(caps.get("timeouts").toJSON(), json.timeouts);
  equal(caps.get("setWindowRect"), json.setWindowRect);
  equal(caps.get("strictFileInteractability"), json.strictFileInteractability);
  equal(caps.get("webSocketUrl"), json.webSocketUrl);

  equal(caps.get("moz:accessibilityChecks"), json["moz:accessibilityChecks"]);
  equal(caps.get("moz:buildID"), json["moz:buildID"]);
  equal(caps.get("moz:debuggerAddress"), json["moz:debuggerAddress"]);
  equal(caps.get("moz:platformVersion"), json["moz:platformVersion"]);
  equal(caps.get("moz:processID"), json["moz:processID"]);
  equal(caps.get("moz:profile"), json["moz:profile"]);
  equal(caps.get("moz:webdriverClick"), json["moz:webdriverClick"]);
});

add_task(function test_Capabilities_fromJSON_http() {
  const { fromJSON } = Capabilities;

  // plain
  for (const type of [{}, null, undefined]) {
    ok(fromJSON(type, false).has("browserName"));
  }

  let caps;

  // Capabilities supported by HTTP and BiDi
  caps = fromJSON({ acceptInsecureCerts: true }, false);
  equal(true, caps.get("acceptInsecureCerts"));

  let proxyConfig = { proxyType: "manual" };
  caps = fromJSON({ proxy: proxyConfig }, false);
  equal("manual", caps.get("proxy").proxyType);

  // WebDriver HTTP-only capabilities
  for (let strategy of Object.values(PageLoadStrategy)) {
    caps = fromJSON({ pageLoadStrategy: strategy }, false);
    equal(strategy, caps.get("pageLoadStrategy"));
  }

  let timeoutsConfig = { implicit: 123 };
  caps = fromJSON({ timeouts: timeoutsConfig }, false);
  equal(123, caps.get("timeouts").implicit);

  caps = fromJSON({ strictFileInteractability: true }, false);
  equal(true, caps.get("strictFileInteractability"));

  caps = fromJSON({ webSocketUrl: true }, false);
  equal(true, caps.get("webSocketUrl"));

  // Mozilla specific capabilities
  caps = fromJSON({ "moz:accessibilityChecks": true }, false);
  equal(true, caps.get("moz:accessibilityChecks"));

  caps = fromJSON({ "moz:webdriverClick": true }, false);
  equal(true, caps.get("moz:webdriverClick"));

  // capability is always populated with null if remote agent is not listening
  caps = fromJSON({}, false);
  equal(null, caps.get("moz:debuggerAddress"));
  caps = fromJSON({ "moz:debuggerAddress": "foo" }, false);
  equal(null, caps.get("moz:debuggerAddress"));
  caps = fromJSON({ "moz:debuggerAddress": true }, false);
  equal(null, caps.get("moz:debuggerAddress"));

  // Extension capabilities
  caps = fromJSON({ "webauthn:virtualAuthenticators": true }, false);
  equal(true, caps.get("webauthn:virtualAuthenticators"));
  Assert.throws(
    () => fromJSON({ "webauthn:virtualAuthenticators": "foo" }, false),
    /InvalidArgumentError/
  );

  caps = fromJSON({ "webauthn:extension:uvm": true }, false);
  equal(true, caps.get("webauthn:extension:uvm"));
  Assert.throws(
    () => fromJSON({ "webauthn:extension:uvm": "foo" }, false),
    /InvalidArgumentError/
  );

  caps = fromJSON({ "webauthn:extension:prf": true }, false);
  equal(true, caps.get("webauthn:extension:prf"));
  Assert.throws(
    () => fromJSON({ "webauthn:extension:prf": "foo" }, false),
    /InvalidArgumentError/
  );

  caps = fromJSON({ "webauthn:extension:largeBlob": true }, false);
  equal(true, caps.get("webauthn:extension:largeBlob"));
  Assert.throws(
    () => fromJSON({ "webauthn:extension:largeBlob": "foo" }, false),
    /InvalidArgumentError/
  );

  caps = fromJSON({ "webauthn:extension:credBlob": true }, false);
  equal(true, caps.get("webauthn:extension:credBlob"));
  Assert.throws(
    () => fromJSON({ "webauthn:extension:credBlob": "foo" }, false),
    /InvalidArgumentError/
  );
});

add_task(function test_Capabilities_fromJSON_bidi() {
  const { fromJSON } = Capabilities;

  // plain
  for (const type of [{}, null, undefined]) {
    ok(fromJSON(type, true).has("browserName"));
  }

  let caps;

  // Capabilities supported by HTTP and BiDi
  caps = fromJSON({ acceptInsecureCerts: true }, true);
  equal(true, caps.get("acceptInsecureCerts"));

  let proxyConfig = { proxyType: "manual" };
  caps = fromJSON({ proxy: proxyConfig }, true);
  equal("manual", caps.get("proxy").proxyType);

  // HTTP capabilities are ignored for BiDi-only sessions
  for (let strategy of Object.values(PageLoadStrategy)) {
    caps = fromJSON({ pageLoadStrategy: strategy }, true);
    ok(!caps.has("pageLoadStrategy"));
  }

  let timeoutsConfig = { implicit: 123 };
  caps = fromJSON({ timeouts: timeoutsConfig }, true);
  ok(!caps.has("timeouts"));

  caps = fromJSON({ strictFileInteractability: true }, true);
  ok(!caps.has("strictFileInteractability"));

  caps = fromJSON({ webSocketUrl: true }, true);
  ok(!caps.has("webSocketUrl"));

  // Mozilla specific capabilities
  caps = fromJSON({ "moz:accessibilityChecks": true }, true);
  ok(!caps.has("moz:accessibilityChecks"));

  caps = fromJSON({ "moz:webdriverClick": true }, true);
  equal(undefined, caps.get("moz:webdriverClick"));

  // capability is always populated with null if remote agent is not listening
  caps = fromJSON({}, true);
  equal(null, caps.get("moz:debuggerAddress"));
  caps = fromJSON({ "moz:debuggerAddress": "foo" }, true);
  equal(null, caps.get("moz:debuggerAddress"));
  caps = fromJSON({ "moz:debuggerAddress": true }, true);
  equal(null, caps.get("moz:debuggerAddress"));

  // Extension capabilities
  caps = fromJSON({ "webauthn:virtualAuthenticators": true }, true);
  ok(!caps.has("webauthn:virtualAuthenticators"));

  caps = fromJSON({ "webauthn:extension:uvm": true }, true);
  ok(!caps.has("webauthn:extension:uvm"));

  caps = fromJSON({ "webauthn:extension:prf": true }, true);
  ok(!caps.has("webauthn:extension:prf"));

  caps = fromJSON({ "webauthn:extension:largeBlob": true }, true);
  ok(!caps.has("webauthn:extension:largeBlob"));

  caps = fromJSON({ "webauthn:extension:credBlob": true }, true);
  ok(!caps.has("webauthn:extension:credBlob"));
});

add_task(function test_mergeCapabilities() {
  // Shadowed values.
  Assert.throws(
    () =>
      mergeCapabilities(
        { acceptInsecureCerts: true },
        { acceptInsecureCerts: false }
      ),
    /InvalidArgumentError/
  );

  deepEqual(
    { acceptInsecureCerts: true },
    mergeCapabilities({ acceptInsecureCerts: true }, undefined)
  );
  deepEqual(
    { acceptInsecureCerts: true, browserName: "Firefox" },
    mergeCapabilities({ acceptInsecureCerts: true }, { browserName: "Firefox" })
  );
});

add_task(function test_validateCapabilities_invalid() {
  const invalidCapabilities = [
    true,
    42,
    "foo",
    [],
    { acceptInsecureCerts: "foo" },
    { browserName: true },
    { browserVersion: true },
    { platformName: true },
    { pageLoadStrategy: "foo" },
    { proxy: false },
    { strictFileInteractability: "foo" },
    { timeouts: false },
    { unhandledPromptBehavior: false },
    { webSocketUrl: false },
    { webSocketUrl: "foo" },
    { "moz:firefoxOptions": "foo" },
    { "moz:accessibilityChecks": "foo" },
    { "moz:webdriverClick": "foo" },
    { "moz:webdriverClick": 1 },
    { "moz:debuggerAddress": "foo" },
    { "moz:someRandomString": {} },
  ];
  for (const capabilities of invalidCapabilities) {
    Assert.throws(
      () => validateCapabilities(capabilities),
      /InvalidArgumentError/
    );
  }
});

add_task(function test_validateCapabilities_valid() {
  // Ignore null value.
  deepEqual({}, validateCapabilities({ test: null }));

  const validCapabilities = [
    { acceptInsecureCerts: true },
    { browserName: "firefox" },
    { browserVersion: "12" },
    { platformName: "linux" },
    { pageLoadStrategy: "eager" },
    { proxy: { proxyType: "manual", httpProxy: "test.com" } },
    { strictFileInteractability: true },
    { timeouts: { pageLoad: 500 } },
    { unhandledPromptBehavior: "accept" },
    { webSocketUrl: true },
    { "moz:firefoxOptions": {} },
    { "moz:accessibilityChecks": true },
    { "moz:webdriverClick": true },
    { "moz:debuggerAddress": true },
    { "test:extension": "foo" },
  ];
  for (const validCapability of validCapabilities) {
    deepEqual(validCapability, validateCapabilities(validCapability));
  }
});

add_task(function test_processCapabilities() {
  for (const invalidValue of [
    { capabilities: null },
    { capabilities: undefined },
    { capabilities: "foo" },
    { capabilities: true },
    { capabilities: [] },
    { capabilities: { alwaysMatch: null } },
    { capabilities: { alwaysMatch: "foo" } },
    { capabilities: { alwaysMatch: true } },
    { capabilities: { alwaysMatch: [] } },
    { capabilities: { firstMatch: null } },
    { capabilities: { firstMatch: "foo" } },
    { capabilities: { firstMatch: true } },
    { capabilities: { firstMatch: {} } },
    { capabilities: { firstMatch: [] } },
  ]) {
    Assert.throws(
      () => processCapabilities(invalidValue),
      /InvalidArgumentError/
    );
  }

  deepEqual(
    { acceptInsecureCerts: true },
    processCapabilities({
      capabilities: { alwaysMatch: { acceptInsecureCerts: true } },
    })
  );
  deepEqual(
    { browserName: "Firefox" },
    processCapabilities({
      capabilities: { firstMatch: [{ browserName: "Firefox" }] },
    })
  );
  deepEqual(
    { acceptInsecureCerts: true, browserName: "Firefox" },
    processCapabilities({
      capabilities: {
        alwaysMatch: { acceptInsecureCerts: true },
        firstMatch: [{ browserName: "Firefox" }],
      },
    })
  );
});

// use Proxy.toJSON to test marshal
add_task(function test_marshal() {
  let proxy = new Proxy();

  // drop empty fields
  deepEqual({}, proxy.toJSON());
  proxy.proxyType = "manual";
  deepEqual({ proxyType: "manual" }, proxy.toJSON());
  proxy.proxyType = null;
  deepEqual({}, proxy.toJSON());
  proxy.proxyType = undefined;
  deepEqual({}, proxy.toJSON());

  // iterate over object literals
  proxy.proxyType = { foo: "bar" };
  deepEqual({ proxyType: { foo: "bar" } }, proxy.toJSON());

  // iterate over complex object that implement toJSON
  proxy.proxyType = new Proxy();
  deepEqual({}, proxy.toJSON());
  proxy.proxyType.proxyType = "manual";
  deepEqual({ proxyType: { proxyType: "manual" } }, proxy.toJSON());

  // drop objects with no entries
  proxy.proxyType = { foo: {} };
  deepEqual({}, proxy.toJSON());
  proxy.proxyType = { foo: new Proxy() };
  deepEqual({}, proxy.toJSON());
});
