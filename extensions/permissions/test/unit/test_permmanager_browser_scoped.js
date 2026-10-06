/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */
"use strict";

const PERM_TYPE = "test-browser-perm";
const PERM_TYPE_B = "test-browser-perm-b";

function makePrincipal(uri) {
  return Services.scriptSecurityManager.createContentPrincipal(
    Services.io.newURI(uri),
    {}
  );
}

function makePrincipalWithOA(uri, oa) {
  return Services.scriptSecurityManager.createContentPrincipal(
    Services.io.newURI(uri),
    oa
  );
}

const PRINCIPAL_A = makePrincipal("https://example.com");
const PRINCIPAL_SUB = makePrincipal("https://sub.example.com");

const BROWSER_ID_1 = 90001;
const BROWSER_ID_2 = 90002;

add_task(async function test_add_test_get_remove() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "Should read back ALLOW"
  );

  let perm = pm.getForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1);
  Assert.ok(perm, "getForBrowser should return a permission");
  Assert.equal(perm.capability, pm.ALLOW_ACTION);
  Assert.equal(perm.browserId, BROWSER_ID_1);

  pm.removeFromPrincipalForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1);

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.UNKNOWN_ACTION,
    "Should be UNKNOWN after removal"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_cross_browser_isolation() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "Permission should exist on BROWSER_ID_1"
  );
  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_2),
    pm.UNKNOWN_ACTION,
    "Permission should NOT be visible on BROWSER_ID_2"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_invalid_browser_id() {
  let pm = Services.perms;

  Assert.throws(
    () =>
      pm.addFromPrincipalForBrowser(PRINCIPAL_A, PERM_TYPE, pm.ALLOW_ACTION, 0),
    /NS_ERROR/,
    "browserId 0 should be rejected"
  );
});

add_task(async function test_deny_site_scoped() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_SUB,
    PERM_TYPE,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.DENY_ACTION,
    "DENY should match base domain"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_non_deny_origin_scoped() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_SUB,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.UNKNOWN_ACTION,
    "ALLOW should NOT match different origin"
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_SUB, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "ALLOW should match same origin"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_getAllForBrowser() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE_B,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  let all = pm.getAllForBrowser(PRINCIPAL_A, BROWSER_ID_1);
  Assert.equal(all.length, 2, "Should have 2 permissions");

  let types = all.map(p => p.type).sort();
  Assert.deepEqual(
    types,
    [PERM_TYPE, PERM_TYPE_B].sort(),
    "Should contain both permission types"
  );

  let byType = {};
  for (let p of all) {
    byType[p.type] = p.capability;
  }
  Assert.equal(byType[PERM_TYPE], pm.ALLOW_ACTION, "PERM_TYPE should be ALLOW");
  Assert.equal(
    byType[PERM_TYPE_B],
    pm.DENY_ACTION,
    "PERM_TYPE_B should be DENY"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_removeByActionForBrowser() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE_B,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  pm.removeByActionForBrowser(BROWSER_ID_1, pm.DENY_ACTION);

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "ALLOW should remain"
  );
  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE_B, BROWSER_ID_1),
    pm.UNKNOWN_ACTION,
    "DENY should be removed"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_removeAllForBrowser() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE_B,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  pm.removeAllForBrowser(BROWSER_ID_1);

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.UNKNOWN_ACTION
  );
  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE_B, BROWSER_ID_1),
    pm.UNKNOWN_ACTION
  );
});

add_task(async function test_copyBrowserPermissions() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE_B,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  pm.copyBrowserPermissions(BROWSER_ID_1, BROWSER_ID_2);

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_2),
    pm.ALLOW_ACTION,
    "ALLOW permission should be copied"
  );
  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE_B, BROWSER_ID_2),
    pm.DENY_ACTION,
    "DENY permission should be copied"
  );

  // src == dest is a no-op.
  pm.copyBrowserPermissions(BROWSER_ID_2, BROWSER_ID_2);
  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_2),
    pm.ALLOW_ACTION,
    "No-op copy should not break anything"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
  pm.removeAllForBrowser(BROWSER_ID_2);
});

add_task(async function test_notification_observer() {
  let pm = Services.perms;

  let observed = [];
  let observer = {
    observe(subject, topic, data) {
      let perm = subject.QueryInterface(Ci.nsIPermission);
      observed.push({
        data,
        type: perm.type,
        browserId: perm.browserId,
        capability: perm.capability,
      });
    },
  };

  Services.obs.addObserver(observer, "browser-perm-changed");

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(observed.length, 1, "Should have one notification");
  Assert.equal(observed[0].data, "added");
  Assert.equal(observed[0].type, PERM_TYPE);
  Assert.equal(observed[0].browserId, BROWSER_ID_1);
  Assert.equal(observed[0].capability, pm.ALLOW_ACTION);

  // Overwrite with a different capability triggers "changed".
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(observed.length, 2);
  Assert.equal(observed[1].data, "changed");
  Assert.equal(observed[1].capability, pm.DENY_ACTION);

  // Remove triggers "deleted".
  pm.removeFromPrincipalForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1);

  Assert.equal(observed.length, 3);
  Assert.equal(observed[2].data, "deleted");

  Services.obs.removeObserver(observer, "browser-perm-changed");
  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_notification_overwrite_same_key() {
  let pm = Services.perms;

  let observed = [];
  let observer = {
    observe(subject, topic, data) {
      observed.push(data);
    },
  };

  Services.obs.addObserver(observer, "browser-perm-changed");

  // Add ALLOW, then overwrite with PROMPT — both are origin-scoped, so
  // the second call hits the same composite key and fires "changed".
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.PROMPT_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(observed.length, 2);
  Assert.equal(observed[0], "added");
  Assert.equal(observed[1], "changed");

  Services.obs.removeObserver(observer, "browser-perm-changed");
  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_timer_expiry() {
  let pm = Services.perms;

  let deletedPromise = new Promise(resolve => {
    let observer = {
      observe(subject, topic, data) {
        if (data == "deleted") {
          let perm = subject.QueryInterface(Ci.nsIPermission);
          if (perm.type == PERM_TYPE && perm.browserId == BROWSER_ID_1) {
            Services.obs.removeObserver(observer, "browser-perm-changed");
            resolve();
          }
        }
      },
    };
    Services.obs.addObserver(observer, "browser-perm-changed");
  });

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    100
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "Permission should exist before expiry"
  );

  await deletedPromise;

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.UNKNOWN_ACTION,
    "Permission should be gone after expiry"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_switch_deny_non_deny() {
  let pm = Services.perms;

  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.DENY_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.DENY_ACTION
  );

  // Switching to ALLOW should clear the site-scoped DENY entry.
  pm.addFromPrincipalForBrowser(
    PRINCIPAL_A,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(PRINCIPAL_A, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "Should now be ALLOW"
  );

  // Subdomain should no longer see DENY (the site-scoped entry was removed).
  Assert.equal(
    pm.testForBrowser(PRINCIPAL_SUB, PERM_TYPE, BROWSER_ID_1),
    pm.UNKNOWN_ACTION,
    "Subdomain should not match origin-scoped ALLOW"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});

add_task(async function test_oa_strip_permission() {
  let pm = Services.perms;

  // "cookie" is in kStripOAPermissions, so OA should be stripped from the key.
  // A permission set from a private browsing principal should be visible
  // from a normal browsing principal for the same origin.
  let principalPB = makePrincipalWithOA("https://example.com", {
    privateBrowsingId: 1,
  });
  let principalNormal = makePrincipal("https://example.com");

  pm.addFromPrincipalForBrowser(
    principalPB,
    "cookie",
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(principalNormal, "cookie", BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "OA-stripped permission should be visible from normal principal"
  );

  Assert.equal(
    pm.testForBrowser(principalPB, "cookie", BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "OA-stripped permission should be visible from PB principal"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);

  // Non-OA-stripped type should NOT be visible across OA boundaries.
  pm.addFromPrincipalForBrowser(
    principalPB,
    PERM_TYPE,
    pm.ALLOW_ACTION,
    BROWSER_ID_1,
    0
  );

  Assert.equal(
    pm.testForBrowser(principalNormal, PERM_TYPE, BROWSER_ID_1),
    pm.UNKNOWN_ACTION,
    "Non-OA-stripped permission should NOT be visible from different OA"
  );

  Assert.equal(
    pm.testForBrowser(principalPB, PERM_TYPE, BROWSER_ID_1),
    pm.ALLOW_ACTION,
    "Non-OA-stripped permission should be visible from same OA"
  );

  pm.removeAllForBrowser(BROWSER_ID_1);
});
