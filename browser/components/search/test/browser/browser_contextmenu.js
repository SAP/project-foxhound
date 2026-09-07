/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * This test searches for selected text with the context menu using both the
 * default and default-private engines in both non-private and private windows.
 */

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

requestLongerTimeout(3);
AddonTestUtils.initMochitest(this);

const ENGINE_ITEM_ID = "context-searchselect";
const PRIVATE_ENGINE_ITEM_ID = "context-searchselect-private";

const ENGINE_NAME = "mozSearch";
const ENGINE_URL =
  "https://example.com/browser/browser/components/search/test/browser/mozsearch.sjs";

const PRIVATE_ENGINE_NAME = "mozPrivateSearch";
const PRIVATE_ENGINE_URL = "https://example.com/browser/";

const ENGINE_DATA = new Map([
  [ENGINE_NAME, ENGINE_URL],
  [PRIVATE_ENGINE_NAME, PRIVATE_ENGINE_URL],
]);

const TEST_PAGE_URL =
  "https://example.com/browser/browser/components/search/test/browser/test_search.html";

let engine;
let privateEngine;
let extensions = [];
let oldDefaultEngine;
let oldDefaultPrivateEngine;

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["test.wait300msAfterTabSwitch", true]],
  });

  await SearchService.init();

  for (let [name, search_url] of ENGINE_DATA) {
    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        chrome_settings_overrides: {
          search_provider: {
            name,
            search_url,
            search_url_get_params: "test={searchTerms}",
          },
        },
      },
    });

    await extension.startup();
    await AddonTestUtils.waitForSearchProviderStartup(extension);
    extensions.push(extension);
  }

  engine = await SearchService.getEngineByName(ENGINE_NAME);
  Assert.ok(engine, "Got a search engine");
  oldDefaultEngine = await SearchService.getDefault();
  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  privateEngine = await SearchService.getEngineByName(PRIVATE_ENGINE_NAME);
  Assert.ok(privateEngine, "Got a search engine");
  oldDefaultPrivateEngine = await SearchService.getDefaultPrivate();
});

/**
 * Selects some text in the current tab, opens the context menu, and checks the
 * given menuitem.
 *
 * @param {object} options
 *   Options object.
 * @param {Window} options.win
 *   The context menu will be opened in the current tab in this browser window.
 * @param {string} options.itemIdToCheck
 *   The menuitem element ID to check.
 * @param {boolean} options.expectedShown
 *   Whether the menuitem is expected to be visible.
 * @param {string} options.expectedLabel
 *   The expected label of the menuitem.
 * @returns {object}
 *   An object: `{ contextMenu, item }`
 */
async function checkContextMenu({
  win,
  itemIdToCheck,
  expectedShown,
  expectedLabel,
}) {
  let contextMenu = win.document.getElementById("contentAreaContextMenu");
  Assert.ok(contextMenu, "Got context menu XUL");

  let tab = win.gBrowser.selectedTab;

  await SpecialPowers.spawn(tab.linkedBrowser, [""], async function () {
    return new Promise(resolve => {
      content.document.addEventListener(
        "selectionchange",
        function () {
          resolve();
        },
        { once: true }
      );
      content.document.getSelection().selectAllChildren(content.document.body);
    });
  });

  let eventDetails = { type: "contextmenu", button: 2 };

  let popupPromise = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");

  info("Synthesizing context menu mouse event");
  BrowserTestUtils.synthesizeMouseAtCenter(
    "body",
    eventDetails,
    win.gBrowser.selectedBrowser
  );

  info("Waiting for context menu to open");
  await popupPromise;
  info("Context menu opened");

  let searchItem = win.document.getElementById(itemIdToCheck);
  Assert.ok(searchItem, "Got search context menu item");

  Assert.equal(
    !searchItem.hidden,
    expectedShown,
    "Search item should be shown or hidden as expected"
  );

  if (!searchItem.hidden) {
    Assert.equal(searchItem.label, expectedLabel, "Check context menu label");
    Assert.equal(
      searchItem.disabled,
      false,
      "Check that search context menu item is enabled"
    );
  }

  return { contextMenu, item: searchItem };
}

/**
 * Opens a new tab and calls `checkContextMenu()`. If the menuitem is expected
 * to be visible, then this function also clicks it and verifies that a SERP is
 * loaded, either in a new tab or in a new private window.
 *
 * @param {object} options
 *   Options object.
 * @param {Window} options.win
 *   The new tab and `checkContextMenu()` will be called on this window.
 * @param {string} options.itemIdToCheck
 *   The menuitem element ID to check.
 * @param {boolean} options.expectedShown
 *   Whether the menuitem is expected to be visible.
 * @param {string} options.expectedLabel
 *   The expected label of the menuitem.
 * @param {string} options.expectedBaseUrl
 *   The expected base URL of the SERP loaded by the menuitem.
 * @param {boolean} options.expectedOpensNewPrivateWindow
 *   Whether the SERP is expected to load in a new private window.
 */
async function checkContextMenuAndClickItem({
  win,
  itemIdToCheck,
  expectedShown,
  expectedLabel,
  expectedBaseUrl,
  expectedOpensNewPrivateWindow,
}) {
  await BrowserTestUtils.withNewTab(
    {
      gBrowser: win.gBrowser,
      url: TEST_PAGE_URL,
    },
    async () => {
      let { contextMenu, item } = await checkContextMenu({
        win,
        itemIdToCheck,
        expectedShown,
        expectedLabel,
      });

      if (item.hidden) {
        let hiddenPromise = BrowserTestUtils.waitForEvent(
          contextMenu,
          "popuphidden"
        );
        info("Closing context menu");
        contextMenu.hidePopup();
        info("Waiting for context menu to close");
        await hiddenPromise;
        info("Context menu closed");
        return;
      }

      let expectedUrl = expectedBaseUrl + "?test=test%2520search";
      let loadPromise = expectedOpensNewPrivateWindow
        ? BrowserTestUtils.waitForNewWindow({ url: expectedUrl })
        : BrowserTestUtils.waitForNewTab(win.gBrowser, expectedUrl, true);

      info("Clicking search item");
      contextMenu.activateItem(item);

      let message = expectedOpensNewPrivateWindow
        ? "Waiting for new SERP private window to load"
        : "Waiting for new SERP tab to load";
      info(`${message}: ${expectedUrl}`);
      let serpTabOrWin = await loadPromise;

      info("SERP loaded");
      let isSerpWin = serpTabOrWin instanceof Ci.nsIDOMWindow;
      let serpWin = isSerpWin ? serpTabOrWin : win;
      let browser = serpWin.gBrowser.selectedBrowser;
      await SpecialPowers.spawn(browser, [], async function () {
        Assert.ok(
          !/error/.test(content.document.body.innerHTML),
          "Ensure there were no errors loading the search page"
        );
      });

      if (isSerpWin) {
        await BrowserTestUtils.closeWindow(serpTabOrWin);
      } else {
        BrowserTestUtils.removeTab(serpTabOrWin);
      }
    }
  );
}

// The main test task. Runs through all possible combinations of the relevant
// variables.
add_task(async function test() {
  for (let separatePrivateDefault of [false, true]) {
    for (let separatePrivateDefaultUiEnabled of [false, true]) {
      for (let inPrivateWindow of [false, true]) {
        for (let checkPrivateItem of [false, true]) {
          for (let defaultPrivateEngine of [engine, privateEngine]) {
            await computeExpectedAndDoTest({
              separatePrivateDefault,
              separatePrivateDefaultUiEnabled,
              defaultPrivateEngine,
              inPrivateWindow,
              checkPrivateItem,
            });
          }
        }
      }
    }
  }
});

/**
 * Figures out the expected behavior based on some initial conditions and calls
 * `doTest()`.
 *
 * @param {object} options
 *   Options object.
 * @param {boolean} options.separatePrivateDefault
 *   The value to set for the `separatePrivateDefault` pref.
 * @param {boolean} options.separatePrivateDefaultUiEnabled
 *   The value to set for the `separatePrivateDefault.ui.enabled` pref.
 * @param {SearchEngine} options.defaultPrivateEngine
 *   The engine to set as the default private engine.
 * @param {boolean} options.inPrivateWindow
 *   Whether the test should start in a private window.
 * @param {boolean} options.checkPrivateItem
 *   Which menuitem to check. False means the non-private search menuitem, and
 *   true means the private search menuitem.
 */
async function computeExpectedAndDoTest({
  separatePrivateDefault,
  separatePrivateDefaultUiEnabled,
  defaultPrivateEngine,
  inPrivateWindow,
  checkPrivateItem,
}) {
  // When `separatePrivateDefault.ui.enabled` is false, `setDefaultPrivate()`
  // will set the non-private default, which would make this test more complex
  // and isn't the point anyway, so avoid that by just not setting the default
  // private engine in that case.
  if (!separatePrivateDefaultUiEnabled) {
    defaultPrivateEngine = null;
  }

  let expectedShown =
    !checkPrivateItem || (!inPrivateWindow && separatePrivateDefaultUiEnabled);

  let expectedLabel;
  let expectedBaseUrl;
  let expectedOpensNewPrivateWindow;
  if (expectedShown) {
    let shouldUsePrivateEngine =
      defaultPrivateEngine && defaultPrivateEngine != engine;

    if (checkPrivateItem) {
      expectedLabel =
        !inPrivateWindow && shouldUsePrivateEngine
          ? "Search with " + PRIVATE_ENGINE_NAME + " in a Private Window"
          : "Search in a Private Window";
      expectedOpensNewPrivateWindow = !inPrivateWindow;
    } else {
      shouldUsePrivateEngine &&= inPrivateWindow;
      let expectedName = shouldUsePrivateEngine
        ? PRIVATE_ENGINE_NAME
        : ENGINE_NAME;
      expectedLabel =
        "Search " + expectedName + " for \u201ctest%20search\u201d";
      expectedOpensNewPrivateWindow = false;
    }

    expectedBaseUrl = shouldUsePrivateEngine ? PRIVATE_ENGINE_URL : ENGINE_URL;
  }

  let itemIdToCheck = checkPrivateItem
    ? PRIVATE_ENGINE_ITEM_ID
    : ENGINE_ITEM_ID;

  await doTest({
    separatePrivateDefault,
    separatePrivateDefaultUiEnabled,
    defaultPrivateEngine,
    inPrivateWindow,
    itemIdToCheck,
    expectedShown,
    expectedLabel,
    expectedBaseUrl,
    expectedOpensNewPrivateWindow,
  });
}

/**
 * Does one test: Sets prefs to the requested values, sets a default private
 * engine, opens a private window to run the test in if requested, and checks
 * and clicks the given context menu item.
 *
 * @param {object} options
 *   Options object.
 * @param {boolean} options.separatePrivateDefault
 *   The value to set for the `separatePrivateDefault` pref.
 * @param {boolean} options.separatePrivateDefaultUiEnabled
 *   The value to set for the `separatePrivateDefault.ui.enabled` pref.
 * @param {SearchEngine} options.defaultPrivateEngine
 *   The engine to set as the default private engine.
 * @param {boolean} options.inPrivateWindow
 *   Whether the test should start in a private window.
 * @param {string} options.itemIdToCheck
 *   The menuitem element ID to check.
 * @param {boolean} options.expectedShown
 *   Whether the menuitem is expected to be visible.
 * @param {string} options.expectedLabel
 *   The expected label of the menuitem.
 * @param {string} options.expectedBaseUrl
 *   The expected base URL of the SERP loaded by the menuitem.
 * @param {boolean} options.expectedOpensNewPrivateWindow
 *   Whether the SERP is expected to load in a new private window.
 */
async function doTest({
  separatePrivateDefault,
  separatePrivateDefaultUiEnabled,
  defaultPrivateEngine,
  inPrivateWindow,
  itemIdToCheck,
  expectedShown,
  expectedLabel,
  expectedBaseUrl,
  expectedOpensNewPrivateWindow,
}) {
  info(
    "Doing test: " +
      JSON.stringify(
        {
          separatePrivateDefault,
          separatePrivateDefaultUiEnabled,
          defaultPrivateEngine: defaultPrivateEngine?.name,
          inPrivateWindow,
          itemIdToCheck,
          expectedShown,
          expectedLabel,
          expectedBaseUrl,
          expectedOpensNewPrivateWindow,
        },
        null,
        2
      )
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.separatePrivateDefault", separatePrivateDefault],
      [
        "browser.search.separatePrivateDefault.ui.enabled",
        separatePrivateDefaultUiEnabled,
      ],
    ],
  });

  if (defaultPrivateEngine) {
    await SearchService.setDefaultPrivate(
      defaultPrivateEngine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
  }

  let win = inPrivateWindow
    ? await BrowserTestUtils.openNewBrowserWindow({ private: true })
    : window;

  await checkContextMenuAndClickItem({
    win,
    itemIdToCheck,
    expectedShown,
    expectedLabel,
    expectedBaseUrl,
    expectedOpensNewPrivateWindow,
  });

  if (inPrivateWindow) {
    await BrowserTestUtils.closeWindow(win);
  }

  await SpecialPowers.popPrefEnv();
}

// We can't do the unload within registerCleanupFunction as that's too late for
// the test to be happy. Do it into a cleanup "test" here instead.
add_task(async function cleanup() {
  await SearchService.setDefault(
    oldDefaultEngine,
    SearchService.CHANGE_REASON.UNKNOWN
  );
  await SearchService.setDefaultPrivate(
    oldDefaultPrivateEngine,
    SearchService.CHANGE_REASON.UNKNOWN
  );
  await SearchService.removeEngine(engine);
  await SearchService.removeEngine(privateEngine);

  for (let extension of extensions) {
    await extension.unload();
  }
});
