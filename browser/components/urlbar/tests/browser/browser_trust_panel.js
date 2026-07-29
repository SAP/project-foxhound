/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test TrustPanel.
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  BreachAlertStorage: "resource://gre/modules/BreachAlertStore.sys.mjs",
  ContentBlockingAllowList:
    "resource://gre/modules/ContentBlockingAllowList.sys.mjs",
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  SiteDataTestUtils: "resource://testing-common/SiteDataTestUtils.sys.mjs",
  UIState: "resource://services-sync/UIState.sys.mjs",
});

const { FX_MONITOR_OAUTH_CLIENT_ID: monitorClientId } =
  ChromeUtils.importESModule("resource://gre/modules/FxAccountsCommon.sys.mjs");

ChromeUtils.defineLazyGetter(this, "fxAccounts", () => {
  return ChromeUtils.importESModule(
    "resource://gre/modules/FxAccounts.sys.mjs"
  ).getFxAccountsSingleton();
});

const TRACKING_PAGE =
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://tracking.example.org/browser/browser/base/content/test/protectionsUI/trackingPage.html";

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

const ETP_ACTIVE_ICON = 'url("chrome://browser/skin/trust-icon-active.svg")';
const ETP_DISABLED_ICON =
  'url("chrome://browser/skin/trust-icon-disabled.svg")';
const INSECURE_ICON = 'url("chrome://browser/skin/trust-icon-insecure.svg")';
const TEST_ORIGIN = "https://example.com";

add_setup(async function setup() {
  const db = RemoteSettings("fxmonitor-breaches").db;
  await db.clear();
  await db.create(TEST_BREACH, { useRecordId: true });
  await db.importChanges({}, Date.now());
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.trustPanel.breachAlerts", true],
      // Hover previews can block opening the trustpanel.
      ["browser.tabs.hoverPreview.enabled", false],
    ],
  });
  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await db.clear();
    await db.importChanges({}, Date.now());
    const storage = new BreachAlertStorage();
    await storage.initialize();
    await storage.clearAllBreachAlertDismissals();
  });
});

let urlbarBtn = win => win.document.getElementById("trust-icon");
let urlbarLabel = win => win.document.getElementById("trust-label");
let urlbarIcon = win =>
  gBrowser.documentGlobal
    .getComputedStyle(urlbarBtn(win))
    .getPropertyValue("list-style-image");

async function toggleETP(tab) {
  let popupShown = BrowserTestUtils.waitForEvent(window.document, "popupshown");
  EventUtils.synthesizeMouseAtCenter(urlbarBtn(window), {}, window);
  await popupShown;

  let waitForReload = BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  EventUtils.synthesizeMouseAtCenter(
    window.document.getElementById("trustpanel-toggle"),
    {},
    window
  );
  await waitForReload;
}

add_task(async function basic_test() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.com",
    waitForLoad: true,
  });

  await BrowserTestUtils.waitForCondition(() => urlbarIcon(window) != "none");

  Assert.equal(urlbarIcon(window), ETP_ACTIVE_ICON, "Showing trusted icon");
  Assert.equal(
    window.document
      .getElementById("trust-icon-container")
      .getAttribute("tooltiptext"),
    "Verified by: Mozilla Testing",
    "Tooltip has been set"
  );

  Assert.ok(
    !BrowserTestUtils.isVisible(urlbarLabel(window)),
    "Not showing Not Secure label"
  );

  await toggleETP(tab);
  Assert.equal(
    urlbarIcon(window),
    ETP_DISABLED_ICON,
    "Showing ETP disabled icon"
  );

  await toggleETP(tab);
  Assert.equal(urlbarIcon(window), ETP_ACTIVE_ICON, "Showing trusted icon");

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_notsecure_label() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    opening: "http://example.com",
    waitForLoad: true,
  });

  await BrowserTestUtils.waitForCondition(() => urlbarIcon(window) != "none");

  Assert.ok(
    BrowserTestUtils.isVisible(urlbarLabel(window)),
    "Showing Not Secure label"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_blob_secure() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.com",
    waitForLoad: true,
  });

  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    let blob = new Blob(["<h2>hey!</h2>"], { type: "text/html" });
    content.document.location = URL.createObjectURL(blob);
  });

  Assert.ok(
    !BrowserTestUtils.isVisible(urlbarLabel(window)),
    "Not showing Not Secure label"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_notsecure_label_without_tracking() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    opening: "http://example.com",
    waitForLoad: true,
  });

  await BrowserTestUtils.waitForCondition(() => urlbarIcon(window) != "none");
  await toggleETP(tab);

  Assert.ok(
    BrowserTestUtils.isVisible(urlbarLabel(window)),
    "Showing Not Secure label"
  );

  await toggleETP(tab);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_drag_and_drop() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.com",
    waitForLoad: true,
  });

  info("Start DnD");
  let trustIcon = document.getElementById("trust-icon");
  let newtabButton = document.getElementById("tabs-newtab-button");
  await BrowserTestUtils.waitForCondition(() =>
    BrowserTestUtils.isVisible(trustIcon)
  );

  let newTabOpened = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "https://example.com/",
    true
  );

  await EventUtils.synthesizePlainDragAndDrop({
    srcElement: trustIcon,
    destElement: newtabButton,
  });

  let tabByDnD = await newTabOpened;
  Assert.ok(tabByDnD, "DnD works from trust icon correctly");

  await BrowserTestUtils.removeTab(tabByDnD);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_update() {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "urlclassifier.features.cryptomining.blacklistHosts",
        "cryptomining.example.com",
      ],
      [
        "urlclassifier.features.cryptomining.annotate.blacklistHosts",
        "cryptomining.example.com",
      ],
      [
        "urlclassifier.features.fingerprinting.blacklistHosts",
        "fingerprinting.example.com",
      ],
      [
        "urlclassifier.features.fingerprinting.annotate.blacklistHosts",
        "fingerprinting.example.com",
      ],
    ],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TRACKING_PAGE,
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  let blockerSection = document.getElementById(
    "trustpanel-blocker-section-header"
  );
  Assert.equal(
    0,
    parseInt(blockerSection.textContent, 10),
    "Initially not blocked any trackers"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], function () {
    content.postMessage("cryptomining", "*");
  });

  await BrowserTestUtils.waitForCondition(
    () => parseInt(blockerSection.textContent, 10) == 1,
    "Updated to show new cryptominer blocked"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], function () {
    content.postMessage("fingerprinting", "*");
  });

  await BrowserTestUtils.waitForCondition(
    () => parseInt(blockerSection.textContent, 10) == 2,
    "Updated to show new fingerprinter blocked"
  );

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_etld() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://www.example.com",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  Assert.equal(
    window.document.getElementById("trustpanel-popup-host").value,
    "example.com",
    "Showing the eTLD+1"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_privacy_link() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://www.example.com",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  let popupHidden = BrowserTestUtils.waitForEvent(
    window.document,
    "popuphidden"
  );

  let newTabPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    "about:preferences#privacy",
    true
  );

  let privacyButton = window.document.getElementById("trustpanel-privacy-link");
  EventUtils.synthesizeMouseAtCenter(privacyButton, {}, window);
  let newTab = await newTabPromise;
  await popupHidden;

  Assert.ok(true, "Popup was hidden");

  await BrowserTestUtils.removeTab(newTab);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_about() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "about:config",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);
  Assert.ok(true, "The panel can be opened.");

  Assert.ok(
    window.document.getElementById("trustpanel-toggle").disabled,
    "Tracking protection toggle is disabled when not applicable"
  );

  Assert.ok(
    window.document.getElementById("trustpanel-clear-cookies-button").disabled,
    "Clear cookies button is disabled when not applicable"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_breach_alert_panel() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    false,
    "The breach alert section is visible for a breached site"
  );

  Assert.equal(
    breachAlertSection.localName,
    "breach-alert-panel",
    "The breach alert section element is a <breach-alert-panel>"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.equal(
    graphicSection.hidden,
    true,
    "The regular graphic section is hidden when showing the breach alert"
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_breach_alert_check_button_glean() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  Assert.equal(
    Glean.trustpanel.breachAlertDiscoveredMonitor.testGetValue(),
    null,
    "No breachAlertDiscoveredMonitor event recorded yet"
  );

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );

  // The breach-alert-panel renders its content in a shadow root via Lit.
  // Wait for the shadow root and the "Check Mozilla Monitor" button to appear.
  await BrowserTestUtils.waitForCondition(
    () =>
      breachAlertSection.shadowRoot?.querySelector("moz-button[type=primary]"),
    "The Check Monitor button should appear in the breach-alert-panel shadow root"
  );

  const checkButton = breachAlertSection.shadowRoot.querySelector(
    "moz-button[type=primary]"
  );

  // Stub switchToTabHavingURI on the browser window so that clicking the
  // "Check Mozilla Monitor" button does not attempt to connect to monitor.mozilla.org,
  // which would crash the test due to the non-local address restriction.
  const sandbox = sinon.createSandbox();
  try {
    sandbox.stub(window, "switchToTabHavingURI");

    checkButton.click();

    await Services.fog.testFlushAllChildren();

    const events = Glean.trustpanel.breachAlertDiscoveredMonitor.testGetValue();
    Assert.ok(
      Array.isArray(events) && events.length === 1,
      "The breachAlertDiscoveredMonitor Glean event was recorded once after clicking the Check Monitor button"
    );
    Assert.equal(
      events[0].category,
      "trustpanel",
      "The Glean event for clicking the Check Monitor button is of the `trustpanel` category"
    );
    Assert.equal(
      events[0].name,
      "breach_alert_discovered_monitor",
      "The Glean event for clicking the Check Monitor button is `breach_alert_discovered_monitor`"
    );
  } finally {
    sandbox.restore();
  }

  await BrowserTestUtils.removeTab(tab);

  const storage = new BreachAlertStorage();
  await storage.initialize();
  await storage.clearAllBreachAlertDismissals();
});

add_task(async function test_breach_alert_check_button_utm() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );

  // The breach-alert-panel renders its content in a shadow root via Lit.
  // Wait for the shadow root and the "Check Mozilla Monitor" button to appear.
  await BrowserTestUtils.waitForCondition(
    () =>
      breachAlertSection.shadowRoot?.querySelector("moz-button[type=primary]"),
    "The Check Monitor button should appear in the breach-alert-panel shadow root"
  );

  const checkButton = breachAlertSection.shadowRoot.querySelector(
    "moz-button[type=primary]"
  );

  // Stub switchToTabHavingURI so we can inspect the URL it is called with
  // without actually navigating to monitor.mozilla.org.
  const sandbox = sinon.createSandbox();
  try {
    const switchStub = sandbox.stub(window, "switchToTabHavingURI");

    checkButton.click();

    Assert.ok(
      switchStub.calledOnce,
      "switchToTabHavingURI was called once after clicking the Check Monitor button"
    );

    const calledUrl = switchStub.firstCall.args[0];
    const parsedUrl = new URL(calledUrl);

    Assert.equal(
      parsedUrl.searchParams.get("utm_medium"),
      "referral",
      "utm_medium is 'referral'"
    );
    Assert.equal(
      parsedUrl.searchParams.get("utm_source"),
      "firefox-desktop",
      "utm_source is 'firefox-desktop'"
    );
    Assert.equal(
      parsedUrl.searchParams.get("utm_campaign"),
      "privacy-panel",
      "utm_campaign is 'privacy-panel'"
    );
    Assert.equal(
      parsedUrl.searchParams.get("utm_content"),
      "sign-up-global",
      "utm_content is 'sign-up-global'"
    );
  } finally {
    sandbox.restore();
  }

  await BrowserTestUtils.removeTab(tab);

  const storage = new BreachAlertStorage();
  await storage.initialize();
  await storage.clearAllBreachAlertDismissals();
});

add_task(async function test_breach_dismissal_via_dismiss_button() {
  const undismissedBreach = {
    ...TEST_BREACH,
    Name: "UndismissedBreachForDismissalViaDismissButton",
  };

  const db = RemoteSettings("fxmonitor-breaches").db;
  let tab;

  try {
    await db.clear();
    await db.create(undismissedBreach, { useRecordId: true });
    await db.importChanges({}, Date.now());
    tab = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: "https://example.org",
      waitForLoad: true,
    });

    await UrlbarTestUtils.openTrustPanel(window);

    const breachAlertSection = window.document.getElementById(
      "trustpanel-breach-alert-section"
    );

    await BrowserTestUtils.waitForCondition(
      () => breachAlertSection.hidden === false,
      "The breach alert section should be visible before dismissal"
    );

    const dismissButton = breachAlertSection.shadowRoot.querySelector(
      "moz-button:not([type=primary])"
    );

    dismissButton.click();

    await BrowserTestUtils.waitForCondition(
      () => breachAlertSection.hidden === true,
      "The breach alert section should be hidden after dismissal"
    );

    Assert.strictEqual(
      breachAlertSection.hidden,
      true,
      "The breach alert section is hidden after being dismissed"
    );

    const graphicSection = window.document.getElementById(
      "trustpanel-graphic-section"
    );

    await BrowserTestUtils.waitForCondition(
      () => graphicSection.hidden === false,
      "The graphic section should be visible after dismissal"
    );

    Assert.equal(
      graphicSection.hidden,
      false,
      "The regular graphic section is shown again after dismissing the breach alert"
    );
  } finally {
    if (tab) {
      await BrowserTestUtils.removeTab(tab);
    }

    await db.clear();
    await db.create(TEST_BREACH, { useRecordId: true });
    await db.importChanges({}, Date.now());
  }
});

add_task(async function test_breach_dismissal_via_check_button() {
  const undismissedBreach = {
    ...TEST_BREACH,
    Name: "UndismissedBreachForDismissalViaCheckButton",
  };

  const db = RemoteSettings("fxmonitor-breaches").db;
  let tab;

  try {
    await db.clear();
    await db.create(undismissedBreach, { useRecordId: true });
    await db.importChanges({}, Date.now());
    tab = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: "https://example.org",
      waitForLoad: true,
    });

    await UrlbarTestUtils.openTrustPanel(window);

    const breachAlertSection = window.document.getElementById(
      "trustpanel-breach-alert-section"
    );

    await BrowserTestUtils.waitForCondition(
      () => breachAlertSection.hidden === false,
      "The breach alert section should be visible before dismissal"
    );

    const checkButton = breachAlertSection.shadowRoot.querySelector(
      "moz-button[type=primary]"
    );

    // Stub switchToTabHavingURI on the browser window so that clicking the
    // "Check Mozilla Monitor" button does not attempt to connect to monitor.mozilla.org,
    // which would crash the test due to the non-local address restriction.
    const sandbox = sinon.createSandbox();
    try {
      sandbox.stub(window, "switchToTabHavingURI");

      checkButton.click();

      await BrowserTestUtils.waitForCondition(
        () => breachAlertSection.hidden === true,
        "The breach alert section should be hidden after dismissal"
      );

      Assert.strictEqual(
        breachAlertSection.hidden,
        true,
        "The breach alert section is hidden after being dismissed"
      );

      const graphicSection = window.document.getElementById(
        "trustpanel-graphic-section"
      );

      await BrowserTestUtils.waitForCondition(
        () => graphicSection.hidden === false,
        "The graphic section should be visible after dismissal"
      );

      Assert.equal(
        graphicSection.hidden,
        false,
        "The regular graphic section is shown again after dismissing the breach alert"
      );
    } finally {
      sandbox.restore();
    }
  } finally {
    if (tab) {
      await BrowserTestUtils.removeTab(tab);
    }

    await db.clear();
    await db.create(TEST_BREACH, { useRecordId: true });
    await db.importChanges({}, Date.now());
  }
});

add_task(async function test_dismiss_button_glean() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  Assert.equal(
    Glean.trustpanel.breachAlertDismissed.testGetValue(),
    null,
    "No breachAlertDismissed event recorded yet"
  );

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );

  // The breach-alert-panel renders its content in a shadow root via Lit.
  // Wait for the shadow root and the "Check Mozilla Monitor" button to appear.
  await BrowserTestUtils.waitForCondition(
    () =>
      breachAlertSection.shadowRoot?.querySelector(
        "moz-button:not([type=primary])"
      ),
    "The Dismiss button should appear in the breach-alert-panel shadow root"
  );

  const dismissButton = breachAlertSection.shadowRoot.querySelector(
    "moz-button:not([type=primary])"
  );

  dismissButton.click();

  await Services.fog.testFlushAllChildren();

  const events = Glean.trustpanel.breachAlertDismissed.testGetValue();
  Assert.ok(
    Array.isArray(events) && events.length === 1,
    "The breachAlertDismissed Glean event was recorded once after clicking the Dismiss button"
  );
  Assert.equal(
    events[0].category,
    "trustpanel",
    "The Glean event for clicking the Dismiss button is of the `trustpanel` category"
  );
  Assert.equal(
    events[0].name,
    "breach_alert_dismissed",
    "The Glean event for clicking the Dismiss button is `breach_alert_dismissed"
  );

  await BrowserTestUtils.removeTab(tab);

  const storage = new BreachAlertStorage();
  await storage.initialize();
  await storage.clearAllBreachAlertDismissals();
});

add_task(async function test_no_breach_alert_panel_with_pref_off() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.trustPanel.breachAlerts", false]],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    true,
    "The breach alert section is hidden even for a breached site, since the pref is off"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.equal(
    graphicSection.hidden,
    false,
    "The regular graphic section is shown, even on a breached site, since the breach alert pref is off"
  );

  await BrowserTestUtils.removeTab(tab);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.trustPanel.breachAlerts", true]],
  });
});

add_task(async function test_regular_header_with_monitor_account() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(UIState, "get").returns({
    status: UIState.STATUS_SIGNED_IN,
    email: "test@example.com",
  });

  sandbox.stub(fxAccounts, "listAttachedOAuthClients").resolves([
    {
      id: monitorClientId,
      name: "Firefox Monitor",
    },
  ]);

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    true,
    "The breach alert section is hidden for users with Monitor accounts"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.strictEqual(
    graphicSection.hidden,
    false,
    "The regular graphic section is shown for users with Monitor accounts"
  );

  sandbox.restore();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_breach_alert_without_valid_fxa_account() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(UIState, "get").returns({
    status: UIState.STATUS_NOT_VERIFIED,
    email: "test@example.com",
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    false,
    "The breach alert section is shown for users without valid FxA accounts"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.strictEqual(
    graphicSection.hidden,
    true,
    "The regular graphic section is hidden for users without valid FxA accounts"
  );

  sandbox.restore();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_breach_alert_without_monitor_account() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(UIState, "get").returns({
    status: UIState.STATUS_SIGNED_IN,
    email: "test@example.com",
  });

  sandbox.stub(fxAccounts, "listAttachedOAuthClients").resolves([]);

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    false,
    "The breach alert section is shown for users with FxA accounts without Monitor"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.strictEqual(
    graphicSection.hidden,
    true,
    "The regular graphic section is hidden for users with FxA accounts without Monitor"
  );

  sandbox.restore();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_breach_alert_visible_without_stored_passwords() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(UIState, "get").returns({
    status: UIState.STATUS_NOT_CONFIGURED,
  });

  const originalLogins = Services.logins;
  Services.logins = {
    countLoginsAsync: sandbox.stub().resolves(0),
  };

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    false,
    "The breach alert section is shown for users without stored passwords"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.strictEqual(
    graphicSection.hidden,
    true,
    "The regular graphic section is hidden when breach alert is shown"
  );

  Services.logins = originalLogins;
  sandbox.restore();
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_breach_alert_hidden_with_stored_passwords() {
  const sandbox = sinon.createSandbox();
  sandbox.stub(UIState, "get").returns({
    status: UIState.STATUS_NOT_CONFIGURED,
  });

  const originalLogins = Services.logins;
  Services.logins = {
    countLoginsAsync: sandbox.stub().resolves(42),
  };

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.org",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const breachAlertSection = window.document.getElementById(
    "trustpanel-breach-alert-section"
  );
  Assert.strictEqual(
    breachAlertSection.hidden,
    true,
    "The breach alert section is hidden for users with stored passwords"
  );

  const graphicSection = window.document.getElementById(
    "trustpanel-graphic-section"
  );
  Assert.strictEqual(
    graphicSection.hidden,
    false,
    "The regular graphic section is shown when breach alert is hidden"
  );

  Services.logins = originalLogins;
  sandbox.restore();
  await BrowserTestUtils.removeTab(tab);
});

add_task(
  async function test_breach_alert_hidden_with_both_monitor_and_passwords() {
    const sandbox = sinon.createSandbox();
    sandbox.stub(UIState, "get").returns({
      status: UIState.STATUS_SIGNED_IN,
      email: "test@example.com",
    });

    sandbox
      .stub(fxAccounts, "listAttachedOAuthClients")
      .resolves([{ id: monitorClientId }]);

    const originalLogins = Services.logins;
    Services.logins = {
      countLoginsAsync: sandbox.stub().resolves(42),
    };

    const tab = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      opening: "https://example.org",
      waitForLoad: true,
    });

    await UrlbarTestUtils.openTrustPanel(window);

    const breachAlertSection = window.document.getElementById(
      "trustpanel-breach-alert-section"
    );
    Assert.strictEqual(
      breachAlertSection.hidden,
      true,
      "The breach alert section is hidden for users with both Monitor account and stored passwords"
    );

    const graphicSection = window.document.getElementById(
      "trustpanel-graphic-section"
    );
    Assert.strictEqual(
      graphicSection.hidden,
      false,
      "The regular graphic section is shown when breach alert is hidden"
    );

    Services.logins = originalLogins;
    sandbox.restore();
    await BrowserTestUtils.removeTab(tab);
  }
);

add_task(async function insecure_and_etp_disabled_test() {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    opening: "http://example.com",
    waitForLoad: true,
  });

  await toggleETP(tab);
  Assert.equal(urlbarIcon(window), INSECURE_ICON, "Showing url insecure icon");

  await toggleETP(tab);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function clear_cookie_test() {
  let clearCookieBtn = window.document.getElementById(
    "trustpanel-clear-cookies-button"
  );
  SiteDataTestUtils.addToCookies({
    origin: TEST_ORIGIN,
    name: "test1",
    value: "1",
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: TEST_ORIGIN,
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);
  Assert.ok(
    !clearCookieBtn.disabled,
    "Clear cookies button is enabled initially"
  );

  let menuShown = BrowserTestUtils.waitForEvent(
    window.document.getElementById("trustpanel-clearcookiesView"),
    "ViewShown"
  );
  EventUtils.synthesizeMouseAtCenter(clearCookieBtn, {}, window);
  await menuShown;
  let popupHidden = BrowserTestUtils.waitForEvent(
    window.document,
    "popuphidden"
  );
  EventUtils.synthesizeMouseAtCenter(
    window.document.getElementById("trustpanel-clear-cookie-clear"),
    {},
    window
  );
  await popupHidden;

  await UrlbarTestUtils.openTrustPanel(window);
  Assert.ok(
    clearCookieBtn.disabled,
    "Clear cookies button is disabled once cookies are cleared"
  );

  await UrlbarTestUtils.closeTrustPanel(window);
  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_legacy_graphic_when_nova_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.nova.enabled", false]],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: "https://example.com",
    waitForLoad: true,
  });

  await UrlbarTestUtils.openTrustPanel(window);

  const legacyImage = window.document.getElementById(
    "trustpanel-graphic-image-legacy"
  );
  const novaImage = window.document.getElementById("trustpanel-graphic-image");

  Assert.ok(
    BrowserTestUtils.isVisible(legacyImage),
    "Legacy graphic is shown when browser.nova.enabled is off"
  );
  Assert.greater(
    legacyImage.getBoundingClientRect().width,
    0,
    "Legacy graphic is actually rendered (has non-zero width)"
  );
  Assert.ok(
    !BrowserTestUtils.isVisible(novaImage),
    "Nova graphic is hidden when browser.nova.enabled is off"
  );
  Assert.ok(
    window
      .getComputedStyle(legacyImage)
      .getPropertyValue("background-image")
      .includes("trustpanel-graphic-enabled.svg"),
    "Legacy graphic uses the pre-Nova enabled asset"
  );

  await UrlbarTestUtils.closeTrustPanel(window);
  await BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});
