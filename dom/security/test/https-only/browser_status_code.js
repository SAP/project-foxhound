/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  // eslint-disable-next-line @microsoft/sdl/no-insecure-url
  "http://example.com"
);

async function runTest(code, hasBody) {
  const url = `${TEST_PATH}file_status_code.sjs?code=${code}&body=${hasBody ? "1" : "0"}`;
  const desc = `${code} ${hasBody ? "with" : "without"} body`;

  const tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    "about:blank"
  );
  const browser = tab.linkedBrowser;

  const loaded = Promise.race([
    BrowserTestUtils.waitForErrorPage(browser),
    BrowserTestUtils.browserLoaded(browser),
  ]);
  BrowserTestUtils.startLoadingURIString(browser, url);
  await loaded;

  is(browser.currentURI.scheme, "https", `Should remain on HTTPS for ${desc}`);

  await SpecialPowers.spawn(
    browser,
    [code, hasBody],
    async function (statusCode, withBody) {
      const innerHTML = content.document.body.innerHTML;
      ok(
        !innerHTML.includes("about-httpsonly-title-alert"),
        `Should not show HTTPS-Only error page for ${statusCode}`
      );
      if (withBody) {
        ok(
          innerHTML.includes(`status=${statusCode}`),
          `Should show response body for ${statusCode}`
        );
      }
    }
  );

  BrowserTestUtils.removeTab(tab);
}

add_task(async function test_status_code() {
  await SpecialPowers.pushPrefEnv({
    set: [["dom.security.https_only_mode", true]],
  });

  for (const code of [200, 400, 404, 500, 503]) {
    await runTest(code, true);
    await runTest(code, false);
  }
});
