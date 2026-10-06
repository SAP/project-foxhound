/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

const URL1 = TEST_PATH + "dummy_page.html?one";
const URL2 = TEST_PATH + "dummy_page.html?two";

async function getLabelValue(label) {
  await Services.fog.testFlushAllChildren();
  return Glean.bfcache.pageRestored[label].testGetValue();
}

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [["fission.bfcacheInParent", true]],
  });
});

add_task(async function test_bfcache_page_restored_telemetry() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  is(
    await getLabelValue("true"),
    null,
    "true counter is unset before navigation"
  );
  is(
    await getLabelValue("false"),
    null,
    "false counter is unset before navigation"
  );

  await BrowserTestUtils.withNewTab(URL1, async browser => {
    let loaded = BrowserTestUtils.browserLoaded(browser, false, URL2);
    BrowserTestUtils.startLoadingURIString(browser, URL2);
    await loaded;

    browser.goBack();

    await TestUtils.waitForCondition(
      async () => (await getLabelValue("true")) === 1,
      "Waiting for bfcache.page_restored 'true' to be incremented"
    );
    is(
      await getLabelValue("false"),
      null,
      "bfcache.page_restored 'false' should not be incremented when bfcache restore succeeds"
    );
  });
});

add_task(async function test_bfcache_page_restored_telemetry_not_in_bfcache() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();

  is(
    await getLabelValue("true"),
    null,
    "true counter is unset before navigation"
  );
  is(
    await getLabelValue("false"),
    null,
    "false counter is unset before navigation"
  );

  await BrowserTestUtils.withNewTab(URL1, async browser => {
    // Register an `onunload` handler in order to prevent the page from being bfcached.
    await SpecialPowers.spawn(browser, [], () => {
      content.window.onunload = () => {};
    });

    let loaded = BrowserTestUtils.browserLoaded(browser, false, URL2);
    BrowserTestUtils.startLoadingURIString(browser, URL2);
    await loaded;

    browser.goBack();

    await TestUtils.waitForCondition(
      async () => (await getLabelValue("false")) === 1,
      "Waiting for bfcache.page_restored 'false' to be incremented"
    );
    is(
      await getLabelValue("true"),
      null,
      "bfcache.page_restored 'true' should not be incremented when bfcache restore fails"
    );
  });
});
