/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AddonTestUtils: "resource://testing-common/AddonTestUtils.sys.mjs",
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

const DEFAULT_CHUNK_SIZE = 50;

// XXX: We can consolidate this once bug 1930955 lands
// eslint-disable-next-line no-unused-vars
const perfMetadata = {
  owner: "Places",
  name: "Calculate Frecency Speed",
  description: "Audits the speed of running calculate_frecency.",
  options: {
    default: {
      extra_args: ["headless"],
      manifest: "perftest.toml",
      manifest_flavor: "browser-chrome",
      perfherder: true,
      perfherder_metrics: [
        // Timing metrics.
        {
          name: "PlacesCalculateFrecencyHighFrequency",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "PlacesCalculateFrecencyLowFrequency",
          unit: "ms",
          shouldAlert: false,
        },
        {
          name: "PlacesCalculateFrecencyChunked",
          unit: "ms",
          shouldAlert: false,
        },
      ],
      try_platform: ["linux", "mac"],
      verbose: true,
    },
  },
};

function createTimer(metricName) {
  let accumulatedTime = 0;
  let iterations = 0;
  let now = 0;
  return {
    start() {
      now = ChromeUtils.now();
    },
    stop() {
      accumulatedTime += ChromeUtils.now() - now;
      iterations++;
    },
    reportMetrics() {
      const metrics = {};
      metrics[metricName] = accumulatedTime / iterations;
      info(`perfMetrics | ${JSON.stringify(metrics)}`);
    },
  };
}

add_task(async function measure_frecency_speed() {
  let testData = [
    // High frequency, recent visits.
    {
      timerName: "PlacesCalculateFrecencyHighFrequency",
      urls: [
        {
          url: "https://www.mozilla.org/",
          visits: [
            {
              // 1 hour ago
              date: new Date(Date.now() - 1000 * 60 * 60),
              transition: PlacesUtils.history.TRANSITIONS.TYPED,
            },
            {
              // 1 day ago
              date: new Date(Date.now() - 1000 * 60 * 60 * 24),
              transition: PlacesUtils.history.TRANSITIONS.TYPED,
            },
            {
              // 7 days ago
              date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
              transition: PlacesUtils.history.TRANSITIONS.TYPED,
            },
            {
              // 14 days ago
              date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
              transition: PlacesUtils.history.TRANSITIONS.TYPED,
            },
            {
              // 30 days ago
              date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
              transition: PlacesUtils.history.TRANSITIONS.TYPED,
            },
          ],
        },
      ],
    },
    // Low frequency, old visit.
    {
      timerName: "PlacesCalculateFrecencyLowFrequency",
      urls: [
        {
          url: "https://old.mozilla.org/",
          visits: [
            {
              // 365 days ago
              date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
              transition: PlacesUtils.history.TRANSITIONS.LINK,
            },
          ],
        },
      ],
    },
    // Many different URLs.
    {
      timerName: "PlacesCalculateFrecencyChunked",
      urls: [
        ...Array.from({ length: DEFAULT_CHUNK_SIZE }, (_, i) => ({
          url: `https://www.example${i}.com/`,
          visits: [
            {
              date: new Date(),
            },
          ],
        })),
      ],
    },
  ];

  for (let item of testData) {
    await PlacesUtils.bookmarks.eraseEverything();
    await PlacesUtils.history.clear();

    let db = await PlacesUtils.promiseDBConnection();
    let initialIds = await db.executeCached(`
      SELECT id FROM moz_places
      ORDER BY id
    `);
    Assert.equal(initialIds.length, 0, "Places should be empty.");

    for (let urlData of item.urls) {
      for (let visit of urlData.visits) {
        await PlacesTestUtils.addVisits({
          uri: urlData.url,
          visitDate: visit.date,
          transition: visit.transition,
        });
      }
    }
    let placeIds = await db.executeCached(`
      SELECT id FROM moz_places
      ORDER BY id
    `);
    Assert.equal(
      placeIds.length,
      item.urls.length,
      "Places should match the number of URLs in the test."
    );

    let frecencyTimer = createTimer(item.timerName);
    await PlacesUtils.withConnectionWrapper("Calculate Frecency", async db => {
      frecencyTimer.start();
      await db.executeCached(
        `
        UPDATE moz_places
        SET frecency = CALCULATE_FRECENCY(id)
      `
      );
      frecencyTimer.stop();
    });

    frecencyTimer.reportMetrics();
  }
});
