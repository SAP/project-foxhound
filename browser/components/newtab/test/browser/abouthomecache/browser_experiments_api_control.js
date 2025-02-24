/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ExperimentFakes } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

registerCleanupFunction(async () => {
  // When the test completes, make sure we cleanup with a populated cache,
  // since this is the default starting state for these tests.
  await withFullyLoadedAboutHome(async browser => {
    await simulateRestart(browser);
  });
});

/**
 * Tests that the ExperimentsAPI mechanism can be used to remotely
 * enable and disable the about:home startup cache.
 */
add_task(async function test_experiments_api_control() {
  // First, the disabled case.
  await withFullyLoadedAboutHome(async browser => {
    let doEnrollmentCleanup = await ExperimentFakes.enrollWithFeatureConfig({
      featureId: "abouthomecache",
      value: { enabled: false },
    });

    Assert.ok(
      !Services.prefs.getBoolPref(
        "browser.startup.homepage.abouthome_cache.enabled"
      ),
      "NimbusFeatures should tell us that the about:home startup cache " +
        "is disabled"
    );

    await simulateRestart(browser);

    await ensureDynamicAboutHome(
      browser,
      AboutHomeStartupCache.CACHE_RESULT_SCALARS.DISABLED
    );

    doEnrollmentCleanup();
  });

  // Now the enabled case.
  await withFullyLoadedAboutHome(async browser => {
    let doEnrollmentCleanup = await ExperimentFakes.enrollWithFeatureConfig({
      featureId: "abouthomecache",
      value: { enabled: true },
    });

    Assert.ok(
      Services.prefs.getBoolPref(
        "browser.startup.homepage.abouthome_cache.enabled"
      ),
      "NimbusFeatures should tell us that the about:home startup cache " +
        "is enabled"
    );

    await simulateRestart(browser);
    await ensureCachedAboutHome(browser);
    doEnrollmentCleanup();
  });
});
