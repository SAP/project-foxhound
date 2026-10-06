/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const URL =
  "data:text/html;charset=utf8,browser_toolbox_telemetry_activate_splitconsole.js";

add_task(async function () {
  // See Bug 1500141: this test frequently fails on beta because some highlighter
  // requests made by the BoxModel component in the layout view come back when the
  // connection between the client and the server has been destroyed. We are forcing
  // the computed view here to avoid the failures but ideally we should have an event
  // or a promise on the inspector we can wait for to be sure the initialization is over.
  // Logged Bug 1500918 to investigate this.
  await pushPref("devtools.inspector.activeSidebar", "computedview");

  // Let's reset the counts.
  Services.fog.testResetFOG();

  const tab = await addTab(URL);
  const toolbox = await gDevTools.showToolboxForTab(tab, {
    toolId: "inspector",
  });

  await toolbox.openSplitConsole();
  await toolbox.closeSplitConsole();
  await toolbox.openSplitConsole();
  await toolbox.closeSplitConsole();

  const actives = Glean.devtoolsMain.activateSplitConsole.testGetValue();
  Assert.equal(2, actives.length);
  actives.forEach(ev => {
    Assert.equal("bottom", ev.extra.host);
    Assert.greater(Number(ev.extra.width), 0);
  });
  const deactives = Glean.devtoolsMain.deactivateSplitConsole.testGetValue();
  Assert.equal(2, deactives.length);
  deactives.forEach(ev => {
    Assert.equal("bottom", ev.extra.host);
    Assert.greater(Number(ev.extra.width), 0);
  });
});
