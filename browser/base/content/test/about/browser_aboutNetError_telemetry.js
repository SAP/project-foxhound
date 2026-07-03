/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const NET_ERROR_PAGE = "https://does-not-exist.test";
const BAD_CERT = "https://expired.example.com/";

const VALID_CAPTIVE_PORTAL_STATES = [
  "unknown",
  "not_captive",
  "unlocked_portal",
  "locked_portal",
];

async function getGleanEvents(metric) {
  await Services.fog.testFlushAllChildren();
  return metric.testGetValue();
}

function assertNeterrorLoadEvent(
  event,
  { value = "dnsNotFound", is_frame = "false" } = {}
) {
  Assert.equal(event.extra.value, value, `value is ${value}`);
  Assert.equal(event.extra.is_frame, is_frame, `is_frame is ${is_frame}`);
  Assert.equal(
    event.extra.no_connectivity,
    "false",
    "no_connectivity is false"
  );
  Assert.ok(
    VALID_CAPTIVE_PORTAL_STATES.includes(event.extra.captive_portal_state),
    `captive_portal_state "${event.extra.captive_portal_state}" is a valid state`
  );
  Assert.equal(event.extra.trr_only, "false", "trr_only is false");
}

// -- Felt Privacy path (default) --

// Test: load_aboutneterror fires for a DNS error (top-level)
add_task(async function test_feltprivacy_neterror_load() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  let pageLoaded;
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, NET_ERROR_PAGE);
      let browser = gBrowser.selectedBrowser;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );
  await pageLoaded;

  let events = await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityUiNeterror.loadAboutneterror),
    "Waiting for load_aboutneterror Glean event"
  );

  Assert.equal(events.length, 1, "Exactly one load event recorded");
  assertNeterrorLoadEvent(events[0]);

  BrowserTestUtils.removeTab(tab);
});

// Test: load_aboutneterror fires with is_frame=true for iframe errors
add_task(async function test_feltprivacy_neterror_load_iframe() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  let tab = await openErrorPage(NET_ERROR_PAGE, true);

  let events = await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityUiNeterror.loadAboutneterror),
    "Waiting for load_aboutneterror Glean event in iframe"
  );

  Assert.equal(events.length, 1, "Exactly one load event recorded");
  assertNeterrorLoadEvent(events[0], { is_frame: "true" });

  BrowserTestUtils.removeTab(tab);
});

// Test: cert errors do NOT fire load_aboutneterror
add_task(async function test_feltprivacy_certerror_no_neterror() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  let tab = await openErrorPage(BAD_CERT, false);

  // Wait for the cert error telemetry to confirm the page fully loaded
  // and telemetry was processed, then verify no neterror event fired.
  await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityUiCerterror.loadAboutcerterror),
    "Waiting for cert error load event to confirm page loaded"
  );

  let events = Glean.securityUiNeterror.loadAboutneterror.testGetValue();
  Assert.equal(events, null, "No neterror event for cert errors");

  BrowserTestUtils.removeTab(tab);
});

// -- Legacy path (felt-privacy disabled) --

// Test: load_aboutneterror fires on the legacy path for a DNS error
add_task(async function test_legacy_neterror_load() {
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", false]],
  });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  let pageLoaded;
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, NET_ERROR_PAGE);
      let browser = gBrowser.selectedBrowser;
      pageLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );
  await pageLoaded;

  let events = await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityUiNeterror.loadAboutneterror),
    "Waiting for load_aboutneterror Glean event (legacy path)"
  );

  Assert.equal(events.length, 1, "Exactly one load event recorded");
  assertNeterrorLoadEvent(events[0]);

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

// Test: cert errors do NOT fire load_aboutneterror on the legacy path
add_task(async function test_legacy_certerror_no_neterror() {
  await SpecialPowers.pushPrefEnv({
    set: [["security.certerrors.felt-privacy-v1", false]],
  });
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  let tab = await openErrorPage(BAD_CERT, false);

  // Wait for the cert error telemetry to confirm the page fully loaded
  // and telemetry was processed, then verify no neterror event fired.
  await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityUiCerterror.loadAboutcerterror),
    "Waiting for cert error load event to confirm page loaded (legacy)"
  );

  let events = Glean.securityUiNeterror.loadAboutneterror.testGetValue();
  Assert.equal(events, null, "No neterror event for cert errors (legacy)");

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

// -- TRR-only mode (DoH warning page telemetry) --

function assertDohEventExtras(event, label) {
  Assert.equal(event.extra.value, "TRROnlyFailure", `${label}: value`);
  Assert.equal(event.extra.mode, "3", `${label}: mode`);
  Assert.equal(
    event.extra.provider_key,
    "mozilla.cloudflare-dns.com",
    `${label}: provider_key`
  );
  Assert.equal(
    event.extra.skip_reason,
    "TRR_UNKNOWN_CHANNEL_FAILURE",
    `${label}: skip_reason`
  );
}

// Test: DoH warning page telemetry for load and button clicks in TRR-only mode
add_task(async function test_trr_only_telemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  let browser = await loadTRRErrorPage();

  let loadEvents = await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityDohNeterror.loadDohwarning),
    "Waiting for DoH neterror load Glean event"
  );
  Assert.equal(loadEvents.length, 1, "Exactly one DoH load event");
  assertDohEventExtras(loadEvents[0], "load event");

  let tabOpenPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "about:preferences#privacy-doh"
  );

  await SpecialPowers.spawn(browser, [], async function () {
    const doc = content.document;

    const netErrorCard = doc.querySelector("net-error-card")?.wrappedJSObject;
    if (netErrorCard) {
      await netErrorCard.getUpdateComplete();
      const trrSettingsButton = await ContentTaskUtils.waitForCondition(
        () => netErrorCard.shadowRoot.getElementById("trrSettingsButton"),
        "Waiting for trrSettingsButton"
      );
      trrSettingsButton.click();

      const tryAgainButton = await ContentTaskUtils.waitForCondition(
        () => netErrorCard.tryAgainButton,
        "Waiting for tryAgainButton"
      );
      tryAgainButton.click();
    } else {
      let buttons = ["trrSettingsButton", "neterrorTryAgainButton"];
      for (let buttonId of buttons) {
        let button = await ContentTaskUtils.waitForCondition(
          () => doc.getElementById(buttonId),
          `Waiting for button ${buttonId}`
        );
        button.click();
      }
    }
  }).catch(e => {
    if (e.message && !e.message.includes("Actor 'SpecialPowers' destroyed")) {
      throw e;
    }
  });
  await tabOpenPromise;

  await BrowserTestUtils.waitForErrorPage(browser);

  Assert.equal(
    gBrowser.tabs.length,
    3,
    "Should open about:preferences#privacy-doh in another tab"
  );

  let settingsEvents = await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityDohNeterror.clickSettingsButton),
    "Waiting for DoH settings click Glean event"
  );
  Assert.equal(settingsEvents.length, 1, "Exactly one settings click event");
  assertDohEventExtras(settingsEvents[0], "settings click event");

  let tryAgainEvents = await TestUtils.waitForCondition(
    () => getGleanEvents(Glean.securityDohNeterror.clickTryAgainButton),
    "Waiting for DoH try-again click Glean event"
  );
  Assert.equal(tryAgainEvents.length, 1, "Exactly one try-again click event");
  assertDohEventExtras(tryAgainEvents[0], "try-again click event");

  BrowserTestUtils.removeTab(gBrowser.tabs[2]);
  BrowserTestUtils.removeTab(gBrowser.tabs[1]);
  resetTRRPrefs();
});
