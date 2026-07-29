/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { ExperimentAPI } = ChromeUtils.importESModule(
  "resource://nimbus/ExperimentAPI.sys.mjs"
);
const { NimbusTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/NimbusTestUtils.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SelectableProfileService:
    "resource:///modules/profiles/SelectableProfileService.sys.mjs",
});

const BACKUP_DIR_PREF_NAME = "browser.backup.location";
const BACKUP_ARCHIVE_ENABLED_PREF_NAME = "browser.backup.archive.enabled";
const BACKUP_RESTORE_ENABLED_PREF_NAME = "browser.backup.restore.enabled";
const SQLITE_ENCRYPTION_ENABLED_PREF_NAME =
  "security.storage.encryption.sqlite.enabled";

add_setup(async () => {
  setupProfile();

  NimbusTestUtils.init(this);

  const { cleanup: nimbusCleanup } = await NimbusTestUtils.setupTest();

  await ExperimentAPI.ready();

  let backupDir = await IOUtils.createUniqueDirectory(
    PathUtils.profileDir,
    "backup"
  );

  // Use temporary directory for backups.
  Services.prefs.setStringPref(BACKUP_DIR_PREF_NAME, backupDir);

  registerCleanupFunction(async () => {
    const nimbusCleanupPromise = nimbusCleanup();
    const backupDirCleanupPromise = IOUtils.remove(backupDir, {
      recursive: true,
    });

    await Promise.all([nimbusCleanupPromise, backupDirCleanupPromise]);

    Services.prefs.clearUserPref(BACKUP_DIR_PREF_NAME);
  });
});

add_task(async function test_archive_killswitch_enrollment() {
  let cleanupExperiment;
  await archiveTemplate({
    internalReason: "nimbus",
    async disable() {
      cleanupExperiment = await NimbusTestUtils.enrollWithFeatureConfig({
        featureId: "backupService",
        value: { archiveKillswitch: true },
      });
    },
    async enable() {
      await cleanupExperiment();
    },
  });
});

add_task(async function test_archive_enabled_pref() {
  await archiveTemplate({
    internalReason: "pref",
    async disable() {
      Services.prefs.unlockPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME);
      Services.prefs.setBoolPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME, false);
    },
    async enable() {
      Services.prefs.setBoolPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME, true);
    },
  });
});

add_task(async function test_archive_policy() {
  let storedDefault;
  await archiveTemplate({
    internalReason: "policy",
    disable: () => {
      Services.prefs.unlockPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME);
      const defaults = Services.prefs.getDefaultBranch("");
      storedDefault = defaults.getBoolPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME);
      defaults.setBoolPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME, false);
      defaults.lockPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME);
    },
    enable: () => {
      const defaults = Services.prefs.getDefaultBranch("");
      defaults.setBoolPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME, storedDefault);
      Services.prefs.unlockPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME);
      Services.prefs.setBoolPref(BACKUP_ARCHIVE_ENABLED_PREF_NAME, true);
    },
  });
});

add_task(async function test_restore_killswitch_enrollment() {
  let cleanupExperiment;
  await restoreTemplate({
    internalReason: "nimbus",
    async disable() {
      cleanupExperiment = await NimbusTestUtils.enrollWithFeatureConfig({
        featureId: "backupService",
        value: { restoreKillswitch: true },
      });
    },
    async enable() {
      await cleanupExperiment();
    },
  });
});

add_task(async function test_restore_enabled_pref() {
  await restoreTemplate({
    internalReason: "pref",
    async disable() {
      Services.prefs.setBoolPref(BACKUP_RESTORE_ENABLED_PREF_NAME, false);
    },
    async enable() {
      Services.prefs.setBoolPref(BACKUP_RESTORE_ENABLED_PREF_NAME, true);
    },
  });
});

add_task(async function test_restore_policy() {
  let storedDefault;
  await restoreTemplate({
    internalReason: "policy",
    async disable() {
      const defaults = Services.prefs.getDefaultBranch("");
      storedDefault = defaults.getBoolPref(BACKUP_RESTORE_ENABLED_PREF_NAME);
      defaults.setBoolPref(BACKUP_RESTORE_ENABLED_PREF_NAME, false);
      Services.prefs.lockPref(BACKUP_RESTORE_ENABLED_PREF_NAME);
    },
    async enable() {
      Services.prefs.unlockPref(BACKUP_RESTORE_ENABLED_PREF_NAME);
      const defaults = Services.prefs.getDefaultBranch("");
      defaults.setBoolPref(BACKUP_RESTORE_ENABLED_PREF_NAME, storedDefault);
    },
  });
});

// SQLite at-rest encryption disables both archive and restore. Unlike the
// nimbus/pref/policy reasons, the encryption pref is fixed at startup (set by
// build config or policy) and is not observed live, so the gate is evaluated
// when status is read. Verify a service constructed with the pref on reports
// both features disabled (with telemetry) and refuses to create or recover.
add_task(async function test_sqlite_encryption_disables_backup() {
  Services.fog.testResetFOG();
  // The xpcshell manifest locks this pref off for the rest of the backup suite,
  // so unlock it before toggling it on for this test.
  Services.prefs.unlockPref(SQLITE_ENCRYPTION_ENABLED_PREF_NAME);
  Services.prefs.setBoolPref(SQLITE_ENCRYPTION_ENABLED_PREF_NAME, true);

  let bs = new BackupService();
  bs.initStatusObservers();

  assertStatus("archive", bs.archiveEnabledStatus, false, "sqlite-encryption");
  assertStatus("restore", bs.restoreEnabledStatus, false, "sqlite-encryption");

  let backup = await bs.createBackup();
  Assert.ok(!backup, "createBackup is blocked while SQLite encryption is on.");

  const recoveryDir = await IOUtils.createUniqueDirectory(
    PathUtils.profileDir,
    "recovered-profiles"
  );
  await Assert.rejects(
    bs.recoverFromBackupArchive(
      PathUtils.join(PathUtils.profileDir, "does-not-exist.html"),
      null,
      false,
      PathUtils.profileDir,
      recoveryDir,
      true
    ),
    /.*disabled.*/,
    "recoverFromBackupArchive is blocked while SQLite encryption is on."
  );

  bs.uninitStatusObservers();
  await IOUtils.remove(recoveryDir, { recursive: true });
  Services.prefs.setBoolPref(SQLITE_ENCRYPTION_ENABLED_PREF_NAME, false);
  Services.prefs.lockPref(SQLITE_ENCRYPTION_ENABLED_PREF_NAME);
});

add_task(
  async function test_selectableProfilesAllowed_updates_on_enableChanged() {
    let sandbox = sinon.createSandbox();
    let isEnabledValue = false;

    sandbox
      .stub(lazy.SelectableProfileService, "isEnabled")
      .get(() => isEnabledValue);

    let bs = new BackupService();
    bs.initStatusObservers();

    Assert.equal(
      bs.state.selectableProfilesAllowed,
      false,
      "selectableProfilesAllowed should initially be false"
    );

    let stateUpdatePromise = new Promise(resolve => {
      bs.addEventListener("BackupService:StateUpdate", resolve, { once: true });
    });

    isEnabledValue = true;
    lazy.SelectableProfileService.emit("enableChanged", true);
    await stateUpdatePromise;

    Assert.equal(
      bs.state.selectableProfilesAllowed,
      true,
      "selectableProfilesAllowed should be true after enableChanged fires"
    );

    stateUpdatePromise = new Promise(resolve => {
      bs.addEventListener("BackupService:StateUpdate", resolve, { once: true });
    });

    isEnabledValue = false;
    lazy.SelectableProfileService.emit("enableChanged", false);
    await stateUpdatePromise;

    Assert.equal(
      bs.state.selectableProfilesAllowed,
      false,
      "selectableProfilesAllowed should be false after disabling"
    );

    bs.uninitStatusObservers();
    sandbox.restore();
  }
);

async function archiveTemplate({ internalReason, disable, enable }) {
  Services.fog.testResetFOG();

  let bs = new BackupService();
  bs.initStatusObservers();
  assertStatus("archive", bs.archiveEnabledStatus, true, null);

  let calledCount = 0;
  let callback = () => calledCount++;
  Services.obs.addObserver(callback, "backup-service-status-updated");

  await disable();
  Assert.equal(calledCount, 1, "Observers were notified on disable");
  assertStatus("archive", bs.archiveEnabledStatus, false, internalReason);

  let backup = await bs.createBackup();
  Assert.ok(
    !backup,
    "Creating a backup should fail when archiving is disabled."
  );

  await enable();
  Assert.equal(calledCount, 2, "Observers were notified on re-enable");
  assertStatus("archive", bs.archiveEnabledStatus, true, "reenabled");

  backup = await bs.createBackup();
  ok(
    backup,
    "Creating a backup should succeed once the archive killswitch experiment ends."
  );
  ok(
    await IOUtils.exists(backup.archivePath),
    "Archive file should exist on disk."
  );

  await IOUtils.remove(backup.archivePath);
  bs.uninitStatusObservers();

  // Also check that it works at startup.
  await disable();
  bs = new BackupService();
  bs.initStatusObservers();
  Assert.equal(calledCount, 3, "Observers were notified at startup");
  assertStatus("archive", bs.archiveEnabledStatus, false, internalReason);
  await enable();
  bs.uninitStatusObservers();

  Services.obs.removeObserver(callback, "backup-service-status-updated");
}

async function restoreTemplate({ internalReason, disable, enable }) {
  Services.fog.testResetFOG();

  let bs = new BackupService();
  bs.initStatusObservers();
  assertStatus("restore", bs.restoreEnabledStatus, true, null);

  const backup = await bs.createBackup();
  Assert.ok(
    backup && backup.archivePath,
    "Archive should have been created on disk."
  );

  let calledCount = 0;
  let callback = () => calledCount++;
  Services.obs.addObserver(callback, "backup-service-status-updated");

  await disable();
  Assert.equal(calledCount, 1, "Observers were notified on disable");
  assertStatus("restore", bs.restoreEnabledStatus, false, internalReason);

  const recoveryDir = await IOUtils.createUniqueDirectory(
    PathUtils.profileDir,
    "recovered-profiles"
  );

  await Assert.rejects(
    bs.recoverFromBackupArchive(
      backup.archivePath,
      null,
      false,
      PathUtils.profileDir,
      recoveryDir,
      true
    ),
    /.*disabled.*/,
    "Recovery should throw when the restore is disabled."
  );

  await enable();
  Assert.equal(calledCount, 2, "Observers were notified on re-enable");
  assertStatus("restore", bs.restoreEnabledStatus, true, "reenabled");

  let recoveredProfile = await bs.recoverFromBackupArchive(
    backup.archivePath,
    null,
    false,
    PathUtils.profileDir,
    recoveryDir,
    true
  );
  Assert.ok(
    recoveredProfile,
    "Recovery should succeed once restore is re-enabled."
  );
  Assert.ok(
    await IOUtils.exists(recoveredProfile.rootDir.path),
    "Recovered profile directory should exist on disk."
  );

  bs.uninitStatusObservers();

  // Also check that it works at startup.
  await disable();
  bs = new BackupService();
  bs.initStatusObservers();
  Assert.equal(calledCount, 3, "Observers were notified at startup");
  assertStatus("restore", bs.restoreEnabledStatus, false, internalReason);
  await enable();
  bs.uninitStatusObservers();

  Services.obs.removeObserver(callback, "backup-service-status-updated");
}

/**
 * Checks that the status object matches the expected values, and that the
 * telemetry matches the object.
 *
 * @param {string} kind
 *   The kind of status object.
 * @param {string} status
 *   The status object given.
 * @param {boolean} enabled
 *   Whether the feature should be enabled or disabled.
 * @param {string?} internalReason
 *   The internal reason that should be given.
 */
function assertStatus(kind, status, enabled, internalReason) {
  Assert.equal(
    status.enabled,
    enabled,
    `${kind} status is ${enabled ? "" : "not "}enabled.`
  );
  Assert.equal(
    status.internalReason ?? null,
    // 'reenabled' is only for telemetry, the status is null
    internalReason == "reenabled" ? null : internalReason,
    `${kind} status has the expected internal reason.`
  );

  Assert.equal(
    Glean.browserBackup[kind + "Enabled"].testGetValue(),
    enabled,
    `Glean ${kind}_enabled metric should be ${enabled}.`
  );

  Assert.equal(
    Glean.browserBackup[kind + "DisabledReason"].testGetValue(),
    internalReason,
    `Glean ${kind}_disabled_reason metric is ${internalReason}.`
  );
}
