/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);

const { MockFilePicker } = SpecialPowers;

/**
 * Asserts the UI telemetry for the element
 * that matches the provided ID depending on whether
 * the `browser.settings-redesign.enabled` pref is enabled.
 *
 * @param {string} id - ID of element to check
 * @param {number} count - The amount of times the telemetry should have been triggered
 * @param {string} message - Assertion message
 */
async function assertTelemetry(id, count, message) {
  if (SpecialPowers.getBoolPref("browser.settings-redesign.enabled", false)) {
    await Services.fog.testFlushAllChildren();
    Assert.equal(
      Glean.browserUiInteraction.preferencesPaneDownloads[id].testGetValue(),
      count,
      message
    );
  } else {
    TelemetryTestUtils.assertKeyedScalar(
      TelemetryTestUtils.getProcessScalars("parent", true, false),
      "browser.ui.interaction.preferences_paneGeneral",
      id,
      count
    );
  }
}

add_task(async function testSelectDownloadDir() {
  await Services.fog.testFlushAllChildren();
  Services.fog.testResetFOG();
  Services.telemetry.clearScalars();

  // Setup
  const tempDirPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "test_downloads"
  );
  const tempDir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
  tempDir.initWithPath(tempDirPath);
  const downloadsDirPath = await Downloads.getSystemDownloadsDirectory();
  const downloadsDir = new FileUtils.File(downloadsDirPath);

  await SpecialPowers.pushPrefEnv({
    set: [
      ["browser.download.folderList", 1],
      ["browser.download.dir", downloadsDirPath],
    ],
  });
  await openDownloadsOrPreferencesPane();

  let win = gBrowser.selectedBrowser.contentWindow;
  let doc = gBrowser.contentDocument;
  await doc.l10n.ready;

  let inputFolder = doc.getElementById("chooseFolder");
  let button = inputFolder.chooseFolderButtonEl;
  button.scrollIntoView({ block: "center" });

  // Get Downloads folder details
  const [downloadsFolderName] = await doc.l10n.formatValues([
    { id: "downloads-folder-name" },
  ]);
  let downloadsDirLeafName;
  try {
    downloadsDirLeafName = downloadsDir.leafName;
  } catch (ex) {
    /* ignored */
  }
  let downloadsFolderDisplayValue =
    downloadsDirLeafName == downloadsFolderName
      ? downloadsFolderName
      : `\u2066${downloadsDirPath}\u2069`;

  // Initialize file picker
  MockFilePicker.init();
  MockFilePicker.returnValue = MockFilePicker.returnOK;

  function mockFilePickerWithDirectory(dir) {
    return new Promise(resolve => {
      MockFilePicker.showCallback = () => {
        ok(true, `FilePicker shown for ${dir.path}`);
        MockFilePicker.setFiles([dir]);
        resolve();
      };
    });
  }

  async function selectDirectory(dir) {
    const pickerPromise = mockFilePickerWithDirectory(dir);
    const changeEvent = BrowserTestUtils.waitForEvent(inputFolder, "change");

    EventUtils.synthesizeMouseAtCenter(button, {}, win);
    await pickerPromise;
    await changeEvent;
    await inputFolder.updateComplete;
    await TestUtils.waitForTick();
  }

  // Check initial state
  is(
    inputFolder.value,
    downloadsDirPath,
    "Initial input folder value is set to the Downloads folder path"
  );
  is(
    inputFolder.displayValue,
    downloadsFolderDisplayValue,
    "Initial display value of the input folder is set to Downloads"
  );

  // Select temp dir
  await selectDirectory(tempDir);

  is(
    inputFolder.value,
    tempDirPath,
    "Input folder value is set to the temporary folder path"
  );
  ok(
    inputFolder.displayValue.includes("test_downloads"),
    "Input folder displayValue is set to the temporary folder path"
  );

  // Assert telemetry after first interaction
  await assertTelemetry(
    "chooseFolder",
    1,
    "chooseFolder interaction should be recorded once"
  );

  // Select Downloads again
  await selectDirectory(downloadsDir);
  is(
    inputFolder.value,
    downloadsDirPath,
    "Input folder value is set to the Downloads folder path"
  );
  is(
    inputFolder.displayValue,
    downloadsFolderDisplayValue,
    "Display value of the input folder is set to Downloads"
  );

  // Reassert telemetry
  await assertTelemetry(
    "chooseFolder",
    2,
    "chooseFolder interaction should be recorded twice"
  );

  // Cleanup
  MockFilePicker.cleanup();
  await IOUtils.remove(tempDirPath, { recursive: true });
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
