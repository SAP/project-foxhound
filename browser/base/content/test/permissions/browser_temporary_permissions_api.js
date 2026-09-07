/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ORIGIN = "https://example.com/";

function getPrincipal(origin) {
  return Services.scriptSecurityManager.createContentPrincipalFromOrigin(
    origin
  );
}

add_task(async function testTemporaryPermissionQueryGranted() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId,
    0
  );

  await waitForPermissionState(browser, "geolocation", "granted");
  let state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "granted", "Temporary ALLOW geo should show as granted");

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testTemporaryPermissionQueryDenied() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.DENY_ACTION,
    browserId,
    0
  );

  await waitForPermissionState(browser, "geolocation", "denied");
  let state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "denied", "Temporary DENY geo should show as denied");

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testTemporaryPermissionQueryCamera() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "camera",
    Services.perms.ALLOW_ACTION,
    browserId,
    0
  );

  await waitForPermissionState(browser, "camera", "granted");
  let state = await queryPermissionInTab(browser, "camera");
  Assert.equal(
    state,
    "granted",
    "Temporary ALLOW camera should show as granted"
  );

  Services.perms.removeFromPrincipalForBrowser(principal, "camera", browserId);
  BrowserTestUtils.removeTab(tab);
});

add_task(async function testTemporaryPermissionOnChange() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  await installOnChangeListener(browser, "geolocation");

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId,
    0
  );

  let newState = await waitForPermissionChange(browser);
  Assert.equal(newState, "granted", "onchange should fire with granted");

  await installOnChangeListener(browser, "geolocation");

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);

  newState = await waitForPermissionChange(browser);
  Assert.equal(
    newState,
    "prompt",
    "onchange should fire with prompt on removal"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function testTemporaryPermissionNotVisibleInOtherTab() {
  let tab1 = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let principal = getPrincipal(ORIGIN);
  let browserId1 = tab1.linkedBrowser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId1,
    0
  );

  await waitForPermissionState(tab1.linkedBrowser, "geolocation", "granted");
  let state1 = await queryPermissionInTab(tab1.linkedBrowser, "geolocation");
  Assert.equal(state1, "granted", "Tab1 should see granted");

  let state2 = await queryPermissionInTab(tab2.linkedBrowser, "geolocation");
  Assert.equal(state2, "prompt", "Tab2 should still see prompt");

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId1);
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});

add_task(async function testTemporaryPermissionExpiry() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.ALLOW_ACTION,
    browserId,
    // Use a generous expiry so IPC round-trips in chaos mode don't race past
    // it, but not so long that it risks test timeouts on slow debug builds.
    2000
  );

  await waitForPermissionState(browser, "geolocation", "granted");
  let state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "granted", "Should be granted before expiry");

  // Wait for the expiry notification in the parent process.
  await TestUtils.topicObserved("browser-perm-changed", (subject, data) => {
    if (data !== "deleted") {
      return false;
    }
    let perm = subject.QueryInterface(Ci.nsIPermission);
    return perm.type === "geo" && perm.browserId === browserId;
  });

  // Wait for the removal IPC to propagate to the child.
  await waitForPermissionState(browser, "geolocation", "prompt");
  state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "prompt", "Should be prompt after expiry");

  BrowserTestUtils.removeTab(tab);
});

// Test that temporary DENY permissions are cleared via
// clearTemporaryBlockPermissions (called on user-initiated reload) and that
// the Permissions API in the content process reflects the change.
add_task(async function testTemporaryDenyClearedOnReload() {
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  let browser = tab.linkedBrowser;
  let principal = getPrincipal(ORIGIN);
  let browserId = browser.browserId;

  Services.perms.addFromPrincipalForBrowser(
    principal,
    "geo",
    Services.perms.DENY_ACTION,
    browserId,
    0
  );

  await waitForPermissionState(browser, "geolocation", "denied");
  let state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "denied", "Should be denied before clearing");

  // Install an onchange listener so we know when the clear has propagated.
  await installOnChangeListener(browser, "geolocation");

  // This is what SitePermissions.clearTemporaryBlockPermissions does on
  // user-initiated reload: removes all DENY_ACTION browser-scoped perms.
  SitePermissions.clearTemporaryBlockPermissions(browser);

  let newState = await waitForPermissionChange(browser);
  Assert.equal(newState, "prompt", "Should be prompt after clearing blocks");

  BrowserTestUtils.removeTab(tab);
});
