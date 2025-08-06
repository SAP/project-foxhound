/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests that upon initializing Activity Stream, the cached about:home
 * document does not process any actions caused by that initialization.
 * This is because the restored Redux state from the cache should be enough,
 * and processing any of the initialization messages from Activity Stream
 * could wipe out that state and cause flicker / unnecessary redraws.
 */
add_task(async function test_no_startup_actions() {
  await withFullyLoadedAboutHome(async browser => {
    // Make sure we have a cached document. We simulate a restart to ensure
    // that we start with a cache... that we can then clear without a problem,
    // before writing a new cache. This ensures that no matter what, we're in a
    // state where we have a fresh cache, regardless of what's happened in earlier
    // tests.
    await simulateRestart(browser);
    await clearCache();
    await simulateRestart(browser);
    await ensureCachedAboutHome(browser);

    // Set up a listener to monitor for actions that get dispatched in the
    // browser when we fire Activity Stream up again.
    await SpecialPowers.spawn(browser, [], async () => {
      let xrayWindow = ChromeUtils.waiveXrays(content);
      xrayWindow.nonStartupActions = [];
      xrayWindow.startupActions = [];
      xrayWindow.RPMAddMessageListener("ActivityStream:MainToContent", msg => {
        if (msg.data.meta.isStartup) {
          xrayWindow.startupActions.push(msg.data);
        } else {
          xrayWindow.nonStartupActions.push(msg.data);
        }
      });
    });

    // The following two statements seem to be enough to simulate Activity
    // Stream starting up.
    AboutNewTab.activityStream.uninit();
    AboutNewTab.onBrowserReady();

    // Much of Activity Stream initializes asynchronously. This is the easiest way
    // I could find to ensure that enough of the feeds had initialized to produce
    // a meaningful cached document.
    await TestUtils.waitForCondition(() => {
      let feed = AboutNewTab.activityStream.store.feeds.get(
        "feeds.discoverystreamfeed"
      );
      return feed?.loaded;
    });

    // Wait an additional few seconds for any other actions to get displayed.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 2000));

    let [startupActions, nonStartupActions] = await SpecialPowers.spawn(
      browser,
      [],
      async () => {
        let xrayWindow = ChromeUtils.waiveXrays(content);
        return [xrayWindow.startupActions, xrayWindow.nonStartupActions];
      }
    );

    Assert.ok(!!startupActions.length, "Should have seen startup actions.");
    info(`Saw ${startupActions.length} startup actions.`);

    Assert.equal(
      nonStartupActions.length,
      2,
      "Should be no non-ads non-startup actions."
    );

    // We expect 2 startup actions for ads.
    Assert.equal(
      nonStartupActions[0].type,
      "DISCOVERY_STREAM_SPOCS_UPDATE",
      "Should be a single DISCOVERY_STREAM_SPOCS_UPDATE action"
    );

    Assert.equal(
      nonStartupActions[1].type,
      "TOP_SITES_UPDATED",
      "Should be a single TOP_SITES_UPDATED action"
    );

    if (nonStartupActions.length) {
      for (let action of nonStartupActions) {
        info(`Non-startup action: ${action.type}`);
      }
    }
  });
});
