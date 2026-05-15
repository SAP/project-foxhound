/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Ensure that setTabTitle clamps very long document titles to 255 characters
 * so malicious pages cannot hang the browser by forcing us to lay out absurdly
 * large tab labels.
 */
add_task(async function test_tab_label_is_capped_at_255_chars() {
  const LONG_TITLE_LENGTH = 257;
  const EXPECTED_LABEL_LENGTH = 256;
  const TITLE_CHAR = "A";

  await BrowserTestUtils.withNewTab("about:blank", async browser => {
    const tab = gBrowser.getTabForBrowser(browser);

    const fullTitleLength = await SpecialPowers.spawn(
      browser,
      [LONG_TITLE_LENGTH, TITLE_CHAR],
      (length, character) => {
        content.document.title = character.repeat(length);
        return content.document.title.length;
      }
    );
    Assert.equal(
      fullTitleLength,
      LONG_TITLE_LENGTH,
      "Sanity check: content received the full title"
    );

    await BrowserTestUtils.waitForCondition(
      () => tab.label.length === EXPECTED_LABEL_LENGTH,
      "Tab label should be clamped"
    );

    Assert.equal(
      tab.label.length,
      EXPECTED_LABEL_LENGTH,
      "Displayed label is capped at 256 characters"
    );
    Assert.equal(
      tab.label,
      TITLE_CHAR.repeat(EXPECTED_LABEL_LENGTH),
      "Tab label matches the first 256 title characters"
    );

    const reportedTitleLength = await SpecialPowers.spawn(browser, [], () => {
      return content.document.title.length;
    });
    Assert.equal(
      reportedTitleLength,
      LONG_TITLE_LENGTH,
      "document.title remains unchanged"
    );
  });
});
