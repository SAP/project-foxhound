/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * End-to-end tests for TlsTokenCacheCleaner via nsIClearDataService.
 * PutSSLTokenForTest / CountSSLTokens are test-only helpers on nsINSSComponent
 * that let us seed and verify tokens without full TLS infrastructure.
 * The actual removal correctness is also covered by TestSSLTokensCache gtests.
 */

const nssTestComponent = Cc["@mozilla.org/psm;1"].getService(
  Ci.nsISSLTokensCacheTest
);

const FLAGS = Ci.nsIClearDataService.CLEAR_TLS_TOKEN_CACHE;
const TEST_KEY = "example.com:443";

function seed(key = TEST_KEY) {
  nssTestComponent.putSSLTokenForTest(key);
}

function count() {
  return nssTestComponent.countSSLTokens();
}

function clearData(method, ...args) {
  return new Promise(resolve => {
    Services.clearData[method](...args, FLAGS, errorCode => {
      Assert.equal(errorCode, 0, `${method} should succeed`);
      resolve();
    });
  });
}

async function testClear(method, ...args) {
  seed();
  Assert.equal(count(), 1, "token seeded");
  await clearData(method, ...args);
  Assert.equal(count(), 0, `token cleared by ${method}`);
}

add_task(async function test_deleteAll() {
  await testClear("deleteData");
});

add_task(async function test_deleteDataFromHost() {
  await testClear("deleteDataFromHost", "example.com", true);
});

add_task(async function test_deleteDataFromHost_different_host() {
  seed();
  Assert.equal(count(), 1, "token seeded");
  await clearData("deleteDataFromHost", "other.net", true);
  Assert.equal(count(), 1, "token for example.com not cleared by other.net");
  await clearData("deleteData");
});

add_task(async function test_deleteDataFromSite() {
  await testClear("deleteDataFromSite", "example.com", {}, true);
});

add_task(async function test_deleteDataFromSite_prefixed_key() {
  // Tokens for connection-type-prefixed keys (e.g. "anon:host:port") must also
  // be cleared by site, not just unprefixed keys.
  seed("anon:example.com:443");
  Assert.equal(count(), 1, "prefixed token seeded");
  await clearData("deleteDataFromSite", "example.com", {}, true);
  Assert.equal(count(), 0, "prefixed token cleared by deleteDataFromSite");
});

add_task(async function test_deleteDataFromPrincipal() {
  const principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );
  await testClear("deleteDataFromPrincipal", principal, true);
});

add_task(async function test_flag_included_in_cookies_and_site_data() {
  Assert.ok(
    Ci.nsIClearDataService.CLEAR_COOKIES_AND_SITE_DATA & FLAGS,
    "CLEAR_TLS_TOKEN_CACHE should be included in CLEAR_COOKIES_AND_SITE_DATA"
  );
});
