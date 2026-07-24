/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

add_task(async function testHostnameDisplayedCorrectly() {
  const { HttpServer } = ChromeUtils.importESModule(
    "resource://testing-common/httpd.sys.mjs"
  );

  const server = new HttpServer();
  registerCleanupFunction(() => new Promise(resolve => server.stop(resolve)));
  server.registerPathHandler("/auth", (request, response) => {
    response.setStatusLine(request.httpVersion, 401, "Unauthorized");
    response.setHeader("WWW-Authenticate", 'Basic realm="test"', false);
  });
  server.start(-1);
  const port = server.identity.primaryPort;
  server.identity.add("http", "localhost", port);

  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.security.https_first", false],
      ["network.http.basic_http_auth.enabled", false],
      ["browser.http.blank_page_with_error_response.enabled", true],
      ["security.certerrors.felt-privacy-v1", true],
    ],
  });
  registerCleanupFunction(() => SpecialPowers.popPrefEnv());

  const url = `http://localhost:${port}/auth`;
  info(`Checking URL (${url}) against displayed hostname.`);
  await BrowserTestUtils.withNewTab(
    { gBrowser, url, waitForLoad: false },
    async browser => {
      await BrowserTestUtils.waitForErrorPage(browser);
      await SpecialPowers.spawn(browser, [port], async p => {
        const netErrorCard = await ContentTaskUtils.waitForCondition(
          () =>
            content.document.querySelector("net-error-card")?.wrappedJSObject
        );
        await netErrorCard.getUpdateComplete();

        Assert.equal(
          netErrorCard.errorConfig.errorCode,
          "NS_ERROR_BASIC_HTTP_AUTH_DISABLED",
          "Shows HTTP auth disabled error"
        );
        Assert.equal(
          netErrorCard.hostname,
          `localhost:${p}`,
          "Hostname includes the port once"
        );
      });
    }
  );
});
