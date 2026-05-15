/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  TaskbarTabs: "resource:///modules/taskbartabs/TaskbarTabs.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
});

const registry = new TaskbarTabsRegistry();

const url1 = Services.io.newURI("https://example.com");
const userContextId1 = 0;
const taskbarTab1 = createTaskbarTab(registry, url1, userContextId1);
const id1 = taskbarTab1.id;

const checkMedia = (aBrowser, aMode) =>
  SpecialPowers.spawn(aBrowser, [aMode], mode => {
    return content.matchMedia(`(display-mode: ${mode})`).matches;
  });

add_task(async function test_display_mode_changes_existing_tab() {
  let browser;

  const addedTab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    url1.spec
  );
  browser = gBrowser.getBrowserForTab(addedTab);
  ok(await checkMedia(browser, "browser"), "Should start as a normal browser");

  const win = await TaskbarTabs.replaceTabWithWindow(taskbarTab1, addedTab);
  browser = win.gBrowser.browsers[0];
  ok(await checkMedia(browser, "minimal-ui"), "Should become minimal-ui");

  await TaskbarTabs.ejectWindow(win);
  const ejected = gBrowser.tabs[gBrowser.tabs.length - 1];
  browser = gBrowser.getBrowserForTab(ejected);
  ok(await checkMedia(browser, "browser"), "Should eject to a normal browser");

  const promise = BrowserTestUtils.waitForTabClosing(ejected);
  gBrowser.removeTab(ejected);
  await promise;
});

add_task(async function test_display_mode_on_new_window() {
  let browser;

  const win = await TaskbarTabs.openWindow(taskbarTab1);
  await BrowserTestUtils.firstBrowserLoaded(win);
  browser = win.gBrowser.browsers[0];
  ok(await checkMedia(browser, "minimal-ui"), "Should become minimal-ui");

  await TaskbarTabs.ejectWindow(win);
  const ejected = gBrowser.tabs[gBrowser.tabs.length - 1];
  browser = gBrowser.getBrowserForTab(ejected);
  ok(await checkMedia(browser, "browser"), "Should eject to a normal browser");

  const promise = BrowserTestUtils.waitForTabClosing(ejected);
  gBrowser.removeTab(ejected);
  await promise;
});
