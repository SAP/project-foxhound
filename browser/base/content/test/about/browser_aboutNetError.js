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
  "nsINativeDNSResolverOverride"
);

// This includes all the cipher suite prefs we have.
function resetPrefs() {
  Services.prefs.clearUserPref("security.tls.version.min");
  Services.prefs.clearUserPref("security.tls.version.max");
  Services.prefs.clearUserPref("security.tls.version.enable-deprecated");
  Services.prefs.clearUserPref("browser.fixup.alternate.enabled");
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
  Services.telemetry.setEventRecordingEnabled("security.ui.tlserror", true);
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

    const prefResetButton = doc.getElementById("prefResetButton");
    await ContentTaskUtils.waitForCondition(
      () => ContentTaskUtils.isVisible(prefResetButton),
      "prefResetButton is visible"
    );

    if (!Services.focus.focusedElement == prefResetButton) {
      await ContentTaskUtils.waitForEvent(prefResetButton, "focus");
    }

    Assert.ok(true, "prefResetButton has focus");

    prefResetButton.click();
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

  await SpecialPowers.spawn(browser, [baseURL], function (_baseURL) {
    const doc = content.document;
    ok(
      doc.documentURI.startsWith("about:neterror"),
      "Should be showing error page"
    );

    const tlsVersionNotice = doc.getElementById("tlsVersionNotice");
    ok(
      ContentTaskUtils.isVisible(tlsVersionNotice),
      "TLS version notice is visible"
    );

    const learnMoreLink = doc.getElementById("learnMoreLink");
    ok(ContentTaskUtils.isVisible(learnMoreLink), "Learn More link is visible");
    is(learnMoreLink.getAttribute("href"), _baseURL + "connection-not-secure");

    const titleEl = doc.querySelector(".title-text");
    const actualDataL10nID = titleEl.getAttribute("data-l10n-id");
    is(
      actualDataL10nID,
      "nssFailure2-title",
      "Correct error page title is set"
    );

    const errorCodeEl = doc.querySelector("#errorShortDesc2");
    const actualDataL10Args = errorCodeEl.getAttribute("data-l10n-args");
    ok(
      actualDataL10Args.includes("SSL_ERROR_PROTOCOL_VERSION_ALERT"),
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
add_task(async function checkDomainCorrection() {
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

    const errorNotice = doc.getElementById("errorShortDesc");
    ok(ContentTaskUtils.isVisible(errorNotice), "Error text is visible");

    // Wait for the domain suggestion to be resolved and for the text to update
    let link;
    await ContentTaskUtils.waitForCondition(() => {
      link = errorNotice.querySelector("a");
      return link && link.textContent != "";
    }, "Helper link has been set");

    is(
      link.getAttribute("href"),
      "https://www.example.com/example2/",
      "Link was corrected"
    );

    const actualDataL10nID = link.getAttribute("data-l10n-name");
    is(actualDataL10nID, "website", "Correct name is set");
  });

  lazy.gDNSOverride.clearHostOverride("www.example.com");
  resetPrefs();
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

  // 3DES can be disabled separately.
  Services.prefs.setBoolPref(
    "security.ssl3.deprecated.rsa_des_ede3_sha",
    false
  );
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      BrowserTestUtils.startLoadingURIString(browser, TRIPLEDES_PAGE);
      await BrowserTestUtils.waitForErrorPage(browser);
    }
  );

  resetPrefs();
});
