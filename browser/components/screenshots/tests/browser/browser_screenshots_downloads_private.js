/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(async function () {
  let tmpDir = PathUtils.join(
    PathUtils.tempDir,
    "testsavedir" + Math.floor(Math.random() * 2 ** 32)
  );
  await IOUtils.makeDirectory(tmpDir);
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.start_downloads_in_tmp_dir", true],
      ["browser.helperApps.deleteTempFileOnExit", true],
      ["browser.download.folderList", 2],
      ["browser.download.dir", tmpDir],
      ["browser.download.useDownloadDir", true],
    ],
  });
});

add_task(async function test_download_private_browsing() {
  let privateWin = await BrowserTestUtils.openNewBrowserWindow({
    private: true,
  });
  let privateBrowser = privateWin.gBrowser.selectedBrowser;
  BrowserTestUtils.startLoadingURIString(privateBrowser, TEST_PAGE);
  await BrowserTestUtils.browserLoaded(privateBrowser);

  let privateDownloads = await Downloads.getList(Downloads.PRIVATE);
  let downloadFinishedPromise = new Promise(resolve => {
    privateDownloads.addView({
      onDownloadChanged(download) {
        info("Download changed!");
        if (download.succeeded || download.error) {
          info("Download succeeded or errored");
          privateDownloads.removeView(this);
          resolve(download);
        }
      },
    });
  });

  let helper = new ScreenshotsHelper(privateBrowser);

  helper.triggerUIFromToolbar();
  await helper.waitForOverlay();

  let screenshotReady = TestUtils.topicObserved("screenshots-preview-ready");

  let panel = privateBrowser.ownerDocument.querySelector(helper.selector.panel);
  let visiblePageButton = panel
    .querySelector("screenshots-buttons")
    .shadowRoot.querySelector("#visible-page");
  visiblePageButton.click();

  await screenshotReady;

  let downloadButton = helper.getDialogButton("download");
  ok(downloadButton, "Got the download button");

  let screenshotExit = TestUtils.topicObserved("screenshots-exit");
  downloadButton.click();

  info("wait for download to finish");
  let download = await downloadFinishedPromise;

  ok(download.succeeded, "Download should succeed");
  ok(download.source.isPrivate, "Download source should be marked as private");

  let downloads = await privateDownloads.getAll();
  ok(
    downloads.some(d => d === download),
    "Download should be in the private list"
  );

  await privateDownloads.remove(download);
  await download.finalize(true);

  downloads = await privateDownloads.getAll();
  ok(
    !downloads.some(d => d === download),
    "Download should have been removed from the private list"
  );

  await screenshotExit;
  await BrowserTestUtils.closeWindow(privateWin);
});
