/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { IPPNimbusHelper } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPNimbusHelper.sys.mjs"
);
const { IPPEnrollAndEntitleManager } = ChromeUtils.importESModule(
  "moz-src:///browser/components/ipprotection/IPPEnrollAndEntitleManager.sys.mjs"
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
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => false);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(false);
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
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => true);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(false);
  sandbox.stub(IPProtectionService.guardian, "enroll").resolves({ ok: true });
  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => false);

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAVAILABLE,
    "IP Protection service should be unavailable"
  );

  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => true);
  sandbox
    .stub(IPPEnrollAndEntitleManager, "isEnrolledAndEntitled")
    .get(() => true);

  IPProtectionService.updateState();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should no longer be unauthenticated"
  );

  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => false);

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
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => true);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(false);
  sandbox.stub(IPPNimbusHelper, "isEligible").get(() => true);
  sandbox.stub(IPProtectionService.guardian, "enroll").resolves({ ok: true });
  sandbox.stub(IPProtectionService.guardian, "fetchUserInfo").resolves({
    status: 200,
    error: null,
    entitlement: createTestEntitlement(),
  });

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.UNAUTHENTICATED,
    "IP Protection service should be unauthenticated"
  );

  IPProtectionService.guardian.isLinkedToGuardian.resolves(true);

  const enrollData = await IPPEnrollAndEntitleManager.maybeEnrollAndEntitle();
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
  let sandbox = sinon.createSandbox();
  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => true);
  sandbox
    .stub(IPProtectionService.guardian, "isLinkedToGuardian")
    .resolves(true);
  sandbox.stub(IPProtectionService.guardian, "fetchUserInfo").resolves({
    status: 200,
    error: null,
    entitlement: createTestEntitlement(),
  });

  await IPProtectionService.init();

  Assert.equal(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should be ready"
  );

  sandbox.stub(IPPSignInWatcher, "isSignedIn").get(() => false);

  IPProtectionService.updateState();

  Assert.notStrictEqual(
    IPProtectionService.state,
    IPProtectionStates.READY,
    "IP Protection service should not be ready"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});
