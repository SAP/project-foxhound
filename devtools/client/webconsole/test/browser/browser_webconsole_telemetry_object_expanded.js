/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests the object_expanded telemetry event.

"use strict";

const TEST_URI = `data:text/html,<!DOCTYPE html><meta charset=utf8><script>
  console.log("test message", [1,2,3]);
</script>`;

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const hud = await openNewTabAndConsole(TEST_URI);

  const message = await waitFor(() =>
    findConsoleAPIMessage(hud, "test message")
  );

  info("Click on the arrow icon to expand the node");
  const arrowIcon = message.querySelector(".theme-twisty");
  arrowIcon.click();

  // let's wait until we have 2 arrows (i.e. the object was expanded)
  await waitFor(() => message.querySelectorAll(".theme-twisty").length === 2);

  let events = Glean.devtoolsMain.objectExpandedWebconsole
    .testGetValue()
    .map(ev => ev.extra);
  Services.fog.testResetFOG();
  is(events.length, 1, "There was 1 event logged");
  const [event] = events;
  Assert.greater(
    Number(event.session_id),
    0,
    "There is a valid session_id in the logged event"
  );

  info("Click on the second arrow icon to expand the prototype node");
  const secondArrowIcon = message.querySelectorAll(".theme-twisty")[1];
  secondArrowIcon.click();
  // let's wait until we have more than 2 arrows displayed, i.e. the prototype node was
  // expanded.
  await waitFor(() => message.querySelectorAll(".theme-twisty").length > 2);

  events = Glean.devtoolsMain.objectExpandedWebconsole
    .testGetValue()
    .map(ev => ev.extra);
  is(events.length, 1, "There was an event logged when expanding a child node");

  info("Click the first arrow to collapse the object");
  arrowIcon.click();
  // Let's wait until there's only one arrow visible, i.e. the node is collapsed.
  await waitFor(() => message.querySelectorAll(".theme-twisty").length === 1);
});
