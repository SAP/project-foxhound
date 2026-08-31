/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Check that telemetry events are recorded when opening and closing about debugging.
 */
add_task(async function () {
  Services.fog.testResetFOG();

  const { tab } = await openAboutDebugging();

  const openEvents = Glean.devtoolsMain.openAdbgAboutdebugging.testGetValue();
  is(
    openEvents.length,
    1,
    "Exactly one open event was logged for about:debugging"
  );
  const sessionId = openEvents[0].extra.session_id;
  ok(!isNaN(sessionId), "Open event has a valid session id");

  await removeTab(tab);

  const closeEvents = Glean.devtoolsMain.closeAdbgAboutdebugging.testGetValue();
  is(
    closeEvents.length,
    1,
    "Exactly one close event was logged for about:debugging"
  );
  is(
    closeEvents[0].extra.session_id,
    sessionId,
    "Close event has the same session id as the open event"
  );
});
