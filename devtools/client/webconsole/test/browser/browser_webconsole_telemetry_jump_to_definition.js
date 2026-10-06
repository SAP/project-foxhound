/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests the jump_to_definition telemetry event.

"use strict";

const TEST_URI = `data:text/html,<!DOCTYPE html><meta charset=utf8><script>
  function x(){}
  console.log("test message", x);
</script>`;

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const hud = await openNewTabAndConsole(TEST_URI);

  const message = await waitFor(() =>
    findConsoleAPIMessage(hud, "test message")
  );
  info("Click on the 'jump to definition' button");
  const jumpIcon = message.querySelector(".jump-definition");
  jumpIcon.click();

  const events = Glean.devtoolsMain.jumpToDefinitionWebconsole
    .testGetValue()
    .map(ev => ev.extra);
  is(events.length, 1, "There was 1 event logged");
  const [event] = events;
  Assert.greater(
    Number(event.session_id),
    0,
    "There is a valid session_id in the logged event"
  );
});
