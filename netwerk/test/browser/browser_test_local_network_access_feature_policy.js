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
 * Test: Same-origin iframe inherits Feature Policy from parent
 *
 * Scenario: Parent page (example.com) creates a same-origin iframe (example.com)
 * Expected: Iframe automatically inherits the parent's Feature Policy allowlist
 *           and can make LNA requests after permission is granted to the parent.
 *
 * This validates that same-origin iframes don't need explicit delegation via
 * the allow attribute - they inherit permissions from their parent document.
 */
add_task(async function test_feature_policy_same_origin_iframe() {
  info("Test: Same-origin iframe inherits Feature Policy from parent");
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand = Math.random();
  const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?iframe=same-origin&rand=${rand}`;

  const promise = observeAndCheck(
    "fetch",
    rand,
    Cr.NS_OK,
    "Same-origin iframe request should succeed after permission granted"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "loopback-network"
  );

  await promise;
  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Cross-origin iframe blocked without allow attribute
 *
 * Scenario: Parent page (example.com) creates a cross-origin iframe (example.org)
 *           WITHOUT an allow attribute
 * Expected: The iframe's LNA request is blocked by Feature Policy BEFORE showing
 *           a permission prompt to the user.
 *
 * This validates Feature Policy's default-deny behavior for cross-origin iframes.
 * Cross-origin contexts must explicitly opt-in via the allow attribute to access
 * powerful features like LNA.
 */
add_task(async function test_feature_policy_cross_origin_blocked() {
  info("Test: Cross-origin iframe blocked without allow attribute");
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand = Math.random();
  const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?iframe=cross-origin-no-allow&rand=${rand}`;

  const promise = observeAndCheck(
    "fetch",
    rand,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "Cross-origin iframe without allow should be blocked by Feature Policy"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  await promise;

  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(
    !popup,
    "No permission prompt should appear when Feature Policy blocks request"
  );

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Cross-origin iframe allowed with explicit loopback-network delegation
 *
 * Scenario: Parent page (example.com) creates a cross-origin iframe (example.org)
 *           WITH allow="loopback-network" attribute
 * Expected: After the parent grants permission, the iframe can successfully make
 *           loopback network requests (e.g., to localhost/127.0.0.1).
 *
 * This validates that the loopback-network permission can be explicitly delegated
 * to cross-origin iframes via the allow attribute, and that delegated iframes can
 * use the parent's granted permission.
 */
add_task(async function test_feature_policy_cross_origin_loopback_allowed() {
  info(
    "Test: Cross-origin iframe allowed with explicit loopback-network delegation"
  );
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand = Math.random();
  const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?iframe=cross-origin-loopback&rand=${rand}`;

  const promise = observeAndCheck(
    "fetch",
    rand,
    Cr.NS_OK,
    "Cross-origin iframe with allow=loopback-network should succeed after permission"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "loopback-network"
  );

  await promise;
  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Cross-origin iframe allowed with explicit local-network delegation
 *
 * Scenario: Parent page (example.com) creates a cross-origin iframe (example.org)
 *           WITH allow="local-network" attribute
 * Expected: After the parent grants permission, the iframe can successfully make
 *           local network requests (e.g., to private IP addresses like 192.168.x.x).
 *
 * This validates that the local-network permission (distinct from loopback-network)
 * can be separately delegated to cross-origin iframes, allowing access to private
 * network resources.
 */
add_task(
  async function test_feature_policy_cross_origin_local_network_allowed() {
    info(
      "Test: Cross-origin iframe allowed with explicit local-network delegation"
    );
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [
        ["network.lna.address_space.public.override", "127.0.0.1:4443"],
        ["network.lna.address_space.private.override", "127.0.0.1:21555"],
      ],
    });

    const rand = Math.random();
    const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?iframe=cross-origin-local-network&rand=${rand}`;

    const promise = observeAndCheck(
      "fetch",
      rand,
      Cr.NS_OK,
      "Cross-origin iframe with allow=local-network should succeed after permission"
    );

    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      gBrowser.selectedBrowser,
      "local-network"
    );

    await promise;
    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Both loopback-network and local-network can be delegated simultaneously
 *
 * Scenario: Parent page (example.com) creates a cross-origin iframe (example.org)
 *           WITH allow="loopback-network; local-network" attribute
 * Expected: After the parent grants permission, the iframe can make both loopback
 *           and local network requests.
 *
 * This validates:
 * 1. Multiple permissions can be delegated simultaneously
 * 2. The correct syntax uses semicolons to separate multiple permissions
 *    (not spaces: "loopback-network; local-network" not "loopback-network local-network")
 */
add_task(async function test_feature_policy_cross_origin_both_permissions() {
  info("Test: Both loopback-network and local-network can be delegated");
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand = Math.random();
  const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?iframe=cross-origin-both&rand=${rand}`;

  const promise = observeAndCheck(
    "fetch",
    rand,
    Cr.NS_OK,
    "Cross-origin iframe with both permissions delegated should succeed"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "loopback-network"
  );

  await promise;
  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Same-origin iframe inherits granted permission from parent document
 *
 * Scenario: Parent page (example.com) makes an LNA request and gets permission.
 *           AFTER permission is granted, a same-origin iframe (example.com) is
 *           dynamically created.
 * Expected: The iframe can immediately make LNA requests using the parent's
 *           cached permission without showing a new permission prompt.
 *
 * This validates permission inheritance with cached permissions, ensuring no
 * race conditions occur when iframes are created after permission is granted.
 * The test uses parentRand to trigger parent request first, then manually
 * creates the iframe with a different rand value.
 */
add_task(async function test_feature_policy_same_origin_inherits_permission() {
  info(
    "Test: Same-origin iframe inherits granted permission from parent document"
  );
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand1 = Math.random();
  const rand2 = Math.random();

  info("Step 1: Load page and trigger parent request to grant permission");
  const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?parentRand=${rand1}`;

  const promise1 = observeAndCheck(
    "fetch",
    rand1,
    Cr.NS_OK,
    "Parent request should succeed"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
  clickDoorhangerButton(
    PROMPT_ALLOW_BUTTON,
    gBrowser.selectedBrowser,
    "loopback-network"
  );

  await promise1;

  // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
  await new Promise(resolve => setTimeout(resolve, 300));

  info("Step 2: Now create iframe - it should inherit the granted permission");
  const promise2 = observeAndCheck(
    "fetch",
    rand2,
    Cr.NS_OK,
    "Same-origin iframe should inherit granted permission without new prompt"
  );

  // Create same-origin iframe that will auto-trigger fetch
  await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async r => {
    const container = content.document.getElementById("iframe-container");
    const iframe = content.document.createElement("iframe");
    iframe.id = "test-iframe";
    iframe.src = `https://example.com/browser/netwerk/test/browser/lna_feature_policy_iframe_same_origin.html?rand=${r}`;
    container.appendChild(iframe);
  });

  await promise2;

  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(
    !popup,
    "No new permission prompt should appear for same-origin iframe with cached permission"
  );

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});

/**
 * Test: Cross-origin iframe with allow attribute can use parent's cached permission
 *
 * Scenario: Parent page (example.com) makes an LNA request and gets permission.
 *           AFTER permission is granted, a cross-origin iframe (example.org) with
 *           allow="loopback-network" attribute is dynamically created.
 * Expected: The iframe can immediately make LNA requests using the parent's
 *           cached permission without showing a new permission prompt.
 *
 * This validates that Feature Policy delegation works correctly with cached
 * permissions - a cross-origin iframe with proper allow attribute can leverage
 * the parent's existing permission grant without re-prompting the user.
 */
add_task(
  async function test_feature_policy_cross_origin_with_allow_uses_permission() {
    await restorePermissions();
    info(
      "Test: Cross-origin iframe with allow attribute can use parent permission"
    );
    await SpecialPowers.pushPrefEnv({
      set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
    });

    const rand1 = Math.random();
    const rand2 = Math.random();

    info("Step 1: Load page and trigger parent request to grant permission");
    const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?parentRand=${rand1}`;
    const promise1 = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_OK,
      "Parent request should succeed"
    );

    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      gBrowser.selectedBrowser,
      "loopback-network"
    );

    await promise1;

    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info(
      "Step 2: Create cross-origin iframe with allow attribute - should use parent permission"
    );
    const promise2 = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_OK,
      "Cross-origin iframe with allow can use parent permission"
    );

    await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async r => {
      const container = content.document.getElementById("iframe-container");
      const iframe = content.document.createElement("iframe");
      iframe.id = "test-iframe";
      iframe.src = `https://example.org/browser/netwerk/test/browser/lna_feature_policy_iframe_cross_origin.html?rand=${r}`;
      iframe.setAttribute("allow", "loopback-network");
      container.appendChild(iframe);
    });

    await promise2;

    let popup = PopupNotifications.getNotification(
      "loopback-network",
      tab.linkedBrowser
    );
    ok(
      !popup,
      "No new prompt for cross-origin iframe with allow when parent has permission"
    );

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Cross-origin iframe without allow attribute is blocked even with parent permission
 *
 * Scenario: Parent page (example.com) makes an LNA request and gets permission.
 *           AFTER permission is granted, a cross-origin iframe (example.org) WITHOUT
 *           an allow attribute is dynamically created.
 * Expected: The iframe's LNA request is blocked by Feature Policy, even though the
 *           parent has a cached permission grant.
 *
 * This validates that Feature Policy enforcement is independent of the parent's
 * permission state - cross-origin iframes must have explicit delegation via the
 * allow attribute to access LNA, regardless of whether the parent has permission.
 * This prevents cross-origin contexts from silently inheriting powerful permissions.
 */
add_task(
  async function test_feature_policy_cross_origin_without_allow_still_blocked() {
    info(
      "Test: Cross-origin iframe without allow is blocked even if parent has permission"
    );
    await restorePermissions();
    await SpecialPowers.pushPrefEnv({
      set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
    });

    const rand1 = Math.random();
    const rand2 = Math.random();

    info("Step 1: Load page and trigger parent request to grant permission");
    const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?parentRand=${rand1}`;
    const promise1 = observeAndCheck(
      "fetch",
      rand1,
      Cr.NS_OK,
      "Parent request should succeed"
    );

    const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

    await BrowserTestUtils.waitForEvent(PopupNotifications.panel, "popupshown");
    clickDoorhangerButton(
      PROMPT_ALLOW_BUTTON,
      gBrowser.selectedBrowser,
      "loopback-network"
    );

    await promise1;

    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(resolve => setTimeout(resolve, 300));

    info(
      "Step 2: Create cross-origin iframe WITHOUT allow - should be blocked by Feature Policy"
    );
    const promise2 = observeAndCheck(
      "fetch",
      rand2,
      Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
      "Cross-origin iframe without allow blocked even when parent has permission"
    );

    await SpecialPowers.spawn(tab.linkedBrowser, [rand2], async r => {
      const container = content.document.getElementById("iframe-container");
      const iframe = content.document.createElement("iframe");
      iframe.id = "test-iframe";
      iframe.src = `https://example.org/browser/netwerk/test/browser/lna_feature_policy_iframe_cross_origin.html?rand=${r}`;
      container.appendChild(iframe);
    });

    await promise2;

    let popup = PopupNotifications.getNotification(
      "loopback-network",
      tab.linkedBrowser
    );
    ok(!popup, "No prompt should appear - Feature Policy blocks it");

    gBrowser.removeTab(tab);
    await SpecialPowers.popPrefEnv();
  }
);

/**
 * Test: Nested iframes - Feature Policy checks the full delegation chain
 *
 * Scenario: Parent page (example.com) creates a same-origin iframe (example.com)
 *           with allow="loopback-network". That same-origin iframe contains a
 *           nested cross-origin iframe (example.org) WITHOUT an allow attribute.
 * Expected: The nested cross-origin iframe's LNA request is blocked by Feature
 *           Policy.
 *
 * This validates that Feature Policy checks the entire delegation chain, not just
 * the immediate parent-child relationship. Even though:
 * - The parent (example.com) delegates to the middle iframe (example.com)
 * - The middle iframe is same-origin with parent (inherits permission)
 * The nested cross-origin iframe (example.org) is still blocked because the middle
 * iframe did not explicitly delegate to it via an allow attribute.
 *
 * Structure: Parent (example.com) → Middle (example.com, has delegation) →
 *            Nested (example.org, no delegation) = BLOCKED
 */
add_task(async function test_feature_policy_nested_iframes() {
  info(
    "Test: Nested iframes respect Feature Policy (cross-origin inside same-origin)"
  );
  await restorePermissions();
  await SpecialPowers.pushPrefEnv({
    set: [["network.lna.address_space.public.override", "127.0.0.1:4443"]],
  });

  const rand = Math.random();
  const testURL = `${LNA_BASE_URL}lna_feature_policy_parent.html?iframe=nested&rand=${rand}`;

  const promise = observeAndCheck(
    "fetch",
    rand,
    Cr.NS_ERROR_LOCAL_NETWORK_ACCESS_DENIED,
    "Nested cross-origin iframe without delegation should be blocked"
  );

  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, testURL);

  await promise;

  let popup = PopupNotifications.getNotification(
    "loopback-network",
    tab.linkedBrowser
  );
  ok(
    !popup,
    "No prompt for nested cross-origin iframe without delegation in allow chain"
  );

  gBrowser.removeTab(tab);
  await SpecialPowers.popPrefEnv();
});
