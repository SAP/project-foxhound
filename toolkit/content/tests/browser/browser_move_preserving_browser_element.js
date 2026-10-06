/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * Check that the browser element can be moved with moveBefore without breaking
 * the behavior of the <browser> or <tab>.
 */
add_task(async function test_moveBefore_api() {
  await BrowserTestUtils.withNewTab("https://example.com/", async browser => {
    await SpecialPowers.spawn(browser, [], async () => {
      // Modify from original, so that if the content were to reload
      // unexpectedly, that we would detect it.
      content.document.body.textContent = "Preserve me pls";
    });

    browser.parentNode.moveBefore(browser, browser.nextSibling);
    let actual = await SpecialPowers.spawn(browser, [], async () => {
      return content.document.body.textContent;
    });
    is(actual, "Preserve me pls", "<browser> content should be preserved");
  });
});
