/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URI =
  "data:text/html;charset=utf-8,<p>browser_telemetry_misc.js</p>";
const TOOL_DELAY = 0;

add_task(async function () {
  await addTab(TEST_URI);

  Services.fog.testResetFOG();

  await openAndCloseToolbox(1, TOOL_DELAY, "inspector");
  checkResults();

  gBrowser.removeCurrentTab();
});

function checkResults() {
  is(1, Glean.devtools.toolboxOpenedCount.testGetValue());
  is(1, Glean.devtools.inspectorOpenedCount.testGetValue());
  Assert.greater(Glean.devtools.toolboxTimeActive.testGetValue().sum, 0);
  Assert.greater(Glean.devtools.inspectorTimeActive.testGetValue().sum, 0);
  Assert.greater(Glean.devtools.ruleviewTimeActive.testGetValue().sum, 0);
  Assert.greater(Glean.devtools.toolboxHost.testGetValue().values[0], 0);
}
