"use strict";

const kSandboxNotificationSelector =
  'notification-message[message-bar-type="infobar"]' +
  '[value="sandbox-content-disabled"]';

function closeSandboxNotification() {
  const notification = document.querySelector(kSandboxNotificationSelector);
  if (notification) {
    notification.remove();
  }
  Assert.equal(
    null,
    document.querySelector(kSandboxNotificationSelector),
    "No more notification"
  );
}

function contentSandboxCanBeDisabledByPref() {
  try {
    Services.prefs.setIntPref("security.sandbox.content.level", 0);
    const sandboxSettings = Cc[
      "@mozilla.org/sandbox/sandbox-settings;1"
    ].getService(Ci.mozISandboxSettings);
    return sandboxSettings.effectiveContentSandboxLevel === 0;
  } finally {
    Services.prefs.clearUserPref("security.sandbox.content.level");
  }
}

async function getSandboxNotification(shouldBeNull = false) {
  await TestUtils.waitForCondition(() => {
    const el = document.querySelector(kSandboxNotificationSelector);
    return shouldBeNull ? el === null : el !== null;
  }, "Waiting for sandbox disabled notification");
  return document.querySelector(kSandboxNotificationSelector);
}

if (AppConstants.MOZ_SANDBOX) {
  let { SandboxUtils } = ChromeUtils.importESModule(
    "resource://gre/modules/SandboxUtils.sys.mjs"
  );
  add_setup(async function setup() {
    Services.env.set("MOZ_DISABLE_CONTENT_SANDBOX", "");
    await SpecialPowers.pushPrefEnv({
      clear: [["security.sandbox.content.level"]],
    });
    SandboxUtils._sandboxDisabledThisSession = false;
    closeSandboxNotification();
    registerCleanupFunction(() => {
      SandboxUtils._sandboxDisabledThisSession = false;
      Services.env.set("MOZ_DISABLE_CONTENT_SANDBOX", "");
    });
  });

  // Warning should appear when sandbox level is set to 0 through prefs

  add_task(async function test_notification_whenLevelIsZero() {
    if (!contentSandboxCanBeDisabledByPref()) {
      info("Sandbox level 0 not allowed on this platform");
      return;
    }

    await SpecialPowers.pushPrefEnv({
      set: [["security.sandbox.content.level", 0]],
    });
    SandboxUtils._sandboxDisabledThisSession = false;
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const notification = await getSandboxNotification();
    Assert.ok(notification, "Warning shown when sandbox level is 0");
    Assert.equal(
      notification.priority,
      window.gNotificationBox.PRIORITY_WARNING_HIGH,
      "Has high priority"
    );
    closeSandboxNotification();
  });

  // Warning should appear when sandbox is disabled through environment variable
  add_task(async function test_notification_whenEnvDisablesSandbox() {
    Services.env.set("MOZ_DISABLE_CONTENT_SANDBOX", "1");
    SandboxUtils._sandboxDisabledThisSession = false;
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const notification = await getSandboxNotification();
    Assert.ok(notification, "Warning shown when MOZ_DISABLE_CONTENT_SANDBOX=1");
    Services.env.set("MOZ_DISABLE_CONTENT_SANDBOX", "0");
    closeSandboxNotification();
  });

  // Only one notification should be shown per window
  add_task(async function test_onlyOneNotificationPerWindow() {
    Services.env.set("MOZ_DISABLE_CONTENT_SANDBOX", "1");
    SandboxUtils._sandboxDisabledThisSession = false;
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const first = await getSandboxNotification();
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const second = await getSandboxNotification();
    Assert.strictEqual(first, second, "Only one notification shown per window");
    closeSandboxNotification();
  });

  // Repeated calls when notification is already visible should not add duplicates
  add_task(async function test_noDuplicateNotificationIfAlreadyVisible() {
    Services.env.set("MOZ_DISABLE_CONTENT_SANDBOX", "1");
    SandboxUtils._sandboxDisabledThisSession = false;
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const notification = await getSandboxNotification();
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const after = await getSandboxNotification();
    Assert.strictEqual(notification, after, "No duplicate notifications shown");
    closeSandboxNotification();
  });

  // All windows (previous and new) should show the warning
  add_task(async function test_multipleWindowsShowNotification() {
    if (!contentSandboxCanBeDisabledByPref()) {
      info("Sandbox level 0 not allowed on this platform");
      return;
    }

    const win2 = await BrowserTestUtils.openNewBrowserWindow();
    await SpecialPowers.pushPrefEnv({
      set: [["security.sandbox.content.level", 0]],
    });
    SandboxUtils._sandboxDisabledThisSession = false;
    const win3 = await BrowserTestUtils.openNewBrowserWindow();
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(win2);
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(win3);
    const notification1 = await getSandboxNotification();
    const notification2 = win2.document.querySelector(
      kSandboxNotificationSelector
    );
    const notification3 = win3.document.querySelector(
      kSandboxNotificationSelector
    );
    Assert.ok(notification1, "Main window shows notification");
    Assert.ok(notification2, "Second (pre-existing) window shows notification");
    Assert.ok(notification3, "Third (new) window shows notification");
    await BrowserTestUtils.closeWindow(win2);
    await BrowserTestUtils.closeWindow(win3);
    closeSandboxNotification();
  });

  // Changing sandbox level to 0 during runtime triggers the warning
  add_task(async function test_prefChangeTriggersWarning() {
    if (!contentSandboxCanBeDisabledByPref()) {
      info("Sandbox level 0 not allowed on this platform");
      return;
    }

    await SpecialPowers.pushPrefEnv({
      set: [["security.sandbox.content.level", 2]],
    });
    SandboxUtils._sandboxDisabledThisSession = false;
    SandboxUtils.observeContentSandboxPref();
    Services.prefs.setIntPref("security.sandbox.content.level", 0);
    const notification = await getSandboxNotification();
    Assert.ok(notification, "Changing level to 0 triggers warning");
    closeSandboxNotification();
  });

  // Changing level from non-zero to non-zero should not trigger a warning
  add_task(async function test_noWarningOnSafeLevelChange() {
    await SpecialPowers.pushPrefEnv({
      set: [["security.sandbox.content.level", 3]],
    });
    SandboxUtils._sandboxDisabledThisSession = false;
    Services.prefs.setIntPref("security.sandbox.content.level", 2);
    const notification = await getSandboxNotification(true);
    Assert.equal(notification, null, "No warning when changing from 3 to 2");
  });

  // Checks that FTL string is displayed properly
  add_task(async function test_ftlResourceIsLoadedBeforeNotification() {
    await SpecialPowers.pushPrefEnv({
      set: [["security.sandbox.content.level", 0]],
    });
    SandboxUtils._sandboxDisabledThisSession = false;
    SandboxUtils.maybeWarnAboutDisabledContentSandbox(window);
    const notification = await getSandboxNotification();
    const label =
      notification.getAttribute("label") || notification.textContent;
    Assert.ok(
      !label.includes("sandbox-content-disabled-warning"),
      "FTL string was displayed properly"
    );
    closeSandboxNotification();
  });
} else {
  add_task(async function doNotShowNotificationCorrectly() {
    Assert.equal(
      null,
      document.querySelector(kSandboxNotificationSelector),
      "No existing notification"
    );
    await Assert.rejects(
      fetch("resource://gre/modules/SandboxUtils.sys.mjs"),
      /NetworkError when attempting to fetch/,
      "SandboxUtils should not be packaged."
    );
  });
}
