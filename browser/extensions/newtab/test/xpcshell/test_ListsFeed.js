/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionTypes: "resource://newtab/common/Actions.mjs",
  ListsFeed: "resource://newtab/lib/Widgets/ListsFeed.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

const PREF_LISTS_ENABLED = "widgets.lists.enabled";
const PREF_SYSTEM_LISTS_ENABLED = "widgets.system.lists.enabled";

add_task(async function test_construction() {
  let feed = new ListsFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_SYSTEM_LISTS_ENABLED]: false,
        },
      },
    },
  };

  info("ListsFeed constructor should create initial values");

  Assert.ok(feed, "Could construct a ListsFeed");
  Assert.ok(!feed.loaded, "ListsFeed is not loaded");
  Assert.ok(!feed.enabled);
});

add_task(async function test_onAction_INIT() {
  let feed = new ListsFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_LISTS_ENABLED]: true,
          [PREF_SYSTEM_LISTS_ENABLED]: true,
        },
      },
    },
  };

  info("ListsFeed.onAction INIT should set initialized");

  await feed.onAction({
    type: actionTypes.INIT,
  });

  Assert.ok(feed.initialized);
});

add_task(async function test_isEnabled() {
  let feed = new ListsFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_LISTS_ENABLED]: true,
          [PREF_SYSTEM_LISTS_ENABLED]: true,
        },
      },
    },
  };

  info("ListsFeed should be enabled via system pref");
  Assert.ok(feed.enabled);
});

add_task(async function test_isEnabled() {
  let feed = new ListsFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_LISTS_ENABLED]: true,
          trainhopConfig: {
            widgets: {
              enabled: true,
              listsEnabled: true,
              timerEnabled: true,
            },
          },
        },
      },
    },
  };

  info("ListsFeed should be enabled via trainhopConfig");
  Assert.ok(feed.enabled);
});

add_task(async function test_isEnabled() {
  let feed = new ListsFeed();

  feed.store = {
    getState() {
      return this.state;
    },
    dispatch: sinon.spy(),
    state: {
      Prefs: {
        values: {
          [PREF_LISTS_ENABLED]: true,
          widgetsConfig: {
            enabled: true,
            listsEnabled: true,
            timerEnabled: true,
          },
        },
      },
    },
  };

  info("ListsFeed should be enabled via widgetsConfig");
  Assert.ok(feed.enabled);
});

add_task(async function test_syncLists_moves_completed_tasks_and_dispatches() {
  const feed = new ListsFeed();

  // create mock data for Persistent Cache
  const cachedListData = {
    lists: {
      myList: {
        label: "My List",
        tasks: [
          { id: 1, title: "Active task", completed: false },
          { id: 2, title: "Completed task", completed: true },
        ],
      },
    },
  };

  const dispatchSpy = sinon.spy();

  feed.store = {
    getState() {
      return {
        Prefs: {
          values: {
            [PREF_LISTS_ENABLED]: true,
            [PREF_SYSTEM_LISTS_ENABLED]: true,
          },
        },
      };
    },
    dispatch: dispatchSpy,
  };

  const getStub = sinon.stub(feed.cache, "get").resolves(cachedListData);

  await feed.syncLists();

  // Check that the tasks have been properly split
  const [firstCall] = dispatchSpy.getCalls();
  const listsData = firstCall.args[0].data;

  Assert.equal(listsData.myList.tasks.length, 1, "1 active task");
  Assert.equal(listsData.myList.completed.length, 1, "1 completed task");

  Assert.equal(
    firstCall.args[0].type,
    actionTypes.WIDGETS_LISTS_SET,
    "dispatches lists"
  );

  getStub.restore();
});

add_task(async function test_syncLists_errors_when_over_max() {
  const PREF_WIDGETS_LISTS_MAX_LISTS = "widgets.lists.maxLists";

  const feed = new ListsFeed();
  const dispatchSpy = sinon.spy();

  // Store state: lists enabled, system lists enabled, max count = 1
  feed.store = {
    getState() {
      return {
        Prefs: {
          values: {
            [PREF_LISTS_ENABLED]: true,
            [PREF_SYSTEM_LISTS_ENABLED]: true,
            [PREF_WIDGETS_LISTS_MAX_LISTS]: 1,
          },
        },
      };
    },
    dispatch: dispatchSpy,
  };

  // Cached data with 2 lists -> exceeds max (1)
  const cachedListData = {
    lists: {
      listA: { label: "List A", tasks: [], completed: [] },
      listB: { label: "List B", tasks: [], completed: [] },
    },
  };

  const getStub = sinon.stub(feed.cache, "get").resolves(cachedListData);

  // Expect an error and NO dispatches
  await Assert.rejects(
    feed.syncLists(),
    /Over the maximum list count/,
    "syncLists should throw when over the maximum list count"
  );

  Assert.equal(
    dispatchSpy.callCount,
    0,
    "No dispatch should occur when over the maximum list count"
  );

  getStub.restore();
});
