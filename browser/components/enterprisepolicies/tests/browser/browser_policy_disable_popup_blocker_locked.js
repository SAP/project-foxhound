/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const POPUP_PAGE =
  "https://example.com/browser/browser/base/content/test/popups/popup_blocker2.html";

function clearPrefs() {
  Services.prefs.clearUserPref("dom.disable_open_during_load");
  Services.prefs.clearUserPref(
    "dom.security.framebusting_intervention.enabled"
  );
}

let ORIGINAL_PREF_VALUE = undefined;
add_setup(async function () {
  // The popup pref is given a special testing value; clear it so the policy
  // engine controls the value during these tests.
  if (Services.prefs.prefHasUserValue("dom.disable_open_during_load")) {
    ORIGINAL_PREF_VALUE = Services.prefs.getBoolPref(
      "dom.disable_open_during_load"
    );
    Services.prefs.clearUserPref("dom.disable_open_during_load");
  }
});
registerCleanupFunction(async function () {
  if (ORIGINAL_PREF_VALUE === undefined) {
    Services.prefs.clearUserPref("dom.disable_open_during_load");
  } else {
    Services.prefs.setBoolPref(
      "dom.disable_open_during_load",
      ORIGINAL_PREF_VALUE
    );
  }
  Services.prefs.clearUserPref(
    "dom.security.framebusting_intervention.enabled"
  );
});

async function test_popup_blocker_disabled({ disabled, locked }) {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    Services.prefs.getBoolPref("browser.settings-redesign.enabled", false)
      ? "about:preferences#permissionsData"
      : "about:preferences#privacy"
  );
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [{ disabled, locked }],
    // eslint-disable-next-line no-shadow
    async function ({ disabled, locked }) {
      let checkbox = content.document.getElementById("popupAndRedirectPolicy");
      is(
        checkbox.checked,
        !disabled,
        "Checkbox checked state should match policy's Block status"
      );
      is(
        checkbox.disabled,
        locked,
        "Checkbox disabled state should match policy's Locked status"
      );
    }
  );
  BrowserTestUtils.removeTab(tab);

  is(
    Services.prefs.prefIsLocked("dom.disable_open_during_load"),
    locked,
    "Pop-up flash pref lock state should match policy lock state"
  );
  is(
    Services.prefs.prefIsLocked(
      "dom.security.framebusting_intervention.enabled"
    ),
    locked,
    "Framebusting pref lock state should match policy lock state"
  );
}

add_task(async function test_block_locked() {
  await setupPolicyEngineWithJson({
    policies: {
      PopupBlocking: {
        Default: true,
        Locked: true,
      },
    },
  });

  await test_popup_blocker_disabled({ disabled: false, locked: true });

  clearPrefs();
});

add_task(async function test_locked() {
  await setupPolicyEngineWithJson({
    policies: {
      PopupBlocking: {
        Locked: true,
      },
    },
  });

  await test_popup_blocker_disabled({ disabled: false, locked: true });

  clearPrefs();
});

add_task(async function test_disabled_locked() {
  await setupPolicyEngineWithJson({
    policies: {
      PopupBlocking: {
        Default: false,
        Locked: true,
      },
    },
  });

  await test_popup_blocker_disabled({ disabled: true, locked: true });

  clearPrefs();
});

add_task(async function test_locked_blocks_notification_allow() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.disable_open_click_delay", 0]],
  });
  await setupPolicyEngineWithJson({
    policies: {
      PopupBlocking: {
        Default: true,
        Locked: true,
      },
    },
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, POPUP_PAGE);
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.document.getElementById("pop").click();
  });
  await TestUtils.waitForCondition(() =>
    gBrowser.getNotificationBox().getNotificationWithValue("popup-blocked")
  );

  let blockedPopupOptions = document.getElementById("blockedPopupOptions");
  let popupShown = BrowserTestUtils.waitForEvent(
    window,
    "popupshown",
    true,
    event => event.target == blockedPopupOptions
  );
  let notification = gBrowser
    .getNotificationBox()
    .getNotificationWithValue("popup-blocked");
  notification._buttons[0].click();
  await popupShown;

  let allowSite = document.getElementById("blockedPopupAllowSite");
  ok(
    allowSite.hidden,
    "blockedPopupAllowSite stays hidden when PopupBlocking is locked"
  );

  let popupHidden = BrowserTestUtils.waitForEvent(
    blockedPopupOptions,
    "popuphidden"
  );
  blockedPopupOptions.hidePopup();
  await popupHidden;

  BrowserTestUtils.removeTab(tab);
  clearPrefs();
});

add_task(async function test_locked_blocks_url_bar_menulist() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.disable_open_click_delay", 0]],
  });
  await setupPolicyEngineWithJson({
    policies: {
      PopupBlocking: {
        Default: true,
        Locked: true,
      },
    },
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, POPUP_PAGE);
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
    content.document.getElementById("pop").click();
  });
  await TestUtils.waitForCondition(() =>
    gBrowser.getNotificationBox().getNotificationWithValue("popup-blocked")
  );

  let permissionShown = BrowserTestUtils.waitForEvent(
    window,
    "popupshown",
    true,
    event => event.target == gPermissionPanel._permissionPopup
  );
  gPermissionPanel._identityPermissionBox.click();
  await permissionShown;

  let menulist = document.getElementById("permission-popup-menulist");
  ok(
    menulist && menulist.getAttribute("disabled") == "true",
    "Popup permission menulist is disabled when policy is locked"
  );

  let permissionHidden = BrowserTestUtils.waitForEvent(
    gPermissionPanel._permissionPopup,
    "popuphidden"
  );
  gPermissionPanel._permissionPopup.hidePopup();
  await permissionHidden;

  BrowserTestUtils.removeTab(tab);
  clearPrefs();
});
