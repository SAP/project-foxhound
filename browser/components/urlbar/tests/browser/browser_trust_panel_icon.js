/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test TrustPanel Breach Icon logic.
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  BrowserTestUtils: "resource://testing-common/BrowserTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

const TEST_BREACH = {
  // Make sure the breach is a recent one, since breaches older than a year are not taken into account:
  AddedDate: Temporal.Now.plainDateTimeISO().toString(),
  BreachDate: Temporal.Now.plainDateISO().toString(),
  Domain: "example.org",
  Name: "TestBreach",
  PwnCount: 42,
  DataClasses: ["Email addresses", "Passwords"],
  _status: "synced",
  id: "047940fe-d2fd-4314-b636-b4a952ee1234",
  last_modified: "1541615610052",
  schema: "1541615609018",
};

add_setup(async function setup() {
  const db = RemoteSettings("fxmonitor-breaches").db;
  await db.clear();
  await db.create(TEST_BREACH, { useRecordId: true });
  await db.importChanges({}, Date.now());

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.trustPanel.featureGate", true],
      ["browser.urlbar.trustPanel.breachAlerts", true],
    ],
  });

  // Wait a tick to ensure any initial about:blank background fetches
  // complete BEFORE we reset the cache.
  /* eslint-disable mozilla/no-arbitrary-setTimeout */
  await new Promise(r => setTimeout(r, 500));

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await db.clear();
    await db.importChanges({}, Date.now());
  });
});

function trustIconContainer() {
  return document.getElementById("trust-icon-container");
}

async function waitForTrustIconClass(className, message) {
  await BrowserTestUtils.waitForCondition(
    () => trustIconContainer()?.classList.contains(className),
    message,
    100,
    100
  );
}

async function waitForTrustIconWithoutClass(className, message) {
  await BrowserTestUtils.waitForCondition(
    () => !trustIconContainer()?.classList.contains(className),
    message,
    100,
    100
  );
}

add_task(async function test_breached_urlbar_icon_animation_logic() {
  let tab1;
  let tab2;
  let tab3;

  try {
    info("1. Visit breached site in first tab");

    tab1 = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: "https://example.org",
      waitForLoad: true,
    });

    await waitForTrustIconClass("breached", "Waiting for breached class");

    Assert.ok(
      trustIconContainer().classList.contains("breached"),
      "The trust icon has the breached class"
    );

    await waitForTrustIconClass(
      "breach-animating",
      "Waiting for breach animation"
    );

    Assert.ok(
      trustIconContainer().classList.contains("breach-animating"),
      "Should have breach-animating class on first visit"
    );

    info("2. Open a second, safe tab");

    tab2 = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: "about:blank",
      waitForLoad: true,
    });

    await waitForTrustIconWithoutClass(
      "breached",
      "Waiting for no breached class"
    );

    Assert.ok(
      !trustIconContainer().classList.contains("breached"),
      "Icon should not be breached on blank page"
    );

    info("3. Switch back to the first tab");

    await BrowserTestUtils.switchTab(gBrowser, tab1);

    await waitForTrustIconClass(
      "breached",
      "Waiting for breached after tab switch"
    );

    Assert.ok(
      trustIconContainer().classList.contains("breached"),
      "The trust icon should be breached again after switching back"
    );

    await waitForTrustIconWithoutClass(
      "breach-animating",
      "Waiting for no animation on tab switch"
    );

    Assert.ok(
      !trustIconContainer().classList.contains("breach-animating"),
      "Should NOT animate on tab switch back"
    );

    info("4. Visit a DIFFERENT breached site");

    const db = RemoteSettings("fxmonitor-breaches").db;
    await db.create(
      {
        ...TEST_BREACH,
        id: "different-guid",
        Domain: "example.com",
      },
      { useRecordId: true }
    );
    await db.importChanges({}, Date.now());

    tab3 = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: "https://example.com",
      waitForLoad: true,
    });

    await waitForTrustIconClass(
      "breached",
      "Waiting for breached on second domain"
    );

    Assert.ok(
      trustIconContainer().classList.contains("breached"),
      "The trust icon should be breached for the second site"
    );

    await waitForTrustIconClass("breach-animating", "Waiting for re-animation");

    Assert.ok(
      trustIconContainer().classList.contains("breach-animating"),
      "Should re-animate on new breached domain"
    );
  } finally {
    for (let tab of [tab3, tab2, tab1]) {
      if (tab && !tab.closing) {
        await BrowserTestUtils.removeTab(tab);
      }
    }
  }
});
