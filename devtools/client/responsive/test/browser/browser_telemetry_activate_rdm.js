/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";
const URL = "data:text/html;charset=utf8,browser_telemetry_activate_rdm.js";

addRDMTask(
  null,
  async function () {
    // Let's reset the counts.
    Services.fog.testResetFOG();

    const tab = await addTab(URL);

    await openCloseRDM(tab);
    await gDevTools.showToolboxForTab(tab, { toolId: "inspector" });
    await openCloseRDM(tab);
    await checkResults();
  },
  { onlyPrefAndTask: true }
);

async function openCloseRDM(tab) {
  const { ui } = await openRDM(tab);
  await waitForDeviceAndViewportState(ui);

  const clientClosed = waitForClientClose(ui);

  closeRDM(tab, {
    reason: "TabClose",
  });

  // This flag is set at the end of `ResponsiveUI.destroy`.  If it is true
  // without waiting for `closeRDM` above, then we must have closed
  // synchronously.
  is(ui.destroyed, true, "RDM closed synchronously");

  await clientClosed;
}

async function checkResults() {
  const actives = Glean.devtoolsMain.activateResponsiveDesign.testGetValue();
  is(2, actives.length);
  is("none", actives[0].extra.host);
  is("bottom", actives[1].extra.host);
  const deactives =
    Glean.devtoolsMain.deactivateResponsiveDesign.testGetValue();
  is(2, deactives.length);
  is("none", deactives[0].extra.host);
  is("bottom", deactives[1].extra.host);
  [actives, deactives]
    .flat()
    .forEach(ev => Assert.greater(Number(ev.extra.width), 0));
}
