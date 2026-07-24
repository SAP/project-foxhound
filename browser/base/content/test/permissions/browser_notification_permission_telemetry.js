/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ORIGIN = "https://example.com";
const TEST_PAGE =
  ORIGIN + "/browser/browser/base/content/test/permissions/empty.html";

add_setup(async function () {
  // Set up site categories for testing
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "permissions.desktop-notification.telemetry.siteCategories",
        JSON.stringify({
          "example.com": "social",
          "example.org": "news_publishers",
        }),
      ],
    ],
  });

  registerCleanupFunction(() => {
    Services.fog.testResetFOG();
  });
});

/**
 * Tests that notification permission telemetry is recorded correctly
 * for the prompt_shown metric when triggered by script (with user gesture).
 */
add_task(async function test_prompt_shown_script() {
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function (browser) {
    let popupshown = BrowserTestUtils.waitForEvent(
      PopupNotifications.panel,
      "popupshown"
    );

    // Request permission with a user gesture (automatic prompt)
    await SpecialPowers.spawn(browser, [], async function () {
      // Simulate user gesture
      await content.document.notifyUserGestureActivation();
      content.Notification.requestPermission();
    });

    await popupshown;

    // Check that prompt_shown telemetry was recorded with trigger="script"
    let events = Glean.webNotificationPermission.promptShown.testGetValue();
    ok(events, "Should have prompt_shown events");
    is(events?.length, 1, "Should have recorded one prompt_shown event");
    is(
      events[0].extra.trigger,
      "script",
      "Trigger should be 'script' for requests with user gesture"
    );
    is(
      events[0].extra.site_category,
      "social",
      "Site category should be 'social' for example.com"
    );

    // Close the prompt
    let notification = PopupNotifications.panel.firstElementChild;
    notification.secondaryButton.click();
  });

  // Cleanup - remove any permissions set by clicking the button
  let uri = Services.io.newURI(TEST_PAGE);
  PermissionTestUtils.remove(uri, "desktop-notification");
});

/**
 * Tests that notification permission telemetry is recorded correctly
 * for the prompt_blocked metric when auto-denied.
 */
add_task(async function test_prompt_blocked() {
  Services.fog.testResetFOG();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.webnotifications.requireuserinteraction", true],
      ["permissions.desktop-notification.postPrompt.enabled", false],
    ],
  });

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function (browser) {
    // Request permission without user gesture and without post-prompt enabled
    // This should auto-deny and record prompt_blocked
    await SpecialPowers.spawn(browser, [], async function () {
      let result = await content.Notification.requestPermission();
      // When auto-denied without postPrompt, the result is "default"
      is(
        result,
        "default",
        "Permission should be auto-denied to default state"
      );
    });

    // Check that prompt_blocked telemetry was recorded
    let events = Glean.webNotificationPermission.promptBlocked.testGetValue();
    ok(events, "Should have recorded prompt_blocked events");
    is(events?.length, 1, "Should have recorded one prompt_blocked event");
    is(
      events[0].extra.reason,
      "no_user_gesture",
      "Reason should be 'no_user_gesture'"
    );
    is(
      events[0].extra.site_category,
      "social",
      "Site category should be 'social' for example.com"
    );
  });

  await SpecialPowers.popPrefEnv();

  // Cleanup any stored permissions
  let uri = Services.io.newURI(TEST_PAGE);
  PermissionTestUtils.remove(uri, "desktop-notification");
});

/**
 * Tests that notification permission telemetry is recorded correctly
 * for the prompt_interaction metric when user allows permission.
 */
add_task(async function test_prompt_interaction_allow() {
  Services.fog.testResetFOG();

  let uri = Services.io.newURI(TEST_PAGE);

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function (browser) {
    let popupshown = BrowserTestUtils.waitForEvent(
      PopupNotifications.panel,
      "popupshown"
    );

    // Request permission with user gesture
    await SpecialPowers.spawn(browser, [], async function () {
      await content.document.notifyUserGestureActivation();
      content.Notification.requestPermission();
    });

    await popupshown;

    // Click Allow button
    let notification = PopupNotifications.panel.firstElementChild;
    EventUtils.synthesizeMouseAtCenter(notification.button, {});

    // Check that prompt_interaction telemetry was recorded
    let events =
      Glean.webNotificationPermission.promptInteraction.testGetValue();
    ok(events, "Should have prompt_interaction events");
    is(events?.length, 1, "Should have recorded one prompt_interaction event");
    is(events[0].extra.action, "allow", "Action should be 'allow'");
    is(
      events[0].extra.is_persistent,
      "true",
      "Should be persistent by default"
    );
    is(
      events[0].extra.site_category,
      "social",
      "Site category should be 'social' for example.com"
    );

    // Verify permission was actually granted
    is(
      PermissionTestUtils.testPermission(uri, "desktop-notification"),
      Ci.nsIPermissionManager.ALLOW_ACTION,
      "Permission should be granted"
    );

    // Cleanup
    PermissionTestUtils.remove(uri, "desktop-notification");
  });
});

/**
 * Tests that notification permission telemetry is recorded correctly
 * for the prompt_interaction metric when user blocks permission.
 */
add_task(async function test_prompt_interaction_block() {
  Services.fog.testResetFOG();

  let uri = Services.io.newURI(TEST_PAGE);

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function (browser) {
    let popupshown = BrowserTestUtils.waitForEvent(
      PopupNotifications.panel,
      "popupshown"
    );

    // Request permission with user gesture
    await SpecialPowers.spawn(browser, [], async function () {
      await content.document.notifyUserGestureActivation();
      content.Notification.requestPermission();
    });

    await popupshown;

    // Click Block button
    let notification = PopupNotifications.panel.firstElementChild;
    EventUtils.synthesizeMouseAtCenter(notification.secondaryButton, {});

    // Check that prompt_interaction telemetry was recorded
    let events =
      Glean.webNotificationPermission.promptInteraction.testGetValue();
    ok(events, "Should have prompt_interaction events");
    is(events?.length, 1, "Should have recorded one prompt_interaction event");
    is(events[0].extra.action, "block", "Action should be 'block'");
    is(
      events[0].extra.is_persistent,
      "true",
      "Should be persistent by default"
    );
    is(
      events[0].extra.site_category,
      "social",
      "Site category should be 'social' for example.com"
    );

    // Verify permission was actually denied
    is(
      PermissionTestUtils.testPermission(uri, "desktop-notification"),
      Ci.nsIPermissionManager.DENY_ACTION,
      "Permission should be denied"
    );

    // Cleanup
    PermissionTestUtils.remove(uri, "desktop-notification");
  });
});

/**
 * Tests that site categorization works correctly for known domains.
 * We verify that example.com is correctly categorized as "social" based on
 * the pref we set in add_setup().
 */
add_task(async function test_site_categorization() {
  Services.fog.testResetFOG();

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function (browser) {
    let popupshown = BrowserTestUtils.waitForEvent(
      PopupNotifications.panel,
      "popupshown"
    );

    await SpecialPowers.spawn(browser, [], async function () {
      await content.document.notifyUserGestureActivation();
      content.Notification.requestPermission();
    });

    await popupshown;

    // Verify that example.com is categorized as "social" per our pref
    let events = Glean.webNotificationPermission.promptShown.testGetValue();
    ok(events, "Should have prompt_shown events");
    is(events?.length, 1, "Should have recorded one prompt_shown event");
    is(
      events[0].extra.site_category,
      "social",
      "Site category should be 'social' for example.com"
    );

    // Close the prompt
    let notification = PopupNotifications.panel.firstElementChild;
    notification.secondaryButton.click();
  });

  // Cleanup - remove any permissions set by clicking the button
  let uri = Services.io.newURI(TEST_PAGE);
  PermissionTestUtils.remove(uri, "desktop-notification");
});

/**
 * Tests that telemetry is recorded when user revokes notification permission
 * via the toolbar permission panel.
 */
add_task(async function test_permission_revoked_toolbar() {
  Services.fog.testResetFOG();

  let uri = Services.io.newURI(TEST_PAGE);

  // First, grant notification permission
  PermissionTestUtils.add(
    uri,
    "desktop-notification",
    Services.perms.ALLOW_ACTION
  );

  await BrowserTestUtils.withNewTab(TEST_PAGE, async function () {
    // Open the permission panel using the helper function
    await openPermissionPopup();

    // Find and click the remove button for the notification permission
    let permissionList = document.getElementById(
      "permission-popup-permission-list"
    );
    let notificationItem = permissionList.querySelector(
      ".permission-popup-permission-item-desktop-notification"
    );
    ok(notificationItem, "Should find notification permission item in panel");

    let removeButton = notificationItem.querySelector(
      ".permission-popup-permission-remove-button"
    );
    ok(removeButton, "Should find remove button");

    removeButton.click();

    // Check that permission_revoked_toolbar telemetry was recorded
    let events =
      Glean.webNotificationPermission.permissionRevokedToolbar.testGetValue();
    ok(events, "Should have permission_revoked_toolbar events");
    is(
      events?.length,
      1,
      "Should have recorded one permission_revoked_toolbar event"
    );
    is(
      events[0].extra.site_category,
      "social",
      "Site category should be 'social' for example.com"
    );

    // Close the popup using the helper function
    await closePermissionPopup();
  });

  // Cleanup
  PermissionTestUtils.remove(uri, "desktop-notification");
});
