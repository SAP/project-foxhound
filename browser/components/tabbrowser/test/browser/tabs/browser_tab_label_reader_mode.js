/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

add_task(
  async function test_page_title_resembling_reader_url_updates_tab_label() {
    await BrowserTestUtils.withNewTab("about:blank", async browser => {
      let tab = gBrowser.getTabForBrowser(browser);

      await SpecialPowers.spawn(browser, [], () => {
        content.document.title = "about:reader?url=https://example.com";
      });

      await BrowserTestUtils.waitForMutationCondition(
        tab,
        { attributeFilter: ["label"] },
        () => tab.label === "about:reader?url=https://example.com"
      );

      Assert.equal(
        tab.label,
        "about:reader?url=https://example.com",
        "Content title resembling a reader URL is not filtered"
      );
    });
  }
);

add_task(async function test_reader_mode_tab_label_shows_article_title() {
  let articleURL = TEST_PATH + "file_reader_mode_article.html";

  await BrowserTestUtils.withNewTab(articleURL, async browser => {
    let tab = gBrowser.getTabForBrowser(browser);

    await BrowserTestUtils.waitForCondition(
      () => browser.isArticle,
      "Article page should be detected as readable"
    );

    let readerURL = "about:reader?url=" + encodeURIComponent(articleURL);
    let readerLoaded = BrowserTestUtils.browserLoaded(browser, false, url =>
      url.startsWith("about:reader")
    );

    BrowserTestUtils.loadURIString({ browser, uriString: readerURL });
    await readerLoaded;
    await BrowserTestUtils.waitForMutationCondition(
      tab,
      { attributeFilter: ["label"] },
      () => tab.label === "Article title"
    );

    Assert.ok(
      !tab.label.startsWith("about:reader?url="),
      "The about:reader URL should never appear as the tab label"
    );

    Assert.equal(
      tab.label,
      "Article title",
      "Tab label shows the article title in reader mode"
    );
  });
});
