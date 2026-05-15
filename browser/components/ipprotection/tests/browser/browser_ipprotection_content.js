/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { LINKS } = ChromeUtils.importESModule(
  "chrome://browser/content/ipprotection/ipprotection-constants.mjs"
);
const lazy = {};

const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionWidget:
    "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs",
  IPProtectionPanel:
    "moz-src:///browser/components/ipprotection/IPProtectionPanel.sys.mjs",
  IPProtectionService:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
  IPPSignInWatcher:
    "moz-src:///browser/components/ipprotection/IPPSignInWatcher.sys.mjs",
  IPPNimbusHelper:
    "moz-src:///browser/components/ipprotection/IPPNimbusHelper.sys.mjs",
  IPPEnrollAndEntitleManager:
    "moz-src:///browser/components/ipprotection/IPPEnrollAndEntitleManager.sys.mjs",
});

const PANELSTATES = {
  signedOutVPNOff: {
    isSignedOut: true,
    unauthenticated: true,
    isProtectionEnabled: false,
  },
  signedInVPNOff: {
    isSignedOut: false,
    unauthenticated: false,
    isProtectionEnabled: false,
  },
  signedInVPNOn: {
    isSignedOut: false,
    unauthenticated: false,
    isProtectionEnabled: true,
  },
};

async function setAndUpdateIsAuthenticated(content, isSignedOut, sandbox) {
  sandbox.stub(lazy.IPPSignInWatcher, "isSignedIn").get(() => !isSignedOut);
  sandbox.stub(lazy.IPPNimbusHelper, "isEligible").get(() => true);
  sandbox
    .stub(lazy.IPPEnrollAndEntitleManager, "isEnrolledAndEntitled")
    .get(() => true);
  lazy.IPProtectionService.updateState();
  content.requestUpdate();
  await content.updateComplete;
}

async function resetStateToObj(content, originalState) {
  content.state = originalState;
  content.requestUpdate();
  await content.updateComplete;
}

/**
 * Tests that the ip protection main panel view has the correct content.
 */
add_task(async function test_main_content() {
  let sandbox = sinon.createSandbox();

  let button = document.getElementById(lazy.IPProtectionWidget.WIDGET_ID);
  let panelView = PanelMultiView.getViewNode(
    document,
    lazy.IPProtectionWidget.PANEL_ID
  );

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  // Open the panel
  button.click();
  await panelShownPromise;

  let content = panelView.querySelector(lazy.IPProtectionPanel.CONTENT_TAGNAME);

  let originalState = structuredClone(content.state);

  await setAndUpdateIsAuthenticated(content, false, sandbox);

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );
  Assert.ok(content.statusCardEl, "Status card should be present");

  await resetStateToObj(content, originalState);

  // Close the panel
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape");
  await panelHiddenPromise;

  sandbox.restore();
});

/**
 * Tests settings link visibility in different panel states.
 */
add_task(async function test_settings_link_visibility() {
  let content = await openPanel(PANELSTATES.signedOutVPNOff);

  Assert.ok(
    !content.settingsButtonEl,
    "Settings button should NOT be present when not signed in"
  );

  await closePanel();

  content = await openPanel(PANELSTATES.signedInVPNOff);

  Assert.ok(
    content.settingsButtonEl,
    "Settings button should be present when VPN is disabled"
  );

  await closePanel();

  content = await openPanel(PANELSTATES.signedInVPNOn);

  Assert.ok(
    content.settingsButtonEl,
    "Settings button should be present when VPN is enabled"
  );

  await closePanel();
});

/**
 * Tests that clicking the settings button closes the panel and calls
 * openPreferences with the correct argument.
 */
add_task(async function test_settings_button_closes_panel() {
  let content = await openPanel(PANELSTATES.signedInVPNOn);

  Assert.ok(BrowserTestUtils.isVisible(content), "VPN panel should be present");

  Assert.ok(content.settingsButtonEl, "Settings button should be present");

  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");

  const openPreferencesStub = sinon.stub(window, "openPreferences");

  content.settingsButtonEl.click();

  await panelHiddenPromise;

  let panelView = PanelMultiView.getViewNode(
    document,
    lazy.IPProtectionWidget.PANEL_ID
  );
  Assert.ok(!BrowserTestUtils.isVisible(panelView), "Panel should be closed");

  Assert.ok(
    openPreferencesStub.calledWith("privacy-vpn"),
    "openPreferences called with correct argument when settings button clicked"
  );
  openPreferencesStub.restore();
});

/**
 * Tests settings link visibility in different panel states.
 */
add_task(async function test_settings_link_visibility() {
  let content = await openPanel(PANELSTATES.signedOutVPNOff);

  Assert.ok(
    !content.settingsButtonEl,
    "Settings button should NOT be present when not signed in"
  );

  await closePanel();

  content = await openPanel(PANELSTATES.signedInVPNOff);

  Assert.ok(
    content.settingsButtonEl,
    "Settings button should be present when VPN is disabled"
  );

  await closePanel();

  content = await openPanel(PANELSTATES.signedInVPNOn);

  Assert.ok(
    content.settingsButtonEl,
    "Settings button should be present when VPN is enabled"
  );

  await closePanel();
});

/**
 * Tests that clicking the settings button closes the panel and calls
 * openPreferences with the correct argument.
 */
add_task(async function test_settings_button_closes_panel() {
  let content = await openPanel(PANELSTATES.signedInVPNOn);

  Assert.ok(BrowserTestUtils.isVisible(content), "VPN panel should be present");

  Assert.ok(content.settingsButtonEl, "Settings button should be present");

  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");

  const openPreferencesStub = sinon.stub(window, "openPreferences");

  content.settingsButtonEl.click();

  await panelHiddenPromise;

  let panelView = PanelMultiView.getViewNode(
    document,
    lazy.IPProtectionWidget.PANEL_ID
  );
  Assert.ok(!BrowserTestUtils.isVisible(panelView), "Panel should be closed");

  Assert.ok(
    openPreferencesStub.calledWith("privacy-vpn"),
    "openPreferences called with correct argument when settings button clicked"
  );
  openPreferencesStub.restore();
});
