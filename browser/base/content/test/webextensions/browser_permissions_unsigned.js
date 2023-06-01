"use strict";

const ID = "permissions@test.mozilla.org";
const WARNING_ICON = "chrome://global/skin/icons/warning.svg";

add_task(async function test_unsigned() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      ["extensions.install.requireBuiltInCerts", false],
      ["extensions.InstallTrigger.enabled", true],
      ["extensions.InstallTriggerImpl.enabled", true],
      // Relax the user input requirements while running this test.
      ["xpinstall.userActivation.required", false],
    ],
  });

  let testURI = makeURI("https://example.com/");
  PermissionTestUtils.add(testURI, "install", Services.perms.ALLOW_ACTION);
  registerCleanupFunction(() => PermissionTestUtils.remove(testURI, "install"));

  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);

  BrowserTestUtils.loadURIString(
    gBrowser.selectedBrowser,
    `${BASE}/file_install_extensions.html`
  );
  await BrowserTestUtils.browserLoaded(gBrowser.selectedBrowser);

  SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [`${BASE}/browser_webext_unsigned.xpi`],
    async function(url) {
      content.wrappedJSObject.installTrigger(url);
    }
  );

  let panel = await promisePopupNotificationShown("addon-webext-permissions");

  is(panel.getAttribute("icon"), WARNING_ICON);
  let description = panel.querySelector(".popup-notification-description")
    .textContent;
  checkPermissionString(
    description,
    "webextPerms.headerUnsignedWithPerms",
    undefined,
    `Install notification includes unsigned warning`
  );

  // cancel the install
  let promise = promiseInstallEvent({ id: ID }, "onInstallCancelled");
  panel.secondaryButton.click();
  await promise;

  let addon = await AddonManager.getAddonByID(ID);
  is(addon, null, "Extension is not installed");

  BrowserTestUtils.removeTab(tab);
});
