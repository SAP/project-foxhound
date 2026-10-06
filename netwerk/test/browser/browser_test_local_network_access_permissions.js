"use strict";

Services.scriptloader.loadSubScript(
  new URL("head_local_network_access.js", gTestPath).href,
  this
);

add_setup(async function () {
  await setupLnaPrefs();
  await setupLnaServer();
});

requestLongerTimeout(4);

/**
 * Test: Loopback-network temporary permission persists within expiry window
 *
 * Verifies that when a user grants loopback-network permission, subsequent
 * requests within the expiry window do NOT trigger a new prompt and succeed
 * automatically using the cached permission.
 *
 * Steps:
 * 1. Make a request that triggers loopback-network permission prompt
 * 2. User grants permission (clicks "Allow")
 * 3. Make a second request within the expiry window (< 2 seconds)
 * 4. Verify NO prompt appears and request succeeds
 *
 * This validates that temporary permissions work correctly and avoid
 * repeatedly prompting users for the same permission.
 */
add_task(async function test_lna_temporary_permission_expiry_loopback_allow() {
  info("Test loopback-network: Allow within expiry (no re-prompt)");
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
    ],
  });

  const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  info("Step 1: Make first request and grant permission");
  const rand1 = Math.random();
  let promise = observeAndCheck(
    "fetch",
    rand1,
    Cr.NS_OK,
    "First request should succeed after permission granted"
  );
  SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
    content
      .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
      .catch(() => {});
  });

  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(popup, "First prompt should appear");

  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    tab.linkedBrowser,
    "loopback-network"
  );
  await promise;

  // Wait for permission to be saved
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 300));

  info("Step 2: Make second request within expiry (should NOT prompt)");
  const rand2 = Math.random();
  promise = observeAndCheck(
    "fetch",
    rand2,
    Cr.NS_OK,
    "Second request within expiry should succeed without prompt"
  );
  await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
    await content.fetch(`http://localhost:21555/?type=fetch&rand=${rand}`);
  });
  await promise;

  // Verify no prompt appeared (permission was cached)
  popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(!popup, "No prompt should appear within expiry window");

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Loopback-network temporary permission expires and re-prompts
 *
 * Verifies that after the temporary permission expires, a new request
 * triggers a fresh permission prompt, ensuring permissions don't persist
 * indefinitely.
 *
 * Steps:
 * 1. Make a request that triggers loopback-network permission prompt
 * 2. User grants permission (clicks "Allow")
 * 3. Wait for permission to expire (2.5 seconds > 2 second timeout)
 * 4. Make another request after expiry
 * 5. Verify a NEW prompt appears (permission has expired)
 *
 * This validates that the custom LNA expiry time works correctly and
 * expired permissions trigger new prompts as expected.
 */
add_task(
  async function test_lna_temporary_permission_expiry_loopback_allow_after_expiry() {
    info(
      "Test loopback-network: Allow, then retry after expiry (should prompt)"
    );
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
      ],
    });

    const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    info("Step 1: Make first request and grant permission");
    const rand1 = Math.random();
    let promise = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_OK,
      "First request should succeed after permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "loopback-network"
    );
    await promise;

    // Wait for permission to be saved
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info("Step 2: Wait for permission to expire (2.5 seconds)");
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 2500));

    info("Step 3: Make request after expiry (should prompt again)");
    const rand2 = Math.random();
    promise = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_OK,
      "Request after expiry should succeed after new permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    // Verify prompt appears again after expiry
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    let popup = PopupNotifications.getNotification(
      "loopback-network",
      tab.linkedBrowser
    );
    ok(popup, "Prompt should appear again after expiry");

    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "loopback-network"
    );
    await promise;

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Loopback-network temporary deny permission persists within expiry window
 *
 * Verifies that when a user denies loopback-network permission, subsequent
 * requests within the expiry window do NOT trigger a new prompt and are
 * automatically denied using the cached deny permission.
 *
 * Steps:
 * 1. Make a request that triggers loopback-network permission prompt
 * 2. User denies permission (clicks "Not Now")
 * 3. Make a second request within the expiry window (< 2 seconds)
 * 4. Verify NO prompt appears and request is denied
 *
 * This validates that temporary deny permissions work correctly and avoid
 * repeatedly prompting users for permissions they've already denied.
 */
add_task(async function test_lna_temporary_permission_expiry_loopback_deny() {
  info("Test loopback-network: Deny within expiry (no re-prompt)");
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.lna.address_space.public.override", "127.0.0.1:4443"],
      ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
    ],
  });

  const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  info("Step 1: Make first request and deny permission");
  const rand1 = Math.random();
  let promise = observeAndCheck(
    "fetch",
    rand1,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "First request should be denied"
  );
  SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
    content
      .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
      .catch(() => {});
  });

  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(popup, "First prompt should appear");

  clickDoorhangerButton(
    PROMPT_NOT_NOW_BUTTON,
    tab.linkedBrowser,
    "loopback-network"
  );
  await promise;

  // Wait for permission to be saved
  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 300));

  info("Step 2: Make second request within expiry (should NOT prompt)");
  const rand2 = Math.random();
  promise = observeAndCheck(
    "fetch",
    rand2,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "Second request within expiry should be denied without prompt"
  );
  await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
    await content
      .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
      .catch(() => {});
  });
  await promise;

  // Verify no prompt appeared (deny permission was cached)
  popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(!popup, "No prompt should appear within expiry window");

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Loopback-network temporary deny permission expires and re-prompts
 *
 * Verifies that after a temporary deny permission expires, a new request
 * triggers a fresh permission prompt, giving the user another opportunity
 * to grant access.
 *
 * Steps:
 * 1. Make a request that triggers loopback-network permission prompt
 * 2. User denies permission (clicks "Not Now")
 * 3. Wait for deny permission to expire (2.5 seconds > 2 second timeout)
 * 4. Make another request after expiry
 * 5. Verify a NEW prompt appears (deny permission has expired)
 * 6. User can now choose to allow (demonstrating prompt works after expiry)
 *
 * This validates that temporary deny permissions expire correctly and
 * users get a second chance to grant permission after the timeout.
 */
add_task(
  async function test_lna_temporary_permission_expiry_loopback_deny_after_expiry() {
    info(
      "Test loopback-network: Deny, then retry after expiry (should prompt)"
    );
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
      ],
    });

    const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    info("Step 1: Make first request and deny permission");
    const rand1 = Math.random();
    let promise = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "First request should be denied"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_NOT_NOW_BUTTON,
      tab.linkedBrowser,
      "loopback-network"
    );
    await promise;

    // Wait for permission to be saved
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info("Step 2: Wait for permission to expire (2.5 seconds)");
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 2500));

    info("Step 3: Make request after expiry (should prompt again)");
    const rand2 = Math.random();
    promise = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_OK,
      "Request after expiry should succeed after new permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    // Verify prompt appears again after deny permission expired
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    let popup = PopupNotifications.getNotification(
      "loopback-network",
      tab.linkedBrowser
    );
    ok(popup, "Prompt should appear again after expiry");

    // This time allow to demonstrate the prompt works
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "loopback-network"
    );
    await promise;

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Local-network temporary permission persists within expiry window
 *
 * Verifies that when a user grants local-network permission, subsequent
 * requests within the expiry window do NOT trigger a new prompt and succeed
 * automatically using the cached permission.
 *
 * Steps:
 * 1. Make a request that triggers local-network permission prompt
 * 2. User grants permission (clicks "Allow")
 * 3. Make a second request within the expiry window (< 2 seconds)
 * 4. Verify NO prompt appears and request succeeds
 *
 * This validates that temporary permissions work correctly for local-network
 * (private IP addresses) in addition to loopback-network.
 */
add_task(
  async function test_lna_temporary_permission_expiry_local_network_allow() {
    info("Test local-network: Allow within expiry (no re-prompt)");
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.address_space.private.override", "127.0.0.1:21555"],
        ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
      ],
    });

    const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    info("Step 1: Make first request and grant permission");
    const rand1 = Math.random();
    let promise = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_OK,
      "First request should succeed after permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    let popup = PopupNotifications.getNotification(
      "local-network",
      tab.linkedBrowser
    );
    ok(popup, "First prompt should appear");

    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "local-network"
    );
    await promise;

    // Wait for permission to be saved
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info("Step 2: Make second request within expiry (should NOT prompt)");
    const rand2 = Math.random();
    promise = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_OK,
      "Second request within expiry should succeed without prompt"
    );
    await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
      await content.fetch(`http://localhost:21555/?type=fetch&rand=${rand}`);
    });
    await promise;

    // Verify no prompt appeared (permission was cached)
    popup = PopupNotifications.getNotification(
      "local-network",
      tab.linkedBrowser
    );
    ok(!popup, "No prompt should appear within expiry window");

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Local-network temporary permission expires and re-prompts
 *
 * Verifies that after the temporary local-network permission expires,
 * a new request triggers a fresh permission prompt.
 *
 * Steps:
 * 1. Make a request that triggers local-network permission prompt
 * 2. User grants permission (clicks "Allow")
 * 3. Wait for permission to expire (2.5 seconds > 2 second timeout)
 * 4. Make another request after expiry
 * 5. Verify a NEW prompt appears (permission has expired)
 *
 * This validates that the custom LNA expiry time works correctly for
 * local-network permissions (private IP addresses) and expired permissions
 * trigger new prompts as expected.
 */
add_task(
  async function test_lna_temporary_permission_expiry_local_network_allow_after_expiry() {
    info("Test local-network: Allow, then retry after expiry (should prompt)");
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.address_space.private.override", "127.0.0.1:21555"],
        ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
      ],
    });

    const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    info("Step 1: Make first request and grant permission");
    const rand1 = Math.random();
    let promise = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_OK,
      "First request should succeed after permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "local-network"
    );
    await promise;

    // Wait for permission to be saved
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info("Step 2: Wait for permission to expire (2.5 seconds)");
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 2500));

    info("Step 3: Make request after expiry (should prompt again)");
    const rand2 = Math.random();
    promise = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_OK,
      "Request after expiry should succeed after new permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    // Verify prompt appears again after expiry
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    let popup = PopupNotifications.getNotification(
      "local-network",
      tab.linkedBrowser
    );
    ok(popup, "Prompt should appear again after expiry");

    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "local-network"
    );
    await promise;

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Local-network temporary deny permission persists within expiry window
 *
 * Verifies that when a user denies local-network permission, subsequent
 * requests within the expiry window do NOT trigger a new prompt and are
 * automatically denied using the cached deny permission.
 *
 * Steps:
 * 1. Make a request that triggers local-network permission prompt
 * 2. User denies permission (clicks "Not Now")
 * 3. Make a second request within the expiry window (< 2 seconds)
 * 4. Verify NO prompt appears and request is denied
 *
 * This validates that temporary deny permissions work correctly for
 * local-network (private IP addresses) and avoid repeatedly prompting
 * users for permissions they've already denied.
 */
add_task(
  async function test_lna_temporary_permission_expiry_local_network_deny() {
    info("Test local-network: Deny within expiry (no re-prompt)");
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.address_space.private.override", "127.0.0.1:21555"],
        ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
      ],
    });

    const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    info("Step 1: Make first request and deny permission");
    const rand1 = Math.random();
    let promise = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "First request should be denied"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    let popup = PopupNotifications.getNotification(
      "local-network",
      tab.linkedBrowser
    );
    ok(popup, "First prompt should appear");

    clickDoorhangerButton(
      PROMPT_NOT_NOW_BUTTON,
      tab.linkedBrowser,
      "local-network"
    );
    await promise;

    // Wait for permission to be saved
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info("Step 2: Make second request within expiry (should NOT prompt)");
    const rand2 = Math.random();
    promise = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "Second request within expiry should be denied without prompt"
    );
    await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
      await content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });
    await promise;

    // Verify no prompt appeared (deny permission was cached)
    popup = PopupNotifications.getNotification(
      "local-network",
      tab.linkedBrowser
    );
    ok(!popup, "No prompt should appear within expiry window");

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Local-network temporary deny permission expires and re-prompts
 *
 * Verifies that after a temporary local-network deny permission expires,
 * a new request triggers a fresh permission prompt, giving the user another
 * opportunity to grant access.
 *
 * Steps:
 * 1. Make a request that triggers local-network permission prompt
 * 2. User denies permission (clicks "Not Now")
 * 3. Wait for deny permission to expire (2.5 seconds > 2 second timeout)
 * 4. Make another request after expiry
 * 5. Verify a NEW prompt appears (deny permission has expired)
 * 6. User can now choose to allow (demonstrating prompt works after expiry)
 *
 * This validates that temporary deny permissions expire correctly for
 * local-network (private IP addresses) and users get a second chance to
 * grant permission after the timeout.
 */
add_task(
  async function test_lna_temporary_permission_expiry_local_network_deny_after_expiry() {
    info("Test local-network: Deny, then retry after expiry (should prompt)");
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.address_space.private.override", "127.0.0.1:21555"],
        ["network.lna.temporary_permission_expire_time_ms", 2000], // 2 seconds for testing
      ],
    });

    const testURL = `${LNA_BASE_URL}page_with_non_trackers.html`;
    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    info("Step 1: Make first request and deny permission");
    const rand1 = Math.random();
    let promise = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "First request should be denied"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand1], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_NOT_NOW_BUTTON,
      tab.linkedBrowser,
      "local-network"
    );
    await promise;

    // Wait for permission to be saved
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info("Step 2: Wait for permission to expire (2.5 seconds)");
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 2500));

    info("Step 3: Make request after expiry (should prompt again)");
    const rand2 = Math.random();
    promise = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_OK,
      "Request after expiry should succeed after new permission granted"
    );
    SpecialPowers.spawn(tab.linkedBrowser, [rand2], async rand => {
      content
        .fetch(`http://localhost:21555/?type=fetch&rand=${rand}`)
        .catch(() => {});
    });

    // Verify prompt appears again after deny permission expired
    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    let popup = PopupNotifications.getNotification(
      "local-network",
      tab.linkedBrowser
    );
    ok(popup, "Prompt should appear again after expiry");

    // This time allow to demonstrate the prompt works
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      tab.linkedBrowser,
      "local-network"
    );
    await promise;

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);
