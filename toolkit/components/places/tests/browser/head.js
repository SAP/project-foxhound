ChromeUtils.defineESModuleGetters(this, {
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
});

const TRANSITION_LINK = PlacesUtils.history.TRANSITION_LINK;
const TRANSITION_TYPED = PlacesUtils.history.TRANSITION_TYPED;
const TRANSITION_BOOKMARK = PlacesUtils.history.TRANSITION_BOOKMARK;
const TRANSITION_REDIRECT_PERMANENT =
  PlacesUtils.history.TRANSITION_REDIRECT_PERMANENT;
const TRANSITION_REDIRECT_TEMPORARY =
  PlacesUtils.history.TRANSITION_REDIRECT_TEMPORARY;
const TRANSITION_EMBED = PlacesUtils.history.TRANSITION_EMBED;
const TRANSITION_FRAMED_LINK = PlacesUtils.history.TRANSITION_FRAMED_LINK;
const TRANSITION_DOWNLOAD = PlacesUtils.history.TRANSITION_DOWNLOAD;

function whenNewWindowLoaded(aOptions, aCallback) {
  BrowserTestUtils.waitForNewWindow().then(aCallback);
  OpenBrowserWindow(aOptions);
}

async function clearHistoryAndHistoryCache() {
  await PlacesUtils.history.clear();
  // Clear HistoryRestiction cache as well.
  Cc["@mozilla.org/browser/history;1"]
    .getService(Ci.mozIAsyncHistory)
    .clearCache();
}

async function synthesizeVisitByUser(browser, url) {
  let onNewTab = BrowserTestUtils.waitForNewTab(browser.ownerGlobal.gBrowser);
  // We intentionally turn off this a11y check, because the following click is
  // purposefully sent on an arbitrary web content that is not expected to be
  // tested by itself with the browser mochitests, therefore this rule check
  // shall be ignored by a11y_checks suite.
  AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
  await ContentTask.spawn(browser, [url], async ([href]) => {
    EventUtils.synthesizeMouseAtCenter(
      content.document.querySelector(`a[href='${href}'`),
      {},
      content
    );
  });
  AccessibilityUtils.resetEnv();
  let tab = await onNewTab;
  BrowserTestUtils.removeTab(tab);
}

async function synthesizeVisitByScript(browser, url) {
  let onNewTab = BrowserTestUtils.waitForNewTab(browser.ownerGlobal.gBrowser);
  AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });
  await ContentTask.spawn(browser, [url], async ([href]) => {
    let a = content.document.querySelector(`a[href='${href}'`);
    a.click();
  });
  AccessibilityUtils.resetEnv();
  let tab = await onNewTab;
  BrowserTestUtils.removeTab(tab);
}

async function assertLinkVisitedStatus(
  browser,
  url,
  { visitCount: expectedVisitCount, isVisited: expectedVisited }
) {
  await BrowserTestUtils.waitForCondition(async () => {
    let visitCount =
      (await PlacesTestUtils.getDatabaseValue("moz_places", "visit_count", {
        url,
      })) ?? 0;

    if (visitCount != expectedVisitCount) {
      return false;
    }

    Assert.equal(visitCount, expectedVisitCount, "The visit count is correct");
    return true;
  });

  await ContentTask.spawn(
    browser,
    [url, expectedVisited],
    async ([href, visited]) => {
      // ElementState::VISITED
      const VISITED_STATE = 1 << 18;
      await ContentTaskUtils.waitForCondition(() => {
        let isVisited = !!(
          content.InspectorUtils.getContentState(
            content.document.querySelector(`a[href='${href}']`)
          ) & VISITED_STATE
        );
        return isVisited == visited;
      });
    }
  );
  Assert.ok(true, "The visited state is corerct");
}

async function checkFrecencyEqual(url1, url2) {
  let frecency1 = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    {
      url: url1,
    }
  );
  let frecency2 = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    {
      url: url2,
    }
  );
  Assert.equal(
    frecency1,
    frecency2,
    `Frecency of ${url1} is equal to frecency of ${url2}.`
  );
}

async function checkFrecencyGreater(url1, url2) {
  let frecency1 = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    {
      url: url1,
    }
  );
  let frecency2 = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    {
      url: url2,
    }
  );
  Assert.greater(
    frecency1,
    frecency2,
    `Frecency of ${url1} is greater than frecency of ${url2}.`
  );
}

async function checkFrecencyNonZero(url) {
  Assert.greater(
    await PlacesTestUtils.getDatabaseValue("moz_places", "frecency", {
      url,
    }),
    0,
    `Frecency of ${url} is greater than 0.`
  );
}

async function checkUrlHidden(url, expectedHidden) {
  let hiddenState = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "hidden",
    {
      url,
    }
  );
  Assert.equal(
    hiddenState,
    expectedHidden,
    `URL ${url} is ${expectedHidden ? "hidden" : "not hidden."}`
  );
}

async function checkRedirect(
  redirectUrl,
  targetUrl,
  intermediateUrls = [],
  isTyped = false
) {
  // First, check redirect and intermediate urls are hidden and the target URL
  // is not hidden.
  await checkUrlHidden(redirectUrl, 1);
  for (let intermediateUrl of intermediateUrls) {
    await checkUrlHidden(intermediateUrl, 1);
  }
  await checkUrlHidden(targetUrl, 0);

  // Check the frecency values of redirect URLs are expected.
  await checkFrecencyNonZero(redirectUrl);
  for (let intermediateUrl of intermediateUrls) {
    if (isTyped) {
      await checkFrecencyGreater(redirectUrl, intermediateUrl);
    } else {
      await checkFrecencyEqual(redirectUrl, intermediateUrl);
    }
  }

  // Check intermediate urls have the same frecency.
  let intermediateUrlObj = [];
  for (let intermediateUrl of intermediateUrls) {
    let frecency = await PlacesTestUtils.getDatabaseValue(
      "moz_places",
      "frecency",
      {
        url: intermediateUrl,
      }
    );
    intermediateUrlObj.push({ url: intermediateUrl, frecency });
  }
  if (intermediateUrlObj.length) {
    let expected = intermediateUrlObj[0];
    for (let i = 1; i < intermediateUrlObj.length; ++i) {
      Assert.equal(
        intermediateUrlObj[i].frecency,
        expected.frecency,
        `Frecency of intermediate url ${intermediateUrlObj[i].url} should match ${expected.url}`
      );
    }
  }

  // Check the target URL has a higher frecency than the intermediate URLs.
  for (let intermediateUrl of intermediateUrls) {
    await checkFrecencyGreater(targetUrl, intermediateUrl);
  }

  if (isTyped && intermediateUrls.length) {
    await checkFrecencyGreater(redirectUrl, targetUrl);
  } else {
    await checkFrecencyGreater(targetUrl, redirectUrl);
  }
}
