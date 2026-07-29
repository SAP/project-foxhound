/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ORIGIN = "https://example.com/";
const PERMISSIONS_PAGE =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "permissions.html";
const PAGE_WITH_CROSS_ORIGIN_IFRAME =
  getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content",
    "https://example.com"
  ) + "temporary_permissions_subframe.html";

function getPrincipal(origin) {
  return Services.scriptSecurityManager.createContentPrincipalFromOrigin(
    origin
  );
}

async function queryPermissionInIframe(browser, frameId, permName) {
  return SpecialPowers.spawn(
    browser,
    [frameId, permName],
    async (fId, name) => {
      let iframe = content.document.getElementById(fId);
      return SpecialPowers.spawn(iframe, [name], async n => {
        let status = await content.navigator.permissions.query({ name: n });
        return status.state;
      });
    }
  );
}

// Test that temporary ALLOW permissions survive clearTemporaryBlockPermissions
// (which only clears DENY_ACTION).
add_task(async function testTemporaryAllowSurvivesBlockClear() {
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
  Assert.equal(state, "granted", "Should be granted before clear");

  // clearTemporaryBlockPermissions only removes DENY, not ALLOW.
  SitePermissions.clearTemporaryBlockPermissions(browser);

  // The ClearBrowserPermissions IPC will propagate the "cleared"
  // notification but since no ALLOW was removed, re-querying should still
  // return granted.  Wait for the IPC round-trip via a content spawn.
  state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "granted", "ALLOW should survive block-only clear");

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);
  BrowserTestUtils.removeTab(tab);
});

// Test that a user-initiated reload (BrowserCommands.reload) clears temporary
// DENY permissions and the reloaded page sees "prompt" via the Permissions API.
add_task(async function testReloadClearsTemporaryDeny() {
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
  Assert.equal(state, "denied", "Should be denied before reload");

  let loaded = BrowserTestUtils.browserLoaded(browser, false, ORIGIN);
  BrowserCommands.reload();
  await loaded;

  state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "prompt", "Should be prompt after user-initiated reload");

  BrowserTestUtils.removeTab(tab);
});

// Test that closing a tab cleans up its browser-scoped permissions, so a new
// tab to the same origin does not inherit them.
add_task(async function testTabCloseRemovesTemporaryPermission() {
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
  Assert.equal(state, "granted", "Should be granted before tab close");

  BrowserTestUtils.removeTab(tab);

  Assert.equal(
    Services.perms.testForBrowser(principal, "geo", browserId),
    Services.perms.UNKNOWN_ACTION,
    "Browser-scoped permission should be removed after tab close"
  );

  let tab2 = await BrowserTestUtils.openNewForegroundTab(gBrowser, ORIGIN);
  state = await queryPermissionInTab(tab2.linkedBrowser, "geolocation");
  Assert.equal(state, "prompt", "New tab should see prompt, not granted");

  BrowserTestUtils.removeTab(tab2);
});

// Test that a cross-origin iframe with allow="geolocation" sees the temporary
// permission granted on the top-level tab.
add_task(async function testTemporaryPermissionInDelegatedIframe() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PAGE_WITH_CROSS_ORIGIN_IFRAME
  );
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
  let iframeState = await queryPermissionInIframe(
    browser,
    "frame",
    "geolocation"
  );
  Assert.equal(
    iframeState,
    "granted",
    "Cross-origin iframe with allow='geolocation' should see granted"
  );

  Services.perms.removeFromPrincipalForBrowser(principal, "geo", browserId);
  BrowserTestUtils.removeTab(tab);
});

// Test that bulk-clearing browser-scoped permissions updates the delegated
// permission list in a cross-origin iframe.
add_task(async function testDelegatedIframeBulkClear() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PAGE_WITH_CROSS_ORIGIN_IFRAME
  );
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
  let iframeState = await queryPermissionInIframe(
    browser,
    "frame",
    "geolocation"
  );
  Assert.equal(
    iframeState,
    "granted",
    "Iframe should see granted before clear"
  );

  // Install an onchange listener in the top-level frame so we know when the
  // bulk clear IPC has been processed in the content process.
  await installOnChangeListener(browser, "geolocation");

  Services.perms.removeAllForBrowser(browserId);

  await waitForPermissionChange(browser);

  iframeState = await queryPermissionInIframe(browser, "frame", "geolocation");
  Assert.equal(
    iframeState,
    "prompt",
    "Iframe should see prompt after bulk clear"
  );

  BrowserTestUtils.removeTab(tab);
});

// End-to-end test: trigger the geolocation prompt, allow without checking
// "remember", verify the Permissions API reflects the temporary grant, then
// clear it via the permissions panel and verify the state returns to "prompt".
// Also validates that onchange fires for both transitions.
add_task(async function testEndToEndGeolocationPromptFlow() {
  // The geolocation request starts a repeating NetworkGeolocationProvider
  // timer. Set geo.timeout below 5000ms so the timer stops before the test
  // harness flags it as leaked.
  await SpecialPowers.pushPrefEnv({ set: [["geo.timeout", 4000]] });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    PERMISSIONS_PAGE
  );
  let browser = tab.linkedBrowser;

  // Step 1: initial state should be "prompt".
  let state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "prompt", "Initial geolocation state should be prompt");

  // Install onchange listener before triggering the prompt so we catch the
  // transition from "prompt" to "granted".
  await installOnChangeListener(browser, "geolocation");

  // Step 2: trigger geolocation request from content.
  let popupshown = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popupshown"
  );

  await SpecialPowers.spawn(browser, [], async () => {
    const { E10SUtils } = ChromeUtils.importESModule(
      "resource://gre/modules/E10SUtils.sys.mjs"
    );
    E10SUtils.wrapHandlingUserInput(content, true, () => {
      content.document.getElementById("geo").click();
    });
  });

  await popupshown;

  // Step 3: ensure the "remember" checkbox is visible and unchecked, then
  // click "Allow" to grant a temporary permission.
  let notification = PopupNotifications.panel.firstElementChild;
  let checkbox = notification.checkbox;
  Assert.ok(
    BrowserTestUtils.isVisible(checkbox),
    "Remember checkbox should be visible"
  );
  Assert.ok(!checkbox.checked, "Remember checkbox should be unchecked");

  let popuphidden = BrowserTestUtils.waitForEvent(
    PopupNotifications.panel,
    "popuphidden"
  );
  EventUtils.synthesizeMouseAtCenter(notification.button, {});
  await popuphidden;

  // Step 4: verify the temporary permission was created.
  let principal = browser.contentPrincipal;
  let browserId = browser.browserId;
  Assert.equal(
    Services.perms.testForBrowser(principal, "geo", browserId),
    Services.perms.ALLOW_ACTION,
    "Browser-scoped geo permission should be ALLOW"
  );

  // Step 5: verify the Permissions API shows "granted" (via onchange).
  let newState = await waitForPermissionChange(browser);
  Assert.equal(
    newState,
    "granted",
    "onchange should fire with granted after allowing"
  );
  state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(state, "granted", "Permissions API should show granted");

  // Install onchange listener for the clear transition.
  await installOnChangeListener(browser, "geolocation");

  // Step 6: clear the temporary permission via the permissions panel UI.
  await openPermissionPopup();

  let permissionsList = document.getElementById(
    "permission-popup-permission-list"
  );
  let removeButton = permissionsList.querySelector(
    ".permission-popup-permission-remove-button"
  );
  Assert.ok(removeButton, "Remove button should be present in panel");
  removeButton.click();

  await closePermissionPopup();

  // Step 7: verify state returns to "prompt" (via onchange).
  newState = await waitForPermissionChange(browser);
  Assert.equal(
    newState,
    "prompt",
    "onchange should fire with prompt after clearing via panel"
  );
  state = await queryPermissionInTab(browser, "geolocation");
  Assert.equal(
    state,
    "prompt",
    "Permissions API should show prompt after clearing via panel"
  );

  BrowserTestUtils.removeTab(tab);
});
