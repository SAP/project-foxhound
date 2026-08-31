/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const URL = "data:text/html;charset=utf8,browser_toolbox_telemetry_enter.js";

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const tab = await addTab(URL);

  // Open the toolbox
  await gDevTools.showToolboxForTab(tab, { toolId: "inspector" });

  // Switch between a few tools
  await gDevTools.showToolboxForTab(tab, { toolId: "jsdebugger" });
  await gDevTools.showToolboxForTab(tab, { toolId: "styleeditor" });
  await gDevTools.showToolboxForTab(tab, { toolId: "netmonitor" });
  await gDevTools.showToolboxForTab(tab, { toolId: "storage" });
  await gDevTools.showToolboxForTab(tab, { toolId: "netmonitor" });

  await checkResults();
});

async function checkResults() {
  const events = [
    Glean.devtoolsMain.exitInspector.testGetValue(),
    Glean.devtoolsMain.exitJsdebugger.testGetValue(),
    Glean.devtoolsMain.exitStyleeditor.testGetValue(),
    Glean.devtoolsMain.exitNetmonitor.testGetValue(),
    Glean.devtoolsMain.exitStorage.testGetValue(),
  ].flat();
  const nexts = [
    "jsdebugger",
    "styleeditor",
    "netmonitor",
    "storage",
    "netmonitor",
  ];
  for (const [ev, nextPanel] of Iterator.zip([events, nexts])) {
    Assert.equal("bottom", ev.extra.host);
    Assert.greater(Number(ev.extra.width), 0);
    Assert.equal(ev.name.split("_")[1], ev.extra.panel_name);
    Assert.equal("toolbox_show", ev.extra.reason);
    Assert.equal(nextPanel, ev.extra.next_panel);
  }
}
