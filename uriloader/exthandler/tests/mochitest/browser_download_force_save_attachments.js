/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const MIMEService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);
const HandlerService = Cc[
  "@mozilla.org/uriloader/handler-service;1"
].getService(Ci.nsIHandlerService);

const TEST_PATH = getRootDirectory(gTestPath).replace(
  "chrome://mochitests/content",
  "https://example.com"
);

const PDF_URL = TEST_PATH + "file_pdf_application_pdf.pdf";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.always_ask_before_handling_new_types", false],
      ["browser.download.useDownloadDir", true],
    ],
  });

  let mimeInfo = MIMEService.getFromTypeAndExtension("application/pdf", "pdf");
  let existed = HandlerService.exists(mimeInfo);

  mimeInfo.preferredAction = Ci.nsIHandlerInfo.handleInternally;
  mimeInfo.alwaysAskBeforeHandling = false;
  HandlerService.store(mimeInfo);

  registerCleanupFunction(async () => {
    let restoreInfo = MIMEService.getFromTypeAndExtension(
      "application/pdf",
      "pdf"
    );
    if (existed) {
      HandlerService.store(restoreInfo);
    } else {
      HandlerService.remove(restoreInfo);
    }
  });
});

async function cleanupDownload(download) {
  if (!download) {
    return;
  }
  try {
    if (Services.appinfo.OS === "WINNT") {
      await IOUtils.setPermissions(download.target.path, 0o600);
    }
    await IOUtils.remove(download.target.path);
  } catch (ex) {
    info("The file " + download.target.path + " is not removed, " + ex);
  }
}

/**
 * With browser.download.force_save_internally_handled_attachments enabled,
 * a PDF served with Content-Disposition: attachment should be saved to disk
 * without being opened in pdf.js, even when the preferred action for PDFs
 * is handleInternally.
 */
add_task(async function test_force_save_pdf_attachment() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.download.force_save_internally_handled_attachments", true]],
  });

  let publicList = await Downloads.getList(Downloads.PUBLIC);
  let downloadFinishedPromise = promiseDownloadFinished(publicList);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: "about:blank" },
    async browser => {
      BrowserTestUtils.startLoadingURIString(browser, PDF_URL);
      let download = await downloadFinishedPromise;

      Assert.ok(
        await IOUtils.exists(download.target.path),
        "The PDF should have been downloaded to disk."
      );
      Assert.ok(
        !download.handleInternally,
        "Download should not be flagged to open internally."
      );
      Assert.ok(
        !download.launchWhenSucceeded,
        "Download should not be configured to launch after completion."
      );

      await cleanupDownload(download);
    }
  );

  await publicList.removeFinished();
  await SpecialPowers.popPrefEnv();
});
