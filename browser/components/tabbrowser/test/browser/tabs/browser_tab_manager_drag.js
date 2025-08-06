/**
 * Test reordering the tabs in the Tab Manager, moving the tab between the
 * Tab Manager and tab bar.
 */

"use strict";

const { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

const URL1 = "data:text/plain,tab1";
const URL2 = "data:text/plain,tab2";
const URL3 = "data:text/plain,tab3";
const URL4 = "data:text/plain,tab4";
const URL5 = "data:text/plain,tab5";

function assertOrder(order, expected, message) {
  is(
    JSON.stringify(order),
    JSON.stringify(expected),
    `The order of the tabs ${message}`
  );
}

function toIndex(url) {
  const m = url.match(/^data:text\/plain,tab(\d)/);
  if (m) {
    return parseInt(m[1]);
  }
  return 0;
}

function getOrderOfList(list) {
  return [...list.querySelectorAll("toolbaritem")].map(row => {
    const url = row.firstElementChild.tab.linkedBrowser.currentURI.spec;
    return toIndex(url);
  });
}

function getOrderOfTabs(tabs) {
  return tabs.map(tab => {
    const url = tab.linkedBrowser.currentURI.spec;
    return toIndex(url);
  });
}

async function testWithNewWindow(func) {
  const newWindow = await BrowserTestUtils.openNewBrowserWindow();

  await Promise.all([
    addTabTo(newWindow.gBrowser, URL1),
    addTabTo(newWindow.gBrowser, URL2),
    addTabTo(newWindow.gBrowser, URL3),
    addTabTo(newWindow.gBrowser, URL4),
    addTabTo(newWindow.gBrowser, URL5),
  ]);

  newWindow.gTabsPanel.init();

  const button = newWindow.document.getElementById("alltabs-button");

  const allTabsView = newWindow.document.getElementById(
    "allTabsMenu-allTabsView"
  );
  const allTabsPopupShownPromise = BrowserTestUtils.waitForEvent(
    allTabsView,
    "ViewShown"
  );
  button.click();
  await allTabsPopupShownPromise;

  await func(newWindow);

  await BrowserTestUtils.closeWindow(newWindow);
}

add_task(async function test_reorder() {
  await testWithNewWindow(async function (newWindow) {
    Services.telemetry.clearScalars();

    const list = newWindow.document.getElementById(
      "allTabsMenu-allTabsView-tabs"
    );

    assertOrder(getOrderOfList(list), [0, 1, 2, 3, 4, 5], "before reorder");

    let rows;
    rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[3],
      rows[1],
      null,
      "move",
      newWindow,
      newWindow,
      { clientX: 0, clientY: 0 }
    );

    assertOrder(getOrderOfList(list), [0, 3, 1, 2, 4, 5], "after moving up");

    rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[1],
      rows[5],
      null,
      "move",
      newWindow,
      newWindow,
      { clientX: 0, clientY: 0 }
    );

    assertOrder(getOrderOfList(list), [0, 1, 2, 4, 3, 5], "after moving down");

    rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[4],
      rows[3],
      null,
      "move",
      newWindow,
      newWindow,
      { clientX: 0, clientY: 0 }
    );

    assertOrder(
      getOrderOfList(list),
      [0, 1, 2, 3, 4, 5],
      "after moving up again"
    );

    let scalars = TelemetryTestUtils.getProcessScalars("parent", false, true);
    TelemetryTestUtils.assertScalar(
      scalars,
      "browser.ui.interaction.all_tabs_panel_dragstart_tab_event_count",
      3
    );
  });
});

function tabOf(row) {
  return row.firstElementChild.tab;
}

add_task(async function test_move_to_tab_bar() {
  await testWithNewWindow(async function (newWindow) {
    Services.telemetry.clearScalars();

    const list = newWindow.document.getElementById(
      "allTabsMenu-allTabsView-tabs"
    );

    assertOrder(getOrderOfList(list), [0, 1, 2, 3, 4, 5], "before reorder");

    let rows;
    rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[3],
      tabOf(rows[1]),
      null,
      "move",
      newWindow,
      newWindow,
      { clientX: 0, clientY: 0 }
    );

    assertOrder(
      getOrderOfList(list),
      [0, 3, 1, 2, 4, 5],
      "after moving up with tab bar"
    );

    rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[1],
      tabOf(rows[4]),
      null,
      "move",
      newWindow,
      newWindow,
      { clientX: 0, clientY: 0 }
    );

    assertOrder(
      getOrderOfList(list),
      [0, 1, 2, 3, 4, 5],
      "after moving down with tab bar"
    );

    let scalars = TelemetryTestUtils.getProcessScalars("parent", false, true);
    TelemetryTestUtils.assertScalar(
      scalars,
      "browser.ui.interaction.all_tabs_panel_dragstart_tab_event_count",
      2
    );
  });
});

add_task(async function test_move_to_different_tab_bar() {
  const newWindow2 = await BrowserTestUtils.openNewBrowserWindow();

  await testWithNewWindow(async function (newWindow) {
    Services.telemetry.clearScalars();

    const list = newWindow.document.getElementById(
      "allTabsMenu-allTabsView-tabs"
    );

    assertOrder(
      getOrderOfList(list),
      [0, 1, 2, 3, 4, 5],
      "before reorder in newWindow"
    );
    assertOrder(
      getOrderOfTabs(newWindow2.gBrowser.tabs),
      [0],
      "before reorder in newWindow2"
    );

    let rows;
    rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[3],
      newWindow2.gBrowser.tabs[0],
      null,
      "move",
      newWindow,
      newWindow2,
      { clientX: 0, clientY: 0 }
    );

    assertOrder(
      getOrderOfList(list),
      [0, 1, 2, 4, 5],
      "after moving to other window in newWindow"
    );

    assertOrder(
      getOrderOfTabs(newWindow2.gBrowser.tabs),
      [3, 0],
      "after moving to other window in newWindow2"
    );

    let scalars = TelemetryTestUtils.getProcessScalars("parent", false, true);
    TelemetryTestUtils.assertScalar(
      scalars,
      "browser.ui.interaction.all_tabs_panel_dragstart_tab_event_count",
      1
    );
  });

  await BrowserTestUtils.closeWindow(newWindow2);
});

add_task(async function test_drag_and_drop_to_bookmark_toolbar() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.toolbars.bookmarks.visibility", "always"]],
  });

  await PlacesUtils.bookmarks.eraseEverything();
  registerCleanupFunction(async () => {
    await PlacesUtils.bookmarks.eraseEverything();
  });

  await testWithNewWindow(async function (newWindow) {
    is(
      await PlacesUtils.bookmarks.fetch({
        parentGuid: PlacesUtils.bookmarks.toolbarGuid,
        index: 0,
      }),
      null,
      "The bookmark toolbar shouldn't have any item"
    );

    const bookmarkToolbar =
      newWindow.document.getElementById("PlacesToolbarItems");

    // Wait if the bookmark toolbar initialization hasn't finished.
    await BrowserTestUtils.waitForMutationCondition(
      bookmarkToolbar,
      { attributes: true, childNodes: true, attributeFilter: ["collapsed"] },
      () => !bookmarkToolbar.collapsed && !bookmarkToolbar.childNodes.length
    );

    newWindow.gBrowser.removeTab(newWindow.gBrowser.selectedTab);

    const list = newWindow.document.getElementById(
      "allTabsMenu-allTabsView-tabs"
    );

    assertOrder(getOrderOfList(list), [1, 2, 3, 4, 5], "0-th tab is closed");

    is(
      toIndex(newWindow.gBrowser.selectedTab.linkedBrowser.currentURI.spec),
      1,
      "1th tab is active"
    );

    const { PlacesTestUtils } = ChromeUtils.importESModule(
      "resource://testing-common/PlacesTestUtils.sys.mjs"
    );

    const bookmarkPromise = PlacesTestUtils.waitForNotification(
      "bookmark-added",
      events => events.some(e => e.url == URL5)
    );

    // Drag and drop the 5st tab to the bookmark toolbar, while the active tab
    // is the 1th tab.
    const rows = list.querySelectorAll("toolbaritem");
    EventUtils.synthesizeDrop(
      rows[4],
      bookmarkToolbar,
      null,
      "move",
      newWindow,
      newWindow,
      { clientX: 0, clientY: 0 }
    );

    await bookmarkPromise;

    is(
      (
        await PlacesUtils.bookmarks.fetch({
          parentGuid: PlacesUtils.bookmarks.toolbarGuid,
          index: 0,
        })
      ).url.href,
      URL5,
      "5th tab should be bookmarked"
    );

    is(
      await PlacesUtils.bookmarks.fetch({
        parentGuid: PlacesUtils.bookmarks.toolbarGuid,
        index: 1,
      }),
      null,
      "No other tabs should be bookmarked"
    );
  });

  await SpecialPowers.popPrefEnv();
});
