"use strict";

// Test browsing-context-active-change notification which is fired on the parent process
// to know when a BrowsingContext becomes visible/hidden.

function observeTopic(aTopic) {
  return new Promise(resolve => {
    function observer(subject, topic) {
      is(topic, aTopic, "observing correct topic");
      ok(
        BrowsingContext.isInstance(subject),
        "subject to be a BrowsingContext"
      );
      Services.obs.removeObserver(observer, aTopic);
      resolve();
    }

    Services.obs.addObserver(observer, aTopic);
  });
}

function waitForActiveChange() {
  return observeTopic("browsing-context-active-change");
}

function waitForAttached() {
  return observeTopic("browsing-context-attached");
}

add_task(async function () {
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser);
  const browser = tab.linkedBrowser;

  let onActiveChange = waitForActiveChange();
  browser.docShellIsActive = false;
  await onActiveChange;
  is(
    browser.browsingContext.isActive,
    false,
    "The browsing context is no longer active"
  );

  onActiveChange = waitForActiveChange();
  browser.docShellIsActive = true;
  await onActiveChange;
  is(
    browser.browsingContext.isActive,
    true,
    "The browsing context is active again"
  );

  BrowserTestUtils.removeTab(tab);
});

// Tests that BrowsingContext.isActive becomes false in BF cache.
add_task(async function () {
  const TEST_PATH1 =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      "http://example.com"
    ) + "dummy_page.html";
  const TEST_PATH2 =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      "http://example.com"
    ) + "dummy_iframe_page.html";

  let attached = waitForActiveChange();
  const tab = await BrowserTestUtils.openNewForegroundTab(gBrowser, TEST_PATH1);
  await attached;

  const firstBC = tab.linkedBrowser.browsingContext;
  is(firstBC.isActive, true, "The first browsing context is now active");
  is(firstBC.currentURI.spec, TEST_PATH1);

  // Load a new page now.
  let stoppedLoadingPromise = BrowserTestUtils.browserStopped(
    tab.linkedBrowser,
    TEST_PATH2
  );
  await loadURI(TEST_PATH2);
  await stoppedLoadingPromise;
  const secondBC = tab.linkedBrowser.browsingContext;
  await TestUtils.waitForCondition(() => secondBC.isActive);

  isnot(firstBC, secondBC);

  is(secondBC.isActive, true, "The second browsing context is now active");
  is(secondBC.currentURI.spec, TEST_PATH2);
  is(firstBC.isActive, false, "The first browsing context is no longer active");
  is(firstBC.currentURI.spec, TEST_PATH1);

  // Now try to back to the previous page, unlike above cases we don't wait
  // "browsing-context-active-change" since it's not notified on this history back.
  stoppedLoadingPromise = BrowserTestUtils.browserStopped(
    tab.linkedBrowser,
    TEST_PATH1
  );
  gBrowser.goBack();
  await stoppedLoadingPromise;

  is(
    secondBC.isActive,
    false,
    "The second browsing context is no longer active"
  );
  is(firstBC.isActive, true, "The first browsing context is active again");

  BrowserTestUtils.removeTab(tab);
});
