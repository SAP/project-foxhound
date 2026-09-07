/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const MASTER_PASSWORD = "omgsecret!";
const mpToken = Cc["@mozilla.org/security/internalkeytoken;1"].createInstance(
  Ci.nsIPKCS11Token
);

async function checkDeviceManager({ buttonIsDisabled }) {
  let deviceManagerWindow = window.openDialog(
    "chrome://pippki/content/device_manager.xhtml",
    "",
    ""
  );
  await TestUtils.topicObserved("device-manager-loaded");

  let tree = deviceManagerWindow.document.getElementById("device_tree");
  ok(tree, "The device tree exists");

  // Find and select the item related to the internal key token
  for (let i = 0; i < tree.view.rowCount; i++) {
    tree.view.selection.select(i);

    try {
      let selected_token = deviceManagerWindow.selected_slot.getToken();
      if (selected_token.isInternalKeyToken) {
        break;
      }
    } catch (e) {}
  }

  // Check to see if the button was updated correctly
  let changePwButton =
    deviceManagerWindow.document.getElementById("change_pw_button");
  is(
    changePwButton.hasAttribute("disabled"),
    buttonIsDisabled,
    "Change Password button is in the correct state: " + buttonIsDisabled
  );

  await BrowserTestUtils.closeWindow(deviceManagerWindow);
}

async function checkAboutPreferences({
  checkboxIsDisabled,
  hasPassword = false,
}) {
  let srdEnabled = Services.prefs.getBoolPref(
    "browser.settings-redesign.enabled",
    false
  );
  await BrowserTestUtils.withNewTab(
    srdEnabled
      ? "about:preferences#passwordsAutofill"
      : "about:preferences#privacy",
    async browser => {
      let target;
      if (srdEnabled) {
        target = hasPassword ? "changePrimaryPassword" : "addPrimaryPassword";
      } else {
        target = "useMasterPassword";
      }
      is(
        browser.contentDocument.getElementById(target).disabled,
        checkboxIsDisabled,
        `SRD ${srdEnabled} - Master Password checkbox is in the correct state: ` +
          checkboxIsDisabled
      );
    }
  );
}

add_task(async function test_policy_disable_masterpassword() {
  ok(!mpToken.hasPassword, "Starting the test with no password");

  // No password and no policy: access to setting a primary password
  // should be enabled.
  await checkDeviceManager({ buttonIsDisabled: false });
  await checkAboutPreferences({ checkboxIsDisabled: false });

  await setupPolicyEngineWithJson({
    policies: {
      DisableMasterPasswordCreation: true,
    },
  });

  // With the `DisableMasterPasswordCreation: true` policy active, the
  // UI entry points for creating a Primary Password should be disabled.
  await checkDeviceManager({ buttonIsDisabled: true });
  await checkAboutPreferences({ checkboxIsDisabled: true });

  mpToken.changePassword("", MASTER_PASSWORD);
  ok(mpToken.hasPassword, "Master password was set");

  // If a Primary Password is already set, there's no point in disabling
  // the
  await checkDeviceManager({ buttonIsDisabled: false });
  await checkAboutPreferences({ checkboxIsDisabled: false, hasPassword: true });

  // Clean up
  mpToken.changePassword(MASTER_PASSWORD, "");
  ok(!mpToken.hasPassword, "Master password was cleaned up");
});
