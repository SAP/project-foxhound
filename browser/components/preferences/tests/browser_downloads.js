/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let { TelemetryTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TelemetryTestUtils.sys.mjs"
);
const { MockFilePicker } = SpecialPowers;

add_task(async function testSelectDownloadDir() {
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

  // Open preferences pane
  await openPreferencesViaOpenPreferencesAPI("general", {
    leaveOpen: true,
  });

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
  MockFilePicker.init(window.browsingContext);
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
  TelemetryTestUtils.assertKeyedScalar(
    TelemetryTestUtils.getProcessScalars("parent", true, false),
    "browser.ui.interaction.preferences_paneGeneral",
    "chooseFolder",
    1
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
  TelemetryTestUtils.assertKeyedScalar(
    TelemetryTestUtils.getProcessScalars("parent", true, true),
    "browser.ui.interaction.preferences_paneGeneral",
    "chooseFolder",
    2
  );

  // Cleanup
  MockFilePicker.cleanup();
  await IOUtils.remove(tempDirPath, { recursive: true });
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
});
