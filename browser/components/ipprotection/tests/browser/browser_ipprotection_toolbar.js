/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPPProxyManager:
    "moz-src:///browser/components/ipprotection/IPPProxyManager.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPProtectionStates:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
});

async function resetCustomization() {
  let customizationReadyPromise = BrowserTestUtils.waitForEvent(
    window.gNavToolbox,
    "customizationready"
  );
  gCustomizeMode.enter();
  await customizationReadyPromise;

  await gCustomizeMode.reset();

  let afterCustomizationPromise = BrowserTestUtils.waitForEvent(
    window.gNavToolbox,
    "aftercustomization"
  );
  gCustomizeMode.exit();
  await afterCustomizationPromise;
}

/**
 * Tests that toolbar widget is added and removed based on
 * `browser.ipProtection.enabled` controlled by Nimbus.
 */
add_task(async function toolbar_added_and_removed() {
  let widget = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(widget),
    "IP Protection widget should be added to the navbar"
  );
  let position = CustomizableUI.getPlacementOfWidget(
    IPProtectionWidget.WIDGET_ID
  ).position;
  // By default, the button for revamped sidebar is placed at the beginning of the navbar.
  let expectedPosition = Services.prefs.getBoolPref("sidebar.revamp") ? 9 : 8;
  Assert.equal(
    position,
    expectedPosition,
    "IP Protection widget added in the correct position"
  );
  // Disable the feature
  Services.prefs.clearUserPref("browser.ipProtection.enabled");
  widget = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.equal(widget, null, "IP Protection widget is removed");

  // Reenable the feature
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });
  widget = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(widget),
    "IP Protection widget should be added back to the navbar"
  );
});

/**
 * Tests that the toolbar icon state updates when the connection status changes
 */
add_task(async function toolbar_icon_status() {
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
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });
  IPProtectionService.updateState();
  await putServerInRemoteSettings();
  content.requestUpdate();
  await content.updateComplete;

  Assert.ok(content, "Panel content should be present");

  let statusCard = content.statusCardEl;
  let turnOnButton = statusCard.actionButtonEl;
  Assert.ok(turnOnButton, "Status card turn on button should be present");

  let vpnOnPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  // Turn the VPN on
  turnOnButton.click();
  await vpnOnPromise;
  Assert.ok(
    button.classList.contains("ipprotection-on"),
    "Toolbar icon should now show connected status"
  );
  let vpnOffPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => lazy.IPProtectionService.state === lazy.IPProtectionStates.READY
  );
  // Turn the VPN off
  let turnOffButton = statusCard.actionButtonEl;
  turnOffButton.click();
  await vpnOffPromise;
  Assert.ok(
    !button.classList.contains("ipprotection-on"),
    "Toolbar icon should now show disconnected status"
  );

  cleanupService();

  // Close the panel
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape");
  await panelHiddenPromise;
});

/**
 * Tests that the toolbar icon in a new window has the previous status.
 */
add_task(async function toolbar_icon_status_new_window() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });
  IPProtectionService.updateState();

  let content = await openPanel();

  let vpnOnPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  // Turn the VPN on
  let statusCard = content.statusCardEl;
  let turnOnButton = statusCard.actionButtonEl;
  turnOnButton.click();
  await vpnOnPromise;

  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    button.classList.contains("ipprotection-on"),
    "Toolbar icon should now show connected status"
  );

  // Check the icon status is set for new windows
  let newWindow = await BrowserTestUtils.openNewBrowserWindow({
    url: "about:newtab",
  });
  let newButton = newWindow.document.getElementById(
    IPProtectionWidget.WIDGET_ID
  );
  Assert.ok(
    newButton.classList.contains("ipprotection-on"),
    "New toolbar icon should show connected status"
  );
  await BrowserTestUtils.closeWindow(newWindow);

  await setPanelState();
  // Clear userEnabled pref to avoid breaking tests
  Services.prefs.clearUserPref("browser.ipProtection.userEnabled");
  cleanupService();
});

add_task(async function customize_toolbar_remove_widget() {
  let widget = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(widget),
    "IP Protection toolbaritem should be visible"
  );
  let prevPosition = CustomizableUI.getPlacementOfWidget(
    IPProtectionWidget.WIDGET_ID
  ).position;

  let stoppedEventPromise = BrowserTestUtils.waitForEvent(
    lazy.IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => lazy.IPProtectionService.state === lazy.IPProtectionStates.READY
  );
  CustomizableUI.removeWidgetFromArea(IPProtectionWidget.WIDGET_ID);
  // VPN should disconect when the toolbaritem is removed
  await stoppedEventPromise;
  Assert.ok(
    !BrowserTestUtils.isVisible(widget),
    "Toolbaritem is no longer visible"
  );

  CustomizableUI.addWidgetToArea(
    IPProtectionWidget.WIDGET_ID,
    CustomizableUI.AREA_NAVBAR,
    prevPosition
  );
});

/**
 * Tests that toolbar widget can be moved and will not reset
 * back to the initial area on re-init.
 */
add_task(async function toolbar_placement_customized() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });

  let start = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.equal(
    start.area,
    CustomizableUI.AREA_NAVBAR,
    "IP Protection widget is initially added to the nav bar"
  );

  // Move widget to overflow
  CustomizableUI.addWidgetToArea(
    IPProtectionWidget.WIDGET_ID,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );

  let end = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.equal(
    end.area,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL,
    "IP Protection widget moved to the overflow area"
  );

  // Disable the feature
  Services.prefs.clearUserPref("browser.ipProtection.enabled");

  let widget = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.equal(widget, null, "IP Protection widget is removed");

  const waitForStateChange = BrowserTestUtils.waitForEvent(
    lazy.IPProtectionService,
    "IPProtectionService:StateChanged",
    false,
    () => lazy.IPProtectionService.state === lazy.IPProtectionStates.READY
  );

  // Reenable the feature
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });

  await waitForStateChange;

  let restored = CustomizableUI.getPlacementOfWidget(
    IPProtectionWidget.WIDGET_ID
  );
  Assert.equal(
    restored.area,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL,
    "IP Protection widget is still in the overflow area"
  );

  CustomizableUI.addWidgetToArea(
    IPProtectionWidget.WIDGET_ID,
    start.area,
    start.position
  );
});

/**
 * Tests that toolbar widget can be removed and will not be re-added.
 */
add_task(async function toolbar_removed() {
  setupService({
    isSignedIn: true,
    isEnrolled: true,
  });

  // Ensure that the added pref is still set, as it is unset at the end of each test.
  await SpecialPowers.pushPrefEnv({
    set: [[IPProtectionWidget.ADDED_PREF, true]],
  });

  let start = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.equal(
    start.area,
    CustomizableUI.AREA_NAVBAR,
    "IP Protection widget is initially added to the nav bar"
  );

  // Remove from the toolbar
  CustomizableUI.removeWidgetFromArea(IPProtectionWidget.WIDGET_ID);

  let end = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.equal(end, null, "IP Protection widget is removed");

  // Disable the feature
  Services.prefs.clearUserPref("browser.ipProtection.enabled");

  const waitForStateChange = BrowserTestUtils.waitForEvent(
    lazy.IPProtectionService,
    "IPProtectionService:StateChanged",
    false,
    () => lazy.IPProtectionService.state === lazy.IPProtectionStates.READY
  );

  // Reenable the feature
  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });

  await waitForStateChange;

  let restored = CustomizableUI.getPlacementOfWidget(
    IPProtectionWidget.WIDGET_ID
  );
  Assert.equal(restored, null, "IP Protection widget is still removed");

  CustomizableUI.addWidgetToArea(
    IPProtectionWidget.WIDGET_ID,
    start.area,
    start.position
  );
});

/**
 * Tests that toolbar widget can be moved and will reset
 * back to the initial area on customize mode reset.
 */
add_task(async function toolbar_placement_reset() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: true,
  });

  let start = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.equal(
    start.area,
    CustomizableUI.AREA_NAVBAR,
    "IP Protection widget is initially added to the nav bar"
  );

  // Move widget to overflow
  CustomizableUI.addWidgetToArea(
    IPProtectionWidget.WIDGET_ID,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL
  );

  let end = CustomizableUI.getPlacementOfWidget(IPProtectionWidget.WIDGET_ID);
  Assert.equal(
    end.area,
    CustomizableUI.AREA_FIXED_OVERFLOW_PANEL,
    "IP Protection widget moved to the overflow area"
  );

  await resetCustomization();

  let restored = CustomizableUI.getPlacementOfWidget(
    IPProtectionWidget.WIDGET_ID
  );
  Assert.equal(
    restored.area,
    start.area,
    "IP Protection widget is reset to the initial area after customize mode reset"
  );
  Assert.equal(
    restored.position,
    start.position,
    "IP Protection widget is reset to the initial position after customize mode reset"
  );
});
