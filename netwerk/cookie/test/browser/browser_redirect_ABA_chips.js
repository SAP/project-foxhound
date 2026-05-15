/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const FIRST_PARTY_DOMAIN = "https://example.com/";
const THIRD_PARTY_DOMAIN = "https://example.org/";

const FIRST_PARTY_PAGE = FIRST_PARTY_DOMAIN + TEST_PATH + "file_empty.html";
const THIRD_PARTY_PAGE = THIRD_PARTY_DOMAIN + TEST_PATH + "file_empty.html";
const FIRST_PARTY_PAGE_CORS =
  FIRST_PARTY_DOMAIN + TEST_PATH + "set_cookie_cors.html";

add_setup(async () => {
  await SpecialPowers.pushPrefEnv({
    set: [
      [
        "network.cookie.cookieBehavior",
        Ci.nsICookieService.BEHAVIOR_REJECT_TRACKER_AND_PARTITION_FOREIGN,
      ],
      ["network.cookie.CHIPS.enabled", true],
    ],
  });

  registerCleanupFunction(async () => {
    await new Promise(resolve => {
      Services.clearData.deleteData(Ci.nsIClearDataService.CLEAR_ALL, () =>
        resolve()
      );
    });
  });
});

add_task(async () => {
  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    FIRST_PARTY_PAGE
  );

  const browser = tab.linkedBrowser;

  // Load a third-party iframe.
  let iframeBC = await SpecialPowers.spawn(
    browser,
    [THIRD_PARTY_PAGE],
    async src => {
      const iframe = content.document.createElement("iframe");

      await new content.Promise(resolve => {
        iframe.onload = resolve;

        iframe.src = src;
        content.document.body.appendChild(iframe);
      });

      return iframe.browsingContext;
    }
  );

  // Register a service worker in the third-party iframe.
  await SpecialPowers.spawn(iframeBC, [FIRST_PARTY_PAGE_CORS], async src => {
    let reg = await content.navigator.serviceWorker.register("sw_fetch.js");

    await ContentTaskUtils.waitForCondition(() => {
      return reg.active && reg.active.state === "activated";
    }, "The service worker is activated");

    // Trigger a fetch which should be intercepted by the service worker. The
    // fetch will be redirected to the first-party page to set a cookie.
    await content.fetch("redirect_301.sjs?src=" + src);

    ok(true, "The fetch is completed without a crash.");

    // Clean up the service worker to avoid leaking control into later tests.
    await reg.unregister();
  });

  BrowserTestUtils.removeTab(tab);
});
