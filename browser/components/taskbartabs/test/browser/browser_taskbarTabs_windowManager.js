/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  sinon: "resource://testing-common/Sinon.sys.mjs",
  TaskbarTabs: "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
});

XPCOMUtils.defineLazyServiceGetters(this, {
  WinTaskbar: ["@mozilla.org/windows-taskbar;1", Ci.nsIWinTaskbar],
});

const registry = new TaskbarTabsRegistry();

const url1 = Services.io.newURI("https://example.com");
const userContextId1 = 0;
const taskbarTab1 = createTaskbarTab(registry, url1, userContextId1);
const id1 = taskbarTab1.id;

const url2 = Services.io.newURI("https://subdomain.example.com");
const userContextId2 = 1;
const taskbarTab2 = createTaskbarTab(registry, url2, userContextId2);
const id2 = taskbarTab2.id;

add_task(async function test_count_for_id() {
  const wm = new TaskbarTabsWindowManager();
  let testWindowCount = (aCount1, aCount2) => {
    is(
      wm.getCountForId(id1),
      aCount1,
      `${aCount1} Taskbar Tab window(s) should exist for id ${id1}`
    );
    is(
      wm.getCountForId(id2),
      aCount2,
      `${aCount2} Taskbar Tab window(s) should exist for id ${id2}`
    );
  };

  testWindowCount(0, 0);

  let windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.openWindow(taskbarTab1);
  let win1_to_eject = await windowPromise;

  testWindowCount(1, 0);

  windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.openWindow(taskbarTab1);
  let win2 = await windowPromise;

  testWindowCount(2, 0);

  windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.openWindow(taskbarTab2);
  let win3_to_eject = await windowPromise;

  testWindowCount(2, 1);

  let tab1_adopted = await BrowserTestUtils.addTab(window.gBrowser, url1.spec);
  windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.replaceTabWithWindow(taskbarTab1, tab1_adopted);
  let win4 = await windowPromise;

  testWindowCount(3, 1);

  let tabOpenPromise = BrowserTestUtils.waitForEvent(
    window.gBrowser.tabContainer,
    "TabOpen"
  );
  await wm.ejectWindow(win1_to_eject);
  let tab2 = (await tabOpenPromise).target;

  testWindowCount(2, 1);

  tabOpenPromise = BrowserTestUtils.waitForEvent(
    window.gBrowser.tabContainer,
    "TabOpen"
  );
  await wm.ejectWindow(win3_to_eject);
  let tab3 = (await tabOpenPromise).target;

  testWindowCount(2, 0);

  BrowserTestUtils.removeTab(tab2);
  BrowserTestUtils.removeTab(tab3);
  await Promise.all([
    BrowserTestUtils.closeWindow(win2),
    BrowserTestUtils.closeWindow(win4),
  ]);
});

add_task(async function test_user_context_id() {
  function checkUserContextId(win, taskbarTab) {
    is(
      win.gBrowser.selectedTab.userContextId,
      taskbarTab.userContextId,
      "Tab's userContextId should match that for the Taskbar Tab."
    );
  }

  const wm = new TaskbarTabsWindowManager();

  let testForTaskbarTab = async taskbarTab => {
    let windowPromise = BrowserTestUtils.waitForNewWindow();
    await wm.openWindow(taskbarTab);
    let win = await windowPromise;
    checkUserContextId(win, taskbarTab);

    const tabOpenPromise = BrowserTestUtils.waitForEvent(
      window.gBrowser.tabContainer,
      "TabOpen"
    );
    await wm.ejectWindow(win);
    let tab = (await tabOpenPromise).target;
    win = tab.ownerGlobal;
    checkUserContextId(win, taskbarTab);

    windowPromise = BrowserTestUtils.waitForNewWindow();
    await wm.replaceTabWithWindow(taskbarTab, tab);
    win = await windowPromise;
    checkUserContextId(win, taskbarTab);

    await BrowserTestUtils.closeWindow(win);
  };

  await testForTaskbarTab(taskbarTab1);
  await testForTaskbarTab(taskbarTab2);
});

add_task(async function test_eject_window_selected_tab() {
  const wm = new TaskbarTabsWindowManager();

  let windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.openWindow(taskbarTab1);
  let win = await windowPromise;

  const tabOpenPromise = BrowserTestUtils.waitForEvent(
    window.gBrowser.tabContainer,
    "TabOpen"
  );
  await wm.ejectWindow(win);
  let tab = (await tabOpenPromise).target;

  is(
    tab,
    window.gBrowser.selectedTab,
    "The ejected Taskbar Tab should be the selected tab."
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_window_aumid() {
  const wm = new TaskbarTabsWindowManager();

  let windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.openWindow(taskbarTab1);
  let winOpen = await windowPromise;

  is(
    TaskbarTabsUtils.getTaskbarTabIdFromWindow(winOpen),
    taskbarTab1.id,
    "The window's `tasbkartab` attribute should match the Taskbar Tab ID when opened."
  );
  is(
    WinTaskbar.getGroupIdForWindow(winOpen),
    taskbarTab1.id,
    "The window AUMID should match the Taskbar Tab ID when opened."
  );

  let tab1_adopted = await BrowserTestUtils.addTab(window.gBrowser, url1.spec);
  windowPromise = BrowserTestUtils.waitForNewWindow();
  await wm.replaceTabWithWindow(taskbarTab1, tab1_adopted);
  let winReplace = await windowPromise;

  is(
    TaskbarTabsUtils.getTaskbarTabIdFromWindow(winReplace),
    taskbarTab1.id,
    "The window's `tasbkartab` attribute should match the Taskbar Tab ID when a tab was replaced with a Tasbkar Tab window."
  );
  is(
    WinTaskbar.getGroupIdForWindow(winReplace),
    taskbarTab1.id,
    "The window AUMID should match the Taskbar Tab ID when a tab was replaced with a Tasbkar Tab window."
  );

  await Promise.all([
    BrowserTestUtils.closeWindow(winOpen),
    BrowserTestUtils.closeWindow(winReplace),
  ]);
});

add_task(async function testTaskbarTabCount() {
  const count = () => TaskbarTabs.getCountForId(taskbarTab1.id);

  is(await count(), 0, "window count starts at 0");

  const window1 = await TaskbarTabs.openWindow(taskbarTab1);
  is(await count(), 1, "window count increases on first open");

  const window2 = await TaskbarTabs.openWindow(taskbarTab1);
  is(await count(), 2, "window count increases on second open");

  await BrowserTestUtils.closeWindow(window1);
  is(await count(), 1, "window count decreases on first close");

  const addedTab = BrowserTestUtils.addTab(gBrowser, url1.spec);
  const window3 = await TaskbarTabs.replaceTabWithWindow(taskbarTab1, addedTab);
  is(await count(), 2, "window count increases on replace");

  await TaskbarTabs.ejectWindow(window2);
  await BrowserTestUtils.windowClosed(window2);
  is(await count(), 1, "window count decreases on ejection");

  await BrowserTestUtils.closeWindow(window3);
  is(await count(), 0, "window count decreases on final close");

  const ejected = gBrowser.tabs[gBrowser.tabs.length - 1];
  const promise = BrowserTestUtils.waitForTabClosing(ejected);
  gBrowser.removeTab(ejected);
  await promise;

  TaskbarTabs.removeTaskbarTab(taskbarTab1.id);
});

add_task(async function testWindowIconSet() {
  const wm = new TaskbarTabsWindowManager();

  let mockWindowsUIUtils = {
    QueryInterface: ChromeUtils.generateQI(["nsIWindowsUIUtils"]),
    setWindowIcon: sinon.spy(),
  };
  wm.testOnlyMockUIUtils(mockWindowsUIUtils);

  async function check(win, cause) {
    Assert.equal(
      mockWindowsUIUtils.setWindowIcon.callCount,
      1,
      `${cause} set the window icon once`
    );
    Assert.equal(
      mockWindowsUIUtils.setWindowIcon.firstCall.args[0],
      win,
      `${cause} passed the correct window`
    );
    Assert.equal(
      mockWindowsUIUtils.setWindowIcon.firstCall.args[1],
      img,
      `${cause} passed the correct large icon`
    );
    Assert.equal(
      mockWindowsUIUtils.setWindowIcon.firstCall.args[2],
      img,
      `${cause} passed the correct small icon`
    );

    // `sinon.spy` will hold a reference to the window by virtue of holding its
    // arguments, causing tests to fail from a "leaked" window. Release it before
    // closing the window.
    sinon.resetHistory();
    await BrowserTestUtils.closeWindow(win);
  }

  let img = await TaskbarTabsUtils._imageFromLocalURI(
    Services.io.newURI(
      "chrome://mochitests/content/browser/browser/components/taskbartabs/test/browser/favicon-normal16.png"
    )
  );

  let win = await wm.openWindow(taskbarTab1, img);
  await check(win, "openWindow (explicit)");

  let tab = BrowserTestUtils.addTab(window.gBrowser, url1.spec);
  win = await wm.replaceTabWithWindow(taskbarTab1, tab, img);
  await check(win, "replaceTabWithWindow (explicit)");

  wm.testOnlyMockUIUtils(null);
});

add_task(async function test_taskbarTab_persistence() {
  const wm = new TaskbarTabsWindowManager();

  // 1. Open first window
  info("Opening first taskbar tab window");
  let win1 = await wm.openWindow(taskbarTab1);

  // Verify ID is set
  is(
    win1.document.documentElement.id,
    "taskbartab-" + taskbarTab1.id,
    "Window ID should be set to taskbar tab ID 1"
  );

  // 2. Move first window
  let originalX1 = win1.screenX;
  let originalY1 = win1.screenY;

  let newX1 = originalX1 + 50;
  let newY1 = originalY1 + 50;

  info(
    `Moving window 1 from ${originalX1},${originalY1} to ${newX1}, ${newY1}`
  );
  win1.moveTo(newX1, newY1);

  await BrowserTestUtils.waitForCondition(
    () => win1.screenX == newX1 && win1.screenY == newY1,
    `Waiting for window 1 to move to ${newX1}, ${newY1}`
  );

  // Verify it moved
  is(win1.screenX, newX1, "Window 1 moved to new X");
  is(win1.screenY, newY1, "Window 1 moved to new Y");

  // 3. Close first window
  info("Closing first window");
  await BrowserTestUtils.closeWindow(win1);
  info("First window closed");

  // 4. Open second window with DIFFERENT ID
  info("Opening second taskbar tab window");
  let win2 = await wm.openWindow(taskbarTab2);

  // Verify ID is set
  is(
    win2.document.documentElement.id,
    "taskbartab-" + taskbarTab2.id,
    "Window ID should be set to taskbar tab ID 2"
  );

  // 5. Move second window to a DIFFERENT position
  let originalX2 = win2.screenX;
  let originalY2 = win2.screenY;

  let newX2 = originalX1 + 100;
  let newY2 = originalY1 + 100;

  info(
    `Moving window 2 from ${originalX2},${originalY2} to ${newX2}, ${newY2}`
  );
  win2.moveTo(newX2, newY2);

  // Wait for move to settle and persist
  await BrowserTestUtils.waitForCondition(
    () => win2.screenX == newX2 && win2.screenY == newY2,
    `Waiting for window 2 to move to ${newX2}, ${newY2}`
  );

  // Verify it moved
  is(win2.screenX, newX2, "Window 2 moved to new X");
  is(win2.screenY, newY2, "Window 2 moved to new Y");

  // 6. Open first window AGAIN (while second is still open)
  info("Opening first taskbar tab window AGAIN");
  win1 = await wm.openWindow(taskbarTab1);

  // 7. Verify position of first window matches its SAVED position (newX1, newY1)
  info(`Restored window 1 position: ${win1.screenX}, ${win1.screenY}`);

  is(
    win1.screenX,
    newX1,
    "Window 1 screenX should be restored to its own saved position"
  );
  is(
    win1.screenY,
    newY1,
    "Window 1 screenY should be restored to its own saved position"
  );

  isnot(win1.screenX, newX2, "Window 1 should NOT have Window 2's X position");
  isnot(win1.screenY, newY2, "Window 1 should NOT have Window 2's Y position");

  await Promise.all([
    BrowserTestUtils.closeWindow(win1),
    BrowserTestUtils.closeWindow(win2),
  ]);
});
