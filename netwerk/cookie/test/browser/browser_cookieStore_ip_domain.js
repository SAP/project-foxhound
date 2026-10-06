"use strict";

const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

async function testCookieStoreSetDomain(host) {
  let certOverrideService = Cc[
    "@mozilla.org/security/certoverride;1"
  ].getService(Ci.nsICertOverrideService);
  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    true
  );

  let server = new NodeHTTPSServer();
  await server.start();

  await server.registerPathHandler("/content", function handler(req, resp) {
    let body = `
      <!DOCTYPE HTML>
      <html>
        <head>
          <meta charset='utf-8'>
          <title>CookieStore IP domain test</title>
        </head>
        <body></body>
      </html>`;
    resp.setHeader("Content-Type", "text/html");
    resp.setHeader("Content-Length", body.length.toString());
    resp.writeHead(200);
    resp.end(body);
  });

  let serverPort = server.port();
  let testURL = `https://${host}:${serverPort}/content`;

  let tab = BrowserTestUtils.addTab(gBrowser, testURL);
  gBrowser.selectedTab = tab;
  let browser = gBrowser.getBrowserForTab(tab);
  await BrowserTestUtils.browserLoaded(browser);

  await SpecialPowers.spawn(browser, [host], async contentHost => {
    ok(content.isSecureContext, "Loopback address is a secure context");
    ok(content.cookieStore, "cookieStore is available");

    // Setting a cookie with domain equal to the host should succeed.
    await content.cookieStore.set({
      name: "ip_test",
      value: "value",
      domain: contentHost,
    });
    let cookie = await content.cookieStore.get("ip_test");
    is(cookie?.value, "value", "Cookie was set with domain " + contentHost);

    // Cookie set via cookieStore should be visible via document.cookie.
    ok(
      content.document.cookie.includes("ip_test=value"),
      "cookieStore cookie visible in document.cookie for " + contentHost
    );

    // Clean up.
    await content.cookieStore.delete({ name: "ip_test", domain: contentHost });

    // Set a cookie via document.cookie and retrieve it via cookieStore.
    content.document.cookie = "doc_test=docvalue; Secure";
    let docCookie = await content.cookieStore.get("doc_test");
    is(
      docCookie?.value,
      "docvalue",
      "document.cookie cookie visible in cookieStore for " + contentHost
    );

    // Also verify round-trip via document.cookie itself.
    ok(
      content.document.cookie.includes("doc_test=docvalue"),
      "document.cookie round-trip works for " + contentHost
    );

    // Clean up.
    content.document.cookie =
      "doc_test=; Secure; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  BrowserTestUtils.removeTab(tab);
  await server.stop();
  certOverrideService.setDisableAllSecurityChecksAndLetAttackersInterceptMyData(
    false
  );
}

add_task(async function test_cookieStore_set_domain_ipv4() {
  await testCookieStoreSetDomain("127.0.0.1");
});

add_task(async function test_cookieStore_set_domain_ipv6() {
  await testCookieStoreSetDomain("[::1]");
});

add_task(async function test_cookieStore_set_domain_localhost() {
  await testCookieStoreSetDomain("localhost");
});
