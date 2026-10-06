/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AboutWelcomeTelemetry } = ChromeUtils.importESModule(
  "resource:///modules/aboutwelcome/AboutWelcomeTelemetry.sys.mjs"
);

const { PanelTestProvider } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/PanelTestProvider.sys.mjs"
);

const TEST_MESSAGE_ID = "TEST_ASROUTER_MULTISTAGE_MESSAGE";

let gTestMultistageMessage;

/**
 * @backward-compat { version 151 }
 *
 * The asrouter-newtab-multistage component is only supported in 151 onwards.
 * This todo is placed here to keep the test harness happy on pre-151 versions,
 * otherwise there are no passes or fails.
 */
if (Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0) {
  todo(
    false,
    "The asrouter-newtab-multistage component is only supported in 151 onwards."
  );
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.newtab.preload", false],
      ["browser.newtabpage.activity-stream.telemetry", true],
      // @nova-cleanup(remove-pref): Nova is enabled by default starting in
      // Firefox 151. Remove this pref override once 151 reaches Release.
      ["browser.newtabpage.activity-stream.nova.enabled", true],
    ],
  });
  NewTabPagePreloading.removePreloadedBrowser(window);

  Services.fog.testResetFOG();
  registerCleanupFunction(async () => {
    Services.fog.testResetFOG();
    await ASRouter.resetMessageState();
  });

  /**
   * @backward-compat { version 152 }
   *
   * Our test message was added to PanelTestProvider in version 152. This test,
   * however, runs in the newtab train-hop CI jobs, which means that we have
   * to shim the test message until the PanelTestProvider change reaches 152.
   */
  if (Services.vc.compare(AppConstants.MOZ_APP_VERSION, "152.0a1") < 0) {
    gTestMultistageMessage = {
      id: TEST_MESSAGE_ID,
      template: "newtab_message",
      groups: ["cfr"],
      content: {
        messageType: "ASRouterMultistageMessage",
        id: TEST_MESSAGE_ID,
        transitions: false,
        backdrop: "transparent",
        screens: [
          {
            id: "SCREEN_1",
            content: {
              position: "center",
              title: { raw: "Test Title" },
              primary_button: {
                label: { raw: "Primary" },
                action: { navigate: true },
              },
            },
          },
        ],
      },
      frequency: { lifetime: 3 },
      trigger: { id: "newtabMessageCheck" },
    };
  } else {
    gTestMultistageMessage = await PanelTestProvider.getMessages().then(msgs =>
      msgs.find(msg => msg.id === TEST_MESSAGE_ID)
    );
  }
  Assert.ok(gTestMultistageMessage, "Found a test multistage message to use.");
});

/**
 * Tests that registering our test message results in the multistage message
 * component embedding in about:newtab.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_show_multistage_message() {
    let sandbox = sinon.createSandbox();

    await withTestMessage(sandbox, gTestMultistageMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return wrapper.shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");
      });
    });

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);

/**
 * Tests that clicking the dismiss button in the component's shadow DOM
 * permanently blocks the message.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_dismiss_button_blocks_message() {
    let sandbox = sinon.createSandbox();
    sandbox.stub(ASRouter, "blockMessageById").returns(Promise.resolve());

    await withTestMessage(sandbox, gTestMultistageMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return Cu.waiveXrays(wrapper).shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");

        let shadow = Cu.waiveXrays(wrapper).shadowRoot;
        let dismissBtn = shadow.querySelector(
          ".multistage-newtab-wrapper > moz-button"
        );
        Assert.ok(dismissBtn, "Found dismiss button in shadow root");
        dismissBtn.click();

        await ContentTaskUtils.waitForCondition(() => {
          return !content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, ".asrouter-multistage-message-wrapper removed from DOM");
      });
    });

    Assert.ok(
      ASRouter.blockMessageById.calledWith(TEST_MESSAGE_ID),
      "The test message was blocked."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);

/**
 * Tests that showing the multistage message records an IMPRESSION telemetry
 * event and adds an ASRouter impression for frequency capping.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_impression_telemetry() {
    let sandbox = sinon.createSandbox();
    sandbox.spy(ASRouter, "addImpression");
    sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

    await withTestMessage(sandbox, gTestMultistageMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return wrapper.shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");
      });
    });

    await TestUtils.waitForCondition(
      () => ASRouter.addImpression.calledWith(gTestMultistageMessage),
      "The test message had an impression recorded for it."
    );
    await TestUtils.waitForCondition(
      () =>
        AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
          sinon.match({
            message_id: TEST_MESSAGE_ID,
            event: "IMPRESSION",
            pingType: "newtab_message",
          })
        ),
      "Showing the message recorded an IMPRESSION telemetry event."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);

/**
 * Tests that showing the first screen of the multistage message adds an
 * ASRouter screen impression for per-screen frequency capping.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_screen_impression() {
    let sandbox = sinon.createSandbox();
    sandbox.spy(ASRouter, "addScreenImpression");

    await withTestMessage(sandbox, gTestMultistageMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return wrapper.shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");
      });
    });

    await TestUtils.waitForCondition(
      () =>
        ASRouter.addScreenImpression.calledWithMatch(
          sinon.match({ id: "SCREEN_1" })
        ),
      "The first screen had a screen impression recorded for it."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);

/**
 * Tests that no CLICK telemetry is recorded when the multistage message first
 * renders. Regression test for the AW handler bridge incorrectly routing
 * impression signals through handleClick.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_no_click_telemetry_on_render() {
    let sandbox = sinon.createSandbox();
    sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

    await withTestMessage(sandbox, gTestMultistageMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return wrapper.shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");
      });
    });

    // Wait for the IMPRESSION ping first to confirm all initial AW* handlers
    // have fired, then verify no CLICK was recorded alongside it.
    await TestUtils.waitForCondition(
      () =>
        AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
          sinon.match({ event: "IMPRESSION" })
        ),
      "Waiting for IMPRESSION before checking for spurious CLICKs"
    );
    Assert.ok(
      !AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
        sinon.match({ event: "CLICK" })
      ),
      "No CLICK telemetry was fired on initial render."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);

/**
 * Tests that clicking a primary button within the multistage message records
 * a CLICK telemetry event.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_primary_button_click_telemetry() {
    let sandbox = sinon.createSandbox();
    sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");

    // Use a simple message with an inert primary button action so clicking it
    // fires telemetry without navigating or opening new tabs.
    let inertMessage = {
      ...gTestMultistageMessage,
      content: {
        messageType: "ASRouterMultistageMessage",
        id: TEST_MESSAGE_ID,
        transitions: false,
        backdrop: "transparent",
        screens: [
          {
            id: "SCREEN_1",
            content: {
              position: "center",
              title: { raw: "Test Title" },
              primary_button: {
                label: { raw: "Primary" },
                action: {},
              },
            },
          },
        ],
      },
    };

    await withTestMessage(sandbox, inertMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return Cu.waiveXrays(wrapper).shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");

        let shadow = Cu.waiveXrays(wrapper).shadowRoot;
        let primaryBtn = shadow.querySelector("button.primary");
        Assert.ok(primaryBtn, "Found primary button in shadow root");
        primaryBtn.click();
      });
    });

    await TestUtils.waitForCondition(
      () =>
        AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
          sinon.match({
            message_id: TEST_MESSAGE_ID,
            event: "CLICK",
            pingType: "newtab_message",
          })
        ),
      "Clicking the primary button recorded a CLICK telemetry event."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);

/**
 * Tests that clicking the dismiss button records a DISMISS telemetry event.
 */
add_task(
  {
    /**
     * @backward-compat { version 151 }
     *
     * The asrouter-newtab-multistage component is only supported in 151 onwards.
     */
    skip_if: () => {
      return Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0;
    },
  },
  async function test_dismiss_button_telemetry() {
    let sandbox = sinon.createSandbox();
    sandbox.spy(AboutWelcomeTelemetry.prototype, "submitGleanPingForPing");
    sandbox.stub(ASRouter, "blockMessageById").returns(Promise.resolve());

    await withTestMessage(sandbox, gTestMultistageMessage, async () => {
      await BrowserTestUtils.openNewForegroundTab(gBrowser, "about:newtab");

      await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async () => {
        const wrapper = await ContentTaskUtils.waitForCondition(() => {
          return content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, "Waiting for .asrouter-multistage-message-wrapper");

        await ContentTaskUtils.waitForCondition(() => {
          return Cu.waiveXrays(wrapper).shadowRoot?.querySelector(
            ".multistage-newtab-wrapper"
          );
        }, "Waiting for React bundle to mount in shadow root");

        let shadow = Cu.waiveXrays(wrapper).shadowRoot;
        let dismissBtn = shadow.querySelector(
          ".multistage-newtab-wrapper > moz-button"
        );
        Assert.ok(dismissBtn, "Found dismiss button in shadow root");
        dismissBtn.click();

        await ContentTaskUtils.waitForCondition(() => {
          return !content.document.querySelector(
            ".asrouter-multistage-message-wrapper"
          );
        }, ".asrouter-multistage-message-wrapper removed from DOM");
      });
    });

    Assert.ok(
      AboutWelcomeTelemetry.prototype.submitGleanPingForPing.calledWithMatch(
        sinon.match({
          message_id: TEST_MESSAGE_ID,
          event: "DISMISS",
          pingType: "newtab_message",
        })
      ),
      "Clicking the dismiss button recorded a DISMISS telemetry event."
    );
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    sandbox.restore();
  }
);
