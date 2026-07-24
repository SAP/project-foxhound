/* Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

ChromeUtils.defineESModuleGetters(this, {
  URILoadingHelper: "resource:///modules/URILoadingHelper.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
});

const URL_TO_LOAD = "https://example.com/";

async function openChromelessAndWaitForLoad(url, params = {}) {
  const winP = BrowserTestUtils.waitForNewWindow();
  URILoadingHelper.openLinkIn(window, url, "chromeless", {
    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
    ...params,
  });
  const win = await winP;
  // Wait for browser chrome to initialize
  if (win.delayedStartupPromise) {
    await win.delayedStartupPromise;
  }
  await BrowserTestUtils.browserLoaded(
    win.gBrowser.selectedBrowser,
    false,
    url
  );
  return win;
}

add_task(async function opens_new_browser_window_and_loads_url() {
  const win = await openChromelessAndWaitForLoad(URL_TO_LOAD);
  Assert.equal(
    win.gBrowser.selectedBrowser.currentURI.spec,
    URL_TO_LOAD,
    "Chromeless window loaded the requested URL"
  );
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function respects_private_flag() {
  const win = await openChromelessAndWaitForLoad(URL_TO_LOAD, {
    private: true,
  });
  Assert.ok(
    PrivateBrowsingUtils.isWindowPrivate(win),
    "Window opened as private"
  );
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function opens_a_new_window_not_reusing_existing_window() {
  const before = BrowserWindowTracker.orderedWindows.length;
  const win = await openChromelessAndWaitForLoad(URL_TO_LOAD);
  const after = BrowserWindowTracker.orderedWindows.length;
  Assert.greater(after, before, "Opened a new browser window for chromeless");
  await BrowserTestUtils.closeWindow(win);
});

add_task(async function browser_chrome_is_hidden() {
  function chomeElementIsHidden(win, el) {
    const rect = el.getBoundingClientRect();
    return el.collapsed || rect.width <= 0;
  }

  const win = await openChromelessAndWaitForLoad(URL_TO_LOAD);

  const doc = win.document;
  const navBar = doc.getElementById("nav-bar");
  const tabsToolbar = doc.getElementById("TabsToolbar");
  const urlbar = doc.getElementById("urlbar-container");

  Assert.ok(
    chomeElementIsHidden(win, navBar),
    "Navigation toolbar is not visible in chromeless window"
  );
  Assert.ok(
    chomeElementIsHidden(win, tabsToolbar),
    "Tabs toolbar is not visible in chromeless window"
  );
  Assert.ok(
    chomeElementIsHidden(win, urlbar),
    "URLbar is not visible in chromeless window"
  );

  await BrowserTestUtils.closeWindow(win);
});
