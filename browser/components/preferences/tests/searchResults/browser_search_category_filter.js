"use strict";

/**
 * Tests for the settings-redesign search UI: the per-setting-group
 * filtering inside setting-panes, the "Search results" header, and the
 * heading-level demotion applied to visible panes/groups while search
 * results are displayed.
 */

async function openSearchWithQuery(query) {
  await openPreferencesViaOpenPreferencesAPI(DEFAULT_PANE, {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;
  let searchInput = doc.getElementById("searchInput");
  searchInput.focus();
  let searchCompletedPromise = BrowserTestUtils.waitForEvent(
    gBrowser.contentWindow,
    "PreferencesSearchCompleted",
    evt => evt.detail == query
  );
  EventUtils.sendString(query);
  await searchCompletedPromise;
  return doc;
}

/**
 * Entering a query navigates to paneSearchResults (URL hash changes)
 * and the "Search results" header is shown.
 */
add_task(async function search_header_and_hash() {
  let query = "font";
  let doc = await openSearchWithQuery(query);

  ok(
    doc.location.hash.includes("searchResults"),
    "URL hash switches to searchResults during search"
  );

  let srHeader = doc.getElementById("header-searchResults");
  let queryHeader = doc.getElementById("search-query-header");
  is_element_visible(srHeader, "Search results header is visible");
  is(
    queryHeader.dataset.l10nId,
    "search-results-header",
    "Query header has the correct l10n id"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Within a matching setting-pane, only the matching setting-groups
 * are visible; other setting-groups in the same pane are hidden. On
 * the search pane, the pane's moz-page-header drops from <h2> to
 * <h3>; the matching group's fieldset legend stays at <h3>.
 */
add_task(async function per_group_filtering_and_heading_levels() {
  // "sync" should match within the sync setting-pane.
  let query = "sync";
  let doc = await openSearchWithQuery(query);

  let mainPrefPane = doc.getElementById("mainPrefPane");
  let visiblePanes = [...mainPrefPane.querySelectorAll("setting-pane")].filter(
    p => !p.classList.contains("visually-hidden") && !p.hidden
  );

  ok(visiblePanes.length, "At least one setting-pane matches 'sync'");
  is(
    visiblePanes[0].name,
    "paneSync",
    "The sync setting-pane is the expected match for query 'sync'"
  );

  for (let pane of visiblePanes) {
    ok(pane.onSearchPane, `${pane.name} pane has onSearchPane=true`);
    await pane.pageHeaderEl.updateComplete;
    let headingEl = pane.pageHeaderEl.shadowRoot.querySelector("#heading");
    is(
      headingEl.localName,
      "h3",
      `moz-page-header in ${pane.name} renders <h3> during search`
    );

    let searchableGroups = pane.querySelectorAll(
      "setting-group:not([data-hidden-from-search]):not([hidden]):not([data-hidden-by-setting-group])"
    );
    let matchedGroups = [...searchableGroups].filter(
      g => !g.classList.contains("visually-hidden")
    );
    ok(
      matchedGroups.length,
      `Visible pane ${pane.name} has at least one matching setting-group`
    );
    for (let group of matchedGroups) {
      await group.updateComplete;
      let fieldset = group.fieldsetEl;
      await fieldset.updateComplete;
      let legendHeading = fieldset.shadowRoot.querySelector(
        "legend h1, legend h2, legend h3, legend h4, legend h5, legend h6"
      );
      is(
        legendHeading?.localName,
        "h3",
        `Matching group in ${pane.name} renders its legend as <h3>`
      );
    }
  }

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

function captureSearchVisibility(doc) {
  let groupSelector =
    "setting-group:not([data-hidden-from-search]):not([hidden]):not([data-hidden-by-setting-group])";
  let mainPrefPane = doc.getElementById("mainPrefPane");
  let result = {};
  for (let pane of mainPrefPane.querySelectorAll("setting-pane")) {
    if (pane.classList.contains("visually-hidden") || pane.hidden) {
      continue;
    }
    let groups = [...pane.querySelectorAll(groupSelector)]
      .filter(g => !g.classList.contains("visually-hidden"))
      .map(g => g.getAttribute("groupid"))
      .sort();
    result[pane.name] = { onSearchPane: !!pane.onSearchPane, groups };
  }
  return result;
}

/**
 * Regression test for bug 2043582: with a prior search active, selecting all
 * the text in the search field and typing a different term one character at a
 * time used to leave `visually-hidden` setting-groups from earlier keystrokes
 * stuck hidden.
 */
add_task(async function progressive_typing_matches_fresh_search() {
  let doc = await openSearchWithQuery("accessibility");
  let fresh = captureSearchVisibility(doc);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  doc = await openSearchWithQuery("search");
  let searchInput = doc.getElementById("searchInput");
  await searchInput.updateComplete;
  searchInput.focus();
  EventUtils.synthesizeKey("a", { accelKey: true });

  let expected = "";
  for (let chunk of "accessibility") {
    expected += chunk;
    let searchCompletedPromise = BrowserTestUtils.waitForEvent(
      gBrowser.contentWindow,
      "PreferencesSearchCompleted",
      evt => evt.detail == expected
    );
    EventUtils.sendString(chunk);
    await searchCompletedPromise;
  }

  let afterPrior = captureSearchVisibility(doc);
  Assert.deepEqual(
    afterPrior,
    fresh,
    "Progressive typing of 'accessibility' after 'search' should match a fresh search"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Clearing the search removes visually-hidden classes from every
 * setting-pane and setting-group so that normal navigation is restored.
 */
add_task(async function clearing_search_restores_defaults() {
  let query = "sync";
  let doc = await openSearchWithQuery(query);

  let srHeader = doc.getElementById("header-searchResults");
  is_element_visible(srHeader, "Search results header visible before clear");

  await clearSearch(doc);

  is_element_hidden(srHeader, "Search results header hidden after clear");

  let mainPrefPane = doc.getElementById("mainPrefPane");
  let leftover = mainPrefPane.querySelectorAll(".visually-hidden");
  is(leftover.length, 0, "No elements have visually-hidden after clear");

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
