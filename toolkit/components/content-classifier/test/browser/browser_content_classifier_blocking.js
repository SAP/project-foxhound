"use strict";

add_task(async function test_blocking() {
  let listsLoaded = TestUtils.topicObserved(LISTS_LOADED_TOPIC);
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.content.testing", true],
      ["privacy.trackingprotection.content.protection.enabled", true],
      [
        "privacy.trackingprotection.content.protection.test_list_urls",
        BLOCK_LIST_URL,
      ],
      ["privacy.trackingprotection.content.protection.engines", "test_block"],
      ["privacy.trackingprotection.content.annotation.enabled", false],
      ["privacy.trackingprotection.content.annotation.test_list_urls", ""],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = tab.linkedBrowser;
  await listsLoaded;

  let imageURL =
    TEST_BLOCKED_3RD_PARTY_DOMAIN +
    "browser/toolkit/components/antitracking/test/browser/raptor.jpg?" +
    Math.random();

  let loaded = await SpecialPowers.spawn(browser, [imageURL], async url => {
    let img = new content.Image();
    img.src = url;
    return new content.Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  });
  ok(!loaded, "Third-party image from example.org should be blocked");

  let log = JSON.parse(await browser.getContentBlockingLog());
  let origin = TEST_BLOCKED_3RD_PARTY_DOMAIN.replace(/\/$/, "");
  ok(log[origin], "Content blocking log has entry for " + origin);
  if (log[origin]) {
    is(
      log[origin][0][0],
      Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
      "Entry has the STATE_BLOCKED_TRACKING_CONTENT flag"
    );
    is(log[origin][0][1], true, "Entry is marked as blocked");
  }

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_replace() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.content.testing", true],
      ["privacy.trackingprotection.content.protection.enabled", true],
      [
        "privacy.trackingprotection.content.protection.test_list_urls",
        BLOCK_LIST_URL,
      ],
      ["privacy.trackingprotection.content.annotation.enabled", false],
      ["privacy.trackingprotection.content.annotation.test_list_urls", ""],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = tab.linkedBrowser;

  let imageURL =
    TEST_BLOCKED_3RD_PARTY_DOMAIN +
    "browser/toolkit/components/antitracking/test/browser/raptor.jpg?" +
    Math.random();

  let replacePromise = UrlClassifierTestUtils.handleBeforeBlockChannel({
    filterOrigin: TEST_BLOCKED_3RD_PARTY_DOMAIN.replace(/\/$/, ""),
    action: "replace",
  });

  let loaded = await SpecialPowers.spawn(browser, [imageURL], async url => {
    let img = new content.Image();
    img.src = url;
    return new content.Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  });
  ok(loaded, "Third-party image should not be cancelled when replaced");

  await replacePromise;

  let log = JSON.parse(await browser.getContentBlockingLog());
  let origin = TEST_BLOCKED_3RD_PARTY_DOMAIN.replace(/\/$/, "");
  ok(log[origin], "Content blocking log has entry for " + origin);
  if (log[origin]) {
    let replacedEntry = log[origin].find(
      entry =>
        entry[0] == Ci.nsIWebProgressListener.STATE_REPLACED_TRACKING_CONTENT
    );
    ok(replacedEntry, "Entry has the STATE_REPLACED_TRACKING_CONTENT flag");
    if (replacedEntry) {
      is(replacedEntry[1], true, "Entry is marked as blocked (replaced)");
    }
  }

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_allow() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.content.testing", true],
      ["privacy.trackingprotection.content.protection.enabled", true],
      [
        "privacy.trackingprotection.content.protection.test_list_urls",
        BLOCK_LIST_URL,
      ],
      ["privacy.trackingprotection.content.annotation.enabled", false],
      ["privacy.trackingprotection.content.annotation.test_list_urls", ""],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = tab.linkedBrowser;

  let imageURL =
    TEST_BLOCKED_3RD_PARTY_DOMAIN +
    "browser/toolkit/components/antitracking/test/browser/raptor.jpg?" +
    Math.random();

  let allowPromise = UrlClassifierTestUtils.handleBeforeBlockChannel({
    filterOrigin: TEST_BLOCKED_3RD_PARTY_DOMAIN.replace(/\/$/, ""),
    action: "allow",
  });

  let loaded = await SpecialPowers.spawn(browser, [imageURL], async url => {
    let img = new content.Image();
    img.src = url;
    return new content.Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  });
  ok(loaded, "Third-party image should not be cancelled when allowed");

  await allowPromise;

  let log = JSON.parse(await browser.getContentBlockingLog());
  let origin = TEST_BLOCKED_3RD_PARTY_DOMAIN.replace(/\/$/, "");
  ok(log[origin], "Content blocking log has entry for " + origin);
  if (log[origin]) {
    let allowedEntry = log[origin].find(
      entry =>
        entry[0] == Ci.nsIWebProgressListener.STATE_ALLOWED_TRACKING_CONTENT
    );
    ok(allowedEntry, "Entry has the STATE_ALLOWED_TRACKING_CONTENT flag");
    if (allowedEntry) {
      is(allowedEntry[1], false, "Entry is not marked as blocked (allowed)");
    }
  }

  BrowserTestUtils.removeTab(tab);
});

add_task(async function test_allowlist_skips_blocking() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.content.testing", true],
      ["privacy.trackingprotection.content.protection.enabled", true],
      [
        "privacy.trackingprotection.content.protection.test_list_urls",
        BLOCK_LIST_URL,
      ],
      ["privacy.trackingprotection.content.annotation.enabled", false],
      ["privacy.trackingprotection.content.annotation.test_list_urls", ""],
    ],
  });

  // Put the top-level page's site on the content blocking allow list. The
  // resulting cookieJarSettings is inherited by all subresource channels, so
  // IsAllowListed returns true for the third-party image below.
  let topLevelOrigin = TEST_DOMAIN.replace(/\/$/, "");
  await SpecialPowers.addPermission(
    "trackingprotection",
    Services.perms.ALLOW_ACTION,
    { url: topLevelOrigin }
  );

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = tab.linkedBrowser;

  let imageURL =
    TEST_BLOCKED_3RD_PARTY_DOMAIN +
    "browser/toolkit/components/antitracking/test/browser/raptor.jpg?" +
    Math.random();

  info("Loading image from " + imageURL);
  let loaded = await SpecialPowers.spawn(browser, [imageURL], async url => {
    let img = new content.Image();
    img.src = url;
    return new content.Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  });
  ok(
    loaded,
    "Third-party image should load when the top-level page is on the " +
      "content blocking allow list"
  );

  let log = JSON.parse(await browser.getContentBlockingLog());
  let origin = TEST_BLOCKED_3RD_PARTY_DOMAIN.replace(/\/$/, "");
  if (log[origin]) {
    let blockedEntry = log[origin].find(
      entry =>
        entry[0] == Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT
    );
    ok(
      !blockedEntry,
      "No STATE_BLOCKED_TRACKING_CONTENT entry should be logged for " +
        "allowlisted channels"
    );
  }

  BrowserTestUtils.removeTab(tab);
  await SpecialPowers.removePermission("trackingprotection", {
    url: topLevelOrigin,
  });
});

add_task(async function test_annotation() {
  let listsLoaded = TestUtils.topicObserved(LISTS_LOADED_TOPIC);

  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.content.testing", true],
      ["privacy.trackingprotection.content.protection.enabled", false],
      ["privacy.trackingprotection.content.protection.test_list_urls", ""],
      ["privacy.trackingprotection.content.annotation.enabled", true],
      [
        "privacy.trackingprotection.content.annotation.test_list_urls",
        ANNOTATE_LIST_URL,
      ],
      [
        "privacy.trackingprotection.content.annotation.engines",
        "test_annotate",
      ],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = tab.linkedBrowser;

  await listsLoaded;
  BrowserTestUtils.startLoadingURIString(browser, TEST_TOP_PAGE);
  await BrowserTestUtils.browserLoaded(browser);

  let imageURL =
    TEST_ANNOTATED_3RD_PARTY_DOMAIN +
    "browser/toolkit/components/antitracking/test/browser/raptor.jpg?" +
    Math.random();

  let loaded = await SpecialPowers.spawn(browser, [imageURL], async url => {
    let img = new content.Image();
    img.src = url;
    return new content.Promise(resolve => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  });
  ok(loaded, "Third-party image from example.org should NOT be blocked");

  let log = JSON.parse(await browser.getContentBlockingLog());
  let origin = TEST_ANNOTATED_3RD_PARTY_DOMAIN.replace(/\/$/, "");
  ok(log[origin], "Content blocking log has annotation entry for " + origin);
  if (log[origin]) {
    is(
      log[origin][0][0],
      Ci.nsIWebProgressListener.STATE_LOADED_LEVEL_1_TRACKING_CONTENT,
      "Entry has the STATE_LOADED_LEVEL_1_TRACKING_CONTENT flag"
    );
    is(log[origin][0][1], true, "Entry is marked as loaded");
  }

  BrowserTestUtils.removeTab(tab);
});

// Clearing test_list_urls after a non-empty value must drop the
// installed engine, so previously-blocked third parties load again.
// Exercises the empty-rules path through InstallEngineFromRules
// (mEngines.Remove for the test_block feature).
add_task(async function test_clearing_test_list_urls_drops_engine() {
  let listsLoaded = TestUtils.topicObserved(LISTS_LOADED_TOPIC);
  await SpecialPowers.pushPrefEnv({
    set: [
      ["privacy.trackingprotection.content.testing", true],
      ["privacy.trackingprotection.content.protection.enabled", true],
      [
        "privacy.trackingprotection.content.protection.test_list_urls",
        BLOCK_LIST_URL,
      ],
      ["privacy.trackingprotection.content.protection.engines", "test_block"],
      ["privacy.trackingprotection.content.annotation.enabled", false],
      ["privacy.trackingprotection.content.annotation.test_list_urls", ""],
    ],
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_TOP_PAGE
  );
  let browser = tab.linkedBrowser;
  await listsLoaded;

  await assertImageBlocked(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org blocked with non-empty test_list_urls"
  );

  // Clear the test_list_urls pref. OnPrefChange calls LoadFilterLists,
  // which fetches nothing, installs empty rules, and drops the engine
  // for "test_block" from mEngines. The lists-loaded notification must
  // still fire so this wait doesn't hang.
  let listsCleared = TestUtils.topicObserved(LISTS_LOADED_TOPIC);
  await SpecialPowers.pushPrefEnv({
    set: [["privacy.trackingprotection.content.protection.test_list_urls", ""]],
  });
  await listsCleared;

  BrowserTestUtils.startLoadingURIString(browser, TEST_TOP_PAGE);
  await BrowserTestUtils.browserLoaded(browser);

  await assertImageLoaded(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org no longer blocked after clearing test_list_urls"
  );

  BrowserTestUtils.removeTab(tab);
});
