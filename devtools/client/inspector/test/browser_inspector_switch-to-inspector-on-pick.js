/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Testing that clicking the pick button switches the toolbox to the inspector
// panel.

const TEST_URI =
  "data:text/html;charset=UTF-8,<!DOCTYPE html><script>console.log(`hello`)</script><p>Switch to inspector on pick</p>";

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  const tab = await addTab(TEST_URI);
  const toolbox = await openToolbox(tab);

  await startPickerAndAssertSwitchToInspector(toolbox);

  info("Stopping element picker.");
  await toolbox.nodePicker.stop({ canceled: true });

  checkResults();
});

async function openToolbox(tab) {
  info("Opening webconsole.");
  return gDevTools.showToolboxForTab(tab, { toolId: "webconsole" });
}

async function startPickerAndAssertSwitchToInspector(toolbox) {
  info("Clicking element picker button.");
  const pickButton = toolbox.doc.querySelector("#command-button-pick");
  pickButton.click();

  info("Waiting for inspector to be selected.");
  await toolbox.once("inspector-selected");
  is(toolbox.currentToolId, "inspector", "Switched to the inspector");
}

function checkResults() {
  const ewEvents = Glean.devtoolsMain.enterWebconsole.testGetValue();
  is(1, ewEvents.length);
  is("initial_panel", ewEvents[0].extra.start_state);
  is("true", ewEvents[0].extra.cold);
  is("1", ewEvents[0].extra.message_count);
  const xwEvents = Glean.devtoolsMain.exitWebconsole.testGetValue();
  is(1, xwEvents.length);
  is("inspector", xwEvents[0].extra.next_panel);
  is("inspect_dom", xwEvents[0].extra.reason);
  const eiEvents = Glean.devtoolsMain.enterInspector.testGetValue();
  is(1, eiEvents.length);
  is("inspect_dom", eiEvents[0].extra.start_state);
  is("true", eiEvents[0].extra.cold);

  for (const ev of [ewEvents, xwEvents, eiEvents].flat()) {
    is("bottom", ev.extra.host);
    Assert.greater(Number(ev.extra.width), 0);
    is(ev.name.split("_")[1], ev.extra.panel_name);
  }
}
