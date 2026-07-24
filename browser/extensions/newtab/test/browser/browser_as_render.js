"use strict";

// test_newtab calls SpecialPowers.spawn, which injects ContentTaskUtils in the
// scope of the callback. Eslint doesn't know about that.
/* global ContentTaskUtils */

test_newtab({
  test: async function test_render_search_handoff() {
    const usingHandoffComponent = Services.prefs.getBoolPref(
      "browser.newtabpage.activity-stream.search.useHandoffComponent",
      false
    );

    const selector = usingHandoffComponent
      ? "content-search-handoff-ui"
      : ".search-handoff-button";

    let search = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector(selector),
      "Wait for search handoff component to render"
    );
    ok(search, "Got the content search handoff UI");
  },
});

test_newtab(function test_render_topsites() {
  let topSites = content.document.querySelector(".top-sites-list");
  ok(topSites, "Got the top sites section");
});

test_newtab({
  async before({ pushPrefs }) {
    await pushPrefs([
      "browser.newtabpage.activity-stream.feeds.topsites",
      false,
    ]);
  },
  test: function test_render_no_topsites() {
    let topSites = content.document.querySelector(".top-sites-list");
    ok(!topSites, "No top sites section");
  },
});

// This next test runs immediately after test_render_no_topsites to make sure
// the topsites pref is restored
test_newtab(function test_render_topsites_again() {
  let topSites = content.document.querySelector(".top-sites-list");
  ok(topSites, "Got the top sites section again");
});

test_newtab({
  async before({ pushPrefs }) {
    await pushPrefs([
      "browser.newtabpage.activity-stream.logowordmark.alwaysVisible",
      false,
    ]);
  },
  test: function test_render_logo_false() {
    let logoWordmark = content.document.querySelector(".logo-and-wordmark");
    ok(!logoWordmark, "The logo is not rendered when pref is false");
  },
});

test_newtab({
  async before({ pushPrefs }) {
    await pushPrefs([
      "browser.newtabpage.activity-stream.logowordmark.alwaysVisible",
      true,
    ]);
  },
  test: function test_render_logo() {
    let logoWordmark = content.document.querySelector(".logo-and-wordmark");
    ok(logoWordmark, "The logo is rendered when pref is true");
  },
});
