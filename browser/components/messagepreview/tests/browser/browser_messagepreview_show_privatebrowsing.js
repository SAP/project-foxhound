"use strict";

const { AboutMessagePreviewParent } = ChromeUtils.importESModule(
  "resource:///actors/AboutWelcomeParent.sys.mjs"
);

let messageSandbox;

const TEST_PB_MESSAGE = {
  weight: 100,
  id: "PB_NEWTAB_TEST",
  template: "pb_newtab",
  content: {
    promoEnabled: true,
    promoType: "VPN",
    infoEnabled: false,
    infoTitleEnabled: false,
    promoLinkType: "button",
    promoLinkText: "Link",
    promoSectionStyle: "below-search",
    promoHeader: "This is a test PB message",
    promoTitle: "Test",
    promoTitleEnabled: true,
    promoImageLarge: "chrome://browser/content/assets/moz-vpn.svg",
    promoButton: {
      action: {
        type: "OPEN_URL",
        data: {
          args: "https://vpn.mozilla.org/",
        },
      },
    },
  },
  groups: ["panel-test-provider", "pbNewtab"],
  targeting: "true",
  frequency: {
    lifetime: 3,
  },
  provider: "panel_local_testing",
};

add_setup(async function () {
  messageSandbox = sinon.createSandbox();
  registerCleanupFunction(() => {
    messageSandbox.restore();
  });
});

add_task(async function test_show_private_browsing_message() {
  let { cleanup, browser } = await openMessagePreviewTab();
  let aboutMessagePreviewActor = await getAboutMessagePreviewParent(browser);
  messageSandbox.spy(aboutMessagePreviewActor, "showMessage");

  let privateWinPromise = BrowserTestUtils.waitForNewWindow({
    url: "about:privatebrowsing?debug",
  });
  await SpecialPowers.spawn(browser, [TEST_PB_MESSAGE], message =>
    content.wrappedJSObject.MPShowMessage(JSON.stringify(message))
  );

  const { callCount } = aboutMessagePreviewActor.showMessage;
  Assert.greaterOrEqual(callCount, 1, "showMessage was called");
  // A new private window should open
  let privateWin = await privateWinPromise;
  Assert.ok(privateWin, "Private window opened");

  let tab = privateWin.gBrowser.selectedBrowser;
  //Test the message content
  await SpecialPowers.spawn(
    tab,
    [
      "renders the private browsing message",
      [
        "div.promo.below-search.promo-visible", // message wrapper
        "div.promo-image-large", // main image
        "h1#promo-header", // main title
        "p#private-browsing-promo-text", // message body
        "button.vpn-promo.primary", // primary button
      ],
    ],
    async function (experiment, selectors) {
      // Wait for main content to render
      await ContentTaskUtils.waitForCondition(() =>
        content.document.documentElement.hasAttribute(
          "PrivateBrowsingRenderComplete"
        )
      );

      for (let selector of selectors) {
        await ContentTaskUtils.waitForCondition(() =>
          content.document.documentElement.querySelector(selector)
        );
        Assert.ok(true, `Element present with selector ${selector}`);
      }
    }
  );
  //Remember to clean up the extra window first
  await BrowserTestUtils.closeWindow(privateWin);
  messageSandbox.restore();
  await cleanup();
});
