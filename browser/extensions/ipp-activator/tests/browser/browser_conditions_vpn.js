/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function stubVPNState(initialActive) {
  const sandbox = sinon.createSandbox();
  let active = !!initialActive;
  sandbox
    .stub(IPPProxyManager, "state")
    .get(() => (active ? IPPProxyStates.ACTIVE : IPPProxyStates.NOT_READY));
  return {
    sandbox,
    setActive(value) {
      active = !!value;
      IPPProxyManager.dispatchEvent(
        new CustomEvent("IPPProxyManager:StateChanged", {
          detail: { state: IPPProxyManager.state },
        })
      );
    },
    restore() {
      sandbox.restore();
    },
  };
}

add_setup(async function () {
  registerCleanupFunction(() => resetState());
});

add_task(async function test_vpn_active_matches() {
  const vpn = stubVPNState(true);
  try {
    await checkNotification({ type: "vpn", active: true }, true);
  } finally {
    vpn.restore();
  }
});

add_task(async function test_vpn_inactive_no_match() {
  const vpn = stubVPNState(false);
  try {
    await checkNotification({ type: "vpn", active: true }, false);
  } finally {
    vpn.restore();
  }
});

add_task(async function test_vpn_transition_off_to_on() {
  const vpn = stubVPNState(false);
  try {
    await checkNotification({ type: "vpn", active: true }, false, async tab => {
      vpn.setActive(true);
      await waitForNotification(tab);
    });
  } finally {
    vpn.restore();
  }
});

add_task(async function test_vpn_transition_on_to_off() {
  const vpn = stubVPNState(true);
  try {
    await checkNotification({ type: "vpn", active: true }, true, async tab => {
      vpn.setActive(false);
      await waitForNoNotification(tab);
    });
  } finally {
    vpn.restore();
  }
});
