/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { Toolbox } = require("resource://devtools/client/framework/toolbox.js");

const URL = "data:text/html;charset=utf8,browser_toolbox_telemetry_close.js";
const { RIGHT, BOTTOM } = Toolbox.HostType;

add_task(async function () {
  // Let's reset the counts.
  Services.fog.testResetFOG();

  await openAndCloseToolbox("webconsole", RIGHT);
  await openAndCloseToolbox("webconsole", BOTTOM);

  checkResults();
});

async function openAndCloseToolbox(toolId, host) {
  const tab = await addTab(URL);
  const toolbox = await gDevTools.showToolboxForTab(tab, { toolId });

  await toolbox.switchHost(host);
  await toolbox.destroy();
}

function checkResults() {
  const closes = Glean.devtoolsMain.closeTools.testGetValue();
  Assert.equal(2, closes.length);
  Assert.equal("right", closes[0].extra.host);
  Assert.equal("bottom", closes[1].extra.host);
  closes.forEach(ev => Assert.greater(Number(ev.extra.width), 0));
}
