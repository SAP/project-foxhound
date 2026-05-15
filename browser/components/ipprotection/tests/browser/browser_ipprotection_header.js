/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  IPProtectionWidget:
    "moz-src:///browser/components/ipprotection/IPProtection.sys.mjs",
  IPProtectionPanel:
    "moz-src:///browser/components/ipprotection/IPProtectionPanel.sys.mjs",
});

/**
 * Tests that the ip protection header has the correct content.
 */
add_task(async function test_header_content() {
  let button = document.getElementById(lazy.IPProtectionWidget.WIDGET_ID);
  let panelView = PanelMultiView.getViewNode(
    document,
    lazy.IPProtectionWidget.PANEL_ID
  );

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  // Open the panel
  button.click();
  await panelShownPromise;

  let header = panelView.querySelector(
    `#${lazy.IPProtectionPanel.HEADER_AREA_ID}`
  );
  Assert.ok(
    BrowserTestUtils.isVisible(header),
    "ipprotection-header should be present"
  );
  Assert.ok(
    header.querySelector("moz-badge"),
    "ipprotection-header experiment badge should be present"
  );
  Assert.ok(
    header.querySelector(`#${IPProtectionPanel.HEADER_BUTTON_ID}`),
    "ipprotection-header help button should be present"
  );
  Assert.ok(
    header.querySelector("h1"),
    "ipprotection-header title should be present"
  );

  // Close the panel
  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  EventUtils.synthesizeKey("KEY_Escape");
  await panelHiddenPromise;
});

/**
 * Tests that the help button functions as expected.
 */
add_task(async function test_help_button() {
  const openLinkStub = sinon.stub(window, "openWebLinkIn");
  let button = document.getElementById(lazy.IPProtectionWidget.WIDGET_ID);
  let panelView = PanelMultiView.getViewNode(
    document,
    lazy.IPProtectionWidget.PANEL_ID
  );

  let panelShownPromise = waitForPanelEvent(document, "popupshown");
  // Open the panel
  button.click();
  await panelShownPromise;

  let header = panelView.querySelector(
    `#${lazy.IPProtectionPanel.HEADER_AREA_ID}`
  );
  Assert.ok(
    BrowserTestUtils.isVisible(header),
    "ipprotection-header should be present"
  );

  let helpButton = header.querySelector(
    `#${IPProtectionPanel.HEADER_BUTTON_ID}`
  );
  Assert.ok(helpButton, "ipprotection-header help button should be present");

  let panelHiddenPromise = waitForPanelEvent(document, "popuphidden");
  helpButton.click();

  await panelHiddenPromise;
  Assert.ok(openLinkStub.calledOnce, "help button should open a link");
  Assert.ok(
    !BrowserTestUtils.isVisible(helpButton),
    "ipprotection-header help button should have closed the panel"
  );
  openLinkStub.restore();
});
