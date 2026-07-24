"use strict";

const { LoginTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/LoginTestUtils.sys.mjs"
);
const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["toolkit.osKeyStore.unofficialBuildOnlyLogin", ""]],
  });
});

var passwordsDialog;

add_task(async function test_openPasswordManagement() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", false]],
  });
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });

  let tabOpenPromise = BrowserTestUtils.waitForNewTab(gBrowser, "about:logins");

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let doc = content.document;

    let savePasswordCheckBox = doc.getElementById("savePasswords");
    Assert.ok(
      !savePasswordCheckBox.checked,
      "Save Password CheckBox should be unchecked by default"
    );

    let showPasswordsButton = doc.getElementById("showPasswords");
    showPasswordsButton.click();
  });

  let tab = await tabOpenPromise;
  ok(tab, "Tab opened");

  // check telemetry events while we are in here
  await LoginTestUtils.telemetry.waitForEventCount(1);
  TelemetryTestUtils.assertEvents(
    [["pwmgr", "open_management", "preferences"]],
    { category: "pwmgr", method: "open_management" },
    { clear: true, process: "content" }
  );

  BrowserTestUtils.removeTab(tab);
  gBrowser.removeCurrentTab();
});

add_task(async function test_openPasswordManagementNew() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });

  let tabOpenPromise = BrowserTestUtils.waitForNewTab(gBrowser, "about:logins");

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let doc = content.document;

    let savePasswordCheckBox = doc.getElementById("savePasswords");
    Assert.ok(
      !savePasswordCheckBox.checked,
      "Save Password CheckBox should be unchecked by default"
    );

    let showPasswordsButton = doc
      .getElementById("manageSavedPasswords")
      /**
       * Must test clicking on shadowRoot anchor or a11y checks will fail.
       */
      .shadowRoot.querySelector("a");
    showPasswordsButton.click();
  });

  let tab = await tabOpenPromise;
  ok(tab, "Tab opened");

  // check telemetry events while we are in here
  await LoginTestUtils.telemetry.waitForEventCount(1);
  TelemetryTestUtils.assertEvents(
    [["pwmgr", "open_management", "preferences"]],
    { category: "pwmgr", method: "open_management" },
    { clear: true, process: "content" }
  );

  BrowserTestUtils.removeTab(tab);
  gBrowser.removeCurrentTab();
});
