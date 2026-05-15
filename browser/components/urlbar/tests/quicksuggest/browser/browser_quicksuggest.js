/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests browser quick suggestions.
 */

const REMOTE_SETTINGS_RESULTS = [
  QuickSuggestTestUtils.ampRemoteSettings({
    keywords: ["fra", "frab"],
    full_keywords: [["frab", 2]],
  }),
  QuickSuggestTestUtils.wikipediaRemoteSettings(),
];

const MERINO_NAVIGATIONAL_SUGGESTION = {
  url: "https://example.com/navigational-suggestion",
  title: "Navigational suggestion",
  provider: "top_picks",
  is_sponsored: false,
  score: 0.25,
  block_id: 0,
  is_top_pick: true,
};

const MERINO_DYNAMIC_WIKIPEDIA_SUGGESTION = {
  url: "https://example.com/dynamic-wikipedia",
  title: "Dynamic Wikipedia suggestion",
  click_url: "https://example.com/click",
  impression_url: "https://example.com/impression",
  advertiser: "dynamic-wikipedia",
  provider: "wikipedia",
  iab_category: "5 - Education",
  block_id: 1,
};

// Trying to avoid timeouts in TV mode.
requestLongerTimeout(5);

add_setup(async function () {
  await PlacesUtils.history.clear();
  await PlacesUtils.bookmarks.eraseEverything();
  await UrlbarTestUtils.formHistory.clear();

  let isAmp = suggestion => suggestion.iab_category == "22 - Shopping";
  await QuickSuggestTestUtils.ensureQuickSuggestInit({
    remoteSettingsRecords: [
      {
        collection: QuickSuggestTestUtils.RS_COLLECTION.AMP,
        type: QuickSuggestTestUtils.RS_TYPE.AMP,
        attachment: REMOTE_SETTINGS_RESULTS.filter(isAmp),
      },
      {
        collection: QuickSuggestTestUtils.RS_COLLECTION.OTHER,
        type: QuickSuggestTestUtils.RS_TYPE.WIKIPEDIA,
        attachment: REMOTE_SETTINGS_RESULTS.filter(s => !isAmp(s)),
      },
    ],
    merinoSuggestions: [],
  });

  // Disable Merino so we trigger only remote settings suggestions.
  UrlbarPrefs.set("quicksuggest.online.enabled", false);

  await SpecialPowers.pushPrefEnv({
    set: [["browser.urlbar.suggest.engines", false]],
  });
});

// Tests a non-sponsored result.
add_task(async function nonSponsored() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "wikipedia",
  });
  await QuickSuggestTestUtils.assertIsQuickSuggest({
    window,
    index: 1,
    isSponsored: false,
    url: "https://example.com/wikipedia",
  });

  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);
  Assert.ok(!row.hasAttribute("sponsored"));

  await UrlbarTestUtils.promisePopupClose(window);
});

// Tests sponsored priority feature.
add_task(async function sponsoredPriority() {
  const cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
    quickSuggestSponsoredPriority: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "fra",
  });
  await QuickSuggestTestUtils.assertIsQuickSuggest({
    window,
    index: 1,
    isSponsored: true,
    isBestMatch: true,
    url: "https://example.com/amp",
  });

  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);
  Assert.ok(row.hasAttribute("sponsored"));

  // Group label.
  let before = window.getComputedStyle(row, "::before");
  Assert.equal(before.content, "none", "::before.content is none");
  Assert.ok(!row.hasAttribute("label"), "Row should not have a group label");

  await UrlbarTestUtils.promisePopupClose(window);
  await cleanUpNimbus();
});

// Tests sponsored priority feature does not affect to non-sponsored suggestion.
add_task(async function sponsoredPriorityButNotSponsoredSuggestion() {
  const cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
    quickSuggestSponsoredPriority: true,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "wikipedia",
  });
  await QuickSuggestTestUtils.assertIsQuickSuggest({
    window,
    index: 1,
    isSponsored: false,
    url: "https://example.com/wikipedia",
  });

  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);
  let before = window.getComputedStyle(row, "::before");
  Assert.equal(before.content, "attr(label)", "::before.content is enabled");
  Assert.equal(
    row.getAttribute("label"),
    "Firefox Suggest",
    "Row has general group label for quick suggest"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await cleanUpNimbus();
});

// AMP should be a top pick when quickSuggestAmpTopPickCharThreshold is non-zero
// and the matched keyword/search string meets the threshold.
add_task(async function ampTopPickCharThreshold_meetsThreshold() {
  // Search with a non-full keyword just to make sure that doesn't prevent the
  // suggestion from being a top pick. "fra" is the query, "frab" is the full
  // keyword.
  let query = "fra";
  const cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
    quickSuggestAmpTopPickCharThreshold: query.length,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: query,
  });
  await QuickSuggestTestUtils.assertIsQuickSuggest({
    window,
    index: 1,
    isSponsored: true,
    isBestMatch: true,
    url: "https://example.com/amp",
  });

  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);

  // Group label.
  let before = window.getComputedStyle(row, "::before");
  Assert.equal(before.content, "none", "::before.content is none");
  Assert.ok(!row.hasAttribute("label"), "Row should not have a group label");

  await UrlbarTestUtils.promisePopupClose(window);
  await cleanUpNimbus();
});

// AMP should not be a top pick when quickSuggestAmpTopPickCharThreshold is
// non-zero and a typed non-full keyword falls below the threshold.
add_task(async function ampTopPickCharThreshold_belowThreshold() {
  // Search with a full keyword just to make sure that doesn't cause the
  // suggestion to be a top pick.
  let queryAndFullKeyword = "frab";
  const cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
    quickSuggestAmpTopPickCharThreshold: 100,
  });

  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: queryAndFullKeyword,
  });
  await QuickSuggestTestUtils.assertIsQuickSuggest({
    window,
    index: 1,
    isSponsored: true,
    url: "https://example.com/amp",
  });

  let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);
  Assert.ok(
    !row.querySelector(".urlbarView-title > strong"),
    "Since the full keyword was matched, the title shouldn't have any bold text"
  );

  // Group label.
  let before = window.getComputedStyle(row, "::before");
  Assert.equal(before.content, "attr(label)", "::before.content is enabled");
  Assert.equal(
    row.getAttribute("label"),
    "Firefox Suggest",
    "Row has 'Firefox Suggest' group label"
  );

  await UrlbarTestUtils.promisePopupClose(window);
  await cleanUpNimbus();
});

// Tests the "Manage" result menu for sponsored suggestion.
add_task(async function resultMenu_manage_sponsored() {
  await doManageTest({
    input: "fra",
    index: 1,
  });
});

// Tests the "Manage" result menu for non-sponsored suggestion.
add_task(async function resultMenu_manage_nonSponsored() {
  await doManageTest({
    input: "wikipedia",
    index: 1,
  });
});

// Tests the "Manage" result menu for Navigational suggestion.
add_task(async function resultMenu_manage_navigational() {
  // Enable Merino.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.quicksuggest.online.available", true],
      ["browser.urlbar.quicksuggest.online.enabled", true],
    ],
  });

  MerinoTestUtils.server.response.body.suggestions = [
    MERINO_NAVIGATIONAL_SUGGESTION,
  ];

  await doManageTest({
    input: "test",
    index: 1,
  });

  await SpecialPowers.popPrefEnv();
});

// Tests the "Manage" result menu for Dynamic Wikipedia suggestion.
add_task(async function resultMenu_manage_dynamicWikipedia() {
  // Enable Merino.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.quicksuggest.online.available", true],
      ["browser.urlbar.quicksuggest.online.enabled", true],
    ],
  });
  MerinoTestUtils.server.response.body.suggestions = [
    MERINO_DYNAMIC_WIKIPEDIA_SUGGESTION,
  ];

  await doManageTest({
    input: "test",
    index: 1,
  });

  await SpecialPowers.popPrefEnv();
});

// Tests the "Learn more" result menu.
add_task(async function resultMenu_learn_more_sponsored() {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window,
    value: "fra",
  });

  info("Selecting Learn more item from the result menu");
  let tabOpenPromise = BrowserTestUtils.waitForNewTab(
    gBrowser,
    Services.urlFormatter.formatURLPref("app.support.baseURL") +
      "awesome-bar-result-menu"
  );
  await UrlbarTestUtils.openResultMenuAndClickItem(window, "help", {
    resultIndex: 1,
  });
  info("Waiting for Learn more link to open in a new tab");
  await tabOpenPromise;
  gBrowser.removeCurrentTab();

  await UrlbarTestUtils.promisePopupClose(window);
});

// Tests icon size for AMP suggestion.
add_task(async function ampIconSize() {
  const TEST_DATA = [
    {
      topPick: true,
      useNovaIconSize: true,
      expected: 52,
    },
    {
      topPick: true,
      useNovaIconSize: false,
      expected: 28,
    },
    {
      topPick: false,
      useNovaIconSize: true,
      expected: 16,
    },
    {
      topPick: false,
      useNovaIconSize: false,
      expected: 16,
    },
  ];

  for (let { topPick, useNovaIconSize, expected } of TEST_DATA) {
    if (topPick) {
      UrlbarPrefs.set("quicksuggest.ampTopPickCharThreshold", 1);
    }

    const cleanUpNimbus = await UrlbarTestUtils.initNimbusFeature({
      quickSuggestAmpTopPickUseNovaIconSize: useNovaIconSize,
    });

    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: "fra",
    });

    let row = await UrlbarTestUtils.waitForAutocompleteResultAt(window, 1);
    let icon = row.querySelector(".urlbarView-favicon");
    Assert.equal(icon.getAttribute("icon-size"), expected);

    await UrlbarTestUtils.promisePopupClose(window);
    await cleanUpNimbus();
    UrlbarPrefs.clear("quicksuggest.ampTopPickCharThreshold");
  }
});
