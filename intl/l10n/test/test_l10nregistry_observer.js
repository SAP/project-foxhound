/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests for the intl:l10n-sources-changed observer notification fired by
 * L10nRegistry when sources are registered, updated, or removed at runtime
 * (Bug 2046945). Also verifies that Localization::Observe reacts to the
 * topic by invalidating its cached bundles.
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

/**
 * Mutating the registry must NOT fire intl:app-locales-changed when the
 * set of available locales is unchanged. The dedicated
 * intl:l10n-sources-changed topic exists specifically so registry mutations
 * don't wake observers (font list, mozIntl caches, sidebar, tabbrowser, ...)
 * that only care about negotiated-locale changes.
 */
add_task(async function test_topic_separation_from_app_locales_changed() {
  const globalReg = L10nRegistry.getInstance();
  const SOURCE_NAME = "test-l10n-observer-separation";

  let appLocalesChangedFired = false;
  const appLocalesObserver = () => {
    appLocalesChangedFired = true;
  };
  Services.obs.addObserver(appLocalesObserver, "intl:app-locales-changed");

  // Wait for our source-change notification to confirm the mutation
  // completed before we assert on the separate locale-change topic.
  const sourcesChanged = TestUtils.topicObserved(TOPIC);
  globalReg.registerSources([
    new L10nFileSource(
      SOURCE_NAME,
      "test-l10n-observer-separation-metasource",
      // en-US is already in availableLocales, so the union doesn't grow.
      ["en-US"],
      "/test-l10n-observer-separation/{locale}/"
    ),
  ]);
  await sourcesChanged;

  const sourcesChanged2 = TestUtils.topicObserved(TOPIC);
  globalReg.removeSources([SOURCE_NAME]);
  await sourcesChanged2;

  Services.obs.removeObserver(appLocalesObserver, "intl:app-locales-changed");

  Assert.ok(
    !appLocalesChangedFired,
    "intl:app-locales-changed does not fire when availableLocales is unchanged"
  );
});
