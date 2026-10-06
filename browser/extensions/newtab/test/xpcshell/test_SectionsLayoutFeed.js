/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionCreators: "resource://newtab/common/Actions.mjs",
  actionTypes: "resource://newtab/common/Actions.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  SectionsLayoutFeed: "resource://newtab/lib/SectionsLayoutFeed.sys.mjs",
});

const PREF_CLIENT_LAYOUT_ENABLED =
  "discoverystream.sections.clientLayout.enabled";

const PREF_TOPSTORIES_ENABLED = "feeds.section.topstories";

const VALID_RECORD = {
  name: "7-double-row-2-ad",
  responsiveLayouts: [
    { columnCount: 1, tiles: [] },
    { columnCount: 2, tiles: [] },
    { columnCount: 3, tiles: [] },
    { columnCount: 4, tiles: [] },
  ],
};

function getFeedForTest({
  clientLayoutEnabled = true,
  topStoriesEnabled = true,
} = {}) {
  let feed = new SectionsLayoutFeed();

  feed.store = {
    dispatch: sinon.spy(),
    getState: () => ({
      Prefs: {
        values: {
          [PREF_CLIENT_LAYOUT_ENABLED]: clientLayoutEnabled,
          [PREF_TOPSTORIES_ENABLED]: topStoriesEnabled,
        },
      },
    }),
  };

  return feed;
}

add_task(async function test_construction() {
  let feed = new SectionsLayoutFeed();

  info("SectionsLayoutFeed constructor should create initial values");

  Assert.ok(feed, "Could construct a SectionsLayoutFeed");
  Assert.strictEqual(feed._rsClient, null, "_rsClient is initialized as null");
});

add_task(async function test_onAction_INIT() {
  let sandbox = sinon.createSandbox();
  let feed = getFeedForTest();

  sandbox.stub(feed, "RemoteSettings").returns({
    get: () => [VALID_RECORD],
    on: () => {},
  });

  info(
    "SectionsLayoutFeed.onAction INIT should fetch layouts and dispatch SECTIONS_LAYOUT_UPDATE"
  );

  await feed.onAction({ type: actionTypes.INIT });

  const matchingCall = feed.store.dispatch
    .getCalls()
    .find(call => call.args[0].type === actionTypes.SECTIONS_LAYOUT_UPDATE);

  Assert.ok(matchingCall, "Expected a SECTIONS_LAYOUT_UPDATE dispatch call");
  Assert.deepEqual(
    matchingCall.args[0],
    actionCreators.BroadcastToContent({
      type: actionTypes.SECTIONS_LAYOUT_UPDATE,
      data: { configs: { "7-double-row-2-ad": VALID_RECORD } },
      meta: { isStartup: true },
    })
  );

  sandbox.restore();
});

add_task(async function test_onAction_INIT_invalid_record() {
  let sandbox = sinon.createSandbox();
  let feed = getFeedForTest();

  const invalidRecord = {
    name: "incomplete-layout",
    responsiveLayouts: [{ columnCount: 1, tiles: [] }],
  };

  sandbox.stub(feed, "RemoteSettings").returns({
    get: () => [VALID_RECORD, invalidRecord],
    on: () => {},
  });

  info(
    "SectionsLayoutFeed should only dispatch valid records with all 4 column counts"
  );

  await feed.onAction({ type: actionTypes.INIT });

  const matchingCall = feed.store.dispatch
    .getCalls()
    .find(call => call.args[0].type === actionTypes.SECTIONS_LAYOUT_UPDATE);

  Assert.ok(matchingCall, "Expected a SECTIONS_LAYOUT_UPDATE dispatch call");
  Assert.ok(
    "7-double-row-2-ad" in matchingCall.args[0].data.configs,
    "Valid record should be included"
  );
  Assert.ok(
    !("incomplete-layout" in matchingCall.args[0].data.configs),
    "Invalid record should be excluded"
  );

  sandbox.restore();
});

add_task(async function test_onAction_INIT_disabled() {
  let sandbox = sinon.createSandbox();
  let feed = getFeedForTest({ clientLayoutEnabled: false });

  sandbox.stub(feed, "RemoteSettings");

  info(
    "SectionsLayoutFeed.onAction INIT should not fetch layouts when disabled"
  );

  await feed.onAction({ type: actionTypes.INIT });

  Assert.ok(
    !feed.RemoteSettings.called,
    "RemoteSettings should not be called when disabled"
  );
  Assert.ok(
    !feed.store.dispatch.called,
    "dispatch should not be called when disabled"
  );

  sandbox.restore();
});

add_task(async function test_onAction_PREF_CHANGED() {
  let sandbox = sinon.createSandbox();
  let feed = getFeedForTest();

  sandbox.stub(feed, "init");

  info("SectionsLayoutFeed.onAction PREF_CHANGED should call init");

  for (const name of [PREF_CLIENT_LAYOUT_ENABLED, PREF_TOPSTORIES_ENABLED]) {
    await feed.onAction({
      type: actionTypes.PREF_CHANGED,
      data: { name },
    });
  }

  Assert.equal(
    feed.init.callCount,
    2,
    "init should be called for each pref change"
  );
  Assert.ok(
    feed.init.alwaysCalledWith(false),
    "init should always be called with isStartup=false"
  );

  sandbox.restore();
});

add_task(async function test_onAction_PREF_CHANGED_trainhopConfig_enabled() {
  let sandbox = sinon.createSandbox();
  let feed = getFeedForTest();

  sandbox.stub(feed, "init");

  info(
    "SectionsLayoutFeed.onAction PREF_CHANGED should call init when trainhopConfig has clientLayout"
  );

  await feed.onAction({
    type: actionTypes.PREF_CHANGED,
    data: {
      name: "trainhopConfig",
      value: { clientLayout: { enabled: true } },
    },
  });

  Assert.ok(
    feed.init.calledOnce,
    "init should be called when trainhopConfig has clientLayout"
  );

  sandbox.restore();
});
