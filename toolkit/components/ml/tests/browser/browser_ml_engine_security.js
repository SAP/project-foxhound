/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Browser integration tests for ML security layer scaffolding.
 * These tests verify that the security layer infrastructure is correctly
 * integrated into MLEngine.
 */

/**
 * Test that MLEngine can be instantiated with security layer integrated.
 */
add_task(async function test_mlengine_instantiation() {
  info("Testing MLEngine instantiation with security layer");

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ml.enable", true]],
  });

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "data:text/html,<meta charset=utf-8>MLEngine Test"
  );

  try {
    const { MLEngine } = ChromeUtils.importESModule(
      "resource://gre/actors/MLEngineParent.sys.mjs"
    );

    // Create engine instance
    const engine = new MLEngine({
      mlEngineParent: {},
      pipelineOptions: {
        engineId: "browser-test-instantiation",
        featureId: "test-feature",
        taskName: "test-task",
      },
      notificationsCallback: null,
    });

    Assert.ok(engine, "MLEngine instantiates successfully");
    Assert.equal(
      engine.engineId,
      "browser-test-instantiation",
      "Engine ID is set correctly"
    );
    Assert.equal(
      engine.engineStatus,
      "uninitialized",
      "Initial status is uninitialized"
    );

    // Verify engine is tracked
    const retrieved = MLEngine.getInstance("browser-test-instantiation");
    Assert.equal(retrieved, engine, "Engine is tracked in instances map");

    // Clean up
    await MLEngine.removeInstance("browser-test-instantiation", false, false);

    info("MLEngine instantiation works with security layer");
  } finally {
    BrowserTestUtils.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
});
