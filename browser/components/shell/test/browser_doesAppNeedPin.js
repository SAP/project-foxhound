/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

ChromeUtils.defineESModuleGetters(this, {
  ExperimentAPI: "resource://nimbus/ExperimentAPI.sys.mjs",
  ExperimentFakes: "resource://testing-common/NimbusTestUtils.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
});

registerCleanupFunction(() => {
  ExperimentAPI._store._deleteForTests("shellService");
});

let defaultValue;
add_task(async function default_need() {
  defaultValue = await ShellService.doesAppNeedPin();

  Assert.ok(defaultValue !== undefined, "Got a default app need pin value");
});

add_task(async function remote_disable() {
  if (defaultValue === false) {
    info("Default pin already false, so nothing to test");
    return;
  }

  let doCleanup = await ExperimentFakes.enrollWithFeatureConfig(
    {
      featureId: NimbusFeatures.shellService.featureId,
      value: { disablePin: true, enabled: true },
    },
    { isRollout: true }
  );

  Assert.equal(
    await ShellService.doesAppNeedPin(),
    false,
    "Pinning disabled via nimbus"
  );

  doCleanup();
});

add_task(async function restore_default() {
  if (defaultValue === undefined) {
    info("No default pin value set, so nothing to test");
    return;
  }

  ExperimentAPI._store._deleteForTests("shellService");

  Assert.equal(
    await ShellService.doesAppNeedPin(),
    defaultValue,
    "Pinning restored to original"
  );
});
