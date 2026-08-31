/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

// Bug 1986751: Content Provider can be slow to register on Android x86
async function waitForContentProvider(uri, timeoutMs = 5000) {
  let content = Cc[
    "@mozilla.org/network/android-content-input-stream;1"
  ].createInstance(Ci.nsIAndroidContentInputStream);

  // Wait for the content provider to be available
  await TestUtils.waitForCondition(
    () => {
      try {
        content.init(uri);
        return true;
      } catch (e) {
        if (e.result == Cr.NS_ERROR_FILE_ACCESS_DENIED) {
          info("Content provider not ready yet, retrying...");
          return false;
        }
        // Re-throw unexpected errors
        throw e;
      }
    },
    "Waiting for content provider to be available",
    100, // Check interval: 100ms
    timeoutMs / 100 // Max attempts
  );

  return content;
}

add_task(async function test_android_content_uri() {
  let uri = Services.io.newURI(
    "content://org.mozilla.geckoview.test_runner.provider/blob"
  );

  let content = await waitForContentProvider(uri);

  let sis = Cc["@mozilla.org/scriptableinputstream;1"].createInstance(
    Ci.nsIScriptableInputStream
  );
  sis.init(content);

  Assert.equal(sis.read(4), "ABCD", "data is valid");
});
