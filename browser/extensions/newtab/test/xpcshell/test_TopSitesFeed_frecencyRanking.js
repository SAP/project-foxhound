/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  actionCreators: "resource://newtab/common/Actions.mjs",
  actionTypes: "resource://newtab/common/Actions.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TopSitesFeed: "resource://newtab/lib/TopSitesFeed.sys.mjs",
});

const PREF_SOV_ENABLED = "sov.enabled";
const SHOW_SPONSORED_PREF = "showSponsoredTopSites";
const ROWS_PREF = "topSitesRows";

async function getTopSitesFeedForTest(sandbox, { frecent = [] } = {}) {
  let feed = new TopSitesFeed();

  feed.store = {
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
    },
  };

  feed.frecentCache = {
    request() {
      return this.cache;
    },
    cache: frecent,
  };
  feed.frecencyBoostProvider.frecentCache = feed.frecentCache;

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
    [
      "domain3",
      {
        domain: "https://domain3.com",
        faviconDataURI: "faviconDataURI3",
        hostname: "domain3",
        redirectURL: "https://redirectURL3.com",
        title: "title3",
      },
    ],
    [
      "domain4",
      {
        domain: "https://domain4.com",
        faviconDataURI: "faviconDataURI4",
        hostname: "domain4",
        redirectURL: "https://redirectURL4.com",
        title: "title4",
      },
    ],
    [
      "sub.domain1",
      {
        domain: "https://sub.domain1.com",
        faviconDataURI: "faviconDataURI1",
        hostname: "sub.domain1",
        redirectURL: "https://redirectURL1.com",
        title: "title1",
      },
    ],
  ]);

  sandbox
    .stub(feed.frecencyBoostProvider, "_frecencyBoostedSponsors")
    .value(frecencyBoostedSponsors);

  // Kick off an update so the cache is populated.
  await feed.frecencyBoostProvider.update();

  return feed;
}

// eslint-disable-next-line max-statements
add_task(async function test_frecency_sponsored_topsites() {
  let sandbox = sinon.createSandbox();
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should return random fallback tile with no history"
    );
    const feed = await getTopSitesFeedForTest(sandbox);

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost-random");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should return a single match with the right format"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://domain1.com",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.deepEqual(frecencyBoostedSpocs[0], {
      hostname: "domain1",
      url: "https://redirectURL1.com",
      label: "title1",
      partner: "frec-boost",
      type: "frecency-boost",
      frecency: 1234,
      show_sponsored_label: true,
      favicon: "faviconDataURI1",
      faviconSize: 96,
    });

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should return multiple matches"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://domain1.com",
          frecency: 1234,
        },
        {
          url: "https://domain3.com",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 2);
    Assert.equal(frecencyBoostedSpocs[0].hostname, "domain1");
    Assert.equal(frecencyBoostedSpocs[1].hostname, "domain3");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should return a single match with partial url"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://domain1.com/path",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].hostname, "domain1");
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should return a single match with a subdomain"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://www.domain1.com",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].hostname, "domain1");
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should not return a match with a different subdomain (returns random fallback)"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://bus.domain1.com",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost-random");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should return a match with the same subdomain"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://sub.domain1.com",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].hostname, "sub.domain1");
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Should not match a partial domain (returns random fallback)"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://domain12.com",
          frecency: 1234,
        },
      ],
    });

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost-random");

    sandbox.restore();
  }
  {
    info(
      "TopSitesFeed.fetchFrecencyBoostedSpocs - " +
        "Control group always returns random tile (ignores frecency matches)"
    );
    const feed = await getTopSitesFeedForTest(sandbox, {
      frecent: [
        {
          url: "https://domain1.com",
          frecency: 1234,
        },
      ],
    });

    feed.store.state.Prefs.values.trainhopConfig = {
      sov: {
        random_sponsor: true,
      },
    };

    const frecencyBoostedSpocs = await feed.fetchFrecencyBoostedSpocs();
    Assert.equal(frecencyBoostedSpocs.length, 1);
    Assert.equal(frecencyBoostedSpocs[0].type, "frecency-boost-random");

    sandbox.restore();
  }
});
