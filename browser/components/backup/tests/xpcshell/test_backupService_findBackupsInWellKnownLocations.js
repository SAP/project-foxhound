/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_task(
  async function test_findBackupsInWellKnownLocations_and_multipleFiles() {
    // make an isolated temp folder to act as the “default backup dir”
    const TEST_ROOT = await IOUtils.createUniqueDirectory(
      PathUtils.tempDir,
      "test-findBackupsInWellKnownLocations"
    );
    const BACKUP_DIR = PathUtils.join(TEST_ROOT, "Backups");
    await IOUtils.makeDirectory(BACKUP_DIR, { createAncestors: true });

    // A helper to write an empty (but “valid-looking”) backup file
    async function touch(fileName) {
      const p = PathUtils.join(BACKUP_DIR, fileName);
      await IOUtils.writeUTF8(p, "<!-- stub backup -->", {
        tmpPath: p + ".tmp",
      });
      return p;
    }
    Services.prefs.setStringPref("browser.backup.location", BACKUP_DIR);

    // Create the service and force it to search our temp folder instead of the real default
    let bs = new BackupService();
    let sandbox = sinon.createSandbox();

    // getBackupFileInfo should return without throwing to simulate
    // what happens when a valid backup file's validity is checked
    sandbox.stub(bs, "getBackupFileInfo").callsFake(async _filePath => {});

    // Sanity: the directory exists and is empty
    Assert.ok(await IOUtils.exists(BACKUP_DIR), "Backup directory exists");
    Assert.equal(
      (await IOUtils.getChildren(BACKUP_DIR)).length,
      0,
      "Folder is empty"
    );

    // 1) Single valid file -> findBackupsInWellKnownLocations should find it
    const ONE = "FirefoxBackup_one_20241201-1200.html";
    await touch(ONE);

    let result = await bs.findBackupsInWellKnownLocations();
    Assert.ok(result.found, "Found should be true with one candidate");
    Assert.equal(
      result.multipleBackupsFound,
      false,
      "multipleBackupsFound should be false"
    );
    // The service stores whatever IOUtils.getChildren returns; assert path ends with our file
    Assert.ok(
      result.backupFileToRestore && result.backupFileToRestore.endsWith(ONE),
      "backupFileToRestore should point at the single html file"
    );

    // 2) Add a second matching file -> well-known search should refuse to pick (validateFile=false)
    const TWO = "FirefoxBackup_two_20241202-1300.html";
    await touch(TWO);

    let result2 = await bs.findBackupsInWellKnownLocations();
    Assert.ok(
      !result2.found,
      "Found should be false when multiple candidates exist and validateFile=false"
    );
    Assert.equal(
      result2.multipleBackupsFound,
      true,
      "Should signal multipleBackupsFound"
    );
    Assert.equal(
      result2.backupFileToRestore,
      null,
      "No file chosen if multiple & not allowed"
    );

    // 3) Call the lower-level API with multipleFiles=true (still no validation)
    let { multipleBackupsFound } = await bs.findIfABackupFileExists({
      validateFile: false,
      multipleFiles: true, // allow choosing even if we see more than one
    });
    Assert.ok(!multipleBackupsFound, "Should not report multiple when allowed");

    // 4) With validateFile=true and multipleFiles=true, should select newest file,
    // but still report multipleBackupsFound=true
    let result3 = await bs.findBackupsInWellKnownLocations({
      validateFile: true,
      multipleFiles: true,
    });
    Assert.ok(
      result3.found,
      "Found should be true when validateFile=true and multiple files exist"
    );
    Assert.equal(
      result3.multipleBackupsFound,
      true,
      "Should signal multipleBackupsFound when validateFile=true and multipleFiles=true and multiple files exist"
    );
    Assert.ok(
      result3.backupFileToRestore && result3.backupFileToRestore.endsWith(TWO),
      "Should select the newest file when validateFile=true"
    );

    // Cleanup
    sandbox.restore();
    await IOUtils.remove(TEST_ROOT, { recursive: true });
  }
);
