/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPPExceptionsManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs"
);

const EXCLUSION_CHANGED_EVENT = "IPPExceptionsManager:ExclusionChanged";
const ONBOARDING_MESSAGE_MASK_PREF =
  "browser.ipProtection.onboardingMessageMask";
const PERM_NAME = "ipp-vpn";

/**
 * Tests the manager can modify exclusions in ipp-vpn permission.
 */
add_task(async function test_IPPExceptionsManager_exclusions() {
  Services.perms.removeByType(PERM_NAME);

  const site1 = "https://www.example.com";
  const site2 = "https://www.another.example.com";

  IPPExceptionsManager.init();

  // Make mock principals and add two exclusions
  let contentPrincipal1 =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site1);
  let contentPrincipal2 =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site2);

  // Add two exclusions
  IPPExceptionsManager.addExclusion(contentPrincipal1);
  IPPExceptionsManager.addExclusion(contentPrincipal2);

  // Verify that hasExclusion can detect the newly added sites
  let site1Exists = IPPExceptionsManager.hasExclusion(contentPrincipal1);
  let site2Exists = IPPExceptionsManager.hasExclusion(contentPrincipal2);

  Assert.ok(site1Exists, `hasExclusion correctly states that ${site1} exists`);
  Assert.ok(site2Exists, `hasExclusion correctly states that ${site2} exists`);

  // Verify the permission data
  let permissionObj1 =
    IPPExceptionsManager.getExceptionPermissionObject(contentPrincipal1);
  let permissionObj2 =
    IPPExceptionsManager.getExceptionPermissionObject(contentPrincipal2);

  Assert.equal(
    permissionObj1?.capability,
    Ci.nsIPermissionManager.DENY_ACTION,
    `getExceptionPermissionObject correctly states that ${site1} exists and has capability DENY`
  );
  Assert.equal(
    permissionObj2?.capability,
    Ci.nsIPermissionManager.DENY_ACTION,
    `getExceptionPermissionObject correctly states that ${site2} exists and has capability DENY`
  );

  // Now remove the exceptions
  IPPExceptionsManager.removeExclusion(contentPrincipal1);
  IPPExceptionsManager.removeExclusion(contentPrincipal2);

  // Verify that hasExclusion no longer detects the recently removed sites
  site1Exists = IPPExceptionsManager.hasExclusion(contentPrincipal1);
  site2Exists = IPPExceptionsManager.hasExclusion(contentPrincipal2);

  Assert.ok(
    !site1Exists,
    `hasExclusion correctly states that ${site1} no longer exists`
  );
  Assert.ok(
    !site2Exists,
    `hasExclusion correctly states that ${site2} no longer exists`
  );

  // Verify the permission data no longer exists
  permissionObj1 =
    IPPExceptionsManager.getExceptionPermissionObject(contentPrincipal1);
  permissionObj2 =
    IPPExceptionsManager.getExceptionPermissionObject(contentPrincipal2);

  Assert.ok(!permissionObj1, `Permission object for ${site1} no longer exists`);
  Assert.ok(!permissionObj2, `Permission object for ${site2} no longer exists`);

  Services.prefs.clearUserPref(ONBOARDING_MESSAGE_MASK_PREF);
  IPPExceptionsManager.uninit();

  Services.perms.removeByType(PERM_NAME);
});

add_task(async function test_IPPExceptionsManager_setExclusion() {
  Services.perms.removeByType(PERM_NAME);

  IPPExceptionsManager.init();

  const site = "https://www.example.com";
  const contentPrincipal =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site);

  // Add exclusion with shouldExclude=true
  let setTrueExChangePromise = waitForEvent(
    IPPExceptionsManager,
    EXCLUSION_CHANGED_EVENT
  );

  IPPExceptionsManager.setExclusion(contentPrincipal, true);

  await setTrueExChangePromise;

  Assert.ok(
    true,
    `${EXCLUSION_CHANGED_EVENT} event was dispatched after calling setExclusion with shouldExclude=true`
  );
  Assert.ok(
    IPPExceptionsManager.hasExclusion(contentPrincipal),
    "Site should exist in ipp-vpn with shouldExclude=true"
  );

  // Remove exclusion with shouldExclude=false
  let setFalseExChangePromise = waitForEvent(
    IPPExceptionsManager,
    EXCLUSION_CHANGED_EVENT
  );

  IPPExceptionsManager.setExclusion(contentPrincipal, false);

  await setFalseExChangePromise;

  Assert.ok(
    true,
    `${EXCLUSION_CHANGED_EVENT} event was dispatched after calling setExclusion with shouldExclude=false`
  );
  Assert.ok(
    !IPPExceptionsManager.hasExclusion(contentPrincipal),
    "Site should not exist in ipp-vpn with shouldExclude=false"
  );

  // Test that example.com and www.example.com are treated as separate exclusions
  const siteWithoutWWW = "https://example.com";
  const contentPrincipalWithoutWWW =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(
      siteWithoutWWW
    );

  // Add exclusion for example.com with shouldExclude=true
  setTrueExChangePromise = waitForEvent(
    IPPExceptionsManager,
    EXCLUSION_CHANGED_EVENT
  );

  IPPExceptionsManager.setExclusion(contentPrincipalWithoutWWW, true);

  await setTrueExChangePromise;

  Assert.ok(
    true,
    `${EXCLUSION_CHANGED_EVENT} event was dispatched after calling setExclusion with shouldExclude=true on example.com`
  );
  Assert.ok(
    IPPExceptionsManager.hasExclusion(contentPrincipalWithoutWWW),
    "example.com should exist in ipp-vpn with shouldExclude=true"
  );
  Assert.ok(
    !IPPExceptionsManager.hasExclusion(contentPrincipal),
    "www.example.com should not be excluded when only example.com is added"
  );

  Services.prefs.clearUserPref(ONBOARDING_MESSAGE_MASK_PREF);
  IPPExceptionsManager.uninit();
  Services.perms.removeByType(PERM_NAME);
});
