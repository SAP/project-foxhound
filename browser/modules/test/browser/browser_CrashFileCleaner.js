"use strict";

/**
 * Tests for `CrashFileCleaner`, the periodic cleaner that prunes stale
 * crash-related files.
 */

const { CrashFileCleaner } = ChromeUtils.importESModule(
  "resource:///modules/ContentCrashHandlers.sys.mjs"
);

const { makeFakeAppDir } = ChromeUtils.importESModule(
  "resource://testing-common/AppData.sys.mjs"
);

const DAY = 24 * 60 * 60 * 1000;

const ENABLED_PREF = "browser.crashReports.cleanupCheck.enabled";
const LAST_DATE_PREF = "browser.crashReports.cleanupCheck.lastDate";

function getCrashSubDir(...subdirs) {
  return FileUtils.getDir("ProfD", ["UAppData", "Crash Reports", ...subdirs]);
}

function getPendingDir() {
  return getCrashSubDir("pending");
}

function getSubmittedDir() {
  return getCrashSubDir("submitted");
}

function getReportsRootDir() {
  return getCrashSubDir();
}

/**
 * Removes every file from the crash report directories used by this suite
 * (pending, submitted, and the root) without descending into siblings like
 * `events/`.
 */
async function clearAllCrashFiles() {
  for (const dir of [getPendingDir(), getSubmittedDir(), getReportsRootDir()]) {
    if (!dir.exists() || !dir.isDirectory()) {
      continue;
    }
    let entries = dir.directoryEntries;
    while (entries.hasMoreElements()) {
      let entry = entries.nextFile;
      if (entry.isFile()) {
        entry.remove(false);
      }
    }
  }
}

function newUuid() {
  let uuid = Services.uuid.generateUUID().toString();
  // Strip the surrounding braces.
  return uuid.substring(1, uuid.length - 1);
}

/**
 * Create a simple empty file at the requested location and stamp the given
 * modification time onto it.
 *
 * @param {nsIFile} dir
 * @param {string} filename
 * @param {Date|number} mtime
 * @returns {Promise<string>} the created file path
 */
async function _createFile(dir, filename, mtime) {
  const path = PathUtils.join(dir.path, filename);
  await IOUtils.write(path, new Uint8Array());
  const ms = mtime instanceof Date ? mtime.valueOf() : mtime;
  await IOUtils.setModificationTime(path, ms);
  return path;
}

/**
 * Creates a stub pending crash report (`.dmp` + `.extra`) for the given UUID
 * and stamps the requested last-modified time onto both files.
 *
 * @param {string} uuid
 * @param {Date|number} mtime When the report should look like it was last
 *                            modified (milliseconds since epoch or Date).
 * @returns {Promise<{ dmp: string, extra: string }>}
 */
async function createPendingReport(uuid, mtime) {
  const dir = getPendingDir();
  const dmp = await _createFile(dir, uuid + ".dmp", mtime);
  const extra = await _createFile(dir, uuid + ".extra", mtime);
  return { dmp, extra };
}

/**
 * Creates a stub `bp-<uuid>.txt` submitted-report record stamped with the
 * supplied mtime.
 *
 * @param {string} uuid
 * @param {Date|number} mtime
 * @returns {Promise<string>} the created file path
 */
async function createSubmittedReport(uuid, mtime) {
  return await _createFile(getSubmittedDir(), "bp-" + uuid + ".txt", mtime);
}

/**
 * Creates an `InstallTime<buildID>` marker directly under the crash reports
 * root, stamped with the given mtime.
 *
 * @param {string} buildID
 * @param {Date|number} mtime
 * @returns {Promise<string>} the created file path
 */
async function createInstallTimeFile(buildID, mtime) {
  return await _createFile(getReportsRootDir(), "InstallTime" + buildID, mtime);
}

/**
 * Resets the cleaner so each test starts from a known state
 */
function resetCleaner() {
  CrashFileCleaner.uninit();
  Services.prefs.clearUserPref(LAST_DATE_PREF);
  CrashFileCleaner.init();
}

add_setup(async function () {
  await makeFakeAppDir();

  // BrowserGlue arms CrashFileCleaner on startup; cancel that timer so it
  // doesn't fire mid-test.
  CrashFileCleaner.uninit();

  await SpecialPowers.pushPrefEnv({
    set: [[ENABLED_PREF, true]],
  });

  registerCleanupFunction(async () => {
    CrashFileCleaner.uninit();
    Services.prefs.clearUserPref(LAST_DATE_PREF);
    await clearAllCrashFiles();
  });
});

add_task(async function test_pruneInstallTimeMarkers() {
  await clearAllCrashFiles();

  const now = Date.now();
  const oldFile = await createInstallTimeFile(
    "20200101000000",
    now - 200 * DAY
  );
  const recentFile = await createInstallTimeFile(
    "20260101000000",
    now - 10 * DAY
  );

  await CrashFileCleaner.pruneInstallTimeMarkers();

  Assert.ok(!(await IOUtils.exists(oldFile)));
  Assert.ok(await IOUtils.exists(recentFile));
});

add_task(async function test_pruneOldReports() {
  await clearAllCrashFiles();

  const now = Date.now();
  const oldSubmittedId = newUuid();
  const oldPendingId = newUuid();
  const recentSubmittedId = newUuid();
  const recentPendingId = newUuid();
  const oldFiles = await createPendingReport(oldPendingId, now - 200 * DAY);
  oldFiles.submitted = await createSubmittedReport(
    oldSubmittedId,
    now - 200 * DAY
  );
  const recentFiles = await createPendingReport(
    recentPendingId,
    now - 10 * DAY
  );
  recentFiles.submitted = await createSubmittedReport(
    recentSubmittedId,
    now - 10 * DAY
  );

  await CrashFileCleaner.pruneOldReports();

  for (const key in oldFiles) {
    Assert.ok(!(await IOUtils.exists(oldFiles[key])));
  }
  for (const key in recentFiles) {
    Assert.ok(await IOUtils.exists(recentFiles[key]));
  }
});

add_task(async function test_enforcePendingCap() {
  await clearAllCrashFiles();

  const now = Date.now();
  const created = [];
  for (let i = 0; i < 35; i++) {
    // All recent enough to escape the age sweep; vary mtime so we can
    // identify which 30 should survive.
    created.push({
      id: newUuid(),
      mtime: now - i * 60 * 1000, // 1 minute apart, descending
    });
  }
  for (const { id, mtime } of created) {
    await createPendingReport(id, mtime);
  }

  await CrashFileCleaner.enforcePendingCap();

  // The 30 newest should survive (the first 30 in `created`, since later
  // indices have older mtimes).
  for (let i = 0; i < 30; i++) {
    const dmp = PathUtils.join(getPendingDir().path, created[i].id + ".dmp");
    Assert.ok(await IOUtils.exists(dmp));
  }
  for (let i = 30; i < 35; i++) {
    const dmp = PathUtils.join(getPendingDir().path, created[i].id + ".dmp");
    Assert.ok(!(await IOUtils.exists(dmp)));
  }
});

add_task(async function test_runCleanup_skipped_when_recent_run() {
  await clearAllCrashFiles();
  resetCleaner();

  const now = Date.now();
  const oldFile = await createInstallTimeFile(
    "20200101000000",
    now - 200 * DAY
  );

  await CrashFileCleaner.runCleanup();
  Assert.ok(!(await IOUtils.exists(oldFile)));

  // Recreate the same file: a second back-to-back run should NOT touch it.
  const sentinel = await createInstallTimeFile(
    "20200101000000",
    now - 200 * DAY
  );
  await CrashFileCleaner.runCleanup();
  Assert.ok(await IOUtils.exists(sentinel));
});

add_task(async function test_runCleanup_short_circuits_when_disabled() {
  await clearAllCrashFiles();
  CrashFileCleaner.uninit();
  Services.prefs.clearUserPref(LAST_DATE_PREF);

  await SpecialPowers.pushPrefEnv({ set: [[ENABLED_PREF, false]] });
  CrashFileCleaner.init();

  const now = Date.now();
  const oldFile = await createInstallTimeFile(
    "20200101000000",
    now - 200 * DAY
  );

  await CrashFileCleaner.runCleanup();

  Assert.ok(await IOUtils.exists(oldFile));

  await SpecialPowers.popPrefEnv();
});
