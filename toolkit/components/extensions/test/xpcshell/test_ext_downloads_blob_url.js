/* -*- Mode: indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set sts=2 sw=2 et tw=80: */
"use strict";

// An arbitrary time, chosen to be long enough such that there is enough time
// to run the full implementation from processing the `downloads.download()`
// API call, up until the point where `downloads.download()` registers a
// "background-script-idle-waituntil" listener to suppress the suspension of
// the background context.
//
// As of writing, we reset the timer as usual before processing the API call at
// https://searchfox.org/firefox-main/rev/e1eada69e2ddd86a398ccb141dcbf772254162eb/toolkit/components/extensions/ExtensionParent.sys.mjs#1210-1223
// and do not perform any async work before calling `createTarget()` in
// ext-downloads.js. Execution of this will therefore not take much time
// in practice.
//
// In the unit test, we will artificially wait for twice the amount of time as
// specified here before returning from the MockFilePicker, to verify that the
// background context stays active, even if the API call takes longer than the
// specified idle timeout..
const SHORT_BG_IDLE_TIMEOUT = 500;

const { MockFilePicker } = ChromeUtils.importESModule(
  "resource://testing-common/MockFilePicker.sys.mjs"
);

let downloadDir;

add_setup(() => {
  // FOG needs a profile and to be initialized.
  do_get_profile();
  Services.fog.initializeFOG();
  Services.fog.testResetFOG();
});

add_setup(async function setup_MockFilePicker() {
  // MockFilePicker requires a window, so create a temporary one:
  const browser = Services.appShell.createWindowlessBrowser(true);
  MockFilePicker.init(browser.browsingContext);
  registerCleanupFunction(() => {
    MockFilePicker.cleanup();
    browser.close();
  });

  downloadDir = await IOUtils.createUniqueDirectory(PathUtils.tempDir, "dldir");
  registerCleanupFunction(async () => {
    try {
      await IOUtils.remove(downloadDir);
    } catch (e) {
      info(`Failed to remove ${downloadDir} because: ${e}`);
      // Downloaded files should have been deleted by tests.
      // Clean up + report error otherwise.
      let children = await IOUtils.getChildren(downloadDir).catch(e => e);
      ok(false, `Unexpected files in downloadDir: ${children}`);
      await IOUtils.remove(downloadDir, { recursive: true });
    }
  });
});

add_task(
  { pref_set: [["extensions.background.idle.timeout", SHORT_BG_IDLE_TIMEOUT]] },
  async function test_download_blob_with_slow_file_picker() {
    Services.fog.testResetFOG();

    let pickerShownCount = 0;
    const pickedFile = await IOUtils.getFile(downloadDir, "result.txt");
    MockFilePicker.showCallback = async () => {
      // This could fail if the event page unexpectedly started twice.
      equal(++pickerShownCount, 1, "File picker should show once");
      info(`Delaying file picker completion past background idle timeout`);
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      await new Promise(r => setTimeout(r, 2 * SHORT_BG_IDLE_TIMEOUT));
      info("Returning from file picker after background idle timeout passed");
      MockFilePicker.setFiles([pickedFile]);
      return MockFilePicker.returnOK;
    };
    const promisePickerAfterShown = new Promise(resolve => {
      MockFilePicker.afterOpenCallback = resolve;
    });

    let extension = ExtensionTestUtils.loadExtension({
      manifest: {
        manifest_version: 3,
        permissions: ["downloads"],
      },
      async background() {
        const blobUrl = URL.createObjectURL(new Blob(["1234567890123"]));
        browser.test.log(`Calling downloads.download with URL ${blobUrl}`);
        await browser.downloads.download({ url: blobUrl, saveAs: true });
        // TODO bug 2005952: if we revoke the URL immediately after
        // downloads.download() resolves, the download may fail if that is
        // processed before the blob:-URL is downloaded by the internals.
        // Test intermittently fails with --setenv=MOZ_CHAOSMODE=0xfb or
        // --verify.
        // TODO bug 2005952: uncomment upon fixing bug 2005952.
        // URL.revokeObjectURL(blobUrl);
        browser.test.sendMessage("download_done");
      },
    });

    await extension.startup();

    info("Waiting for file picker to have been shown.");
    await promisePickerAfterShown;

    equal(pickerShownCount, 1, "File picker was shown once");

    info(`Waiting until blob was saved to chosen file at ${pickedFile.path}`);
    await TestUtils.waitForCondition(
      async () => pickedFile.exists(),
      `downloads.download() should have saved blob to file: ${pickedFile.path}`
    );

    info(`Waiting until file was fully written`);
    // Note: clone() because fileSize is cached on Windows otherwise:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=2005953#c6
    await TestUtils.waitForCondition(() => pickedFile.clone().fileSize === 13);

    equal(
      await IOUtils.readUTF8(pickedFile.path),
      "1234567890123",
      "Content of blob was fully written"
    );

    // Note: it is not strictly necessary for the background script to stay
    // alive; what primarily matters is that the blob:-URL remains valid.
    // The easiest way to do so is extending the lifetime of the background in
    // that case (added in bug 2005953).
    // If blob:-URLs can outlive contexts, we do not need to wait for this.
    info("Confirming that background stayed alive whilst showing file picker");
    await extension.awaitMessage("download_done");

    await extension.unload();

    MockFilePicker.reset();
    pickedFile.remove(false);

    Assert.greater(
      Glean.extensionsCounters.eventPageIdleResult.downloads_saveAs.testGetValue(),
      0,
      "Postponed background idle timeout due to downloads.download() call"
    );
  }
);
