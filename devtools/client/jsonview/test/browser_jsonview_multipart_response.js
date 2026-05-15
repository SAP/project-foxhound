/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Check that the JSON Viewer won't be loaded for mulipart responses and that the JSON
// file will be downloaded instead.

const TEST_MULTIPART_URL = URL_ROOT_SSL + "json_multipart.sjs";

add_task(async function test_json_in_multipart_response() {
  const onDownload = waitUntilDownload();
  const tab = await addTab(TEST_MULTIPART_URL, { waitForLoad: false });

  info("Await for download to be done");
  const filePath = await onDownload;
  ok(!!filePath, "JSON file was downloaded");

  info("Clear downloaded file");
  await resetDownloads();

  // The multipart response waits a bit before sending the HTML part, let's wait for a bit
  // so the response would have the time to settle.
  await wait(2000);

  info("Check that tab doesn't get the resource://devtools origin");
  await ContentTask.spawn(tab.linkedBrowser, [], async function () {
    // The origin is "null", but it may be example.org if we weren't throwing JSON Converter.
    Assert.notEqual(
      content.origin,
      "resource://devtools",
      "The second document within this mixed replace request isn't gaining JSON Viewer origin"
    );
  });

  BrowserTestUtils.removeTab(tab);
});
