"use strict";

const { HttpServer } = ChromeUtils.importESModule(
  "resource://testing-common/httpd.sys.mjs"
);

/*
 * Test whether we fail bad URIs in HTTP redirect as CORRUPTED_CONTENT.
 */

var httpServer = null;

var BadRedirectPath = "/BadRedirect";
ChromeUtils.defineLazyGetter(this, "BadRedirectURI", function () {
  return (
    "http://localhost:" + httpServer.identity.primaryPort + BadRedirectPath
  );
});

function make_channel(url) {
  return NetUtil.newChannel({ uri: url, loadUsingSystemPrincipal: true });
}

function BadRedirectHandler(metadata, response) {
  response.setStatusLine(metadata.httpVersion, 301, "Moved");
  // '>' in URI will fail to parse: we should not render response
  response.setHeader("Location", "http://localhost:4444>BadRedirect", false);
}

function checkFailed(request) {
  Assert.equal(request.status, Cr.NS_ERROR_CORRUPTED_CONTENT);

  httpServer.stop(do_test_finished);
}

function run_test() {
  httpServer = new HttpServer();
  httpServer.registerPathHandler(BadRedirectPath, BadRedirectHandler);
  httpServer.start(-1);

  var chan = make_channel(BadRedirectURI);
  chan.asyncOpen(new ChannelListener(checkFailed, null, CL_EXPECT_FAILURE));
  do_test_pending();
}
