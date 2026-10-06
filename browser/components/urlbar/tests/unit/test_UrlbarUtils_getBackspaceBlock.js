/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests UrlbarUtils.trackBackspaceBlock / getBackspaceBlock, focusing on
// per-level storage (origin vs. url), consumption semantics, and
// _BACKSPACE_BLOCK_MAX_AGE_HOURS expiration behavior.

"use strict";

const ORIGIN_URL = "https://example.com/";
const PAGE_URL = "https://example.com/some/page";

const LEVELS = [
  { url: ORIGIN_URL, level: "origin", key: "origin:example.com" },
  { url: PAGE_URL, level: "url", key: "page:example.com" },
];

function setStoredTimestamp(key, timestamp) {
  let entry = UrlbarUtils._backspaceBlocks.get(key);
  Assert.ok(entry, `Entry should exist for ${key}`);
  entry.blockedAt = timestamp;
}

function clearAllBlocks() {
  UrlbarUtils._backspaceBlocks.clear();
}

registerCleanupFunction(clearAllBlocks);

async function triggerBlock(url) {
  await PlacesTestUtils.addVisits(url);
  for (let i = 0; i < UrlbarPrefs.get("autoFill.backspaceThreshold"); i++) {
    await UrlbarUtils.recordAutofillBackspace(url);
  }
}

add_task(async function block_is_returned_and_consumed() {
  for (let { url, level, key } of LEVELS) {
    clearAllBlocks();
    await triggerBlock(url);

    let result = UrlbarUtils.getBackspaceBlock(url);
    Assert.equal(result.level, level, `${url} should produce ${level} level`);
    Assert.greater(result.blockedAt, 0, "blockedAt should be above 0");

    // Try getting the result again: It should have been consumed.
    Assert.equal(
      UrlbarUtils.getBackspaceBlock(url),
      null,
      "Result was consumed"
    );
    Assert.ok(
      !UrlbarUtils._backspaceBlocks.has(key),
      "Entry is dropped once blockedAt is consumed"
    );
  }

  await PlacesUtils.history.clear();
});

add_task(async function expired_block_returns_null_and_is_consumed() {
  for (let { url, level, key } of LEVELS) {
    clearAllBlocks();
    await triggerBlock(url);

    // Backdate the stored timestamp past the max age threshold.
    let maxAgeMs = UrlbarUtils._BACKSPACE_BLOCK_MAX_AGE_HOURS * 60 * 60 * 1000;
    setStoredTimestamp(key, Date.now() - maxAgeMs - 1000);

    Assert.equal(
      UrlbarUtils.getBackspaceBlock(url),
      null,
      `Stale ${level} block beyond _BACKSPACE_BLOCK_MAX_AGE_HOURS should return null`
    );
  }

  await PlacesUtils.history.clear();
});

add_task(async function retracking_refreshes_expiration() {
  for (let { url, level, key } of LEVELS) {
    clearAllBlocks();
    await triggerBlock(url);

    // Backdate so a getBackspaceBlock call right now would return null.
    let maxAgeMs = UrlbarUtils._BACKSPACE_BLOCK_MAX_AGE_HOURS * 60 * 60 * 1000;
    setStoredTimestamp(key, Date.now() - maxAgeMs - 1000);

    // Re-track. This should overwrite the stale timestamp with a fresh one.
    await triggerBlock(url);

    let result = UrlbarUtils.getBackspaceBlock(url);
    Assert.ok(
      result,
      `After retracking, the ${level} block should be considered fresh again`
    );
    Assert.equal(result.level, level);
  }

  await PlacesUtils.history.clear();
});

add_task(async function origin_and_url_blocks_coexist() {
  clearAllBlocks();
  await triggerBlock(ORIGIN_URL);
  await triggerBlock(PAGE_URL);

  // Querying the page URL should return the url-level block, and consuming
  // it should leave the origin-level block intact.
  let pageResult = UrlbarUtils.getBackspaceBlock(PAGE_URL);
  Assert.equal(pageResult.level, "url", "Page URL should produce url level");
  Assert.greater(pageResult.blockedAt, 0, "Page blockedAt should be above 0");
  Assert.equal(
    UrlbarUtils.getBackspaceBlock(PAGE_URL),
    null,
    "Page-level block was consumed"
  );

  let originResult = UrlbarUtils.getBackspaceBlock(ORIGIN_URL);
  Assert.equal(
    originResult.level,
    "origin",
    "Origin URL should produce origin level"
  );
  Assert.greater(
    originResult.blockedAt,
    0,
    "Origin blockedAt should be above 0"
  );
  Assert.equal(
    UrlbarUtils.getBackspaceBlock(ORIGIN_URL),
    null,
    "Origin-level block was consumed"
  );

  await PlacesUtils.history.clear();
});
