/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { TabNotes } = ChromeUtils.importESModule(
  "moz-src:///browser/components/tabnotes/TabNotes.sys.mjs"
);

const TAB_NOTE_PREVIEW_PANEL_ID = "tab-note-preview-panel";

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
