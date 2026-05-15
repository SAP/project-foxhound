/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Through this test we open various browser UI panels and verify that the
// popup cannot be opened through action.openPopup().
async function assertCannotOpenPopup() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
      action: { default_popup: "popup.html" },
    },
    files: {
      "popup.html": `<script src="popup.js"></script>`,
      "popup.js": `browser.test.fail("Action popup unexpectedly opened!");`,
    },
    async background() {
      await browser.test.assertRejects(
        browser.action.openPopup(),
        "openPopup() cannot be called while another panel is open",
        "openPopup() should refuse to open popup"
      );
      browser.test.sendMessage("done");
    },
  });
  await extension.startup();
  await extension.awaitMessage("done");
  await extension.unload();
}

async function assertCanOpenPopup() {
  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      manifest_version: 3,
      action: { default_popup: "popup.html" },
    },
    files: {
      "popup.html": `<script src="popup.js"></script>`,
      "popup.js": `browser.test.sendMessage("popup_opened");`,
    },
    async background() {
      await browser.action.openPopup();
      browser.test.sendMessage("openPopup_resolved");
    },
  });
  await extension.startup();
  await Promise.all([
    extension.awaitMessage("openPopup_resolved"),
    extension.awaitMessage("popup_opened"),
  ]);
  await closeBrowserAction(extension);
  await extension.unload();
}

add_task(async function test_contextmenu_in_content() {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: "https://example.com/browser/browser/components/extensions/test/browser/context.html",
    },
    async () => {
      const menu = await openContextMenu();

      await assertCannotOpenPopup();

      await closeContextMenu(menu);
    }
  );
});

add_task(async function test_appmenu() {
  const { CustomizableUITestUtils } = ChromeUtils.importESModule(
    "resource://testing-common/CustomizableUITestUtils.sys.mjs"
  );
  const cuiTestUtils = new CustomizableUITestUtils(window);
  await cuiTestUtils.openMainMenu();

  await assertCannotOpenPopup();

  await cuiTestUtils.hideMainMenu();
});

add_task(async function test_notification_permission() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.webnotifications.requireuserinteraction", false]],
  });
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "https://example.com/?request_notification_perm" },
    async browser => {
      const shownPromise = BrowserTestUtils.waitForEvent(
        PopupNotifications.panel,
        "popupshown"
      );
      await SpecialPowers.spawn(browser, [], () => {
        content.Notification.requestPermission();
      });
      // Note: If the permission request unexpectedly succeeds (e.g. due to
      // another test having granted it already), we could get stuck here due
      // to the permission prompt never showing up.
      info("Waiting for permission prompt to show up");
      await shownPromise;

      await assertCannotOpenPopup();

      // Temporary pref to undo fix, for 149 only.
      info("Testing extensions.openPopup.undoBug2022281 pref");
      await SpecialPowers.pushPrefEnv({
        set: [["extensions.openPopup.undoBug2022281", true]],
      });
      await assertCanOpenPopup();
      await SpecialPowers.popPrefEnv();
    }
  );
  // Sanity check: when the tab closes, so does the permission prompt.
  is(PopupNotifications.panel.state, "closed", "Prompt should have closed");
  await SpecialPowers.popPrefEnv();
});

// Sanity check: Check that other tests above did not pass trivially due to
// action.openPopup() always failing, by checking that openPopup() can work.
add_task(async function test_popup_can_open() {
  await assertCanOpenPopup();
});
