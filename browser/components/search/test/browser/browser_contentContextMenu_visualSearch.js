/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test for the visual search content context menu item, the one labeled
// "Search Image with {engine}".

ChromeUtils.defineESModuleGetters(this, {
  SearchEngine: "moz-src:///toolkit/components/search/SearchEngine.sys.mjs",
});

const CONTEXT_MENU_ID = "contentAreaContextMenu";
const VISUAL_SEARCH_MENUITEM_ID = "context-visual-search";

const TEST_PAGE_URL =
  "http://mochi.test:8888/browser/browser/components/search/test/browser/browser_contentContextMenu.xhtml";

// The URL of the primary image in the test page.
const IMAGE_URL =
  "http://mochi.test:8888/browser/browser/components/search/test/browser/ctxmenu-image.png";

const SEARCH_CONFIG = [
  // an engine with visual search
  {
    recordType: "engine",
    identifier: "visual-search-1",
    base: {
      name: "Visual Search Engine 1",
      urls: {
        visualSearch: {
          base: "https://example.com/visual-search-1",
          searchTermParamName: "url",
          acceptedContentTypes: ["image/png"],
        },
      },
    },
    variants: [
      {
        environment: { allRegionsAndLocales: true },
      },
    ],
  },

  // an engine with visual search that has a display name override and
  // `isNewUntil` date
  {
    recordType: "engine",
    identifier: "visual-search-2",
    base: {
      name: "Visual Search Engine 2",
      urls: {
        visualSearch: {
          base: "https://example.com/visual-search-2",
          searchTermParamName: "url",
          displayNameMap: {
            default: "Display Name Override Engine 2",
          },
          isNewUntil: "2095-01-01",
        },
      },
    },
    variants: [
      {
        environment: { allRegionsAndLocales: true },
      },
    ],
  },

  // an engine without visual search
  {
    recordType: "engine",
    identifier: "no-visual-search",
    base: {
      name: "No Visual Search Engine",
      urls: {
        search: {
          base: "https://example.com/no-visual-search",
          searchTermParamName: "q",
        },
      },
    },
    variants: [
      {
        environment: { allRegionsAndLocales: true },
      },
    ],
  },

  {
    recordType: "defaultEngines",
    globalDefault: "visual-search-1",
    specificDefaults: [],
  },
  {
    recordType: "engineOrders",
    orders: [],
  },
];

SearchTestUtils.init(this);

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["test.wait300msAfterTabSwitch", true],
      ["browser.search.visualSearch.featureGate", true],
    ],
  });

  await SearchTestUtils.updateRemoteSettingsConfig(SEARCH_CONFIG);

  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    TEST_PAGE_URL
  );
  registerCleanupFunction(() => BrowserTestUtils.removeTab(tab));
});

// With a default engine that supports visual search, context-clicking an image
// should show the visual search menuitem, and clicking the item should load the
// visual search SERP.
add_task(async function engineWithVisualSearch() {
  await setDefaultEngineAndClickMenuitem({
    defaultEngineId: "visual-search-1",
    expectedEngineNameInLabel: "Visual Search Engine 1",
    expectedBaseUrl: "https://example.com/visual-search-1",
  });
});

// With a default engine that supports visual search with a display name
// override, context-clicking an image should show the visual search menuitem
// with the override name.
add_task(async function engineWithVisualSearch_displayNameOverride() {
  await setDefaultEngineAndCheckMenu({
    defaultEngineId: "visual-search-2",
    shouldBeShown: true,
    expectedEngineNameInLabel: "Display Name Override Engine 2",
    shouldHaveNewBadge: true,
  });
});

// With a default engine that does not support visual search, context-clicking
// an image should not show the visual search menuitem.
add_task(async function engineWithoutVisualSearch() {
  await setDefaultEngineAndCheckMenu({
    defaultEngineId: "no-visual-search",
    shouldBeShown: false,
  });
});

// With a default engine that supports visual search, context-clicking a link
// should not show the visual search menuitem.
add_task(async function contextClick_link() {
  await setDefaultEngineAndCheckMenu({
    selector: "#link",
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });
});

// With a default engine that supports visual search, context-clicking a blank
// spot in the page should not show the visual search menuitem.
add_task(async function contextClick_page() {
  await setDefaultEngineAndCheckMenu({
    selector: "body",
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });
});

// With a default engine that supports visual search, context-clicking on
// selected text should not show the visual search menuitem.
add_task(async function contextClick_selectedText() {
  // Select `#plainText`.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    let selection = content.getSelection();
    selection.removeAllRanges();
    selection.selectAllChildren(content.document.getElementById("plainText"));
  });

  await setDefaultEngineAndCheckMenu({
    selector: "#plainText",
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });

  // Remove the selection.
  await SpecialPowers.spawn(gBrowser.selectedBrowser, [], async function () {
    let selection = content.getSelection();
    selection.removeAllRanges();
  });
});

// With a default engine that supports visual search, context-clicking an image
// of an unsupported type should not show the visual search menuitem.
add_task(async function contextClick_unsupportedImage() {
  await setDefaultEngineAndCheckMenu({
    // SVG is unsupported because it's not in the engine config's
    // `acceptedContentTypes`.
    selector: "#image-svg",
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });
});

// With a default engine that supports visual search, context-clicking an image
// encoded as a data URI should not show the visual search menuitem.
add_task(async function contextClick_dataURI() {
  await setDefaultEngineAndCheckMenu({
    selector: "#image-data-uri",
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });
});

// With a default engine that supports visual search, context-clicking an image
// that's served with `Content-Disposition: attachment` should not show the
// visual search menuitem.
add_task(async function contextClick_contentDisposition() {
  await setDefaultEngineAndCheckMenu({
    selector: "#image-content-disposition",
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });
});

// With a default engine that supports visual search and no separate private
// default engine, context-clicking an image in a private window should show the
// visual search menuitem, and clicking the item should load the visual search
// SERP in the same window.
add_task(async function private_noSeparatePrivateEngine() {
  await withPrivateWindow({
    callback: async win => {
      await setDefaultEngineAndClickMenuitem({
        win,
        defaultEngineId: "visual-search-1",
        expectedEngineNameInLabel: "Visual Search Engine 1",
        expectedBaseUrl: "https://example.com/visual-search-1",
      });
    },
  });
});

// With a separate private default engine that supports visual search,
// context-clicking an image in a private window should show the visual search
// menuitem for that engine, and clicking the item should load the visual search
// SERP for that engine in the same window.
add_task(async function private_separatePrivateEngine_visualSearch() {
  await withPrivateWindow({
    privateDefaultEngineId: "visual-search-2",
    callback: async win => {
      await setDefaultEngineAndClickMenuitem({
        win,
        defaultEngineId: "visual-search-1",
        expectedEngineNameInLabel: "Display Name Override Engine 2",
        expectedBaseUrl: "https://example.com/visual-search-2",
        shouldHaveNewBadge: true,
      });
    },
  });
});

// With a separate private default engine that does not support visual search,
// context-clicking an image in a private window should not show the visual
// search menuitem.
add_task(async function private_separatePrivateEngine_noVisualSearch() {
  await withPrivateWindow({
    privateDefaultEngineId: "no-visual-search",
    callback: async win => {
      await setDefaultEngineAndCheckMenu({
        win,
        defaultEngineId: "visual-search-1",
        shouldBeShown: false,
      });
    },
  });
});

// With visual search disabled and a default engine that supports visual search,
// context-clicking an image should not show the visual search menuitem.
add_task(async function visualSearchDisabled() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.search.visualSearch.featureGate", false]],
  });
  await setDefaultEngineAndCheckMenu({
    defaultEngineId: "visual-search-1",
    shouldBeShown: false,
  });
  await SpecialPowers.popPrefEnv();
});

// The "New" badge should be removed when the `isNewUntil` date passes.
add_task(async function newBadgeRemoved() {
  // First make sure the badge appears.
  await setDefaultEngineAndCheckMenu({
    defaultEngineId: "visual-search-2",
    shouldBeShown: true,
    expectedEngineNameInLabel: "Display Name Override Engine 2",
    shouldHaveNewBadge: true,
  });

  // Stub `Date().toISOString()` so it returns a newer date.
  let sandbox = sinon.createSandbox();
  let dateStub = sandbox.stub(
    Cu.getGlobalForObject(SearchEngine).Date.prototype,
    "toISOString"
  );
  dateStub.returns("2096-02-02");

  // The badge should not appear.
  await setDefaultEngineAndCheckMenu({
    defaultEngineId: "visual-search-2",
    shouldBeShown: true,
    expectedEngineNameInLabel: "Display Name Override Engine 2",
    shouldHaveNewBadge: false,
  });

  sandbox.restore();
});

async function setDefaultEngineAndCheckMenu({
  defaultEngineId,
  shouldBeShown,
  expectedEngineNameInLabel,
  win = window,
  selector = "#image",
  leaveOpen = false,
  shouldHaveNewBadge = false,
}) {
  let engine = SearchService.getEngineById(defaultEngineId);
  Assert.ok(engine, "Sanity check: Engine should exist: " + defaultEngineId);
  await SearchService.setDefault(engine, SearchService.CHANGE_REASON.UNKNOWN);

  let data = await openAndCheckMenu({
    win,
    shouldBeShown,
    expectedEngineNameInLabel,
    selector,
    shouldHaveNewBadge,
  });

  if (!leaveOpen) {
    await closeMenu({ win });
  }

  return data;
}

async function setDefaultEngineAndClickMenuitem({
  defaultEngineId,
  expectedEngineNameInLabel,
  expectedBaseUrl,
  win = window,
  shouldHaveNewBadge = false,
}) {
  let testTab = win.gBrowser.selectedTab;

  let { menu, item } = await setDefaultEngineAndCheckMenu({
    win,
    defaultEngineId,
    expectedEngineNameInLabel,
    shouldHaveNewBadge,
    shouldBeShown: true,
    leaveOpen: true,
  });

  // Click the visual search menuitem and wait for the SERP to load.
  let loadPromise = BrowserTestUtils.waitForNewTab(
    win.gBrowser,
    expectedBaseUrl + "?url=" + encodeURIComponent(IMAGE_URL),
    true
  );
  menu.activateItem(item);

  info("Waiting for visual search SERP to load");
  let serpTab = await loadPromise;
  info("Visual search SERP loaded");

  BrowserTestUtils.removeTab(serpTab);
  BrowserTestUtils.switchTab(win.gBrowser, testTab);
}

async function withPrivateWindow({ callback, privateDefaultEngineId = null }) {
  // Set the default private engine if requested.
  if (privateDefaultEngineId) {
    await SpecialPowers.pushPrefEnv({
      set: [
        ["browser.search.separatePrivateDefault", true],
        ["browser.search.separatePrivateDefault.ui.enabled", true],
      ],
    });

    let engine = SearchService.getEngineById(privateDefaultEngineId);
    Assert.ok(
      engine,
      "Sanity check: Engine should exist: " + privateDefaultEngineId
    );

    await SearchService.setDefaultPrivate(
      engine,
      SearchService.CHANGE_REASON.UNKNOWN
    );
  }

  // Open a new private window.
  let win = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });
  await BrowserTestUtils.openNewForegroundTab(win.gBrowser, TEST_PAGE_URL);

  // Call the callback.
  await callback(win);

  // Clean up.
  await BrowserTestUtils.closeWindow(win);
  if (privateDefaultEngineId) {
    await SpecialPowers.popPrefEnv();
  }
}

async function openAndCheckMenu({
  win,
  shouldBeShown,
  expectedEngineNameInLabel,
  selector,
  shouldHaveNewBadge = false,
}) {
  let selectorMatches = await SpecialPowers.spawn(
    win.gBrowser.selectedBrowser,
    [selector],
    async function (sel) {
      return !!content.document.querySelector(sel);
    }
  );
  Assert.ok(
    selectorMatches,
    "Sanity check: selector should match an element in the page: " + selector
  );

  let menu = win.document.getElementById(CONTEXT_MENU_ID);
  let popupPromise = BrowserTestUtils.waitForEvent(menu, "popupshown");

  info("Opening context menu");
  await BrowserTestUtils.synthesizeMouseAtCenter(
    selector,
    { type: "contextmenu", button: 2 },
    win.gBrowser.selectedBrowser
  );

  info("Waiting for context menu to open");
  await popupPromise;
  info("Context menu opened");

  let item = win.document.getElementById(VISUAL_SEARCH_MENUITEM_ID);
  Assert.ok(item, "The visual search menuitem should exist");
  Assert.equal(
    item.hidden,
    !shouldBeShown,
    "The visual search menuitem should be shown as expected"
  );
  if (shouldBeShown) {
    let expectedLabel = `Search Image with ${expectedEngineNameInLabel}`;
    await TestUtils.waitForCondition(
      () => item.label == expectedLabel,
      "Waiting for expected label to be set on item: " + expectedLabel
    );
    Assert.equal(
      item.label,
      expectedLabel,
      "The visual search menuitem should have the expected label"
    );
    await checkNewBadge({ item, shouldHaveNewBadge });
  }

  return { menu, item };
}

async function checkNewBadge({ item, shouldHaveNewBadge }) {
  if (!shouldHaveNewBadge) {
    Assert.ok(
      !item.hasAttribute("badge"),
      "The visual search menuitem should not have the New badge"
    );
    Assert.ok(
      !item.classList.contains("badge-new"),
      "The visual search menuitem should not have the badge-new class"
    );
    return;
  }

  await TestUtils.waitForCondition(
    () => item.hasAttribute("badge"),
    "Waiting for `badge` attribute to be set on item"
  );
  Assert.equal(
    item.getAttribute("badge"),
    "New",
    "The visual search menu item `badge` attribute should be 'New'"
  );
  Assert.ok(
    item.classList.contains("badge-new"),
    "The visual search menuitem should have the badge-new class"
  );
}

async function closeMenu({ win = window } = {}) {
  let menu = win.document.getElementById(CONTEXT_MENU_ID);
  let popupPromise = BrowserTestUtils.waitForEvent(menu, "popuphidden");

  info("Closing context menu");
  menu.hidePopup();

  info("Waiting for context menu to close");
  await popupPromise;
  info("Context menu closed");
}
