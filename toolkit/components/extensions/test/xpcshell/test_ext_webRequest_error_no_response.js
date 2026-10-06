"use strict";

const server = createHttpServer({ hosts: ["example.com"] });
const BASE_URL = "http://example.com";

// Close the connection without sending any HTTP response. For a PUT request,
// nsHttpTransaction::ParseHead() returns an ignored error without setting
// mHaveAllHeaders, so nsHttpTransaction::Close() completes with mStatus=NS_OK
// and mResponseHead=null. This is the edge case ChannelWrapper::
// ActivityErrorFallbackCheck() detects, firing NS_ERROR_NET_ON_RECEIVING_FROM.
server.registerPathHandler("/put-target", (request, response) => {
  response.seizePower();
  response.finish();
});

add_task(async function test_error_occurred_no_response() {
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

  extension.sendMessage(`${BASE_URL}/put-target`);

  const { url, error } = await extension.awaitMessage("error-occurred");
  equal(
    url,
    `${BASE_URL}/put-target`,
    "onErrorOccurred fires for the right URL"
  );
  // In OOP mode, seizePower() + finish() causes the PUT channel to complete
  // with mStatus=NS_OK and no response headers, triggering
  // ActivityErrorFallbackCheck. In in-process mode, fetch() runs in the parent
  // process rather than through an extension process, which results in a
  // different channel error (NS_ERROR_NOT_AVAILABLE) that ErrorCheck catches.
  const expectedError = WebExtensionPolicy.useRemoteWebExtensions
    ? "NS_ERROR_NET_ON_RECEIVING_FROM"
    : "NS_ERROR_NOT_AVAILABLE";
  equal(error, expectedError, "onErrorOccurred carries the expected error");

  await extension.unload();
});
