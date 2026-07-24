/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { Sqlite } = ChromeUtils.importESModule(
  "resource://gre/modules/Sqlite.sys.mjs"
);

registerCleanupFunction(async () => {
  await TabNotes.reset();
});

/**
 *  Tab note menu tests
 */

/**
 * @param {MozTabbrowserTab} selectedTab
 * @param {string} menuItemSelector
 * @param {string} [submenuItemSelector]
 */
let activateTabContextMenuItem = async (
  selectedTab,
  menuItemSelector,
  submenuItemSelector
) => {
  let submenuItem;
  let submenuItemHiddenPromise;

  const win = selectedTab.ownerGlobal;
  const tabContextMenu = win.document.getElementById("tabContextMenu");
  const contextMenuShown = BrowserTestUtils.waitForEvent(
    tabContextMenu,
    "popupshown",
    false,
    ev => ev.target == tabContextMenu
  );
  EventUtils.synthesizeMouseAtCenter(
    selectedTab,
    { type: "contextmenu", button: 2 },
    win
  );
  await contextMenuShown;

  if (submenuItemSelector) {
    submenuItem = tabContextMenu.querySelector(submenuItemSelector);

    const submenuPopupPromise = BrowserTestUtils.waitForEvent(
      submenuItem.menupopup,
      "popupshown"
    );
    submenuItem.openMenu(true);
    await submenuPopupPromise;

    submenuItemHiddenPromise = BrowserTestUtils.waitForEvent(
      submenuItem.menupopup,
      "popuphidden"
    );
  }

  const contextMenuHidden = BrowserTestUtils.waitForEvent(
    tabContextMenu,
    "popuphidden",
    false,
    ev => ev.target == tabContextMenu
  );
  tabContextMenu.activateItem(tabContextMenu.querySelector(menuItemSelector));
  await contextMenuHidden;
  if (submenuItemSelector) {
    await submenuItemHiddenPromise;
  }
};

/**
 * @param {MozTabbrowserTab} tab
 * @returns {Promise<XULPanelElement>}
 */
async function openTabNoteMenuByAddNote(tab) {
  let tabNotePanel = document.getElementById("tabNotePanel");
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  activateTabContextMenuItem(tab, "#context_addNote");
  await panelShown;
  return tabNotePanel;
}

/**
 * @param {MozTabbrowserTab} tab
 * @returns {Promise<XULPanelElement>}
 */
async function openTabNoteMenuByEditNote(tab) {
  let tabNotePanel = document.getElementById("tabNotePanel");
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  activateTabContextMenuItem(tab, "#context_editNote", "#context_updateNote");
  await panelShown;
  return tabNotePanel;
}

add_task(async function test_tabContextMenu_prefDisabled() {
  // open context menu with tab notes disabled
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.notes.enabled", false]],
  });
  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let addNoteElement = document.getElementById("context_addNote");
  let updateNoteElement = document.getElementById("context_updateNote");
  let tabContextMenu = await getContextMenu(tab, "tabContextMenu");
  Assert.ok(
    addNoteElement.hidden,
    "'Add Note' is hidden from context menu when pref disabled"
  );
  Assert.ok(
    updateNoteElement.hidden,
    "'Update Note' is hidden from context menu when pref disabled"
  );
  await closeContextMenu(tabContextMenu);
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_openTabNotePanelFromContextMenu() {
  // open context menu with tab notes enabled
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.tabs.notes.enabled", true],
      ["browser.tabs.notes.newBadge.enabled", true],
    ],
  });
  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let addNoteElement = document.getElementById("context_addNote");
  let tabContextMenu = await getContextMenu(tab, "tabContextMenu");
  Assert.ok(
    !addNoteElement.hidden,
    "'Add Note' is visible in context menu when pref enabled"
  );
  Assert.equal(
    addNoteElement.getAttribute("badge"),
    "New",
    "'New' badge appears when user first interacts with context menu item"
  );
  let tabNotePanel = document.getElementById("tabNotePanel");

  // open panel from context menu
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  Assert.equal(tabNotePanel.state, "closed", "Tab note panel starts hidden");
  tabContextMenu.activateItem(addNoteElement);
  await panelShown;
  Assert.equal(
    tabNotePanel.state,
    "open",
    "Tab note panel appears after clicking context menu item"
  );
  await closeTabNoteMenu();

  tabContextMenu = await getContextMenu(tab, "tabContextMenu");
  Assert.ok(
    !addNoteElement.getAttribute("badge"),
    "'New' badge disappears after user interaction"
  );

  await closeContextMenu(tabContextMenu);
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_dismissTabNotePanel() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.notes.enabled", true]],
  });
  // Dismiss panel by pressing Esc
  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let tabNoteMenu = await openTabNoteMenuByAddNote(tab);
  Assert.equal(tabNoteMenu.state, "open", "Tab note menu is open");
  EventUtils.synthesizeKey("KEY_Escape");
  await BrowserTestUtils.waitForPopupEvent(tabNoteMenu, "hidden");
  Assert.equal(
    tabNoteMenu.state,
    "closed",
    "Tab note menu closes after pressing Esc"
  );

  // Dismiss panel by clicking Cancel
  tabNoteMenu = await openTabNoteMenuByAddNote(tab);
  Assert.equal(tabNoteMenu.state, "open", "Tab note menu is open");
  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNoteMenu, "hidden");
  let cancelButton = document.getElementById("tab-note-editor-button-cancel");
  cancelButton.click();
  await menuHidden;
  Assert.equal(
    tabNoteMenu.state,
    "closed",
    "Tab note menu closes after clicking cancel button"
  );
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_saveTabNote() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.notes.enabled", true]],
  });
  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let tabNoteMenu = await openTabNoteMenuByAddNote(tab);
  let tabNoteInput = tabNoteMenu.querySelector("textarea");
  tabNoteInput.focus();
  EventUtils.sendString("Lorem ipsum dolor", window);

  let saveButton = tabNoteMenu.querySelector("#tab-note-editor-button-save");
  await BrowserTestUtils.waitForCondition(() => {
    return !saveButton.disabled;
  });

  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNoteMenu, "hidden");
  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  saveButton.click();
  await Promise.all([menuHidden, tabNoteCreated]);

  const tabNote = await TabNotes.get(tab);
  Assert.equal(
    tabNote.text,
    "Lorem ipsum dolor",
    "the text entered into the textarea should have been saved as a note"
  );

  await TabNotes.delete(tab);
  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_editTabNote() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.notes.enabled", true]],
  });

  let initialNoteValue = "Lorem ipsum dolor";

  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, initialNoteValue);
  await tabNoteCreated;

  let tabNoteMenu = await openTabNoteMenuByEditNote(tab);
  Assert.equal(
    tabNoteMenu.querySelector("textarea").value,
    initialNoteValue,
    "Tab note panel has initial note value in textarea"
  );

  let updatedNoteValue = " sit amet";

  let tabNoteInput = tabNoteMenu.querySelector("textarea");
  tabNoteInput.focus();
  EventUtils.sendString(updatedNoteValue, window);

  let saveButton = tabNoteMenu.querySelector("#tab-note-editor-button-save");
  await BrowserTestUtils.waitForCondition(() => {
    return !saveButton.disabled;
  });

  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNoteMenu, "hidden");
  let tabNoteEdited = BrowserTestUtils.waitForEvent(tab, "TabNote:Edited");
  tabNoteMenu.querySelector("#tab-note-editor-button-save").click();
  await Promise.all([menuHidden, tabNoteEdited]);

  await BrowserTestUtils.waitForCondition(
    () => Glean.tabNotes.edited.testGetValue()?.length,
    "wait for event to be recorded"
  );

  const tabNote = await TabNotes.get(tab);
  Assert.equal(
    tabNote.text,
    initialNoteValue + updatedNoteValue,
    "The updated text entered into the textarea was saved as a note"
  );

  const [editedMetric] = Glean.tabNotes.edited.testGetValue();
  Assert.deepEqual(
    editedMetric.extra,
    { source: "context_menu" },
    "edited event extra data should show that the tab note was edited from the context menu"
  );

  await TabNotes.delete(tab);
  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_deleteTabNote() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.notes.enabled", true]],
  });

  let initialNoteValue = "Lorem ipsum dolor";

  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, initialNoteValue);
  await tabNoteCreated;

  // Modify the created time of the note so we can test the max age recorded by
  // Glean
  const dbConn = await Sqlite.openConnection({
    path: TabNotes.dbPath,
  });
  dbConn.executeCached(
    'UPDATE tabnotes SET created = unixepoch("now", "-12 hours") WHERE canonical_url = :url',
    {
      url: tab.canonicalUrl,
    }
  );

  let tabNoteRemoved = BrowserTestUtils.waitForEvent(tab, "TabNote:Removed");
  activateTabContextMenuItem(tab, "#context_deleteNote", "#context_updateNote");
  await tabNoteRemoved;

  await BrowserTestUtils.waitForCondition(
    () => Glean.tabNotes.deleted.testGetValue()?.length,
    "wait for event to be recorded"
  );

  let result = await TabNotes.has(tab);

  Assert.ok(!result, "Tab note was deleted");

  const [deletedMetric] = Glean.tabNotes.deleted.testGetValue();
  Assert.equal(
    deletedMetric.extra.source,
    "context_menu",
    "deleted event extra data should say the tab note was deleted from the context menu"
  );
  Assert.equal(
    deletedMetric.extra.note_age_hours,
    12,
    "note_age_hours should show that note was created 12 hours ago"
  );

  BrowserTestUtils.removeTab(tab);
  await dbConn.close();

  // Reset Glean metrics
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
});

add_task(async function test_tabNoteOverflow() {
  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  let tabNoteMenu = await openTabNoteMenuByAddNote(tab);
  let saveButton = tabNoteMenu.querySelector("#tab-note-editor-button-save");

  Assert.ok(
    !tabNoteMenu.hasAttribute("overflow"),
    "Sanity check: tab note menu overflow is false"
  );

  let textarea = tabNoteMenu.querySelector("textarea");
  textarea.focus();
  EventUtils.sendString("x".repeat(990));

  Assert.equal(
    tabNoteMenu.getAttribute("overflow"),
    "warn",
    "Tab note overflow warning indicator is set"
  );
  Assert.ok(
    !saveButton.disabled,
    "Save button is not disabled when warning indicator is active"
  );

  textarea.focus();
  EventUtils.sendString("x".repeat(100));

  Assert.equal(
    tabNoteMenu.getAttribute("overflow"),
    "overflow",
    "Tab note overflow indicator is set"
  );
  Assert.ok(
    saveButton.disabled,
    "Save button is disabled when overflow indicator is active"
  );

  await closeTabNoteMenu();
  BrowserTestUtils.removeTab(tab);

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_ineligibleTabsDisableMenus() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.notes.enabled", true]],
  });

  let tabContextMenu = document.getElementById("tabContextMenu");
  let addNoteEntry = document.querySelector("#context_addNote");
  let updateNoteEntry = document.querySelector("#context_updateNote");

  let eligibleTab = BrowserTestUtils.addTab(
    gBrowser,
    "https://www.example.com"
  );
  await BrowserTestUtils.browserLoaded(eligibleTab.linkedBrowser);

  let ineligibleTab = BrowserTestUtils.addTab(gBrowser, "about:logo");
  await BrowserTestUtils.browserLoaded(ineligibleTab.linkedBrowser);

  info(
    "Test that an eligible tab without a note has an enabled 'Add Note' entry"
  );
  await getContextMenu(eligibleTab, "tabContextMenu");
  Assert.ok(
    !addNoteEntry.hasAttribute("disabled"),
    "Eligible tab has enabled 'Add Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  info("Test that an ineligible tab has a disabled 'Add Note' entry");
  await getContextMenu(ineligibleTab, "tabContextMenu");
  Assert.ok(
    addNoteEntry.hasAttribute("disabled"),
    "Ineligible tab has disabled 'Add Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  info(
    "Test that a multiselection with at least one ineligible tab has a disabled 'Add Note' entry"
  );
  gBrowser.selectedTabs = [eligibleTab, ineligibleTab];
  await getContextMenu(eligibleTab, "tabContextMenu");
  Assert.ok(
    addNoteEntry.hasAttribute("disabled"),
    "Multiselection with an ineligible tab has disabled 'Add Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  let eligibleSameCanonicalUrl = BrowserTestUtils.addTab(
    gBrowser,
    "https://www.example.com"
  );
  await BrowserTestUtils.browserLoaded(eligibleSameCanonicalUrl.linkedBrowser);
  let eligibleDifferentCanonicalUrl = BrowserTestUtils.addTab(
    gBrowser,
    "https://www.example.com/abc"
  );
  await BrowserTestUtils.browserLoaded(
    eligibleDifferentCanonicalUrl.linkedBrowser
  );

  info(
    "Test that a multiselection with two tabs with the same canonical URL and no note has an enabled 'Add Note' entry"
  );
  gBrowser.selectedTabs = [eligibleTab, eligibleSameCanonicalUrl];
  await getContextMenu(eligibleTab, "tabContextMenu");
  Assert.ok(
    !addNoteEntry.hasAttribute("disabled"),
    "Multiselection with two same canonical URLs has enabled 'Add Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  info(
    "Test that a multiselection with two tabs with different canonical URLs has a disabled 'Add Note' entry"
  );
  gBrowser.selectedTabs = [eligibleTab, eligibleDifferentCanonicalUrl];
  await getContextMenu(eligibleTab, "tabContextMenu");
  Assert.ok(
    addNoteEntry.hasAttribute("disabled"),
    "Multiselection with two different canonical URLs has disabled 'Add Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  info(
    "Test that an eligible tab with a note has an enabled 'Update Note' entry"
  );
  gBrowser.selectedTabs = [eligibleTab];
  await TabNotes.set(eligibleTab, "Some tab note");
  await getContextMenu(eligibleTab, "tabContextMenu");
  Assert.ok(
    !updateNoteEntry.hasAttribute("disabled"),
    "Eligible tab has enabled 'Update Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  info(
    "Test that a multiselection with a tab with a note and an ineligible tab has a disabled 'Update Note' entry"
  );
  gBrowser.selectedTabs = [eligibleTab, ineligibleTab];
  await getContextMenu(eligibleTab, "tabContextMenu");
  Assert.ok(
    updateNoteEntry.hasAttribute("disabled"),
    "Multiselection with a tab with note and ineligible tab has disabled 'Update Note' entry"
  );
  await closeContextMenu(tabContextMenu);

  BrowserTestUtils.removeTab(eligibleTab);
  BrowserTestUtils.removeTab(ineligibleTab);
  BrowserTestUtils.removeTab(eligibleSameCanonicalUrl);
  BrowserTestUtils.removeTab(eligibleDifferentCanonicalUrl);
  await SpecialPowers.popPrefEnv();
});
