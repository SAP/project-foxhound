/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionCreators: "resource://newtab/common/Actions.mjs",
  actionTypes: "resource://newtab/common/Actions.mjs",
  AboutNewTab: "resource:///modules/AboutNewTab.sys.mjs",
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
  PartnerLinkAttribution: "resource:///modules/PartnerLinkAttribution.sys.mjs",
  PlacesFeed: "resource://newtab/lib/PlacesFeed.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TestUtils: "resource://testing-common/TestUtils.sys.mjs",
});

const FAKE_BOOKMARK = {
  bookmarkGuid: "D3r1sKRobtbW",
  bookmarkTitle: "Foo",
  dateAdded: 123214232,
  url: "foo.com",
};
const TYPE_BOOKMARK = 1; // This is fake, for testing
const SOURCES = {
  DEFAULT: 0,
  SYNC: 1,
  IMPORT: 2,
  RESTORE: 5,
  RESTORE_ON_STARTUP: 6,
};

// The event dispatched in NewTabUtils when a link is blocked;
const BLOCKED_EVENT = "newtab-linkBlocked";

const TOP_SITES_BLOCKED_SPONSORS_PREF = "browser.topsites.blockedSponsors";

function getPlacesFeedForTest(sandbox) {
  let feed = new PlacesFeed();
  feed.store = {
    dispatch: sandbox.spy(),
    feeds: {
      get: sandbox.stub(),
    },
  };

  sandbox.stub(AboutNewTab, "activityStream").value({
    store: feed.store,
  });

  return feed;
}

add_task(async function test_construction() {
  info("PlacesFeed construction should work");
  let feed = new PlacesFeed();
  Assert.ok(feed, "PlacesFeed could be constructed.");
});

add_task(async function test_PlacesObserver() {
  info("PlacesFeed should have a PlacesObserver that dispatches to the store");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);

  let action = { type: "FOO" };
  feed.placesObserver.dispatch(action);

  await TestUtils.waitForTick();
  Assert.ok(feed.store.dispatch.calledOnce, "PlacesFeed.store dispatch called");
  Assert.equal(feed.store.dispatch.firstCall.args[0].type, action.type);

  sandbox.restore();
});

add_task(async function test_addToBlockedTopSitesSponsors_add_to_blocklist() {
  info(
    "PlacesFeed.addToBlockedTopSitesSponsors should add the blocked sponsors " +
      "to the blocklist"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  Services.prefs.setStringPref(
    TOP_SITES_BLOCKED_SPONSORS_PREF,
    `["foo","bar"]`
  );

  feed.addToBlockedTopSitesSponsors([
    { url: "test.com" },
    { url: "test1.com" },
  ]);

  let blockedSponsors = JSON.parse(
    Services.prefs.getStringPref(TOP_SITES_BLOCKED_SPONSORS_PREF)
  );
  Assert.deepEqual(
    new Set(["foo", "bar", "test", "test1"]),
    new Set(blockedSponsors)
  );

  Services.prefs.clearUserPref(TOP_SITES_BLOCKED_SPONSORS_PREF);
  sandbox.restore();
});

add_task(async function test_addToBlockedTopSitesSponsors_no_dupes() {
  info(
    "PlacesFeed.addToBlockedTopSitesSponsors should not add duplicate " +
      "sponsors to the blocklist"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  Services.prefs.setStringPref(
    TOP_SITES_BLOCKED_SPONSORS_PREF,
    `["foo","bar"]`
  );

  feed.addToBlockedTopSitesSponsors([
    { url: "foo.com" },
    { url: "bar.com" },
    { url: "test.com" },
  ]);

  let blockedSponsors = JSON.parse(
    Services.prefs.getStringPref(TOP_SITES_BLOCKED_SPONSORS_PREF)
  );
  Assert.deepEqual(new Set(["foo", "bar", "test"]), new Set(blockedSponsors));

  Services.prefs.clearUserPref(TOP_SITES_BLOCKED_SPONSORS_PREF);
  sandbox.restore();
});

add_task(async function test_addToBlockedTopSitesSponsors_invalid_pref() {
  info(
    "PlacesFeed.addToBlockedTopSitesSponsors should treat an invalid pref " +
      "value as an empty blocklist"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  Services.prefs.setStringPref(TOP_SITES_BLOCKED_SPONSORS_PREF, "");

  feed.addToBlockedTopSitesSponsors([{ url: "test.com" }]);

  let blockedSponsors = JSON.parse(
    Services.prefs.getStringPref(TOP_SITES_BLOCKED_SPONSORS_PREF)
  );
  Assert.deepEqual(new Set(["test"]), new Set(blockedSponsors));

  Services.prefs.clearUserPref(TOP_SITES_BLOCKED_SPONSORS_PREF);
  sandbox.restore();
});

add_task(async function test_onAction_PlacesEvents() {
  info(
    "PlacesFeed.onAction should add bookmark, history, places, blocked " +
      "observers on INIT"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(feed.placesObserver, "handlePlacesEvent");

  feed.onAction({ type: actionTypes.INIT });
  // The PlacesObserver registration happens at the next tick of the
  // event loop.
  await TestUtils.waitForTick();

  // These are some dummy PlacesEvents that we'll pass through the
  // PlacesObserver service, checking that the handlePlacesEvent receives them
  // properly.
  let notifications = [
    new PlacesBookmarkAddition({
      dateAdded: 0,
      guid: "dQFSYrbM5SJN",
      id: -1,
      index: 0,
      isTagging: false,
      itemType: 1,
      parentGuid: "n_HOEFys1qsL",
      parentId: -2,
      source: 0,
      title: "test-123",
      tags: "tags",
      url: "http://example.com/test-123",
      frecency: 0,
      hidden: false,
      visitCount: 0,
      lastVisitDate: 0,
      targetFolderGuid: null,
      targetFolderItemId: -1,
      targetFolderTitle: null,
    }),
    new PlacesBookmarkRemoved({
      id: -1,
      url: "http://example.com/test-123",
      title: "test-123",
      itemType: 1,
      parentId: -2,
      index: 0,
      guid: "M3WYgJlm2Jlx",
      parentGuid: "DO1f97R4KC3Y",
      source: 0,
      isTagging: false,
      isDescendantRemoval: false,
    }),
    new PlacesHistoryCleared(),
    new PlacesVisitRemoved({
      url: "http://example.com/test-123",
      pageGuid: "sPVcW2V4H7Rg",
      reason: PlacesVisitRemoved.REASON_DELETED,
      transitionType: 0,
      isRemovedFromStore: true,
      isPartialVisistsRemoval: false,
    }),
  ];

  for (let notification of notifications) {
    PlacesUtils.observers.notifyListeners([notification]);
    Assert.ok(
      feed.placesObserver.handlePlacesEvent.calledOnce,
      "PlacesFeed.handlePlacesEvent called"
    );
    Assert.ok(feed.placesObserver.handlePlacesEvent.calledWith([notification]));
    feed.placesObserver.handlePlacesEvent.resetHistory();
  }

  info(
    "PlacesFeed.onAction remove bookmark, history, places, blocked " +
      "observers, and timers on UNINIT"
  );

  let placesChangedTimerCancel = sandbox.spy();
  feed.placesChangedTimer = {
    cancel: placesChangedTimerCancel,
  };

  // Unlike INIT, UNINIT removes the observers synchronously, so no need to
  // wait for the event loop to tick around again.
  feed.onAction({ type: actionTypes.UNINIT });

  for (let notification of notifications) {
    PlacesUtils.observers.notifyListeners([notification]);
    Assert.ok(
      feed.placesObserver.handlePlacesEvent.notCalled,
      "PlacesFeed.handlePlacesEvent not called"
    );
    feed.placesObserver.handlePlacesEvent.resetHistory();
  }

  Assert.equal(feed.placesChangedTimer, null);
  Assert.ok(placesChangedTimerCancel.calledOnce);

  sandbox.restore();
});

add_task(async function test_onAction_BLOCK_URL() {
  info("PlacesFeed.onAction should block a url on BLOCK_URL");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(NewTabUtils.activityStreamLinks, "blockURL");

  feed.onAction({
    type: actionTypes.BLOCK_URL,
    data: [{ url: "apple.com", pocket_id: 1234 }],
  });
  Assert.ok(
    NewTabUtils.activityStreamLinks.blockURL.calledWith({
      url: "apple.com",
      pocket_id: 1234,
    })
  );

  sandbox.restore();
});

add_task(async function test_onAction_BLOCK_URL_topsites_sponsors() {
  info(
    "PlacesFeed.onAction BLOCK_URL should update the blocked top " +
      "sites sponsors"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(feed, "addToBlockedTopSitesSponsors");

  feed.onAction({
    type: actionTypes.BLOCK_URL,
    data: [{ url: "foo.com", pocket_id: 1234, isSponsoredTopSite: 1 }],
  });
  Assert.ok(feed.addToBlockedTopSitesSponsors.calledWith([{ url: "foo.com" }]));

  sandbox.restore();
});

add_task(async function test_onAction_BOOKMARK_URL() {
  info("PlacesFeed.onAction should bookmark a url on BOOKMARK_URL");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(NewTabUtils.activityStreamLinks, "addBookmark");

  let data = { url: "pear.com", title: "A pear" };
  let _target = { window() {} };
  feed.onAction({ type: actionTypes.BOOKMARK_URL, data, _target });
  Assert.ok(
    NewTabUtils.activityStreamLinks.addBookmark.calledWith(data, _target.window)
  );

  sandbox.restore();
});

add_task(async function test_onAction_DELETE_BOOKMARK_BY_ID() {
  info("PlacesFeed.onAction should delete a bookmark on DELETE_BOOKMARK_BY_ID");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(NewTabUtils.activityStreamLinks, "deleteBookmark");

  feed.onAction({ type: actionTypes.DELETE_BOOKMARK_BY_ID, data: "g123kd" });
  Assert.ok(
    NewTabUtils.activityStreamLinks.deleteBookmark.calledWith("g123kd")
  );

  sandbox.restore();
});

add_task(async function test_onAction_DELETE_HISTORY_URL() {
  info(
    "PlacesFeed.onAction should delete a history entry on DELETE_HISTORY_URL"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(NewTabUtils.activityStreamLinks, "deleteHistoryEntry");
  sandbox.stub(NewTabUtils.activityStreamLinks, "blockURL");

  feed.onAction({
    type: actionTypes.DELETE_HISTORY_URL,
    data: { url: "guava.com", forceBlock: null },
  });
  Assert.ok(
    NewTabUtils.activityStreamLinks.deleteHistoryEntry.calledWith("guava.com")
  );
  Assert.ok(NewTabUtils.activityStreamLinks.blockURL.notCalled);

  sandbox.restore();
});

add_task(async function test_onAction_DELETE_HISTORY_URL_and_block() {
  info(
    "PlacesFeed.onAction should delete a history entry on " +
      "DELETE_HISTORY_URL and force a site to be blocked if specified"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(NewTabUtils.activityStreamLinks, "deleteHistoryEntry");
  sandbox.stub(NewTabUtils.activityStreamLinks, "blockURL");

  feed.onAction({
    type: actionTypes.DELETE_HISTORY_URL,
    data: { url: "guava.com", forceBlock: "g123kd" },
  });
  Assert.ok(
    NewTabUtils.activityStreamLinks.deleteHistoryEntry.calledWith("guava.com")
  );
  Assert.ok(
    NewTabUtils.activityStreamLinks.blockURL.calledWith({
      url: "guava.com",
      pocket_id: undefined,
    })
  );

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_NEW_WINDOW() {
  info(
    "PlacesFeed.onAction should call openTrustedLinkIn with the " +
      "correct url, where and params on OPEN_NEW_WINDOW"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openWindowAction = {
    type: actionTypes.OPEN_NEW_WINDOW,
    data: { url: "https://foo.com" },
    _target: { window: { openTrustedLinkIn } },
  };

  feed.onAction(openWindowAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [url, where, params] = openTrustedLinkIn.firstCall.args;
  Assert.equal(url, "https://foo.com");
  Assert.equal(where, "window");
  Assert.ok(!params.private);
  Assert.ok(!params.forceForeground);

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_PRIVATE_WINDOW() {
  info(
    "PlacesFeed.onAction should call openTrustedLinkIn with the " +
      "correct url, where, params and privacy args on OPEN_PRIVATE_WINDOW"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openWindowAction = {
    type: actionTypes.OPEN_PRIVATE_WINDOW,
    data: { url: "https://foo.com" },
    _target: { window: { openTrustedLinkIn } },
  };

  feed.onAction(openWindowAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [url, where, params] = openTrustedLinkIn.firstCall.args;
  Assert.equal(url, "https://foo.com");
  Assert.equal(where, "window");
  Assert.ok(params.private);
  Assert.ok(!params.forceForeground);

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_LINK() {
  info(
    "PlacesFeed.onAction should call openTrustedLinkIn with the " +
      "correct url, where and params on OPEN_LINK"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openLinkAction = {
    type: actionTypes.OPEN_LINK,
    data: { url: "https://foo.com" },
    _target: {
      window: {
        openTrustedLinkIn,
      },
    },
  };
  feed.onAction(openLinkAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [url, where, params] = openTrustedLinkIn.firstCall.args;
  Assert.equal(url, "https://foo.com");
  Assert.equal(where, "current");
  Assert.ok(!params.private);
  Assert.ok(!params.forceForeground);

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_LINK_where() {
  info("PlacesFeed.onAction should respect action.data.where on OPEN_LINK");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openLinkAction = {
    type: actionTypes.OPEN_LINK,
    data: { url: "https://foo.com", where: "tab" },
    _target: {
      window: {
        openTrustedLinkIn,
      },
    },
  };
  feed.onAction(openLinkAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [, where] = openTrustedLinkIn.firstCall.args;
  Assert.equal(where, "tab");

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_LINK_referrer() {
  info("PlacesFeed.onAction should open link with referrer on OPEN_LINK");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openLinkAction = {
    type: actionTypes.OPEN_LINK,
    data: { url: "https://foo.com", referrer: "https://foo.com/ref" },
    _target: {
      window: {
        openTrustedLinkIn,
        whereToOpenLink: () => "tab",
      },
    },
  };
  feed.onAction(openLinkAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [, , params] = openTrustedLinkIn.firstCall.args;
  Assert.equal(params.referrerInfo.referrerPolicy, 5);
  Assert.equal(
    params.referrerInfo.originalReferrer.spec,
    "https://foo.com/ref"
  );

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_LINK_typed_bonus() {
  info(
    "PlacesFeed.onAction should mark link with typed bonus as " +
      "typed before opening OPEN_LINK"
  );
  let sandbox = sinon.createSandbox();
  let callOrder = [];
  // We can't stub out PlacesUtils.history.markPageAsTyped, since that's an
  // XPCOM component. We'll stub out history instead.
  sandbox.stub(PlacesUtils, "history").get(() => {
    return {
      markPageAsTyped: sandbox.stub().callsFake(() => {
        callOrder.push("markPageAsTyped");
      }),
    };
  });

  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub().callsFake(() => {
    callOrder.push("openTrustedLinkIn");
  });
  let openLinkAction = {
    type: actionTypes.OPEN_LINK,
    data: {
      typedBonus: true,
      url: "https://foo.com",
    },
    _target: {
      window: {
        openTrustedLinkIn,
        whereToOpenLink: () => "tab",
      },
    },
  };
  feed.onAction(openLinkAction);

  Assert.deepEqual(callOrder, ["markPageAsTyped", "openTrustedLinkIn"]);

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_LINK_pocket() {
  info(
    "PlacesFeed.onAction should open the pocket link if it's a " +
      "pocket story on OPEN_LINK"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openLinkAction = {
    type: actionTypes.OPEN_LINK,
    data: {
      url: "https://foo.com",
      open_url: "https://getpocket.com/foo",
      type: "pocket",
    },
    _target: {
      window: {
        openTrustedLinkIn,
      },
    },
  };

  feed.onAction(openLinkAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [url, where, params] = openTrustedLinkIn.firstCall.args;
  Assert.equal(url, "https://getpocket.com/foo");
  Assert.equal(where, "current");
  Assert.ok(!params.private);
  Assert.ok(!params.forceForeground);

  sandbox.restore();
});

add_task(async function test_onAction_OPEN_LINK_not_http() {
  info("PlacesFeed.onAction should not open link if not http");
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openLinkAction = {
    type: actionTypes.OPEN_LINK,
    data: { url: "file:///foo.com" },
    _target: {
      window: { openTrustedLinkIn },
    },
  };

  feed.onAction(openLinkAction);

  Assert.ok(openTrustedLinkIn.notCalled, "openTrustedLinkIn not called");

  sandbox.restore();
});

add_task(async function test_onAction_FILL_SEARCH_TERM() {
  info(
    "PlacesFeed.onAction should call fillSearchTopSiteTerm " +
      "on FILL_SEARCH_TERM"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(feed, "fillSearchTopSiteTerm");

  feed.onAction({ type: actionTypes.FILL_SEARCH_TERM });

  Assert.ok(
    feed.fillSearchTopSiteTerm.calledOnce,
    "PlacesFeed.fillSearchTopSiteTerm called"
  );
  sandbox.restore();
});

add_task(async function test_onAction_ABOUT_SPONSORED_TOP_SITES() {
  info(
    "PlacesFeed.onAction should call openTrustedLinkIn with the " +
      "correct SUMO url on ABOUT_SPONSORED_TOP_SITES"
  );
  let sandbox = sinon.createSandbox();
  let feed = getPlacesFeedForTest(sandbox);
  let openTrustedLinkIn = sandbox.stub();
  let openLinkAction = {
    type: actionTypes.ABOUT_SPONSORED_TOP_SITES,
    _target: {
      window: { openTrustedLinkIn },
    },
  };

  feed.onAction(openLinkAction);

  Assert.ok(openTrustedLinkIn.calledOnce, "openTrustedLinkIn called");
  let [url, where] = openTrustedLinkIn.firstCall.args;
  Assert.ok(url.endsWith("sponsor-privacy"));
  Assert.equal(where, "tab");

  sandbox.restore();
});

add_task(async function test_onAction_FILL_SEARCH_TERM() {
  info(
    "PlacesFeed.onAction should set the URL bar value to the label value " +
      "on FILL_SEARCH_TERM"
  );
  let sandbox = sinon.createSandbox();
  sandbox.stub(SearchService, "getEngineByAlias").resolves(null);

  let feed = getPlacesFeedForTest(sandbox);
  let locationBar = { search: sandbox.stub() };
  let action = {
    type: actionTypes.FILL_SEARCH_TERM,
    data: { label: "@Foo" },
    _target: { window: { gURLBar: locationBar } },
  };

  await feed.onAction(action);

  Assert.ok(locationBar.search.calledOnce, "gURLBar.search called");
  Assert.ok(
    locationBar.search.calledWithExactly("@Foo", {
      searchEngine: null,
      searchModeEntry: "topsites_newtab",
    })
  );

  sandbox.restore();
});

add_task(async function test_onAction_PARTNER_LINK_ATTRIBUTION() {
  info(
    "PlacesFeed.onAction should call makeAttributionRequest on " +
      "PARTNER_LINK_ATTRIBUTION"
  );
  let sandbox = sinon.createSandbox();

  let feed = getPlacesFeedForTest(sandbox);
  sandbox.stub(feed, "makeAttributionRequest");

  let data = { targetURL: "https://partnersite.com", source: "topsites" };
  feed.onAction({
    type: actionTypes.PARTNER_LINK_ATTRIBUTION,
    data,
  });

  Assert.ok(
    feed.makeAttributionRequest.calledOnce,
    "PlacesFeed.makeAttributionRequest called"
  );
  Assert.ok(feed.makeAttributionRequest.calledWithExactly(data));

  sandbox.restore();
});

add_task(
  async function test_makeAttributionRequest_PartnerLinkAttribution_makeReq() {
    info(
      "PlacesFeed.makeAttributionRequest should call " +
        "PartnerLinkAttribution.makeRequest"
    );
    let sandbox = sinon.createSandbox();

    let feed = getPlacesFeedForTest(sandbox);
    sandbox.stub(PartnerLinkAttribution, "makeRequest");

    let data = { targetURL: "https://partnersite.com", source: "topsites" };
    feed.makeAttributionRequest(data);

    Assert.ok(
      PartnerLinkAttribution.makeRequest.calledOnce,
      "PartnerLinkAttribution.makeRequest called"
    );

    sandbox.restore();
  }
);

add_task(async function test_observe_dispatch_PLACES_LINK_BLOCKED() {
  info(
    "PlacesFeed.observe should dispatch a PLACES_LINK_BLOCKED action " +
      "with the url of the blocked link"
  );

  let sandbox = sinon.createSandbox();

  let feed = getPlacesFeedForTest(sandbox);
  feed.observe(null, BLOCKED_EVENT, "foo123.com");
  Assert.equal(
    feed.store.dispatch.firstCall.args[0].type,
    actionTypes.PLACES_LINK_BLOCKED
  );
  Assert.deepEqual(feed.store.dispatch.firstCall.args[0].data, {
    url: "foo123.com",
  });

  sandbox.restore();
});

add_task(async function test_observe_no_dispatch() {
  info(
    "PlacesFeed.observe should not call dispatch if the topic is something " +
      "other than BLOCKED_EVENT"
  );

  let sandbox = sinon.createSandbox();

  let feed = getPlacesFeedForTest(sandbox);
  feed.observe(null, "someotherevent");
  Assert.ok(
    feed.store.dispatch.notCalled,
    "PlacesFeed.store.dispatch not called"
  );

  sandbox.restore();
});

add_task(
  async function test_handlePlacesEvent_dispatch_one_PLACES_LINKS_CHANGED() {
    let events = [
      {
        message:
          "PlacesFeed.handlePlacesEvent should only dispatch 1 PLACES_LINKS_CHANGED action " +
          "if many bookmark-added notifications happened at once",
        dispatchCallCount: 5,
        event: {
          itemType: TYPE_BOOKMARK,
          source: SOURCES.DEFAULT,
          dateAdded: FAKE_BOOKMARK.dateAdded,
          guid: FAKE_BOOKMARK.bookmarkGuid,
          title: FAKE_BOOKMARK.bookmarkTitle,
          url: "https://www.foo.com",
          isTagging: false,
          type: "bookmark-added",
        },
      },
      {
        message:
          "PlacesFeed.handlePlacesEvent should only dispatch 1 " +
          "PLACES_LINKS_CHANGED action if many onItemRemoved notifications " +
          "happened at once",
        dispatchCallCount: 5,
        event: {
          id: null,
          parentId: null,
          index: null,
          itemType: TYPE_BOOKMARK,
          url: "foo.com",
          guid: "rTU_oiklsU7D",
          parentGuid: "2BzBQXOPFmuU",
          source: SOURCES.DEFAULT,
          type: "bookmark-removed",
        },
      },
      {
        message:
          "PlacesFeed.handlePlacesEvent should only dispatch 1 " +
          "PLACES_LINKS_CHANGED action if any page-removed notifications " +
          "happened at once",
        dispatchCallCount: 5,
        event: {
          type: "page-removed",
          url: "foo.com",
          isRemovedFromStore: true,
        },
      },
    ];

    for (let { message, dispatchCallCount, event } of events) {
      info(message);

      let sandbox = sinon.createSandbox();
      let feed = getPlacesFeedForTest(sandbox);

      await feed.placesObserver.handlePlacesEvent([event]);
      await feed.placesObserver.handlePlacesEvent([event]);
      await feed.placesObserver.handlePlacesEvent([event]);
      await feed.placesObserver.handlePlacesEvent([event]);

      Assert.ok(feed.placesChangedTimer, "PlacesFeed dispatch timer created");

      // Let's speed things up a bit.
      feed.placesChangedTimer.delay = 0;

      // Wait for the timer to go off and get cleared
      await TestUtils.waitForCondition(
        () => !feed.placesChangedTimer,
        "PlacesFeed dispatch timer cleared"
      );

      Assert.equal(
        feed.store.dispatch.callCount,
        dispatchCallCount,
        `PlacesFeed.store.dispatch was called ${dispatchCallCount} times`
      );

      Assert.ok(
        feed.store.dispatch.withArgs(
          actionCreators.OnlyToMain({ type: actionTypes.PLACES_LINKS_CHANGED })
        ).calledOnce,
        "PlacesFeed.store.dispatch called with PLACES_LINKS_CHANGED once"
      );

      sandbox.restore();
    }
  }
);

add_task(async function test_PlacesObserver_dispatches() {
  let events = [
    {
      message:
        "PlacesObserver should dispatch a PLACES_HISTORY_CLEARED action " +
        "on history-cleared",
      args: { type: "history-cleared" },
      expectedAction: { type: actionTypes.PLACES_HISTORY_CLEARED },
    },
    {
      message:
        "PlacesObserver should dispatch a PLACES_LINKS_DELETED action " +
        "with the right url",
      args: {
        type: "page-removed",
        url: "foo.com",
        isRemovedFromStore: true,
      },
      expectedAction: {
        type: actionTypes.PLACES_LINKS_DELETED,
        data: { urls: ["foo.com"] },
      },
    },
    {
      message:
        "PlacesObserver should dispatch a PLACES_BOOKMARK_ADDED action with " +
        "the bookmark data - http",
      args: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.DEFAULT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "http://www.foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
      expectedAction: {
        type: actionTypes.PLACES_BOOKMARK_ADDED,
        data: {
          bookmarkGuid: FAKE_BOOKMARK.bookmarkGuid,
          bookmarkTitle: FAKE_BOOKMARK.bookmarkTitle,
          dateAdded: FAKE_BOOKMARK.dateAdded * 1000,
          url: "http://www.foo.com",
        },
      },
    },
    {
      message:
        "PlacesObserver should dispatch a PLACES_BOOKMARK_ADDED action with " +
        "the bookmark data - https",
      args: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.DEFAULT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "https://www.foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
      expectedAction: {
        type: actionTypes.PLACES_BOOKMARK_ADDED,
        data: {
          bookmarkGuid: FAKE_BOOKMARK.bookmarkGuid,
          bookmarkTitle: FAKE_BOOKMARK.bookmarkTitle,
          dateAdded: FAKE_BOOKMARK.dateAdded * 1000,
          url: "https://www.foo.com",
        },
      },
    },
  ];

  for (let { message, args, expectedAction } of events) {
    info(message);
    let sandbox = sinon.createSandbox();
    let dispatch = sandbox.spy();
    let observer = new PlacesFeed.PlacesObserver(dispatch);
    await observer.handlePlacesEvent([args]);
    Assert.ok(dispatch.calledWith(expectedAction));
    sandbox.restore();
  }
});

add_task(async function test_PlacesObserver_ignores() {
  let events = [
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARK_ADDED action - " +
        "not http/https for bookmark-added",
      event: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.DEFAULT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARK_ADDED action - " +
        "has IMPORT source for bookmark-added",
      event: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.IMPORT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARK_ADDED " +
        "action - has RESTORE source for bookmark-added",
      event: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.RESTORE,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARK_ADDED " +
        "action - has RESTORE_ON_STARTUP source for bookmark-added",
      event: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.RESTORE_ON_STARTUP,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARK_ADDED " +
        "action - has SYNC source for bookmark-added",
      event: {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.SYNC,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
    },
    {
      message:
        "PlacesObserver should ignore events that are not of " +
        "TYPE_BOOKMARK for bookmark-added",
      event: {
        itemType: "nottypebookmark",
        source: SOURCES.DEFAULT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "https://www.foo.com",
        isTagging: false,
        type: "bookmark-added",
      },
    },
    {
      message:
        "PlacesObserver should ignore events that are not of " +
        "TYPE_BOOKMARK for bookmark-removed",
      event: {
        id: null,
        parentId: null,
        index: null,
        itemType: "nottypebookmark",
        url: null,
        guid: "461Z_7daEqIh",
        parentGuid: "hkHScG3aI3hh",
        source: SOURCES.DEFAULT,
        type: "bookmark-removed",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARKS_REMOVED " +
        "action - has SYNC source for bookmark-removed",
      event: {
        id: null,
        parentId: null,
        index: null,
        itemType: TYPE_BOOKMARK,
        url: "foo.com",
        guid: "uvRE3stjoZOI",
        parentGuid: "BnsXZl8VMJjB",
        source: SOURCES.SYNC,
        type: "bookmark-removed",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARKS_REMOVED " +
        "action - has IMPORT source for bookmark-removed",
      event: {
        id: null,
        parentId: null,
        index: null,
        itemType: TYPE_BOOKMARK,
        url: "foo.com",
        guid: "VF6YwhGpHrOW",
        parentGuid: "7Vz8v9nKcSoq",
        source: SOURCES.IMPORT,
        type: "bookmark-removed",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARKS_REMOVED " +
        "action - has RESTORE source for bookmark-removed",
      event: {
        id: null,
        parentId: null,
        index: null,
        itemType: TYPE_BOOKMARK,
        url: "foo.com",
        guid: "eKozFyXJP97R",
        parentGuid: "ya8Z2FbjKnD0",
        source: SOURCES.RESTORE,
        type: "bookmark-removed",
      },
    },
    {
      message:
        "PlacesObserver should not dispatch a PLACES_BOOKMARKS_REMOVED " +
        "action - has RESTORE_ON_STARTUP source for bookmark-removed",
      event: {
        id: null,
        parentId: null,
        index: null,
        itemType: TYPE_BOOKMARK,
        url: "foo.com",
        guid: "StSGMhrYYfyD",
        parentGuid: "vL8wsCe2j_eT",
        source: SOURCES.RESTORE_ON_STARTUP,
        type: "bookmark-removed",
      },
    },
  ];

  for (let { message, event } of events) {
    info(message);
    let sandbox = sinon.createSandbox();
    let dispatch = sandbox.spy();
    let observer = new PlacesFeed.PlacesObserver(dispatch);

    await observer.handlePlacesEvent([event]);
    Assert.ok(dispatch.notCalled, "PlacesObserver.dispatch not called");
    sandbox.restore();
  }
});

add_task(
  async function test_PlacesObserver_skipped_bookmark_added_does_not_drop_subsequent_events() {
    info(
      "PlacesObserver should continue processing events after skipping a " +
        "bookmark-added event (e.g. from IMPORT source)"
    );
    let sandbox = sinon.createSandbox();
    let dispatch = sandbox.spy();
    let observer = new PlacesFeed.PlacesObserver(dispatch);

    await observer.handlePlacesEvent([
      {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.IMPORT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "https://www.imported.com",
        isTagging: false,
        type: "bookmark-added",
      },
      {
        type: "page-removed",
        url: "https://www.removed-page.com",
        isRemovedFromStore: true,
      },
    ]);

    Assert.ok(
      dispatch.calledWith({
        type: actionTypes.PLACES_LINKS_DELETED,
        data: { urls: ["https://www.removed-page.com"] },
      }),
      "page-removed event after skipped bookmark-added should still be dispatched"
    );
    sandbox.restore();
  }
);

add_task(
  async function test_PlacesObserver_skipped_bookmark_added_does_not_drop_accumulated_removals() {
    info(
      "PlacesObserver should dispatch accumulated removedPages even when a " +
        "skippable bookmark-added event follows"
    );
    let sandbox = sinon.createSandbox();
    let dispatch = sandbox.spy();
    let observer = new PlacesFeed.PlacesObserver(dispatch);

    await observer.handlePlacesEvent([
      {
        type: "page-removed",
        url: "https://www.already-removed.com",
        isRemovedFromStore: true,
      },
      {
        itemType: TYPE_BOOKMARK,
        source: SOURCES.IMPORT,
        dateAdded: FAKE_BOOKMARK.dateAdded,
        guid: FAKE_BOOKMARK.bookmarkGuid,
        title: FAKE_BOOKMARK.bookmarkTitle,
        url: "https://www.imported.com",
        isTagging: false,
        type: "bookmark-added",
      },
    ]);

    Assert.ok(
      dispatch.calledWith({
        type: actionTypes.PLACES_LINKS_DELETED,
        data: { urls: ["https://www.already-removed.com"] },
      }),
      "page-removed accumulated before skipped bookmark-added should still be dispatched"
    );
    sandbox.restore();
  }
);

add_task(async function test_PlacesObserver_bookmark_removed() {
  info(
    "PlacesObserver should dispatch a PLACES_BOOKMARKS_REMOVED " +
      "action with the right URL and bookmarkGuid for bookmark-removed"
  );
  let sandbox = sinon.createSandbox();
  let dispatch = sandbox.spy();
  let observer = new PlacesFeed.PlacesObserver(dispatch);

  await observer.handlePlacesEvent([
    {
      id: null,
      parentId: null,
      index: null,
      itemType: TYPE_BOOKMARK,
      url: "foo.com",
      guid: "Xgnxs27I9JnX",
      parentGuid: "a4k739PL55sP",
      source: SOURCES.DEFAULT,
      type: "bookmark-removed",
    },
  ]);

  Assert.ok(
    dispatch.calledWith({
      type: actionTypes.PLACES_BOOKMARKS_REMOVED,
      data: { urls: ["foo.com"] },
    })
  );
  sandbox.restore();
});
