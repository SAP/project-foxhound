/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_URL = "https://example.com";

async function addTabAndLoadBrowser() {
  const tab = BrowserTestUtils.addTab(gBrowser, TEST_URL);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);
  return tab;
}

async function showStatusPanel() {
  window.XULBrowserWindow.overLink = TEST_URL;
  window.StatusPanel.update();
  return promiseStatusPanelShown(window, TEST_URL);
}

async function hideStatusPanel() {
  window.XULBrowserWindow.overLink = "";
  window.StatusPanel.update();
  return promiseStatusPanelHidden(window);
}

add_task(async function test_show_statuspanel_in_split_view() {
  const tab1 = await addTabAndLoadBrowser();
  const tab2 = await addTabAndLoadBrowser();
  await BrowserTestUtils.switchTab(gBrowser, tab1);

  info("Activate split view.");
  const splitView = gBrowser.addTabSplitView([tab1, tab2]);
  const panel1 = document.getElementById(tab1.linkedPanel);
  const panel2 = document.getElementById(tab2.linkedPanel);

  info("Hover over the active panel.");
  EventUtils.synthesizeMouseAtCenter(panel1, { type: "mousemove" });
  await showStatusPanel();
  Assert.ok(
    panel1.contains(StatusPanel.panel),
    "Hover link shown within the active panel."
  );
  await hideStatusPanel();

  info("Hover over the inactive panel.");
  EventUtils.synthesizeMouseAtCenter(panel2, { type: "mousemove" });
  await showStatusPanel();
  Assert.ok(
    panel2.contains(StatusPanel.panel),
    "Hover link shown within the inactive panel."
  );
  await hideStatusPanel();

  splitView.close();
});
