/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests for moz-page-nav behavior with sub-panes: parent navigation
// buttons stay selected to enable keyboard navigation from sub-panes
// (Bug 2038759), and clicking a nav button performs a forward
// navigation that starts the destination pane fresh (scroll at 0).

requestLongerTimeout(2);

/**
 * Helper to get a nav button by its view attribute.
 */
function getNavButton(doc, viewName) {
  return doc.querySelector(`moz-page-nav-button[view="${viewName}"]`);
}

/**
 * Helper to assert that a nav button is selected and focusable.
 */
function assertNavButtonSelected(button, message) {
  ok(button, "Nav button exists");
  ok(button.selected, `${message} - button has selected attribute`);
  is(
    button.buttonEl.getAttribute("tabindex"),
    "0",
    `${message} - button is focusable`
  );
}

// Test that parent nav buttons stay selected for various sub-pane scenarios.
add_task(async function test_parent_nav_selected_for_subpanes() {
  // Test single-level sub-pane: etp parent is privacy
  await openPreferencesViaOpenPreferencesAPI("etp", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  let categories = doc.getElementById("categories");
  let privacyButton = getNavButton(doc, "panePrivacy");

  is(
    categories.currentView,
    "panePrivacy",
    "Privacy nav button selected when on ETP sub-pane"
  );
  assertNavButtonSelected(privacyButton, "ETP sub-pane");

  // Test nested sub-pane: etpCustomize → etp → privacy (should select privacy root)
  let paneChangePromise = waitForPaneChange("etpCustomize");
  doc.location.hash = "etpCustomize";
  await paneChangePromise;

  is(
    categories.currentView,
    "panePrivacy",
    "Privacy nav button selected for nested sub-pane (etpCustomize)"
  );
  assertNavButtonSelected(privacyButton, "Nested sub-pane");

  // Test different sub-pane: customHomepage parent is home
  let homeButton = getNavButton(doc, "paneHome");
  let win = gBrowser.contentWindow;
  paneChangePromise = waitForPaneChange("home");
  EventUtils.synthesizeMouseAtCenter(homeButton.buttonEl, {}, win);
  await paneChangePromise;

  is(
    categories.currentView,
    "paneHome",
    "Home nav button selected for customHomepage sub-pane"
  );
  assertNavButtonSelected(homeButton, "customHomepage sub-pane");

  // Test top-level pane without parent (regression test)
  paneChangePromise = waitForPaneChange("privacy");
  EventUtils.synthesizeMouseAtCenter(privacyButton.buttonEl, {}, win);
  await paneChangePromise;

  is(
    categories.currentView,
    "panePrivacy",
    "Privacy nav button selected for privacy pane itself"
  );
  assertNavButtonSelected(privacyButton, "Top-level pane");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Test that direct URL navigation to a sub-pane selects the parent button.
add_task(async function test_direct_url_navigation_to_subpane() {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:preferences#etp"
  );
  let doc = tab.linkedBrowser.contentDocument;

  await BrowserTestUtils.waitForMutationCondition(
    doc.body,
    { childList: true, subtree: true },
    () => doc.getElementById("categories")
  );

  let categories = doc.getElementById("categories");
  let privacyButton = getNavButton(doc, "panePrivacy");

  is(
    categories.currentView,
    "panePrivacy",
    "Privacy nav button selected with direct #etp URL navigation"
  );
  assertNavButtonSelected(privacyButton, "Direct URL navigation");

  BrowserTestUtils.removeTab(tab);
});

// Test that arrow key navigation works when focused on parent nav button while viewing sub-pane.
add_task(async function test_arrow_key_navigation_from_subpane() {
  await openPreferencesViaOpenPreferencesAPI("etp", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  let win = gBrowser.contentWindow;

  let privacyButton = getNavButton(doc, "panePrivacy");
  let searchButton = getNavButton(doc, "paneSearch");

  // Focus the selected Privacy button (currently selected because we're on ETP sub-pane)
  privacyButton.buttonEl.focus();
  is(doc.activeElement, privacyButton, "Privacy nav button is focused");

  // Press ArrowUp to navigate to Search pane
  let paneChangePromise = waitForPaneChange("search");
  EventUtils.synthesizeKey("KEY_ArrowUp", {}, win);
  await paneChangePromise;

  // Verify Search button is now selected and we navigated to Search pane
  ok(searchButton.selected, "Search button selected after arrow up");
  is(win.gLastCategory?.category, "paneSearch", "Navigated to Search pane");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Test that clicking a moz-page-nav-button while scrolled on a sub-pane
// performs a forward navigation: the destination pane starts at scrollTop 0
// rather than restoring any prior scroll position.
add_task(async function test_nav_button_click_resets_scroll() {
  await openPreferencesViaOpenPreferencesAPI("etp", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  let win = gBrowser.contentWindow;
  let mainContent = doc.querySelector(".main-content");

  // Force the pane to overflow so scrollTop assignment actually takes effect.
  let padding = doc.createElement("div");
  padding.style.marginBlock = "100vh";
  padding.textContent = "Make sure it scrolls";
  mainContent.append(padding);

  mainContent.scrollTop = 50;
  Assert.greater(mainContent.scrollTop, 0, "Sub-pane scrolled before click");

  // Click a different top-level nav button.
  let syncButton = getNavButton(doc, "paneSync");
  let paneChangePromise = waitForPaneChange("sync");
  EventUtils.synthesizeMouseAtCenter(syncButton.buttonEl, {}, win);
  await paneChangePromise;

  is(
    mainContent.scrollTop,
    0,
    "Scroll resets to 0 after nav-button forward navigation"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

// Test that back button from sub-pane maintains correct parent selection.
add_task(async function test_back_button_from_subpane() {
  // Start on privacy (top-level pane)
  await openPreferencesViaOpenPreferencesAPI("privacy", { leaveOpen: true });
  let doc = gBrowser.contentDocument;
  let win = gBrowser.contentWindow;
  let categories = doc.getElementById("categories");

  is(
    categories.currentView,
    "panePrivacy",
    "Privacy selected for privacy pane"
  );

  // Navigate to ETP sub-pane
  let paneChangePromise = waitForPaneChange("etp");
  win.gotoPref("paneEtp");
  await paneChangePromise;

  // Privacy button should still be selected
  is(
    categories.currentView,
    "panePrivacy",
    "Privacy selected when navigating to ETP"
  );

  // Wait for ETP pane to fully load
  await BrowserTestUtils.waitForMutationCondition(
    doc.getElementById("mainPrefPane"),
    { childList: true, subtree: true },
    () => doc.querySelector('setting-pane[data-category="paneEtp"]')
  );
  let etpPane = doc.querySelector('setting-pane[data-category="paneEtp"]');
  await etpPane.updateComplete;

  // Click back button
  let backButton = etpPane.pageHeaderEl.backButtonEl;
  ok(backButton, "Back button exists on ETP pane");
  ok(BrowserTestUtils.isVisible(backButton), "Back button is visible");

  paneChangePromise = waitForPaneChange("privacy");
  EventUtils.synthesizeMouseAtCenter(backButton, {}, win);
  await paneChangePromise;

  // Verify we're back on main privacy pane and it's still selected
  is(
    categories.currentView,
    "panePrivacy",
    "Privacy still selected after clicking back button"
  );
  is(
    win.gLastCategory?.category,
    "panePrivacy",
    "Navigated back to privacy pane"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Bug 2040444 - Tests that when visiting the URL for a subcategory like
 * #general-translations after visiting an external URL, the back
 * button exits about:preferences and takes you back through the
 * history to the external URL.
 */
add_task(async function back_button_exits_subcategorized_hash() {
  const STARTING_URL = "https://example.com/";

  // open a new tab on an external page
  let tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, STARTING_URL);

  // navigate to bare about:preferences on same tab
  let bareLoaded = BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    false,
    url => url == "about:preferences"
  );
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "about:preferences"
  );
  await bareLoaded;
  await TestUtils.waitForCondition(
    () => tab.linkedBrowser.contentWindow?.gLastCategory?.category,
    "Waiting for bare about:preferences gotoPref to finish"
  );

  // visit the subcategorized URL and wait for it to settle on #languages
  BrowserTestUtils.startLoadingURIString(
    tab.linkedBrowser,
    "about:preferences#languages-translations"
  );
  await TestUtils.waitForCondition(
    () => tab.linkedBrowser.contentWindow?.location.hash == "#languages",
    "Waiting for #languages-translations to normalize to #languages"
  );
  is(
    tab.linkedBrowser.contentWindow.location.hash,
    "#languages",
    "Hash normalized from #languages-translations to #languages"
  );

  // press back twice to land back on the starting page
  tab.linkedBrowser.goBack();
  await TestUtils.waitForCondition(
    () => tab.linkedBrowser.contentWindow?.location.hash == "",
    "Waiting for first back press to clear the hash"
  );

  let secondBackLoaded = BrowserTestUtils.browserLoaded(
    tab.linkedBrowser,
    false,
    url => url == STARTING_URL
  );
  tab.linkedBrowser.goBack();
  await secondBackLoaded;

  is(
    tab.linkedBrowser.currentURI.spec,
    STARTING_URL,
    "Two back presses return to the original starting page"
  );

  BrowserTestUtils.removeTab(tab);
});

/**
 * Bug 2040444 - Tests that clicking between top-level categories
 * still leaves a history entry, so pressing back returns the user
 * to the previous pane within about:preferences.
 */
add_task(async function click_navigation_pushes_history() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences" },
    async browser => {
      let win = browser.contentWindow;
      await TestUtils.waitForCondition(
        () => win.gLastCategory?.category,
        "Waiting for initial gotoPref to finish"
      );

      let paneShown = BrowserTestUtils.waitForEvent(win.document, "paneshown");
      win.gotoPref("panePrivacy");
      await paneShown;

      is(win.location.hash, "#privacy", "Hash updated to privacy after click");
      ok(browser.canGoBack, "Back navigation available after category click");

      let backPaneShown = BrowserTestUtils.waitForEvent(
        win.document,
        "paneshown"
      );
      browser.goBack();
      await backPaneShown;

      is(win.location.hash, "", "Hash returns to empty after pressing back");
      is(
        win.gLastCategory.category,
        "paneSync",
        "Category returns to paneSync after pressing back"
      );
    }
  );
});
