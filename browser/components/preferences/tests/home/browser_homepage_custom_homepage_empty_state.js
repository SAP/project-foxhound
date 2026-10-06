/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";
const DEFAULT_HOMEPAGE_URL = "about:home";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["identity.fxaccounts.account.device.name", ""]],
  });
});

add_task(async function test_empty_state_no_custom_urls() {
  await SpecialPowers.pushPrefEnv({
    set: [[HOMEPAGE_PREF, DEFAULT_HOMEPAGE_URL]],
  });

  let { doc, tab } = await openCustomHomepageSubpage();

  await TestUtils.waitForCondition(
    () => doc.querySelector("moz-box-item.description-deemphasized"),
    "Wait for empty state message to render"
  );

  let noResultsItem = doc.querySelector(
    "moz-box-item.description-deemphasized"
  );
  ok(noResultsItem, "No results message is displayed");

  await BrowserTestUtils.removeTab(tab);
});
