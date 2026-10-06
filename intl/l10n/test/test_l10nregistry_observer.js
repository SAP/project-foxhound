/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the intl:l10n-sources-changed observer notification fired by
 * L10nRegistry when sources are registered, updated, or removed at runtime
 * (Bug 2046945).
 */

"use strict";

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

const TOPIC = "intl:l10n-sources-changed";

/**
 * Verifies that mutating the global L10nRegistry fires
 * intl:l10n-sources-changed once per call. Only the global registry
 * broadcasts; freshly-constructed (test-only) registries do not.
 */
add_task(async function test_topic_fires_on_global_registry_mutations() {
  const globalReg = L10nRegistry.getInstance();
  const SOURCE_NAME = "test-l10n-observer";

  const registered = TestUtils.topicObserved(TOPIC);
  globalReg.registerSources([
    new L10nFileSource(
      SOURCE_NAME,
      "test-l10n-observer-metasource",
      ["en-US"],
      "/test-l10n-observer/{locale}/"
    ),
  ]);
  await registered;
  Assert.ok(true, "Topic fired on registerSources");

  const updated = TestUtils.topicObserved(TOPIC);
  globalReg.updateSources([
    new L10nFileSource(
      SOURCE_NAME,
      "test-l10n-observer-metasource",
      ["en-US", "fr"],
      "/test-l10n-observer/{locale}/"
    ),
  ]);
  await updated;
  Assert.ok(true, "Topic fired on updateSources");

  const removed = TestUtils.topicObserved(TOPIC);
  globalReg.removeSources([SOURCE_NAME]);
  await removed;
  Assert.ok(true, "Topic fired on removeSources");
});
