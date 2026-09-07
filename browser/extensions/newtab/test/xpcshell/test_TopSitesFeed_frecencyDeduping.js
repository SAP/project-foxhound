/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TopSitesFeed: "resource://newtab/lib/TopSitesFeed.sys.mjs",
  DEFAULT_TOP_SITES: "resource://newtab/lib/TopSitesFeed.sys.mjs",
});

const PREF_SOV_ENABLED = "sov.enabled";
const SHOW_SPONSORED_PREF = "showSponsoredTopSites";
const ROWS_PREF = "topSitesRows";

async function getTopSitesFeedForTest(
  sandbox,
  { frecent = [], contile = [] } = {}
) {
  let feed = new TopSitesFeed();

  feed.store = {
    dispatch: sandbox.spy(),
    getState() {
      return this.state;
    },
    state: {
      Prefs: {
        values: {
          [PREF_SOV_ENABLED]: true,
          [SHOW_SPONSORED_PREF]: true,
          [ROWS_PREF]: 1,
        },
      },
      TopSites: {
        sov: {
          ready: true,
          positions: [
            { position: 1, assignedPartner: "amp" },
            { position: 2, assignedPartner: "frec-boost" },
          ],
        },
      },
    },
  };

  feed.frecentCache = {
    request() {
      return this.cache;
    },
    cache: frecent,
  };
  feed.frecencyBoostProvider.frecentCache = feed.frecentCache;

  feed._contile = {
    sov: true,
    sovEnabled: () => true,
    sites: contile,
  };

  const frecencyBoostedSponsors = new Map([
    [
      "domain1",
      {
        domain: "https://domain1.com",
        faviconDataURI: "faviconDataURI1",
        hostname: "domain1",
        redirectURL: "https://redirectURL1.com",
        title: "title1",
      },
    ],
    [
      "domain2",
      {
        domain: "https://domain2.com",
        faviconDataURI: "faviconDataURI2",
        hostname: "domain2",
        redirectURL: "https://redirectURL2.com",
        title: "title2",
      },
    ],
  ]);

  sandbox
    .stub(feed.frecencyBoostProvider, "_frecencyBoostedSponsors")
    .value(frecencyBoostedSponsors);

  // Stub random fallback to return null for testing deduping logic.
  sandbox
    .stub(feed.frecencyBoostProvider, "retrieveRandomFrecencyTile")
    .returns(null);

  // We need to refresh, because TopSitesFeed's
  // DEFAULT_TOP_SITES acts like a singleton.
  DEFAULT_TOP_SITES.length = 0;
  feed._readContile();

  // Kick off an update so the cache is populated.
  await feed.frecencyBoostProvider.update();

  return feed;
}

add_task(async function test_dedupeSponsorsAgainstNothing() {
  let sandbox = sinon.createSandbox();
  {
    info("TopSitesFeed.getLinksWithDefaults - Should return all defaults");
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
      ],
      contile: [{ url: "https://contile1.com", name: "contile1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "default1");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.getLinksWithDefaults - " +
        "Should return a frecency match in the second position"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
        { url: "https://domain1.com", frecency: 1000 },
      ],
      contile: [{ url: "https://contile1.com", name: "contile1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "domain1");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.getLinksWithDefaults - " +
        "Should return a frecency match with path in the second position"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
        { url: "https://domain1.com/path", frecency: 1000 },
      ],
      contile: [{ url: "https://contile1.com", name: "contile1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "domain1");

    sandbox.restore();
  }
});

add_task(async function test_dedupeSponsorsAgainstTopsites() {
  let sandbox = sinon.createSandbox();
  {
    info(
      "TopSitesFeed.getLinksWithDefaults - " +
        "Should dedupe against matching topsite"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://domain1.com", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
      ],
      contile: [{ url: "https://contile1.com", name: "contile1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "default1");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.getLinksWithDefaults - " +
        "Should dedupe against matching topsite with path"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://domain1.com/page", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
      ],
      contile: [{ url: "https://contile1.com", name: "contile1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "default1");

    sandbox.restore();
  }
});

add_task(async function test_dedupeSponsorsAgainstContile() {
  let sandbox = sinon.createSandbox();
  {
    info(
      "TopSitesFeed.getLinksWithDefaults - " +
        "Should dedupe against matching contile"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
        { url: "https://domain1.com", frecency: 1000 },
      ],
      contile: [{ url: "https://domain1.com", name: "contile1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "default1");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.getLinksWithDefaults - " +
        "Should dedupe against matching contile label"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        { url: "https://default1.com", frecency: 1000 },
        { url: "https://default2.com", frecency: 1000 },
        { url: "https://default3.com", frecency: 1000 },
        { url: "https://default4.com", frecency: 1000 },
        { url: "https://default5.com", frecency: 1000 },
        { url: "https://default6.com", frecency: 1000 },
        { url: "https://default7.com", frecency: 1000 },
        { url: "https://default8.com", frecency: 1000 },
        { url: "https://domain1.com", frecency: 1000 },
      ],
      contile: [{ url: "https://contile1.com", name: "title1" }],
    });

    const withPinned = await feed.getLinksWithDefaults();
    Assert.equal(withPinned.length, 8);
    Assert.equal(withPinned[1].hostname, "default1");

    sandbox.restore();
  }
});
