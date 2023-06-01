/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const { _LastSession } = ChromeUtils.importESModule(
  "resource:///modules/sessionstore/SessionStore.sys.mjs"
);
const { sinon } = ChromeUtils.import("resource://testing-common/Sinon.jsm");

const state = {
  windows: [
    {
      tabs: [
        {
          entries: [
            {
              url: "https://example.org/",
              triggeringPrincipal_base64,
            },
          ],
        },
      ],
      selected: 2,
    },
  ],
};

/**
 * This is regrettable, but when `promiseBrowserState` resolves, we're still
 * midway through loading the tabs. To avoid race conditions in URLs for tabs
 * being available, wait for all the loads to finish:
 */
function promiseSessionStoreLoads(numberOfLoads) {
  let loadsSeen = 0;
  return new Promise(resolve => {
    Services.obs.addObserver(function obs(browser) {
      loadsSeen++;
      if (loadsSeen == numberOfLoads) {
        resolve();
      }
      // The typeof check is here to avoid one test messing with everything else by
      // keeping the observer indefinitely.
      if (typeof info == "undefined" || loadsSeen >= numberOfLoads) {
        Services.obs.removeObserver(obs, "sessionstore-debug-tab-restored");
      }
      info("Saw load for " + browser.currentURI.spec);
    }, "sessionstore-debug-tab-restored");
  });
}

add_task(async function test_firefox_view_selected_tab() {
  let fxViewBtn = document.getElementById("firefox-view-button");
  ok(fxViewBtn, "Got the Firefox View button");
  fxViewBtn.click();

  await BrowserTestUtils.browserLoaded(
    window.FirefoxViewHandler.tab.linkedBrowser
  );

  let allTabsRestored = promiseSessionStoreLoads(1);

  _LastSession.setState(state);

  is(gBrowser.tabs.length, 2, "Number of tabs is 2");

  ss.restoreLastSession();

  await allTabsRestored;

  ok(
    window.FirefoxViewHandler.tab.selected,
    "The Firefox View tab is selected and the browser window did not close"
  );
  is(gBrowser.tabs.length, 3, "Number of tabs is 3");

  gBrowser.removeTab(window.FirefoxViewHandler.tab);
  gBrowser.removeTab(gBrowser.selectedTab);
});

add_task(async function test_firefox_view_previously_selected() {
  let fxViewBtn = document.getElementById("firefox-view-button");
  ok(fxViewBtn, "Got the Firefox View button");
  fxViewBtn.click();

  await BrowserTestUtils.browserLoaded(
    window.FirefoxViewHandler.tab.linkedBrowser
  );

  let tab = gBrowser.tabs[1];
  gBrowser.selectedTab = tab;

  let allTabsRestored = promiseSessionStoreLoads(1);

  _LastSession.setState(state);

  is(gBrowser.tabs.length, 2, "Number of tabs is 2");

  ss.restoreLastSession();

  await allTabsRestored;

  ok(
    window.FirefoxViewHandler.tab.selected,
    "The Firefox View tab is selected and the browser window did not close"
  );
  is(gBrowser.tabs.length, 3, "Number of tabs is 3");

  gBrowser.removeTab(window.FirefoxViewHandler.tab);
  gBrowser.removeTab(gBrowser.selectedTab);
});
