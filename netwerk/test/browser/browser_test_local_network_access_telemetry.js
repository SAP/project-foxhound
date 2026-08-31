"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_local_network_access.js", gTestPath).href,
  this
);

add_setup(async function () {
  await setupLnaPrefs();
  await setupLnaServer();
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
    `${LNA_BASE_URL}page_with_non_trackers.html?test=fetch&rand=${rand1}`
  );

  // Wait for the prompt to appear
  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");

  // Verify telemetry was recorded
  let metricValue =
    await Glean.networking.localNetworkAccessPromptsShown.localhost.testGetValue();
  is(
    metricValue,
    1,
    "Should record telemetry when loopback-network prompt is shown"
  );

  // Grant permission
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "loopback-network"
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
    `${LNA_BASE_URL}page_with_non_trackers.html?test=fetch&rand=${rand1}`
  );

  // Wait for the prompt to appear
  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");

  // Verify telemetry was recorded
  let metricValue =
    await Glean.networking.localNetworkAccessPromptsShown.localhost.testGetValue();
  is(
    metricValue,
    1,
    "Should record telemetry when loopback-network prompt is shown"
  );

  // Deny permission
  clickDoorhangerButton(
    PROMPT_NOT_NOW_BUTTON,
    gBrowser.selectedBrowser,
    "loopback-network"
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
