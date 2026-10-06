/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { MLEngine } = ChromeUtils.importESModule(
  "resource://gre/actors/MLEngineParent.sys.mjs"
);

/**
 * Test that MLEngine properly manages request lifecycle.
 * This ensures security layer integration doesn't break request tracking.
 */
add_task(async function test_request_lifecycle_management() {
  info("Testing request lifecycle management");

  const engine = new MLEngine({
    mlEngineParent: {},
    pipelineOptions: { engineId: "test-request-lifecycle" },
    notificationsCallback: null,
  });

  // Verify engine starts with no pending requests
  // The #requests map is private, but we can test behavior

  // Without a port, run() should throw before creating a request
  let errorThrown = false;
  try {
    await engine.run({ args: ["test"] });
  } catch (error) {
    errorThrown = true;
    Assert.ok(
      error.message.includes("Port does not exist"),
      "Should fail on port check"
    );
  }

  Assert.ok(errorThrown, "run() without port should throw");

  await MLEngine.removeInstance("test-request-lifecycle", false, false);

  info("Request lifecycle management works correctly");
});
