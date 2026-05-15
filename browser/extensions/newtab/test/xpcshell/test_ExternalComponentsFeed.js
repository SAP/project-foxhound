/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ExternalComponentsFeed:
    "resource://newtab/lib/ExternalComponentsFeed.sys.mjs",
  actionTypes: "resource://newtab/common/Actions.mjs",
  actionCreators: "resource://newtab/common/Actions.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

/**
 * Tests that ExternalComponentsFeed can be constructed successfully.
 */
add_task(async function test_construction() {
  info("ExternalComponentsFeed should construct with registry");

  const feed = new ExternalComponentsFeed();

  Assert.ok(feed, "Could construct an ExternalComponentsFeed");
});

/**
 * Tests that the INIT action triggers refreshComponents to be called with isStartup flag.
 */
add_task(async function test_onAction_INIT_dispatches_refresh() {
  info(
    "ExternalComponentsFeed.onAction INIT should refresh components with isStartup"
  );

  const feed = new ExternalComponentsFeed();
  const dispatchSpy = sinon.spy();

  feed.store = {
    dispatch: dispatchSpy,
  };

  sinon.stub(feed, "refreshComponents");

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.ok(
    feed.refreshComponents.calledOnce,
    "refreshComponents should be called on INIT"
  );

  Assert.ok(
    feed.refreshComponents.calledWith({ isStartup: true }),
    "refreshComponents should be called with isStartup: true"
  );

  feed.refreshComponents.restore();
});

/**
 * Tests that refreshComponents dispatches a REFRESH_EXTERNAL_COMPONENTS action
 * with the correct structure and routing metadata.
 */
add_task(async function test_refreshComponents_dispatches_action() {
  info("ExternalComponentsFeed.refreshComponents should dispatch broadcast");

  const feed = new ExternalComponentsFeed();
  const dispatchSpy = sinon.spy();

  feed.store = {
    dispatch: dispatchSpy,
  };

  feed.refreshComponents();

  Assert.ok(dispatchSpy.calledOnce, "dispatch should be called");

  const [action] = dispatchSpy.firstCall.args;
  Assert.equal(action.type, actionTypes.REFRESH_EXTERNAL_COMPONENTS);
  Assert.ok(Array.isArray(action.data), "data should be an array");
});

/**
 * Tests that the dispatched action includes component data as an array.
 */
add_task(async function test_refreshComponents_includes_registry_values() {
  info(
    "ExternalComponentsFeed.refreshComponents should include all components"
  );

  const feed = new ExternalComponentsFeed();
  const dispatchSpy = sinon.spy();

  feed.store = {
    dispatch: dispatchSpy,
  };

  feed.refreshComponents();

  Assert.ok(dispatchSpy.calledOnce, "dispatch should be called");

  const [action] = dispatchSpy.firstCall.args;
  Assert.ok(
    Array.isArray(action.data),
    "Dispatched data should be an array of components"
  );
});

/**
 * Tests that refreshComponents marks the action as a startup action when isStartup is true.
 */
add_task(async function test_refreshComponents_marks_startup_action() {
  info(
    "ExternalComponentsFeed.refreshComponents should mark action as startup when isStartup is true"
  );

  const feed = new ExternalComponentsFeed();
  const dispatchSpy = sinon.spy();

  feed.store = {
    dispatch: dispatchSpy,
  };

  feed.refreshComponents({ isStartup: true });

  Assert.ok(dispatchSpy.calledOnce, "dispatch should be called");

  const [action] = dispatchSpy.firstCall.args;
  Assert.equal(
    action.meta?.isStartup,
    true,
    "Action should have meta.isStartup set to true"
  );
});

/**
 * Tests that refreshComponents does not mark the action as startup when isStartup is false or not provided.
 */
add_task(async function test_refreshComponents_non_startup_action() {
  info(
    "ExternalComponentsFeed.refreshComponents should not mark action as startup by default"
  );

  const feed = new ExternalComponentsFeed();
  const dispatchSpy = sinon.spy();

  feed.store = {
    dispatch: dispatchSpy,
  };

  feed.refreshComponents();

  Assert.ok(dispatchSpy.calledOnce, "dispatch should be called");

  const [action] = dispatchSpy.firstCall.args;
  Assert.ok(
    !action.meta?.isStartup,
    "Action should not have meta.isStartup set"
  );
});
