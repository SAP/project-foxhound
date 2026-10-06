/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

requestLongerTimeout(3);

const { resolveLegacyCategory, LEGACY_PANE_MAPPINGS } =
  ChromeUtils.importESModule(
    "chrome://browser/content/preferences/config/LegacyPaneMappings.mjs"
  );

/**
 * Remove the pane prefix from a category name.
 *
 * @param {string} paneName
 */
function getFriendlyPaneName(paneName) {
  return paneName.startsWith("pane")
    ? paneName[4].toLowerCase() + paneName.slice(5)
    : paneName;
}

/**
 * Get the closest [data-category] without the "pane" prefix, or "".
 *
 * @param {Element} el
 * @returns {string} The closest category name or "".
 */
function getElementCategory(el) {
  let paneEl = el.closest("[data-category]");
  if (!paneEl) {
    return "";
  }
  return getFriendlyPaneName(paneEl.getAttribute("data-category"));
}

/**
 * Walk the DOM and return a Set of "category" and "category-subcategory"
 * strings using the friendly (non-pane-prefixed) form.
 *
 * The DOM is the source of truth here because the legacy layout has no
 * JS registry; pane/subcategory inventory lives in *.inc.xhtml markup.
 *
 * @param {Document} doc
 * @param {boolean} srdEnabled
 * @returns {Set<string>}
 */
function collectPanesAndSubcategories(doc, srdEnabled) {
  /** @type {Set<string>} */
  let pairs = new Set();
  // Include each category.
  for (let paneEl of doc.querySelectorAll("[data-category]")) {
    pairs.add(getElementCategory(paneEl));
  }
  // Include matching subcategories (skip the old ones in SRD).
  for (let el of doc.querySelectorAll("[data-subcategory]")) {
    let category = getElementCategory(el);
    if (srdEnabled && !category) {
      continue;
    }
    if (srdEnabled && el.closest("[data-srd-migrated], [data-srd-groupid]")) {
      // Shouldn't happen, these elements had their [data-category] removed.
      throw new Error("Unexpected legacy UI with [data-category]");
    }
    for (let sub of el.getAttribute("data-subcategory").trim().split(/\s+/)) {
      if (sub) {
        pairs.add(`${category}-${sub}`);
      }
    }
  }
  return pairs;
}

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_newSubPaneDestinations() {
  const legacyPanePrivacy = "panePrivacy";
  const legacyDoHSubcategory = "doh";
  const legacyETPSubcategory = "trackingprotection";
  let expected = { category: "privacy", subcategory: "dnsOverHttps" };
  let actual = resolveLegacyCategory(legacyPanePrivacy, legacyDoHSubcategory);
  Assert.equal(
    actual.category,
    expected.category,
    `panePrivacy should be mapped to ${expected.category}`
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    `doh should be mapped to ${expected.subcategory}`
  );

  expected = { category: "privacy", subcategory: "etpStatus" };
  actual = resolveLegacyCategory(legacyPanePrivacy, legacyETPSubcategory);
  Assert.equal(
    actual.category,
    expected.category,
    `panePrivacy should be mapped to ${expected.category}`
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    `trackingprotection should be mapped to ${expected.subcategory}`
  );

  expected = { category: "sync", subcategory: null };
  actual = resolveLegacyCategory("general");

  Assert.equal(
    actual.category,
    expected.category,
    "general category should be mapped to sync"
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    "An empty subcategory should return a null subcategory"
  );
});
add_task(async function test_unchangedPanes() {
  let expected = { category: "privacy", subcategory: null };
  let actual = resolveLegacyCategory("privacy");
  Assert.equal(
    actual.category,
    expected.category,
    "privacy category should be unchanged"
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    "An empty subcategory should return a null subcategory"
  );

  expected = { category: "sync", subcategory: null };
  actual = resolveLegacyCategory("sync");

  Assert.equal(
    actual.category,
    expected.category,
    "sync category should be unchanged"
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    "An empty subcategory should return a null subcategory"
  );

  expected = { category: "search", subcategory: null };
  actual = resolveLegacyCategory("search");

  Assert.equal(
    actual.category,
    expected.category,
    "search category should be unchanged"
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    "An empty subcategory should return a null subcategory"
  );

  expected = { category: "home", subcategory: null };
  actual = resolveLegacyCategory("home");

  Assert.equal(
    actual.category,
    expected.category,
    "home category should be unchanged"
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    "An empty subcategory should return a null subcategory"
  );
});
add_task(async function test_paneSearch_normalization() {
  let expected = { category: "search", subcategory: null };
  let actual = resolveLegacyCategory("paneSearch");
  Assert.equal(
    actual.category,
    expected.category,
    "paneSearch normalizes to search"
  );
  Assert.equal(
    actual.subcategory,
    expected.subcategory,
    "An empty subcategory returns a null subcategory"
  );
});

/**
 * Assert that legacy names that have mapping entries route to the right pane.
 * Where the destination group has a data-subcategory attribute, we
 * also wait for it to render. For feature-gated groups (ipprotection/vpn) we
 * only assert the hash.
 */
add_task(async function test_legacy_name_routing_and_subcategory_attr() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.settings-redesign.enabled", true],
      ["browser.newtabpage.activity-stream.feeds.system.topstories", true],
    ],
  });

  // [arg, expectedHash, expectedPane, expectedSubcategory | null]
  // null subcategory = feature-gated group; only assert hash and pane.
  for (let [arg, expectedHash, expectedPane, expectedSubcategory] of [
    ["general-layout", "#tabsBrowsing", "paneTabsBrowsing", "layout"],
    ["home-homeOverride", "#home", "paneHome", "homeOverride"],
    ["home-newtabOverride", "#home", "paneHome", "newtabOverride"],
    ["home-contents", "#home", "paneHome", "contents"],
    ["home-web-search", "#home", "paneHome", "web-search"],
    ["home-weather", "#home", "paneHome", "weather"],
    ["home-topsites", "#home", "paneHome", "topsites"],
    ["home-topstories", "#home", "paneHome", "topstories"],
    ["home-support-firefox", "#home", "paneHome", "support-firefox"],
    ["home-highlights", "#home", "paneHome", "highlights"],
    ["privacy-trackingprotection", "#privacy", "panePrivacy", "etpStatus"],
    ["privacy-doh", "#privacy", "panePrivacy", "dnsOverHttps"],
    ["privacy-sitedata", "#privacy", "panePrivacy", "sitedata"],
    ["privacy-vpn", "#privacy", "panePrivacy", null],
    ["privacy-logins", "#passwordsAutofill", "panePasswordsAutofill", "logins"],
    ["privacy-permissions", "#permissionsData", "panePermissionsData", null],
    ["search-firefoxSuggest", "#search", "paneSearch", "locationBar"],
    [
      "privacy-payment-methods-autofill",
      "#passwordsAutofill",
      "panePasswordsAutofill",
      "payment-methods-autofill",
    ],
    [
      "privacy-credit-card-autofill",
      "#passwordsAutofill",
      "panePasswordsAutofill",
      "credit-card-autofill",
    ],
    [
      "privacy-addresses-autofill",
      "#passwordsAutofill",
      "panePasswordsAutofill",
      "addresses-autofill",
    ],
    [
      "privacy-address-autofill",
      "#passwordsAutofill",
      "panePasswordsAutofill",
      "address-autofill",
    ],
    ["privacy-logins", "#passwordsAutofill", "panePasswordsAutofill", "logins"],
  ]) {
    let friendlyCategoryName = getFriendlyPaneName(expectedPane);
    let loaded = TestUtils.topicObserved(`${friendlyCategoryName}-pane-loaded`);
    let prefs = await openPreferencesViaOpenPreferencesAPI(arg, {
      leaveOpen: true,
    });
    await loaded;
    let doc = gBrowser.contentDocument;

    is(doc.location.hash, expectedHash, `${arg}: hash is ${expectedHash}`);
    is(prefs.selectedPane, expectedPane, `${arg}: correct pane selected`);

    if (expectedSubcategory) {
      // Find the first visible spotlight, could be leftovers from pre-SRD since
      // the actual highlighting doesn't check [data-category].
      let spotlight = [...doc.querySelectorAll(".spotlight")].find(el =>
        el.checkVisibility()
      );
      Assert.stringContains(
        spotlight.getAttribute("data-subcategory"),
        expectedSubcategory,
        `${arg}: subcategory highlighted`
      );
      is(
        getElementCategory(spotlight),
        friendlyCategoryName,
        `${arg}: spotlight category correct`
      );
    }

    doc.defaultView.spotlight(null);
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
});

/**
 * A completely unknown category (no mapping, no matching nav button)
 * falls back to the first-available pane without throwing.
 */
add_task(async function test_unknown_category_fallback() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  let prefs = await openPreferencesViaOpenPreferencesAPI("nonexistent-blah", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;

  isnot(
    prefs.selectedPane,
    "paneNonexistent",
    "unknown category does not become the selected pane"
  );
  isnot(doc.location.hash, "#nonexistent", "hash is not the unknown category");
  // The page must still be functional — a visible pane is selected.
  ok(
    doc.querySelector("setting-pane:not([hidden])") ||
      doc.querySelector(".pane-container:not([hidden])"),
    "a visible pane is shown after unknown-category fallback"
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

function makeHashFromMapping({ category, subcategory }) {
  let newMapping = resolveLegacyCategory(category, subcategory);
  if (newMapping.subcategory) {
    return newMapping.category + "-" + newMapping.subcategory;
  }
  return newMapping.category;
}

/**
 * Two-phase DOM completeness check and cycle-detection.
 *
 * Phase 1 (pref off): collect every category and category-subcategory pair
 * present in the DOM.  Phase 2 (pref on, reloaded): collect the same.  Every
 * old pair absent from the new DOM must have a mapping entry.  Also asserts
 * that no mapping destination is itself a mapping key (cycle-free).
 */
add_task(async function test_dom_completeness_and_cycle_detection() {
  // Phase 1: pref off — collect existing pairs from the old DOM.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", false]],
  });
  let initialized = TestUtils.topicObserved(
    "preferences-MaybeCategoriesInitializedSLOW"
  );
  await openPreferencesViaOpenPreferencesAPI("general", { leaveOpen: true });
  await initialized;
  let oldPairs = collectPanesAndSubcategories(
    gBrowser.selectedBrowser.contentDocument,
    false
  );
  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  // Phase 2: pref on — reload to re-initialise the preferences realm.
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
  // For some reason this seems to be delayed...
  initialized = TestUtils.topicObserved(
    "preferences-MaybeCategoriesInitializedSLOW"
  );
  await openPreferencesViaOpenPreferencesAPI("sync", { leaveOpen: true });
  await initialized;
  let newPairs = collectPanesAndSubcategories(
    gBrowser.selectedBrowser.contentDocument,
    true
  );

  // Every old pair missing from the new DOM must have a mapping entry.
  for (let pair of oldPairs) {
    if (!newPairs.has(pair)) {
      let mapping = LEGACY_PANE_MAPPINGS.get(pair);
      ok(
        !!mapping,
        `"${pair}" removed from redesign DOM must have a mapping entry`
      );
      // Ensure the redirect actually exists in the DOM.
      if (mapping) {
        let newHash = makeHashFromMapping(mapping);
        ok(
          newPairs.has(newHash),
          `"${pair}" mapping "${newHash}" is in the DOM`
        );
      }
    }
  }

  // Cycle-detection: every mapping destination must resolve to itself.
  for (let [key, dest] of LEGACY_PANE_MAPPINGS) {
    let reresolved = resolveLegacyCategory(
      dest.category,
      dest.subcategory ?? undefined
    );
    Assert.equal(
      reresolved.category,
      dest.category,
      `mapping destination for "${key}" is not itself a mapped key`
    );
    Assert.equal(
      reresolved.subcategory,
      dest.subcategory ?? null,
      `mapping destination subcategory for "${key}" is stable`
    );
  }

  // sync is gated on identity.fxaccounts.enabled and may not render.
  const KNOWN_GATED_CATEGORIES = new Set();
  if (!Services.prefs.getBoolPref("identity.fxaccounts.enabled")) {
    KNOWN_GATED_CATEGORIES.add("sync");
  }

  // Reverse-direction check: every mapping destination's category must
  // render in the redesign DOM. This catches typos like `someBadPane`.
  // Subcategory-level checking is omitted because mapping subcategories route
  // via multiple mechanisms (paneshown listeners, groupid, sub-pane nav) beyond
  // the data-subcategory attributes that collectPanesAndSubcategories walks.
  for (let [key, dest] of LEGACY_PANE_MAPPINGS) {
    if (KNOWN_GATED_CATEGORIES.has(dest.category)) {
      continue;
    }
    ok(
      newPairs.has(dest.category),
      `mapping destination category "${dest.category}" for "${key}" exists in the redesign DOM`
    );
  }

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * The resolver is a no-op when the redesign pref is off.  A name
 * that has a mapping entry must navigate using the original name unchanged.
 */
add_task(async function test_resolver_noop_when_redesign_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", false]],
  });

  // privacy-trackingprotection maps to { category: "privacy", subcategory: "etpStatus" }
  // when the pref is on.  With the pref off it must route to the original
  // panePrivacy + trackingprotection subcategory instead.
  let prefs = await openPreferencesViaOpenPreferencesAPI(
    "privacy-trackingprotection",
    { leaveOpen: true }
  );
  let doc = gBrowser.contentDocument;

  is(prefs.selectedPane, "panePrivacy", "routes to panePrivacy");
  is(doc.location.hash, "#privacy", "hash is #privacy");

  await TestUtils.waitForCondition(
    () => doc.querySelector(".spotlight"),
    "spotlight is visible"
  );
  is(
    doc.querySelector(".spotlight").getAttribute("data-subcategory"),
    "trackingprotection",
    "spotlight target is the original trackingprotection element, not etpStatus"
  );

  doc.defaultView.spotlight(null);
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});

/**
 * Opening about:preferences with a legacy hash in the URL (not via
 * openPreferences()) resolves through the same routing path.
 */
add_task(async function test_hash_url_navigation() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  let initialized = TestUtils.topicObserved(
    "preferences-MaybeCategoriesInitializedSLOW"
  );
  let tab = await BrowserTestUtils.addTab(
    gBrowser,
    "about:preferences#privacy-trackingprotection"
  );
  gBrowser.selectedTab = tab;
  let browser = gBrowser.selectedBrowser;

  await BrowserTestUtils.waitForEvent(browser, "Initialized", true);
  if (browser.contentDocument.readyState !== "complete") {
    await BrowserTestUtils.waitForEvent(browser.contentWindow, "load");
  }
  await initialized;

  let doc = browser.contentDocument;
  let win = browser.contentWindow;

  is(
    win.gLastCategory.category,
    "panePrivacy",
    "gLastCategory.category is panePrivacy after legacy hash navigation"
  );
  is(doc.location.hash, "#privacy", "hash resolved to #privacy");

  BrowserTestUtils.removeTab(tab);
});

/**
 * general-migrate and general-migrate-autoclose route to the sync
 * pane and open the migration wizard via the paneshown listener.
 *
 * Requires identity.fxaccounts.enabled so that the sync nav button is visible.
 */
add_task(async function test_migration_wizard_dispatch() {
  if (!Services.prefs.getBoolPref("identity.fxaccounts.enabled")) {
    info("skipping: identity.fxaccounts.enabled is false");
    return;
  }

  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  for (let arg of ["general-migrate", "general-migrate-autoclose"]) {
    let initialized = TestUtils.topicObserved(
      "preferences-MaybeCategoriesInitializedSLOW"
    );

    let tab = await BrowserTestUtils.addTab(
      gBrowser,
      `about:preferences#${arg}`
    );
    gBrowser.selectedTab = tab;
    let browser = gBrowser.selectedBrowser;

    // Pre-register so we catch the event regardless of when the actor's
    // GetAvailableMigrators query resolves — removing the tab before
    // MigrationWizard:Ready fires destroys the actor mid-query.
    let migrationReady = BrowserTestUtils.waitForEvent(
      browser,
      "MigrationWizard:Ready",
      true
    );

    await BrowserTestUtils.waitForEvent(browser, "Initialized", true);
    if (browser.contentDocument.readyState !== "complete") {
      await BrowserTestUtils.waitForEvent(browser.contentWindow, "load");
    }
    await initialized;

    let doc = browser.contentDocument;

    await TestUtils.waitForCondition(
      () => doc.getElementById("migrationWizardDialog").open,
      `${arg}: migration wizard dialog opens`
    );
    await migrationReady;
    let win = browser.contentWindow;

    is(win.gLastCategory.category, "paneSync", `${arg}: routed to sync pane`);
    ok(
      doc.getElementById("migrationWizardDialog").open,
      `${arg}: migration wizard dialog is open`
    );

    BrowserTestUtils.removeTab(tab);
  }
});

/**
 * A paneXxx-prefixed name passed to openPreferences is normalised to
 * the friendly form.  The hash must be written without the "pane" prefix.
 */
add_task(async function test_paneXxx_prefix_normalization_end_to_end() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  let prefs = await openPreferencesViaOpenPreferencesAPI("paneSearch", {
    leaveOpen: true,
  });
  let doc = gBrowser.contentDocument;

  is(prefs.selectedPane, "paneSearch", "paneSearch routes to paneSearch");
  is(
    doc.location.hash,
    "#search",
    'hash is "#search", not "#paneSearch" — the pane prefix is stripped'
  );

  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
