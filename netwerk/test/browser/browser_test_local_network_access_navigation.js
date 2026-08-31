"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_local_network_access.js", gTestPath).href,
  this
);

add_setup(async function () {
  await setupLnaPrefs();
  await setupLnaServer();
});

requestLongerTimeout(2);

add_task(async function test_lna_top_level_navigation_bypass() {
  info(
    "Testing that top-level navigation to loopback-network bypasses LNA checks"
  );

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
      `${LNA_BASE_URL}page_with_non_trackers.html?isTopLevelNavigation=true`
    );

    // Wait for the navigation to complete
    info("Waiting for navigation to localhost to complete");
    await BrowserTestUtils.browserLoaded(tab.linkedBrowser, false, url =>
      url.includes("localhost:21555")
    );

    // Verify that no LNA permission prompt appeared
    // If our fix works correctly, there should be no popup notification
    let popup = PopupNotifications.getNotification(
      "loopback-network",
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
      `${LNA_BASE_URL}page_with_non_trackers.html?isTopLevelNavigation=true`
    );

    // Wait for LNA permission prompt to appear (since bypass is disabled)
    info("Waiting for LNA permission prompt to appear");
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");

    // Verify that LNA permission prompt did appear
    let popup = PopupNotifications.getNotification(
      "loopback-network",
      tab.linkedBrowser
    );
    ok(popup, "LNA permission prompt should appear when bypass is disabled");

    // Allow the permission to complete the navigation
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      gBrowser.selectedBrowser,
      "loopback-network"
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
