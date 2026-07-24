/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

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
  IPProtection:
    "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs",
  IPProtectionStates:
    "moz-src:///browser/components/ipprotection/IPProtectionService.sys.mjs",
});

/**
 * Tests that the ip protection unauthenticated panel subview has the correct content.
 */
add_task(async function test_unauthenticated_content() {
  Assert.equal(
    lazy.IPProtectionService.state,
    lazy.IPProtectionStates.UNAUTHENTICATED,
    "Should be in the UNAUTHENTICATED state"
  );
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

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );

  let unauthenticatedContent = content.unauthenticatedEl;

  Assert.ok(
    unauthenticatedContent,
    "Unauthenticated content should be visible"
  );

  let unauthenticatedImg = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-vpn-img"
  );
  let unauthenticatedMessage = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-vpn-message"
  );
  let getStartedButton = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-get-started"
  );

  Assert.ok(unauthenticatedImg, "Unauthenticated image should be visible");
  Assert.ok(
    unauthenticatedMessage,
    "Unauthenticated message should be visible"
  );
  Assert.ok(getStartedButton, "Unauthenticated button should be visible");

  // Close the panel
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape");
  await panelHiddenPromise;
});

/**
 * Tests get started button functionality.
 */
add_task(async function test_signin_button() {
  setupService({
    isSignedIn: false,
    isEnrolledAndEntitled: false,
  });
  Assert.equal(
    lazy.IPProtectionService.state,
    lazy.IPProtectionStates.UNAUTHENTICATED,
    "Should be in the UNAUTHENTICATED state"
  );

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
  let unauthenticatedContent = content.unauthenticatedEl;

  Assert.ok(
    unauthenticatedContent,
    "Unauthenticated content should be visible"
  );

  let getStartedButton = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-get-started"
  );

  Assert.ok(getStartedButton, "Unauthenticated button should be visible");

  let optInPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:OptIn"
  );
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  getStartedButton.click();
  await Promise.all([optInPromise, panelHiddenPromise]);

  let panelShownAgainPromise = waitForPanelEvent(document, "popupshown");
  await lazy.IPProtection.getPanel(window).enroll();
  await panelShownAgainPromise;

  // Close the panel
  let panelHiddenPromiseEnd = waitForPanelEvent(document, "popuphidden");

  panelView.dispatchEvent(
    new CustomEvent("IPProtection:Close", { bubbles: true })
  );

  await panelHiddenPromiseEnd;
  cleanupService();
});

/**
 * Tests that clicking "get started" in the panel passes vpn_integration_panel
 * as the entrypoint to fxaSignInFlow.
 */
add_task(async function test_panel_get_started_entrypoint() {
  setupService({
    isSignedIn: false,
    isEnrolledAndEntitled: false,
  });
  const { fxaSignInFlow } = STUBS;
  fxaSignInFlow.resetHistory();
  let content = await openPanel({ unauthenticated: true });
  let unauthenticatedContent = content.unauthenticatedEl;
  let getStartedButton = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-get-started"
  );

  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  let panelShownAgainPromise = waitForPanelEvent(document, "popupshown");
  getStartedButton.click();
  await panelHiddenPromise;
  await panelShownAgainPromise;

  Assert.ok(fxaSignInFlow.calledOnce, "fxaSignInFlow should be called once");
  Assert.equal(
    fxaSignInFlow.firstCall.args[0].entrypoint,
    "vpn_integration_panel",
    "entrypoint should be vpn_integration_panel when enrolling from the panel"
  );
  Assert.equal(
    fxaSignInFlow.firstCall.args[0].extraParams.utm_source,
    "panel",
    "utm_source should be panel when enrolling from the panel"
  );

  await closePanel();
  cleanupService();
});

/**
 * Tests that clicking "get started" still calls fxaSignInFlow when signed in.
 */
add_task(async function test_panel_get_started_signed_in() {
  setupService({
    isSignedIn: true,
    isEnrolledAndEntitled: false,
  });
  STUBS.fxaSignInFlow.resetHistory();
  let content = await openPanel({ unauthenticated: true });
  let unauthenticatedContent = content.unauthenticatedEl;
  let getStartedButton = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-get-started"
  );

  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  let panelShownAgainPromise = waitForPanelEvent(document, "popupshown");
  getStartedButton.click();
  await panelHiddenPromise;
  await panelShownAgainPromise;

  Assert.ok(
    STUBS.fxaSignInFlow.calledOnce,
    "fxaSignInFlow should be called once"
  );

  await closePanel();
  cleanupService();
});
