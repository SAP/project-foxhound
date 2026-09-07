/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests the LoginManagerRustStorage shutdown-blocker registration.
 *
 * See https://bugzilla.mozilla.org/show_bug.cgi?id=2035815: registering a
 * blocker on a phase that has already passed would throw and crash shutdown.
 * The fix runs `finalize()` immediately in that case.
 *
 * The unit under test is `_registerShutdownBlocker(phase)`, which is exercised
 * directly with a fake phase to avoid going through the `LoginManagerRustStorage`
 * singleton and the underlying Rust components.
 */

"use strict";

const { LoginManagerRustStorage } = ChromeUtils.importESModule(
  "resource://gre/modules/storage-rust.sys.mjs"
);
const { sinon } = ChromeUtils.importESModule(
  "resource://testing-common/Sinon.sys.mjs"
);

function makeFakeInstance() {
  return {
    finalize: sinon.fake.resolves(),
    _registerShutdownBlocker:
      LoginManagerRustStorage.prototype._registerShutdownBlocker,
  };
}

add_task(async function test_register_blocker_when_phase_open() {
  const fakeInstance = makeFakeInstance();
  const fakePhase = {
    isClosed: false,
    addBlocker: sinon.fake(),
  };

  await fakeInstance._registerShutdownBlocker(fakePhase);

  Assert.ok(
    fakePhase.addBlocker.calledOnce,
    "a shutdown blocker is registered when the phase is still open"
  );
  Assert.equal(
    fakePhase.addBlocker.firstCall.args[0],
    "LoginManagerRustStorage: Interrupt IO operations on login store",
    "the blocker is registered under the expected name"
  );
  Assert.equal(
    typeof fakePhase.addBlocker.firstCall.args[1],
    "function",
    "the blocker condition is a function"
  );
  Assert.ok(
    fakeInstance.finalize.notCalled,
    "finalize() is not invoked synchronously when the phase is still open"
  );

  // Sanity check: the registered blocker calls `finalize()` when run.
  await fakePhase.addBlocker.firstCall.args[1]();
  Assert.ok(
    fakeInstance.finalize.calledOnce,
    "the registered blocker invokes finalize() when fired"
  );
});

add_task(async function test_finalize_immediately_when_phase_closed() {
  const fakeInstance = makeFakeInstance();
  const fakePhase = {
    isClosed: true,
    addBlocker: sinon.fake.throws(
      new Error("addBlocker must not be called when phase is closed")
    ),
  };

  await fakeInstance._registerShutdownBlocker(fakePhase);

  Assert.ok(
    fakeInstance.finalize.calledOnce,
    "finalize() is invoked immediately when the phase has already passed"
  );
  Assert.ok(
    fakePhase.addBlocker.notCalled,
    "no shutdown blocker is registered when the phase has already passed"
  );
});
