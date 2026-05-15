/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineLazyGetter(this, "UrlbarTestUtils", () => {
  const { UrlbarTestUtils: module } = ChromeUtils.importESModule(
    "resource://testing-common/UrlbarTestUtils.sys.mjs"
  );
  module.init(this);
  return module;
});

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.trustPanel.featureGate", true],
      ["security.qwacs.enabled", true],
      ["security.qwacs.enable_test_trust_anchors", true],
    ],
  });
  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });
});

add_task(async function test_https() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.com",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);
  await UrlbarTestUtils.openTrustPanelSubview(
    window,
    "trustpanel-securityInformationView"
  );

  Assert.ok(
    BrowserTestUtils.isVisible(
      document.getElementById("identity-popup-content-verifier-unknown")
    ),
    "custom root warning in sub panel is visible"
  );

  await UrlbarTestUtils.closeTrustPanel(window);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_http() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    opening: "http://example.com",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);
  await UrlbarTestUtils.openTrustPanelSubview(
    window,
    "trustpanel-securityInformationView"
  );

  Assert.ok(
    BrowserTestUtils.isHidden(
      document.getElementById("identity-popup-content-verifier-unknown")
    ),
    "custom root warning in sub panel is hidden"
  );

  await UrlbarTestUtils.closeTrustPanel(window);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_1_qwac() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://1-qwac.example.com",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);
  await UrlbarTestUtils.openTrustPanelSubview(
    window,
    "trustpanel-securityInformationView"
  );

  // Wait for the QWAC status to be determined.
  await gTrustPanelHandler.qwacStatusPromise;

  Assert.ok(
    BrowserTestUtils.isVisible(
      document.getElementById("identity-popup-content-etsi")
    ),
    "etsi qualified text visible"
  );

  Assert.ok(
    BrowserTestUtils.isVisible(
      document.getElementById("identity-popup-content-owner-label")
    ),
    "'Certificate issued to:' label visible"
  );

  let qwacOrganization = document.getElementById(
    "identity-popup-content-owner"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(qwacOrganization),
    "QWAC organization text visible"
  );
  Assert.equal(
    qwacOrganization.textContent,
    "Test 1-QWAC Organization",
    "QWAC organization text as expected"
  );

  let qwacLocation = document.getElementById(
    "identity-popup-content-supplemental"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(qwacLocation),
    "QWAC location text visible"
  );
  Assert.equal(
    qwacLocation.textContent,
    "1-QWAC Test Locality\nEX",
    "QWAC location text as expected"
  );

  await UrlbarTestUtils.closeTrustPanel(window);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_2_qwac() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening:
      "https://bound-by-2-qwac.example.com/browser/browser/base/content/test/siteIdentity/2-qwac.html",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);
  await UrlbarTestUtils.openTrustPanelSubview(
    window,
    "trustpanel-securityInformationView"
  );

  // Wait for the QWAC status to be determined.
  await gTrustPanelHandler.qwacStatusPromise;

  Assert.ok(
    BrowserTestUtils.isVisible(
      document.getElementById("identity-popup-content-etsi")
    ),
    "etsi qualified text visible"
  );

  Assert.ok(
    BrowserTestUtils.isVisible(
      document.getElementById("identity-popup-content-owner-label")
    ),
    "'Certificate issued to:' label visible"
  );

  let qwacOrganization = document.getElementById(
    "identity-popup-content-owner"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(qwacOrganization),
    "QWAC organization text visible"
  );
  Assert.equal(
    qwacOrganization.textContent,
    "Test 2-QWAC Organization",
    "QWAC organization text as expected"
  );

  let qwacLocation = document.getElementById(
    "identity-popup-content-supplemental"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(qwacLocation),
    "QWAC location text visible"
  );
  Assert.equal(
    qwacLocation.textContent,
    "2-QWAC Test Locality\nEX",
    "QWAC location text as expected"
  );

  await UrlbarTestUtils.closeTrustPanel(window);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_non_qwac() {
  let uris = [
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com",
    "https://example.com",
    "data:,Hello%2C World!",
  ];
  for (let uri of uris) {
    const tab = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: uri,
      waitForLoad: true,
    });

    await UrlbarTestUtils.openTrustPanel(window);
    await UrlbarTestUtils.openTrustPanelSubview(
      window,
      "trustpanel-securityInformationView"
    );

    // Wait for the QWAC status to be determined.
    await gTrustPanelHandler.qwacStatusPromise;

    Assert.ok(
      BrowserTestUtils.isHidden(
        document.getElementById("identity-popup-content-etsi")
      ),
      "etsi qualified text not visible"
    );

    Assert.ok(
      BrowserTestUtils.isHidden(
        document.getElementById("identity-popup-content-owner-label")
      ),
      "'Certificate issued to:' label not visible"
    );

    Assert.ok(
      BrowserTestUtils.isHidden(
        document.getElementById("identity-popup-content-owner")
      ),
      "QWAC organization text not visible"
    );

    Assert.ok(
      BrowserTestUtils.isHidden(
        document.getElementById("identity-popup-content-supplemental")
      ),
      "QWAC location text not visible"
    );

    await UrlbarTestUtils.closeTrustPanel(window);
    await BrowserTestUtils.removeTab(tab);
  }
});
