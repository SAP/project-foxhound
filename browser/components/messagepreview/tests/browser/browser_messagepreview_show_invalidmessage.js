"use strict";

const { AboutMessagePreviewParent } = ChromeUtils.importESModule(
  "resource:///actors/AboutWelcomeParent.sys.mjs"
);

let messageSandbox;

const TEST_INVALID_MESSAGE = {
  content: {
    tiles: {
      type: "addons-picker",
    },
    title: {
      string_id: "amo-picker-title",
    },
    subtitle: {
      string_id: "amo-picker-subtitle",
    },
    secondary_button: {
      label: {
        string_id: "onboarding-not-now-button-label",
      },
      style: "secondary",
      action: {
        navigate: true,
      },
    },
  },
};

add_setup(async function () {
  messageSandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    messageSandbox.restore();
  });
});

add_task(async function test_show_invalid_message() {
  let { cleanup, browser } = await openMessagePreviewTab();
  let aboutMessagePreviewActor = await getAboutMessagePreviewParent(browser);
  messageSandbox.spy(aboutMessagePreviewActor, "showMessage");

  let invalidMessageErrorPromise = getConsoleErrorPromise("Invalid message");
  let missingTemplateErrorPromise = getConsoleErrorPromise(
    "Unsupported message template"
  );
  await SpecialPowers.spawn(browser, [TEST_INVALID_MESSAGE], message =>
    content.wrappedJSObject.MPShowMessage(JSON.stringify(message))
  );

  const { callCount } = aboutMessagePreviewActor.showMessage;

  Assert.greaterOrEqual(callCount, 1, "showMessage was called");
  ok(await invalidMessageErrorPromise, "Error on invalid message");
  ok(await missingTemplateErrorPromise, "Error on missing template property");

  messageSandbox.restore();
  await cleanup();
});
