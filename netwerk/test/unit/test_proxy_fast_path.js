/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);

const pps = Cc["@mozilla.org/network/protocol-proxy-service;1"].getService(
  Ci.nsIProtocolProxyService
);
const prefs = Services.prefs;

function resolveProxy(uri = "http://www.example.com/") {
  const channel = NetUtil.newChannel({ uri, loadUsingSystemPrincipal: true });
  return new Promise(resolve => {
    pps.asyncResolve(channel, 0, {
      QueryInterface: ChromeUtils.generateQI(["nsIProtocolProxyCallback"]),
      onProxyAvailable(_req, _channel, pi) {
        resolve(pi);
      },
    });
  });
}

add_setup(function () {
  const originalProxyType = prefs.getIntPref("network.proxy.type");
  registerCleanupFunction(() => {
    prefs.setIntPref("network.proxy.type", originalProxyType);
    prefs.clearUserPref("network.proxy.fast_path_system_direct");
  });
});

// With PROXYCONFIG_DIRECT (type=0), proxy resolution should return null.
add_task(async function test_direct_no_proxy() {
  prefs.setIntPref("network.proxy.type", 0);
  const pi = await resolveProxy();
  Assert.equal(
    pi,
    null,
    "PROXYCONFIG_DIRECT should resolve to null proxy info"
  );
});

// With fast_path_system_direct disabled, DIRECT should still resolve to null.
add_task(async function test_direct_fast_path_disabled() {
  prefs.setIntPref("network.proxy.type", 0);
  prefs.setBoolPref("network.proxy.fast_path_system_direct", false);
  const pi = await resolveProxy();
  Assert.equal(
    pi,
    null,
    "PROXYCONFIG_DIRECT with fast-path disabled should still return null"
  );
});

// With a registered proxy filter and type=0, the filter must still be invoked.
// (IsEffectivelyDirect returns false when filters are registered.)
add_task(async function test_direct_with_filter_respected() {
  prefs.setIntPref("network.proxy.type", 0);

  let filterCalled = false;
  const filter = {
    QueryInterface: ChromeUtils.generateQI(["nsIProtocolProxyFilter"]),
    applyFilter(_channel, defaultProxy, callback) {
      filterCalled = true;
      // Return the default (null for DIRECT).
      callback.onProxyFilterResult(defaultProxy);
    },
  };
  pps.registerFilter(filter, 0);

  try {
    const pi = await resolveProxy();
    Assert.ok(
      filterCalled,
      "Proxy filter must be called even when proxy type is DIRECT"
    );
    Assert.equal(pi, null, "Filter returning default should still yield null");
  } finally {
    pps.unregisterFilter(filter);
  }
});

// A filter that overrides to a real proxy must be respected (not fast-pathed).
add_task(async function test_direct_filter_can_override() {
  prefs.setIntPref("network.proxy.type", 0);

  const filter = {
    QueryInterface: ChromeUtils.generateQI(["nsIProtocolProxyFilter"]),
    applyFilter(_channel, _defaultProxy, callback) {
      callback.onProxyFilterResult(
        pps.newProxyInfo(
          "http",
          "myproxy.example.com",
          8080,
          "",
          "",
          0,
          0xffffffff,
          null
        )
      );
    },
  };
  pps.registerFilter(filter, 0);

  try {
    const pi = await resolveProxy();
    Assert.ok(pi, "Filter-provided proxy info should not be null");
    Assert.equal(pi.type, "http");
    Assert.equal(pi.host, "myproxy.example.com");
    Assert.equal(pi.port, 8080);
  } finally {
    pps.unregisterFilter(filter);
  }
});

// Registers a mock nsISystemProxySettings, sets PROXYCONFIG_SYSTEM, and runs
// the callback. Cleans up on completion.
async function withMockSystemProxy({ systemProxyDirect, proxyResult }, fn) {
  const mockSettings = {
    QueryInterface: ChromeUtils.generateQI(["nsISystemProxySettings"]),
    mainThreadOnly: true,
    PACURI: null,
    systemWPADSetting: false,
    systemProxyDirect,
    getProxyForURI() {
      return proxyResult;
    },
  };
  const cid = MockRegistrar.register(
    "@mozilla.org/system-proxy-settings;1",
    mockSettings
  );
  const savedProxyType = prefs.getIntPref("network.proxy.type");
  prefs.setIntPref(
    "network.proxy.type",
    Ci.nsIProtocolProxyService.PROXYCONFIG_SYSTEM
  );
  pps.notifyProxyConfigChangedInternal();

  try {
    await fn();
  } finally {
    MockRegistrar.unregister(cid);
    prefs.setIntPref("network.proxy.type", savedProxyType);
    pps.notifyProxyConfigChangedInternal();
  }
}

// With PROXYCONFIG_SYSTEM and a mock that reports systemProxyDirect=true,
// proxy resolution should return null (fast-path taken via Resolve_Internal).
add_task(async function test_system_proxy_direct() {
  await withMockSystemProxy(
    { systemProxyDirect: true, proxyResult: "DIRECT" },
    async () => {
      const pi = await resolveProxy();
      Assert.equal(
        pi,
        null,
        "PROXYCONFIG_SYSTEM with systemProxyDirect=true should resolve to null"
      );
    }
  );
});

// With PROXYCONFIG_SYSTEM and a mock that reports systemProxyDirect=false,
// getProxyForURI is called and its result is used.
add_task(async function test_system_proxy_not_direct() {
  await withMockSystemProxy(
    { systemProxyDirect: false, proxyResult: "PROXY proxy.example.com:8080" },
    async () => {
      const pi = await resolveProxy();
      Assert.ok(
        pi,
        "PROXYCONFIG_SYSTEM with a configured proxy should not be null"
      );
      Assert.equal(pi.host, "proxy.example.com");
      Assert.equal(pi.port, 8080);
    }
  );
});
