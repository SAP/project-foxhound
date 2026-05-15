/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_setup(async function () {
  Services.cookies.removeAll();
});

registerCleanupFunction(async function () {
  Services.cookies.removeAll();
});

// Test that cookies are set by fetch/XHR requests that get 302 responses:
// a. in the originating content process
// b. in a different conent process with same host+OA
// c. in the parent process
add_task(async function test_302_redirect_cookies_set_everywhere() {
  const kRoot = getRootDirectory(gTestPath).replace(
    "chrome://mochitests/content/",
    "https://example.com/"
  );
  const kRedirectURL = kRoot + "redirect_with_cookie.sjs";
  const kSimplePageURL = kRoot + "file_empty.html";

  // Open first tab and make the request that gets 302 redirect with Set-Cookie
  let tab1 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: kSimplePageURL,
    forceNewProcess: true,
  });
  await ContentTask.spawn(
    tab1.linkedBrowser,
    [kRedirectURL],
    async function (redirectURL) {
      // Verify no cookies yet
      Assert.equal(
        content.document.cookie,
        "",
        "No cookies should be set initially"
      );

      const response = await content.fetch(redirectURL);
      Assert.ok(
        response.url.includes("redirected=true"),
        "Fetch was redirected"
      );

      // Verify cookie sent in originating content process
      Assert.equal(
        content.document.cookie,
        "test-cookie=redirect-value",
        "Cookie set from 302 redirect in first content process"
      );
    }
  );

  // Open second tab in different process
  let tab2 = await BrowserTestUtils.openNewForegroundTab({
    gBrowser,
    url: kSimplePageURL,
    forceNewProcess: true,
  });
  let browser2 = gBrowser.getBrowserForTab(tab2);

  // Verify cookie is accessible in second tab (different content process)
  await ContentTask.spawn(browser2, [], async function () {
    Assert.equal(
      content.document.cookie,
      "test-cookie=redirect-value",
      "Cookie visible in second content process"
    );
  });

  // Verify the cookie is visible from the parent process
  let cookies = Services.cookies.getCookiesFromHost(
    "example.com",
    browser2.contentPrincipal.originAttributes
  );
  let foundCookie = false;
  for (let cookie of cookies) {
    if (cookie.name === "test-cookie" && cookie.value === "redirect-value") {
      foundCookie = true;
      break;
    }
  }
  Assert.ok(
    foundCookie,
    "Cookie from 302 redirect is accessible from parent process"
  );

  // Clean up
  BrowserTestUtils.removeTab(tab1);
  BrowserTestUtils.removeTab(tab2);
});
