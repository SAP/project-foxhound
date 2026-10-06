/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that right-clicking on a view-source page that displays an error page
// shows exactly the same context menu items as right-clicking on the same
// error page without the view-source: prefix.

async function openErrorPage(url) {
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank",
    true
  );
  let browser = tab.linkedBrowser;

  let loaded = BrowserTestUtils.browserLoaded(browser, false, null, true);
  BrowserTestUtils.startLoadingURIString(browser, url);
  await loaded;

  // Ensure the document has had a chance to paint before we interact with it.
  await SpecialPowers.spawn(browser.browsingContext, [], async () => {
    await new Promise(resolve => content.requestAnimationFrame(resolve));
  });

  return tab;
}

function getVisibleItemIds(contextMenu) {
  let ids = [];
  for (let item of contextMenu.children) {
    if (!item.hidden) {
      ids.push(item.id || item.nodeName);
    }
  }
  return ids;
}

async function getContextMenuItems(tab) {
  const browser = tab.linkedBrowser;
  const contextMenu = document.getElementById("contentAreaContextMenu");

  const popupShown = BrowserTestUtils.waitForEvent(contextMenu, "popupshown");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    "body",
    { type: "contextmenu", button: 2 },
    browser
  );
  await popupShown;

  const items = getVisibleItemIds(contextMenu);

  const popupHidden = BrowserTestUtils.waitForEvent(contextMenu, "popuphidden");
  contextMenu.hidePopup();
  await popupHidden;

  return items;
}

add_task(async function test_viewsource_certerror_contextmenu() {
  const url = "https://expired.example.com/";

  let plainTab = await openErrorPage(url);
  let plainItems = await getContextMenuItems(plainTab);
  BrowserTestUtils.removeTab(plainTab);

  let viewSourceTab = await openErrorPage("view-source:" + url);
  let viewSourceItems = await getContextMenuItems(viewSourceTab);
  BrowserTestUtils.removeTab(viewSourceTab);

  Assert.deepEqual(
    viewSourceItems,
    plainItems,
    "Context menu items on view-source error page match those on the plain error page"
  );
});
