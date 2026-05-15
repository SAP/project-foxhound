/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { TabNotes } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabnotes/TabNotes.sys.mjs"
);

/**
 * @param {Node} triggerNode
 * @param {string} contextMenuId
 * @returns {Promise<XULMenuElement|XULPopupElement>}
 */
async function getContextMenu(triggerNode, contextMenuId) {
  let win = triggerNode.ownerGlobal;
  triggerNode.scrollIntoView({ behavior: "instant" });
  const contextMenu = win.document.getElementById(contextMenuId);
  const contextMenuShown = BrowserTestUtils.waitForPopupEvent(
    contextMenu,
    "shown"
  );

  EventUtils.synthesizeMouseAtCenter(
    triggerNode,
    { type: "contextmenu", button: 2 },
    win
  );
  await contextMenuShown;
  return contextMenu;
}

/**
 * @param {XULMenuElement|XULPopupElement} contextMenu
 * @returns {Promise<void>}
 */
async function closeContextMenu(contextMenu) {
  let menuHidden = BrowserTestUtils.waitForPopupEvent(contextMenu, "hidden");
  contextMenu.hidePopup();
  await menuHidden;
}

/**
 * @param {Element} panel
 * @param {() => Promise<void>} opener
 * @returns {Promise<Element>}
 *   The panel element that was opened.
 */
async function openPanel(panel, opener) {
  let panelShown = BrowserTestUtils.waitForPopupEvent(panel, "shown");
  Assert.equal(panel.state, "closed", "Panel starts hidden");
  await Promise.all([opener(), panelShown]);
  Assert.equal(panel.state, "open", "Panel is now open");
  return panel;
}

/**
 * Open the tab note creation panel by choosing "Add note" from the
 * tab context menu.
 *
 * @param {MozTabbrowserTab} tab
 * @returns {Promise<Element>}
 *   `<tabnote-menu>` element.
 */
async function openTabNoteMenu(tab) {
  let tabContextMenu = await getContextMenu(tab, "tabContextMenu");
  let tabNotePanel = document.getElementById("tabNotePanel");
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  tabContextMenu.activateItem(document.getElementById("context_addNote"));
  await panelShown;
  return tabNotePanel;
}

/**
 * Closes the tab note panel.
 *
 * @returns {Promise<Event>}
 *   `popuphidden` event from closing this menu.
 */
function closeTabNoteMenu() {
  let tabNotePanel = document.getElementById("tabNotePanel");
  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.hidePopup();
  return menuHidden;
}

/**
 * @param {MozTabbrowserTab} tab
 * @returns {Promise<void>}
 */
function tabNoteIndicatorAppears(tab) {
  return BrowserTestUtils.waitForMutationCondition(
    tab,
    { attributeFilter: ["tab-note"] },
    () => tab.hasTabNote
  );
}

/**
 * @param {MozTabbrowserTab} tab
 * @returns {Promise<void>}
 */
function tabNoteIndicatorDisappears(tab) {
  return BrowserTestUtils.waitForMutationCondition(
    tab,
    { attributeFilter: ["tab-note"] },
    () => !tab.hasTabNote
  );
}
