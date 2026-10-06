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
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
  IPPDummyAuthProvider:
    "resource://testing-common/ipprotection/IPPDummyAuthProvider.sys.mjs",
  IPPNimbusHelper:
    "moz-src:///toolkit/components/ipprotection/IPPNimbusHelper.sys.mjs",
});

const PANELSTATES = {
  signedOutVPNOff: {
    unauthenticated: true,
    isProtectionEnabled: false,
  },
  signedInVPNOff: {
    unauthenticated: false,
    isProtectionEnabled: false,
  },
  signedInVPNOn: {
    unauthenticated: false,
    isProtectionEnabled: true,
  },
};

async function setAuthenticated(content, isReady, sandbox) {
  if (isReady) {
    lazy.IPPDummyAuthProvider.simulateSignIn(true);
    lazy.IPPDummyAuthProvider.setEntitlement(createTestEntitlement(), {
      silent: true,
    });
  } else {
    lazy.IPPDummyAuthProvider.simulateSignIn(false);
  }
  sandbox.stub(lazy.IPPNimbusHelper, "isEligible").get(() => true);
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

  await setAuthenticated(content, true, sandbox);

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

/**
 * Tests the enrolling skeleton state renders in ipprotection-content.
 */
add_task(async function test_enrolling_skeleton() {
  let content = await openPanel({
    unauthenticated: false,
    isEnrolling: true,
  });

  let container = content.shadowRoot.querySelector("#enrolling-container");
  Assert.ok(container, "Enrolling container should be present");
  Assert.ok(
    container.querySelector(".skeleton-title"),
    "Skeleton title element should be present"
  );
  Assert.ok(
    container.querySelector(".skeleton-line"),
    "Skeleton line element should be present"
  );
  Assert.equal(
    container.querySelectorAll(".skeleton-line-thick").length,
    2,
    "Two skeleton line thick elements should be present"
  );

  Assert.ok(
    !content.statusCardEl,
    "Status card should be hidden while enrolling"
  );
  Assert.ok(
    !content.statusBoxEl,
    "Status box should be hidden while enrolling"
  );
  Assert.ok(
    content.settingsButtonEl,
    "Settings button should be present while enrolling"
  );

  await closePanel();
});

/**
 * Tests that the enrolling state takes priority over the unauthenticated state.
 */
add_task(async function test_enrolling_overrides_unauthenticated() {
  let content = await openPanel({
    unauthenticated: true,
    isEnrolling: true,
  });

  Assert.ok(
    !content.unauthenticatedEl,
    "Unauthenticated view should be hidden while enrolling"
  );
  Assert.ok(
    content.shadowRoot.querySelector("#enrolling-container"),
    "Enrolling skeleton should be shown instead"
  );

  await closePanel();
});

/**
 * Tests that the panel transitions from the enrolling skeleton to the normal
 * state once enrollment completes.
 */
add_task(async function test_enrolling_transitions_to_ready() {
  setupService({
    isReady: true,
    canEnroll: true,
    proxyPass: {
      status: 200,
      error: undefined,
      pass: makePass(),
    },
  });

  let content = await openPanel({
    unauthenticated: false,
    isProtectionEnabled: false,
    isEnrolling: true,
  });

  Assert.ok(
    content.shadowRoot.querySelector("#enrolling-container"),
    "Skeleton shown initially"
  );

  await setPanelState({
    unauthenticated: false,
    isProtectionEnabled: false,
    isEnrolling: false,
  });

  Assert.ok(
    !content.shadowRoot.querySelector("#enrolling-container"),
    "Skeleton hidden after enrollment completes"
  );
  Assert.ok(
    content.statusCardEl,
    "Status card shown after enrollment completes"
  );

  await closePanel();
  cleanupService();
});
