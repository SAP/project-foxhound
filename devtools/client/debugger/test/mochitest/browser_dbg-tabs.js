/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// Tests adding and removing tabs

"use strict";

add_task(async function testTabsOnReload() {
  const dbg = await initDebugger(
    "doc-scripts.html",
    "simple1.js",
    "simple2.js"
  );

  await selectSource(dbg, "simple1.js");
  await selectSource(dbg, "simple2.js");
  is(countTabs(dbg), 2);

  info("Test reloading the debugger");
  await reload(dbg, "simple1.js", "simple2.js");
  await waitForSelectedSource(dbg, "simple2.js");
  is(countTabs(dbg), 2);

  info("Test reloading the debuggee a second time");
  await reload(dbg, "simple1.js", "simple2.js");
  await waitForSelectedSource(dbg, "simple2.js");
  is(countTabs(dbg), 2);
});

function assertTabs(dbg, tabs) {
  const { children } = findElement(dbg, "sourceTabs");
  is(children.length, tabs.length);
  for (let i = 0; i < tabs.length; i++) {
    is(tabs[i], children[i].textContent);
  }
}

add_task(async function testOpeningAndClosingTabs() {
  const dbg = await initDebugger(
    "doc-scripts.html",
    "simple1.js",
    "simple2.js",
    "simple3.js"
  );

  // /!\ Tabs are opened by default on the left/beginning
  // so that they are displayed in the other way around.
  // To make the test clearer insert them in a way so that
  // they are in the expected order: simple1 then simple2,...
  await selectSource(dbg, "simple3.js");
  await selectSource(dbg, "simple2.js");
  await selectSource(dbg, "simple1.js");

  assertTabs(dbg, ["simple1.js", "simple2.js", "simple3.js"]);

  info("Reselect simple2 so that we then close the selected tab");
  await selectSource(dbg, "simple2.js");
  await closeTab(dbg, "simple2.js");
  is(countTabs(dbg), 2);
  info("Removing the tab in the middle should select the following one");
  await waitForSelectedSource(dbg, "simple3.js");

  await closeTab(dbg, "simple3.js");
  is(countTabs(dbg), 1);
  info("Removing the last tab should select the first tab before");
  await waitForSelectedSource(dbg, "simple1.js");

  info("Re-open a second tab so that we can cover closing the first tab");
  await selectSource(dbg, "simple2.js");
  is(countTabs(dbg), 2);
  await closeTab(dbg, "simple1.js");
  info("Removing the first tab should select the first tab after");
  is(countTabs(dbg), 1);
  await waitForSelectedSource(dbg, "simple2.js");

  info("Close the last tab");
  await closeTab(dbg, "simple2.js");
  is(countTabs(dbg), 0);
  is(
    dbg.selectors.getSelectedLocation(),
    null,
    "Selected location is cleared when closing the last tab"
  );

  info("Test reloading the debugger with all tabs closed");
  await reload(dbg, "simple1.js", "simple2.js", "simple3.js");
  is(countTabs(dbg), 0, "No tab is reopened after reload");

  // /!\ Tabs are opened by default on the left/beginning
  // so that they are displayed in the other way around.
  // To make the test clearer insert them in a way so that
  // they are in the expected order: simple1 then simple2,...
  await selectSource(dbg, "simple3.js");
  await selectSource(dbg, "simple2.js");
  await selectSource(dbg, "simple1.js");
  is(countTabs(dbg), 3);
  assertTabs(dbg, ["simple1.js", "simple2.js", "simple3.js"]);

  info("Test reloading the debugger with tabs left opened");
  await reload(dbg, "simple1.js", "simple2.js", "simple3.js");
  is(countTabs(dbg), 3);
  assertTabs(dbg, ["simple1.js", "simple2.js", "simple3.js"]);

  info("Reselect simple3 so that we then close the selected tab");
  await selectSource(dbg, "simple3.js");

  info("Removing the last tab, should select the one before");
  await closeTab(dbg, "simple3.js");
  is(countTabs(dbg), 2);
  await waitForSelectedSource(dbg, "simple2.js");

  info(
    "Open tab for the HTML page, which has many source actors and may trigger more than one tab to be opened on reload"
  );
  await selectSource(dbg, "doc-scripts.html");
  is(countTabs(dbg), 3);
  await reload(
    dbg,
    "doc-scripts.html",
    "simple1.js",
    "simple2.js",
    "simple3.js"
  );
  is(countTabs(dbg), 3);

  // Inject lots of sources to have some tabs displayed in the dropdown
  const injectedSources = await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [],
    function () {
      const sources = [];
      for (let i = 1; i <= 10; i++) {
        const value = String(i).padStart(3, "0");
        content.eval(
          `function evalSource() {}; //# sourceURL=eval-source-${value}.js`
        );
        sources.push(`eval-source-${value}.js`);
      }
      return sources;
    }
  );
  await waitForSources(dbg, ...injectedSources);
  for (const source of injectedSources) {
    await selectSource(dbg, source);
  }
  ok(
    findElementWithSelector(dbg, ".dbg-img-more-tabs"),
    "There is some hidden tabs displayed via a dropdown"
  );

  info("Test the close all tabs context menu");
  const waitForOpen = waitForContextMenu(dbg);
  info(`Open the current active tab context menu`);
  rightClickElement(dbg, "activeTab");
  await waitForOpen;

  info(`Select the close all tabs context menu item`);
  const onCloseTabsAction = waitForDispatch(
    dbg.store,
    "CLOSE_TABS_FOR_SOURCES"
  );
  selectContextMenuItem(dbg, `#node-menu-close-all-tabs`);
  await onCloseTabsAction;
  is(countTabs(dbg), 0);
  ok(
    !findElementWithSelector(dbg, ".dbg-img-more-tabs"),
    "After closing all tabs, hidden tabs dropdown is hidden"
  );
});
