/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(() => {
  Services.fog.initializeFOG();
});

registerCleanupFunction(async () => {
  await TabNotes.reset();
});

afterEach(async () => {
  await resetTelemetry();
});

async function resetTelemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
}

/**
 *  Tab note telemetry tests
 */

add_task(async function test_tabNoteAddedTabContextMenu() {
  let tab = BrowserTestUtils.addTab(gBrowser, "https://www.example.com");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  let tabContextMenu = await getContextMenu(tab, "tabContextMenu");
  let addNoteMenuItem = document.getElementById("context_addNote");
  let tabNotePanel = await openPanel(
    document.getElementById("tabNotePanel"),
    () => tabContextMenu.activateItem(addNoteMenuItem)
  );

  Assert.equal(
    document.activeElement,
    tabNotePanel.querySelector("textarea"),
    "tab note textarea should be focused"
  );
  const input = BrowserTestUtils.waitForEvent(document.activeElement, "input");
  EventUtils.sendString("Lorem ipsum dolor", window);
  await input;
  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  tabNotePanel.querySelector("#tab-note-editor-button-save").click();
  await Promise.all([menuHidden, tabNoteCreated]);

  await BrowserTestUtils.waitForCondition(
    () => Glean.tabNotes.added.testGetValue()?.length,
    "wait for event to be recorded"
  );

  const [addedEvent] = Glean.tabNotes.added.testGetValue();
  Assert.deepEqual(
    addedEvent.extra,
    { source: "context_menu" },
    "added event extra data should say the tab note was added from the tab context menu"
  );

  await closeTabNoteMenu();
  await TabNotes.delete(tab);
  BrowserTestUtils.removeTab(tab);
});
