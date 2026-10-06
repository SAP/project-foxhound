/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const { matchDomains, mergeDedupe } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/SearchBrowsingHistoryDomainBoost.sys.mjs"
);

add_task(async function test_matchDomains_games_and_boundary_behavior() {
  // Positive: should match games category
  const domains = matchDomains("video games");
  Assert.ok(
    domains?.includes("store.steampowered.com"),
    "Should include store.steampowered.com for games"
  );

  // Negative: should not match substrings inside words ("endgame" should not trigger "game")
  const domains2 = matchDomains("endgame");
  Assert.equal(domains2, null, "Should not match 'game' inside 'endgame'");
});

add_task(async function test_matchDomains_prefers_longer_phrases() {
  // "tech news" should match tech_news (not generic news)
  const domains = matchDomains("tech news");
  Assert.ok(
    domains?.includes("techcrunch.com"),
    "Should match tech_news domains"
  );
  Assert.ok(
    !domains.includes("reuters.com"),
    "Should not fall back to generic news domains"
  );
});

add_task(async function test_mergeDedupe_semantic_first_then_topup() {
  const primary = [
    { id: 1, url: "https://example.com/a", title: "A" },
    { id: 2, url: "https://example.com/b", title: "B" },
  ];
  const secondary = [
    { id: 3, url: "https://example.com/b", title: "B dup" }, // dup by url
    { id: 4, url: "https://example.com/c", title: "C" },
  ];

  const out = mergeDedupe(primary, secondary, 10);
  Assert.deepEqual(
    out.map(r => r.url),
    ["https://example.com/a", "https://example.com/b", "https://example.com/c"],
    "Should keep primary order and de-dupe by url"
  );
});
