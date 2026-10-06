/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_URL = "data:text/html,test for toolbox visibility";

const { Toolbox } = require("resource://devtools/client/framework/toolbox.js");

add_task(async function () {
  info("Open a first tab with devtools opened against it");
  const tab1 = await addTab(TEST_URL);
  const toolbox = await gDevTools.showToolboxForTab(tab1);
  is(
    toolbox.win.document.visibilityState,
    "visible",
    "The toolbox is visible after opening on the first tab"
  );

  const tab2 = BrowserTestUtils.addTab(gBrowser);
  is(
    toolbox.win.document.visibilityState,
    "visible",
    "The toolbox is still visibile after opening a second tab as a background tab"
  );
  const inspector = toolbox.getPanel("inspector");
  info(" Select the second tab to hide the devtools");
  let onToolboxVisibilityChange = waitForVisibilityChange(toolbox.win);
  let onPanelVisibilityChange = waitForVisibilityChange(inspector.panelWin);
  gBrowser.selectedTab = tab2;
  info("Wait for toolbox visibility change");
  await onToolboxVisibilityChange;
  info("Wait for panel visibility change");
  await onPanelVisibilityChange;
  is(
    toolbox.win.document.visibilityState,
    "hidden",
    "The toolbox becomes hidden when selecting the second tab"
  );
  is(
    inspector.panelWin.document.visibilityState,
    "hidden",
    "The inspector becomes hidden when selecting the second tab"
  );

  info(" Select the first tab again to show the devtools");
  onToolboxVisibilityChange = waitForVisibilityChange(toolbox.win);
  onPanelVisibilityChange = waitForVisibilityChange(inspector.panelWin);
  gBrowser.selectedTab = tab1;
  info("Wait for toolbox visibility change");
  await onToolboxVisibilityChange;
  info("Wait for panel visibility change");
  await onPanelVisibilityChange;
  is(
    toolbox.win.document.visibilityState,
    "visible",
    "The toolbox becomes visible when going back to its related first tab"
  );
  is(
    inspector.panelWin.document.visibilityState,
    "visible",
    "The inspector becomes visible when going back to its related first tab"
  );

  info("Switch to independent window for devtools");
  await toolbox.switchHost(Toolbox.HostType.WINDOW);
  is(
    toolbox.win.document.visibilityState,
    "visible",
    "The toolbox stays visibile when switching to WINDOW host type"
  );
  is(
    inspector.panelWin.document.visibilityState,
    "visible",
    "The inspector stays visibile when switching to WINDOW host type"
  );

  info(
    "Switch the tab to ensure the DevTools stays visible when in WINDOW host"
  );
  await BrowserTestUtils.switchTab(gBrowser, tab2);
  is(
    toolbox.win.document.visibilityState,
    "visible",
    "The toolbox in WINDOW host stays visibile when switching tabs in firefox"
  );
  is(
    inspector.panelWin.document.visibilityState,
    "visible",
    "The inspector also stays visibile when switching tabs in firefox"
  );
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Switch back to in-browser bottom host");
  await toolbox.switchHost(Toolbox.HostType.BOTTOM);

  onPanelVisibilityChange = waitForVisibilityChange(inspector.panelWin);
  const { hud } = await toolbox.selectTool("webconsole");
  is(hud.ui.document.visibilityState, "visible", "The console is visible");
  info("Wait for inspector panel visibility change");
  await onPanelVisibilityChange;
  is(
    inspector.panelWin.document.visibilityState,
    "hidden",
    "The inspector becomes hidden when moving to the web console"
  );

  info("Select the other tab once again to hide DevTools");
  onToolboxVisibilityChange = waitForVisibilityChange(toolbox.win);
  onPanelVisibilityChange = waitForVisibilityChange(hud.ui.window);
  gBrowser.selectedTab = tab2;
  info("Wait for toolbox visibility change");
  await onToolboxVisibilityChange;
  info("Wait for panel visibility change");
  await onPanelVisibilityChange;
  is(
    toolbox.win.document.visibilityState,
    "hidden",
    "The toolbox becomes hidden when selecting the second tab"
  );
  is(
    hud.ui.document.visibilityState,
    "hidden",
    "The inspector becomes hidden when selecting the second tab"
  );

  info(
    "Select the inspector and raise the toolbox to switch to its related tab"
  );
  await toolbox.selectTool("inspector");
  onToolboxVisibilityChange = waitForVisibilityChange(toolbox.win);
  onPanelVisibilityChange = waitForVisibilityChange(inspector.panelWin);
  const onConsolePanelVisibilityChange = waitForVisibilityChange(hud.ui.window);
  toolbox.raise();
  info("Wait for toolbox visibility change after raising the toolbox");
  await onToolboxVisibilityChange;
  info("Wait for panel visibility change");
  await onPanelVisibilityChange;
  info("Wait for console panel visibility change");
  await onConsolePanelVisibilityChange;
  is(
    toolbox.win.document.visibilityState,
    "visible",
    "The tab and toolbox are becoming visible when raising the toolbox"
  );
  is(
    inspector.panelWin.document.visibilityState,
    "visible",
    "The inspector is also becoming visible when raising the toolbox"
  );
  is(
    hud.ui.document.visibilityState,
    "hidden",
    "The console is now hidden as we moved to the inspector"
  );

  await toolbox.destroy();
  gBrowser.removeCurrentTab();
  gBrowser.removeCurrentTab();
});

function waitForVisibilityChange(win) {
  return new Promise(r => {
    win.document.addEventListener("visibilitychange", r, {
      once: true,
    });
  });
}
