/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const PREF_APP_UPDATE_LOCKEDOUT_COUNT = "app.update.lockedOut.count";
const PREF_APP_UPDATE_LOCKEDOUT_DEBOUNCETIME =
  "app.update.lockedOut.debounceTimeMs";
const PREF_APP_UPDATE_LOCKEDOUT_MAXCOUNT = "app.update.lockedOut.maxCount";
const PREF_APP_UPDATE_LOCKEDOUT_MAXAGE = "app.update.lockedOut.maxAgeMs";

const kMaxLockedOutCount = 10;
const kMaxStatusFileModifyAgeMs = 24 * 60 * 60 * 1000; // 1 day

add_setup(async function setup() {
  setupTestCommon();
  start_httpserver();
  setUpdateURL(gURLData + gHTTPHandlerPath);
  setUpdateChannel("test_channel");

  // FOG needs a profile directory to put its data in.
  do_get_profile();
  Services.fog.initializeFOG();
});

async function runLockedOutTest({
  isLockedOut,
  statusFileIsOld,
  lockoutsRemaining,
}) {
  await reloadUpdateManagerData();
  await reInitUpdateService();
  Services.fog.testResetFOG();

  const statusFile = getUpdateDirFile(FILE_UPDATE_STATUS);

  let lockoutCount = kMaxLockedOutCount - lockoutsRemaining;
  Services.prefs.setIntPref(PREF_APP_UPDATE_LOCKEDOUT_COUNT, lockoutCount);

  // Write an empty status file to ensure that the path exists.
  writeStatusFile("");
  if (statusFileIsOld) {
    await setFileModifiedAge(
      statusFile,
      Math.floor((2 * kMaxStatusFileModifyAgeMs) / 1000)
    );
  } else {
    await setFileModifiedAge(statusFile, 0);
  }
  let unlockStatusFile;
  if (isLockedOut) {
    unlockStatusFile = await holdFileOpen(statusFile, "r");
  } else {
    unlockStatusFile = async () => {};
  }

  const nextLockoutWillBeMax = lockoutsRemaining <= 1;
  const expectNotifyUser =
    isLockedOut && statusFileIsOld && nextLockoutWillBeMax;
  const badPermsObserverPromise = expectNotifyUser
    ? waitForEvent("update-error", "bad-perms")
    : Promise.resolve(true);
  const expectedDownloadStartResult = isLockedOut
    ? Ci.nsIApplicationUpdateService.DOWNLOAD_FAILURE_CANNOT_WRITE_STATE
    : Ci.nsIApplicationUpdateService.DOWNLOAD_SUCCESS;

  await downloadUpdate({ expectedDownloadStartResult });

  const badPermsObserverResult = await badPermsObserverPromise;
  Assert.ok(badPermsObserverResult);

  const newLockoutCount = Services.prefs.getIntPref(
    PREF_APP_UPDATE_LOCKEDOUT_COUNT,
    -1
  );
  if (!isLockedOut || expectNotifyUser) {
    Assert.equal(newLockoutCount, 0, "lockout count should reset");
  } else {
    Assert.equal(
      newLockoutCount,
      lockoutCount + 1,
      "lockout count should incremented"
    );
  }
  if (expectNotifyUser) {
    Assert.equal(
      Glean.update.stateWriteFailure.testGetValue(),
      1,
      "telemetry should be incremented"
    );
  } else {
    // Coerce the telemetry into an integer since this will generally return
    // `null`.
    Assert.equal(
      Number(Glean.update.stateWriteFailure.testGetValue()),
      0,
      "telemetry should not be incremented"
    );
  }

  await unlockStatusFile();
}

add_task(async function testAccessAndLockout() {
  Services.prefs.setIntPref(
    PREF_APP_UPDATE_LOCKEDOUT_MAXCOUNT,
    kMaxLockedOutCount
  );
  Services.prefs.setIntPref(PREF_APP_UPDATE_LOCKEDOUT_DEBOUNCETIME, 0);
  Services.prefs.setIntPref(
    PREF_APP_UPDATE_LOCKEDOUT_MAXAGE,
    kMaxStatusFileModifyAgeMs
  );

  await parameterizedTest(runLockedOutTest, {
    isLockedOut: [true, false],
    statusFileIsOld: [true, false],
    lockoutsRemaining: [1, 2],
  });

  await doTestFinish();
});
