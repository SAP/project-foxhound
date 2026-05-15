"use strict";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DEFAULT_TOP_SITES: "resource://newtab/lib/TopSitesFeed.sys.mjs",
});

async function newtabWithSponsoredTopsites(callback = () => {}) {
  // Open about:newtab without using the default load listener
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:newtab",
    false
  );

  // Specially wait for potentially preloaded browsers
  let browser = tab.linkedBrowser;
  await waitForPreloaded(browser);

  // Wait for React to render something
  await BrowserTestUtils.waitForCondition(
    () =>
      SpecialPowers.spawn(
        browser,
        [],
        () => content.document.getElementById("root").children.length
      ),
    "Should render activity stream content"
  );

  await SpecialPowers.spawn(browser, [], callback);

  BrowserTestUtils.removeTab(tab);
}

add_setup(async function () {
  lazy.DEFAULT_TOP_SITES.push(
    {
      isDefault: true,
      url: "https://example.com/",
      hostname: "example",
      label: "Example Sponsor",
      show_sponsored_label: true,
      sponsored_position: 1,
      sponsored_tile_id: "test-tile-1",
      partner: "test",
      block_key: "test-tile-1",
      faviconSize: 16,
    },
    {
      isDefault: true,
      url: "https://example2.com/",
      hostname: "example2",
      label: "Example Sponsor",
      show_sponsored_label: true,
      sponsored_position: 2,
      sponsored_tile_id: "test-tile-2",
      partner: "test",
      block_key: "test-tile-2",
      faviconSize: 16,
    }
  );

  await pushPrefs([
    "browser.newtabpage.activity-stream.showSponsoredTopSites",
    true,
  ]);

  registerCleanupFunction(async () => {
    lazy.DEFAULT_TOP_SITES.length = 0;
  });
});

add_task(async function test_dismiss() {
  await newtabWithSponsoredTopsites(async () => {
    await ContentTaskUtils.waitForCondition(
      () =>
        content.document.querySelector(
          '.top-sites [data-is-sponsored-link="true"]'
        ),
      "Should find a visible sponsored topsite"
    );

    let topsitesList = content.document.querySelectorAll("li.top-site-outer");

    Assert.equal(topsitesList.length, 4, "Should have 4 topsites by default");

    const contextMenuDiv = content.document.querySelector(
      '.top-sites [data-is-sponsored-link="true"] + div'
    );

    const contextMenuButton = contextMenuDiv.querySelector(
      ".context-menu-button"
    );

    contextMenuButton.click();

    const contextMenu = contextMenuDiv.querySelector(".context-menu");

    const dismissButton = contextMenu.querySelector(
      "li.context-menu-item:nth-child(4) button"
    );

    dismissButton.click();

    await ContentTaskUtils.waitForCondition(
      () => content.document.querySelectorAll("li.top-site-outer").length === 3,
      "Should find only 3 topsites"
    );

    topsitesList = content.document.querySelectorAll("li.top-site-outer");

    Assert.equal(
      topsitesList.length,
      3,
      "Should have 3 topsites after dismiss"
    );
  });

  Services.prefs.clearUserPref(
    "browser.newtabpage.activity-stream.unifiedAds.blockedAds"
  );
  Services.prefs.clearUserPref("browser.topsites.blockedSponsors");
  Services.prefs.clearUserPref("browser.newtabpage.blocked");
});
