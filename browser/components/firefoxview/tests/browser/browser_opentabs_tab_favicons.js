/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

const TEST_ROOT =
  "http://mochi.test:8888/browser/browser/base/content/test/favicons/";

const PAGE_WITH_FAVICON = TEST_ROOT + "file_with_favicon.html";
const FAVICON_ICO = TEST_ROOT + "file_generic_favicon.ico";

const PAGE_WITH_SVG_FAVICON = TEST_ROOT + "file_favicon_svg.html";
const SVG_FAVICON = TEST_ROOT + "file_favicon.svg";

const SVG_DATA_URL = `data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8c3R5bGU+CiAgICA6cm9vdCB7IGNvbG9yLXNjaGVtZTogbGlnaHQgZGFyazsgfQogICAgcmVjdCB7IGZpbGw6IGxpZ2h0LWRhcmsoZ3JlZW4sIGJsdWUpOyB9CiAgPC9zdHlsZT4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgLz4KPC9zdmc+Cg==`;

function waitForFavicon(browser, url) {
  return new Promise(resolve => {
    let listener = {
      onLinkIconAvailable(b, dataURI, iconURI) {
        if (b !== browser || iconURI != url) {
          return;
        }
        gBrowser.removeTabsProgressListener(listener);
        resolve();
      },
    };
    gBrowser.addTabsProgressListener(listener);
  });
}

function getFaviconBackgroundImage(rowEl) {
  let faviconEl = rowEl.shadowRoot.querySelector(".fxview-tab-row-favicon");
  let backgroundImage = faviconEl.style.backgroundImage;
  return /url\(\"([^"']+)/.exec(backgroundImage)[1];
}

add_task(async function test_normal_favicon() {
  clearHistory();
  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;
    await navigateToViewAndWait(document, "opentabs");

    let openTabs = document.querySelector("view-opentabs[name=opentabs]");

    let tab = await BrowserTestUtils.openNewForegroundTab(
      gBrowser,
      PAGE_WITH_FAVICON,
      true
    );

    await BrowserTestUtils.waitForCondition(
      () => tab.getAttribute("image"),
      "Waiting for the tab's favicon to load."
    );

    let tabChangeRaised = BrowserTestUtils.waitForEvent(
      NonPrivateTabs,
      "TabChange"
    );
    await switchToFxViewTab();
    await tabChangeRaised;
    await openTabs.updateComplete;

    const tabList = openTabs.viewCards[0].tabList;
    await BrowserTestUtils.waitForMutationCondition(
      tabList,
      { childList: true },
      () => tabList.rowEls.length
    );

    let rowEl = Array.from(tabList.rowEls).find(
      row => row.url === PAGE_WITH_FAVICON
    );
    ok(rowEl, "Found the row element for the page with favicon.");

    let backgroundImage = getFaviconBackgroundImage(rowEl);
    ok(backgroundImage, "The favicon element has a background image.");
    ok(
      backgroundImage.startsWith("data:image/png;base64,"),
      "Normal favicon is displayed as a data URI."
    );

    cleanupTabs();
  });
});

add_task(async function test_svg_favicon() {
  clearHistory();
  await SpecialPowers.pushPrefEnv({
    set: [["browser.tabs.remoteSVGIconDecoding", true]],
  });

  await withFirefoxView({}, async browser => {
    const { document } = browser.contentWindow;

    function cspListener() {
      ok(false, "Unexpected CSP securitypolicyviolation");
    }
    document.addEventListener("securitypolicyviolation", cspListener);

    await navigateToViewAndWait(document, "opentabs");

    let openTabs = document.querySelector("view-opentabs[name=opentabs]");

    let tab = await BrowserTestUtils.openNewForegroundTab({
      gBrowser,
      url: PAGE_WITH_SVG_FAVICON,
      waitForLoad: false,
    });
    await waitForFavicon(tab.linkedBrowser, SVG_FAVICON);

    let tabImageAttr = tab.getAttribute("image");
    ok(
      tabImageAttr?.startsWith("moz-remote-image://"),
      "SVG favicon tab image attribute uses moz-remote-image: protocol."
    );

    let tabChangeRaised = BrowserTestUtils.waitForEvent(
      NonPrivateTabs,
      "TabChange"
    );
    await switchToFxViewTab();
    await tabChangeRaised;
    await openTabs.updateComplete;

    const tabList = openTabs.viewCards[0].tabList;
    await BrowserTestUtils.waitForMutationCondition(
      tabList,
      { childList: true },
      () => tabList.rowEls.length
    );

    let rowEl = Array.from(tabList.rowEls).find(
      row => row.url === PAGE_WITH_SVG_FAVICON
    );
    ok(rowEl, "Found the row element for the page with SVG favicon.");

    let backgroundImage = getFaviconBackgroundImage(rowEl);
    ok(
      backgroundImage.startsWith("moz-remote-image://"),
      "SVG favicon in Firefox View uses moz-remote-image: protocol."
    );

    let url = new URL(backgroundImage);
    is(
      url.searchParams.get("url"),
      SVG_DATA_URL,
      "The moz-remote-image URL contains the correct SVG data URI."
    );

    cleanupTabs();

    document.removeEventListener("securitypolicyviolation", cspListener);
  });

  await SpecialPowers.popPrefEnv();
});
