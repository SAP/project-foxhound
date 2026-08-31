/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from ../../../../extensions/newtab/test/xpcshell/head.js */

/* import-globals-from head_nimbus_trainhop.js */

add_task(
  {
    pref_set: [
      [TRAINHOP_SCHEDULED_UPDATE_STATE_TIMEOUT_PREF, 100],
      [TRAINHOP_SCHEDULED_UPDATE_STATE_DELAY_PREF, 100],
      // Allow this test to call `AsyncShutdown.appShutdownConfirmed._trigger`.
      ["toolkit.asyncshutdown.testing", true],
    ],
  },
  async function test_scheduled_updateAddonState_onBrowserReady() {
    const { sinon } = ChromeUtils.importESModule(
      "resource://testing-common/Sinon.sys.mjs"
    );
    const sandbox = sinon.createSandbox();
    const asyncAssertNoPendingInstalls = async () => {
      Assert.deepEqual(
        await AddonManager.getAllInstalls(),
        [],
        "Expect no pending install to be found"
      );
    };

    const promiseInstallPostponed =
      AddonTestUtils.promiseInstallEvent("onInstallPostponed");
    const updateAddonVersion = `${BUILTIN_ADDON_VERSION}.123`;
    const { nimbusFeatureCleanup } = await setupNimbusTrainhopAddon({
      updateAddonVersion,
    });
    await AboutNewTab.onBrowserReady();
    await promiseInstallPostponed;
    const { pendingInstall } = await asyncAssertNimbusTrainhopAddonStaged({
      updateAddonVersion,
    });
    await cancelPendingInstall(pendingInstall);
    // Sanity check.
    await asyncAssertNoPendingInstalls();

    // Verify that calls to updateTrainhopAddonState triggered while the client isn't
    // enrolled in the newtabTrainhopAddon Nimbus feature don't log any warning for
    // incomplete Nimbus feature variables, and that we do not call _installTrainhopAddon.
    const loggerWarnSpy = sandbox.spy(
      AboutNewTabResourceMapping.logger,
      "warn"
    );
    // The nimbusFeatureCleanup helper function is expected to trigger the Nimbus feature update
    // event like when a Nimbus featture is being unenrolled from the client, and so we await
    // for the deferred task to be completed.
    await nimbusFeatureCleanup();
    await AboutNewTabResourceMapping._updateAddonStateDeferredTask
      ?._runningPromise;
    await asyncAssertNoPendingInstalls();
    Assert.deepEqual(
      loggerWarnSpy.getCalls().map(spyCall => spyCall.args),
      [],
      "Expect no warning to be logged by updateTrainhopAddonState when not enrolled"
    );
    sandbox.restore();

    // NOTE: prevents AboutNewTab.uninit to hit unexpected failures while the test harness
    // is shutting down (side-effect of calling AboutNewTab onBrowserReady and the simulated
    // application restarts).
    AboutNewTab.activityStream = null;

    // NOTE: ensures the _updateAddonStateDeferredTask to return right away if triggered
    // after this test is completed while the xpcshell test harness is shutting down
    // (similarly to what would happen if it would be getting triggered too late on
    // the actual application shutdown).
    const { AsyncShutdown } = ChromeUtils.importESModule(
      "resource://gre/modules/AsyncShutdown.sys.mjs"
    );
    AsyncShutdown.appShutdownConfirmed._trigger();
  }
);
