/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const HOME_KEY = "Home";
let gTestRoot;
let gFakeHomePath;
let gFakeHomeFile;

add_setup(async () => {
  gTestRoot = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "testResolveArchiveDestFolderPath"
  );
  gFakeHomePath = PathUtils.join(gTestRoot, "FakeHome");
  await IOUtils.makeDirectory(gFakeHomePath);

  gFakeHomeFile = await IOUtils.getFile(gFakeHomePath);

  let dirsvc = Services.dirsvc.QueryInterface(Ci.nsIProperties);
  let originalFile;
  try {
    originalFile = dirsvc.get(HOME_KEY, Ci.nsIFile);
    dirsvc.undefine(HOME_KEY);
  } catch (e) {
    // dirsvc.get will throw if nothing provides for the key and dirsvc.undefine
    // will throw if it's not a persistent entry, in either case we don't want
    // to set the original file in cleanup.
    originalFile = undefined;
  }

  dirsvc.set(HOME_KEY, gFakeHomeFile);
  registerCleanupFunction(() => {
    dirsvc.undefine(HOME_KEY);
    if (originalFile) {
      dirsvc.set(HOME_KEY, originalFile);
    }
  });
});

/**
 * Tests that we create the destination folder if the parent folder exists
 * and the destination folder does not.
 */
add_task(async function test_create_folder() {
  const PARENT_FOLDER = PathUtils.join(gTestRoot, "TestFolder");
  await IOUtils.makeDirectory(PARENT_FOLDER);
  let bs = new BackupService();

  const DESTINATION_PATH = PathUtils.join(
    PARENT_FOLDER,
    BackupService.BACKUP_DIR_NAME
  );
  let path = await bs.resolveArchiveDestFolderPath(DESTINATION_PATH);

  Assert.equal(path, DESTINATION_PATH, "Got back the expected folder path.");
  Assert.ok(await IOUtils.exists(path), "The destination folder was created.");
  Assert.equal(
    (await IOUtils.getChildren(path)).length,
    0,
    "Destination folder should be empty."
  );
  await IOUtils.remove(PARENT_FOLDER, { recursive: true });
});

/**
 * Tests that we will recreate the configured destination folder if the parent
 * folder does not exist. This recreates the entire configured folder
 * hierarchy.
 */
add_task(async function test_create_parent_folder_hierarchy() {
  const MISSING_PARENT_FOLDER = PathUtils.join(gTestRoot, "DoesNotExistYet");
  Assert.ok(
    !(await IOUtils.exists(MISSING_PARENT_FOLDER)),
    "Folder should not exist yet."
  );
  let bs = new BackupService();

  const CONFIGURED_DESTINATION_PATH = PathUtils.join(
    MISSING_PARENT_FOLDER,
    BackupService.BACKUP_DIR_NAME
  );
  let path = await bs.resolveArchiveDestFolderPath(CONFIGURED_DESTINATION_PATH);
  Assert.equal(
    path,
    CONFIGURED_DESTINATION_PATH,
    "Got back the expected folder path."
  );
  Assert.ok(await IOUtils.exists(path), "The destination folder was created.");

  await IOUtils.remove(MISSING_PARENT_FOLDER, { recursive: true });
});

/**
 * Tests that we return the destination folder if the parent folder exists
 * along with the destination folder.
 */
add_task(async function test_find_folder() {
  const PARENT_FOLDER = PathUtils.join(gTestRoot, "TestFolder");
  const DESTINATION_PATH = PathUtils.join(
    PARENT_FOLDER,
    BackupService.BACKUP_DIR_NAME
  );
  await IOUtils.makeDirectory(DESTINATION_PATH, { createAncestors: true });

  let bs = new BackupService();
  let path = await bs.resolveArchiveDestFolderPath(DESTINATION_PATH);

  Assert.equal(path, DESTINATION_PATH, "Got back the expected folder path.");
  Assert.ok(await IOUtils.exists(path), "The destination folder exists.");
  Assert.equal(
    (await IOUtils.getChildren(path)).length,
    0,
    "Destination folder should be empty."
  );
  await IOUtils.remove(PARENT_FOLDER, { recursive: true });
});
