"use strict";

const PROMPT_ALLOW_BUTTON = -1;
const PROMPT_NOT_NOW_BUTTON = 0;

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

const baseURL = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

async function restorePermissions() {
  info("Restoring permissions");
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");
  Services.perms.removeAll();
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["permissions.manager.defaultsUrl", ""],
      ["network.websocket.delay-failed-reconnects", false],
      ["network.websocket.max-connections", 1000],
      ["network.lna.block_trackers", true],
      ["network.lna.blocking", true],
      ["network.http.rcwn.enabled", false],
      ["network.lna.websocket.enabled", true],
      ["network.lna.local-network-to-localhost.skip-checks", false],
    ],
  });
  Services.obs.notifyObservers(null, "testonly-reload-permissions-from-disk");

  const server = new HttpServer();
  server.start(21555);
  registerServerHandlers(server);

  registerCleanupFunction(async () => {
    await restorePermissions();
    await new Promise(resolve => {
      server.stop(resolve);
    });
  });
});

requestLongerTimeout(10);

function clickDoorhangerButton(buttonIndex, browser, notificationID) {
  let popup = PopupNotifications.getNotification(notificationID, browser);
  let notification = popup?.owner?.panel?.childNodes?.[0];
  ok(notification, "Notification popup is available");

  if (buttonIndex === PROMPT_ALLOW_BUTTON) {
    ok(true, "Triggering main action (allow)");
    notification.button.doCommand();
  } else {
    ok(true, "Triggering secondary action (deny)");
    notification.secondaryButton.doCommand();
  }
}

function observeAndCheck(testType, rand, expectedStatus, message) {
  return new Promise(resolve => {
    const url = `http://localhost:21555/?type=${testType}&rand=${rand}`;
    const observer = {
      observe(subject, topic) {
        if (topic !== "http-on-stop-request") {
          return;
        }

        let channel = subject.QueryInterface(Ci.nsIHttpChannel);
        if (!channel || channel.URI.spec !== url) {
          return;
        }

        is(channel.status, expectedStatus, message);
        Services.obs.removeObserver(observer, "http-on-stop-request");
        resolve();
      },
    };
    Services.obs.addObserver(observer, "http-on-stop-request");
  });
}

const testCases = [
  {
    type: "fetch",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "xhr",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "img",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "video",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "audio",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "iframe",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "script",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "font",
    allowStatus: Cr.NS_OK,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
  {
    type: "websocket",
    allowStatus: Cr.NS_ERROR_WEBSOCKET_CONNECTION_REFUSED,
    denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
  },
];

function registerServerHandlers(server) {
  server.registerPathHandler("/", (request, response) => {
    const params = new URLSearchParams(request.queryString);
    const type = params.get("type");

    response.setHeader("Access-Control-Allow-Origin", "*", false);

    switch (type) {
      case "img":
        response.setHeader("Content-Type", "image/gif", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write(
          atob("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==")
        );
        break;
      case "audio":
        response.setHeader("Content-Type", "audio/wav", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write(
          atob("UklGRhYAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=")
        );
        break;
      case "video":
        response.setHeader("Content-Type", "video/mp4", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write(
          atob(
            "GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA="
          )
        );
        break;
      default:
        response.setHeader("Content-Type", "text/plain", false);
        response.setStatusLine(request.httpVersion, 200, "OK");
        response.write("hello");
    }
  });
}

async function runSingleTestCase(
  test,
  rand,
  expectedStatus,
  description,
  userAction = null,
  notificationID = null
) {
  info(description);

  const promise = observeAndCheck(test.type, rand, expectedStatus, description);
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_with_non_trackers.html?test=${test.type}&rand=${rand}`
  );

  if (userAction && notificationID) {
    const buttonNum =
      userAction === "allow" ? PROMPT_ALLOW_BUTTON : PROMPT_NOT_NOW_BUTTON;

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(buttonNum, gBrowser.selectedBrowser, notificationID);
  }

  await promise;
  gBrowser.removeTab(tab);
}

async function runPromptedLnaTest(test, overrideLabel, notificationID) {
  const promptActions = ["allow", "deny"];
  for (const userAction of promptActions) {
    const rand = Math.random();
    const expectedStatus =
      userAction === "allow" ? test.allowStatus : test.denyStatus;

    await runSingleTestCase(
      test,
      rand,
      expectedStatus,
      `LNA test (${overrideLabel}) for ${test.type} with user action: ${userAction}`,
      userAction,
      notificationID
    );

    // Wait some time for cache entry to be updated
    // XXX(valentin) though this should not be necessary.
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    // Now run the test again with cached main document
    await runSingleTestCase(
      test,
      rand,
      expectedStatus,
      `LNA test (${overrideLabel}) for ${test.type} with user action: ${userAction}`,
      userAction,
      notificationID
    );
  }
}

add_task(async function test_lna_prompt_behavior() {
  // Non-LNA test: no prompt expected
  for (const test of testCases) {
    const rand = Math.random();
    await runSingleTestCase(
      test,
      rand,
      test.allowStatus,
      `Non-LNA test for ${test.type}`
    );
  }

  // Public -> Local test (localhost permission)
  Services.prefs.setCharPref(
    "network.lna.address_space.public.override",
    "127.0.0.1:4443"
  );
  for (const test of testCases) {
    await runPromptedLnaTest(test, "public", "localhost");
  }

  // Public -> Private (local-network permission)
  Services.prefs.setCharPref(
    "network.lna.address_space.private.override",
    "127.0.0.1:21555"
  );
  for (const test of testCases) {
    await runPromptedLnaTest(test, "private", "local-network");
  }

  Services.prefs.clearUserPref("network.lna.address_space.public.override");
  Services.prefs.clearUserPref("network.lna.address_space.private.override");
});

add_task(async function test_lna_cancellation_during_prompt() {
  info("Testing LNA cancellation during permission prompt");

  // Disable RCWN but enable caching for this test
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.rcwn.enabled", false],
      ["browser.cache.disk.enable", true],
      ["browser.cache.memory.enable", true],
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
    ],
  });

  const testType = "fetch";
  const rand1 = Math.random();

  // Test 1: Cancel request during LNA prompt and verify proper cleanup
  info(
    "Step 1: Making request that will trigger LNA prompt, then cancelling it"
  );

  // Open tab and wait for LNA prompt
  const tab1 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_with_non_trackers.html?test=${testType}&rand=${rand1}`
  );

  // Wait for the LNA permission prompt to appear
  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  info("LNA permission prompt appeared");
  gBrowser.removeTab(tab1);
  // Navigate to a new URL (which should cancel the pending request)
  const tab2 = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_with_non_trackers.html?test=${testType}&rand=${rand1}`
  );
  info("Navigated to new URL, request should be cancelled");

  // Wait for the navigation to complete
  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "localhost"
  );

  // Close the first tab now that we're done with it
  gBrowser.removeTab(tab2);

  // The main test objective is complete - we verified that cancellation
  // during LNA prompt works without hanging channels. The navigation
  // completed successfully, which means our fix is working correctly.
  info(
    "Test completed successfully - cancellation during LNA prompt handled correctly"
  );

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_lna_top_level_navigation_bypass() {
  info("Testing that top-level navigation to localhost bypasses LNA checks");

  // Set up LNA to trigger for localhost connections and enable top-level navigation bypass
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.allow_top_level_navigation", true],
    ],
  });

  requestLongerTimeout(1);

  // Observer to verify that the navigation request succeeds without LNA error
  const navigationObserver = {
    observe(subject, topic) {
      if (topic !== "http-on-stop-request") {
        return;
      }

      let channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (!channel || !channel.URI.spec.includes("localhost:21555")) {
        return;
      }

      // For top-level navigation, we expect success (not LNA denied)
      // The channel status should be NS_OK, not NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED
      is(
        channel.status,
        Cr.NS_OK,
        "Top-level navigation to localhost should not be blocked by LNA"
      );

      Services.obs.removeObserver(navigationObserver, "http-on-stop-request");
    },
  };

  Services.obs.addObserver(navigationObserver, "http-on-stop-request");

  try {
    // Load the test page which will automatically navigate to localhost
    info("Loading test page that will trigger navigation to localhost");

    // Open the initial page - it will automatically navigate to localhost
    const tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      `${baseURL}page_with_non_trackers.html?isTopLevelNavigation=true`
    );

    // Wait for the navigation to complete
    info("Waiting for navigation to localhost to complete");
    await BrowserTestUtils.browserLoaded(tab.linkedBrowser, false, url =>
      url.includes("localhost:21555")
    );

    // Verify that no LNA permission prompt appeared
    // If our fix works correctly, there should be no popup notification
    let popup = PopupNotifications.getNotification(
      "localhost",
      tab.linkedBrowser
    );
    ok(
      !popup,
      "No LNA permission prompt should appear for top-level navigation"
    );

    // Verify the page loaded successfully
    let location = await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
      return content.location.href;
    });

    ok(
      location.includes("localhost:21555"),
      "Top-level navigation to localhost should succeed"
    );

    gBrowser.removeTab(tab);

    info("Top-level navigation test completed successfully");
  } catch (error) {
    ok(false, `Top-level navigation test failed: ${error.message}`);
  }

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_lna_top_level_navigation_disabled() {
  info("Testing that top-level navigation LNA bypass can be disabled via pref");

  // Set up LNA to trigger for localhost connections but disable top-level navigation bypass
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.allow_top_level_navigation", false],
    ],
  });

  requestLongerTimeout(1);

  try {
    // Load the test page which will attempt to navigate to localhost
    info("Loading test page that will try to navigate to localhost");
    const tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      `${baseURL}page_with_non_trackers.html?isTopLevelNavigation=true`
    );

    // Wait for LNA permission prompt to appear (since bypass is disabled)
    info("Waiting for LNA permission prompt to appear");
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");

    // Verify that LNA permission prompt did appear
    let popup = PopupNotifications.getNotification(
      "localhost",
      tab.linkedBrowser
    );
    ok(popup, "LNA permission prompt should appear when bypass is disabled");

    // Allow the permission to complete the navigation
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      gBrowser.selectedBrowser,
      "localhost"
    );

    // Wait for navigation to complete after permission granted
    await BrowserTestUtils.browserLoaded(tab.linkedBrowser, false, url =>
      url.includes("localhost:21555")
    );

    gBrowser.removeTab(tab);

    info("Top-level navigation disabled test completed successfully");
  } catch (error) {
    ok(false, `Top-level navigation disabled test failed: ${error.message}`);
  }

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_lna_websocket_preference() {
  info("Testing network.lna.websocket.enabled preference");

  // Set up LNA to trigger for localhost connections
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.blocking", true],
      ["network.lna.websocket.enabled", false], // Disable WebSocket LNA checks
    ],
  });

  try {
    // Test WebSocket with LNA disabled - should bypass LNA and get connection refused
    const websocketTest = {
      type: "websocket",
      allowStatus: Cr.NS_ERROR_WEBSOCKET_CONNECTION_REFUSED,
      denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    };

    const rand = Math.random();
    const promise = observeAndCheck(
      websocketTest.type,
      rand,
      websocketTest.allowStatus, // Should get connection refused, not LNA denied
      "WebSocket test with LNA disabled should bypass LNA checks"
    );

    const tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      `${baseURL}page_with_non_trackers.html?test=${websocketTest.type}&rand=${rand}`
    );

    await promise;
    gBrowser.removeTab(tab);

    info(
      "WebSocket LNA disabled test completed - connection was allowed to proceed"
    );

    // Now test with WebSocket LNA enabled - should trigger LNA denial
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.websocket.enabled", true], // Enable WebSocket LNA checks
        ["network.localhost.prompt.testing", true],
        ["network.localhost.prompt.testing.allow", false],
      ],
    });

    const rand2 = Math.random();
    const promise2 = observeAndCheck(
      websocketTest.type,
      rand2,
      websocketTest.denyStatus, // Should get LNA denied
      "WebSocket test with LNA enabled should trigger LNA checks"
    );

    const tab2 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      `${baseURL}page_with_non_trackers.html?test=${websocketTest.type}&rand=${rand2}`
    );

    await promise2;
    gBrowser.removeTab(tab2);

    info("WebSocket LNA enabled test completed - LNA checks were applied");
  } catch (error) {
    ok(false, `WebSocket LNA preference test failed: ${error.message}`);
  }

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_lna_prompt_timeout() {
  info("Testing LNA permission prompt timeout");

  // Set up a short timeout for testing (1 second instead of 5 minutes)
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.prompt.timeout", 1000], // 1 second timeout for testing
    ],
  });

  try {
    const testType = "fetch";
    const rand = Math.random();

    info("Triggering LNA prompt that will timeout");

    // Set up observer to verify request fails with LNA denied status
    const promise = observeAndCheck(
      testType,
      rand,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "LNA request should fail after prompt timeout"
    );

    // Open tab that will trigger LNA prompt
    const tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      `${baseURL}page_with_non_trackers.html?test=${testType}&rand=${rand}`
    );

    // Wait for LNA permission prompt to appear
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    info("LNA permission prompt appeared");

    // Verify prompt is visible
    let popup = PopupNotifications.getNotification(
      "localhost",
      tab.linkedBrowser
    );
    ok(popup, "LNA permission prompt should be visible");

    // Do NOT click any button - let it timeout
    info("Waiting for prompt to timeout (1 second)...");

    // Wait for timeout + a small buffer to ensure timeout has fired
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify prompt has been dismissed
    popup = PopupNotifications.getNotification("localhost", tab.linkedBrowser);
    ok(!popup, "LNA permission prompt should be dismissed after timeout");

    // Wait for the network request to complete with denial status
    await promise;

    gBrowser.removeTab(tab);

    info("LNA prompt timeout test completed successfully");
  } catch (error) {
    ok(false, `LNA prompt timeout test failed: ${error.message}`);
  }

  await SpecialPowers.popPrefEnv();
});

// Test that telemetry is recorded when LNA prompt is shown
// and not incremented for subsequent requests with cached permission
add_task(async function test_lna_prompt_telemetry() {
  await restorePermissions();

  // Reset telemetry
  Services.fog.testResetFOG();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand1 = Math.random();
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_with_non_trackers.html?test=fetch&rand=${rand1}`
  );

  // Wait for the prompt to appear
  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");

  // Verify telemetry was recorded
  let metricValue =
    await Glean.networking.localNetworkAccessPromptsShown.localhost.testGetValue();
  is(metricValue, 1, "Should record telemetry when localhost prompt is shown");

  // Grant permission
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "localhost"
  );

  // Wait for permission to be saved
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 300));

  // Make a second request in the same tab with cached permission
  const rand2 = Math.random();
  const promise = observeAndCheck(
    "fetch",
    rand2,
    Cr.NS_OK,
    "Second request should succeed without prompt"
  );
  await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
    await content.fetch(`http://localhost:21555/?type=fetch&rand=${rand}`);
  });
  await promise;

  // Verify telemetry was not incremented
  metricValue =
    await Glean.networking.localNetworkAccessPromptsShown.localhost.testGetValue();
  is(
    metricValue,
    1,
    "Telemetry should not increment for requests with cached permission"
  );

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

// Test that telemetry is recorded when user denies LNA prompt
// and not incremented for subsequent requests with temporary deny permission
add_task(async function test_lna_prompt_telemetry_deny() {
  await restorePermissions();

  // Reset telemetry
  Services.fog.testResetFOG();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand1 = Math.random();
  const promise1 = observeAndCheck(
    "fetch",
    rand1,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "First request should be denied"
  );
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    `${baseURL}page_with_non_trackers.html?test=fetch&rand=${rand1}`
  );

  // Wait for the prompt to appear
  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");

  // Verify telemetry was recorded
  let metricValue =
    await Glean.networking.localNetworkAccessPromptsShown.localhost.testGetValue();
  is(metricValue, 1, "Should record telemetry when localhost prompt is shown");

  // Deny permission
  clickDoorhangerButton(
    PROMPT_NOT_NOW_BUTTON,
    gBrowser.selectedBrowser,
    "localhost"
  );

  await promise1;

  // Wait for permission to be saved
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 300));

  // Make a second request - should be auto-denied without showing prompt
  // because a temporary deny permission was saved
  const rand2 = Math.random();
  const promise2 = observeAndCheck(
    "fetch",
    rand2,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "Second request should be auto-denied with temporary permission"
  );
  await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
    await content
      .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
      .catch(() => {});
  });

  await promise2;

  // Verify telemetry was not incremented (no prompt shown with temporary deny)
  metricValue =
    await Glean.networking.localNetworkAccessPromptsShown.localhost.testGetValue();
  is(
    metricValue,
    1,
    "Telemetry should not increment for requests with temporary deny permission"
  );

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});
