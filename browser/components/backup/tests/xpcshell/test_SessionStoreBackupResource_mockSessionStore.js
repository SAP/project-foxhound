/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/**
 * This tests that SessionStore backups contain the info that we want and do
 * not contain info we don't want.  This is separate from
 * test_SessionStoreBackupResource because that uses the real SessionStore
 * service and can only check what that includes.  This test adds things that
 * are not usually testable in xpcshell tests, like window session state
 * serialization.  It is based on test_SessionStoreBackupResource.js.
 */

const { SessionStoreBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/SessionStoreBackupResource.sys.mjs"
);

const mockSessionStore = {
  getCurrentState: _ignored => {
    return {
      cookies: [],
      windows: [
        {
          tabs: [
            {
              someData: "hi I am data, I will get serialized",
              moreData: -3.7,
              storage: {
                message: "I don't get serialized!",
              },
            },
            {
              stillMoreData: -3.71,
              storage: {
                message: "I don't get serialized either!",
              },
            },
          ],
          _closedTabs: [
            {
              state: {
                closedTabData: "hi I am a closed tab",
                moreData: -3.7,
                storage: {
                  message: "I don't get serialized!",
                },
              },
              etc: {
                dataNotInState: true,
              },
            },
            {
              state: {
                storage: {
                  message: "I don't get serialized either!",
                },
              },
            },
          ],
        },
        {
          tabs: [
            {
              someData: "hi I am window #2's data, I will get serialized",
              moreData: -3.7,
              storage: {
                message: "I don't get serialized!",
              },
            },
          ],
          _closedTabs: [
            {
              state: {
                storage: {
                  message: "I don't get serialized either!",
                },
              },
              notState: {
                notStateData: "not state data",
              },
            },
          ],
        },
        {
          tabs: [
            {
              someData: "hi I am the private window's data",
              storage: {
                message: "I don't get serialized!",
              },
            },
          ],
          isPrivate: true,
          _closedTabs: [],
        },
        {
          tabs: [
            {
              someData: "hi I am the private window #2's data",
              storage: {
                message: "I don't get serialized!",
              },
            },
          ],
          isPrivate: true,
          _closedTabs: [],
        },
      ],
      savedGroups: [
        {
          tabs: [
            {
              state: {
                savedGroupData: -3.7,
                storage: {
                  message: "I don't get serialized!",
                },
              },
            },
            {
              state: {
                someData: "hi I am window #2's data",
                moreData: -3.71,
                // tab has no storage
              },
            },
          ],
          notTabData: "notTabData",
        },
      ],
    };
  },
};

// This is mockSessionStore but with the data that should not be saved removed.
let filteredMockSessionData;
let sessionStoreBackupResource;

add_setup(() => {
  // let's use the SessionStoreBackupResource's filtering
  sessionStoreBackupResource = new SessionStoreBackupResource(mockSessionStore);

  filteredMockSessionData =
    sessionStoreBackupResource.filteredSessionStoreState;
});

/**
 * Test that the backup method properly serializes window session state.  This
 * includes checking that it does NOT serialize window storage state.
 */
add_task(async function test_backups_have_correct_window_state() {
  let sandbox = sinon.createSandbox();

  let sourcePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SessionStoreBackupResource-src"
  );
  let stagingPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SessionStoreBackupResource-stage"
  );

  // This "filtered" session store state is what we expect to write.  It should
  // not include any WebStorage items.
  // Quick sanity-check that the filtering was done correctly and we will still
  // serialize windows.
  Assert.equal(
    filteredMockSessionData.windows.length,
    2,
    "will serialize only 2 windows, since we don't backup private window sessions"
  );
  Assert.equal(
    filteredMockSessionData.windows[0].tabs.length,
    2,
    "will serialize 2 tabs for 1st window"
  );
  Assert.equal(
    filteredMockSessionData.windows[0].tabs[0].storage,
    undefined,
    "does not contain win 0 tab storage"
  );
  Assert.equal(
    filteredMockSessionData.windows[0]._closedTabs[0].storage,
    undefined,
    "does not contain win 0 closed tab storage"
  );
  Assert.equal(
    filteredMockSessionData.savedGroups.length,
    1,
    "will serialize 1 savedGroup"
  );
  Assert.equal(
    filteredMockSessionData.savedGroups[0].tabs.length,
    2,
    "will serialize 2 savedGroup tabs"
  );

  let manifestEntry = await sessionStoreBackupResource.backup(
    stagingPath,
    sourcePath,
    false /* isEncrypted */
  );
  Assert.equal(
    manifestEntry,
    null,
    "SessionStoreBackupResource.backup should return null as its ManifestEntry"
  );

  /**
   * We don't expect the actual file sessionstore.jsonlz4 to exist in the profile directory before calling the backup method.
   * Instead, verify that it is created by the backup method and exists in the staging folder right after.
   */
  await assertFilesExist(stagingPath, [{ path: "sessionstore.jsonlz4" }]);

  /**
   * Do a deep comparison between the filtered session state before backup
   * and contents of the file made in the staging folder, to verify that
   * information about session state was correctly written for backup.
   */
  let sessionStoreStateStaged = await IOUtils.readJSON(
    PathUtils.join(stagingPath, "sessionstore.jsonlz4"),
    { decompress: true }
  );

  Assert.deepEqual(
    sessionStoreStateStaged,
    filteredMockSessionData,
    "sessionstore.jsonlz4 in the staging folder matches the recorded session state"
  );

  await maybeRemovePath(stagingPath);
  await maybeRemovePath(sourcePath);

  sandbox.restore();
});

/**
 * Minor test that the recover method correctly copies the session store from
 * the recovery directory into the destination profile directory.
 */
add_task(async function test_recover() {
  let recoveryPath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SessionStoreBackupResource-recover"
  );
  let destProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "SessionStoreBackupResource-restored-profile"
  );

  // We backup a copy of sessionstore.jsonlz4, so ensure it exists in the recovery path
  let sessionStoreBackupPath = PathUtils.join(
    recoveryPath,
    "sessionstore.jsonlz4"
  );
  await IOUtils.writeJSON(sessionStoreBackupPath, filteredMockSessionData, {
    compress: true,
  });

  // The backup method is expected to have returned a null ManifestEntry
  let postRecoveryEntry = await sessionStoreBackupResource.recover(
    null /* manifestEntry */,
    recoveryPath,
    destProfilePath
  );
  Assert.equal(
    postRecoveryEntry,
    null,
    "SessionStoreBackupResource.recover should return null as its post recovery entry"
  );

  await assertFilesExist(destProfilePath, [{ path: "sessionstore.jsonlz4" }]);

  let sessionStateCopied = await IOUtils.readJSON(
    PathUtils.join(destProfilePath, "sessionstore.jsonlz4"),
    { decompress: true }
  );

  Assert.deepEqual(
    sessionStateCopied,
    filteredMockSessionData,
    "sessionstore.jsonlz4 in the destination profile folder matches the backed up session state"
  );

  await maybeRemovePath(recoveryPath);
  await maybeRemovePath(destProfilePath);
});
