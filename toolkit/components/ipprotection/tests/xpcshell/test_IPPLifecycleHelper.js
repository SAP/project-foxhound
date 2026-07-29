/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { IPPLifecycleHelper } = ChromeUtils.importESModule(
  "moz-src:///toolkit/components/ipprotection/IPPLifecycleHelper.sys.mjs"
);

const SLEEP_TOPIC = "sleep_notification";
const WAKE_TOPIC = "wake_notification";

add_setup(async function () {
  await putServerInRemoteSettings();
});

/**
 * Brings the proxy to the ACTIVE state, at which point the lifecycle helper is
 * observing sleep/wake.
 */
async function startActiveProxy() {
  const readyEvent = waitForEvent(
    IPProtectionService,
    "IPProtectionService:StateChanged",
    () => IPProtectionService.state === IPProtectionStates.READY
  );
  IPProtectionService.init();
  await readyEvent;

  const activeEvent = waitForEvent(
    IPPProxyManager,
    "IPPProxyManager:StateChanged",
    () => IPPProxyManager.state === IPPProxyStates.ACTIVE
  );
  await IPPProxyManager.start();
  await activeEvent;
}

/**
 * On sleep, the channel filter is suspended (proxyInfo cleared).
 */
add_task(async function test_sleep_suspends_connection() {
  setupStubs({ validProxyPass: true });
  await startActiveProxy();

  const channelFilter = IPPProxyManager.channelFilter();
  Assert.ok(channelFilter.proxyInfo, "Connection has proxyInfo while active");
  Assert.ok(IPPProxyManager.isolationKey, "Connection has an isolation key");

  Services.obs.notifyObservers(null, SLEEP_TOPIC);

  Assert.equal(
    channelFilter.proxyInfo,
    null,
    "Channel filter is suspended after sleep"
  );

  await IPPProxyManager.stop();
  IPProtectionService.uninit();
});

/**
 * On wake with a still-good pass, the saved isolation key is re-injected
 * (same key, no rotation).
 */
add_task(async function test_wake_with_valid_pass_resumes_same_key() {
  let sandbox = sinon.createSandbox();
  setupStubs({ validProxyPass: true });
  await startActiveProxy();

  const channelFilter = IPPProxyManager.channelFilter();
  const savedKey = IPPProxyManager.isolationKey;

  const rotateSpy = sandbox.spy(IPPProxyManager, "rotateProxyPass");

  Services.obs.notifyObservers(null, SLEEP_TOPIC);
  Assert.equal(channelFilter.proxyInfo, null, "Suspended after sleep");

  Services.obs.notifyObservers(null, WAKE_TOPIC);

  Assert.ok(channelFilter.proxyInfo, "Connection resumed after wake");
  Assert.equal(
    IPPProxyManager.isolationKey,
    savedKey,
    "Resuming reuses the isolation key captured before sleep"
  );
  Assert.ok(rotateSpy.notCalled, "A valid pass should not trigger a rotation");

  await IPPProxyManager.stop();
  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * On wake with an expired pass, the helper triggers a rotation, which yields a
 * fresh isolation key.
 */
add_task(async function test_wake_with_expired_pass_rotates() {
  let sandbox = sinon.createSandbox();
  setupStubs({ validProxyPass: true });
  await startActiveProxy();

  // Rotate to an expired pass while staying active so canResume is false on the
  // next wake.
  setupStubs({ validProxyPass: false });
  await IPPProxyManager.rotateProxyPass();
  Assert.ok(
    !IPPProxyManager.hasValidProxyPass,
    "Pass is expired after rotating to an expired pass"
  );

  const savedKey = IPPProxyManager.isolationKey;
  const rotateSpy = sandbox.spy(IPPProxyManager, "rotateProxyPass");

  Services.obs.notifyObservers(null, SLEEP_TOPIC);

  // The wake rotation should fetch a fresh, valid pass.
  setupStubs({ validProxyPass: true });
  Services.obs.notifyObservers(null, WAKE_TOPIC);

  Assert.ok(rotateSpy.called, "An expired pass should trigger a rotation");
  await rotateSpy.returnValues[0];

  Assert.ok(channelFilterProxyInfoPresent(), "Connection has proxyInfo again");
  Assert.notEqual(
    IPPProxyManager.isolationKey,
    savedKey,
    "Rotation produces a new isolation key"
  );
  Assert.equal(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVE,
    "Proxy stays active across a wake rotation"
  );

  await IPPProxyManager.stop();
  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * On wake with a pass that is valid but already inside its rotation window, the
 * helper rotates instead of resuming (validates the canResume threshold).
 */
add_task(async function test_wake_within_rotation_window_rotates() {
  let sandbox = sinon.createSandbox();
  setupStubs({ validProxyPass: true });
  await startActiveProxy();

  // Rotate to a pass that is still valid but due for rotation (expires in 30s,
  // well within the 2 minute rotation window).
  const now = Temporal.Now.instant();
  const soonToExpire = new ProxyPass(
    createProxyPassToken(now, now.add({ seconds: 30 }))
  );
  IPPDummyAuthProvider.setProxyPass({
    status: 200,
    error: undefined,
    pass: soonToExpire,
    usage: new ProxyUsage(
      "5368709120",
      "4294967296",
      "3026-02-01T00:00:00.000Z"
    ),
  });
  await IPPProxyManager.rotateProxyPass();

  Assert.ok(
    IPPProxyManager.hasValidProxyPass,
    "Pass is still valid before its expiry"
  );
  Assert.ok(
    !IPPProxyManager.channelFilter().canResume,
    "Pass within the rotation window cannot be resumed"
  );

  const savedKey = IPPProxyManager.isolationKey;
  const rotateSpy = sandbox.spy(IPPProxyManager, "rotateProxyPass");

  Services.obs.notifyObservers(null, SLEEP_TOPIC);

  setupStubs({ validProxyPass: true });
  Services.obs.notifyObservers(null, WAKE_TOPIC);

  Assert.ok(
    rotateSpy.called,
    "A pass within the rotation window should trigger a rotation"
  );
  await rotateSpy.returnValues[0];

  Assert.notEqual(
    IPPProxyManager.isolationKey,
    savedKey,
    "Rotation produces a new isolation key"
  );

  await IPPProxyManager.stop();
  IPProtectionService.uninit();
  sandbox.restore();
});

/**
 * Sleep/wake observers are only registered while the proxy is ACTIVE.
 */
add_task(async function test_observers_only_active_while_active() {
  let sandbox = sinon.createSandbox();
  setupStubs({ validProxyPass: true });
  await startActiveProxy();

  await IPPProxyManager.stop();
  Assert.notEqual(
    IPPProxyManager.state,
    IPPProxyStates.ACTIVE,
    "Proxy is no longer active after stop"
  );

  const observeSpy = sandbox.spy(IPPLifecycleHelper, "observe");
  Services.obs.notifyObservers(null, SLEEP_TOPIC);
  Services.obs.notifyObservers(null, WAKE_TOPIC);

  Assert.ok(
    observeSpy.notCalled,
    "The helper stops observing power events once the proxy is inactive"
  );

  IPProtectionService.uninit();
  sandbox.restore();
});

function channelFilterProxyInfoPresent() {
  return !!IPPProxyManager.channelFilter()?.proxyInfo;
}
