/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);
const PREF_SYSTEM_SHORTCUTS_PERSONALIZATION =
  "browser.newtabpage.activity-stream.discoverystream.shortcuts.personalization.enabled";

add_task(async function test_nimbus_experiment_enabled() {
  await pushPrefs([PREF_SYSTEM_SHORTCUTS_PERSONALIZATION, false]);
  let doExperimentCleanup = async () => {};
  try {
    let smartshortcutsfeed = AboutNewTab.activityStream.store.feeds.get(
      "feeds.smartshortcutsfeed"
    );

    // Initialize the feed, because that doesn't happen by default.
    await smartshortcutsfeed.onAction({ type: "INIT" });

    ok(!smartshortcutsfeed?.loaded, "Should initially not be loaded.");

    // Setup the experiment.
    await ExperimentAPI.ready();
    doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
      featureId: "newtabTrainhop",
      value: {
        type: "smartShortcuts",
        payload: {
          enabled: true,
        },
      },
    });

    ok(smartshortcutsfeed?.loaded, "Should now be loaded.");
  } finally {
    await doExperimentCleanup();
    await popPrefs();
  }
});

add_task(async function test_pref_enabled_by_default_path() {
  await pushPrefs([PREF_SYSTEM_SHORTCUTS_PERSONALIZATION, true]);
  try {
    let smartshortcutsfeed = AboutNewTab.activityStream.store.feeds.get(
      "feeds.smartshortcutsfeed"
    );

    await smartshortcutsfeed.onAction({ type: "UNINIT" });
    await smartshortcutsfeed.onAction({ type: "INIT" });

    ok(smartshortcutsfeed?.loaded, "Local pref should enable Smart Shortcuts");
  } finally {
    await popPrefs();
  }
});

add_task(async function test_nimbus_false_overrides_local_pref() {
  await pushPrefs([PREF_SYSTEM_SHORTCUTS_PERSONALIZATION, true]);
  let doExperimentCleanup = async () => {};
  try {
    let smartshortcutsfeed = AboutNewTab.activityStream.store.feeds.get(
      "feeds.smartshortcutsfeed"
    );

    await smartshortcutsfeed.onAction({ type: "UNINIT" });
    await smartshortcutsfeed.onAction({ type: "INIT" });
    ok(smartshortcutsfeed?.loaded, "Local pref should load the feed first");

    await ExperimentAPI.ready();
    doExperimentCleanup = await NimbusTestUtils.enrollWithFeatureConfig({
      featureId: "newtabTrainhop",
      value: {
        type: "smartShortcuts",
        payload: {
          enabled: false,
        },
      },
    });

    await TestUtils.waitForCondition(
      () => !smartshortcutsfeed.isEnabled(),
      "Smart Shortcuts should be disabled by Nimbus"
    );
    ok(
      !smartshortcutsfeed.loaded,
      "Explicit remote false should unload the feed"
    );
  } finally {
    await doExperimentCleanup();
    await popPrefs();
  }
});
