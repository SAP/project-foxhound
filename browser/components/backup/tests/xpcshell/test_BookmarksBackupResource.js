/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { BookmarksBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/BookmarksBackupResource.sys.mjs"
);
const { BookmarkJSONUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/BookmarkJSONUtils.sys.mjs"
);

/**
 * Test that the backup method correctly creates a compressed bookmarks JSON file.
 */
add_task(async function test_backup() {
  let sandbox = sinon.createSandbox();

  let bookmarksBackupResource = new BookmarksBackupResource();
  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "BookmarksBackupResource-source-test"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "BookmarksBackupResource-staging-test"
  );

  let exportStub = sandbox.stub(BookmarkJSONUtils, "exportToFile").resolves();

  let manifestEntry = await bookmarksBackupResource.backup(
    stagingPath,
    sourcePath
  );
  Assert.equal(
    manifestEntry,
    null,
    "BookmarksBackupResource.backup should return null as its ManifestEntry"
  );

  Assert.ok(
    exportStub.calledOnce,
    "BookmarkJSONUtils.exportToFile should have been called once"
  );
  Assert.ok(
    exportStub.calledWith(PathUtils.join(stagingPath, "bookmarks.jsonlz4"), {
      compress: true,
    }),
    "BookmarkJSONUtils.exportToFile should have been called with the correct arguments"
  );

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
});

/**
 * Test that the recover method correctly returns the path to the bookmarks backup file.
 */
add_task(async function test_recover() {
  let bookmarksBackupResource = new BookmarksBackupResource();
  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "BookmarksBackupResource-recovery-test"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "BookmarksBackupResource-test-profile"
  );

  await createTestFiles(recoveryPath, [{ path: "bookmarks.jsonlz4" }]);

  let postRecoveryEntry = await bookmarksBackupResource.recover(
    null,
    recoveryPath,
    destProfilePath
  );

  let expectedBookmarksPath = PathUtils.join(recoveryPath, "bookmarks.jsonlz4");

  Assert.deepEqual(
    postRecoveryEntry,
    { bookmarksBackupPath: expectedBookmarksPath },
    "BookmarksBackupResource.recover should return the path to the bookmarks backup file"
  );

  // The bookmarks file should not be copied to the destination profile during recovery,
  // it will be imported in postRecovery
  Assert.ok(
    !(await IOUtils.exists(
      PathUtils.join(destProfilePath, "bookmarks.jsonlz4")
    )),
    "bookmarks.jsonlz4 should not exist in the destination profile yet"
  );

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
});

/**
 * Test that the postRecovery method correctly imports bookmarks from the backup file.
 */
add_task(async function test_postRecovery() {
  let sandbox = sinon.createSandbox();

  let bookmarksBackupResource = new BookmarksBackupResource();
  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "BookmarksBackupResource-recovery-test"
  );

  await createTestFiles(recoveryPath, [{ path: "bookmarks.jsonlz4" }]);

  let bookmarksBackupPath = PathUtils.join(recoveryPath, "bookmarks.jsonlz4");
  let importStub = sandbox
    .stub(BookmarkJSONUtils, "importFromFile")
    .resolves(true);

  await bookmarksBackupResource.postRecovery({ bookmarksBackupPath });

  Assert.ok(
    importStub.calledOnce,
    "BookmarkJSONUtils.importFromFile should have been called once"
  );
  Assert.ok(
    importStub.calledWith(bookmarksBackupPath, { replace: true }),
    "BookmarkJSONUtils.importFromFile should have been called with the correct arguments"
  );

  await maybeRemovePath(recoveryPath);

  sandbox.restore();
});

/**
 * Test that postRecovery handles missing bookmarksBackupPath gracefully.
 */
add_task(async function test_postRecovery_no_path() {
  let sandbox = sinon.createSandbox();

  let bookmarksBackupResource = new BookmarksBackupResource();
  let importStub = sandbox
    .stub(BookmarkJSONUtils, "importFromFile")
    .resolves(true);

  await bookmarksBackupResource.postRecovery(null);

  Assert.ok(
    importStub.notCalled,
    "BookmarkJSONUtils.importFromFile should not have been called with null postRecoveryEntry"
  );

  await bookmarksBackupResource.postRecovery({});

  Assert.ok(
    importStub.notCalled,
    "BookmarkJSONUtils.importFromFile should not have been called with empty postRecoveryEntry"
  );

  sandbox.restore();
});
