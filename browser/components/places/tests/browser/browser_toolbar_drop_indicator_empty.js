/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Test that the drop indicator appears at the correct position when dragging
 * a bookmark onto an empty bookmarks toolbar that only contains the
 * "Import bookmarks..." button, in both LTR and RTL layouts.
 */

"use strict";

add_setup(async function () {
  // Clear all bookmarks first to ensure import button can be added.
  await PlacesUtils.bookmarks.eraseEverything();

  // Ensure bookmarks toolbar is visible.
  let toolbar = document.getElementById("PersonalToolbar");
  let wasCollapsed = toolbar.collapsed;
  if (wasCollapsed) {
    await promiseSetToolbarVisibility(toolbar, true);
  }

  // Ensure import button is present.
  await PlacesUIUtils.maybeAddImportButton();

  registerCleanupFunction(async () => {
    await PlacesUtils.bookmarks.eraseEverything();
    Services.prefs.clearUserPref("browser.bookmarks.addedImportButton");
    CustomizableUI.reset();
    if (wasCollapsed) {
      await promiseSetToolbarVisibility(toolbar, false);
    }
  });
});

/**
 * Helper function to test drop indicator position in either LTR or RTL mode.
 *
 * @param {boolean} isRTL
 *   Whether to test in RTL mode.
 */
async function testDropIndicatorPosition(isRTL) {
  info(`Testing drop indicator position in ${isRTL ? "RTL" : "LTR"} mode`);

  let placesItems = document.getElementById("PlacesToolbarItems");
  let importButton = document.getElementById("import-button");
  let dropIndicator = document.getElementById("PlacesToolbarDropIndicator");

  if (isRTL) {
    await SpecialPowers.pushPrefEnv({
      set: [["intl.l10n.pseudo", "bidi"]],
    });
    // Clear the cached isRTL value so it gets recomputed.
    let placesToolbar = document.getElementById("PlacesToolbar");
    if (placesToolbar?._placesView) {
      delete placesToolbar._placesView._isRTL;
    }
  }

  // Create a bookmark to drag.
  let dragBookmark = await PlacesUtils.bookmarks.insert({
    parentGuid: PlacesUtils.bookmarks.unfiledGuid,
    url: `https://example.com/drag-test-${isRTL ? "rtl" : "ltr"}`,
    title: `Drag Test ${isRTL ? "RTL" : "LTR"}`,
  });

  // Simulate dragging over the toolbar.
  let dt = new DataTransfer();
  dt.mozSetDataAt("text/x-moz-place", JSON.stringify([dragBookmark]), 0);

  let dragOverEvent = new DragEvent("dragover", {
    bubbles: true,
    cancelable: true,
    dataTransfer: dt,
    clientX: placesItems.getBoundingClientRect().left + 10,
    clientY: placesItems.getBoundingClientRect().top + 10,
  });

  placesItems.dispatchEvent(dragOverEvent);

  // Wait for the drop indicator to be positioned.
  await TestUtils.waitForCondition(
    () => !dropIndicator.collapsed,
    "Drop indicator should become visible"
  );

  Assert.ok(!dropIndicator.collapsed, "Drop indicator should be visible");

  // Get the positions.
  let importButtonRect = importButton.getBoundingClientRect();
  let indicatorRect = dropIndicator.getBoundingClientRect();

  // The indicator should be positioned at or near the edge of the import button.
  // Allow for some margin due to the indicator's width and centering.
  let indicatorWidth = indicatorRect.width;
  let indicatorCenter = indicatorRect.left + indicatorWidth / 2;

  if (isRTL) {
    // In RTL, the import button appears on the right, and the indicator
    // should be at or to the left of the import button's left edge.
    Assert.lessOrEqual(
      indicatorCenter,
      importButtonRect.left + 5,
      "Drop indicator should be at or to the left of import button left edge in RTL"
    );
  } else {
    // In LTR, the indicator should be at or to the right of the import
    // button's right edge.
    Assert.greaterOrEqual(
      indicatorCenter,
      importButtonRect.right - 5,
      "Drop indicator should be at or to the right of import button right edge in LTR"
    );
  }

  // Clean up - trigger drag leave.
  let dragLeaveEvent = new DragEvent("dragleave", {
    bubbles: true,
    cancelable: true,
  });
  placesItems.dispatchEvent(dragLeaveEvent);

  if (isRTL) {
    await SpecialPowers.popPrefEnv();
  }
}

add_task(async function test_drop_indicator_position_with_import_button() {
  let placesItems = document.getElementById("PlacesToolbarItems");
  let bookmarkItems = placesItems.querySelectorAll(".bookmark-item");
  Assert.equal(
    bookmarkItems.length,
    0,
    "PlacesToolbarItems should have no bookmarks"
  );

  // Test LTR layout.
  await testDropIndicatorPosition(false);

  // Test RTL layout.
  await testDropIndicatorPosition(true);
});
