/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/base/content/test/permissions/head.js",
  this
);

const TEST_URL =
  "https://example.com/document-builder.sjs?html=<h1>Test serial blocked icon</h1>";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.webserial.gated", true]],
  });

  registerCleanupFunction(async () => {
    await SpecialPowers.removePermission("serial", {
      url: TEST_URL,
    });
    while (gBrowser.tabs.length > 1) {
      BrowserTestUtils.removeTab(gBrowser.selectedTab);
    }
  });
});

add_task(async function testBlockedIconAppearsWhenDenied() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_URL);

  info("Check that serial permission isn't set");
  ok(
    await SpecialPowers.testPermission(
      "serial",
      SpecialPowers.Services.perms.UNKNOWN_ACTION,
      { url: TEST_URL }
    ),
    "serial value should have UNKNOWN permission"
  );

  let serialIcon = gPermissionPanel._identityPermissionBox.querySelector(
    ".blocked-permission-icon[data-permission-id='serial']"
  );
  ok(serialIcon, "serial blocked icon element exists");
  ok(
    !serialIcon.hasAttribute("showing"),
    "blocked permission icon is not shown initially"
  );

  info("Set serial permission to DENY");
  PermissionTestUtils.add(
    gBrowser.currentURI,
    "serial",
    Services.perms.DENY_ACTION
  );

  gPermissionPanel.refreshPermissionIcons();
  ok(
    serialIcon.hasAttribute("showing"),
    "blocked permission icon is shown after DENY"
  );

  info("Remove the permission");
  PermissionTestUtils.remove(gBrowser.currentURI, "serial");

  info("Trigger permission icon refresh");
  gPermissionPanel.refreshPermissionIcons();

  ok(
    !serialIcon.hasAttribute("showing"),
    "blocked permission icon is not shown after reset"
  );

  BrowserTestUtils.removeTab(tab);
});
