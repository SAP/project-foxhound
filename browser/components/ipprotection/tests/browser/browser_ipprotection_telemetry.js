/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPExceptionsManager:
    "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs",
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
});

const { ERRORS } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);

async function resetStateToObj(content, originalState) {
  content.state = originalState;
  content.requestUpdate();
  await content.updateComplete;
}

/**
 * Tests that the started and stopped events are recorded when the VPN
 * is turned on or off
 */
add_task(async function user_start_and_stop() {
  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(button),
    "IP Protection widget should be added to the navbar"
  );

  await putServerInRemoteSettings();

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  let panelInitPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:Init"
  );
  button.click();
  await Promise.all([panelShownPromise, panelInitPromise]);

  let panelView = PanelMultiView.getViewNode(
    document,
    IPProtectionWidget.PANEL_ID
  );

  let content = panelView.querySelector(IPProtectionPanel.CONTENT_TAGNAME);

  Assert.ok(content, "Panel content should be present");

  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });
  IPProtectionService.updateState();
  await content.updateComplete;

  let statusCard = content.shadowRoot.querySelector("ipprotection-status-card");

  let turnOnButton = statusCard.actionButtonEl;
  Assert.ok(turnOnButton, "Status card turn on button should be present");

  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();
  let vpnOnPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  // Turn the VPN on
  turnOnButton.click();
  await vpnOnPromise;
  let startedEvents = Glean.ipprotection.started.testGetValue();
  Assert.equal(startedEvents.length, 1, "should have recorded a started event");
  Assert.equal(startedEvents[0].category, "ipprotection");
  Assert.equal(startedEvents[0].name, "started");
  Assert.equal(startedEvents[0].extra.userAction, "true");
  Assert.equal(startedEvents[0].extra.inPrivateBrowsing, "false");

  let vpnOffPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !IPPProxyManager.activatedAt
  );
  // Turn the VPN off
  let turnOffButton = statusCard.actionButtonEl;
  turnOffButton.click();
  await vpnOffPromise;
  let stoppedEvents = Glean.ipprotection.stopped.testGetValue();
  Assert.equal(stoppedEvents.length, 1, "should have recorded a stopped event");
  Assert.equal(stoppedEvents[0].category, "ipprotection");
  Assert.equal(stoppedEvents[0].name, "stopped");
  Assert.equal(stoppedEvents[0].extra.userAction, "true");
  Assert.greater(
    Math.ceil(stoppedEvents[0].extra.duration),
    0,
    "Should have positive duration"
  );

  Services.fog.testResetFOG();
  cleanupService();

  // Close the panel
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape");
  await panelHiddenPromise;
});

/**
 * Tests that inPrivateBrowsing is true when the VPN is started from a
 * private browsing window
 */
add_task(async function start_in_private_browsing() {
  await putServerInRemoteSettings();

  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });
  IPProtectionService.updateState();

  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  let vpnOnPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  await lazy.IPPProxyManager.start(true, true);
  await vpnOnPromise;

  let startedEvents = Glean.ipprotection.started.testGetValue();
  Assert.equal(startedEvents.length, 1, "should have recorded a started event");
  Assert.equal(startedEvents[0].extra.inPrivateBrowsing, "true");

  let vpnOffPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !IPPProxyManager.activatedAt
  );
  await lazy.IPPProxyManager.stop();
  await vpnOffPromise;

  Services.fog.testResetFOG();
  cleanupService();
});

/**
 * Tests that the click upgrade button event is recorded when CTA is clicked
 */
add_task(async function click_upgrade_button() {
  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(button),
    "IP Protection widget should be added to the navbar"
  );

  lazy.IPProtectionService.setState(IPProtectionStates.READY);
  await putServerInRemoteSettings();

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  let panelInitPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:Init"
  );
  button.click();
  await Promise.all([panelShownPromise, panelInitPromise]);

  let panelView = PanelMultiView.getViewNode(
    document,
    IPProtectionWidget.PANEL_ID
  );

  let content = panelView.querySelector(IPProtectionPanel.CONTENT_TAGNAME);
  let originalState = JSON.parse(
    JSON.stringify(content.state, (key, value) =>
      typeof value === "bigint" ? JSON.rawJSON(value.toString()) : value
    )
  );

  Assert.ok(content, "Panel content should be present");

  content.state.isSignedOut = false;
  content.state.paused = true;
  content.requestUpdate();
  await content.updateComplete;

  let upgradeButton = content.upgradeEl.querySelector("#upgrade-vpn-button");

  Services.fog.testResetFOG();
  let newTabPromise = BrowserTestUtils.waitForNewTab(gBrowser);
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  upgradeButton.click();
  let newTab = await newTabPromise;
  await panelHiddenPromise;

  let upgradeEvent = Glean.ipprotection.clickUpgradeButton.testGetValue();
  Assert.equal(
    upgradeEvent.length,
    1,
    "should have recorded a click upgrade button event"
  );

  Services.fog.testResetFOG();
  await resetStateToObj(content, originalState);
  BrowserTestUtils.removeTab(newTab);
});

/**
 * Tests that the error event is recorded when an error is triggered
 */
add_task(async function test_error_state() {
  Services.fog.testResetFOG();
  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(button),
    "IP Protection widget should be added to the navbar"
  );

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  let panelInitPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:Init"
  );
  button.click();
  await Promise.all([panelShownPromise, panelInitPromise]);

  lazy.IPPProxyManager.setErrorState(ERRORS.GENERIC, ERRORS.GENERIC);
  let errorEvent = Glean.ipprotection.error.testGetValue();
  Assert.equal(errorEvent.length, 1, "should have recorded an error");
  Services.fog.testResetFOG();
  await closePanel();
});

/**
 * Tests that the stopped event is recorded when the VPN
 * turns off at browser shutdown
 */
add_task(async function stop_on_shutdown() {
  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(button),
    "IP Protection widget should be added to the navbar"
  );

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  let panelInitPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:Init"
  );
  button.click();
  await Promise.all([panelShownPromise, panelInitPromise]);

  let panelView = PanelMultiView.getViewNode(
    document,
    IPProtectionWidget.PANEL_ID
  );

  let content = panelView.querySelector(IPProtectionPanel.CONTENT_TAGNAME);
  Assert.ok(content, "Panel content should be present");

  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });
  IPProtectionService.updateState();
  await content.updateComplete;
  await putServerInRemoteSettings();

  let statusCard = content.statusCardEl;
  let turnOnButton = statusCard.actionButtonEl;
  Assert.ok(turnOnButton, "Status card turn on button should be present");

  Services.fog.testResetFOG();

  let vpnOnPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  // Turn the VPN on
  turnOnButton.click();
  await vpnOnPromise;
  let startedEvents = Glean.ipprotection.started.testGetValue();
  Assert.equal(startedEvents.length, 1, "should have recorded a started event");
  Assert.equal(startedEvents[0].category, "ipprotection");
  Assert.equal(startedEvents[0].name, "started");
  Assert.equal(startedEvents[0].extra.userAction, "true");
  Assert.equal(startedEvents[0].extra.inPrivateBrowsing, "false");

  // Simulate closing the window
  lazy.IPProtectionService.uninit();
  let stoppedEvents = Glean.ipprotection.stopped.testGetValue();
  Assert.equal(stoppedEvents.length, 1, "should have recorded a stopped event");
  Assert.equal(stoppedEvents[0].category, "ipprotection");
  Assert.equal(stoppedEvents[0].name, "stopped");
  Assert.equal(stoppedEvents[0].extra.userAction, "false");
  Assert.greater(
    Math.ceil(stoppedEvents[0].extra.duration),
    0,
    "Should have positive duration"
  );

  // Clear userEnabled pref to avoid breaking tests
  Services.prefs.clearUserPref("browser.ipProtection.userEnabled");

  Services.fog.testResetFOG();
  // Re-initialize to avoid breaking tests that follow
  cleanupService();
  await lazy.IPProtectionService.init();
  let widget = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(widget),
    "IP Protection widget should be added back to the navbar"
  );
});

/**
 * Tests that the removed_from_toolbar event is recorded when the widget
 * is removed from the toolbar.
 */
add_task(async function removed_from_toolbar() {
  Services.fog.testResetFOG();

  let start = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.ok(start, "IP Protection widget should be in the toolbar");

  CustomizableUI.removeWidgetFromArea(IPProtectionWidget.WIDGET_ID);

  // Wait for the async onWidgetRemoved handler to complete
  await new Promise(resolve => setTimeout(resolve, 0));

  let events = Glean.ipprotection.removedFromToolbar.testGetValue();
  Assert.equal(
    events.length,
    1,
    "should have recorded a removed_from_toolbar event"
  );
  Assert.equal(events[0].category, "ipprotection");
  Assert.equal(events[0].name, "removed_from_toolbar");

  Services.fog.testResetFOG();

  CustomizableUI.addWidgetToArea(
    IPProtectionWidget.WIDGET_ID,
    start.area,
    start.position
  );
});

/*
 * Tests that the exclusion_toggled event is recorded when the panel toggle
 * is used to add or remove a site exclusion
 */
add_task(async function test_exclusion_toggled() {
  const PERM_NAME = "ipp-vpn";
  Services.perms.removeByType(PERM_NAME);
  lazy.IPPExceptionsManager.init();

  await openPanel();

  Services.fog.testResetFOG();

  // We can simplify our test by dispatching the event used for toggle state changes,
  // rather than by finding and clicking the toggle directly.
  document.dispatchEvent(
    new CustomEvent("IPProtection:UserDisableVPNForSite", { bubbles: true })
  );

  let toggledEvents = Glean.ipprotection.exclusionToggled.testGetValue();
  Assert.equal(
    toggledEvents.length,
    1,
    "should have recorded one exclusion_toggled event"
  );
  Assert.equal(toggledEvents[0].category, "ipprotection");
  Assert.equal(toggledEvents[0].name, "exclusion_toggled");
  Assert.equal(
    toggledEvents[0].extra.excluded,
    "true",
    "excluded should be true when VPN is disabled for site"
  );

  document.dispatchEvent(
    new CustomEvent("IPProtection:UserEnableVPNForSite", { bubbles: true })
  );

  toggledEvents = Glean.ipprotection.exclusionToggled.testGetValue();
  Assert.equal(
    toggledEvents.length,
    2,
    "should have recorded a second exclusion_toggled event"
  );
  Assert.equal(
    toggledEvents[1].extra.excluded,
    "false",
    "excluded should be false when VPN is re-enabled for site"
  );

  await closePanel();

  Services.fog.testResetFOG();
  lazy.IPPExceptionsManager.uninit();
  Services.perms.removeByType(PERM_NAME);
});

/*
 * Tests that the exclusion_added counter is incremented when site exclusions
 * are added
 */
add_task(async function test_exclusion_added() {
  const PERM_NAME = "ipp-vpn";
  Services.perms.removeByType(PERM_NAME);

  lazy.IPPExceptionsManager.init();
  Services.fog.testResetFOG();

  const site1 = "https://www.example.com";
  const site2 = "https://www.another.example.com";

  let principal1 =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site1);
  let principal2 =
    Services.scriptSecurityManager.createContentPrincipalFromOrigin(site2);

  // Add first exclusion
  lazy.IPPExceptionsManager.setExclusion(principal1, true);
  Assert.equal(
    Glean.ipprotection.exclusionAdded.testGetValue(),
    1,
    "should have counted 1 exclusion added"
  );

  // Add second exclusion
  lazy.IPPExceptionsManager.setExclusion(principal2, true);
  Assert.equal(
    Glean.ipprotection.exclusionAdded.testGetValue(),
    2,
    "should have counted 2 exclusions added"
  );

  // Remove an exclusion — counter should not increment
  lazy.IPPExceptionsManager.setExclusion(principal1, false);
  Assert.equal(
    Glean.ipprotection.exclusionAdded.testGetValue(),
    2,
    "counter should not increment on removal"
  );

  Services.fog.testResetFOG();
  lazy.IPPExceptionsManager.uninit();
  Services.perms.removeByType(PERM_NAME);
});

/**
 * Tests that the get_started event is recorded when the "Get Started" button is clicked
 */
add_task(async function test_get_started() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: false,
  });
  IPProtectionService.updateState();
  await openPanel();

  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  document.dispatchEvent(
    new CustomEvent("IPProtection:OptIn", { bubbles: true })
  );

  let getStartedEvents = Glean.ipprotection.getStarted.testGetValue();
  Assert.equal(
    getStartedEvents.length,
    1,
    "should have recorded a get_started event"
  );
  Assert.equal(getStartedEvents[0].category, "ipprotection");
  Assert.equal(getStartedEvents[0].name, "get_started");

  await panelShownPromise;
  await closePanel();
  Services.fog.testResetFOG();
  cleanupService();
});

/**
 * Tests that the enrollment event is recorded after completing the enroll flow
 */
add_task(async function test_enrollment() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: false,
  });
  IPProtectionService.updateState();

  Services.fog.testResetFOG();
  await Services.fog.testFlushAllChildren();

  await IPProtection.getPanel(window).enroll();

  let enrollmentEvents = Glean.ipprotection.enrollment.testGetValue();
  Assert.equal(
    enrollmentEvents.length,
    1,
    "should have recorded an enrollment event"
  );
  Assert.equal(enrollmentEvents[0].category, "ipprotection");
  Assert.equal(enrollmentEvents[0].name, "enrollment");
  Assert.equal(
    enrollmentEvents[0].extra.enrolled,
    "true",
    "enrolled should be true when sign-in succeeds"
  );

  await closePanel();
  Services.fog.testResetFOG();
  cleanupService();
});
