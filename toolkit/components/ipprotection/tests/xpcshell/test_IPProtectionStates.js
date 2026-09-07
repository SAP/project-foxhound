/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPPNimbusHelper } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPNimbusHelper.sys.mjs"
);

do_get_profile();

add_setup(async function () {
  await putServerInRemoteSettings();
  IPProtectionService.uninit();

  registerCleanupFunction(async () => {
    await IPProtectionService.init();
  });
});

/**
 * Tests the uninitialized state.
 */
add_task(async function test_IPProtectionStates_uninitialized() {
  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNINITIALIZED,
    "IP Protection service should not be initialized yet"
  );

  await IPProtectionService.init();

  Assert.notEqual(
    IPProtectionService.state,
    IPProtectionStates.UNINITIALIZED,
    "IP Protection service should be initialized"
  );

  IPProtectionService.uninit();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNINITIALIZED,
    "IP Protection service should not be uninitialized"
  );
});

/**
 * Tests the unavailable state.
 */
add_task(async function test_IPProtectionStates_uninitialized() {
  let sandbox = sinon.createSandbox();
  IPPDummyAuthProvider.simulateSignIn(false);
  IPPDummyAuthProvider.setGetEntitlementResponse({});
  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => false);

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAVAILABLE,
    "IP Protection service should be unavailable"
  );

  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => true);

  IPProtectionService.updateState();

  Assert.notStrictEqual(
    IPProtectionService.state,
    IPProtectionStates.UNAVAILABLE,
    "IP Protection service should be available"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests the unauthenticated state.
 */
add_task(async function test_IPProtectionStates_unauthenticated() {
  let sandbox = sinon.createSandbox();
  IPPDummyAuthProvider.simulateSignIn(true);
  IPPDummyAuthProvider.setGetEntitlementResponse({});
  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => false);

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAVAILABLE,
    "IP Protection service should be unavailable"
  );

  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => true);
  IPPDummyAuthProvider.setEntitlement(createTestEntitlement(), {
    silent: true,
  });

  IPProtectionService.updateState();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should no longer be unauthenticated"
  );

  IPPDummyAuthProvider.simulateSignIn(false);

  IPProtectionService.updateState();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "IP Protection service should be unauthenticated"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests the enrolling state.
 */
add_task(async function test_IPProtectionStates_enrolling() {
  let sandbox = sinon.createSandbox();
  IPPDummyAuthProvider.simulateSignIn(true);
  IPPDummyAuthProvider.setGetEntitlementResponse({});
  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => true);
  IPPDummyAuthProvider.setEnrollResponse({
    isEnrolledAndEntitled: true,
    entitlement: createTestEntitlement(),
  });

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "IP Protection service should be unauthenticated"
  );

  const enrollData = await IPPDummyAuthProvider.enroll();
  Assert.ok(enrollData.isEnrolledAndEntitled, "Fully enrolled and entitled");

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should have enrolled and be ready"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Tests the ready state.
 */
add_task(async function test_IPProtectionStates_ready() {
  IPPDummyAuthProvider.simulateSignIn(true);
  IPPDummyAuthProvider.setGetEntitlementResponse({
    entitlement: createTestEntitlement(),
  });

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should be ready"
  );

  IPPDummyAuthProvider.simulateSignIn(false);

  IPProtectionService.updateState();

  Assert.notStrictEqual(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should not be ready"
  );

  IPProtectionService.uninit();
});
