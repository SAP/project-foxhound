/* eslint-disable mozilla/no-arbitrary-setTimeout */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

/**
 * This file tests page reload key combination telemetry
 */

"use strict";

const gTestRoot = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "http://mochi.test:8888"
);

async function run_test(count) {
  Services.fog.testResetFOG();

  let newTab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: gTestRoot + "contain_iframe.html",
    waitForStateStop: true,
  });

  await new Promise(resolve =>
    setTimeout(function () {
      window.requestIdleCallback(resolve);
    }, 1000)
  );

  if (count < 2) {
    await BrowserTestUtils.removeTab(newTab);
    await run_test(count + 1);
  } else {
    await Services.fog.testFlushAllChildren();
    Assert.equal(
      Glean.geckoview.documentSiteOrigins.testGetValue().sum,
      2,
      "Two unique site origins recorded"
    );
    await BrowserTestUtils.removeTab(newTab);
  }
}

add_task(async function test_telemetryMoreSiteOrigin() {
  await run_test(1);
});
