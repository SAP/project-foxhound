/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
"use strict";

const { SitePermissions } = ChromeUtils.importESModule(
  "resource:///modules/SitePermissions.sys.mjs"
);

const PERM_A = "foo";
const PERM_B = "bar";
const PERM_C = "foobar";

let nextBrowserId = 1000;

function createDummyBrowser(spec) {
  let uri = Services.io.newURI(spec);
  let browserId = nextBrowserId++;
  return {
    currentURI: uri,
    contentPrincipal: Services.scriptSecurityManager.createContentPrincipal(
      uri,
      {}
    ),
    dispatchEvent: () => {},
    documentGlobal: {
      CustomEvent: class CustomEvent {},
    },
    browserId,
  };
}

const BROWSER_A = createDummyBrowser("https://example.com/foo");
const BROWSER_B = createDummyBrowser("https://example.org/foo");

const EXPIRY_MS_A = 1000000;
const EXPIRY_MS_B = 1000001;

function navigateDummyBrowser(browser, uri) {
  if (typeof uri == "string") {
    uri = Services.io.newURI(uri);
  }
  browser.currentURI = uri;
  browser.contentPrincipal =
    Services.scriptSecurityManager.createContentPrincipal(
      browser.currentURI,
      {}
    );
}

/**
 * Tests that temporary permissions with different block states are stored
 * (set, overwrite, delete) correctly.
 */
add_task(async function testAllowBlock() {
  SitePermissions.setForPrincipal(
    null,
    PERM_A,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_A
  );

  SitePermissions.setForPrincipal(
    null,
    PERM_B,
    SitePermissions.BLOCK,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_A
  );

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_A, BROWSER_A),
    {
      state: SitePermissions.ALLOW,
      scope: SitePermissions.SCOPE_TEMPORARY,
    },
    "SitePermissions returns expected permission state for perm A."
  );

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_B, BROWSER_A),
    {
      state: SitePermissions.BLOCK,
      scope: SitePermissions.SCOPE_TEMPORARY,
    },
    "SitePermissions returns expected permission state for perm B."
  );

  // Overwrite permission B with non-block state.
  SitePermissions.setForPrincipal(
    null,
    PERM_B,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_A
  );

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_B, BROWSER_A),
    {
      state: SitePermissions.ALLOW,
      scope: SitePermissions.SCOPE_TEMPORARY,
    },
    "SitePermissions returns updated permission state for perm B."
  );

  // Remove permissions.
  SitePermissions.removeFromPrincipal(null, PERM_A, BROWSER_A);
  SitePermissions.removeFromPrincipal(null, PERM_B, BROWSER_A);

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_A, BROWSER_A),
    {
      state: SitePermissions.UNKNOWN,
      scope: SitePermissions.SCOPE_PERSISTENT,
    },
    "SitePermissions returns UNKNOWN state for A."
  );

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_B, BROWSER_A),
    {
      state: SitePermissions.UNKNOWN,
      scope: SitePermissions.SCOPE_PERSISTENT,
    },
    "SitePermissions returns UNKNOWN state for B."
  );
});

/**
 * Tests getAllForBrowser with temporary permissions.
 */
add_task(async function testGetAll() {
  SitePermissions.setForPrincipal(
    null,
    PERM_A,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_A
  );
  SitePermissions.setForPrincipal(
    null,
    PERM_B,
    SitePermissions.BLOCK,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_B,
    EXPIRY_MS_A
  );
  SitePermissions.setForPrincipal(
    null,
    PERM_C,
    SitePermissions.PROMPT,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_B,
    EXPIRY_MS_A
  );

  let permsA = SitePermissions.getAllForBrowser(BROWSER_A);
  let tempPermsA = permsA.filter(
    p => p.scope == SitePermissions.SCOPE_TEMPORARY
  );
  Assert.equal(tempPermsA.length, 1, "BROWSER_A should have 1 temp permission");
  Assert.equal(tempPermsA[0].id, PERM_A);
  Assert.equal(tempPermsA[0].state, SitePermissions.ALLOW);

  let permsB = SitePermissions.getAllForBrowser(BROWSER_B);
  let tempPermsB = permsB.filter(
    p => p.scope == SitePermissions.SCOPE_TEMPORARY
  );
  Assert.equal(
    tempPermsB.length,
    2,
    "There should be 2 permissions set for BROWSER_B"
  );

  // Clean up.
  let bcIdA = BROWSER_A.browserId;
  let bcIdB = BROWSER_B.browserId;
  Services.perms.removeAllForBrowser(bcIdA);
  Services.perms.removeAllForBrowser(bcIdB);
});

/**
 * Tests SitePermissions#clearTemporaryBlockPermissions.
 */
add_task(async function testClear() {
  SitePermissions.setForPrincipal(
    null,
    PERM_A,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_A
  );
  SitePermissions.setForPrincipal(
    null,
    PERM_B,
    SitePermissions.BLOCK,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_A
  );
  SitePermissions.setForPrincipal(
    null,
    PERM_C,
    SitePermissions.BLOCK,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_B,
    EXPIRY_MS_A
  );

  SitePermissions.clearTemporaryBlockPermissions(BROWSER_A);

  // We only clear block permissions, so we should still see PERM_A.
  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_A, BROWSER_A),
    {
      state: SitePermissions.ALLOW,
      scope: SitePermissions.SCOPE_TEMPORARY,
    },
    "SitePermissions returns ALLOW state for PERM_A."
  );
  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_B, BROWSER_A),
    {
      state: SitePermissions.UNKNOWN,
      scope: SitePermissions.SCOPE_PERSISTENT,
    },
    "SitePermissions returns UNKNOWN state for PERM_B after clearing blocks."
  );
  // BROWSER_B should still have its permission.
  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_C, BROWSER_B),
    {
      state: SitePermissions.BLOCK,
      scope: SitePermissions.SCOPE_TEMPORARY,
    },
    "SitePermissions returns BLOCK state for PERM_C."
  );

  // Clean up.
  let bcIdA = BROWSER_A.browserId;
  let bcIdB = BROWSER_B.browserId;
  Services.perms.removeAllForBrowser(bcIdA);
  Services.perms.removeAllForBrowser(bcIdB);
});

/**
 * Tests that the permission setter throws an exception if an invalid expiry
 * time is passed.
 */
add_task(async function testInvalidExpiryTime() {
  let expectedError = /expireTime must be a positive integer/;
  Assert.throws(() => {
    SitePermissions.setForPrincipal(
      null,
      PERM_A,
      SitePermissions.ALLOW,
      SitePermissions.SCOPE_TEMPORARY,
      BROWSER_A,
      null
    );
  }, expectedError);
  Assert.throws(() => {
    SitePermissions.setForPrincipal(
      null,
      PERM_A,
      SitePermissions.ALLOW,
      SitePermissions.SCOPE_TEMPORARY,
      BROWSER_A,
      0
    );
  }, expectedError);
  Assert.throws(() => {
    SitePermissions.setForPrincipal(
      null,
      PERM_A,
      SitePermissions.ALLOW,
      SitePermissions.SCOPE_TEMPORARY,
      BROWSER_A,
      -100
    );
  }, expectedError);
});

/**
 * Tests that we block by site but allow by origin.
 * DENY permissions are keyed by site (scheme + baseDomain), so subdomains
 * of the same scheme match. Non-DENY permissions are keyed by origin.
 */
add_task(async function testTemporaryPermissionScope() {
  let states = {
    strict: {
      same: [
        "https://example.com",
        "https://example.com/sub/path",
        "https://example.com:443",
        "https://name:password@example.com",
      ],
      different: [
        "https://example.com",
        "https://test1.example.com",
        "http://example.com",
        "http://example.org",
        "file:///tmp/localPageA.html",
        "file:///tmp/localPageB.html",
      ],
    },
    nonStrict: {
      same: [
        "https://example.com",
        "https://example.com/sub/path",
        "https://example.com:443",
        "https://test1.example.com",
        "https://name:password@example.com",
      ],
      different: [
        "https://example.com",
        "http://example.com",
        "https://example.org",
        "http://example.net",
      ],
    },
  };

  for (let state of [SitePermissions.BLOCK, SitePermissions.ALLOW]) {
    let matchStrict = state != SitePermissions.BLOCK;

    let lists = matchStrict ? states.strict : states.nonStrict;

    Object.entries(lists).forEach(([type, list]) => {
      let expectSet = type == "same";

      for (let uri of list) {
        let browser = createDummyBrowser(uri);
        SitePermissions.setForPrincipal(
          null,
          PERM_A,
          state,
          SitePermissions.SCOPE_TEMPORARY,
          browser,
          EXPIRY_MS_A
        );

        ok(true, "origin:" + browser.contentPrincipal.origin);

        for (let otherUri of list) {
          if (uri == otherUri) {
            continue;
          }
          navigateDummyBrowser(browser, otherUri);
          ok(true, "new origin:" + browser.contentPrincipal.origin);

          Assert.deepEqual(
            SitePermissions.getForPrincipal(null, PERM_A, browser),
            {
              state: expectSet ? state : SitePermissions.UNKNOWN,
              scope: expectSet
                ? SitePermissions.SCOPE_TEMPORARY
                : SitePermissions.SCOPE_PERSISTENT,
            },
            `${
              state == SitePermissions.BLOCK ? "Block" : "Allow"
            } Permission originally set for ${uri} should ${
              expectSet ? "not" : "also"
            } be set for ${otherUri}.`
          );
        }

        Services.perms.removeAllForBrowser(browser.browserId);
      }
    });
  }
});

/**
 * Tests that we can override the principal to use for keying temporary
 * permissions.
 */
add_task(async function testOverrideBrowserURI() {
  let testBrowser = createDummyBrowser("https://old.example.com/foo");
  let overrideURI = Services.io.newURI("https://test.example.org/test/path");
  SitePermissions.setForPrincipal(
    Services.scriptSecurityManager.createContentPrincipal(overrideURI, {}),
    PERM_A,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    testBrowser,
    EXPIRY_MS_A
  );

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_A, testBrowser),
    {
      state: SitePermissions.UNKNOWN,
      scope: SitePermissions.SCOPE_PERSISTENT,
    },
    "Permission should not be set for old URI."
  );

  // "Navigate" to new URI.
  navigateDummyBrowser(testBrowser, overrideURI);

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_A, testBrowser),
    {
      state: SitePermissions.ALLOW,
      scope: SitePermissions.SCOPE_TEMPORARY,
    },
    "Permission should be set for new URI."
  );

  Services.perms.removeAllForBrowser(testBrowser.browserId);
});

/**
 * Tests that SitePermissions does not throw for incompatible URI or
 * browser.currentURI.
 */
add_task(async function testPermissionUnsupportedScheme() {
  let aboutURI = Services.io.newURI("about:blank");

  // Incompatible override URI should not throw or store any permissions.
  SitePermissions.setForPrincipal(
    Services.scriptSecurityManager.createContentPrincipal(aboutURI, {}),
    PERM_A,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    BROWSER_A,
    EXPIRY_MS_B
  );

  let browser = createDummyBrowser("https://example.com/");
  // Set a permission so we get an entry.
  SitePermissions.setForPrincipal(
    null,
    PERM_B,
    SitePermissions.BLOCK,
    SitePermissions.SCOPE_TEMPORARY,
    browser
  );

  // Change browser URI to about:blank.
  navigateDummyBrowser(browser, aboutURI);

  // Setting permission for browser with unsupported URI should not throw.
  SitePermissions.setForPrincipal(
    null,
    PERM_A,
    SitePermissions.ALLOW,
    SitePermissions.SCOPE_TEMPORARY,
    browser
  );
  Assert.ok(true, "Set should not throw for unsupported URI");

  SitePermissions.removeFromPrincipal(null, PERM_A, browser);
  Assert.ok(true, "Remove should not throw for unsupported URI");

  Assert.deepEqual(
    SitePermissions.getForPrincipal(null, PERM_A, browser),
    {
      state: SitePermissions.UNKNOWN,
      scope: SitePermissions.SCOPE_PERSISTENT,
    },
    "Should return no permission set for unsupported URI."
  );
  Assert.ok(true, "Get should not throw for unsupported URI");

  // getAll should not throw, but return empty permissions array for about:blank.
  let permissions = SitePermissions.getAllForBrowser(browser);
  Assert.ok(
    Array.isArray(permissions),
    "Should return array for browser on about:blank"
  );

  Services.perms.removeAllForBrowser(browser.browserId);
});
