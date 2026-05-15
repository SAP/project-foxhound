/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionTypes: "resource://newtab/common/Actions.mjs",
  NewTabAttributionFeed: "resource://newtab/lib/NewTabAttributionFeed.sys.mjs",
  newTabAttributionService:
    "resource://newtab/lib/NewTabAttributionService.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

function makeStore(state) {
  return (
    state || {
      Prefs: {
        values: {
          "discoverystream.attribution.enabled": true,
          trainhopConfig: { attribution: { enabled: true } },
          "unifiedAds.adsFeed.enabled": true,
          "unifiedAds.spocs.enabled": true,
          "unifiedAds.tiles.enabled": true,
          "feeds.topsites": true,
          "feeds.system.topsites": true,
          "feeds.section.topstories": true,
          "feeds.system.topstories": true,
          "system.showSponsored": true,
          showSponsored: true,
          showSponsoredTopSites: false,
        },
      },
    }
  );
}

add_task(async function test_init() {
  const feed = new NewTabAttributionFeed();
  feed.store = {
    getState() {
      return this.state;
    },
    state: makeStore(),
  };

  Assert.ok(!feed.loaded);

  await feed.onAction({ type: actionTypes.INIT });
  Assert.ok(feed.loaded);
  Assert.ok(feed.isEnabled());

  await feed.onAction({ type: actionTypes.UNINIT });
  Assert.ok(!feed.loaded);
});

add_task(async function test_events_when_enabled() {
  const feed = new NewTabAttributionFeed();
  feed.store = {
    getState() {
      return this.state;
    },
    state: makeStore({
      Prefs: {
        values: {
          "discoverystream.attribution.enabled": true,
          trainhopConfig: { attribution: { enabled: true } },

          "unifiedAds.adsFeed.enabled": true,
          "unifiedAds.spocs.enabled": true,
          "unifiedAds.tiles.enabled": true,
          "feeds.topsites": true,
          "feeds.system.topsites": true,
          "feeds.section.topstories": true,
          "feeds.system.topstories": true,
          "system.showSponsored": true,
          showSponsored: true,
          showSponsoredTopSites: true,
        },
      },
    }),
  };

  await feed.onAction({ type: actionTypes.INIT });
  Assert.ok(feed.loaded);

  const onAttributionEvent = sinon
    .stub(newTabAttributionService, "onAttributionEvent")
    .resolves();
  const onReset = sinon.stub(newTabAttributionService, "onAttributionReset");

  const attribution = { campaignId: "bar", creativeId: "bar" };

  // top sites impression
  await feed.onAction({
    type: actionTypes.TOP_SITES_SPONSORED_IMPRESSION_STATS,
    data: { type: "impression", attribution },
  });
  Assert.equal(onAttributionEvent.callCount, 1);
  Assert.deepEqual(onAttributionEvent.firstCall.args, ["view", attribution]);

  // Top Sites click
  await feed.onAction({
    type: actionTypes.TOP_SITES_SPONSORED_IMPRESSION_STATS,
    data: { type: "click", attribution },
  });

  Assert.equal(onAttributionEvent.callCount, 2);
  Assert.deepEqual(onAttributionEvent.secondCall.args, ["click", attribution]);

  // DS impression
  await feed.onAction({
    type: actionTypes.DISCOVERY_STREAM_IMPRESSION_STATS,
    data: { tiles: [{ attribution }] },
  });
  Assert.equal(onAttributionEvent.callCount, 3);
  Assert.deepEqual(onAttributionEvent.thirdCall.args, ["view", attribution]);

  // DS click event
  await feed.onAction({
    type: actionTypes.DISCOVERY_STREAM_USER_EVENT,
    data: { value: { attribution } },
  });

  Assert.equal(onAttributionEvent.callCount, 4);
  Assert.deepEqual(onAttributionEvent.lastCall.args, ["click", attribution]);

  // History cleared
  await feed.onAction({ type: actionTypes.PLACES_HISTORY_CLEARED });
  Assert.ok(onReset.calledOnce);

  onAttributionEvent.restore();
  onReset.restore();
});

add_task(async function test_pref_changed_trigger_init() {
  const feed = new NewTabAttributionFeed();
  feed.store = {
    getState() {
      return this.state;
    },
    state: makeStore({
      Prefs: {
        values: {
          "discoverystream.attribution.enabled": false,
          trainhopConfig: { attribution: { enabled: false } },

          "unifiedAds.adsFeed.enabled": true,
          "unifiedAds.spocs.enabled": true,
          "unifiedAds.tiles.enabled": true,
          "feeds.topsites": true,
          "feeds.system.topsites": true,
          "feeds.section.topstories": true,
          "feeds.system.topstories": true,
          "system.showSponsored": true,
          showSponsored: true,
          showSponsoredTopSites: false,
        },
      },
    }),
  };

  await feed.onAction({ type: actionTypes.INIT });
  Assert.ok(!feed.loaded);

  // need both to trigger the PREF_CHANGED action and change the value of the pref in the store.
  feed.store.state.Prefs.values["discoverystream.attribution.enabled"] = true;
  await feed.onAction({
    type: actionTypes.PREF_CHANGED,
    data: { name: "discoverystream.attribution.enabled", value: true },
  });
  Assert.ok(feed.isEnabled());

  Assert.ok(feed.loaded);
});
