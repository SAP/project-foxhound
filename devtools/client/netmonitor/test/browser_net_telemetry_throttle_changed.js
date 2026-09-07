/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Test the throttle_change telemetry event.
 */
add_task(async function () {
  const { monitor } = await initNetMonitor(SIMPLE_URL, {
    requestCount: 1,
  });
  info("Starting test... ");

  const { store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");
  store.dispatch(Actions.batchEnable(false));

  // Remove all telemetry events.
  Services.fog.testResetFOG();

  await selectThrottle(monitor, "GPRS");
  // Verify existence of the telemetry event.
  const events = Glean.devtoolsMain.throttleChangedNetmonitor.testGetValue();
  is(1, events.length);
  is("GPRS", events[0].extra.mode);

  return teardown(monitor);
});
