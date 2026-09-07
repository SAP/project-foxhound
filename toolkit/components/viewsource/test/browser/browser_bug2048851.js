"use strict";

/**
 * Crashtest for bug 2048851.
 * A cross-origin navigation has the previous page as principal to inherit.
 * When viewing as page source, the load should not reference that principal.
 */
add_task(async function test_view_source_after_cross_origin_navigation() {
  const TEST_PAGE =
    "https://example.com/browser/toolkit/components/viewsource/test/browser/file_bug2048851.html";

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_PAGE,
    },
    async function (browser) {
      let loaded = BrowserTestUtils.browserLoaded(
        browser,
        false,
        "https://example.org/"
      );
      await BrowserTestUtils.synthesizeMouseAtCenter("#link", {}, browser);
      await loaded;

      let sourceTab = await openViewSourceForBrowser(browser);
      let sourceBrowser = sourceTab.linkedBrowser;

      await SpecialPowers.spawn(sourceBrowser, [], async function () {
        Assert.equal(
          content.document.body.id,
          "viewsource",
          "View source mode enabled"
        );
      });

      BrowserTestUtils.removeTab(sourceTab);
    }
  );
});
