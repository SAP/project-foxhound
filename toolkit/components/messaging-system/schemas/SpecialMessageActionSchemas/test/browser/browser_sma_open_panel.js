/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(async function test_open_panel() {
  Assert.ok(
    document.getElementById("unified-extensions-button"),
    "Widget toolbar button exists"
  );
  let panelView = PanelMultiView.getViewNode(document, "PanelUI-bookmarks");

  // Test using anchor_id
  const actionAnchor = {
    type: "OPEN_PANEL",
    data: {
      anchor_id: "unified-extensions-button",
      panel_id: "PanelUI-bookmarks",
    },
  };

  let panelShownPromiseAnchor = BrowserTestUtils.waitForEvent(
    panelView,
    "ViewShown"
  );
  await SpecialMessageActions.handleAction(actionAnchor, gBrowser);
  await panelShownPromiseAnchor;

  Assert.equal(panelView.closest("panel").state, "open");

  let popupHiddenAnchor = BrowserTestUtils.waitForEvent(
    document,
    "popuphidden"
  );
  // Close the panel
  EventUtils.synthesizeKey("KEY_Escape");
  await popupHiddenAnchor;

  // Test using widget_id
  const actionWidget = {
    type: "OPEN_PANEL",
    data: {
      widget_id: "unified-extensions-button",
      panel_id: "PanelUI-bookmarks",
    },
  };

  let panelShownPromiseWidget = BrowserTestUtils.waitForEvent(
    panelView,
    "ViewShown"
  );
  await SpecialMessageActions.handleAction(actionWidget, gBrowser);
  await panelShownPromiseWidget;

  Assert.equal(panelView.closest("panel").state, "open");

  let popupHidden = BrowserTestUtils.waitForEvent(document, "popuphidden");
  // Close the panel
  EventUtils.synthesizeKey("KEY_Escape");
  await popupHidden;
});
