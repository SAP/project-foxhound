/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const FIRSTRUN_URL = "chrome://browser/content/aiwindow/firstrun.html";

/**
 * Checks if browser has transparent attribute
 *
 * @param {XULBrowser} browser
 * @returns {boolean}
 */
function isBrowserTransparent(browser) {
  return browser.hasAttribute("transparent");
}

/**
 * Creates a data URL for a page with transparent styling
 *
 * @returns {string}
 */
function getTransparentPageURL() {
  return `data:text/html,<!DOCTYPE html>
    <html style="background: transparent;">
    <head><title>Transparent Test Page</title></head>
    <body style="background: transparent; color: white;">
      <h1>This page tries to be transparent</h1>
    </body>
    </html>`;
}

let gAIWindow;
let gReusableTab;

add_setup(async function setup() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.search.suggest.enabled", false],
      ["browser.urlbar.suggest.searches", false],
      ["browser.smartwindow.endpoint", "http://localhost:0/v1"],
    ],
  });

  gAIWindow = await openAIWindow();
  registerCleanupFunction(async () => {
    await BrowserTestUtils.closeWindow(gAIWindow);
  });
});

add_task(async function test_transparency_on_new_window() {
  const browser = gAIWindow.gBrowser.selectedBrowser;

  Assert.ok(
    isBrowserTransparent(browser),
    "Browser should be transparent on new AI window"
  );
});

add_task(async function test_transparency_on_new_tab() {
  const newTab = await BrowserTestUtils.openNewForegroundTab(
    gAIWindow.gBrowser,
    AIWINDOW_URL
  );
  const newBrowser = gAIWindow.gBrowser.getBrowserForTab(newTab);

  Assert.ok(
    isBrowserTransparent(newBrowser),
    "Browser should be transparent on new AI window tab"
  );

  Assert.equal(
    newBrowser.currentURI.spec,
    AIWINDOW_URL,
    "New tab should be on AI window URL"
  );

  gAIWindow.gBrowser.removeTab(newTab);
});

add_task(async function test_transparency_on_firstrun_page() {
  const newTab = await BrowserTestUtils.openNewForegroundTab(
    gAIWindow.gBrowser,
    FIRSTRUN_URL
  );
  const newBrowser = gAIWindow.gBrowser.getBrowserForTab(newTab);

  Assert.ok(
    isBrowserTransparent(newBrowser),
    "Browser should be transparent on new firstrun page"
  );

  Assert.equal(
    newBrowser.currentURI.spec,
    FIRSTRUN_URL,
    "New tab should be on firstrun URL"
  );

  gAIWindow.gBrowser.removeTab(newTab);
});

add_task(async function test_transparency_removed_on_navigation() {
  gReusableTab = await BrowserTestUtils.openNewForegroundTab(
    gAIWindow.gBrowser,
    AIWINDOW_URL
  );
  const browser = gReusableTab.linkedBrowser;

  Assert.ok(
    isBrowserTransparent(browser),
    "Browser should be transparent on new AI window tab"
  );

  const loaded = BrowserTestUtils.browserLoaded(
    browser,
    false,
    "https://example.com/"
  );
  BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
  await loaded;

  Assert.equal(
    browser.currentURI.spec,
    "https://example.com/",
    "Browser should be on example.com after navigation"
  );

  Assert.ok(
    !isBrowserTransparent(browser),
    "Browser should not have transparent attribute after navigation"
  );
});

add_task(async function test_transparency_blocked_on_transparent_page() {
  const browser = gReusableTab.linkedBrowser;

  let loaded = BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
  BrowserTestUtils.startLoadingURIString(browser, AIWINDOW_URL);
  await loaded;

  Assert.ok(
    isBrowserTransparent(browser),
    "Browser should be transparent on new AI window tab"
  );

  const transparentPageURL = getTransparentPageURL();
  loaded = BrowserTestUtils.browserLoaded(browser, false, url =>
    url.startsWith("data:")
  );
  BrowserTestUtils.startLoadingURIString(browser, transparentPageURL);
  await loaded;

  await BrowserTestUtils.waitForMutationCondition(
    browser,
    { attributes: true },
    () => !isBrowserTransparent(browser)
  );

  Assert.ok(
    !isBrowserTransparent(browser),
    "Browser does not have transparent attribute"
  );

  await SpecialPowers.spawn(browser, [], async () => {
    const bodyStyle = content.window.getComputedStyle(content.document.body);
    const htmlStyle = content.window.getComputedStyle(
      content.document.documentElement
    );

    Assert.equal(
      bodyStyle.backgroundColor,
      "rgba(0, 0, 0, 0)",
      "Body background should be transparent"
    );
    Assert.equal(
      htmlStyle.backgroundColor,
      "rgba(0, 0, 0, 0)",
      "HTML background should be transparent"
    );
  });

  const canvas = gAIWindow.document.createElementNS(
    "http://www.w3.org/1999/xhtml",
    "canvas"
  );
  const rect = new DOMRect(0, 0, 100, 100);
  const snapshot =
    await browser.browsingContext.currentWindowGlobal.drawSnapshot(
      rect,
      1,
      "rgb(255, 255, 255)"
    );

  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(snapshot, 0, 0);
  snapshot.close();

  const imageData = ctx.getImageData(50, 50, 1, 1);
  const [r, g, b, a] = imageData.data;

  Assert.equal(
    a,
    255,
    "Background should be fully opaque (not system transparent)"
  );
  Assert.equal(
    r,
    255,
    "Background red channel should be 255 (white background)"
  );
  Assert.equal(
    g,
    255,
    "Background green channel should be 255 (white background)"
  );
  Assert.equal(
    b,
    255,
    "Background blue channel should be 255 (white background)"
  );
});

add_task(async function test_transparency_restored_on_navigation_back() {
  const browser = gReusableTab.linkedBrowser;

  let loaded = BrowserTestUtils.browserLoaded(
    browser,
    false,
    "https://example.com/"
  );
  BrowserTestUtils.startLoadingURIString(browser, "https://example.com/");
  await loaded;

  Assert.equal(
    browser.currentURI.spec,
    "https://example.com/",
    "Browser should be on example.com"
  );

  Assert.ok(
    !isBrowserTransparent(browser),
    "Browser should not be transparent on example.com"
  );

  loaded = BrowserTestUtils.browserLoaded(browser, false, AIWINDOW_URL);
  BrowserTestUtils.startLoadingURIString(browser, AIWINDOW_URL);
  await loaded;

  Assert.ok(
    isBrowserTransparent(browser),
    "Browser should be transparent again after returning to AI window URL"
  );

  Assert.equal(
    browser.currentURI.spec,
    AIWINDOW_URL,
    "Browser should be back on AI window URL"
  );

  gAIWindow.gBrowser.removeTab(gReusableTab);
});
