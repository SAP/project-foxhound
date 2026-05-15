/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineLazyGetter(this, "nsLocalFile", () =>
  Components.Constructor("@mozilla.org/file/local;1", "nsIFile", "initWithPath")
);

const BACKUP_DIR_PREF_NAME = "browser.backup.location";

const TEST_PASSWORD = "correcthorsebatterystaple";

const kKnownMappings = Object.freeze({
  OneDrPD: "onedrive",
  Docs: "documents",
});

const gDirectoryServiceProvider = {
  getFile(prop, persistent) {
    persistent.value = false;

    // We only expect a narrow range of calls.
    let folder = gBase.clone();
    if (prop === "ProfD") {
      return folder;
    }

    if (prop in kKnownMappings) {
      folder.append("dirsvc");
      folder.append(prop + "-dir");
      return folder;
    }

    console.error(`Access to unexpected directory '${prop}'`);
    return Cr.NS_ERROR_FAILURE;
  },
  QueryInterface: ChromeUtils.generateQI([Ci.nsIDirectoryServiceProvider]),
};

let gBase;
add_setup(function setup() {
  setupProfile();
  gBase = do_get_profile();

  Services.dirsvc
    .QueryInterface(Ci.nsIDirectoryService)
    .registerProvider(gDirectoryServiceProvider);
});

/**
 * Gets a telemetry event and checks that it looks the same between Glean and
 * legacy telemetry, i.e. that the extra data is equal.
 *
 * @param {string} name
 *   The Glean programming name of the event, e.g. turnOn instead of turn_on.
 * @returns {object}
 *   The extra data associated with the event.
 */
function assertSingleTelemetryEvent(name) {
  let value = Glean.browserBackup[name].testGetValue();
  Assert.equal(value.length, 1, `${name} Glean event was recorded once.`);

  let snakeName = name.replace(/([A-Z])/g, "_$1").toLowerCase();
  let legacy = TelemetryTestUtils.getEvents(
    { category: "browser.backup", method: snakeName, object: "BackupService" },
    { process: "parent" }
  );
  Assert.equal(legacy.length, 1, `${name} legacy event was recorded once.`);

  Assert.deepEqual(
    legacy[0].extra,
    value[0].extra,
    "Legacy telemetry measured the same data as Glean."
  );
  return value[0].extra;
}

/**
 * Checks that the recorded event's 'encrypted' and 'location' extra keys
 * match `destPath` and `encrypted`. Reset telemetry before if needed!
 *
 * @param {string} name
 *   The name of the Glean event that should have been recorded.
 * @param {string} destPath
 *   The path that the backup was stored to.
 * @param {boolean} encrypted
 *   Whether the backup was encrypted or not.
 */
function assertEventMatches(name, destPath, encrypted) {
  let extra = assertSingleTelemetryEvent(name);
  Assert.equal(
    extra.encrypted,
    String(encrypted),
    `Glean event indicates the backup is ${encrypted ? "" : "NOT "}encrypted.`
  );

  // This is returned from the mock of classifyLocationForTelemetry, and
  // checks that the correct path was passed in.
  Assert.equal(
    extra.location,
    `[classifying: ${relativeToProfile(destPath)}]`,
    "Glean event has right location"
  );

  return extra;
}

/**
 * Determines the path to 'source' from the profile directory to reduce the
 * length and avoid truncation within legacy telemetry.
 *
 * @param {string} path
 *   The file that should be pointed to.
 * @returns {string}
 *   The relative path from 'base' to 'source'.
 */
function relativeToProfile(path) {
  let file = nsLocalFile(path);
  return file.getRelativePath(gBase);
}

add_task(function test_relativeToProfile() {
  // This aims to check that the direction is right.
  const file = gBase.clone();
  file.append("abc");
  Assert.equal(
    relativeToProfile(file.path),
    "abc",
    "relativeToProfile computes the right path."
  );
});

add_task(async function test_created_encrypted_noreason() {
  await template("testCreatedEncryptedNoReason", true, undefined);
});

add_task(async function test_created_nonencrypted_noreason() {
  await template("testCreatedNonencryptedNoReason", false, undefined);
});

add_task(async function test_created_encrypted_with_reason() {
  await template("testCreatedEncryptedWithReason", true, "I said so");
});

async function template(name, encrypted, reason) {
  let bs = new BackupService();
  let profilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    name
  );

  const backupDir = PathUtils.join(PathUtils.tempDir, name + "_dest");
  Services.prefs.setStringPref(BACKUP_DIR_PREF_NAME, backupDir);

  if (encrypted) {
    await bs.enableEncryption(TEST_PASSWORD, profilePath);
  }

  sinon.stub(bs, "classifyLocationForTelemetry").callsFake(file => {
    return `[classifying: ${relativeToProfile(file)}]`;
  });

  // To ensure that the backup_start event happens before the actual backup,
  // take the lock for ourselves. Then we can unblock the backup once we've
  // checked the telemetry is finished.
  let resolver = Promise.withResolvers();
  locks.request(BackupService.WRITE_BACKUP_LOCK_NAME, () => {
    Services.fog.testResetFOG();
    Services.telemetry.clearEvents();

    let promise = bs.createBackup({ profilePath, reason });

    let startedEvents = Glean.browserBackup.backupStart.testGetValue();
    Assert.equal(
      startedEvents.length,
      1,
      "Found the backup_start Glean event."
    );
    Assert.equal(
      startedEvents[0].extra.reason,
      reason ?? "unknown",
      "Found the reason for starting the backup in the Glean event."
    );

    // Don't await on it, since createBackup needs the lock!
    resolver.resolve(promise);
  });

  await resolver.promise;

  let value = assertEventMatches("created", backupDir, encrypted);
  // Not sure how big it is, and we're not testing the fuzzByteSize
  // function, so just check that it's plausible.
  Assert.greater(Number(value.size), 0, "Telemetry event has nonzero size");
}

add_task(async function test_toggleOn() {
  let bs = new BackupService();

  let backupDir = PathUtils.join(PathUtils.tempDir, "toggleOn_dest");
  Services.prefs.setStringPref(BACKUP_DIR_PREF_NAME, backupDir);

  let profilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "toggleOn"
  );

  if (bs.state.scheduledBackupsEnabled) {
    // The test assumes that this is false. Do this before resetting telemetry
    // so it doesn't affect the results.
    bs.onUpdateScheduledBackups(false);
  }

  sinon.stub(bs, "classifyLocationForTelemetry").callsFake(file => {
    return `[classifying: ${relativeToProfile(file)}]`;
  });

  Services.fog.testResetFOG();
  Services.telemetry.clearEvents();
  bs.onUpdateScheduledBackups(true);
  assertEventMatches("toggleOn", backupDir, false);

  Services.fog.testResetFOG();
  Services.telemetry.clearEvents();
  bs.onUpdateScheduledBackups(false);
  assertSingleTelemetryEvent("toggleOff");

  await bs.enableEncryption(TEST_PASSWORD, profilePath);
  Services.fog.testResetFOG();
  Services.telemetry.clearEvents();
  bs.onUpdateScheduledBackups(true);
  assertEventMatches("toggleOn", backupDir, true);

  Services.fog.testResetFOG();
  Services.telemetry.clearEvents();
  bs.onUpdateScheduledBackups(false);
  assertSingleTelemetryEvent("toggleOff");
});

add_task(async function test_classifyLocationForTelemetry() {
  let bs = new BackupService();
  for (const prop of Object.keys(kKnownMappings)) {
    let file = Services.dirsvc.get(prop, Ci.nsIFile);
    Assert.equal(
      bs.classifyLocationForTelemetry(file.path),
      "other",
      `'${file.path}' was correctly classified.`
    );

    file.append("child");
    Assert.equal(
      bs.classifyLocationForTelemetry(file.path),
      kKnownMappings[prop],
      `'${file.path}' was correctly classified.`
    );

    file = file.parent.parent;
    Assert.equal(
      bs.classifyLocationForTelemetry(file.path),
      "other",
      `'${file.path}' was correctly classified.`
    );
  }

  Assert.equal(
    bs.classifyLocationForTelemetry(gBase.path),
    "other",
    "Unrelated path is not classified anywhere."
  );

  Assert.equal(
    bs.classifyLocationForTelemetry("path"),
    "Error: NS_ERROR_FILE_UNRECOGNIZED_PATH",
    "Invalid path returns an error name."
  );
});

add_task(async function test_idleDispatchPassesOptionsThrough() {
  let bs = new BackupService();
  let stub = sinon.stub(bs, "createBackupOnIdleDispatch").resolves();

  let options = {};
  bs.createBackupOnIdleDispatch(options);
  Assert.equal(
    stub.firstCall.args[0],
    options,
    "Options were passed as-is into createBackup."
  );
});
