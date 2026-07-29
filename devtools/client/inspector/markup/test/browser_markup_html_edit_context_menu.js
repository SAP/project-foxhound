/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that using the context menu (to delete content) in the HTML editor works as expected

const TEST_URL =
  "data:text/html," +
  "<!DOCTYPE html>" +
  "<head><meta charset='utf-8' /></head>" +
  "<body>" +
  '<div id="keyboard"></div>' +
  "</body>" +
  "</html>";

add_task(async function () {
  const { inspector } = await openInspectorForURL(TEST_URL);

  inspector.markup._frame.focus();

  info("Select and open the HTML editor");
  await selectNode("#keyboard", inspector);

  const onHtmlEditorCreated = once(inspector.markup, "begin-editing");
  EventUtils.sendKey("F2", inspector.markup._frame.contentWindow);
  await onHtmlEditorCreated;

  ok(inspector.markup.htmlEditor.isVisible, "The HTML editor is visible");
  is(
    inspector.markup.htmlEditor.editor.getText(),
    '<div id=\"keyboard\"></div>',
    "The HTML editor has content"
  );

  info("Select all the content in the editor");
  EventUtils.synthesizeKey("a", { accelKey: true });

  info("Open the context menu");
  const el = inspector.markup.doc.querySelector(".cm-content");
  EventUtils.synthesizeMouseAtCenter(
    el,
    { type: "contextmenu" },
    inspector.markup.win
  );

  info("Context menu popup should now be visible");
  const popup = await waitForContextMenu(inspector);

  info("Select the 'delete' context menu item");
  const onHidden = BrowserTestUtils.waitForEvent(popup, "popuphidden");
  selectContextMenuItem(popup, "#editmenu-delete");
  await onHidden;

  is(
    inspector.markup.htmlEditor.editor.getText(),
    "",
    "The HTML editor content has been deleted"
  );

  // Close the editor
  const onEditorHiddem = once(inspector.markup.htmlEditor, "popuphidden");
  EventUtils.sendKey("ESCAPE", inspector.markup.htmlEditor.doc.defaultView);
  await onEditorHiddem;
});

async function waitForContextMenu(inspector) {
  // the context menu is in the toolbox window
  const doc = inspector.toolbox.topDoc;

  // there are several context menus, we want the one with the menu-api
  const popup = await waitFor(() =>
    doc.querySelector('menupopup[menu-api="true"]')
  );
  if (popup.state == "open") {
    return popup;
  }
  await new Promise(resolve => {
    popup.addEventListener("popupshown", () => resolve(), { once: true });
  });
  return popup;
}

function selectContextMenuItem(popup, selector) {
  const item = popup.querySelector(selector);
  item.closest("menupopup").activateItem(item);
}
