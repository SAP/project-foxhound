/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint-disable mozilla/no-arbitrary-setTimeout */

"use strict";

const EXPIRE_TIME_MS = 100;
const TIMEOUT_MS = 500;

// This tests the time delay to expire temporary permission entries.
add_task(async function testTemporaryPermissionExpiry() {
  SpecialPowers.pushPrefEnv({
    set: [["privacy.temporary_permission_expire_time_ms", EXPIRE_TIME_MS]],
  });

  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );
  let id = "camera";

  await BrowserTestUtils.withNewTab(principal.spec, async function (browser) {
    SitePermissions.setForPrincipal(
      principal,
      id,
      SitePermissions.BLOCK,
      SitePermissions.SCOPE_TEMPORARY,
      browser
    );

    Assert.deepEqual(SitePermissions.getForPrincipal(principal, id, browser), {
      state: SitePermissions.BLOCK,
      scope: SitePermissions.SCOPE_TEMPORARY,
    });

    await new Promise(c => setTimeout(c, TIMEOUT_MS));

    Assert.deepEqual(SitePermissions.getForPrincipal(principal, id, browser), {
      state: SitePermissions.UNKNOWN,
      scope: SitePermissions.SCOPE_PERSISTENT,
    });
  });
});

// Test that temporary permissions can use a custom expiry time when passed
// explicitly via the expireTimeMS parameter in setForPrincipal, independent
// of the global default (privacy.temporary_permission_expire_time_ms).
add_task(async function testLNATemporaryPermissionCustomExpiry() {
  const LNA_EXPIRE_TIME_MS = 100;
  const LNA_TIMEOUT_MS = 500;

  // Set global expiry to a long time so we can verify LNA uses its own timeout
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.temporary_permission_expire_time_ms", 60000],
      ["network.lna.temporary_permission_expire_time_ms", LNA_EXPIRE_TIME_MS],
    ],
  });

  let principal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      "https://example.com"
    );

  await BrowserTestUtils.withNewTab(principal.spec, async function (browser) {
    // Set loopback-network permission with LNA-specific expiry
    SitePermissions.setForPrincipal(
      principal,
      "loopback-network",
      SitePermissions.ALLOW,
      SitePermissions.SCOPE_TEMPORARY,
      browser,
      LNA_EXPIRE_TIME_MS
    );

    Assert.deepEqual(
      SitePermissions.getForPrincipal(principal, "loopback-network", browser),
      {
        state: SitePermissions.ALLOW,
        scope: SitePermissions.SCOPE_TEMPORARY,
      },
      "loopback-network permission should be set"
    );

    await new Promise(c => setTimeout(c, LNA_TIMEOUT_MS));

    Assert.deepEqual(
      SitePermissions.getForPrincipal(principal, "loopback-network", browser),
      {
        state: SitePermissions.UNKNOWN,
        scope: SitePermissions.SCOPE_PERSISTENT,
      },
      "loopback-network permission should have expired using LNA-specific timeout"
    );

    // Set local-network permission with LNA-specific expiry
    SitePermissions.setForPrincipal(
      principal,
      "local-network",
      SitePermissions.BLOCK,
      SitePermissions.SCOPE_TEMPORARY,
      browser,
      LNA_EXPIRE_TIME_MS
    );

    Assert.deepEqual(
      SitePermissions.getForPrincipal(principal, "local-network", browser),
      {
        state: SitePermissions.BLOCK,
        scope: SitePermissions.SCOPE_TEMPORARY,
      },
      "local-network deny permission should be set"
    );

    await new Promise(c => setTimeout(c, LNA_TIMEOUT_MS));

    Assert.deepEqual(
      SitePermissions.getForPrincipal(principal, "local-network", browser),
      {
        state: SitePermissions.UNKNOWN,
        scope: SitePermissions.SCOPE_PERSISTENT,
      },
      "local-network deny permission should have expired using LNA-specific timeout"
    );
  });

  await SpecialPowers.popPrefEnv();
});
