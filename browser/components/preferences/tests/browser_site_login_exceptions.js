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

  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });

  let dialogOpened = promiseLoadSubDialog(PERMISSIONS_URL);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let doc = content.document;
    let savePasswordCheckBox = doc.getElementById("savePasswords");
    Assert.ok(
      !savePasswordCheckBox.checked,
      "Save Password CheckBox should be unchecked by default"
    );
    savePasswordCheckBox.click();

    let loginExceptionsButton = doc.getElementById("passwordExceptions");
    loginExceptionsButton.click();
  });

  exceptionsDialog = await dialogOpened;

  await addALoginException();
  await deleteALoginException();

  exceptionsDialog.close();

  // Undo the save password change.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let doc = content.document;
    let savePasswordCheckBox = doc.getElementById("savePasswords");
    if (savePasswordCheckBox.checked) {
      savePasswordCheckBox.click();
    }
  });

  gBrowser.removeCurrentTab();
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

  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });

  let dialogOpened = promiseLoadSubDialog(PERMISSIONS_URL);

  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    let doc = content.document;
    let savePasswordCheckBox = doc.getElementById("savePasswords");
    Assert.ok(
      !savePasswordCheckBox.checked,
      "Save Password CheckBox should be unchecked by default"
    );
    savePasswordCheckBox.click();

    let loginExceptionsButton = doc.getElementById("managePasswordExceptions");
    await ContentTaskUtils.waitForCondition(
      () => !loginExceptionsButton.disabled
    );
    loginExceptionsButton.click();
  });

  exceptionsDialog = await dialogOpened;

  await addALoginException();
  await deleteALoginException();

  exceptionsDialog.close();

  // Undo the save password change.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], function () {
    let doc = content.document;
    let savePasswordCheckBox = doc.getElementById("savePasswords");
    if (savePasswordCheckBox.checked) {
      savePasswordCheckBox.click();
    }
  });

  gBrowser.removeCurrentTab();
});

async function addALoginException() {
  let doc = exceptionsDialog.document;

  let richlistbox = doc.getElementById("permissionsBox");
  Assert.equal(richlistbox.itemCount, 0, "Row count should initially be 0");

  let inputBox = doc.getElementById("url");
  inputBox.focus();

  EventUtils.sendString("www.example.com", exceptionsDialog);

  let btnBlock = doc.getElementById("btnBlock");
  btnBlock.click();

  await TestUtils.waitForCondition(() => richlistbox.itemCount == 2);

  let expectedResult = ["http://www.example.com", "https://www.example.com"];
  for (let website of expectedResult) {
    let elements = richlistbox.getElementsByAttribute("origin", website);
    is(elements.length, 1, "It should find only one coincidence");
  }
}

async function deleteALoginException() {
  let doc = exceptionsDialog.document;

  let richlistbox = doc.getElementById("permissionsBox");
  let currentItems = 2;
  Assert.equal(
    richlistbox.itemCount,
    currentItems,
    `Row count should initially be ${currentItems}`
  );
  richlistbox.focus();

  while (richlistbox.itemCount) {
    richlistbox.selectedIndex = 0;

    if (AppConstants.platform == "macosx") {
      EventUtils.synthesizeKey("KEY_Backspace");
    } else {
      EventUtils.synthesizeKey("KEY_Delete");
    }

    currentItems -= 1;

    await TestUtils.waitForCondition(
      () => richlistbox.itemCount == currentItems
    );
    is_element_visible(
      content.gSubDialog._dialogs[0]._box,
      "Subdialog is visible after deleting an element"
    );
  }
}
