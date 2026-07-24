/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PERMISSIONS_URL =
  "chrome://browser/content/preferences/dialogs/permissions.xhtml";

var exceptionsDialog;

add_task(async function openLoginExceptionsSubDialog() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", false]],
  });
  // ensure rememberSignons is off for this test;
  ok(
    !Services.prefs.getBoolPref("signon.rememberSignons"),
    "Check initial value of signon.rememberSignons pref"
  );

  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      PasswordManagerExceptions: ["https://pwexception.example.com"],
    },
  });

  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });

  let dialogOpened = promiseLoadSubDialog(PERMISSIONS_URL);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let doc = content.document;
    let savePasswordCheckBox = doc.getElementById("savePasswords");
    savePasswordCheckBox.click();

    let loginExceptionsButton = doc.getElementById("passwordExceptions");
    loginExceptionsButton.click();
  });

  exceptionsDialog = await dialogOpened;

  let doc = exceptionsDialog.document;

  let richlistbox = doc.getElementById("permissionsBox");
  Assert.equal(richlistbox.itemCount, 1, `Row count should initially be 1`);

  richlistbox.focus();
  richlistbox.selectedIndex = 0;
  Assert.ok(doc.getElementById("removePermission").disabled);

  // Undo the save password change.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let savePasswordCheckBox = content.document.getElementById("savePasswords");
    if (savePasswordCheckBox.checked) {
      savePasswordCheckBox.click();
    }
  });

  gBrowser.removeCurrentTab();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson("");
});

add_task(async function openLoginExceptionsSubDialogNew() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
  // ensure rememberSignons is off for this test;
  ok(
    !Services.prefs.getBoolPref("signon.rememberSignons"),
    "Check initial value of signon.rememberSignons pref"
  );

  await EnterprisePolicyTesting.setupPolicyEngineWithJson({
    policies: {
      PasswordManagerExceptions: ["https://pwexception.example.com"],
    },
  });

  info("Opening privacy panel");
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });

  let dialogOpened = promiseLoadSubDialog(PERMISSIONS_URL);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    let doc = content.document;
    let savePasswordCheckBox = doc.getElementById("savePasswords");
    savePasswordCheckBox.click();

    let loginExceptionsButton = doc.getElementById("managePasswordExceptions");
    await ContentTaskUtils.waitForCondition(
      () => !loginExceptionsButton.disabled
    );
    loginExceptionsButton.click();
  });

  info("Waiting for dialog to open");
  exceptionsDialog = await dialogOpened;

  info("Assert remove permission is disabled");
  let doc = exceptionsDialog.document;

  let richlistbox = doc.getElementById("permissionsBox");
  Assert.equal(richlistbox.itemCount, 1, `Row count should initially be 1`);

  richlistbox.focus();
  richlistbox.selectedIndex = 0;
  Assert.ok(doc.getElementById("removePermission").disabled);

  // Undo the save password change.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let savePasswordCheckBox = content.document.getElementById("savePasswords");
    if (savePasswordCheckBox.checked) {
      savePasswordCheckBox.click();
    }
  });

  gBrowser.removeCurrentTab();
  await EnterprisePolicyTesting.setupPolicyEngineWithJson("");
});
