"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_local_network_access.js", gTestPath).href,
  this
);

add_setup(async function () {
  await setupLnaPrefs();
  await setupLnaServer();
});

add_task(async function test_lna_websocket_disabled() {
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
      `${LNA_BASE_URL}page_with_non_trackers.html?test=${websocketTest.type}&rand=${rand}`
    );

    await promise;
    gBrowser.removeTab(tab);

    info(
      "WebSocket LNA disabled test completed - connection was allowed to proceed"
    );
  } catch (error) {
    ok(false, `WebSocket LNA preference test failed: ${error.message}`);
  }

  await SpecialPowers.popPrefEnv();
});

add_task(async function test_lna_websocket_enabled() {
  info("Testing network.lna.websocket.enabled preference");

  // Set up LNA to trigger for localhost connections
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.blocking", true],
      ["network.lna.websocket.enabled", true], // Enable WebSocket LNA checks
      ["network.loopback-network.prompt.testing", true],
      ["network.loopback-network.prompt.testing.allow", false],
    ],
  });

  try {
    // Test WebSocket with LNA disabled - should bypass LNA and get connection refused
    const websocketTest = {
      type: "websocket",
      allowStatus: Cr.NS_ERROR_WEBSOCKET_CONNECTION_REFUSED,
      denyStatus: Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    };

    const rand2 = Math.random();
    const promise2 = observeAndCheck(
      websocketTest.type,
      rand2,
      websocketTest.denyStatus, // Should get LNA denied
      "WebSocket test with LNA enabled should trigger LNA checks"
    );

    const tab2 = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      `${LNA_BASE_URL}page_with_non_trackers.html?test=${websocketTest.type}&rand=${rand2}`
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
      `${LNA_BASE_URL}page_with_non_trackers.html?test=${testType}&rand=${rand}`
    );

    // Wait for LNA permission prompt to appear
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    info("LNA permission prompt appeared");

    // Verify prompt is visible
    let popup = PopupNotifications.getNotification(
      "loopback-network",
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
