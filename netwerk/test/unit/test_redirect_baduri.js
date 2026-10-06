"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

/*
 * Test whether we fail bad URIs in HTTP redirect as CORRUPTED_CONTENT.
 */

async function test_redirect(location) {
  const PATH = "/BadRedirect";

  function handler(metadata, response) {
    response.setStatusLine(metadata.httpVersion, 301, "Moved");
    response.setHeader("Location", location, false);
  }

  let httpServer = new HttpServer();
  httpServer.registerPathHandler(PATH, handler);
  httpServer.start(-1);

  const url = "http://localhost:" + httpServer.identity.primaryPort + PATH;
  const chan = NetUtil.newChannel({ uri: url, loadUsingSystemPrincipal: true });
  const request = await new Promise(resolve => {
    chan.asyncOpen(new ChannelListener(resolve, null, CL_EXPECT_FAILURE));
  });

  Assert.equal(request.status, Cr.NS_ERROR_CORRUPTED_CONTENT);

  await new Promise(resolve => httpServer.stop(resolve));
}

add_task(async function test_bad_http_uri() {
  // '>' in URI will fail to parse: we should not render response
  await test_redirect("http://localhost:4444>BadRedirect");
});

add_task(async function test_bad_resource_1() {
  await test_redirect("resource://");
});

add_task(async function test_bad_resource_2() {
  await test_redirect("resource://xxx/");
});

add_task(async function test_bad_ws() {
  await test_redirect("ws://localhost/");
});

add_task(async function test_bad_wss() {
  await test_redirect("wss://localhost/");
});
