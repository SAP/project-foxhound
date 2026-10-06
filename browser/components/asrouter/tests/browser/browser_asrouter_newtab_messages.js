/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AboutWelcomeTelemetry } = ChromeUtils.importESModule(
  "resource:///modules/aboutwelcome/AboutWelcomeTelemetry.sys.mjs"
);

const { PanelTestProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/PanelTestProvider.sys.mjs"
);

const { SpecialMessageActions } = ChromeUtils.importESModule(
  "resource://messaging-system/lib/SpecialMessageActions.sys.mjs"
);

const TEST_MESSAGE_ID = "TEST_ASROUTER_NEWTAB_MESSAGE";

let gTestNewTabMessage;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.newtabpage.activity-stream.telemetry", true],
      ["browser.newtab.preload", false],
    ],
  });
  NewTabPagePreloading.removePreloadedBrowser(window);

  Services.fog.testResetFOG();
  registerCleanupFunction(async () => {
    Services.fog.testResetFOG();
    await ASRouter.resetMessageState();
  });

  gTestNewTabMessage = await PanelTestProvider.getMessages().then(msgs =>
    msgs.find(msg => msg.id === TEST_MESSAGE_ID)
  );
  Assert.ok(gTestNewTabMessage, "Found a test fxa_cta message to use.");
});

/**
 * Tests that registering our test message results it in appearing on newtab,
 * and that we record an impression for it.
 */
add_task(async function test_show_newtab_message() {
  let sandbox = sinon.createSandbox();
  sandbox.spy(ASRouter, "addImpression");
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Waiting for asrouter-newtab-message");
    });
  });

  await TestUtils.waitForCondition(
    () => ASRouter.addImpression.calledWith(gTestNewTabMessage),
    "The test message had an impression recorded for it."
  );
  await TestUtils.waitForCondition(
    () =>
      AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
        sinon.match({
          message_id: gTestNewTabMessage.id,
          event: "IMPRESSION",
          pingType: "newtab_message",
        })
      ),
    "Waiting for Glean IMPRESSION ping"
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that the message has callbacks assigned to it that allow it to
 * be blocked.
 */
add_task(async function test_block_newtab_message() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(ASRouter, "blockMessageById").returns(Promise.resolve());

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      // Eventually, if this UI component has a block button that exists in
      // every variant it displays, or a common block behaviour, we can trigger
      // that here. For now though, we'll just call the handleBlock method
      // manually.
      Cu.waiveXrays(msgEl).handleBlock();
    });
  });

  Assert.ok(
    ASRouter.blockMessageById.calledWith(TEST_MESSAGE_ID),
    "The test message was blocked."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that the message has callbacks assigned to it that allow it to
 * be closed without being considered dismissed. This just removes the message
 * from the DOM.
 */
add_task(async function test_close_newtab_message() {
  let sandbox = sinon.createSandbox();
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      // Eventually, if this UI component has a block button that exists in
      // every variant it displays, or a common block behaviour, we can trigger
      // that here. For now though, we'll just call the handleClose method
      // manually.
      Cu.waiveXrays(msgEl).handleClose();

      await ContentTaskUtils.waitForCondition(() => {
        return !content.document.querySelector("asrouter-newtab-message");
      }, "asrouter-newtab-message removed from DOM");
    });
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that the message has callbacks assigned to it that allow it to
 * be dismissed, which is then recorded in telemetry. This is a superset of
 * the "close" action, which also removes the message from the DOM.
 */
add_task(async function test_dismiss_newtab_message() {
  let sandbox = sinon.createSandbox();
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      // Eventually, if this UI component has a block button that exists in
      // every variant it displays, or a common block behaviour, we can trigger
      // that here. For now though, we'll just call the handleDismiss method
      // manually.
      Cu.waiveXrays(msgEl).handleDismiss();

      // This should also remove the asrouter-newtab-message from the DOM, since
      // handleDismiss automatically calls handleClose.
      await ContentTaskUtils.waitForCondition(() => {
        return !content.document.querySelector("asrouter-newtab-message");
      }, "asrouter-newtab-message removed from DOM");
    });
  });

  Assert.ok(
    AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
      sinon.match({
        message_id: gTestNewTabMessage.id,
        event: "DISMISS",
        pingType: "newtab_message",
      })
    ),
    "The test message had a dismiss recorded for it."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that the message has callbacks assigned to it that allow it to record
 * a click telemetry event that we expect for newtab messages.
 */
add_task(async function test_click_newtab_message() {
  let sandbox = sinon.createSandbox();
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      // Eventually, if this UI component has a block button that exists in
      // every variant it displays, or a common block behaviour, we can trigger
      // that here. For now though, we'll just call the handleClick method
      // manually.
      Cu.waiveXrays(msgEl).handleClick();
    });
  });

  Assert.ok(
    AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
      sinon.match({
        message_id: gTestNewTabMessage.id,
        event: "CLICK",
        pingType: "newtab_message",
      })
    ),
    "The test message had a click recorded for it."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that the asrouter-newtab-message component can be used to trigger
 * special message actions.
 */
add_task(async function test_special_message_actions() {
  let sandbox = sinon.createSandbox();
  const TEST_ACTION = { type: "TEST_ACTION", data: { test: 123 } };

  sandbox.stub(SpecialMessageActions, "handleAction");

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(
      gBrowser.selectedBrowser,
      [TEST_ACTION],
      async action => {
        await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector("asrouter-newtab-message");
        }, "Found asrouter-newtab-message");

        let msgEl = content.document.querySelector("asrouter-newtab-message");
        Cu.waiveXrays(msgEl).specialMessageAction(
          Cu.cloneInto(action, content)
        );
      }
    );
  });

  Assert.ok(
    SpecialMessageActions.handleAction.calledWithMatch(
      sinon.match(TEST_ACTION),
      gBrowser.selectedBrowser
    ),
    "SpecialMessageActions was callable from the asrouter-newtab-message component."
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that clicking the X button in the component's shadow DOM permanently
 * blocks the message and records a DISMISS telemetry event.
 */
add_task(async function test_dismiss_button_click() {
  let sandbox = sinon.createSandbox();
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");
  sandbox.stub(ASRouter, "blockMessageById").returns(Promise.resolve());

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let dismissBtn = shadow.querySelector(".dismiss-button moz-button");
      Assert.ok(dismissBtn, "Found dismiss button in shadow DOM");
      dismissBtn.click();

      await ContentTaskUtils.waitForCondition(() => {
        return !content.document.querySelector("asrouter-newtab-message");
      }, "asrouter-newtab-message removed from DOM");
    });
  });

  Assert.ok(
    ASRouter.blockMessageById.calledWith(TEST_MESSAGE_ID),
    "Clicking the X button permanently blocked the message."
  );
  Assert.ok(
    AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
      sinon.match({
        message_id: gTestNewTabMessage.id,
        event: "DISMISS",
        pingType: "newtab_message",
      })
    ),
    "Clicking the X button recorded a DISMISS telemetry event."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that clicking the primary button fires click telemetry and triggers the
 * configured SpecialMessageAction.
 */
add_task(async function test_primary_button_click() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(SpecialMessageActions, "handleAction");
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let primaryBtn = shadow.querySelector(
        ".button-group moz-button[type='primary']"
      );
      Assert.ok(primaryBtn, "Found primary button in shadow DOM");
      primaryBtn.click();
    });
  });

  Assert.ok(
    SpecialMessageActions.handleAction.calledWithMatch(
      sinon.match({
        type: "OPEN_URL",
        data: { args: "https://www.mozilla.org/" },
      }),
      gBrowser.selectedBrowser
    ),
    "Clicking the primary button triggered the configured SpecialMessageAction."
  );
  Assert.ok(
    AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
      sinon.match({
        message_id: gTestNewTabMessage.id,
        event: "CLICK",
        pingType: "newtab_message",
      })
    ),
    "Clicking the primary button recorded a CLICK telemetry event."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

add_task(async function test_hidden_dismiss_button() {
  let sandbox = sinon.createSandbox();
  const testMessage = {
    ...gTestNewTabMessage,
    content: {
      ...gTestNewTabMessage.content,
      hideDismissButton: true,
    },
  };

  await withTestMessage(sandbox, testMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let dismissBtn = shadow.querySelector(".dismiss-button moz-button");
      Assert.ok(
        !dismissBtn,
        "Dismiss button is not rendered when hideDismissButton is true"
      );
    });
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that clicking the secondary button fires CLICK telemetry and triggers
 * the configured SpecialMessageAction.
 */
add_task(async function test_secondary_button_click() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(SpecialMessageActions, "handleAction");
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

  const testMessage = {
    ...gTestNewTabMessage,
    content: {
      ...gTestNewTabMessage.content,
      secondaryButton: {
        label: "Secondary Action",
        action: { type: "CANCEL" },
      },
    },
  };

  await withTestMessage(sandbox, testMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let secondaryBtn = shadow.querySelector(
        ".button-group moz-button[type='default']"
      );
      Assert.ok(secondaryBtn, "Found secondary button in shadow DOM");
      secondaryBtn.click();
    });
  });

  Assert.ok(
    SpecialMessageActions.handleAction.calledWithMatch(
      sinon.match({ type: "CANCEL" }),
      gBrowser.selectedBrowser
    ),
    "Clicking the secondary button triggered the configured SpecialMessageAction."
  );
  Assert.ok(
    AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
      sinon.match({
        message_id: testMessage.id,
        event: "CLICK",
        pingType: "newtab_message",
      })
    ),
    "Clicking the secondary button recorded a CLICK telemetry event."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

add_task(async function test_secondary_button_dismiss() {
  let sandbox = sinon.createSandbox();
  sandbox.stub(SpecialMessageActions, "handleAction");
  sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");
  sandbox.spy(ASRouter, "blockMessageById");

  const testMessage = {
    ...gTestNewTabMessage,
    content: {
      ...gTestNewTabMessage.content,
      secondaryButton: {
        label: "Not Now",
        action: {
          dismiss: true,
        },
      },
    },
  };

  await withTestMessage(sandbox, testMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let secondaryBtn = shadow.querySelector(
        ".button-group moz-button[type='default']"
      );
      Assert.ok(secondaryBtn, "Found secondary button in shadow DOM");
      secondaryBtn.click();

      await ContentTaskUtils.waitForCondition(() => {
        return !content.document.querySelector("asrouter-newtab-message");
      }, "asrouter-newtab-message removed from DOM after dismiss");
    });
  });

  Assert.ok(
    !SpecialMessageActions.handleAction.called,
    "Clicking the secondary button with only dismiss: true did not trigger SpecialMessageActions."
  );
  Assert.ok(
    !ASRouter.blockMessageById.called,
    "Clicking the secondary button with dismiss: true did not permanently block the message."
  );
  Assert.ok(
    AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
      sinon.match({
        message_id: testMessage.id,
        event: "DISMISS",
        pingType: "newtab_message",
      })
    ),
    "Clicking the secondary button with dismiss: true recorded a DISMISS telemetry event."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that clicking the secondary button with a BLOCK_MESSAGE action
 * permanently blocks the message via SpecialMessageActions.
 */
add_task(async function test_secondary_button_block_message() {
  let sandbox = sinon.createSandbox();
  sandbox
    .stub(SpecialMessageActions, "blockMessageById")
    .returns(Promise.resolve());

  const testMessage = {
    ...gTestNewTabMessage,
    content: {
      ...gTestNewTabMessage.content,
      secondaryButton: {
        label: "No Thanks",
        action: {
          type: "BLOCK_MESSAGE",
          data: { id: TEST_MESSAGE_ID },
        },
      },
    },
  };

  await withTestMessage(sandbox, testMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let secondaryBtn = shadow.querySelector(
        ".button-group moz-button[type='default']"
      );
      Assert.ok(secondaryBtn, "Found secondary button in shadow DOM");
      secondaryBtn.click();
    });
  });

  await TestUtils.waitForCondition(
    () => SpecialMessageActions.blockMessageById.calledWith(TEST_MESSAGE_ID),
    "Clicking the secondary button with BLOCK_MESSAGE permanently blocked the message."
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  sandbox.restore();
});

/**
 * Tests that the image property, when set to the empty string, causes the image
 * element to not be rendered.
 */
add_task(async function test_image_is_optional() {
  let sandbox = sinon.createSandbox();

  await withTestMessage(sandbox, gTestNewTabMessage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(
      gBrowser.selectedBrowser,
      [gTestNewTabMessage.content.imageSrc],
      async imageURL => {
        await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector("asrouter-newtab-message");
        }, "Found asrouter-newtab-message");

        let msgEl = content.document.querySelector("asrouter-newtab-message");
        let shadow = Cu.waiveXrays(msgEl).shadowRoot;
        let image = shadow.querySelector("img");
        Assert.ok(image, "Found image in shadow DOM");
        Assert.ok(ContentTaskUtils.isVisible(image), "Image is visible");
        Assert.equal(
          image.src,
          imageURL,
          "Image source was set to the right URL"
        );
      }
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  const testMessageNoImage = {
    ...gTestNewTabMessage,
    content: {
      ...gTestNewTabMessage.content,
      imageSrc: "",
    },
  };

  await withTestMessage(sandbox, testMessageNoImage, async () => {
    await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");
    await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
      await ContentTaskUtils.waitForCondition(() => {
        return content.document.querySelector("asrouter-newtab-message");
      }, "Found asrouter-newtab-message");

      let msgEl = content.document.querySelector("asrouter-newtab-message");
      let shadow = Cu.waiveXrays(msgEl).shadowRoot;
      let image = shadow.querySelector("img");
      Assert.ok(!image, "No image in shadow DOM");
    });
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  });

  sandbox.restore();
});
