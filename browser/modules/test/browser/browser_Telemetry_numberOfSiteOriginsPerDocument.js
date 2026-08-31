/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const testRoot = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "http://mochi.test:8888"
);

function windowGlobalDestroyed(id) {
  return BrowserUtils.promiseObserved(
    "window-global-destroyed",
    aWGP => aWGP.innerWindowId == id
  );
}

async function openAndCloseTab(uri) {
  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: uri,
  });

  const innerWindowId =
    tab.linkedBrowser.browsingContext.currentWindowGlobal.innerWindowId;

  const wgpDestroyed = windowGlobalDestroyed(innerWindowId);
  BrowserTestUtils.removeTab(tab);
  await wgpDestroyed;
}

// Asserts the perDocumentSiteOrigins distribution after flushing children.
// `samples` is the list of values expected to have been recorded.
async function assertPerDocumentSiteOrigins(samples, message) {
  await Services.fog.testFlushAllChildren();
  const v = Glean.geckoview.perDocumentSiteOrigins.testGetValue();
  if (!samples.length) {
    Assert.equal(v, null, message);
    return;
  }
  Assert.equal(v.count, samples.length, message + " - count");
  Assert.equal(
    v.sum,
    samples.reduce((a, b) => a + b, 0),
    message + " - sum"
  );
}

add_task(async function test_numberOfSiteOriginsAfterTabClose() {
  Services.fog.testResetFOG();
  const testPage = `${testRoot}contain_iframe.html`;

  await openAndCloseTab(testPage);

  // testPage contains two origins: mochi.test:8888 and example.com.
  await assertPerDocumentSiteOrigins([2], "perDocumentSiteOrigins - tab close");
});

add_task(async function test_numberOfSiteOriginsAboutBlank() {
  Services.fog.testResetFOG();

  await openAndCloseTab("about:blank");

  await assertPerDocumentSiteOrigins(
    [],
    "perDocumentSiteOrigins - about:blank records nothing"
  );
});

add_task(async function test_numberOfSiteOriginsMultipleNavigations() {
  Services.fog.testResetFOG();
  const testPage = `${testRoot}contain_iframe.html`;

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: testPage,
    waitForStateStop: true,
  });

  const wgpDestroyedPromises = [
    windowGlobalDestroyed(tab.linkedBrowser.innerWindowID),
  ];

  // Navigate to an interstitial page.
  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, "about:blank");
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser, {
    wantLoad: "about:blank",
  });

  // Navigate to another test page.
  BrowserTestUtils.startLoadingURIString(tab.linkedBrowser, testPage);
  await BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  wgpDestroyedPromises.push(
    windowGlobalDestroyed(tab.linkedBrowser.innerWindowID)
  );

  BrowserTestUtils.removeTab(tab);
  await Promise.all(wgpDestroyedPromises);

  // testPage has been loaded twice and contains two origins: mochi.test:8888
  // and example.com.
  await assertPerDocumentSiteOrigins(
    [2, 2],
    "perDocumentSiteOrigins - 2 origins recorded twice"
  );
});

add_task(async function test_numberOfSiteOriginsAddAndRemove() {
  Services.fog.testResetFOG();
  const testPage = `${testRoot}blank_iframe.html`;

  const tab = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    opening: testPage,
    waitForStateStop: true,
  });

  // Load a subdocument in the page's iframe.
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const iframe = content.window.document.querySelector("iframe");
    const loaded = new Promise(resolve => {
      iframe.addEventListener("load", () => resolve(), { once: true });
    });
    iframe.src = "http://example.com";

    await loaded;
  });

  // Load a *new* subdocument in the page's iframe. This will result in the page
  // having had three different origins, but only two at any one time.
  await SpecialPowers.spawn(tab.linkedBrowser, [], async () => {
    const iframe = content.window.document.querySelector("iframe");
    const loaded = new Promise(resolve => {
      iframe.addEventListener("load", () => resolve(), { once: true });
    });
    iframe.src = "http://example.org";

    await loaded;
  });

  const wgpDestroyed = windowGlobalDestroyed(tab.linkedBrowser.innerWindowID);
  BrowserTestUtils.removeTab(tab);
  await wgpDestroyed;

  // The page only ever had two origins at once.
  await assertPerDocumentSiteOrigins(
    [2],
    "perDocumentSiteOrigins - max 2 origins at once"
  );
});
