/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI =
  "data:text/html;charset=utf-8," + "<p>browser_telemetry_toolbox.js</p>";

// Because we need to gather stats for the period of time that a tool has been
// opened we make use of setTimeout() to create tool active times.
const TOOL_DELAY = 200;

add_task(async function () {
  await addTab(TEST_URI);
  Services.fog.testResetFOG();

  await openAndCloseToolbox(3, TOOL_DELAY, "inspector");
  checkResults();

  gBrowser.removeCurrentTab();
});

function checkResults() {
  is(3, Glean.devtools.toolboxOpenedCount.testGetValue());
  Assert.greater(Glean.devtools.toolboxTimeActive.testGetValue().sum, 0);
  Assert.greater(Glean.devtools.toolboxHost.testGetValue().count, 0);
}
