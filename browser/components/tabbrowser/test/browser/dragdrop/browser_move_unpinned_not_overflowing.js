/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const moveOverThresholdPercent = Math.min(
  1.0,
  Math.max(
    0.5,
    Services.prefs.getIntPref(
      "browser.tabs.dragDrop.moveOverThresholdPercent"
    ) / 100
  )
);

/**
 * The number of pixels to overlap a tab strip item in order to move past
 * that tab strip item.
 *
 * This is calculating a slightly larger value than the exact value in order
 * to give the test code a bit of wiggle room for situations where the math
 * ends up within a fraction of a pixel. The overlap in the drag-drop
 * code needs to exceed the `moveOverThresholdPercent`.
 *
 * @param {number} size
 *   Width or height of a tab strip item, in pixels
 * @returns {number}
 *   The number of pixels that this tab strip item should be overlapped
 */
const overlapPixels = size => Math.ceil(moveOverThresholdPercent * size) + 1;

/**
 * Virtually drag and immediately drop a `source` element at the position of
 * the `target` element so that the `source` ends up occupying the position
 * previous held by `target`.
 *
 * @param {Element} source
 *   Element to be dragged
 * @param {Element} target
 *   Target element for the drop event
 * @param {number} clientX
 *   X coordinate of the drop location in viewport units
 * @param {number} clientY
 *   Y coordinate of the drop location in viewport units
 */
async function move(source, target, clientX, clientY) {
  await customDragAndDrop(source, target, null, waitForTabMove(source), {
    clientX,
    clientY,
  });
}

/**
 *
 * @param {Element} itemToDrag
 * @param {Element} itemToDrop
 * @param {boolean} shouldDropAfter
 */
async function moveHorizontalLTR(itemToDrag, itemToDrop, shouldDropAfter) {
  const sourceRect = bounds(itemToDrag);
  const targetRect = bounds(itemToDrop);

  const verticalMidline = targetRect.top + 0.5 * targetRect.height;
  const overlap = overlapPixels(targetRect.width);
  if (shouldDropAfter) {
    const targetPoint = targetRect.left + overlap;
    const dragTo = targetPoint - Math.floor(sourceRect.width / 2);
    await move(itemToDrag, itemToDrop, dragTo, verticalMidline);
  } else {
    const targetPoint = targetRect.right - overlap;
    const dragTo = targetPoint + Math.floor(sourceRect.width / 2);
    await move(itemToDrag, itemToDrop, dragTo, verticalMidline);
  }
}

/**
 *
 * @param {Element} itemToDrag
 * @param {Element} itemToDrop
 * @param {boolean} shouldDropAfter
 */
async function moveHorizontalRTL(itemToDrag, itemToDrop, shouldDropAfter) {
  const sourceRect = bounds(itemToDrag);
  const targetRect = bounds(itemToDrop);

  const verticalMidline = targetRect.top + 0.5 * targetRect.height;
  const overlap = overlapPixels(targetRect.width);
  if (shouldDropAfter) {
    const targetPoint = targetRect.right - overlap;
    const dragTo = targetPoint + Math.floor(sourceRect.width / 2);
    await move(itemToDrag, itemToDrop, dragTo, verticalMidline);
  } else {
    const targetPoint = targetRect.left + overlap;
    const dragTo = targetPoint - Math.floor(sourceRect.width / 2);
    await move(itemToDrag, itemToDrop, dragTo, verticalMidline);
  }
}

/**
 *
 * @param {Element} itemToDrag
 * @param {Element} itemToDrop
 * @param {boolean} shouldDropAfter
 */
async function moveVertical(itemToDrag, itemToDrop, shouldDropAfter) {
  const sourceRect = bounds(itemToDrag);
  const targetRect = bounds(itemToDrop);

  const horizontalMidline = Math.round(
    targetRect.left + 0.5 * targetRect.width
  );
  const overlap = overlapPixels(targetRect.height);
  if (shouldDropAfter) {
    const targetPoint = targetRect.top + overlap;
    const dragTo = targetPoint - Math.floor(sourceRect.height / 2);
    await move(itemToDrag, itemToDrop, horizontalMidline, dragTo);
  } else {
    const targetPoint = targetRect.bottom - overlap;
    const dragTo = targetPoint + Math.floor(sourceRect.height / 2);
    await move(itemToDrag, itemToDrop, horizontalMidline, dragTo);
  }
}

/**
 * Virtually drag and drop one tab strip item to move it after another.
 *
 * @param {Element} itemToDrag
 * @param {Element} itemToDropAfter
 * @returns {Promise<void>}
 */
function moveAfter(itemToDrag, itemToDropAfter) {
  if (gBrowser.tabContainer.verticalMode) {
    return moveVertical(itemToDrag, itemToDropAfter, true);
  }
  if (RTL_UI) {
    return moveHorizontalRTL(itemToDrag, itemToDropAfter, true);
  }
  return moveHorizontalLTR(itemToDrag, itemToDropAfter, true);
}

/**
 * Virtually drag and drop one tab strip item to move it before another.
 *
 * @param {Element} itemToDrag
 * @param {Element} itemToDropBefore
 */
async function moveBefore(itemToDrag, itemToDropBefore) {
  if (gBrowser.tabContainer.verticalMode) {
    return moveVertical(itemToDrag, itemToDropBefore, false);
  }
  if (RTL_UI) {
    return moveHorizontalRTL(itemToDrag, itemToDropBefore, false);
  }
  return moveHorizontalLTR(itemToDrag, itemToDropBefore, false);
}

/**
 * Validates that `tab` remained an unpinned, ungrouped tab after moving.
 *
 * @param {MozTabbrowserTab} tab
 */
function validateTab(tab) {
  Assert.ok(!tab.pinned, "tab should not have been pinned");
  Assert.ok(!tab.group, "tab should not have been put into a tab group");
}

async function test_unpinned_tab_strip_movements() {
  const [tab1, tab2, tab3, tab4, tab5] = await Promise.all(
    Array.from({ length: 5 }).map((_, index) =>
      addTab(`data:text/plain,tab${index + 1}`)
    )
  );
  // Pin the default new tab from the test window in order to suppress
  // the drag-to-pin drop indicator, which can shift the tab strip during
  // drag operations.
  const startingTab = gBrowser.tabs[0];
  gBrowser.pinTab(startingTab);

  Assert.deepEqual(
    gBrowser.tabs,
    [startingTab, tab1, tab2, tab3, tab4, tab5],
    "confirm tabs' starting order"
  );

  let { outerWidth: originalOuterWidth, outerHeight: originalOuterHeight } =
    window;

  try {
    await ensureNotOverflowing();

    info(
      "validating that dragging and dropping into the same position will result in the tab not moving"
    );
    for (const tab of [tab1, tab2, tab3, tab4, tab5]) {
      EventUtils.synthesizeDrop(tab, tab, null, "move", window, window, {});
      Assert.deepEqual(
        gBrowser.tabs,
        [startingTab, tab1, tab2, tab3, tab4, tab5],
        "confirm that the tabs' order did not change"
      );
      validateTab(tab);
    }

    info("validate that it's possible to move tabs forward into each position");
    await moveAfter(tab1, tab2);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab1, tab3, tab4, tab5],
      "confirm that tab1 moved after tab2"
    );
    validateTab(tab1);
    await moveAfter(tab1, tab3);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab3, tab1, tab4, tab5],
      "confirm that tab1 moved after tab3"
    );
    validateTab(tab1);
    await moveAfter(tab1, tab4);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab3, tab4, tab1, tab5],
      "confirm that tab1 moved after tab4"
    );
    validateTab(tab1);
    await moveAfter(tab1, tab5);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab3, tab4, tab5, tab1],
      "confirm that tab1 moved after tab5"
    );
    validateTab(tab1);

    info(
      "Validate that it's possible to move tabs backward into each position"
    );
    await moveBefore(tab1, tab5);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab3, tab4, tab1, tab5],
      "confirm that tab1 moved before tab5"
    );
    validateTab(tab1);
    await moveBefore(tab1, tab4);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab3, tab1, tab4, tab5],
      "confirm that tab1 moved before tab4"
    );
    validateTab(tab1);
    await moveBefore(tab1, tab3);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab2, tab1, tab3, tab4, tab5],
      "confirm that tab1 moved before tab3"
    );
    validateTab(tab1);
    await moveBefore(tab1, tab2);
    Assert.deepEqual(
      gBrowser.tabs,
      [startingTab, tab1, tab2, tab3, tab4, tab5],
      "confirm that tab1 moved before tab2"
    );
    validateTab(tab1);
  } finally {
    if (
      window.outerWidth != originalOuterWidth ||
      window.outerHeight != originalOuterHeight
    ) {
      window.resizeTo(originalOuterWidth, originalOuterHeight);
    }

    gBrowser.unpinTab(startingTab);

    BrowserTestUtils.removeTab(tab1);
    BrowserTestUtils.removeTab(tab2);
    BrowserTestUtils.removeTab(tab3);
    BrowserTestUtils.removeTab(tab4);
    BrowserTestUtils.removeTab(tab5);
  }
}

/**
 * Ensure that the tab strip can fit the test tabs without overflowing.
 */
async function ensureNotOverflowing() {
  if (!gBrowser.tabContainer.arrowScrollbox.overflowing) {
    return;
  }

  const isVertical = gBrowser.tabContainer.verticalMode;
  /** @see tabs.css for the max tab width */
  const maximumTabSize = isVertical ? bounds(gBrowser.tabs[0]).height : 225;
  const requiredTabSpace = maximumTabSize * gBrowser.tabs.length;
  const scrollboxSize = gBrowser.tabContainer.arrowScrollbox.scrollSize;

  // resize the window to ensure that the tabs will fit
  const increaseBy = requiredTabSpace - scrollboxSize;

  const tabStripUnderflows = BrowserTestUtils.waitForEvent(
    gBrowser.tabContainer.arrowScrollbox,
    "underflow"
  );

  if (isVertical) {
    info(
      `increasing window height by ${increaseBy} to fit tabs without overflowing`
    );
    window.resizeBy(0, increaseBy);
  } else {
    info(
      `increasing window width by ${increaseBy} to fit tabs without overflowing`
    );
    window.resizeBy(increaseBy, 0);
  }

  await tabStripUnderflows;
}

add_task(function test_move_unpinned_horizontal_ltr() {
  // Skip if not using horizontal tab strip
  if (Services.prefs.getBoolPref("sidebar.verticalTabs", false)) {
    Assert.ok(
      true,
      "skipping horizontal tab strip tests when browser is using vertical tab strip"
    );
    return Promise.resolve();
  }
  return runAndCleanup("ltr", test_unpinned_tab_strip_movements);
});

add_task(function test_move_unpinned_horizontal_rtl() {
  // Skip if not using horizontal tab strip
  if (Services.prefs.getBoolPref("sidebar.verticalTabs", false)) {
    Assert.ok(
      true,
      "skipping horizontal tab strip tests when browser is using vertical tab strip"
    );
    return Promise.resolve();
  }
  return runAndCleanup("rtl", test_unpinned_tab_strip_movements);
});
