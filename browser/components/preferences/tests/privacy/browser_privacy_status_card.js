/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const CARD_NAME = "security-privacy-card";

add_task(async function test_section_hidden_when_feature_flag_disabled() {
  await SpecialPowers.pushPrefEnv({
    set: RESET_PROBLEMATIC_TEST_STATUSES,
  });

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:preferences#privacy" },
    async function (browser) {
      let elements = browser.contentDocument.getElementsByTagName(CARD_NAME);
      Assert.equal(elements.length, 0, "No card present in preferences");
    }
  );

  await SpecialPowers.popPrefEnv();
});
