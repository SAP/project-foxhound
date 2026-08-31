"use strict";

add_setup(function () {
  // FOG needs a profile directory and one-time initialization in xpcshell.
  do_get_profile();
  Services.fog.initializeFOG();
});

async function gatherMemorySnapshot() {
  Services.fog.testResetFOG();
  Services.telemetry.gatherMemory();
  await Services.fog.testFlushAllChildren();
  return {
    compsSystem: Glean.memory.jsCompartmentsSystem.testGetValue().sum,
    compsUser: Glean.memory.jsCompartmentsUser.testGetValue().sum,
    realmsSystem: Glean.memory.jsRealmsSystem.testGetValue().sum,
    realmsUser: Glean.memory.jsRealmsUser.testGetValue().sum,
  };
}

add_task(async function test_compartment_realm_counts() {
  Cu.forceShrinkingGC();

  // MemoryTelemetry class needs to be created and initialised.
  Services.telemetry.earlyInit();
  Services.telemetry.delayedInit();

  const before = await gatherMemorySnapshot();

  // We can't hard code exact counts, but we can check some basic invariants:
  //
  // * Compartments must contain at least one realm, so there must be more
  //   realms than compartments.
  // * There must be at least one system realm.

  Assert.lessOrEqual(before.realmsSystem, before.compsSystem,
            "Number of system compartments can't exceed number of system realms");
  Assert.lessOrEqual(before.realmsUser, before.compsUser,
            "Number of user compartments can't exceed number of user realms");
  Assert.greater(before.realmsSystem, 0,
            "There must be at least one system realm");

  // Now we create a bunch of sandboxes (more than one to be more resilient
  // against GCs happening in the meantime), so we can check:
  //
  // * There are now more realms and user compartments than before. Not system
  //   compartments, because system realms share a compartment.
  // * The system compartment contains multiple realms.

  let systemPrincipal = Services.scriptSecurityManager.getSystemPrincipal();
  let arr = [];
  for (let i = 0; i < 5; i++) {
    arr.push(Cu.Sandbox(null));
    arr.push(Cu.Sandbox(systemPrincipal));
  }

  const after = await gatherMemorySnapshot();

  for (let k of ["realmsSystem", "realmsUser", "compsUser"]) {
    Assert.greater(after[k], before[k],
              "There must be more compartments/realms now: " + k);
  }

  Assert.greater(after.realmsSystem, after.compsSystem,
            "There must be more system realms than system compartments now");

  arr[0].x = 10; // Ensure the JS engine keeps |arr| alive until this point.

  Services.telemetry.shutdown();
});
