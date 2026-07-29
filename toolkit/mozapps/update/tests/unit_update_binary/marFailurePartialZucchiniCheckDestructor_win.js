/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Zucchini Partial MAR File Patch Apply CHECK Destructor Test */

async function run_test() {
  if (!setupTestCommon()) {
    return;
  }
  const destructorMarkerLog = "MOZ_TEST_ZUCCHINI_DTOR_MARKER";
  const checkFailureEnv = "MOZ_TEST_ZUCCHINI_CHECK_FAILURE";
  const hadCheckFailureEnv = Services.env.exists(checkFailureEnv);
  const originalCheckFailureEnv = hadCheckFailureEnv
    ? Services.env.get(checkFailureEnv)
    : "";
  const destructorMarkerEnv = "MOZ_TEST_ZUCCHINI_DTOR_MARKER";
  const hadDestructorMarkerEnv = Services.env.exists(destructorMarkerEnv);
  const originalDestructorMarkerEnv = hadDestructorMarkerEnv
    ? Services.env.get(destructorMarkerEnv)
    : "";
  Services.env.set(checkFailureEnv, "1");
  Services.env.set(destructorMarkerEnv, "1");
  registerCleanupFunction(() => {
    Services.env.set(
      checkFailureEnv,
      hadCheckFailureEnv ? originalCheckFailureEnv : ""
    );
    Services.env.set(
      destructorMarkerEnv,
      hadDestructorMarkerEnv ? originalDestructorMarkerEnv : ""
    );
  });
  gTestFiles = gTestFilesPartialSuccess;
  gTestDirs = gTestDirsPartialSuccess;
  setTestFilesAndDirsForFailure();
  await setupUpdaterTest(FILE_PARTIAL_ZUCCHINI_MAR, false);
  runUpdate(STATE_FAILED_UNEXPECTED_BSPATCH_ERROR, false, 1, true);
  checkAppBundleModTime();
  await testPostUpdateProcessing();
  checkPostUpdateRunningFile(false);
  checkFilesAfterUpdateFailure(getApplyDirFile);
  checkUpdateLogContains(destructorMarkerLog);
  await waitForUpdateXMLFiles();
  await checkUpdateManager(
    STATE_NONE,
    false,
    STATE_FAILED,
    UNEXPECTED_BSPATCH_ERROR,
    1
  );
  checkCallbackLog();
}
