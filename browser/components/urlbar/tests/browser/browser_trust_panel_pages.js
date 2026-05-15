/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* This test checks pages of different URL variants (mostly differing in scheme)
 * and verifies that the shield is only shown when content blocking can deal
 * with the specific variant. */

const ICONS = {
  active: "chrome://browser/skin/trust-icon-active.svg",
  insecure: "chrome://browser/skin/trust-icon-insecure.svg",
  file: "chrome://global/skin/icons/page-portrait.svg",
  secure: "chrome://global/skin/icons/security.svg",
  broken: "chrome://global/skin/icons/security-broken.svg",
  failure: "chrome://global/skin/icons/info.svg",
};

const TESTS = [
  {
    url: "about:about",
    icon: ICONS.active,
    connectionIcon: ICONS.secure,
    descriptionSection: "trustpanel-header-enabled",
  },
  {
    url: "https://example.com",
    icon: ICONS.active,
    connectionIcon: ICONS.secure,
    descriptionSection: "trustpanel-header-enabled",
  },
  {
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    url: "http://example.com",
    icon: ICONS.insecure,
    connectionIcon: ICONS.broken,
    descriptionSection: "trustpanel-header-enabled-insecure",
  },
  {
    url: "https://self-signed.example.com",
    icon: ICONS.insecure,
    connectionIcon: ICONS.broken,
    descriptionSection: "trustpanel-header-enabled-insecure",
    isErrorPage: true,
  },
  {
    url: "about:neterror",
    icon: ICONS.active,
    connectionIcon: ICONS.failure,
    descriptionSection: "trustpanel-header-enabled",
  },
];

let fetchIconUrl = (doc, id) => {
  let icon = doc.defaultView.getComputedStyle(
    doc.getElementById(id)
  ).listStyleImage;
  return icon.match(/url\("([^"]+)"\)/)?.[1] ?? null;
};

add_task(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.trustPanel.featureGate", true]],
  });

  let extension = ExtensionTestUtils.loadExtension({
    manifest: {
      web_accessible_resources: ["test_page.html"],
    },
    files: {
      "test_page.html": `<!doctype html><title>title</title>`,
    },
  });

  await extension.startup();

  TESTS.push({
    url: `moz-extension://${extension.uuid}/test_page.html`,
    icon: ICONS.active,
    connectionIcon: ICONS.secure,
    descriptionSection: "trustpanel-header-enabled",
  });

  for (let testData of TESTS) {
    info(`Testing state of for ${testData.url}`);

    let pageLoaded;
    let tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      () => {
        gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, testData.url);
        let browser = gBrowser.selectedBrowser;
        if (testData.isErrorPage) {
          pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
        } else {
          pageLoaded = BrowserTestUtils.browserLoaded(browser);
        }
      },
      false
    );
    await pageLoaded;

    Assert.equal(
      fetchIconUrl(tab.ownerDocument, "trust-icon"),
      testData.icon,
      `Trustpanel urlbar icon is correct for ${testData.url}`
    );

    await UrlbarTestUtils.openTrustPanel(window);
    Assert.equal(
      fetchIconUrl(tab.ownerDocument, "trustpanel-connection-icon"),
      testData.connectionIcon,
      `Trustpanel connection icon is correct for ${testData.url}`
    );

    Assert.ok(
      BrowserTestUtils.isVisible(
        tab.ownerDocument.querySelector(
          `label[data-l10n-id=${testData.descriptionSection}]`
        )
      ),
      "Expected description section is visible"
    );
    await UrlbarTestUtils.closeTrustPanel(window);

    BrowserTestUtils.removeTab(tab);
  }

  await extension.unload();
});
