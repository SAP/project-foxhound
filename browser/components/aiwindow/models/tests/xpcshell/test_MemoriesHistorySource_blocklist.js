/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

do_get_profile();

const { getRecentHistory, _setBlockListManagerForTesting } =
  ChromeUtils.importESModule(
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesHistorySource.sys.mjs"
  );

registerCleanupFunction(async () => {
  _setBlockListManagerForTesting(null);
  await PlacesUtils.history.clear();
});

/**
 * Test blocking word present in history title
 */
add_task(async function test_getRecentHistory_filters_blocked_titles() {
  // using stub to block anything containing "blockme" as a whole word boundary.
  _setBlockListManagerForTesting({
    matchAtWordBoundary: ({ text }) => /\bblockme\b/.test(text),
    matchAnywhere: () => false,
  });

  await PlacesUtils.history.insertMany([
    {
      url: "https://example.com/a",
      title: "hello blockme world",
      visits: [{ date: new Date() }],
    },
    {
      url: "https://example.com/b",
      title: "hello normal world",
      visits: [{ date: new Date() }],
    },
  ]);

  const rows = await getRecentHistory({ sinceMicros: 0, maxResults: 50 });

  Assert.greaterOrEqual(rows.length, 1, "Should return at least one row");
  Assert.ok(
    !rows.some(r => r.url === "https://example.com/a"),
    "Blocked title visit should be filtered"
  );
  Assert.ok(
    rows.some(r => r.url === "https://example.com/b"),
    "Non-blocked visit should be present"
  );
});
