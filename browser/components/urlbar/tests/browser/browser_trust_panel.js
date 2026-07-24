/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test TrustPanel.
 */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ContentBlockingAllowList:
    "resource://gre/modules/ContentBlockingAllowList.sys.mjs",
});

const TRACKING_PAGE =
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://tracking.example.org/browser/browser/base/content/test/protectionsUI/trackingPage.html";

const ETP_ACTIVE_ICON = 'url("chrome://browser/skin/trust-icon-active.svg")';
const ETP_DISABLED_ICON =
  'url("chrome://browser/skin/trust-icon-disabled.svg")';
const INSECURE_ICON = 'url("chrome://browser/skin/trust-icon-insecure.svg")';

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.scotchBonnet.enableOverride", true],
      ["browser.urlbar.trustPanel.featureGate", true],
      // Hover previews can block opening the trustpanel.
      ["browser.tabs.hoverPreview.enabled", false],
    ],
  });
  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
  });
});

let urlbarBtn = win => win.document.getElementById("trust-icon");
let urlbarLabel = win => win.document.getElementById("trust-label");
let urlbarIcon = win =>
  gBrowser.ownerGlobal
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

  await BrowserTestUtils.removeTab(tab);
});

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
