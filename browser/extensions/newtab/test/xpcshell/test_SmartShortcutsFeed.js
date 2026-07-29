/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionTypes: "resource://newtab/common/Actions.mjs",
  SmartShortcutsFeed: "resource://newtab/lib/SmartShortcutsFeed.sys.mjs",
});

const PREF_SYSTEM_SHORTCUTS_PERSONALIZATION =
  "discoverystream.shortcuts.personalization.enabled";
const PREF_SYSTEM_SHORTCUTS_LOG = "discoverystream.shortcuts.force_log.enabled";

function makeStore(values) {
  return {
    getState() {
      return this.state;
    },
    state: {
      Prefs: {
        values,
      },
    },
  };
}

add_task(async function test_construction() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: false,
  });

  info("SmartShortcutsFeed constructor should create initial values");

  Assert.ok(feed, "Could construct a SmartShortcutsFeed");
  Assert.ok(!feed.loaded, "SmartShortcutsFeed is not loaded");
  Assert.ok(!feed.isEnabled());
});

add_task(async function test_onAction_INIT() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
  });

  info("SmartShortcutsFeed.onAction INIT should set loaded");

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.ok(feed.loaded);
});

add_task(async function test_isEnabled() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
  });

  info("SmartShortcutsFeed should be enabled");
  Assert.ok(feed.isEnabled());
});

add_task(async function test_isEnabled_pref_fallback_when_trainhop_missing() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
  });

  Assert.ok(
    feed.isEnabled(),
    "local pref enables feed without trainhop config"
  );
});

add_task(async function test_isEnabled_pref_fallback_when_trainhop_partial() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
    trainhopConfig: { smartShortcuts: {} },
  });

  Assert.ok(
    feed.isEnabled(),
    "partial trainhop config falls back to local pref"
  );
});

add_task(async function test_onAction_INIT_remote_false_disables_loaded() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
    trainhopConfig: { smartShortcuts: { enabled: false } },
  });

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.ok(!feed.loaded, "explicit remote false disables normal feed loading");
});

add_task(async function test_force_log_keeps_feed_enabled_when_remote_false() {
  let feed = new SmartShortcutsFeed();

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
    trainhopConfig: {
      smartShortcuts: { enabled: false, force_log: true },
    },
  });

  Assert.ok(feed.isEnabled(), "force_log overrides remote false for logging");

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.ok(feed.loaded, "force_log keeps the feed loaded");

  feed.store = makeStore({
    [PREF_SYSTEM_SHORTCUTS_PERSONALIZATION]: true,
    [PREF_SYSTEM_SHORTCUTS_LOG]: true,
    trainhopConfig: { smartShortcuts: { enabled: false } },
  });

  Assert.ok(
    feed.isEnabled(),
    "local force_log pref also keeps logging enabled"
  );
});
