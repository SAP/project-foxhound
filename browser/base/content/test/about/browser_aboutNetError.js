/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SSL3_PAGE = "https://ssl3.example.com/";
const TLS10_PAGE = "https://tls1.example.com/";
const TLS12_PAGE = "https://tls12.example.com/";
const TRIPLEDES_PAGE = "https://3des.example.com/";

const lazy = {};

XPCOMUtils.defineLazyServiceGetter(
  lazy,
  "gDNSOverride",
  "@mozilla.org/network/native-dns-override;1",
  Ci.nsINativeDNSResolverOverride
);

const DES_PREF = "security.ssl3.deprecated.rsa_des_ede3_sha";

// This includes all the cipher suite prefs we have.
function resetPrefs() {
  Services.prefs.clearUserPref("security.tls.version.min");
  Services.prefs.clearUserPref("security.tls.version.max");
  Services.prefs.clearUserPref("security.tls.version.enable-deprecated");
  Services.prefs.clearUserPref("browser.fixup.alternate.enabled");
  Services.prefs.clearUserPref(DES_PREF);
}

const SSL_ERROR_BASE = -0x3000;
const SSL_ERROR_NO_CYPHER_OVERLAP = SSL_ERROR_BASE + 2;
const SSL_ERROR_PROTOCOL_VERSION_ALERT = SSL_ERROR_BASE + 98;

function nssErrorToNSErrorAsString(nssError) {
  let nssErrorsService = Cc["@mozilla.org/nss_errors_service;1"].getService(
    Ci.nsINSSErrorsService
  );
  return nssErrorsService.getXPCOMFromNSSError(nssError).toString();
}

async function resetTelemetry() {
  Services.telemetry.clearEvents();
  await TestUtils.waitForCondition(() => {
    let events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
      true
    ).content;
    return !events || !events.length;
  });
}

async function checkTelemetry(errorString, nssError) {
  let loadEvent = await TestUtils.waitForCondition(() => {
    let events = Services.telemetry.snapshotEvents(
      Ci.nsITelemetry.DATASET_PRERELEASE_CHANNELS,
      true
    ).content;
    return events?.find(e => e[1] == "security.ui.tlserror" && e[2] == "load");
  }, "recorded telemetry for the load");
  loadEvent.shift();
  Assert.deepEqual(loadEvent, [
    "security.ui.tlserror",
    "load",
    "abouttlserror",
    errorString,
    {
      is_frame: "false",
      channel_status: nssErrorToNSErrorAsString(nssError),
    },
  ]);
}

add_task(async function resetToDefaultConfig() {
  info(
    "Change TLS config to cause page load to fail, check that reset button is shown and that it works"
  );

  // Set ourselves up for a TLS error.
  Services.prefs.setIntPref("security.tls.version.min", 1); // TLS 1.0
  Services.prefs.setIntPref("security.tls.version.max", 1);

  await resetTelemetry();

  let browser;
  let pageLoaded;
  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, TLS12_PAGE);
      browser = gBrowser.selectedBrowser;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );

  info("Loading and waiting for the net error");
  await pageLoaded;

  await checkTelemetry(
    "SSL_ERROR_PROTOCOL_VERSION_ALERT",
    SSL_ERROR_PROTOCOL_VERSION_ALERT
  );

  // Setup an observer for the target page.
  const finalLoadComplete = BrowserTestUtils.browserLoaded(
    browser,
    false,
    TLS12_PAGE
  );

  await SpecialPowers.spawn(browser, [], async function () {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    const netErrorCard = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("net-error-card")?.wrappedJSObject
    );
    netErrorCard.advancedButton.scrollIntoView(true);
    EventUtils.synthesizeMouseAtCenter(
      netErrorCard.advancedButton,
      {},
      content
    );
    await ContentTaskUtils.waitForCondition(
      () => ContentTaskUtils.isVisible(netErrorCard.prefResetButton),
      "prefResetButton is visible"
    );

    if (!Services.focus.focusedElement == netErrorCard.prefResetButton) {
      await ContentTaskUtils.waitForEvent(
        netErrorCard.prefResetButton,
        "focus"
      );
    }

    Assert.ok(true, "prefResetButton has focus");

    EventUtils.synthesizeMouseAtCenter(
      netErrorCard.prefResetButton,
      {},
      content
    );
  });

  info("Waiting for the page to load after the click");
  await finalLoadComplete;

  resetPrefs();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

add_task(async function checkLearnMoreLink() {
  info("Load an unsupported TLS page and check for a learn more link");

  // Set ourselves up for TLS error
  Services.prefs.setIntPref("security.tls.version.min", 3);
  Services.prefs.setIntPref("security.tls.version.max", 4);

  await resetTelemetry();

  let browser;
  let pageLoaded;
  await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, TLS10_PAGE);
      browser = gBrowser.selectedBrowser;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );

  info("Loading and waiting for the net error");
  await pageLoaded;

  await checkTelemetry(
    "SSL_ERROR_PROTOCOL_VERSION_ALERT",
    SSL_ERROR_PROTOCOL_VERSION_ALERT
  );

  const baseURL = Services.urlFormatter.formatURLPref("app.support.baseURL");

  await SpecialPowers.spawn(browser, [baseURL], async function (_baseURL) {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    const netErrorCard = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector("net-error-card")?.wrappedJSObject
    );
    netErrorCard.advancedButton.scrollIntoView(true);
    EventUtils.synthesizeMouseAtCenter(
      netErrorCard.advancedButton,
      {},
      content
    );
    const tlsVersionNotice = await ContentTaskUtils.waitForCondition(
      () => netErrorCard.tlsNotice
    );
    ok(
      ContentTaskUtils.isVisible(tlsVersionNotice),
      "TLS version notice is visible"
    );

    const learnMoreLink = netErrorCard.learnMoreLink;
    ok(ContentTaskUtils.isVisible(learnMoreLink), "Learn More link is visible");
    is(learnMoreLink.getAttribute("href"), _baseURL + "connection-not-secure");

    const titleEl = netErrorCard.certErrorBodyTitle;
    const actualDataL10nID = titleEl.getAttribute("data-l10n-id");
    is(
      actualDataL10nID,
      "nssFailure2-title",
      "Correct error page title is set"
    );

    const errorCodeEl = netErrorCard.netErrorIntro.children[0];
    is(
      errorCodeEl.getAttribute("data-l10n-id"),
      "cert-error-ssl-connection-error",
      "Correct error code is set"
    );
  });

  resetPrefs();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// When a user tries going to a host without a suffix
// and the term doesn't match a host and we are able to suggest a
// valid correction, the page should show the correction.
// e.g. http://example/example2 -> https://www.example.com/example2
add_task(async function checkDomainCorrectionReplacesLearnMoreLink() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.fixup.alternate.enabled", false]],
  });
  lazy.gDNSOverride.addIPOverride("www.example.com", "::1");

  info("Try loading a URI that should result in an error page");
  BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example/example2/",
    false
  );

  info("Loading and waiting for the net error");
  let browser = gBrowser.selectedBrowser;
  let pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
  await pageLoaded;

  const baseURL = Services.urlFormatter.formatURLPref("app.support.baseURL");

  await SpecialPowers.spawn(browser, [baseURL], async function (_baseURL) {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    const netErrorCard = await ContentTaskUtils.waitForCondition(
      () => doc.querySelector("net-error-card")?.wrappedJSObject
    );
    const errorNotice =
      netErrorCard.netErrorIntro ?? netErrorCard.certErrorIntro;
    ok(ContentTaskUtils.isVisible(errorNotice), "Error text is visible");

    // Wait for the domain suggestion to be resolved and for the link href to be updated
    let link;
    await ContentTaskUtils.waitForCondition(() => {
      link = netErrorCard.learnMoreLink ?? netErrorCard.netErrorLearnMoreLink;
      return (
        link &&
        link.textContent != "" &&
        link.getAttribute("href") === "https://www.example.com/example2/"
      );
    }, "Helper link has been set to corrected domain");

    is(
      link.getAttribute("href"),
      "https://www.example.com/example2/",
      "Link points to corrected domain instead of SUMO page"
    );
  });

  lazy.gDNSOverride.clearHostOverride("www.example.com");
  resetPrefs();
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// When a user tries to access a non-existent domain and no domain
// suggestion is available, the learn more link should point to the
// SUMO support page for DNS troubleshooting.
add_task(async function checkDnsNotFoundLearnMoreLink() {
  info("Load a non-existent domain and check the learn more link");

  BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://thisdomaindoesnotexist123456.test/",
    false
  );
  let browser = gBrowser.selectedBrowser;
  let pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
  await pageLoaded;

  const baseURL = Services.urlFormatter.formatURLPref("app.support.baseURL");

  await SpecialPowers.spawn(browser, [baseURL], async function (_baseURL) {
    const doc = content.document;

    const netErrorCard = await ContentTaskUtils.waitForCondition(
      () => doc.querySelector("net-error-card")?.wrappedJSObject
    );

    let learnMoreLink;
    await ContentTaskUtils.waitForCondition(() => {
      learnMoreLink =
        netErrorCard.learnMoreLink ?? netErrorCard.netErrorLearnMoreLink;
      return learnMoreLink && learnMoreLink.textContent != "";
    }, "Learn more link has been set");

    ok(ContentTaskUtils.isVisible(learnMoreLink), "Learn More link is visible");

    is(
      learnMoreLink.getAttribute("href"),
      _baseURL + "server-not-found-connection-problem",
      "Link points to SUMO DNS troubleshooting page"
    );
  });

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Test that ciphersuites that use 3DES (namely, TLS_RSA_WITH_3DES_EDE_CBC_SHA)
// can only be enabled when deprecated TLS is enabled.
add_task(async function onlyAllow3DESWithDeprecatedTLS() {
  await resetTelemetry();

  // By default, connecting to a server that only uses 3DES should fail.
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      BrowserTestUtils.startLoadingURIString(browser, TRIPLEDES_PAGE);
      await BrowserTestUtils.waitForErrorPage(browser);
    }
  );

  await checkTelemetry(
    "SSL_ERROR_NO_CYPHER_OVERLAP",
    SSL_ERROR_NO_CYPHER_OVERLAP
  );

  // Enabling deprecated TLS should also enable 3DES.
  Services.prefs.setBoolPref("security.tls.version.enable-deprecated", true);
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      BrowserTestUtils.startLoadingURIString(browser, TRIPLEDES_PAGE);
      await BrowserTestUtils.browserLoaded(browser, false, TRIPLEDES_PAGE);
    }
  );

  for (let feltPrivacy of [true, false]) {
    // 3DES can be disabled separately.
    Services.prefs.setBoolPref(DES_PREF, false);
    await SpecialPowers.pushPrefEnv({
      set: [["security.certerrors.felt-privacy-v1", feltPrivacy]],
    });

    await BrowserTestUtils.withNewTab(
      { gBrowser, url: "about:blank" },
      async browser => {
        BrowserTestUtils.startLoadingURIString(browser, TRIPLEDES_PAGE);
        await BrowserTestUtils.waitForErrorPage(browser);
        let prefWasReset = TestUtils.waitForPrefChange(DES_PREF);

        if (feltPrivacy) {
          await SpecialPowers.spawn(browser, [], async function () {
            const doc = content.document;
            const netErrorCard =
              doc.querySelector("net-error-card")?.wrappedJSObject;
            Assert.ok(netErrorCard, "netErrorCard is rendered.");

            netErrorCard.advancedButton.scrollIntoView();
            EventUtils.synthesizeMouseAtCenter(
              netErrorCard.advancedButton,
              {},
              content
            );
            await ContentTaskUtils.waitForCondition(
              () => ContentTaskUtils.isVisible(netErrorCard.advancedContainer),
              "Advanced container is visible"
            );

            const prefResetButton = netErrorCard.prefResetButton;
            Assert.ok(prefResetButton, "prefResetButton exists in the DOM.");
            netErrorCard.prefResetButton.scrollIntoView();
            await ContentTaskUtils.waitForCondition(
              () => ContentTaskUtils.isVisible(netErrorCard.prefResetButton),
              "Pref reset button is visible"
            );
            ok(
              ContentTaskUtils.isVisible(prefResetButton),
              "prefResetButton is visible"
            );

            prefResetButton.click();
          });
        } else {
          await SpecialPowers.spawn(browser, [], async function () {
            const doc = content.document;

            const prefResetButton = doc.getElementById("prefResetButton");
            Assert.ok(prefResetButton, "prefResetButton exists in the DOM.");

            await ContentTaskUtils.waitForCondition(
              () => ContentTaskUtils.isVisible(prefResetButton),
              "Pref reset button is visible"
            );
            ok(
              ContentTaskUtils.isVisible(prefResetButton),
              "prefResetButton is visible"
            );

            prefResetButton.click();
          });
        }

        await prefWasReset;
      }
    );
  }

  resetPrefs();
});
