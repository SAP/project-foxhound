/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

const ANTIFRAUD_DOMAIN = "https://anti-fraud.example.org/";
const ANTIFRAUD_IMAGE = ANTIFRAUD_DOMAIN + TEST_PATH + "raptor.jpg";
const ANTIFRAUD_PAGE = ANTIFRAUD_DOMAIN + TEST_PATH + "page.html";
const CONSENTMANAGER_DOMAIN = "https://consent-manager.example.org/";
const CONSENTMANAGER_IMAGE = CONSENTMANAGER_DOMAIN + TEST_PATH + "raptor.jpg";
const CONSENTMANAGER_PAGE = CONSENTMANAGER_DOMAIN + TEST_PATH + "page.html";

function captureFlagsForRequest(expectedURLPrePath) {
  let flags = null;
  let observer = subject => {
    let httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
    if (!httpChannel.URI.spec.startsWith(expectedURLPrePath)) {
      return;
    }
    flags = subject.QueryInterface(Ci.nsIClassifiedChannel).classificationFlags;
  };
  Services.obs.addObserver(observer, "http-on-stop-request");
  return {
    get() {
      return flags;
    },
    cleanup() {
      try {
        Services.obs.removeObserver(observer, "http-on-stop-request");
      } catch (e) {
        // already removed
      }
    },
  };
}

add_setup(async function () {
  await UrlClassifierTestUtils.addTestTrackers();

  registerCleanupFunction(function () {
    UrlClassifierTestUtils.cleanupTestTrackers();
  });

  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "urlclassifier.features.antifraud.annotate.blocklistTables",
        "mochitest7-track-simple",
      ],
      [
        "urlclassifier.features.consentmanager.annotate.blocklistTables",
        "mochitest6-track-simple",
      ],

      // ConsentManager and AntiFraud annotation features both require ETP to
      // be enabled. We rely on the skip prefs (set below) to prevent actual
      // blocking by tracking protection so we can observe the annotation flag.
      ["privacy.trackingprotection.enabled", true],
      // AntiFraud annotation also requires fingerprinting protection to be on.
      ["privacy.trackingprotection.fingerprinting.enabled", true],
      ["privacy.trackingprotection.cryptomining.enabled", false],
      ["privacy.trackingprotection.emailtracking.enabled", false],
      ["privacy.trackingprotection.socialtracking.enabled", false],
      ["privacy.trackingprotection.annotate_channels", true],
      ["privacy.trackingprotection.antifraud.annotate_channels", true],
      ["privacy.trackingprotection.consentmanager.annotate_channels", true],

      ["privacy.trackingprotection.antifraud.skip.enabled", true],
      ["privacy.trackingprotection.antifraud.skip.pbmode.enabled", true],
      ["privacy.trackingprotection.consentmanager.skip.enabled", true],
      ["privacy.trackingprotection.consentmanager.skip.pbmode.enabled", true],
    ],
  });
});

add_task(async function test_antifraud_first_party_no_annotation() {
  // Top-level navigation to the AntiFraud-listed domain, then load a
  // same-origin subresource. Because part 3 short-circuits MaybeCreate when
  // the request is not third-party-to-top, no AntiFraud feature should be
  // attached to the channel and the flag must NOT be set.
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    ANTIFRAUD_PAGE
  );
  let capture = captureFlagsForRequest(ANTIFRAUD_IMAGE);
  let loaded = await loadImage(tab.linkedBrowser, ANTIFRAUD_IMAGE);
  ok(loaded, "First-party AntiFraud image loads");
  isnot(capture.get(), null, "Captured flags for first-party request");
  is(
    capture.get() & Ci.nsIClassifiedChannel.CLASSIFIED_ANTIFRAUD,
    0,
    "First-party request is NOT classified as AntiFraud"
  );
  capture.cleanup();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_antifraud_third_party_annotation() {
  // Same image, but loaded as a third-party subresource. The AntiFraud
  // annotation flag must be set.
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  let capture = captureFlagsForRequest(ANTIFRAUD_IMAGE);
  let loaded = await loadImage(tab.linkedBrowser, ANTIFRAUD_IMAGE);
  ok(loaded, "Third-party AntiFraud image loads (skip pref enabled)");
  isnot(capture.get(), null, "Captured flags for third-party request");
  ok(
    capture.get() & Ci.nsIClassifiedChannel.CLASSIFIED_ANTIFRAUD,
    "Third-party request IS classified as AntiFraud"
  );
  capture.cleanup();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_consentmanager_first_party_no_annotation() {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    CONSENTMANAGER_PAGE
  );
  let capture = captureFlagsForRequest(CONSENTMANAGER_IMAGE);
  let loaded = await loadImage(tab.linkedBrowser, CONSENTMANAGER_IMAGE);
  ok(loaded, "First-party ConsentManager image loads");
  isnot(capture.get(), null, "Captured flags for first-party request");
  is(
    capture.get() & Ci.nsIClassifiedChannel.CLASSIFIED_CONSENTMANAGER,
    0,
    "First-party request is NOT classified as ConsentManager"
  );
  capture.cleanup();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_consentmanager_third_party_annotation() {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PAGE);
  let capture = captureFlagsForRequest(CONSENTMANAGER_IMAGE);
  let loaded = await loadImage(tab.linkedBrowser, CONSENTMANAGER_IMAGE);
  ok(loaded, "Third-party ConsentManager image loads (skip pref enabled)");
  isnot(capture.get(), null, "Captured flags for third-party request");
  ok(
    capture.get() & Ci.nsIClassifiedChannel.CLASSIFIED_CONSENTMANAGER,
    "Third-party request IS classified as ConsentManager"
  );
  capture.cleanup();
  await BrowserTestUtils.removeTab(tab);
});
