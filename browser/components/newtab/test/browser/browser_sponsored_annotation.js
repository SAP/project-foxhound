/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test whether a visit information is annotated correctly when clicking a tile.

if (AppConstants.platform === "macosx") {
  requestLongerTimeout(5);
} else {
  requestLongerTimeout(3);
}

ChromeUtils.defineESModuleGetters(this, {
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
  PlacesTestUtils: "resource://testing-common/PlacesTestUtils.sys.mjs",
  QueryCache: "resource:///modules/asrouter/ASRouterTargeting.sys.mjs",
  SponsorProtection:
    "moz-src:///browser/components/newtab/SponsorProtection.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  UrlbarTestUtils: "resource://testing-common/UrlbarTestUtils.sys.mjs",
});

const OPEN_TYPE = {
  CURRENT_BY_CLICK: 0,
  NEWTAB_BY_CLICK: 1,
  NEWTAB_BY_MIDDLECLICK: 2,
  NEWTAB_BY_CONTEXTMENU: 3,
  NEWWINDOW_BY_CONTEXTMENU: 4,
  NEWWINDOW_BY_CONTEXTMENU_OF_TILE: 5,
};

const {
  VISIT_SOURCE_ORGANIC,
  VISIT_SOURCE_SPONSORED,
  VISIT_SOURCE_BOOKMARKED,
} = PlacesUtils.history;

async function clearHistoryAndBookmarks() {
  await PlacesUtils.bookmarks.eraseEverything();
  await PlacesUtils.history.clear();
  QueryCache.expireAll();
}

// Toggle the feed off and on as a workaround to read the new prefs.
async function toggleTopsitesPref() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.newtabpage.activity-stream.feeds.system.topsites", false]],
  });
  await SpecialPowers.pushPrefEnv({
    set: [["browser.newtabpage.activity-stream.feeds.system.topsites", true]],
  });
}

/**
 * To be used before checking database contents when they depend on a visit
 * being added to History.
 *
 * @param {string} href the page to await notifications for.
 */
async function waitForVisitNotification(href) {
  await PlacesTestUtils.waitForNotification("page-visited", events =>
    events.some(e => e.url === href)
  );
}

async function assertDatabase({ targetURL, expected }) {
  const placesId = await PlacesTestUtils.getDatabaseValue("moz_places", "id", {
    url: targetURL,
  });
  const expectedTriggeringPlaceId = expected.triggerURL
    ? await PlacesTestUtils.getDatabaseValue("moz_places", "id", {
        url: expected.triggerURL,
      })
    : null;
  const db = await PlacesUtils.promiseDBConnection();
  const rows = await db.execute(
    "SELECT source, triggeringPlaceId FROM moz_historyvisits WHERE place_id = :place_id AND source = :source",
    {
      place_id: placesId,
      source: expected.source,
    }
  );
  Assert.equal(rows.length, 1);
  Assert.equal(
    rows[0].getResultByName("triggeringPlaceId"),
    expectedTriggeringPlaceId,
    `The triggeringPlaceId in database is correct for ${targetURL}`
  );
}

async function waitForLocationChanged(destinationURL) {
  // If nodeIconChanged of browserPlacesViews.js is called after the target node
  // is lost during test, "No DOM node set for aPlacesNode" error occur. To avoid
  // this failure, wait for the onLocationChange event that triggers
  // nodeIconChanged to occur.
  return new Promise(resolve => {
    gBrowser.addTabsProgressListener({
      async onLocationChange(aBrowser, aWebProgress, aRequest, aLocation) {
        if (aLocation.spec === destinationURL) {
          gBrowser.removeTabsProgressListener(this);
          // Wait for an empty Promise to ensure to proceed our test after
          // finishing the processing of other onLocatoinChanged events.
          await Promise.resolve();
          resolve();
        }
      },
    });
  });
}

/**
 * Asserts that browser has SponsorProtection applied if expectsProtection is
 * true, or does not have it applied if expectsProtection is false.
 *
 * @param {Browser} browser
 *   The browser to check.
 * @param {boolean} expectsProtection
 *   True if SponsorProtection is expected to be applied.
 */
function assertSponsorProtectionState(browser, expectsProtection) {
  if (expectsProtection) {
    Assert.ok(
      SponsorProtection.isProtectedBrowser(browser),
      "Expected sponsor protection."
    );
  } else {
    Assert.ok(
      !SponsorProtection.isProtectedBrowser(browser),
      "Expected no sponsor protection."
    );
  }
}

async function openAndTest({
  linkSelector,
  linkURL,
  redirectTo = null,
  openType = OPEN_TYPE.CURRENT_BY_CLICK,
  expected,
}) {
  const destinationURL = redirectTo || linkURL;

  // Wait for content is ready.
  await SpecialPowers.spawn(
    gBrowser.selectedBrowser,
    [linkSelector, linkURL],
    async (selector, link) => {
      await ContentTaskUtils.waitForCondition(
        () => content.document.querySelector(selector).href === link
      );
    }
  );

  info("Open specific link by type and wait for loading.");
  let promiseVisited = waitForVisitNotification(destinationURL);
  if (openType === OPEN_TYPE.CURRENT_BY_CLICK) {
    const onLoad = BrowserTestUtils.browserLoaded(
      gBrowser.selectedBrowser,
      false,
      destinationURL
    );
    const onLocationChanged = waitForLocationChanged(destinationURL);

    await BrowserTestUtils.synthesizeMouseAtCenter(
      linkSelector,
      {},
      gBrowser.selectedBrowser
    );

    await onLoad;
    await onLocationChanged;

    assertSponsorProtectionState(gBrowser.selectedBrowser, expected.protection);
  } else if (openType === OPEN_TYPE.NEWTAB_BY_CLICK) {
    const onLoad = BrowserTestUtils.waitForNewTab(
      gBrowser,
      destinationURL,
      true
    );
    const onLocationChanged = waitForLocationChanged(destinationURL);

    await BrowserTestUtils.synthesizeMouseAtCenter(
      linkSelector,
      { ctrlKey: true, metaKey: true },
      gBrowser.selectedBrowser
    );

    const tab = await onLoad;
    await onLocationChanged;
    assertSponsorProtectionState(tab.linkedBrowser, expected.protection);
    BrowserTestUtils.removeTab(tab);
  } else if (openType === OPEN_TYPE.NEWTAB_BY_MIDDLECLICK) {
    const onLoad = BrowserTestUtils.waitForNewTab(
      gBrowser,
      destinationURL,
      true
    );
    const onLocationChanged = waitForLocationChanged(destinationURL);

    await BrowserTestUtils.synthesizeMouseAtCenter(
      linkSelector,
      { button: 1 },
      gBrowser.selectedBrowser
    );

    const tab = await onLoad;
    await onLocationChanged;

    assertSponsorProtectionState(tab.linkedBrowser, expected.protection);
    BrowserTestUtils.removeTab(tab);
  } else if (openType === OPEN_TYPE.NEWTAB_BY_CONTEXTMENU) {
    const onLoad = BrowserTestUtils.waitForNewTab(
      gBrowser,
      destinationURL,
      true
    );
    const onLocationChanged = waitForLocationChanged(destinationURL);

    const onPopup = BrowserTestUtils.waitForEvent(document, "popupshown");
    await BrowserTestUtils.synthesizeMouseAtCenter(
      linkSelector,
      { type: "contextmenu" },
      gBrowser.selectedBrowser
    );
    await onPopup;
    const contextMenu = document.getElementById("contentAreaContextMenu");
    const openLinkMenuItem = contextMenu.querySelector(
      "#context-openlinkintab"
    );
    contextMenu.activateItem(openLinkMenuItem);

    const tab = await onLoad;
    await onLocationChanged;

    assertSponsorProtectionState(tab.linkedBrowser, expected.protection);
    BrowserTestUtils.removeTab(tab);
  } else if (openType === OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU) {
    const onLoad = BrowserTestUtils.waitForNewWindow({ url: destinationURL });

    const onPopup = BrowserTestUtils.waitForEvent(document, "popupshown");
    await BrowserTestUtils.synthesizeMouseAtCenter(
      linkSelector,
      { type: "contextmenu" },
      gBrowser.selectedBrowser
    );
    await onPopup;
    const contextMenu = document.getElementById("contentAreaContextMenu");
    const openLinkMenuItem = contextMenu.querySelector("#context-openlink");
    contextMenu.activateItem(openLinkMenuItem);

    const win = await onLoad;
    assertSponsorProtectionState(
      win.gBrowser.selectedBrowser,
      expected.protection
    );
    await BrowserTestUtils.closeWindow(win);
  } else if (openType === OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU_OF_TILE) {
    const onLoad = BrowserTestUtils.waitForNewWindow({ url: destinationURL });

    await SpecialPowers.spawn(
      gBrowser.selectedBrowser,
      [linkSelector],
      async selector => {
        const link = content.document.querySelector(selector);
        const list = link.closest("li");
        const contextMenu = list.querySelector(".context-menu-button");
        contextMenu.click();
        const target = list.querySelector(
          "[data-l10n-id=newtab-menu-open-new-window]"
        );
        target.click();
      }
    );

    const win = await onLoad;

    assertSponsorProtectionState(
      win.gBrowser.selectedBrowser,
      expected.protection
    );
    await BrowserTestUtils.closeWindow(win);
  }
  await promiseVisited;

  info("Check database for the destination.");
  await assertDatabase({ targetURL: destinationURL, expected });
}

async function pin(link) {
  // Setup test tile.
  NewTabUtils.pinnedLinks.pin(link, 0);
  await toggleTopsitesPref();
  await BrowserTestUtils.waitForCondition(() => {
    const sites = AboutNewTab.getTopSites();
    return (
      sites?.[0]?.url === link.url &&
      sites[0].sponsored_tile_id === link.sponsored_tile_id
    );
  }, "Waiting for top sites to be updated");
}

function unpin(link) {
  NewTabUtils.pinnedLinks.unpin(link);
}

async function appendPlaceData(arr, url, description) {
  let frecency = await PlacesTestUtils.getDatabaseValue(
    "moz_places",
    "frecency",
    { url }
  );
  arr.push({ frecency, url, description });
}

function sortFrecencyValues(frecencyValues) {
  return [...frecencyValues].sort((a, b) => b.frecency - a.frecency);
}

add_setup(async function () {
  await clearHistoryAndBookmarks();
  registerCleanupFunction(async () => {
    await clearHistoryAndBookmarks();
  });
});

add_task(async function basic() {
  const SPONSORED_LINK = {
    label: "test_label",
    url: "https://example.com/",
    sponsored_position: 1,
    sponsored_tile_id: 12345,
    sponsored_impression_url: "https://impression.example.com/",
    sponsored_click_url: "https://click.example.com/",
  };
  const NORMAL_LINK = {
    label: "test_label",
    url: "https://example.com/",
  };
  const BOOKMARKS = [
    {
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      url: Services.io.newURI("https://example.com/"),
      title: "test bookmark",
    },
  ];

  const testData = [
    {
      description: "Sponsored tile",
      link: SPONSORED_LINK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored tile in new tab by click with key",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored tile in new tab by middle click",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored tile in new tab by context menu",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored tile in new window by context menu",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored tile in new window by context menu of tile",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU_OF_TILE,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Bookmarked result",
      link: NORMAL_LINK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Bookmarked result in new tab by click with key",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Bookmarked result in new tab by middle click",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Bookmarked result in new tab by context menu",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CONTEXTMENU,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Bookmarked result in new window by context menu",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Bookmarked result in new window by context menu of tile",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU_OF_TILE,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Sponsored and bookmarked result",
      link: SPONSORED_LINK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description:
        "Sponsored and bookmarked result in new tab by click with key",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored and bookmarked result in new tab by middle click",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored and bookmarked result in new tab by context menu",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CONTEXTMENU,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description:
        "Sponsored and bookmarked result in new window by context menu",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description:
        "Sponsored and bookmarked result in new window by context menu of tile",
      link: SPONSORED_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU_OF_TILE,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Organic tile",
      link: NORMAL_LINK,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
    {
      description: "Organic tile in new tab by click with key",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
    {
      description: "Organic tile in new tab by middle click",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
    {
      description: "Organic tile in new tab by context menu",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWTAB_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
    {
      description: "Organic tile in new window by context menu",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
    {
      description: "Organic tile in new window by context menu of tile",
      link: NORMAL_LINK,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU_OF_TILE,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
  ];

  for (const { description, link, openType, bookmarks, expected } of testData) {
    info(description);

    await BrowserTestUtils.withNewTab("about:home", async () => {
      // Setup test tile.
      await pin(link);

      for (const bookmark of bookmarks || []) {
        await PlacesUtils.bookmarks.insert(bookmark);
      }

      await openAndTest({
        linkSelector: ".top-site-button",
        linkURL: link.url,
        openType,
        expected,
      });

      unpin(link);
      await clearHistoryAndBookmarks();
    });
  }
});

add_task(async function redirection() {
  await BrowserTestUtils.withNewTab("about:home", async () => {
    const redirectTo = "https://example.com/";
    const link = {
      label: "test_label",
      url: "https://example.com/browser/browser/extensions/newtab/test/browser/redirect_to.sjs?/",
      sponsored_position: 1,
      sponsored_tile_id: 12345,
      sponsored_impression_url: "https://impression.example.com/",
      sponsored_click_url: "https://click.example.com/",
    };

    // Setup test tile.
    await pin(link);

    // Test with new tab.
    await openAndTest({
      linkSelector: ".top-site-button",
      linkURL: link.url,
      redirectTo,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });

    // Check for URL causes the redirection.
    await assertDatabase({
      targetURL: link.url,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
      },
    });

    await clearHistoryAndBookmarks();

    // Test with same tab.
    await openAndTest({
      linkSelector: ".top-site-button",
      linkURL: link.url,
      redirectTo,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });

    // Check for URL causes the redirection.
    await assertDatabase({
      targetURL: link.url,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
      },
    });
    unpin(link);
    await clearHistoryAndBookmarks();
  });
});

add_task(async function inherit() {
  const host = "https://example.com/";
  const sameBaseDomainHost = "https://www.example.com/";
  const path = "browser/browser/extensions/newtab/test/browser/";
  const firstURL = `${host}${path}annotation_first.html`;
  const secondURL = `${host}${path}annotation_second.html`;
  const thirdURL = `${sameBaseDomainHost}${path}annotation_third.html`;
  const outsideURL = "https://example.org/";

  await BrowserTestUtils.withNewTab("about:home", async () => {
    const link = {
      label: "first",
      url: firstURL,
      sponsored_position: 1,
      sponsored_tile_id: 12345,
      sponsored_impression_url: "https://impression.example.com/",
      sponsored_click_url: "https://click.example.com/",
    };

    // Setup test tile.
    await pin(link);

    info("Open the tile to show first page in same tab");
    await openAndTest({
      linkSelector: ".top-site-button",
      linkURL: link.url,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    });

    info("Open link on first page to show second page in new window");
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info(
      "Open link on first page to show second page in new tab by click with key"
    );
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info(
      "Open link on first page to show second page in new tab by middle click"
    );
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info("Open link on first page to show second page in same tab");
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });

    info("Open link on first page to show second page in new window");
    await openAndTest({
      linkSelector: "a",
      linkURL: thirdURL,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info(
      "Open link on second page to show third page in new tab by context menu"
    );
    await openAndTest({
      linkSelector: "a",
      linkURL: thirdURL,
      openType: OPEN_TYPE.NEWTAB_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info(
      "Open link on second page to show third page in new tab by middle click"
    );
    await openAndTest({
      linkSelector: "a",
      linkURL: thirdURL,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info("Open link on second page to show third page in same tab");
    await openAndTest({
      linkSelector: "a",
      linkURL: thirdURL,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
        protection: true,
      },
    });

    info("Open link on third page to show outside domain page in same tab");
    await openAndTest({
      linkSelector: "a",
      linkURL: outsideURL,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: true,
      },
    });

    info("Visit URL that has the same domain as sponsored link from URL bar");
    const onLoad = BrowserTestUtils.browserLoaded(
      gBrowser.selectedBrowser,
      false,
      "https://www.example.com/"
    );

    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: host,
      waitForFocus: SimpleTest.waitForFocus,
    });

    let promiseVisited = waitForVisitNotification("https://www.example.com/");
    EventUtils.synthesizeKey("KEY_Enter");
    await onLoad;
    await promiseVisited;

    await assertDatabase({
      targetURL: "https://www.example.com/",
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        triggerURL: link.url,
      },
    });

    unpin(link);
    await clearHistoryAndBookmarks();
  });
});

add_task(async function timeout() {
  const base =
    "https://example.com/browser/browser/extensions/newtab/test/browser";
  const firstURL = `${base}/annotation_first.html`;
  const secondURL = `${base}/annotation_second.html`;

  await BrowserTestUtils.withNewTab("about:home", async () => {
    const link = {
      label: "test",
      url: firstURL,
      sponsored_position: 1,
      sponsored_tile_id: 12345,
      sponsored_impression_url: "https://impression.example.com/",
      sponsored_click_url: "https://click.example.com/",
    };

    // Setup a test tile.
    await pin(link);

    info("Open the tile");
    await openAndTest({
      linkSelector: ".top-site-button",
      linkURL: link.url,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    });

    info("Set timeout second");
    await SpecialPowers.pushPrefEnv({
      set: [["browser.places.sponsoredSession.timeoutSecs", 1]],
    });

    info("Wait 1 sec");
    // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
    await new Promise(r => setTimeout(r, 1000));

    info("Open link on first page to show second page in new window");
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      openType: OPEN_TYPE.NEWWINDOW_BY_CONTEXTMENU,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info(
      "Open link on first page to show second page in new tab by click with key"
    );
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      openType: OPEN_TYPE.NEWTAB_BY_CLICK,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info(
      "Open link on first page to show second page in new tab by middle click"
    );
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      openType: OPEN_TYPE.NEWTAB_BY_MIDDLECLICK,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: true,
      },
    });
    await PlacesTestUtils.clearHistoryVisits();

    info("Open link on first page to show second page");
    await openAndTest({
      linkSelector: "a",
      linkURL: secondURL,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: true,
      },
    });

    unpin(link);
    await clearHistoryAndBookmarks();
    await SpecialPowers.popPrefEnv();
  });
});

add_task(async function fixup() {
  await BrowserTestUtils.withNewTab("about:home", async () => {
    const destinationURL = "https://example.com/?a";
    const link = {
      label: "test",
      url: "https://example.com?a",
      sponsored_position: 1,
      sponsored_tile_id: 12345,
      sponsored_impression_url: "https://impression.example.com/",
      sponsored_click_url: "https://click.example.com/",
    };

    info("Setup pin");
    await pin(link);

    info("Click sponsored tile");
    let promiseVisited = waitForVisitNotification(destinationURL);
    const onLoad = BrowserTestUtils.browserLoaded(
      gBrowser.selectedBrowser,
      false,
      destinationURL
    );
    const onLocationChanged = waitForLocationChanged(destinationURL);
    await BrowserTestUtils.synthesizeMouseAtCenter(
      ".top-site-button",
      {},
      gBrowser.selectedBrowser
    );
    await onLoad;
    await onLocationChanged;
    await promiseVisited;

    info("Check the DB");
    await assertDatabase({
      targetURL: destinationURL,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
      },
    });

    info("Clean up");
    unpin(link);
    await clearHistoryAndBookmarks();
  });
});

add_task(async function noTriggeringURL() {
  await BrowserTestUtils.withNewTab("about:home", async browser => {
    Services.telemetry.clearScalars();

    const dummyTriggeringSponsoredURL =
      "https://example.com/dummyTriggeringSponsoredURL";
    const targetURL = "https://example.com/";

    info("Setup dummy triggering sponsored URL");
    browser.setAttribute("triggeringSponsoredURL", dummyTriggeringSponsoredURL);
    browser.setAttribute("triggeringSponsoredURLVisitTimeMS", Date.now());

    info("Open URL whose host is the same as dummy triggering sponsored URL");
    let promiseVisited = waitForVisitNotification(targetURL);
    await UrlbarTestUtils.promiseAutocompleteResultPopup({
      window,
      value: targetURL,
      waitForFocus: SimpleTest.waitForFocus,
    });
    const onLoad = BrowserTestUtils.browserLoaded(
      gBrowser.selectedBrowser,
      false,
      targetURL
    );
    EventUtils.synthesizeKey("KEY_Enter");
    await onLoad;
    await promiseVisited;

    info("Check DB");
    await assertDatabase({
      targetURL,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
      },
    });

    info("Check telemetry");
    const scalars = TelemetryTestUtils.getProcessScalars("parent", false, true);
    TelemetryTestUtils.assertScalar(
      scalars,
      "places.sponsored_visit_no_triggering_url",
      1
    );

    await clearHistoryAndBookmarks();
  });
});

add_task(async function basic_frecency_check() {
  const SPONSORED_LINK = {
    label: "test_label",
    url: "https://example.com/",
    sponsored_position: 1,
    sponsored_tile_id: 12345,
    sponsored_impression_url: "https://impression.example.com/",
    sponsored_click_url: "https://click.example.com/",
  };

  const NORMAL_LINK = {
    label: "test_label",
    url: "https://example.com/",
  };

  const BOOKMARKS = [
    {
      parentGuid: PlacesUtils.bookmarks.toolbarGuid,
      url: Services.io.newURI("https://example.com/"),
      title: "test bookmark",
    },
  ];

  // This is a basic, slim sanity check the frecency ordering is expected.
  // Ties are broken by their order.
  const testData = [
    // Typed visits and bookmarked visits.
    {
      description: "Bookmarked result",
      link: NORMAL_LINK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_BOOKMARKED,
        protection: false,
      },
    },
    {
      description: "Organic tile",
      link: NORMAL_LINK,
      expected: {
        source: VISIT_SOURCE_ORGANIC,
        protection: false,
      },
    },
    // Sponsored.
    {
      description: "Sponsored and bookmarked result",
      link: SPONSORED_LINK,
      bookmarks: BOOKMARKS,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
    {
      description: "Sponsored tile",
      link: SPONSORED_LINK,
      expected: {
        source: VISIT_SOURCE_SPONSORED,
        protection: true,
      },
    },
  ];

  let frecencyResults = [];

  for (const { description, link, openType, bookmarks, expected } of testData) {
    info(description);

    await BrowserTestUtils.withNewTab("about:home", async () => {
      // Setup test tile.
      await pin(link);

      for (const bookmark of bookmarks || []) {
        await PlacesUtils.bookmarks.insert(bookmark);
      }

      await openAndTest({
        linkSelector: ".top-site-button",
        linkURL: link.url,
        openType,
        expected,
      });

      await appendPlaceData(frecencyResults, link.url, description);

      unpin(link);
      await clearHistoryAndBookmarks();
    });
  }

  let sortedByFrecency = sortFrecencyValues(frecencyResults);
  for (let i = 0; i < testData.length; i++) {
    Assert.equal(
      sortedByFrecency[i].description,
      frecencyResults[i].description,
      `Expected "${frecencyResults[i].description}" to be at position ${i} when sorted by frecency`
    );
  }
});
