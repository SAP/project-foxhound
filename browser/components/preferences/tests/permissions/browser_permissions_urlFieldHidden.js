"use strict";

const PERMISSIONS_URL =
  "chrome://browser/content/preferences/dialogs/permissions.xhtml";

add_task(async function urlFieldVisibleForPopupPermissions() {
  await openPermissionsPane({ leaveOpen: true });
  let win = gBrowser.selectedBrowser.contentWindow;
  let doc = win.document;
  let popupAndRedirectPolicyCheckbox = doc.getElementById(
    "popupAndRedirectPolicy"
  );
  ok(
    !popupAndRedirectPolicyCheckbox.checked,
    "popupAndRedirectPolicyCheckbox should be unchecked by default"
  );
  let popupAndRedirectPolicyButton = doc.getElementById(
    "popupAndRedirectPolicyButton"
  );
  ok(popupAndRedirectPolicyButton, "popupAndRedirectPolicyButton found");
  let popupAndRedirectPolicyButtonAvailable = waitForSettingControlChange(
    popupAndRedirectPolicyButton
  );
  popupAndRedirectPolicyCheckbox.click();
  await popupAndRedirectPolicyButtonAvailable;
  let dialogPromise = promiseLoadSubDialog(PERMISSIONS_URL);
  popupAndRedirectPolicyButton.click();
  let dialog = await dialogPromise;
  ok(dialog, "dialog loaded");

  let urlLabel = dialog.document.getElementById("urlLabel");
  ok(
    !urlLabel.hidden,
    "urlLabel should be visible when one of block/session/allow visible"
  );
  let url = dialog.document.getElementById("url");
  ok(
    !url.hidden,
    "url should be visible when one of block/session/allow visible"
  );

  // Disable pop-up blocking again without disabling third-party redirect
  // blocking (special configuration only used while testing)
  SpecialPowers.setBoolPref("dom.disable_open_during_load", false);
  gBrowser.removeCurrentTab();
});
