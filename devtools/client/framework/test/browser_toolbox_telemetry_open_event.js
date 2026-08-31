/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that the "open" telemetry event is correctly logged when opening the
// toolbox.

add_task(async function () {
  Services.fog.testResetFOG();
  const tab = await addTab("data:text/html;charset=utf-8,Test open event");

  info("Open the toolbox with a shortcut to trigger the open event");
  const onToolboxReady = gDevTools.once("toolbox-ready");
  EventUtils.synthesizeKey("VK_F12", {});
  await onToolboxReady;

  const events = Glean.devtoolsMain.openTools.testGetValue();
  is(1, events.length);
  is("-1", events[0].extra.session_id);
  is("KeyShortcut", events[0].extra.entrypoint);
  is("+F12", events[0].extra.shortcut);

  gBrowser.removeTab(tab);
});
