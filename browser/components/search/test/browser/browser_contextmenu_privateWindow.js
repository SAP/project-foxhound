/* Any copyright is dedicated to the Public Domain.
 *  * http://creativecommons.org/publicdomain/zero/1.0/ */
/*
 * Test that shift-clicking the context search item in a private window opens
 * the search in a new private window.
 */

const ENGINE_NAME = "mozSearch";
const ENGINE_URL =
  "https://example.com/browser/browser/components/search/test/browser/mozsearch.sjs";

add_setup(async function () {
  await SearchTestUtils.installSearchExtension(
    {
      name: ENGINE_NAME,
      search_url: ENGINE_URL,
      search_url_get_params: "test={searchTerms}",
    },
    { setAsDefault: true }
  );
});

add_task(async function test_privateWindow_shiftClick_opensPrivateWindow() {
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });

  let tab = await BrowserTestUtils.openNewForegroundTab(
    privateWin.gBrowser,
    "https://example.com/browser/browser/components/search/test/browser/test_search.html"
  );

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
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

  let contextMenu = privateWin.document.getElementById(
    "contentAreaContextMenu"
  );
  let popupPromise = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  BrowserTestUtils.synthesizeMouseAtCenter(
    "body",
    { type: "contextmenu", button: 2 },
    privateWin.gBrowser.selectedBrowser
  );
  await popupPromise;

  let searchItem = contextMenu.querySelector("#context-searchselect");
  Assert.ok(!searchItem.hidden, "Search context menu item is visible");

  let newWinPromise = BrowserTestUtils.waitForNewWindow({
    url: ENGINE_URL + "?test=test%2520search",
  });

  contextMenu.activateItem(searchItem, { shiftKey: true });

  let newWin = await newWinPromise;

  Assert.ok(
    PrivateBrowsingUtils.isWindowPrivate(newWin),
    "New window opened by shift-click from a private window should also be private"
  );

  await BrowserTestUtils.closeWindow(newWin);
  await BrowserTestUtils.closeWindow(privateWin);
});
