/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { ASRouter } = ChromeUtils.importESModule(
  "resource:///modules/asrouter/ASRouter.sys.mjs"
);

const { ERRORS } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPProxyManager.sys.mjs"
);

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

async function optInUser() {
  let content = await openPanel();
  let unauthenticatedContent = content.unauthenticatedEl;
  let getStartedButton = unauthenticatedContent.shadowRoot.querySelector(
    "#unauthenticated-get-started"
  );
  Assert.ok(getStartedButton, "Get Started button should be visible");

  const waitForStateChange = BrowserTestUtils.waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    false,
    () => IPProtectionService.state === IPProtectionStates.READY
  );

  const optInPromise = BrowserTestUtils.waitForEvent(
    document,
    "IPProtection:OptIn"
  );

  getStartedButton.click();

  await optInPromise;

  if (IPProtectionService.state !== IPProtectionStates.READY) {
    await waitForStateChange;
  }

  await closePanel();
}

/**
 * Tests getting eligibility from a Nimbus experiment and
 * creating and destroying the widget.
 */
add_task(async function test_IPProtectionService_updateEligibility() {
  let cleanupAlpha = await setupExperiment({ enabled: true, variant: "alpha" });
  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "Should be in the experiment"
  );
  let buttonOn = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(buttonOn),
    "IP Protection widget should be added to the navbar"
  );
  await cleanupAlpha();

  let cleanupControl = await setupExperiment({
    enabled: true,
    variant: "control",
  });
  Assert.notStrictEqual(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "Should not be in the experiment"
  );
  let buttonOff = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    !buttonOff,
    "IP Protection widget should not be added to the navbar"
  );
  await cleanupControl();
});

/**
 * Tests a user who was previously enrolled will be shown the widget.
 */
add_task(async function test_IPProtectionService_updateEnrollment() {
  Services.prefs.clearUserPref("browser.ipProtection.enabled");
  setupService({
    isReady: true,
  });

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });

  // isEnrolledAndEntitled is async so wait for widget.
  await waitForWidgetAdded();

  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    BrowserTestUtils.isVisible(button),
    "IP Protection widget should be added to the navbar"
  );

  cleanupService();
  await SpecialPowers.popPrefEnv();
});

/**
 * Tests a user in the experiment can enroll with Guardian by clicking get started.
 */
add_task(async function test_IPProtectionService_enroll() {
  setupService({
    isReady: false,
    canEnroll: true,
  });

  let cleanupAlpha = await setupExperiment({ enabled: true, variant: "alpha" });

  await waitForWidgetAdded();

  setupService({
    isReady: false,
  });

  IPProtectionService.updateState();
  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "User should now be unauthenticated"
  );

  await optInUser();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "User should now be enrolling"
  );

  cleanupService();
  await cleanupAlpha();
});

/**
 *  Tests the entitlement updates when in the experiment.
 */
add_task(
  async function test_IPProtectionService_updateEntitlement_in_experiment() {
    Services.prefs.clearUserPref("browser.ipProtection.enabled");
    setupService({
      isReady: true,
      canEnroll: true,
    });

    let cleanupAlpha = await setupExperiment({
      enabled: true,
      variant: "alpha",
    });

    await waitForWidgetAdded();

    Assert.equal(
      IPProtectionService.state,
      IPProtectionStates.READY,
      "Entitlement set the user as entitled"
    );

    cleanupService();
    await cleanupAlpha();
  }
);

/**
 * Tests the entitlement updates when not in the experiment.
 */
add_task(async function test_IPProtectionService_updateEntitlement() {
  Services.prefs.clearUserPref("browser.ipProtection.enabled");
  setupService({
    isReady: true,
  });

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });

  await waitForWidgetAdded();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "Entitlement set the user as entitled"
  );

  cleanupService();
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_ipprotection_ready() {
  Services.prefs.clearUserPref("browser.ipProtection.enabled");
  setupService({
    isReady: true,
  });

  const sandbox = sinon.createSandbox();
  const receivedTrigger = new Promise(resolve => {
    sandbox.stub(ASRouter, "sendTriggerMessage").callsFake(({ id }) => {
      if (id === "ipProtectionReady") {
        resolve(true);
      }
    });
  });

  await SpecialPowers.pushPrefEnv({
    set: [["browser.ipProtection.enabled", true]],
  });

  let ipProtectionReadyTrigger = await receivedTrigger;
  Assert.ok(ipProtectionReadyTrigger, "ipProtectionReady trigger sent");

  sandbox.restore();
  cleanupService();
});

/**
 * Tests showing an error state UI and dismissing it on panel close.
 */
add_task(async function test_IPProtectionService_pass_errors() {
  setupService({
    isReady: true,
    proxyPass: {
      status: 403,
    },
  });

  let cleanupAlpha = await setupExperiment({ enabled: true, variant: "alpha" });

  IPProtectionService.updateState();

  let content = await openPanel();

  let statusBoxLoadedPromise = BrowserTestUtils.waitForMutationCondition(
    content.shadowRoot,
    { childList: true, subtree: true },
    () => content.shadowRoot.querySelector("ipprotection-status-box")
  );

  let statusCard = content.statusCardEl;

  let turnOnButton = statusCard.actionButtonEl;

  turnOnButton.click();

  await statusBoxLoadedPromise;

  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.READY,
    "Proxy should be in READY state when activation fails"
  );

  let statusBox = content.statusBoxEl;

  Assert.ok(
    !content.statusCardEl,
    "Status card should be hidden when there's an error"
  );
  Assert.ok(statusBox, "Status box should be present for generic error");
  Assert.equal(
    statusBox.type,
    ERRORS.GENERIC,
    "Status box type should be generic-error"
  );
  Assert.equal(
    content.state.error,
    ERRORS.GENERIC,
    "Should have a generic error"
  );

  let button = document.getElementById(IPProtectionWidget.WIDGET_ID);
  Assert.ok(
    button.classList.contains("ipprotection-error"),
    "Toolbar icon should show the error status"
  );

  await closePanel();

  Assert.equal(content.state.error, "", "Should have no error");

  await cleanupAlpha();
  cleanupService();
});

/**
 * Tests retry after an error.
 */
add_task(async function test_IPProtectionService_retry_errors() {
  setupService({
    isReady: true,
    canEnroll: true,
  });
  let cleanupAlpha = await setupExperiment({ enabled: true, variant: "alpha" });

  IPPProxyManager.updateState();

  let content = await openPanel();
  let statusCard = content.statusCardEl;

  // Mock a failure
  IPPProxyManager.setErrorState(ERRORS.GENERIC);

  let startedEventPromise = BrowserTestUtils.waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  let turnOnButton = statusCard.actionButtonEl;
  turnOnButton.click();

  await startedEventPromise;

  Assert.equal(IPPProxyManager.state, IPPProxyStates.ACTIVE, "Proxy is active");

  await IPPProxyManager.stop();

  await closePanel();
  await cleanupAlpha();
  cleanupService();
});

/**
 * Tests the proxy is stopped if user signs out with it active.
 */
add_task(async function test_IPProtectionService_stop_on_signout() {
  setupService({
    isReady: true,
    canEnroll: true,
  });
  let cleanupAlpha = await setupExperiment({ enabled: true, variant: "alpha" });

  IPProtectionService.updateState();

  let content = await openPanel();
  let statusCard = content.statusCardEl;

  Assert.ok(
    BrowserTestUtils.isVisible(content),
    "ipprotection content component should be present"
  );
  let turnOnButton = statusCard.actionButtonEl;
  Assert.ok(turnOnButton, "Status card turn on button should be present");

  let startedEventPromise = BrowserTestUtils.waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    false,
    () => !!IPPProxyManager.activatedAt
  );
  turnOnButton.click();

  await startedEventPromise;

  Assert.equal(IPPProxyManager.state, IPPProxyStates.ACTIVE, "Proxy is active");

  let vpnOffPromise = BrowserTestUtils.waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    false,
    () => !IPPProxyManager.activatedAt
  );

  setupService({
    isReady: false,
  });
  IPProtectionService.updateState();
  await vpnOffPromise;

  Assert.notStrictEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVE,
    "Proxy has stopped"
  );

  await closePanel();
  await cleanupAlpha();
  cleanupService();
});

/**
 * Tests that exposure events will be sent for branches and control
 */
add_task(async function test_IPProtectionService_exposure() {
  Services.telemetry.clearEvents();
  NimbusFeatures.ipProtection._didSendExposureEvent = false;

  let cleanupAlpha = await setupExperiment({ enabled: true, variant: "alpha" });

  await cleanupAlpha();

  // Reset to allow sending another exposure event.
  NimbusFeatures.ipProtection._didSendExposureEvent = false;

  let cleanupControl = await setupExperiment({
    enabled: true,
    variant: "control",
  });

  await cleanupControl();

  TelemetryTestUtils.assertEvents(
    [
      {
        method: "expose",
        object: "nimbus_experiment",
        value: "vpn-test",
        extra: {
          branchSlug: "alpha",
          featureId: "ipProtection",
        },
      },
      {
        method: "expose",
        object: "nimbus_experiment",
        value: "vpn-test",
        extra: {
          branchSlug: "control",
          featureId: "ipProtection",
        },
      },
    ],
    { method: "expose" }
  );
});
