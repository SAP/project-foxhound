/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPStartupCacheSingleton } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPStartupCache.sys.mjs"
);

/**
 * Creates and initializes a new IPPStartupCacheSingleton instance.
 *
 * when used with `using` statement, it will be automatically uninitialized, when the test exists
 */
const makeCacheHandle = () => {
  let cache = new IPPStartupCacheSingleton();
  cache.init();
  return {
    cache,
    [Symbol.dispose]() {
      cache.uninit();
    },
  };
};

/**
 * Test the disabled cache
 */
add_task(async function test_IPPStartupCache_disabled() {
  // By default the cache is not active.
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", true);
  using cacheHandle = makeCacheHandle();

  Assert.ok(
    cacheHandle.cache.isStartupCompleted,
    "In XPCShell mode the cache is not active"
  );
});

/**
 * Test the enabled cache
 */
add_task(async function test_IPPStartupCache_enabled() {
  // By default the cache is not active.
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  // Default state is UNINITIALIZED
  {
    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(
      cacheHandle.cache.state,
      IPProtectionStates.UNINITIALIZED,
      "The state is unitialized"
    );
  }

  // Fetch the cached state
  {
    Services.prefs.setCharPref(
      "browser.ipProtection.stateCache",
      IPProtectionStates.READY
    );

    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(
      cacheHandle.cache.state,
      IPProtectionStates.READY,
      "The state is READY"
    );
  }

  // Invalid cache means UNINITIALIZED
  {
    Services.prefs.setCharPref(
      "browser.ipProtection.stateCache",
      "Hello World!"
    );

    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(
      cacheHandle.cache.state,
      IPProtectionStates.UNINITIALIZED,
      "The state is unitialized"
    );
  }
});

/**
 * Cache the entitlement
 */
add_task(async function test_IPPStartupCache_enabled() {
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  // Default entitlement is null
  {
    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(cacheHandle.cache.entitlement, null, "Null entitlement");
  }

  // Store and retrieve a valid entitlement
  {
    const originalEntitlement = new Entitlement({
      autostart: true,
      created_at: "2024-01-15T10:30:00.000Z",
      limited_bandwidth: false,
      location_controls: true,
      subscribed: true,
      uid: 12345,
      website_inclusion: false,
      maxBytes: "1000000000",
    });

    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );

    cacheHandle.cache.storeEntitlement(originalEntitlement);

    const storedPref = Services.prefs.getCharPref(
      "browser.ipProtection.entitlementCache",
      ""
    );
    Assert.greater(storedPref.length, 0, "The cache is correctly stored");

    const hasUpgraded = Services.prefs.getBoolPref(
      "browser.ipProtection.hasUpgraded",
      false
    );
    Assert.equal(
      hasUpgraded,
      true,
      "hasUpgraded is true when subscribed is true"
    );

    const retrievedEntitlement = cacheHandle.cache.entitlement;
    Assert.notEqual(
      retrievedEntitlement,
      null,
      "Retrieved entitlement is not null"
    );

    for (const key of Object.keys(originalEntitlement)) {
      const expected = originalEntitlement[key];
      const actual = retrievedEntitlement[key];
      if (typeof expected === "bigint") {
        Assert.equal(actual.toString(), expected.toString(), `${key} matches`);
      } else if (key === "created_at") {
        Assert.equal(
          actual.toISOString(),
          expected.toISOString(),
          `${key} matches`
        );
      } else {
        Assert.equal(actual, expected, `${key} matches`);
      }
    }
  }

  // Store and retrieve an entitlement with subscribed: false
  {
    const unsubscribedEntitlement = new Entitlement({
      autostart: false,
      created_at: "2024-01-15T10:30:00.000Z",
      limited_bandwidth: true,
      location_controls: false,
      subscribed: false,
      uid: 12345,
      website_inclusion: false,
      maxBytes: "100000000",
    });

    using cacheHandle = makeCacheHandle();

    cacheHandle.cache.storeEntitlement(unsubscribedEntitlement);

    const hasUpgraded = Services.prefs.getBoolPref(
      "browser.ipProtection.hasUpgraded",
      true
    );
    Assert.equal(
      hasUpgraded,
      false,
      "hasUpgraded is false when subscribed is false"
    );
  }

  // Store null entitlement sets hasUpgraded to false
  {
    using cacheHandle = makeCacheHandle();

    cacheHandle.cache.storeEntitlement(null);

    const hasUpgraded = Services.prefs.getBoolPref(
      "browser.ipProtection.hasUpgraded",
      true
    );
    Assert.equal(
      hasUpgraded,
      false,
      "hasUpgraded is false when entitlement is null"
    );
  }

  // Invalid JSON returns null
  {
    Services.prefs.setCharPref(
      "browser.ipProtection.entitlementCache",
      '{"invalid json}}}}'
    );

    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );
    Assert.equal(
      cacheHandle.cache.entitlement,
      null,
      "Invalid JSON returns null"
    );
  }

  // Storing non-Entitlement objects throws
  {
    using cacheHandle = makeCacheHandle();

    Assert.ok(
      !cacheHandle.cache.isStartupCompleted,
      "In XPCShell mode the cache is active"
    );

    Assert.throws(
      () => cacheHandle.cache.storeEntitlement(42),
      /Error/,
      "Storing a number should throw"
    );

    Assert.throws(
      () => cacheHandle.cache.storeEntitlement({ a: 42 }),
      /Error/,
      "Storing arbitrary object should throw"
    );
  }

  Services.prefs.clearUserPref("browser.ipProtection.hasUpgraded");
  Services.prefs.clearUserPref("browser.ipProtection.entitlementCache");
});

add_task(async function test_IPPStartupCache_usageInfo_store_read() {
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  const originalUsage = new ProxyUsage(
    "1000000000",
    "750000000",
    "2026-02-01T00:00:00Z"
  );

  using cacheHandle = makeCacheHandle();

  cacheHandle.cache.storeUsageInfo(originalUsage);

  const storedPref = Services.prefs.getCharPref(
    "browser.ipProtection.usageCache",
    ""
  );
  Assert.greater(storedPref.length, 0, "usageInfo stored in pref");

  const retrievedUsage = cacheHandle.cache.usageInfo;
  Assert.notEqual(retrievedUsage, null, "Retrieved usageInfo is not null");

  Assert.equal(
    retrievedUsage.max.toString(),
    originalUsage.max.toString(),
    "max matches after store/read"
  );
  Assert.equal(
    retrievedUsage.remaining.toString(),
    originalUsage.remaining.toString(),
    "remaining matches after store/read"
  );
  Assert.equal(
    retrievedUsage.reset.toString(),
    originalUsage.reset.toString(),
    "reset matches after store/read"
  );

  cacheHandle.cache.storeUsageInfo(null);
  const clearedPref = Services.prefs.getCharPref(
    "browser.ipProtection.usageCache",
    ""
  );
  Assert.equal(clearedPref, "", "Null usageInfo clears pref");
  Assert.equal(
    cacheHandle.cache.usageInfo,
    null,
    "Reading cleared cache returns null"
  );

  Services.prefs.clearUserPref("browser.ipProtection.usageCache");
});

add_task(async function test_IPPStartupCache_usageInfo_type_validation() {
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  using cacheHandle = makeCacheHandle();

  Assert.throws(
    () => cacheHandle.cache.storeUsageInfo(42),
    /Error/,
    "Storing number throws"
  );

  Assert.throws(
    () => cacheHandle.cache.storeUsageInfo({ max: "100", remaining: "50" }),
    /Error/,
    "Storing plain object throws"
  );

  Assert.throws(
    () => cacheHandle.cache.storeUsageInfo("string"),
    /Error/,
    "Storing string throws"
  );

  Assert.throws(
    () => cacheHandle.cache.storeUsageInfo([1, 2, 3]),
    /Error/,
    "Storing array throws"
  );
  Services.prefs.clearUserPref("browser.ipProtection.usageCache");
});

add_task(async function test_IPPStartupCache_usage_event_listener() {
  Services.prefs.setBoolPref("browser.ipProtection.cacheDisabled", false);

  using cacheHandle = makeCacheHandle();

  Services.obs.notifyObservers(null, "sessionstore-windows-restored");
  await new Promise(resolve => executeSoon(resolve));

  Assert.ok(
    cacheHandle.cache.isStartupCompleted,
    "Startup should be completed after observer notification"
  );

  const testUsage = new ProxyUsage(
    "2000000000",
    "1500000000",
    "2026-02-15T00:00:00Z"
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: { usage: testUsage },
    })
  );

  await new Promise(resolve => executeSoon(resolve));

  const storedPref = Services.prefs.getCharPref(
    "browser.ipProtection.usageCache",
    ""
  );
  Assert.greater(storedPref.length, 0, "Usage was stored after event dispatch");

  const retrievedUsage = cacheHandle.cache.usageInfo;
  Assert.equal(
    retrievedUsage.max.toString(),
    testUsage.max.toString(),
    "Stored usage max matches"
  );

  cacheHandle.cache.uninit();

  const newUsage = new ProxyUsage(
    "3000000000",
    "2000000000",
    "2026-03-15T00:00:00Z"
  );

  IPPProxyManager.dispatchEvent(
    new CustomEvent("IPPProxyManager:UsageChanged", {
      bubbles: true,
      composed: true,
      detail: { usage: newUsage },
    })
  );

  await new Promise(resolve => executeSoon(resolve));

  const unchangedUsage = cacheHandle.cache.usageInfo;
  Assert.equal(
    unchangedUsage.max.toString(),
    testUsage.max.toString(),
    "Usage unchanged after uninit"
  );

  Services.prefs.clearUserPref("browser.ipProtection.usageCache");
  Services.prefs.clearUserPref("browser.ipProtection.stateCache");
});
