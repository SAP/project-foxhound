/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

function getContentCanvasBg(browser) {
  return SpecialPowers.spawn(browser, [], () => {
    return content.windowUtils.canvasBackgroundColor;
  });
}

add_task(async function test_transparent_dynamic() {
  await BrowserTestUtils.withNewTab(
    `data:text/html,hello`,
    async function (browser) {
      is(
        await getContentCanvasBg(browser),
        "rgb(255, 255, 255)",
        "Content bg should be white"
      );
      browser.toggleAttribute("transparent", true);
      is(
        await getContentCanvasBg(browser),
        "rgba(0, 0, 0, 0)",
        "Content bg should be transparent"
      );
      browser.toggleAttribute("transparent", false);
      is(
        await getContentCanvasBg(browser),
        "rgb(255, 255, 255)",
        "Content bg should be white again"
      );
    }
  );
});
