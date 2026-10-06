/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { TabNotes } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabnotes/TabNotes.sys.mjs"
);

const TAB_NOTE_PREVIEW_PANEL_ID = "tab-note-preview-panel";

function triggerDblclickOn(target) {
  let promise = BrowserTestUtils.waitForEvent(target, "dblclick");
  EventUtils.synthesizeMouseAtCenter(target, { clickCount: 1 });
  EventUtils.synthesizeMouseAtCenter(target, { clickCount: 2 });
  return promise;
}

async function openNotePreview(tab, win = window) {
  const previewShown = BrowserTestUtils.waitForPopupEvent(
    win.document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID),
    "shown"
  );

  const noteIcon = tab.querySelector(".tab-note-icon");
  // Dispatch the custom event directly rather than synthesizing mouse events.
  // Mouse event synthesis doesn't work reliably in headless tests for child
  // elements, likely due to event target/timing issues.
  tab.dispatchEvent(
    new CustomEvent("TabNoteIconHoverStart", {
      bubbles: true,
      detail: { noteIconElement: noteIcon },
    })
  );
  return previewShown;
}

async function resetState() {
  EventUtils.synthesizeMouseAtCenter(document.documentElement, {
    type: "mouseover",
  });

  const openPanels = document.querySelectorAll(
    "panel[panelopen=true],panel[animating=true]"
  );
  for (let panel of openPanels) {
    let hiddenEvent = BrowserTestUtils.waitForPopupEvent(panel, "hidden");
    panel.hidePopup();
    await hiddenEvent;
  }

  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.tabs.notes.enabled", true],
      ["browser.tabs.hoverPreview.enabled", true],
      ["ui.tooltip.delay_ms", 0],
    ],
  });

  await resetState();
  registerCleanupFunction(async function () {
    await resetState();
    await TabNotes.reset();
  });
});

/**
 * Test that hovering note icon opens note panel and expand functionality works
 */
add_task(async function notePreviewOpenAndExpand() {
  const longNote = "x".repeat(999);
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  const tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, longNote);
  await tabNoteCreated;

  info("Open the note preview panel by hovering the note icon");
  await openNotePreview(tab);

  const notePreviewPanel = document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID);
  Assert.equal(
    notePreviewPanel.state,
    "open",
    "Note preview panel opens when hovering note icon"
  );

  info("Validate note text is displayed correctly");
  const noteTextElement = notePreviewPanel.querySelector(
    ".tab-note-preview-text"
  );
  Assert.equal(
    noteTextElement.textContent,
    longNote,
    "Note preview displays the note text"
  );

  info(
    "Test that notes beyond a specified length trigger truncation and a 'read more' button"
  );
  Assert.ok(
    notePreviewPanel.hasAttribute("note-overflow"),
    "Panel has note-overflow attribute when note is too long to display in non-expanded mode"
  );

  Assert.ok(
    !notePreviewPanel.hasAttribute("note-expanded"),
    "Sanity check: panel does not have note-expanded attribute"
  );

  const expandButton = notePreviewPanel.querySelector(
    ".tab-note-preview-expand"
  );
  Assert.ok(expandButton, "Expand button exists");

  info("Click the expand button to expand the note");
  expandButton.click();

  await BrowserTestUtils.waitForCondition(() => {
    return notePreviewPanel.hasAttribute("note-expanded");
  }, "Waiting for note-expanded attribute to be set");
  Assert.ok(
    notePreviewPanel.hasAttribute("note-expanded"),
    "Panel has been expanded"
  );

  info("Validate the expanded metric was recorded");
  await BrowserTestUtils.waitForCondition(
    () => Glean.tabNotes.expanded.testGetValue()?.length,
    "wait for event to be recorded"
  );

  const [expandedEvent] = Glean.tabNotes.expanded.testGetValue();

  Assert.deepEqual(
    expandedEvent.extra,
    { note_length: "999" },
    "expanded event extra data should say the tab note text is 999 characters long"
  );

  notePreviewPanel.hidePopup();
  await BrowserTestUtils.waitForPopupEvent(notePreviewPanel, "hidden");

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that note preview panel closes when tab is dragged
 */
add_task(async function notePreviewClosesOnTabDrag() {
  // Create an extra tab so the tab we're testing is not the selected tab
  const extraTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );

  const tab = await BrowserTestUtils.addTab(gBrowser, "https://example.com/");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  const tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, "Test note");
  await tabNoteCreated;

  await openNotePreview(tab);

  const notePreviewPanel = document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID);
  Assert.equal(
    notePreviewPanel.state,
    "open",
    "Note preview panel is open before drag"
  );

  const previewHidden = BrowserTestUtils.waitForPopupEvent(
    notePreviewPanel,
    "hidden"
  );
  const dragend = BrowserTestUtils.waitForEvent(tab, "dragend");

  EventUtils.synthesizePlainDragAndDrop({
    srcElement: tab,
    destElement: null,
    stepX: 10,
    stepY: 0,
  });

  await previewHidden;

  Assert.equal(
    notePreviewPanel.state,
    "closed",
    "Note preview panel closes when tab is dragged"
  );

  await dragend;

  BrowserTestUtils.removeTab(tab);
  BrowserTestUtils.removeTab(extraTab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that tab preview opens when mouse returns from note icon to tab
 */
add_task(async function tabPreviewOpensWhenReturningFromNoteIcon() {
  const tab = await BrowserTestUtils.addTab(gBrowser, "https://example.com/");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  const tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, "Test note");
  await tabNoteCreated;

  await openNotePreview(tab);
  const notePreviewPanel = document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID);
  Assert.equal(
    notePreviewPanel.state,
    "open",
    "Note preview panel is open when hovering note icon"
  );

  // simulate mouse leaving the note icon and returning to the tab
  const tabPreviewPanel = document.getElementById("tab-preview-panel");
  const tabPreviewShown = BrowserTestUtils.waitForPopupEvent(
    tabPreviewPanel,
    "shown"
  );

  tab.dispatchEvent(
    new CustomEvent("TabNoteIconHoverEnd", {
      bubbles: true,
      detail: { returningToTab: true },
    })
  );

  await tabPreviewShown;

  Assert.equal(
    tabPreviewPanel.state,
    "open",
    "Tab preview panel opens when returning to tab from note icon"
  );

  Assert.ok(
    notePreviewPanel.state === "closed" || notePreviewPanel.state === "hiding",
    "Note preview panel closes when returning to tab"
  );

  let panelHidden = BrowserTestUtils.waitForPopupEvent(
    tabPreviewPanel,
    "hidden"
  );
  tabPreviewPanel.hidePopup();
  await panelHidden;

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that the tab note editor can be opened by double-clicking the note text
 * or clicking the edit icon in the tab note preview panel.
 */
add_task(async function tabNoteEditFromPreview() {
  const notePreviewPanel = document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID);
  const tabNotePanel = document.getElementById("tabNotePanel");
  const noteText = "Test note for edit";
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, noteText);
  await tabNoteCreated;

  info("open edit note panel by double-clicking on note text");
  await openNotePreview(tab);
  const noteTextEl = notePreviewPanel.querySelector(".tab-note-preview-text");
  Assert.ok(noteTextEl.textContent.trim(), "note text is visible");

  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  let previewHidden = BrowserTestUtils.waitForPopupEvent(
    notePreviewPanel,
    "hidden"
  );
  await triggerDblclickOn(noteTextEl);
  await Promise.all([panelShown, previewHidden]);
  Assert.ok(true, "double-click on note text opens edit panel");

  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.querySelector("#tab-note-editor-button-cancel").click();
  await menuHidden;

  info("open edit note panel by single-clicking the edit icon");
  await openNotePreview(tab);
  const editIcon = notePreviewPanel.querySelector(
    ".tab-note-preview-edit-icon"
  );

  panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  previewHidden = BrowserTestUtils.waitForPopupEvent(
    notePreviewPanel,
    "hidden"
  );
  editIcon.click();
  await Promise.all([panelShown, previewHidden]);
  Assert.ok(true, "click on edit icon opens edit panel");

  menuHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.querySelector("#tab-note-editor-button-cancel").click();
  await menuHidden;

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that the delete button is hidden when creating a new note (no existing
 * note) and visible when editing an existing note.
 */
add_task(async function tabNoteEditorDeleteButtonVisibility() {
  const tabNotePanel = document.getElementById("tabNotePanel");
  const deleteButton = tabNotePanel.querySelector(
    "#tab-note-editor-button-delete"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  const headerEl = tabNotePanel.querySelector("#tab-note-editor-header");
  const separatorEl = tabNotePanel.querySelector("#tab-note-editor-separator");

  info("Open editor with no existing note (create mode)");
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  gBrowser.tabNoteMenu.openPanel(tab);
  await panelShown;

  Assert.ok(
    deleteButton.hidden,
    "Delete button is hidden in create mode (no existing note)"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(headerEl),
    "Header is visible in create mode"
  );
  Assert.ok(
    BrowserTestUtils.isVisible(separatorEl),
    "Separator is visible in create mode"
  );

  let panelHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.querySelector("#tab-note-editor-button-cancel").click();
  await panelHidden;

  info("Create a note and reopen editor (edit mode)");
  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, "A note to edit");
  await tabNoteCreated;

  panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  gBrowser.tabNoteMenu.openPanel(tab);
  await panelShown;

  Assert.ok(
    !deleteButton.hidden,
    "Delete button is visible in edit mode (existing note)"
  );
  Assert.ok(
    !BrowserTestUtils.isVisible(headerEl),
    "Header is hidden in edit mode"
  );
  Assert.ok(
    !BrowserTestUtils.isVisible(separatorEl),
    "Separator is hidden in edit mode"
  );

  panelHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.querySelector("#tab-note-editor-button-cancel").click();
  await panelHidden;

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that clicking the delete button removes the note and closes the panel.
 */
add_task(async function tabNoteEditorDeleteNote() {
  const tabNotePanel = document.getElementById("tabNotePanel");
  const deleteButton = tabNotePanel.querySelector(
    "#tab-note-editor-button-delete"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, "Note to delete");
  await tabNoteCreated;

  Assert.ok(tab.hasAttribute("tab-note"), "Tab has tab-note attribute");

  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  gBrowser.tabNoteMenu.openPanel(tab);
  await panelShown;

  Assert.ok(!deleteButton.hidden, "Delete button is visible in edit mode");

  let tabNoteRemoved = BrowserTestUtils.waitForEvent(tab, "TabNote:Removed");
  let panelHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  deleteButton.click();
  await Promise.all([tabNoteRemoved, panelHidden]);

  Assert.ok(
    !tab.hasAttribute("tab-note"),
    "Tab note attribute removed after deletion"
  );
  Assert.equal(
    await TabNotes.get(tab),
    undefined,
    "Note is gone from storage after deletion"
  );

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that opening the editor from the preview panel sets edit mode, so the
 * delete button is visible.
 */
add_task(async function tabNoteEditorDeleteButtonVisibleFromPreview() {
  const notePreviewPanel = document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID);
  const tabNotePanel = document.getElementById("tabNotePanel");
  const deleteButton = tabNotePanel.querySelector(
    "#tab-note-editor-button-delete"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, "Note for preview edit");
  await tabNoteCreated;

  await openNotePreview(tab);

  const editIcon = notePreviewPanel.querySelector(
    ".tab-note-preview-edit-icon"
  );
  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  let previewHidden = BrowserTestUtils.waitForPopupEvent(
    notePreviewPanel,
    "hidden"
  );
  editIcon.click();
  await Promise.all([panelShown, previewHidden]);

  Assert.ok(
    !deleteButton.hidden,
    "Delete button is visible when editor is opened from the preview panel"
  );

  let panelHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.querySelector("#tab-note-editor-button-cancel").click();
  await panelHidden;

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});

/**
 * Test that editing a note from the preview panel records the correct
 * telemetry source ("note_preview").
 */
add_task(async function tabNotePreviewTelemetrySource() {
  const notePreviewPanel = document.getElementById(TAB_NOTE_PREVIEW_PANEL_ID);
  const tabNotePanel = document.getElementById("tabNotePanel");
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "https://example.com/"
  );

  let tabNoteCreated = BrowserTestUtils.waitForEvent(tab, "TabNote:Created");
  await TabNotes.set(tab, "Telemetry test note");
  await tabNoteCreated;

  // Reset telemetry so the initial set() event doesn't interfere.
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  info("Open editor from preview panel via edit icon");
  await openNotePreview(tab);
  const editIcon = notePreviewPanel.querySelector(
    ".tab-note-preview-edit-icon"
  );

  let panelShown = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "shown");
  let previewHidden = BrowserTestUtils.waitForPopupEvent(
    notePreviewPanel,
    "hidden"
  );
  editIcon.click();
  await Promise.all([panelShown, previewHidden]);

  info("Edit the note text and save");
  let textarea = tabNotePanel.querySelector("textarea");
  textarea.value = "";
  let input = BrowserTestUtils.waitForEvent(textarea, "input");
  EventUtils.sendString("Updated note from preview", window);
  await input;

  let tabNoteEdited = BrowserTestUtils.waitForEvent(tab, "TabNote:Edited");
  let menuHidden = BrowserTestUtils.waitForPopupEvent(tabNotePanel, "hidden");
  tabNotePanel.querySelector("#tab-note-editor-button-save").click();
  await Promise.all([tabNoteEdited, menuHidden]);

  await BrowserTestUtils.waitForCondition(
    () => Glean.tabNotes.edited.testGetValue()?.length,
    "wait for edited telemetry event"
  );
  const [editedEvent] = Glean.tabNotes.edited.testGetValue();
  Assert.equal(
    editedEvent.extra.source,
    "note_preview",
    "edited event source should be note_preview when opened from preview panel"
  );

  BrowserTestUtils.removeTab(tab);
  await resetState();
  await TabNotes.reset();
});
