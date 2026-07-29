/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

const TEST_URI =
  "data:text/html;charset=UTF-8," +
  "<h1>browser_inspector_sidebarstate.js</h1>";

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  let { inspector, toolbox } = await openInspectorForURL(TEST_URI);

  info("Selecting font inspector.");
  await inspector.sidebar.select("fontinspector");

  is(
    inspector.sidebar.getCurrentTabID(),
    "fontinspector",
    "Font Inspector is selected"
  );

  info("Selecting compatibility view.");
  const onCompatibilityViewInitialized = inspector.once(
    "compatibilityview-initialized"
  );
  await inspector.sidebar.select("compatibilityview");
  await onCompatibilityViewInitialized;

  is(
    inspector.sidebar.getCurrentTabID(),
    "compatibilityview",
    "Compatibility View is selected"
  );

  info("Selecting computed view.");
  await inspector.sidebar.select("computedview");

  is(
    inspector.sidebar.getCurrentTabID(),
    "computedview",
    "Computed View is selected"
  );

  info("Closing inspector.");
  await toolbox.destroy();

  info("Re-opening inspector.");
  inspector = (await openInspector()).inspector;

  if (!inspector.sidebar.getCurrentTabID()) {
    info("Default sidebar still to be selected, adding select listener.");
    await inspector.sidebar.once("select");
  }

  is(
    inspector.sidebar.getCurrentTabID(),
    "computedview",
    "Computed view is selected by default."
  );

  checkTelemetryResults();
});

function checkTelemetryResults() {
  const events = [
    Glean.devtoolsMain.toolTimerLayoutview.testGetValue(),
    Glean.devtoolsMain.toolTimerFontinspector.testGetValue(),
    Glean.devtoolsMain.toolTimerCompatibilityview.testGetValue(),
    Glean.devtoolsMain.toolTimerComputedview.testGetValue(),
  ].flat();
  Assert.equal(4, events.length);
  events.forEach(ev => Assert.greater(Number(ev.extra.time_open), 0));
}
