/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOMEPAGE_PREF = "browser.startup.homepage";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });
});

add_task(
  async function test_unknown_extension_url_falls_back_to_raw_in_custom_list() {
    let url = "moz-extension://fake-no-policy-id/page.html";
    await SpecialPowers.pushPrefEnv({
      set: [[HOMEPAGE_PREF, `${url}|https://example.com`]],
    });

    let { doc, tab } = await openCustomHomepageSubpage();

    await BrowserTestUtils.waitForCondition(
      () => doc.querySelectorAll("moz-box-item[data-url]").length === 2,
      "Wait for both URLs to render"
    );

    let extItem = doc.querySelector(
      'moz-box-item[data-url^="moz-extension://"]'
    );
    ok(extItem, "Found the moz-extension URL item");
    is(
      extItem.getAttribute("label"),
      `Extension (${url})`,
      "Falls back to showing the URL inside the Extension (...) wrapper when the extension is not installed"
    );

    BrowserTestUtils.removeTab(tab);
  }
);
