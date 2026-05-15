/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

Services.scriptloader.loadSubScript(
  "chrome://mochikit/content/tests/SimpleTest/paint_listener.js",
  this
);

Services.scriptloader.loadSubScript(
  new URL("apz_test_utils.js", gTestPath).href,
  this
);

Services.scriptloader.loadSubScript(
  new URL("apz_test_native_event_utils.js", gTestPath).href,
  this
);

/* import-globals-from helper_browser_test_utils.js */
// For openSelectPopup.
Services.scriptloader.loadSubScript(
  new URL("helper_browser_test_utils.js", gTestPath).href,
  this
);

// Cleanup for paint_listener.js.
add_task(() => {
  registerCleanupFunction(() => {
    delete window.waitForAllPaintsFlushed;
    delete window.waitForAllPaints;
    delete window.promiseAllPaintsDone;
  });
});

// Setup preferences.
add_task(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["apz.popups.enabled", true],
      ["apz.popups_without_remote.enabled", true],
    ],
  });
});

async function twoRafsInContent(browser) {
  await SpecialPowers.spawn(browser, [], async function () {
    await new Promise(r =>
      content.requestAnimationFrame(() => content.requestAnimationFrame(r))
    );
  });
}

async function runTest(aTestFile) {
  // To test this scenario we need to create a content document (so that
  // isTopLevelContentDocShell and it can zoom) but that lives in the parent
  // process. This is not done very often in tests, but is used by for example
  // about:preferences. To do that we load about:blank and use
  // forceNotRemote: true to put it in the parent process and then
  // triggeringPrincipal: nullPrincipal to make sure it doesn't gain chrome
  // privileges. We then get that tab to navigate itself to a chrome uri so
  // that it stays in that same process but it doesn't gain chrome privileges.
  const nullPrincipal = Services.scriptSecurityManager.createNullPrincipal({});
  const tab = gBrowser.addTab("about:blank", {
    forceNotRemote: true,
    triggeringPrincipal: nullPrincipal,
  });
  gBrowser.selectedTab = tab;
  const browser = tab.linkedBrowser;

  // Can't wait for about:blank to load, so do this to make sure everything is
  // settled and ready.
  await TestUtils.waitForCondition(() => browser.isConnected);
  await promiseApzFlushedRepaints();
  await waitUntilApzStable();

  let loaded = BrowserTestUtils.browserLoaded(browser);
  const url_of_test_file = getRootDirectory(gTestPath) + aTestFile;
  BrowserTestUtils.startLoadingURIString(browser, url_of_test_file);

  await loaded;

  // Make sure the document gets loaded in the parent process and is a top
  // level content document.
  await SpecialPowers.spawn(tab.linkedBrowser, [], () => {
    Assert.ok(SpecialPowers.isMainProcess());
    Assert.ok(SpecialPowers.wrap(content).docShell.isTopLevelContentDocShell);
  });

  await promiseApzFlushedRepaints();
  await waitUntilApzStable();

  let contentWin = browser.contentWindow;

  // Create a popup menu that is inside a transform dynamically and set
  // `position:fixed` on the menu.
  const adiv = contentWin.document.createElement("div");
  adiv.style.transform = "translateX(1px)";
  contentWin.document.body.appendChild(adiv);
  const popupset = contentWin.document.createXULElement("popupset");
  adiv.appendChild(popupset);
  const popup = contentWin.document.createXULElement("menupopup");
  popup.style.position = "fixed";
  popup.style.background = "blue";
  popup.setAttribute("noautohide", true);

  const scroller = contentWin.document.createElement("div");
  scroller.style =
    "width: 100px; height: 100px; overflow: auto; background-color: white;";
  popup.appendChild(scroller);
  const spacer = contentWin.document.createElement("div");
  spacer.style = "width: 200px; height: 200px; background-color: green;";
  scroller.appendChild(spacer);
  popupset.appendChild(popup);

  // Open the popup.
  const popupshownPromise = new Promise(resolve => {
    popup.addEventListener("popupshown", resolve());
  });
  popup.openPopupAtScreen(
    contentWin.mozInnerScreenX,
    contentWin.mozInnerScreenY,
    true
  );
  await popupshownPromise;

  // Make sure APZ is ready for the popup.
  await ensureApzReadyForPopup(popup, contentWin);
  await promiseApzFlushedRepaints(popup);

  // We are just testing the platform event coord calculation code to not hit
  // an assert, rather than clicking on any specific button. Disable a11y
  // checks for this portion.
  AccessibilityUtils.setEnv({
    mustHaveAccessibleRule: false,
  });

  // Do a mouse click in the popup.
  const popupRect = popup.getBoundingClientRect();
  ok(popupRect.width > 10, "non-zero popup width");
  ok(popupRect.height > 10, "non-zero popup height");
  await synthesizeNativeMouseEventWithAPZ({
    type: "click",
    target: popup,
    offsetX: 10,
    offsetY: 10,
  });

  // Just wait to make sure that's processed without hitting an assert.
  await twoRafsInContent(browser);

  AccessibilityUtils.resetEnv();

  // Close the popup.
  const popuphiddenPromise = new Promise(resolve => {
    popup.addEventListener("popuphidden", resolve());
  });
  popup.hidePopup();
  await popuphiddenPromise;

  BrowserTestUtils.removeTab(tab);
}

add_task(async () => {
  await runTest("helper_popup_menu_in_parent_process_content.html");
});
