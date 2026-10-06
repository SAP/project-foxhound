/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests the dismiss functionality for adaptive autofill results
 */

"use strict";

const ADAPTIVE_URL = "https://example.com/adaptive-page";
const ORIGIN_URL = "https://example.com/";
const SEARCH_STRING = "exa";
const ADAPTIVE_INPUT = "exa";

add_setup(async function () {
  await PlacesUtils.history.clear();
  await PlacesUtils.bookmarks.eraseEverything();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.autoFill", true],
      ["browser.urlbar.autoFill.adaptiveHistory.enabled", true],
      ["browser.urlbar.autoFill.adaptiveHistory.minCharsThreshold", 0],
      ["browser.urlbar.autoFill.adaptiveHistory.useCountThreshold", 0],
      ["browser.urlbar.suggest.quicksuggest.sponsored", false],
      ["browser.urlbar.suggest.quicksuggest.nonsponsored", false],
    ],
  });

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await PlacesUtils.bookmarks.eraseEverything();
  });
});

async function addAdaptiveHistoryEntry(url, input, useCount = 3) {
  await PlacesTestUtils.addVisits({
    uri: url,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  for (let i = 0; i < useCount; i++) {
    await UrlbarUtils.addToInputHistory(url, input);
  }
}

function getMenuButton(index) {
  let rows = gURLBar.view.panel.querySelector(".urlbarView-results");
  let row = rows?.children[index];
  return row?.querySelector(".urlbarView-button-menu") ?? null;
}

async function openResultMenuItems(index) {
  let menuButton = getMenuButton(index);
  if (!menuButton) {
    return [];
  }

  let resultMenu = gURLBar.view.resultMenu;
  let shown = BrowserTestUtils.waitForEvent(resultMenu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(menuButton, {});
  await shown;

  return Array.from(
    resultMenu.querySelectorAll("menuitem.urlbarView-result-menuitem"),
    el => ({ command: el.dataset.command, element: el })
  );
}

/**
 * Closes the result menu if open.
 */
async function closeMenu() {
  let resultMenu = gURLBar.view.resultMenu;
  if (resultMenu.state === "open" || resultMenu.state === "showing") {
    let hidden = BrowserTestUtils.waitForEvent(resultMenu, "popuphidden");
    resultMenu.hidePopup();
    await hidden;
  }
}

add_task(async function dismiss_menu_appears_for_adaptive_autofill_url() {
  await PlacesUtils.history.clear();
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(result.heuristic, "Result should be the heuristic");
  Assert.equal(
    result.autofill?.type,
    "adaptive_url",
    "Autofill type should be 'adaptive'"
  );

  let items = await openResultMenuItems(0);
  let dismiss = items.find(i => i.command === "dismiss_autofill");
  Assert.ok(dismiss, "Dismiss autofill command should be in the menu");

  Assert.equal(
    dismiss.element.getAttribute("data-l10n-id"),
    "urlbar-result-menu-dismiss-suggestion",
    "l10n id should be the dismiss suggestion string"
  );

  let remove = items.find(i => i.command === "dismiss");
  Assert.ok(remove, "Remove URL command should be in the menu");
  Assert.equal(
    remove.element.getAttribute("data-l10n-id"),
    "urlbar-result-menu-remove-from-history",
    "l10n id should be the same as regular remove from history command"
  );

  await closeMenu();
  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

add_task(async function dismiss_menu_appears_for_adaptive_autofill_origin() {
  await PlacesUtils.history.clear();
  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(result.heuristic, "Result should be the heuristic");
  Assert.equal(
    result.autofill?.type,
    "adaptive_origin",
    "Autofill type should be 'adaptive'"
  );

  let items = await openResultMenuItems(0);
  let dismiss = items.find(i => i.command === "dismiss_autofill");
  Assert.ok(dismiss, "Dismiss autofill command should be in the menu");

  Assert.equal(
    dismiss.element.getAttribute("data-l10n-id"),
    "urlbar-result-menu-dismiss-suggestion",
    "l10n id should be the dismiss suggestion string"
  );

  await closeMenu();
  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

add_task(async function adaptive_autofill_result_menu_dismiss_click() {
  await PlacesUtils.history.clear();
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    result.autofill?.type,
    "adaptive_url",
    "Should be adaptive autofill"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Wait for the async onEngagement handler to finish writing to the DB.
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set after dismiss");

  // The block for the origin should not be set when dismissing the page.
  let queryResult = await PlacesTestUtils.getDatabaseValue(
    "moz_origins",
    "block_until_ms",
    { id: originId }
  );
  Assert.equal(queryResult, null, "block_until_ms should not be set");

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let detailsAfter = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !detailsAfter.result.autofill ||
      (detailsAfter.result.autofill.type !== "adaptive_url" &&
        detailsAfter.result.autofill.type !== "adaptive_origin"),
    "Adaptive autofill should NOT appear after dismissal"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

add_task(async function adaptive_autofill_result_menu_history_click() {
  await PlacesUtils.history.clear();
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    result.autofill?.type,
    "adaptive_url",
    "Should be adaptive autofill"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Verify the adaptive autofill entry is blocked in the database.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let detailsAfter = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !detailsAfter.result.autofill ||
      (detailsAfter.result.autofill.type !== "adaptive_url" &&
        detailsAfter.result.autofill.type !== "adaptive_origin"),
    "Adaptive autofill should NOT appear after history item was removed"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

add_task(async function dismiss_menu_for_origin_autofill() {
  await PlacesUtils.history.clear();
  await PlacesTestUtils.addVisits({
    uri: ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(result.heuristic, "Result should be the heuristic");
  Assert.ok(result.autofill, "Result should be autofill");
  Assert.notEqual(
    result.autofill?.type,
    "adaptive_origin",
    "Autofill type should NOT be 'adaptive_origin'"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let detailsAfter = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !detailsAfter.result.autofill,
    "Autofill should not appear after dismissal of origin autofill result"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Dismissed adaptive page autofill should be restored after picking the same
// URL as a history result.
add_task(async function reintegration_adaptive_page_url() {
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  // Verify adaptive autofill works before dismissal.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Should have adaptive autofill before dismissal"
  );

  // Dismiss via result menu.
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Wait for the async onEngagement handler to finish writing to the DB.
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be in the future");

  // Verify adaptive autofill is gone.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.result.autofill ||
      (details.result.autofill.type !== "adaptive_url" &&
        details.result.autofill.type !== "adaptive_origin"),
    "Adaptive autofill should not appear while blocked"
  );

  // Find and pick the history result for the same URL.
  await UrlbarTestUtils.pickResultAndWaitForLoad(window, ADAPTIVE_URL);

  // The block should be cleared.
  let blockPagesUntilMs = await PlacesTestUtils.getDatabaseValue(
    "moz_origins",
    "block_pages_until_ms",
    { id: originId }
  );
  Assert.ok(
    !blockPagesUntilMs,
    "block_pages_until_ms should be cleared after picking the URL as history"
  );

  // Adaptive autofill should work again.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Adaptive autofill should be restored after reintegration"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Dismissed adaptive origin autofill should be restored after picking the same
// origin as a history result.
add_task(async function reintegration_adaptive_origin() {
  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);

  // Verify adaptive autofill works before dismissal.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should have adaptive origin autofill before dismissal"
  );

  // Dismiss via result menu (origin dismiss).
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Wait for the async onEngagement handler to finish writing to the DB.
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ORIGIN_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be in the future");

  // Verify autofill is gone.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(!details.autofill, "Autofill should not appear while blocked");

  // Find and pick the history result.
  await UrlbarTestUtils.pickResultAndWaitForLoad(window, ORIGIN_URL);

  // The block should be cleared.
  let blockUntilMs = await PlacesTestUtils.getDatabaseValue(
    "moz_origins",
    "block_until_ms",
    { id: originId }
  );
  Assert.ok(
    !blockUntilMs,
    "block_until_ms should be cleared after picking the origin as history"
  );

  // Adaptive autofill should work again.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Adaptive origin autofill should be restored after reintegration"
  );

  // Make sure we navigate away or else in other tests, a result macthing the
  // URL the user on will be suppressed.
  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "about:blank",
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

add_task(async function dismiss_menu_in_private_window_adaptive_url() {
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: privateWin,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(privateWin, 0);
  Assert.ok(result.heuristic, "Result should be the heuristic");
  Assert.equal(
    result.autofill?.type,
    "adaptive_url",
    "Autofill type should be 'adaptive_url'"
  );

  let rows = privateWin.gURLBar.view.panel.querySelector(".urlbarView-results");
  let row = rows?.children[0];
  let menuButton = row?.querySelector(".urlbarView-button-menu");
  Assert.ok(menuButton, "Result menu button should exist");

  let resultMenu = privateWin.gURLBar.view.resultMenu;
  let shown = BrowserTestUtils.waitForEvent(resultMenu, "popupshown");
  EventUtils.synthesizeMouseAtCenter(menuButton, {}, privateWin);
  await shown;

  let items = Array.from(
    resultMenu.querySelectorAll("menuitem.urlbarView-result-menuitem"),
    el => ({ command: el.dataset.command, element: el })
  );

  Assert.ok(
    !items.find(i => i.command === "dismiss_autofill"),
    "Dismiss autofill command should NOT appear in private browsing"
  );
  Assert.ok(
    items.find(i => i.command === "dismiss"),
    "Remove from history command should still appear in private browsing"
  );

  let hidden = BrowserTestUtils.waitForEvent(resultMenu, "popuphidden");
  resultMenu.hidePopup();
  await hidden;

  await UrlbarTestUtils.promisePopupClose(privateWin);
  await BrowserTestUtils.closeWindow(privateWin);
  await PlacesUtils.history.clear();
});

add_task(async function dismiss_menu_in_private_window_adaptive_origin() {
  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);

  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: privateWin,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(privateWin, 0);
  Assert.ok(result.heuristic, "Result should be the heuristic");
  Assert.equal(
    result.autofill?.type,
    "adaptive_origin",
    "Autofill type should be 'adaptive_origin'"
  );

  let rows = privateWin.gURLBar.view.panel.querySelector(".urlbarView-results");
  let row = rows?.children[0];
  let menuButton = row?.querySelector(".urlbarView-button-menu");
  Assert.ok(
    !menuButton,
    "Result menu button should not exist for origin in private browsing"
  );

  await UrlbarTestUtils.promisePopupClose(privateWin);
  await BrowserTestUtils.closeWindow(privateWin);
  await PlacesUtils.history.clear();
});

add_task(async function dismiss_menu_in_private_window_origin_autofill() {
  await PlacesTestUtils.addVisits({
    uri: ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: privateWin,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });

  let { result } = await UrlbarTestUtils.getDetailsOfResultAt(privateWin, 0);
  Assert.ok(result.heuristic, "Result should be the heuristic");
  Assert.equal(
    result.autofill?.type,
    "origin",
    "Autofill type should be 'origin'"
  );

  let rows = privateWin.gURLBar.view.panel.querySelector(".urlbarView-results");
  let row = rows?.children[0];
  let menuButton = row?.querySelector(".urlbarView-button-menu");
  Assert.ok(
    !menuButton,
    "Result menu button should not exist for origin autofill in private browsing"
  );

  await UrlbarTestUtils.promisePopupClose(privateWin);
  await BrowserTestUtils.closeWindow(privateWin);
  await PlacesUtils.history.clear();
});

// Dismissed origin autofill (non-adaptive) should be restored after picking
// the origin as a history result.
add_task(async function reintegration_origins_autofill() {
  // Create a typed visit for origins autofill (no adaptive history).
  await PlacesTestUtils.addVisits({
    uri: ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  // Verify origins autofill works.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(details.autofill, "Should have origins autofill before dismissal");
  Assert.notEqual(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should be regular origin autofill, not adaptive"
  );

  // Dismiss via result menu.
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  // Wait for the async onEngagement handler to finish writing to the DB.
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ORIGIN_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be in the future");

  await UrlbarTestUtils.promisePopupClose(window);

  // Verify autofill is gone.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.autofill,
    "Origins autofill should not appear while blocked"
  );

  // Find and pick the history result.
  await UrlbarTestUtils.pickResultAndWaitForLoad(window, ORIGIN_URL);

  // The block should be cleared.
  let blockUntilMs = await PlacesTestUtils.getDatabaseValue(
    "moz_origins",
    "block_until_ms",
    { id: originId }
  );
  Assert.ok(
    !blockUntilMs,
    "block_until_ms should be cleared after picking the origin as history"
  );

  // Origins autofill should work again.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    details.autofill,
    "Origins autofill should be restored after reintegration"
  );

  // Make sure we navigate away or else in other tests, a result macthing the
  // URL the user on will be suppressed.
  await BrowserTestUtils.loadURIString({
    browser: gBrowser.selectedBrowser,
    uriString: "about:blank",
  });

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Dismissing a www. adaptive origin should also block the non-www. variant.
add_task(async function dismiss_www_adaptive_origin_blocks_non_www_variant() {
  const WWW_ORIGIN_URL = "https://www.example.com/";
  await addAdaptiveHistoryEntry(WWW_ORIGIN_URL, ADAPTIVE_INPUT);
  await PlacesTestUtils.addVisits({
    uri: ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should have adaptive origin autofill for www. URL before dismissal"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: WWW_ORIGIN_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be in the future for www. origin");

  // The non-www. variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.autofill,
    "Non-www. origin autofill should also be blocked after dismissing www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Dismissing a www. adaptive page URL should also block the non-www. page
// variant.
add_task(async function dismiss_www_adaptive_page_blocks_non_www_variant() {
  const WWW_PAGE_URL = "https://www.example.com/adaptive-page";
  await addAdaptiveHistoryEntry(WWW_PAGE_URL, ADAPTIVE_INPUT);
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Should have adaptive url autofill for www. page before dismissal"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: WWW_PAGE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set after dismissing www. page");

  // The non-www. page variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.notEqual(
    details.autofill?.type,
    "adaptive_url",
    "Adaptive autofill url should not appear for non-www. page after blocking www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Dismissing a non-www. adaptive origin should also block the www. variant.
add_task(async function dismiss_non_www_adaptive_origin_blocks_www_variant() {
  const WWW_ORIGIN_URL = "https://www.example.com/";
  await addAdaptiveHistoryEntry(ORIGIN_URL, ADAPTIVE_INPUT);
  await PlacesTestUtils.addVisits({
    uri: WWW_ORIGIN_URL,
    transition: PlacesUtils.history.TRANSITIONS.TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_origin",
    "Should have adaptive origin autofill for non-www. URL before dismissal"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ORIGIN_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_until_ms should be in the future for non-www. origin");

  // The www. variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.ok(
    !details.autofill,
    "www. origin autofill should also be blocked after dismissing non-www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});

// Dismissing a non-www. adaptive page URL should also block the www. page
// variant.
add_task(async function dismiss_non_www_adaptive_page_blocks_www_variant() {
  const WWW_PAGE_URL = "https://www.example.com/adaptive-page";
  await addAdaptiveHistoryEntry(ADAPTIVE_URL, ADAPTIVE_INPUT);
  await addAdaptiveHistoryEntry(WWW_PAGE_URL, ADAPTIVE_INPUT);

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  let details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.equal(
    details.result.autofill?.type,
    "adaptive_url",
    "Should have adaptive url autofill for non-www. page before dismissal"
  );

  await UrlbarTestUtils.openResultMenuAndClickItem(window, "dismiss_autofill", {
    resultIndex: 0,
    openByMouse: true,
  });

  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url: ADAPTIVE_URL }
  );
  await TestUtils.waitForCondition(async () => {
    let val = await PlacesTestUtils.getDatabaseValue(
      "moz_origins",
      "block_pages_until_ms",
      { id: originId }
    );
    return val > Date.now();
  }, "block_pages_until_ms should be set after dismissing non-www. page");

  // The www. page variant should also be blocked.
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: SEARCH_STRING,
    fireInputEvent: true,
  });
  details = await UrlbarTestUtils.getDetailsOfResultAt(window, 0);
  Assert.notEqual(
    details.autofill?.type,
    "adaptive_url",
    "Adaptive autofill url should not appear for www. page after blocking non-www. variant"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await PlacesUtils.history.clear();
});
