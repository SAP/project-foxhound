/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineLazyGetter(this, "PlacesFrecencyRecalculator", () => {
  return Cc["@mozilla.org/places/frecency-recalculator;1"].getService(
    Ci.nsIObserver
  ).wrappedJSObject;
});

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/head-common.js",
  this
);

function resetBackspaceState() {
  UrlbarUtils._backspaceBlocks.clear();
}

async function seedAdaptiveHistory(url, input, useCount = 3) {
  resetBackspaceState();
  // A typed visit is important because it will generate the possibility for
  // origins autofill to trigger for the URL.
  await PlacesTestUtils.addVisits({
    url,
    transition: PlacesUtils.history.TRANSITION_TYPED,
  });
  await PlacesFrecencyRecalculator.recalculateAnyOutdatedFrecencies();

  await PlacesUtils.withConnectionWrapper("seedAdaptiveHistory", async db => {
    await db.executeCached(
      `
      INSERT OR REPLACE INTO moz_inputhistory (place_id, input, use_count)
      SELECT id, :input, :useCount
      FROM moz_places
      WHERE url_hash = hash(:url) AND url = :url
      `,
      { url, input: input.toLowerCase(), useCount }
    );
  });
}

async function getOriginBlockState(url) {
  let originId = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "origin_id",
    { url }
  );
  if (!originId) {
    return null;
  }
  let blockUntilMs = await PlacesTestUtils.getDatabaseValue(
    "moz_origins",
    "block_until_ms",
    { id: originId }
  );
  let blockPagesUntilMs = await PlacesTestUtils.getDatabaseValue(
    "moz_origins",
    "block_pages_until_ms",
    { id: originId }
  );
  return {
    blockUntilMs: blockUntilMs ?? 0,
    blockPagesUntilMs: blockPagesUntilMs ?? 0,
  };
}

async function backspaces(
  n,
  input = "exam",
  win = window,
  key = "KEY_Backspace"
) {
  for (let i = 0; i < n; i++) {
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window: win,
      value: input,
    });
    EventUtils.synthesizeKey(key, {}, win);
    await UrlbarTestUtils.promiseSearchComplete(win);
    await UrlbarTestUtils.promisePopupClose(win);
  }
  // The input handler fires recordAutofillBackspace() without awaiting it.
  // Wait for the most recent invocation's DB write to settle so callers can
  // read block state without racing.
  await UrlbarUtils._lastRecordAutofillBackspacePromise;
}

async function adaptiveAutofillSetup() {
  await PlacesUtils.history.clear();
  await PlacesUtils.bookmarks.eraseEverything();

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.urlbar.autoFill", true],
      ["browser.urlbar.autoFill.adaptiveHistory.enabled", true],
      ["browser.urlbar.autoFill.adaptiveHistory.minCharsThreshold", 0],
      ["browser.urlbar.autoFill.adaptiveHistory.useCountThreshold", 0],
    ],
  });

  registerCleanupFunction(async () => {
    await PlacesUtils.history.clear();
    await PlacesTestUtils.clearInputHistory();
  });
}

registerCleanupFunction(async () => {
  await UrlbarTestUtils.promisePopupClose(window);
});
