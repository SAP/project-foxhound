/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let CrashReports;

// Local helper to create an empty file
function _create_file(dir, filename, mtime) {
  const file = dir.clone();
  file.append(filename);
  file.create(Ci.nsIFile.NORMAL_FILE_TYPE, 0o644);
  file.lastModifiedTime = mtime;
  return file;
}

/**
 * Create a stub file for a crash that has already been submitted.
 *
 * @param {string} id — The UUID of the crash
 * @param {Date} mtime — The time of the crash, encoded as the file mtime
 *
 * @return {nsIFile} Handle to the created file.
 */
function create_submitted_file(id, mtime = Date.now()) {
  return _create_file(CrashReports.submittedDir, "bp-" + id + ".txt", mtime);
}

function _create_pending_base(id, mtime, ignored) {
  const dir = CrashReports.pendingDir;
  const dmp = _create_file(dir, id + ".dmp", mtime);
  const extra = _create_file(dir, id + ".extra", mtime);
  let ignore = null;
  if (ignored) {
    ignore = _create_file(dir, id + ".dmp.ignore", mtime);
  }
  return [dmp, extra, ignore];
}

/**
 * Create stub files in the pending crash directory.
 *
 * @param {string} id — the UUID of the crash
 * @param {Date} mtime — the time of the crash, encoded as the file mtime
 *
 * @return {[nsIFile, nsIFile, null]} Handles for the dmp and extra files
 */
function create_pending_files(id, mtime = Date.now()) {
  return _create_pending_base(id, mtime, /*ignored*/ false);
}

/**
 * Create stub files in the pending crash directory for a crash
 * that was ignored by the user.
 *
 * @param {string} id — the UUID of the crash
 * @param {Date} mtime — the time of the crash, encoded as the file mtime
 *
 * @return {[nsIFile, nsIFile, nsIFile]} Handles for dmp, extra and ignore files
 */
function create_ignored_files(id, mtime = Date.now()) {
  return _create_pending_base(id, mtime, /*ignored*/ true);
}

/**
 * Utility function to make sure the crash directories are
 * empty. Typically used at the beginning of a test to ensure
 * stable conditions.
 *
 */
function clear_crash_dirs() {
  for (let dir of [CrashReports.submittedDir, CrashReports.pendingDir]) {
    if (dir.exists() && dir.isDirectory()) {
      let entries = dir.directoryEntries;
      while (entries.hasMoreElements()) {
        let file = entries.nextFile;
        file.remove(false);
      }
    }
  }
}

/**
 * Removes every file directly under the crash reports root (`reportsDir`)
 * without descending into subdirectories. Used to clean InstallTime markers
 * to ensure stable conditions.
 */
function clear_reports_dir() {
  const dir = CrashReports.reportsDir;
  if (!dir.exists() || !dir.isDirectory()) {
    return;
  }
  let entries = dir.directoryEntries;
  while (entries.hasMoreElements()) {
    let entry = entries.nextFile;
    if (entry.isFile()) {
      entry.remove(false);
    }
  }
}

add_setup(async function () {
  do_get_profile();
  Services.prefs.setCharPref(
    "breakpad.reportURL",
    "https://example.com/report"
  );
  registerCleanupFunction(() => {
    clear_reports_dir();
    clear_crash_dirs();
    Services.prefs.clearUserPref("breakpad.reportURL");
  });

  // We need to setup the fake dirs *before* importing the tested module so that
  // its toplevel code points to it.
  await makeFakeAppDir();
  ({ CrashReports } = ChromeUtils.importESModule(
    "resource://gre/modules/CrashReports.sys.mjs"
  ));
});

// Trivial empty case
add_task(async function test_getReports_empty() {
  clear_crash_dirs();
  let reports = CrashReports.getReports();
  Assert.equal(reports.length, 0);
});

// A couple new crashes.
add_task(async function test_getReports_onlypending() {
  clear_crash_dirs();
  let now = Date.now();
  create_pending_files("00000001-1111-2222-3333-444444444444", now - 1000);
  create_pending_files("00000002-1111-2222-3333-444444444444", now);

  let reports = CrashReports.getReports();

  Assert.equal(reports.length, 2);
  Assert.ok(reports.every(r => r.pending));
  Assert.ok(reports.every(r => !r.ignored));
  Assert.deepEqual(
    reports.map(r => r.id),
    [
      "00000002-1111-2222-3333-444444444444",
      "00000001-1111-2222-3333-444444444444",
    ]
  );
});

// A couple crashes that were already seen but not submitted.
add_task(async function test_getReports_onlyignored() {
  clear_crash_dirs();
  let now = Date.now();
  create_ignored_files("00000001-1111-2222-3333-444444444444", now - 1000);
  create_ignored_files("00000002-1111-2222-3333-444444444444", now);

  let reports = CrashReports.getReports();

  Assert.equal(reports.length, 2);
  Assert.ok(reports.every(r => r.pending));
  Assert.ok(reports.every(r => r.ignored));
  Assert.deepEqual(
    reports.map(r => r.id),
    [
      "00000002-1111-2222-3333-444444444444",
      "00000001-1111-2222-3333-444444444444",
    ]
  );
});

// A couple of crashes that were submitted.
add_task(async function test_getReports_onlysubmitted() {
  clear_crash_dirs();
  let now = Date.now();
  create_submitted_file("00000001-1111-2222-3333-444444444444", now - 1000);
  create_submitted_file("00000002-1111-2222-3333-444444444444", now);

  let reports = CrashReports.getReports();

  Assert.equal(reports.length, 2);
  Assert.ok(reports.every(r => !r.pending));
  Assert.ok(reports.every(r => !r.ignored));
  Assert.deepEqual(
    reports.map(r => [r.id, r.date]),
    [
      ["bp-00000002-1111-2222-3333-444444444444", now],
      ["bp-00000001-1111-2222-3333-444444444444", now - 1000],
    ]
  );
});

// A bunch of reports all mixed together
add_task(async function test_getReports_mixed() {
  clear_crash_dirs();
  let now = Date.now();
  // Set time in different order to ensure sorting is done by date
  create_submitted_file("00000001-1111-2222-3333-444444444444", now - 1000);
  create_pending_files("00000002-1111-2222-3333-444444444444", now - 2000);
  create_pending_files("00000003-1111-2222-3333-444444444444", now);
  create_submitted_file("00000004-1111-2222-3333-444444444444", now - 500);
  create_ignored_files("00000005-1111-2222-3333-444444444444", now - 1500);
  create_pending_files("00000006-1111-2222-3333-444444444444", now - 3000);
  create_ignored_files("00000007-1111-2222-3333-444444444444", now - 3500);
  create_submitted_file("00000008-1111-2222-3333-444444444444", now - 2500);

  let reports = CrashReports.getReports();

  Assert.deepEqual(
    reports.map(r => [r.id, r.date, r.pending, r.ignored]),
    [
      ["00000003-1111-2222-3333-444444444444", now, true, false],
      ["bp-00000004-1111-2222-3333-444444444444", now - 500, false, false],
      ["bp-00000001-1111-2222-3333-444444444444", now - 1000, false, false],
      ["00000005-1111-2222-3333-444444444444", now - 1500, true, true],
      ["00000002-1111-2222-3333-444444444444", now - 2000, true, false],
      ["bp-00000008-1111-2222-3333-444444444444", now - 2500, false, false],
      ["00000006-1111-2222-3333-444444444444", now - 3000, true, false],
      ["00000007-1111-2222-3333-444444444444", now - 3500, true, true],
    ]
  );
});

// No report if the report URL is not HTTP.
add_task(async function test_getReports_nohttp() {
  clear_crash_dirs();
  create_submitted_file("00000001-1111-2222-3333-444444444444");
  create_pending_files("00000002-1111-2222-3333-444444444444");
  create_ignored_files("00000003-1111-2222-3333-444444444444");
  Services.prefs.setCharPref("breakpad.reportURL", "ftp://example.com/report");

  try {
    let reports = CrashReports.getReports();

    Assert.equal(reports.length, 0);
  } finally {
    Services.prefs.setCharPref(
      "breakpad.reportURL",
      "https://example.com/report"
    );
  }
});

// `pruneInstallTimeFiles` only deletes `InstallTime*` files older than the
// supplied threshold and ignores everything else in the directory.
add_task(async function test_pruneInstallTimeFiles() {
  clear_crash_dirs();
  clear_reports_dir();
  const now = Date.now();
  const old = now - 365 * 24 * 60 * 60 * 1000; // 1 year ago
  const recent = now - 10 * 60 * 1000; // 10 minutes ago

  const oldInstall = _create_file(
    CrashReports.reportsDir,
    "InstallTime20200101000000",
    old
  );
  const recentInstall = _create_file(
    CrashReports.reportsDir,
    "InstallTime20240101000000",
    recent
  );
  const unrelated = _create_file(CrashReports.reportsDir, "foo.txt", old);

  await CrashReports.pruneInstallTimeFiles(30 * 24 * 60 * 60 * 1000); // 30 days

  Assert.ok(!oldInstall.exists(), "Old InstallTime file was removed");
  Assert.ok(recentInstall.exists(), "Recent InstallTime file was preserved");
  Assert.ok(unrelated.exists(), "Non-InstallTime file was preserved");
});

// `pruneInstallTimeFiles` is a no-op when the crash reports directory does
// not exist (fresh profile case).
add_task(async function test_pruneInstallTimeFiles_missingDir() {
  const savedReportsDir = CrashReports.reportsDir;
  const missingDir = savedReportsDir.clone();
  missingDir.append("nonexistent-subdir");

  CrashReports.reportsDir = missingDir;
  try {
    await CrashReports.pruneInstallTimeFiles(30 * 24 * 60 * 60 * 1000);
  } finally {
    CrashReports.reportsDir = savedReportsDir;
  }
});

// `deletePendingReport` removes the `.dmp`, `.extra`, `.dmp.ignore`, and
// `.memory.json.gz` files belonging to a single crash, leaving siblings
// belonging to other crashes alone.
add_task(async function test_deletePendingReport() {
  clear_crash_dirs();
  const targetId = "00000001-1111-2222-3333-444444444444";
  const otherId = "00000002-1111-2222-3333-444444444444";

  const [targetDmp, targetExtra, targetIgnore] = _create_pending_base(
    targetId,
    Date.now(),
    /*ignored*/ true
  );
  const targetMemory = _create_file(
    CrashReports.pendingDir,
    targetId + ".memory.json.gz",
    Date.now()
  );
  const [otherDmp, otherExtra] = create_pending_files(otherId);

  await CrashReports.deletePendingReport(targetId);

  Assert.ok(!targetDmp.exists(), ".dmp was removed");
  Assert.ok(!targetExtra.exists(), ".extra was removed");
  Assert.ok(!targetIgnore.exists(), ".dmp.ignore was removed");
  Assert.ok(!targetMemory.exists(), ".memory.json.gz was removed");
  Assert.ok(otherDmp.exists(), "untargeted .dmp is preserved");
  Assert.ok(otherExtra.exists(), "untargeted .extra is preserved");
});

// `deletePendingReport` tolerates the optional companion files being absent.
add_task(async function test_deletePendingReport_partial() {
  clear_crash_dirs();
  const id = "00000001-1111-2222-3333-444444444444";
  const [dmp, extra] = create_pending_files(id);

  await CrashReports.deletePendingReport(id);

  Assert.ok(!dmp.exists());
  Assert.ok(!extra.exists());
});

// `deleteSubmittedReport` removes only the targeted `bp-<id>.txt`.
add_task(async function test_deleteSubmittedReport() {
  clear_crash_dirs();
  const a = create_submitted_file("00000001-1111-2222-3333-444444444444");
  const b = create_submitted_file("00000002-1111-2222-3333-444444444444");

  await CrashReports.deleteSubmittedReport(
    "bp-00000001-1111-2222-3333-444444444444"
  );

  Assert.ok(!a.exists(), "targeted bp-*.txt was removed");
  Assert.ok(b.exists(), "untargeted bp-*.txt was preserved");
});

// `deleteSubmittedReport` tolerates the file already being absent.
add_task(async function test_deleteSubmittedReport_missing() {
  clear_crash_dirs();
  await CrashReports.deleteSubmittedReport(
    "bp-ffffffff-ffff-ffff-ffff-ffffffffffff"
  );
});
