/**
 * Tests that a popup window in private browsing window opens
 * new tab links in the original private browsing window as
 * new tabs.
 *
 * This is a regression test for bug 1202634.
 */

const PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);
const POPUP_LINK = PATH + "file_newtab_from_popup.html";
const WINDOW_SOURCE = PATH + "file_newtab_from_popup_source.html";

add_task(async function test_private_popup_window_opens_private_tabs() {
  let privWin = await BrowserTestUtils.openNewBrowserWindow({ private: true });

  // Sanity check - this browser better be private.
  ok(
    PrivateBrowsingUtils.isWindowPrivate(privWin),
    "Opened a private browsing window."
  );

  // First, open a private browsing window, and load our
  // testing page.
  let privBrowser = privWin.gBrowser.selectedBrowser;
  BrowserTestUtils.startLoadingURIString(privBrowser, WINDOW_SOURCE);
  await BrowserTestUtils.browserLoaded(privBrowser);

  // Next, click on the link in the testing page, and ensure
  // that a private popup window is opened.
  let openedPromise = BrowserTestUtils.waitForNewWindow({ url: POPUP_LINK });

  await BrowserTestUtils.synthesizeMouseAtCenter("#first", {}, privBrowser);
  let popupWin = await openedPromise;
  ok(
    PrivateBrowsingUtils.isWindowPrivate(popupWin),
    "Popup window was private."
  );

  // Now click on the link in the popup, and ensure that a new
  // tab is opened in the original private browsing window.
  let newTabPromise = BrowserTestUtils.waitForNewTab(privWin.gBrowser);
  let popupBrowser = popupWin.gBrowser.selectedBrowser;
  await BrowserTestUtils.synthesizeMouseAtCenter("#second", {}, popupBrowser);
  let newPrivTab = await newTabPromise;

  // Ensure that the newly created tab's browser is private.
  ok(
    PrivateBrowsingUtils.isBrowserPrivate(newPrivTab.linkedBrowser),
    "Newly opened tab should be private."
  );

  // Clean up
  BrowserTestUtils.removeTab(newPrivTab);
  await BrowserTestUtils.closeWindow(popupWin);
  await BrowserTestUtils.closeWindow(privWin);
});
