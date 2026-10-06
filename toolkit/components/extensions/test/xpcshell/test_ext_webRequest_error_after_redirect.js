"use strict";

const server = createHttpServer({ hosts: ["example.com"] });
const BASE_URL = "http://example.com";

// 307 preserves the PUT method through the redirect (302 would change it to GET).
server.registerPathHandler("/start-307", (request, response) => {
  response.setStatusLine(request.httpVersion, 307, "Temporary Redirect");
  response.setHeader("Location", `${BASE_URL}/put-redirect-target`);
});
// Close the connection without sending any HTTP response. For a PUT request,
// nsHttpTransaction::ParseHead() returns an ignored error without setting
// mHaveAllHeaders, so nsHttpTransaction::Close() completes with mStatus=NS_OK
// and mResponseHead=null. This is the edge case ChannelWrapper::
// ActivityErrorFallbackCheck() detects, firing NS_ERROR_NET_ON_RECEIVING_FROM.
// See also: test_ext_webRequest_error_no_response.js
server.registerPathHandler("/put-redirect-target", (request, response) => {
  response.seizePower();
  response.finish();
});

add_task(async function test_error_occurred_after_redirect() {
  const extension = ExtensionTestUtils.loadExtension({
    manifest: { permissions: ["webRequest", `${BASE_URL}/`] },
    background() {
      browser.webRequest.onErrorOccurred.addListener(
        details => browser.test.sendMessage("error-occurred", details),
        { urls: ["<all_urls>"] }
      );
      browser.test.onMessage.addListener(async url => {
        try {
          await fetch(url, { method: "PUT", body: "test" });
        } catch (e) {
          // Expected: server closes without sending a response.
        }
      });
    },
  });

  await extension.startup();
  extension.sendMessage(`${BASE_URL}/start-307`);

  const { url, error } = await extension.awaitMessage("error-occurred");
  equal(
    url,
    `${BASE_URL}/put-redirect-target`,
    "onErrorOccurred fires for redirect target, not original URL"
  );
  // See test_ext_webRequest_error_no_response.js for the explanation of why
  // the expected error differs between OOP and in-process mode.
  const expectedError = WebExtensionPolicy.useRemoteWebExtensions
    ? "NS_ERROR_NET_ON_RECEIVING_FROM"
    : "NS_ERROR_NOT_AVAILABLE";
  equal(
    error,
    expectedError,
    "ActivityErrorFallbackCheck fires the expected error after redirect"
  );

  await extension.unload();
});
