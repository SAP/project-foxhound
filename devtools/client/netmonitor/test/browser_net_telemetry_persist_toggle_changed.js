/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Tests the log persistence telemetry event
 */
function togglePersistLogsOption(monitor) {
  clickSettingsMenuItem(monitor, "persist-logs");
}

function ensurePersistLogsCheckedState(monitor, isChecked) {
  openSettingsMenu(monitor);
  const persistNode = getSettingsMenuItem(monitor, "persist-logs");
  return !!persistNode?.getAttribute("aria-checked") === isChecked;
}

add_task(async function () {
  const { monitor } = await initNetMonitor(SINGLE_GET_URL, { requestCount: 1 });
  info("Starting test... ");

  const { store, windowRequire } = monitor.panelWin;
  const Actions = windowRequire("devtools/client/netmonitor/src/actions/index");

  store.dispatch(Actions.batchEnable(false));

  await waitForAllNetworkUpdateEvents();

  // Clear all events
  Services.fog.testResetFOG();

  // Click on the toggle - "true" and make sure it was set to correct value
  let onPersistChanged = monitor.panelWin.api.once(TEST_EVENTS.PERSIST_CHANGED);
  togglePersistLogsOption(monitor);
  await waitUntil(() => ensurePersistLogsCheckedState(monitor, true));
  await onPersistChanged;

  // Click a second time - "false" and make sure it was set to correct value
  onPersistChanged = monitor.panelWin.api.once(TEST_EVENTS.PERSIST_CHANGED);
  togglePersistLogsOption(monitor);
  await waitUntil(() => ensurePersistLogsCheckedState(monitor, false));
  await onPersistChanged;

  await waitForAllNetworkUpdateEvents();
  const persists = Glean.devtoolsMain.persistChangedNetmonitor.testGetValue();
  is(2, persists.length);
  is("true", persists[0].extra.value);
  is("false", persists[1].extra.value);

  // Set Persist log preference back to false
  Services.prefs.setBoolPref("devtools.netmonitor.persistlog", false);

  return teardown(monitor);
});
