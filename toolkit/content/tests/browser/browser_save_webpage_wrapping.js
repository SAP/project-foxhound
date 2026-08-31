"use strict";
// Test for Bug 2025300

const { FileTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/FileTestUtils.sys.mjs"
);

const PAGE =
  "chrome://mochitests/content/browser/toolkit/content/tests/browser/file_save_webpage_wrapping.html";

add_task(async () => {
  let targetFile = FileTestUtils.getTempFile("file_save_webpage_wrapping.html");
  SimpleTest.registerCleanupFunction(() => {
    if (targetFile.exists()) {
      targetFile.remove(false);
    }
  });
  await BrowserTestUtils.withNewTab({ gBrowser, url: PAGE }, async browser => {
    let doc = browser.contentDocument;
    await new Promise(resolve => {
      let persistArgs = {
        sourceURI: browser.currentURI,
        sourceOriginalURI: browser.currentURI,
        sourcePrincipal: doc.principal,
        sourceReferrerInfo: null,
        sourceDocument: doc,
        targetContentType: "text/html",
        targetFile,
        sourceCacheKey: null,
        sourcePostData: null,
        bypassCache: true,
        contentPolicyType: null,
        cookieJarSettings: null,
        isPrivate: false,
        saveCompleteCallback: async () => {
          let contents = await IOUtils.readUTF8(targetFile.path);
          ok(
            contents.includes("<j>jjjjjj</j>-jjjj"),
            "internalPersist should not wrap at dashes in HTML"
          );
          resolve();
        },
      };
      internalPersist(persistArgs);
    });
  });
});
