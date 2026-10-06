/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const URL = "data:text/html;charset=utf8,browser_toolbox_telemetry_enter.js";
const DATA = [
  {
    category: "devtools.main",
    name: "enter_inspector",
    extra: {
      host: "bottom",
      width: "1300",
      start_state: "initial_panel",
      panel_name: "inspector",
      cold: "true",
    },
  },
  {
    category: "devtools.main",
    name: "enter_jsdebugger",
    extra: {
      host: "bottom",
      width: "1300",
      start_state: "toolbox_show",
      panel_name: "jsdebugger",
      cold: "true",
    },
  },
  {
    category: "devtools.main",
    name: "enter_styleeditor",
    extra: {
      host: "bottom",
      width: "1300",
      start_state: "toolbox_show",
      panel_name: "styleeditor",
      cold: "true",
    },
  },
  {
    category: "devtools.main",
    name: "enter_netmonitor",
    extra: {
      host: "bottom",
      width: "1300",
      start_state: "toolbox_show",
      panel_name: "netmonitor",
      cold: "true",
    },
  },
  {
    category: "devtools.main",
    name: "enter_storage",
    extra: {
      host: "bottom",
      width: "1300",
      start_state: "toolbox_show",
      panel_name: "storage",
      cold: "true",
    },
  },
  {
    category: "devtools.main",
    name: "enter_netmonitor",
    extra: {
      host: "bottom",
      width: "1300",
      start_state: "toolbox_show",
      panel_name: "netmonitor",
      cold: "false",
    },
  },
];

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const tab = await addTab(URL);

  // Set up some cached messages for the web console.
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    content.console.log("test 1");
    content.console.log("test 2");
    content.console.log("test 3");
    content.console.log("test 4");
    content.console.log("test 5");
  });

  // Open the toolbox
  await gDevTools.showToolboxForTab(tab, { toolId: "inspector" });

  // Switch between a few tools
  await gDevTools.showToolboxForTab(tab, { toolId: "jsdebugger" });
  await gDevTools.showToolboxForTab(tab, { toolId: "styleeditor" });
  await gDevTools.showToolboxForTab(tab, { toolId: "netmonitor" });
  await gDevTools.showToolboxForTab(tab, { toolId: "storage" });
  await gDevTools.showToolboxForTab(tab, { toolId: "netmonitor" });

  checkResults();
});

function checkResults() {
  const events = [
    Glean.devtoolsMain.enterInspector.testGetValue(),
    Glean.devtoolsMain.enterJsdebugger.testGetValue(),
    Glean.devtoolsMain.enterStyleeditor.testGetValue(),
    Glean.devtoolsMain.enterStorage.testGetValue(),
    Glean.devtoolsMain.enterNetmonitor.testGetValue(),
  ]
    .flat()
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const [datum, ev] of Iterator.zip([DATA, events], { mode: "strict" })) {
    is(datum.category, ev.category, "category is correct");
    is(datum.name, ev.name, "name is correct");

    // extras
    is(datum.extra.host, ev.extra.host, "host is correct");
    Assert.greater(Number(ev.extra.width), 0, "width is greater than 0");
    is(datum.extra.start_state, ev.extra.start_state, "start_state is correct");
    is(datum.extra.panel_name, ev.extra.panel_name, "panel_name is correct");
    is(datum.extra.cold, ev.extra.cold, "cold is correct");
  }
}
