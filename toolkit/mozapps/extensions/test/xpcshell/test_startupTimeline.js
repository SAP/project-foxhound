createAppInfo("xpcshell@tests.mozilla.org", "XPCShell", "1", "1.9.2");

add_setup(function () {
  do_get_profile();
  Services.fog.initializeFOG();
});

add_task(async function () {
  let prevTime = Services.telemetry.msSinceProcessStart();
  await promiseStartupManager();

  const startupPhases = [
    "AMI_startup_begin",
    "XPI_startup_begin",
    "XPI_bootstrap_addons_begin",
    "XPI_bootstrap_addons_end",
    "XPI_startup_end",
    "AMI_startup_end",
  ];
  for (let phase of startupPhases) {
    let curTime = Glean.addonsManager.startupTimeline[phase].testGetValue();
    Assert.greaterOrEqual(curTime, prevTime, `${phase} past previous phase.`);
    prevTime = curTime;
  }

  await promiseShutdownManager();
});
