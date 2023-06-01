/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const MockFilePicker = SpecialPowers.MockFilePicker;

add_setup(async function() {
  let tmpDir = PathUtils.join(
    PathUtils.tempDir,
    "testsavedir" + Math.floor(Math.random() * 2 ** 32)
  );
  // Create this dir if it doesn't exist (ignores existing dirs)
  await IOUtils.makeDirectory(tmpDir);
  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.start_downloads_in_tmp_dir", true],
      ["browser.helperApps.deleteTempFileOnExit", true],
      ["browser.download.folderList", 2],
      ["browser.download.dir", tmpDir],
    ],
  });

  MockFilePicker.init(window);
  MockFilePicker.useAnyFile();
  MockFilePicker.returnValue = MockFilePicker.returnOK;

  registerCleanupFunction(async () => {
    Services.prefs.clearUserPref("browser.download.dir");
    Services.prefs.clearUserPref("browser.download.folderList");

    MockFilePicker.cleanup();
  });
});

function waitForFilePicker() {
  return new Promise(resolve => {
    MockFilePicker.showCallback = () => {
      MockFilePicker.showCallback = null;
      ok(true, "Saw the file picker");
      resolve();
    };
  });
}

add_task(async function test_download_without_filepicker() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.download.useDownloadDir", true]],
  });

  let publicDownloads = await Downloads.getList(Downloads.PUBLIC);
  // First ensure we catch the download finishing.
  let downloadFinishedPromise = new Promise(resolve => {
    publicDownloads.addView({
      onDownloadChanged(download) {
        info("Download changed!");
        if (download.succeeded || download.error) {
          info("Download succeeded or errored");
          publicDownloads.removeView(this);
          resolve(download);
        }
      },
    });
  });

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_PAGE,
    },
    async browser => {
      let helper = new ScreenshotsHelper(browser);

      helper.triggerUIFromToolbar();
      await helper.waitForOverlay();
      await helper.dragOverlay(10, 10, 500, 500);

      helper.clickDownloadButton();

      info("wait for download to finish");
      let download = await downloadFinishedPromise;

      ok(download.succeeded, "Download should succeed");

      await publicDownloads.removeFinished();
    }
  );
});

add_task(async function test_download_with_filepicker() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.download.useDownloadDir", false]],
  });

  let publicDownloads = await Downloads.getList(Downloads.PUBLIC);
  // First ensure we catch the download finishing.
  let downloadFinishedPromise = new Promise(resolve => {
    publicDownloads.addView({
      onDownloadChanged(download) {
        info("Download changed!");
        if (download.succeeded || download.error) {
          info("Download succeeded or errored");
          publicDownloads.removeView(this);
          resolve(download);
        }
      },
    });
  });

  await BrowserTestUtils.withNewTab(
    {
      gBrowser,
      url: TEST_PAGE,
    },
    async browser => {
      let helper = new ScreenshotsHelper(browser);

      helper.triggerUIFromToolbar();
      await helper.waitForOverlay();
      await helper.dragOverlay(10, 10, 500, 500);

      let filePicker = waitForFilePicker();

      helper.clickDownloadButton();

      await filePicker;
      ok(true, "Export file picker opened");

      info("wait for download to finish");
      let download = await downloadFinishedPromise;

      ok(download.succeeded, "Download should succeed");

      await publicDownloads.removeFinished();
    }
  );
});
