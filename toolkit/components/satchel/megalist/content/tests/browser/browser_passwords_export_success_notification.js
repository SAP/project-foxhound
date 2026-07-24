/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["toolkit.osKeyStore.unofficialBuildOnlyLogin", ""]],
  });
});

const { MockFilePicker } = SpecialPowers;

function waitForOpenFilePicker() {
  return new Promise(resolve => {
    MockFilePicker.showCallback = () => {
      MockFilePicker.showCallback = null;
      Assert.ok(true, "Saw the file picker");
      resolve();
    };
  });
}

async function clickExportAllPasswords(megalist) {
  MockFilePicker.init(window.browsingContext);
  MockFilePicker.useAnyFile();
  MockFilePicker.returnValue = MockFilePicker.returnOK;

  const getShadowBtn = (el, selector) =>
    el.querySelector(selector).shadowRoot.querySelector("button");
  const menu = megalist.querySelector("panel-list");
  const menuButton = megalist.querySelector("#more-options-menubutton");
  menuButton.click();
  await BrowserTestUtils.waitForEvent(menu, "shown");
  const exportMenuItem = getShadowBtn(menu, "[action='export-logins']");
  await waitForReauth(() => exportMenuItem.click());

  async function waitForFilePicker() {
    let filePickerPromise = waitForOpenFilePicker();
    info("Waiting for export file picker to get opened");
    await filePickerPromise;
    Assert.ok(true, "Export file picker opened");
  }

  await waitForFilePicker();
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.contextual-password-manager.enabled", true],
      ["signon.rememberSignons", true],
    ],
  });
  registerCleanupFunction(async () => {
    LoginTestUtils.clearData();
    MockFilePicker.cleanup();
  });
});

add_task(async function test_passwords_export_notification() {
  info("Check that notification is shown when user exports all passwords.");
  const canTestOSAuth = await resetTelemetryIfKeyStoreTestable();
  if (!canTestOSAuth) {
    return;
  }
  const megalist = await openPasswordsSidebar();
  await addMockPasswords();
  await checkAllLoginsRendered(megalist);
  await BrowserTestUtils.waitForCondition(
    () => megalist.querySelector(".second-row"),
    "Second row failed to render"
  );
  const originalPromptService = Services.prompt;
  Services.prompt = mockServicePrompt();

  await clickExportAllPasswords(megalist, getMegalistParent());
  ok(true, "Export menu clicked.");
  const notifMsgBar = await checkNotificationAndTelemetry(
    megalist,
    "export-passwords-success"
  );
  ok(true, "Notification for successful export of passwords is shown.");
  checkNotificationInteractionTelemetry(notifMsgBar, "primary-action", {
    notification_detail: "export_passwords_success",
    action_type: "dismiss",
  });

  info("Closing the sidebar");
  SidebarController.hide();
  Services.prompt = originalPromptService;
});
