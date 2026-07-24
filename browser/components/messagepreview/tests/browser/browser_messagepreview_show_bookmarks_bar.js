"use strict";

const { AboutMessagePreviewParent } = ChromeUtils.importESModule(
  "resource:///actors/AboutWelcomeParent.sys.mjs"
);

let messageSandbox;

const TEST_BOOKMARKS_BAR_MESSAGE = {
  id: "TEST_BMB_BAR_BUTTON",
  groups: [],
  template: "bookmarks_bar_button",
  content: {
    label: {
      raw: "Getting Started",
      tooltiptext: "Getting started with Firefox",
    },
    action: {
      type: "OPEN_URL",
      data: {
        args: "https://www.mozilla.org",
        where: "tab",
      },
      navigate: true,
    },
  },
  trigger: { id: "defaultBrowserCheck" },
  targeting: "true",
};

add_setup(async function () {
  messageSandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    messageSandbox.restore();
  });
});

add_task(async function test_show_bookmarks_bar_button_message() {
  let { cleanup, browser } = await openMessagePreviewTab();
  let aboutMessagePreviewActor = await getAboutMessagePreviewParent(browser);
  messageSandbox.spy(aboutMessagePreviewActor, "showMessage");

  await SpecialPowers.spawn(browser, [TEST_BOOKMARKS_BAR_MESSAGE], message =>
    content.wrappedJSObject.MPShowMessage(JSON.stringify(message))
  );

  const { callCount } = aboutMessagePreviewActor.showMessage;
  Assert.greaterOrEqual(callCount, 1, "showMessage was called");

  await BrowserTestUtils.waitForCondition(
    () => selectorIsVisible("#fxms-bmb-button"),
    "Bookmarks toolbar button should be visible"
  );

  // Remove the button, so repeated tests don't fail
  await CustomizableUI.destroyWidget("fxms-bmb-button");
  messageSandbox.restore();
  await cleanup();
});
