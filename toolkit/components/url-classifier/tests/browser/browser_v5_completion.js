/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const GETHASH_URL = "http://mochi.test:8888/" + TEST_PATH + "gethashV5.sjs?";
const MALWARE_URL = "https://malware.example.com/";

let { UrlClassifierTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/UrlClassifierTestUtils.sys.mjs"
);

add_setup(async _ => {
  SpecialPowers.pushPrefEnv({
    set: [
      ["browser.safebrowsing.provider.google5.enabled", true],
      [
        "browser.safebrowsing.provider.google5.excludeFromGoogleSafeBrowsingKeyCheck",
        true,
      ],
      ["browser.safebrowsing.provider.google5.gethashURL", GETHASH_URL],
    ],
  });
});

add_task(async function test_v5_completion() {
  await UrlClassifierTestUtils.addTestV5Entry();

  // Load the malware URL. This should trigger a V5 completion and block the
  // page.
  let tab = BrowserTestUtils.addTab(gBrowser, MALWARE_URL);

  // Wait for the page to be blocked.
  await BrowserTestUtils.waitForContentEvent(
    tab.linkedBrowser,
    "AboutBlockedLoaded",
    true,
    undefined,
    true
  );

  ok(true, "The page should be blocked.");

  await BrowserTestUtils.removeTab(tab);
  await UrlClassifierTestUtils.cleanupTestV5Entry();
});
