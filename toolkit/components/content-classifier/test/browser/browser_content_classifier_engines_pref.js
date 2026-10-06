"use strict";

// Tests for the per-mode engine selection prefs added in Bug 2035584:
//   privacy.trackingprotection.content.protection.engines
//   privacy.trackingprotection.content.protection.engines.pbmode
//   privacy.trackingprotection.content.annotation.engines
//   privacy.trackingprotection.content.annotation.engines.pbmode
//
// These prefs take comma-separated feature names from the static feature
// table in ContentClassifierService.cpp. The matching engine is built from
// the union of rules in the feature's mListIds, and used at classify time
// based on the channel's PBM-ness and the protection-vs-annotation phase.

// "trackers" feature reads rules from RS list "disconnect-tracker-base"
// (see kFeatures table in ContentClassifierService.cpp). With protection.
// engines = "trackers" set, a matching third-party image should be blocked.
add_task(async function test_engines_pref_blocks_matching_feature() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
  ]);

  await pushEnginePrefs({ protection: "trackers" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org blocked by trackers feature via engines pref"
  );
});

// A feature that is referenced only by .engines.pbmode (and NOT by .engines)
// must NOT block in a non-PBM channel.
add_task(async function test_pbm_pref_does_not_affect_non_pbm() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
  ]);

  await pushEnginePrefs({ pbmProtection: "trackers" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageLoaded(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "Non-PBM channel not affected by pbmode engines pref"
  );
  await assertLacksBlockingState(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    "Non-PBM channel: no STATE_BLOCKED_TRACKING_CONTENT from pbmode-only pref"
  );
});

// A feature that is referenced only by .engines.pbmode SHOULD block on a
// PBM channel even when .engines (non-PBM) is empty.
add_task(async function test_pbm_pref_blocks_in_private_window() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
  ]);

  await pushEnginePrefs({ pbmProtection: "trackers" });

  // Sync data while a tab exists so the RS client initializes and stores
  // the filter list data — necessary because GetInstance() only runs on
  // a real channel classification.
  let tab = await openTestTab();
  await syncAndWaitForLists(client, records);
  BrowserTestUtils.removeTab(tab);

  let privateTab = await openPrivateTab();
  let pbmBrowser = privateTab.linkedBrowser;

  await assertImageBlocked(
    pbmBrowser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org blocked in PBM via engines.pbmode pref"
  );

  await assertHasBlockingState(
    pbmBrowser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    "PBM log carries STATE_BLOCKED_TRACKING_CONTENT"
  );
});

// Independence of the two protection engines prefs: setting different
// features in .engines vs .engines.pbmode must result in non-PBM channels
// applying only the non-PBM set and PBM channels applying only the PBM
// set. This catches a regression that wired both prefs to the same value.
add_task(async function test_pbm_pref_uses_different_feature_than_non_pbm() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
    {
      id: "fingerprinters",
      name: "disconnect-fingerprinters-base",
      rules: ["||example.com^"],
    },
  ]);

  await pushEnginePrefs({
    protection: "fingerprinters",
    pbmProtection: "trackers",
  });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageLoaded(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "Non-PBM: example.org loads (trackers is PBM-only)"
  );
  await assertImageBlocked(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "Non-PBM: example.com blocked by fingerprinters"
  );

  BrowserTestUtils.removeTab(tab);

  let privateTab = await openPrivateTab();
  let pbmBrowser = privateTab.linkedBrowser;

  await assertImageBlocked(
    pbmBrowser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "PBM: example.org blocked by trackers (pbmode-only)"
  );
  await assertImageLoaded(
    pbmBrowser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "PBM: example.com loads (fingerprinters is non-PBM-only)"
  );
});

// engines pref controls blocking phase; annotation phase should not pick
// up features from the protection.engines pref.
add_task(async function test_engines_pref_phase_separation() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
    {
      id: "fingerprinters",
      name: "disconnect-fingerprinters-base",
      rules: ["||example.com^"],
    },
  ]);

  await pushEnginePrefs({
    protection: "trackers",
    annotation: "fingerprinters",
  });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org blocked (trackers in protection.engines)"
  );
  await assertImageLoaded(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "example.com not blocked (fingerprinters only in annotation)"
  );
});

// Unknown feature names should be ignored (logged and skipped), not
// crash; known feature alongside unknown should still block.
add_task(async function test_engines_pref_unknown_feature_ignored() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
  ]);

  await pushEnginePrefs({ protection: "not-a-real-feature, trackers" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "Unknown feature ignored, known feature still blocks"
  );
});

// Multiple feature names in a single engines pref should each block their
// respective domains.
add_task(async function test_multiple_features_in_engines_pref() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
    {
      id: "fingerprinters",
      name: "disconnect-fingerprinters-base",
      rules: ["||example.com^"],
    },
  ]);

  await pushEnginePrefs({ protection: "trackers,fingerprinters" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org blocked by trackers feature"
  );
  await assertImageBlocked(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "example.com blocked by fingerprinters feature"
  );
});

// Per-feature attribution: each feature in kFeatures advertises its own
// mClassificationFlag / mLoadedState / mReplacedState / mAllowedState /
// mBlockingErrorCode. This block drives one feature at a time in either
// annotation or protection phase and asserts that the corresponding
// state value reaches the content blocking log via MaybeAnnotateChannel /
// MaybeCancelChannel.

async function runAttribution({ listName, feature, expectedState, phase }) {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    { id: "attr", name: listName, rules: ["||example.com^"] },
  ]);

  await pushEnginePrefs(
    phase === "annotate" ? { annotation: feature } : { protection: feature }
  );

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  if (phase === "annotate") {
    await assertImageLoaded(
      browser,
      TEST_ANNOTATED_3RD_PARTY_DOMAIN,
      `example.com not blocked via annotation-only feature ${feature}`
    );
  } else {
    await assertImageBlocked(
      browser,
      TEST_ANNOTATED_3RD_PARTY_DOMAIN,
      `example.com blocked via feature ${feature}`
    );
  }

  await assertHasBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    expectedState,
    `log carries expected state ${expectedState} for ${feature}`
  );
}

// email-trackers is intentionally omitted from the annotate set:
// ChannelClassifierUtils::AnnotateChannel only writes a content-blocking-log
// entry when the classification flag is in CLASSIFIED_ANY_BASIC_TRACKING (or
// is a cryptomining flag). CLASSIFIED_EMAILTRACKING is in neither, so the
// log path is not testable via getContentBlockingLog() for this feature.
// SetClassificationFlagsHelper still tags the channel; that's a separate
// observable that this suite doesn't currently cover.
const ATTRIBUTION_CASES = [
  {
    phase: "annotate",
    feature: "trackers-content",
    listName: "disconnect-tracker-content",
    expectedState:
      Ci.nsIWebProgressListener.STATE_LOADED_LEVEL_2_TRACKING_CONTENT,
  },
  {
    phase: "annotate",
    feature: "social-trackers",
    listName: "mozilla-social",
    expectedState:
      Ci.nsIWebProgressListener.STATE_LOADED_SOCIALTRACKING_CONTENT,
  },
  {
    phase: "annotate",
    feature: "fingerprinters",
    listName: "disconnect-fingerprinters-base",
    expectedState:
      Ci.nsIWebProgressListener.STATE_LOADED_FINGERPRINTING_CONTENT,
  },
  {
    phase: "annotate",
    feature: "cryptominers",
    listName: "disconnect-cryptominer-base",
    expectedState: Ci.nsIWebProgressListener.STATE_LOADED_CRYPTOMINING_CONTENT,
  },
  {
    phase: "block",
    feature: "fingerprinters",
    listName: "disconnect-fingerprinters-base",
    expectedState:
      Ci.nsIWebProgressListener.STATE_BLOCKED_FINGERPRINTING_CONTENT,
  },
  {
    phase: "block",
    feature: "cryptominers",
    listName: "disconnect-cryptominer-base",
    expectedState: Ci.nsIWebProgressListener.STATE_BLOCKED_CRYPTOMINING_CONTENT,
  },
  {
    phase: "block",
    feature: "social-trackers",
    listName: "mozilla-social",
    expectedState:
      Ci.nsIWebProgressListener.STATE_BLOCKED_SOCIALTRACKING_CONTENT,
  },
  {
    phase: "block",
    feature: "trackers",
    listName: "disconnect-tracker-base",
    expectedState: Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
  },
];

for (let c of ATTRIBUTION_CASES) {
  add_task({ name: `test_attr_${c.feature}_${c.phase}` }, () =>
    runAttribution(c)
  );
}

// Replace/allow attribution: a feature's mReplacedState / mAllowedState
// reach the log when the channel-cancel intercept rewrites the outcome.
async function runAttributionReplaceOrAllow({
  feature,
  listName,
  action,
  expectedState,
  expectedMarkedBlocked,
}) {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    { id: "attr", name: listName, rules: ["||example.com^"] },
  ]);

  await pushEnginePrefs({ protection: feature });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  let interceptPromise = UrlClassifierTestUtils.handleBeforeBlockChannel({
    filterOrigin: TEST_ANNOTATED_3RD_PARTY_DOMAIN.replace(/\/$/, ""),
    action,
  });

  await assertImageLoaded(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    `example.com should load (intercept=${action}) via ${feature}`
  );

  await interceptPromise;

  let entry = await assertHasBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    expectedState,
    `log carries expected state ${expectedState} for ${feature}`
  );
  is(
    entry[1],
    expectedMarkedBlocked,
    `entry blocked-flag matches intercept action ${action}`
  );
}

add_task(async function test_attr_fingerprinters_replace() {
  await runAttributionReplaceOrAllow({
    feature: "fingerprinters",
    listName: "disconnect-fingerprinters-base",
    action: "replace",
    expectedState:
      Ci.nsIWebProgressListener.STATE_REPLACED_FINGERPRINTING_CONTENT,
    expectedMarkedBlocked: true,
  });
});

add_task(async function test_attr_fingerprinters_allow() {
  await runAttributionReplaceOrAllow({
    feature: "fingerprinters",
    listName: "disconnect-fingerprinters-base",
    action: "allow",
    expectedState:
      Ci.nsIWebProgressListener.STATE_ALLOWED_FINGERPRINTING_CONTENT,
    expectedMarkedBlocked: false,
  });
});

// Multi-engine aggregation in the block phase: two features match the same
// URL. Only one wins the cancel (the first in kFeatures iteration order
// whose mBlockingErrorCode != NS_OK), so we deliberately do not assert
// STATE_BLOCKED_FINGERPRINTING_CONTENT here.
add_task(async function test_multi_engine_aggregation_block() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
    {
      id: "fingerprinters",
      name: "disconnect-fingerprinters-base",
      rules: ["||example.org^"],
    },
  ]);

  await pushEnginePrefs({ protection: "trackers,fingerprinters" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    "example.org blocked when both features match"
  );

  await assertHasBlockingState(
    browser,
    TEST_BLOCKED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    "trackers wins the cancel (earlier in kFeatures iteration order)"
  );
});

// Multi-engine aggregation in the annotate phase: MaybeAnnotateChannel
// iterates every matched feature, so the log should carry both flags.
add_task(async function test_multi_engine_aggregation_annotate() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.com^"],
    },
    {
      id: "fingerprinters",
      name: "disconnect-fingerprinters-base",
      rules: ["||example.com^"],
    },
  ]);

  await pushEnginePrefs({ annotation: "trackers,fingerprinters" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageLoaded(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "example.com loads (annotation phase only)"
  );

  await assertHasBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_LOADED_LEVEL_1_TRACKING_CONTENT,
    "annotate log carries STATE_LOADED_LEVEL_1_TRACKING_CONTENT"
  );
  await assertHasBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_LOADED_FINGERPRINTING_CONTENT,
    "annotate log carries STATE_LOADED_FINGERPRINTING_CONTENT"
  );
});

// The content blocking allow-list (trackingprotection permission on the
// top-level origin) should suppress cancellation regardless of how many
// features match the third-party resource.
add_task(async function test_allowlist_skips_multifeature_blocking() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.org^"],
    },
    {
      id: "fingerprinters",
      name: "disconnect-fingerprinters-base",
      rules: ["||example.org^"],
    },
  ]);

  await pushEnginePrefs({ protection: "trackers,fingerprinters" });

  let topLevelOrigin = TEST_DOMAIN.replace(/\/$/, "");
  await SpecialPowers.addPermission(
    "trackingprotection",
    Services.perms.ALLOW_ACTION,
    { url: topLevelOrigin }
  );

  try {
    let tab = await openTestTab();
    let browser = tab.linkedBrowser;
    await syncAndWaitForLists(client, records);

    await assertImageLoaded(
      browser,
      TEST_BLOCKED_3RD_PARTY_DOMAIN,
      "allowlisted top-level page should not cancel example.org"
    );

    await assertLacksBlockingState(
      browser,
      TEST_BLOCKED_3RD_PARTY_DOMAIN,
      Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
      "no STATE_BLOCKED_TRACKING_CONTENT for allowlisted page"
    );
    await assertLacksBlockingState(
      browser,
      TEST_BLOCKED_3RD_PARTY_DOMAIN,
      Ci.nsIWebProgressListener.STATE_BLOCKED_FINGERPRINTING_CONTENT,
      "no STATE_BLOCKED_FINGERPRINTING_CONTENT for allowlisted page"
    );
  } finally {
    await SpecialPowers.removePermission("trackingprotection", {
      url: topLevelOrigin,
    });
  }
});

// Exception semantics: when an exception feature carries an
// `@@||example.com^` allowlist rule and a separate blocking feature
// carries `||example.com^`, the aggregated ContentClassifierResult's
// status is promoted to Exception (which ranks above Hit), so
// MaybeCancelChannel's `aResult.Hit()` returns false and the channel
// is never cancelled. Since Bug 2041805 the blocking feature must be
// listed before the exception feature for the exception engine to see
// the propagated matched_rule.
async function runExceptionAllowsBlocker({
  exceptionFeature,
  exceptionListName,
}) {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    { id: "exception", name: exceptionListName, rules: ["@@||example.com^"] },
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.com^"],
    },
  ]);

  await pushEnginePrefs({ protection: `trackers,${exceptionFeature}` });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageLoaded(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    `${exceptionFeature} exception rule allows example.com against trackers`
  );

  await assertLacksBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    `${exceptionFeature} allowlist suppresses STATE_BLOCKED_TRACKING_CONTENT`
  );
}

add_task(async function test_minor_exceptions_allows_blocker() {
  await runExceptionAllowsBlocker({
    exceptionFeature: "minor-exceptions",
    exceptionListName: "mozilla-minor-exceptions",
  });
});

add_task(async function test_major_exceptions_allows_blocker() {
  await runExceptionAllowsBlocker({
    exceptionFeature: "major-exceptions",
    exceptionListName: "mozilla-major-exceptions",
  });
});

// Bug 2041805: matched_rule is threaded across engines and force_check_-
// exceptions is no longer hard-coded. An exception-only feature listed
// BEFORE its paired blocker therefore never sees a propagated matched_rule
// and skips its exception lookup, so the trailing blocker takes effect.
add_task(async function test_exception_before_blocker_does_not_unblock() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "exception",
      name: "mozilla-minor-exceptions",
      rules: ["@@||example.com^"],
    },
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.com^"],
    },
  ]);

  await pushEnginePrefs({ protection: "minor-exceptions,trackers" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "exception-first ordering does not unblock (matched_rule not propagated)"
  );

  await assertHasBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    "trailing blocker still fires when listed after an exception feature"
  );
});

// Bug 2041805: without an upstream blocker, an exception-only engine's
// exception lookup is skipped entirely. Nothing matches, the image loads,
// and no blocking-state entry is written.
add_task(async function test_exception_only_engine_no_block_loads() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "exception",
      name: "mozilla-minor-exceptions",
      rules: ["@@||example.com^"],
    },
  ]);

  await pushEnginePrefs({ protection: "minor-exceptions" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageLoaded(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "exception-only engine without an upstream blocker is a no-op"
  );

  await assertLacksBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    "no STATE_BLOCKED_TRACKING_CONTENT when only an exception engine runs"
  );
});

// Bug 2041805: $important block rules are immune to exceptions (adblock-rust
// semantics), and ClassifyWithEngines additionally short-circuits at
// ImportantHit so later exception engines are not invoked at all.
add_task(async function test_important_block_overrides_exception() {
  let client = getRSClient();
  let records = await populateMultipleRS(client.db, [
    {
      id: "trackers",
      name: "disconnect-tracker-base",
      rules: ["||example.com^$important"],
    },
    {
      id: "exception",
      name: "mozilla-minor-exceptions",
      rules: ["@@||example.com^"],
    },
  ]);

  await pushEnginePrefs({ protection: "trackers,minor-exceptions" });

  let tab = await openTestTab();
  let browser = tab.linkedBrowser;
  await syncAndWaitForLists(client, records);

  await assertImageBlocked(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    "$important block survives a later exception engine"
  );

  await assertHasBlockingState(
    browser,
    TEST_ANNOTATED_3RD_PARTY_DOMAIN,
    Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT,
    "important block carries STATE_BLOCKED_TRACKING_CONTENT"
  );
});
