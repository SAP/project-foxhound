/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Tests the filters_changed telemetry event.

"use strict";

const TEST_URI = `data:text/html,<!DOCTYPE html><meta charset=utf8><script>
  console.log("test message");
</script>`;

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const hud = await openNewTabAndConsole(TEST_URI);

  info("Click on the 'log' filter");
  await setFilterState(hud, {
    log: false,
  });

  let events = Glean.devtoolsMain.filtersChangedWebconsole.testGetValue();
  is(1, events.length);
  Assert.deepEqual(
    {
      trigger: "log",
      active: "error,warn,info,debug",
      inactive: "text,log,css,net,netxhr",
      session_id: events[0].extra.session_id,
    },
    events[0].extra
  );
  Services.fog.testResetFOG();

  info("Click on the 'netxhr' filter");
  await setFilterState(hud, {
    netxhr: true,
  });

  events = Glean.devtoolsMain.filtersChangedWebconsole.testGetValue();
  is(1, events.length);
  Assert.deepEqual(
    {
      trigger: "netxhr",
      active: "error,warn,info,debug,netxhr",
      inactive: "text,log,css,net",
      session_id: events[0].extra.session_id,
    },
    events[0].extra
  );
  Services.fog.testResetFOG();

  info("Filter the output using the text filter input");
  await setFilterState(hud, { text: "no match" });

  events = Glean.devtoolsMain.filtersChangedWebconsole.testGetValue();
  is(1, events.length);
  Assert.deepEqual(
    {
      trigger: "text",
      active: "text,error,warn,info,debug,netxhr",
      inactive: "log,css,net",
      session_id: events[0].extra.session_id,
    },
    events[0].extra
  );
});
