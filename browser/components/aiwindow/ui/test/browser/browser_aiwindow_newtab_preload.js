/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { PromiseTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/PromiseTestUtils.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
});

add_task(async function test_preloaded_browser_removed_on_toggle() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
      ["browser.newtab.preload", true],
    ],
  });

  let win = await BrowserTestUtils.openNewBrowserWindow();

  NewTabPagePreloading.maybeCreatePreloadedBrowser(win);

  await TestUtils.waitForCondition(() => win.gBrowser.preloadedBrowser);
  const classicPreloadedBrowser = win.gBrowser.preloadedBrowser;

  Assert.ok(
    win.gBrowser.preloadedBrowser,
    "Classic window should have a preloaded New Tab page"
  );

  lazy.AIWindow.toggleAIWindow(win, true);

  Assert.notEqual(
    win.gBrowser.preloadedBrowser,
    classicPreloadedBrowser,
    "Preloaded New Tab page should be removed after toggling to AI Window"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_classic_to_ai_newtab_reloads() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
    ],
  });

  let win = await BrowserTestUtils.openNewBrowserWindow();

  let newTab = BrowserTestUtils.addTab(win.gBrowser, "about:newtab");
  let browser = newTab.linkedBrowser;
  await BrowserTestUtils.browserLoaded(browser, false, "about:newtab");

  Assert.equal(
    browser.currentURI.spec,
    "about:newtab",
    "Tab should initially load about:newtab"
  );

  lazy.AIWindow.toggleAIWindow(win, true);

  await BrowserTestUtils.browserLoaded(browser, false, url =>
    lazy.AIWindow.isAIWindowContentPage(Services.io.newURI(url))
  );

  Assert.ok(
    lazy.AIWindow.isAIWindowContentPage(browser.currentURI),
    "New tab should reload to AI Window New Tab after toggle"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});

add_task(async function test_ai_to_classic_newtab_reloads() {
  const AIWINDOW_URL = lazy.AIWindow.newTabURL;

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
      ["browser.smartwindow.enabled", true],
    ],
  });

  let win = await BrowserTestUtils.openNewBrowserWindow({ aiWindow: true });

  let aiTab = BrowserTestUtils.addTab(win.gBrowser, AIWINDOW_URL);
  let browser = aiTab.linkedBrowser;

  await BrowserTestUtils.browserLoaded(browser, false, url =>
    lazy.AIWindow.isAIWindowContentPage(Services.io.newURI(url))
  );

  Assert.ok(
    lazy.AIWindow.isAIWindowContentPage(browser.currentURI),
    "Tab should initially load AI Window URL"
  );

  lazy.AIWindow.toggleAIWindow(win, false);

  await BrowserTestUtils.browserLoaded(browser, false, "about:newtab");

  Assert.equal(
    browser.currentURI.spec,
    "about:newtab",
    "AI Window New Tab should reload to about:newtab after toggle to Classic mode"
  );

  await BrowserTestUtils.closeWindow(win);
  await SpecialPowers.popPrefEnv();
});
