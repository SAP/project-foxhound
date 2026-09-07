"use strict";

const { AboutMessagePreviewParent } = ChromeUtils.importESModule(
  "resource:///actors/AboutWelcomeParent.sys.mjs"
);

let messageSandbox;

const TEST_INFOBAR_MESSAGE = {
  content: {
    text: "Test infobar text",
    buttons: [
      {
        label: {
          string_id: "default-browser-notification-button",
        },
        action: {
          type: "PIN_AND_DEFAULT",
        },
        primary: true,
        accessKey: "P",
      },
    ],
  },
  trigger: {
    id: "defaultBrowserCheck",
  },
  template: "infobar",
  targeting: "true",
  id: "TEST_INFOBAR_MESSAGE",
  last_modified: 1620060686277,
  provider: "cfr",
};

add_setup(async function () {
  messageSandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    messageSandbox.restore();
  });
});

add_task(async function test_show_infobar_message() {
  let { cleanup, browser } = await openMessagePreviewTab();
  let aboutMessagePreviewActor = await getAboutMessagePreviewParent(browser);
  messageSandbox.spy(aboutMessagePreviewActor, "showMessage");

  await SpecialPowers.spawn(browser, [TEST_INFOBAR_MESSAGE], message =>
    content.wrappedJSObject.MPShowMessage(JSON.stringify(message))
  );

  const { callCount } = aboutMessagePreviewActor.showMessage;
  Assert.greaterOrEqual(callCount, 1, "showMessage was called");
  // Infobars live in the notificationStack
  let notificationStack = gBrowser.getNotificationBox(gBrowser.selectedBrowser);

  Assert.ok(notificationStack);

  await BrowserTestUtils.waitForCondition(
    () => notificationStack.currentNotification,
    "Wait for notification to show"
  );

  Assert.equal(
    notificationStack.currentNotification.getAttribute("value"),
    "TEST_INFOBAR_MESSAGE",
    "Notification id should match the test message"
  );

  messageSandbox.restore();
  await cleanup();
});
