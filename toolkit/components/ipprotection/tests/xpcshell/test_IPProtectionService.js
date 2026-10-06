/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);
const { ExtensionTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/ExtensionXPCShellUtils.sys.mjs"
);

do_get_profile();

AddonTestUtils.init(this);
AddonTestUtils.createAppInfo(
  "xpcshell@tests.mozilla.org",
  "XPCShell",
  "1",
  "1"
);

ExtensionTestUtils.init(this);

add_setup(async function () {
  await putServerInRemoteSettings();
  IPProtectionService.uninit();

  registerCleanupFunction(async () => {
    await IPProtectionService.init();
  });
});

/**
 * Tests that a signed in status sends a status changed event.
 */
add_task(async function test_IPProtectionService_updateState_signedIn() {
  await IPProtectionService.init();

  setupStubs();

  let signedInEventPromise = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );

  IPProtectionService.updateState();

  await signedInEventPromise;

  Assert.ok(
    IPProtectionService.authProvider.isReady,
    "Auth provider should be ready after update"
  );

  IPProtectionService.uninit();
});

/**
 * Tests that any other status sends a changed event event.
 */
add_task(async function test_IPProtectionService_updateState_signedOut() {
  setupStubs();

  await IPProtectionService.init();

  IPPDummyAuthProvider.simulateSignIn(false);

  let signedOutEventPromise = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.UNAUTHENTICATED
  );

  IPProtectionService.updateState();

  await signedOutEventPromise;

  Assert.ok(
    !IPProtectionService.authProvider.isReady,
    "Auth provider should not be ready after sign-out"
  );

  IPProtectionService.uninit();
});

/**
 * Tests that signing off generates a reset of the entitlement and the sending
 * of an event.
 */
add_task(async function test_IPProtectionService_hasUpgraded_signed_out() {
  setupStubs();

  await IPProtectionService.init();
  await IPProtectionService.authProvider.enroll();
  IPProtectionService.updateState();

  IPPDummyAuthProvider.simulateSignIn(false);

  let signedOutEventPromise = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged"
  );
  IPProtectionService.updateState();

  await signedOutEventPromise;

  Assert.ok(
    !IPProtectionService.authProvider.hasUpgraded,
    "hasUpgraded should be false in after signing out"
  );

  IPProtectionService.uninit();
});

/**
 * Tests that isEnrolling is true while maybeEnrollAndEntitle is in progress and
 * false once it completes.
 */
add_task(async function test_isEnrolling_during_maybeEnrollAndEntitle() {
  setupStubs();

  await IPProtectionService.init();

  // initOnStartupCompleted() runs updateEntitlement() which sets the
  // entitlement via the configured getEntitlement response. Reset it so that
  // enroll() takes the slow path and isEnrolling stays true while in progress.
  IPPDummyAuthProvider.resetEntitlement();

  let resolveEnroll;
  // Slow down enrolling step info so that we can properly test
  // isEnrolling. The promise only resolves when we call resolveEnroll().
  IPPDummyAuthProvider.setEnrollResponse(
    new Promise(resolve => {
      resolveEnroll = resolve;
    })
  );

  Assert.ok(
    !IPPDummyAuthProvider.isEnrolling,
    "isEnrolling should be false before maybeEnrollAndEntitle"
  );

  let enrollPromise = IPPDummyAuthProvider.enroll();

  Assert.ok(
    IPPDummyAuthProvider.isEnrolling,
    "isEnrolling should be true while maybeEnrollAndEntitle is in progress"
  );

  let stateChangedFired = false;
  IPProtectionService.authProvider.addEventListener(
    "IPPAuthProvider:StateChanged",
    () => {
      stateChangedFired = true;
    },
    { once: true }
  );

  resolveEnroll({ isEnrolledAndEntitled: true });
  await enrollPromise;

  Assert.ok(
    !IPPDummyAuthProvider.isEnrolling,
    "isEnrolling should be false after maybeEnrollAndEntitle completes"
  );
  Assert.ok(
    stateChangedFired,
    "StateChanged should fire after maybeEnrollAndEntitle completes"
  );

  IPProtectionService.uninit();
});
