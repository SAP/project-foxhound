/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_JSON_URL = URL_ROOT + "simple_json.json";
const PROFILER_URL_PREF = "devtools.performance.recording.ui-base-url";
const TEST_PROFILER_URL = "http://127.0.0.1:8888";

add_setup(async function () {
  info("Setting profiler URL to localhost for tests");
  await SpecialPowers.pushPrefEnv({
    set: [
      [PROFILER_URL_PREF, TEST_PROFILER_URL],
      ["devtools.jsonview.size-profiler.enabled", true],
    ],
  });
});

add_task(async function testProfileSizeButtonExists() {
  info("Test that the Profile Size button exists in the tab bar");

  await addJsonViewTab(TEST_JSON_URL);

  const buttonExists = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    () => {
      const button = content.document.querySelector(".profiler-icon-button");
      return !!button;
    }
  );

  ok(buttonExists, "Profile Size button should exist in the tab bar");
});

add_task(async function testProfileSizePostMessage() {
  info("Test that profile is sent via postMessage with correct handshake");

  await addJsonViewTab(TEST_JSON_URL);

  const browser = gBrowser.selectedBrowser;

  // Set up the mock for window.open before clicking
  await SpecialPowers.spawn(browser, [TEST_PROFILER_URL], expectedUrl => {
    const win = Cu.waiveXrays(content);

    // Create test results object
    win.testResults = {
      windowUrl: null,
      profile: null,
      receivedReadyRequest: false,
      messageOrigin: null,
      resolved: false,
    };

    // Mock window.open
    win.open = Cu.exportFunction(function (url) {
      win.testResults.windowUrl = url;

      // Create mock window object with postMessage
      const mockWindow = {
        postMessage(message, origin) {
          if (message.name === "ready:request") {
            win.testResults.receivedReadyRequest = true;
            win.testResults.messageOrigin = origin;
            // Simulate profiler responding with ready:response
            const event = new win.MessageEvent(
              "message",
              Cu.cloneInto(
                {
                  origin: expectedUrl,
                  data: { name: "ready:response" },
                },
                win
              )
            );
            win.dispatchEvent(event);
          } else if (message.name === "inject-profile") {
            win.testResults.profile = message.profile;
            win.testResults.resolved = true;
          }
        },
        close() {},
      };

      return Cu.cloneInto(mockWindow, win, { cloneFunctions: true });
    }, win);
  });

  // Click the button from within the content process
  await SpecialPowers.spawn(browser, [], () => {
    const button = content.document.querySelector(".profiler-icon-button");
    button.click();
  });

  // Wait for the test to complete
  await TestUtils.waitForCondition(
    async () => {
      return SpecialPowers.spawn(browser, [], () => {
        return Cu.waiveXrays(content).testResults?.resolved;
      });
    },
    "Waiting for profile to be sent",
    100,
    100
  );

  // Get the results
  const result = await SpecialPowers.spawn(browser, [], () => {
    return Cu.waiveXrays(content).testResults;
  });

  ok(result.windowUrl, "window.open should have been called");
  ok(
    result.windowUrl.includes("/from-post-message/"),
    `URL should contain /from-post-message/, got: ${result.windowUrl}`
  );
  ok(
    result.windowUrl.includes(TEST_PROFILER_URL),
    `URL should use preference URL ${TEST_PROFILER_URL}, got: ${result.windowUrl}`
  );
  ok(result.receivedReadyRequest, "Should send ready:request");
  is(
    result.messageOrigin,
    TEST_PROFILER_URL,
    "postMessage should use correct origin"
  );
  ok(result.profile, "Should capture profile");
  ok(result.profile.meta, "Profile should have meta");
  ok(result.profile.threads, "Profile should have threads");
});

add_task(async function testProfileCreation() {
  info("Test that a valid profile is created");

  const { createSizeProfile } = ChromeUtils.importESModule(
    "resource://devtools/client/jsonview/json-size-profiler.mjs"
  );

  const testJson = '{"name": "test", "value": 123}';
  const profile = createSizeProfile(testJson);

  ok(profile.meta, "Profile should have meta object");
  ok(Array.isArray(profile.threads), "Profile should have threads array");
  ok(
    Array.isArray(profile.meta.markerSchema),
    "Profile meta should have markerSchema array"
  );
  ok(
    Array.isArray(profile.meta.categories),
    "Profile meta should have categories array"
  );
  Assert.greater(
    profile.threads[0].samples.length,
    0,
    "Profile should have samples"
  );

  // Validate total size of samples
  const samples = profile.threads[0].samples;
  const totalSize = samples.weight.reduce((sum, weight) => sum + weight, 0);
  is(
    totalSize,
    testJson.length,
    "Total sample size should match JSON string length"
  );
});

add_task(async function testProfileCreationWithUtf8() {
  info("Test that profile correctly handles UTF-8 multi-byte characters");

  const { createSizeProfile } = ChromeUtils.importESModule(
    "resource://devtools/client/jsonview/json-size-profiler.mjs"
  );

  // Test with various UTF-8 characters
  // "café" - é is 2 bytes in UTF-8
  // "中文" - each character is 3 bytes in UTF-8
  // "🔥" - emoji is 4 bytes in UTF-8
  const testJson = '{"name": "café", "lang": "中文", "emoji": "🔥"}';
  const profile = createSizeProfile(testJson);

  // Calculate expected byte length (UTF-8 encoded)
  const utf8Encoder = new TextEncoder();
  const expectedByteLength = utf8Encoder.encode(testJson).length;

  const samples = profile.threads[0].samples;
  const totalSize = samples.weight.reduce((sum, weight) => sum + weight, 0);

  is(
    totalSize,
    expectedByteLength,
    `Total sample size should match UTF-8 byte length (${expectedByteLength} bytes, not ${testJson.length} characters)`
  );
  Assert.greater(
    expectedByteLength,
    testJson.length,
    "UTF-8 byte length should be greater than character count for this test string"
  );

  info(`Sample count: ${samples.length} for ${expectedByteLength} bytes`);
});
