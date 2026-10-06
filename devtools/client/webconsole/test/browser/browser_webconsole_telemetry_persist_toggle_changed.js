/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests the log persistence telemetry event

"use strict";

const TEST_URI = `data:text/html,<!DOCTYPE html><meta charset=utf8><script>
  console.log("test message");
</script>`;

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const hud = await openNewTabAndConsole(TEST_URI);

  // Toggle persistent logs - "true"
  await toggleConsoleSetting(
    hud,
    ".webconsole-console-settings-menu-item-persistentLogs"
  );
  await waitUntil(
    () => hud.ui.wrapper.getStore().getState().ui.persistLogs === true
  );

  // Toggle persistent logs - "false"
  await toggleConsoleSetting(
    hud,
    ".webconsole-console-settings-menu-item-persistentLogs"
  );
  await waitUntil(
    () => hud.ui.wrapper.getStore().getState().ui.persistLogs === false
  );

  const events = Glean.devtoolsMain.persistChangedWebconsole.testGetValue();
  is(2, events.length);
  is("true", events[0].extra.value);
  is("false", events[1].extra.value);
});
