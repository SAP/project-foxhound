/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const { SelectableProfileBackupResource } = ChromeUtils.importESModule(
  "resource:///modules/backup/SelectableProfileBackupResource.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  SelectableProfileService:
    "resource:///modules/profiles/SelectableProfileService.sys.mjs",
});

add_setup(() => {
  setupProfile();
});

/**
 * Helper to create a backup and then recover it with different
 * SelectableProfileService states.
 *
 * @param {object} sandbox - Sinon sandbox
 * @param {boolean} backupIsLegacy - Whether hasCreatedSelectableProfiles returns
 *   false during backup (legacy profile)
 * @param {boolean} recoveryIsLegacy - Whether hasCreatedSelectableProfiles returns
 *   false during recovery (legacy profile)
 * @param {object} options - Additional options
 * @param {boolean} options.conversionShouldFail - If true, maybeSetupDataStore rejects (conversion fails)
 * @param {boolean} options.replaceCurrentProfile - If true, pass replaceCurrentProfile=true to recovery
 * @returns {object} Result with stubs for assertions
 */
async function createBackupAndRecover(
  sandbox,
  backupIsLegacy,
  recoveryIsLegacy,
  options = {}
) {
  Services.fog.testResetFOG();

  let fakeProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "crossProfileTest"
  );
  let recoveredProfilePath = await IOUtils.createUniqueDirectory(
    PathUtils.tempDir,
    "crossProfileTestRecovered"
  );

  // Track storeID to verify it's restored on conversion failure
  let originalStoreID = "original-store-id-12345";
  let fakeToolkitProfile = {
    storeID: originalStoreID,
  };

  sandbox
    .stub(lazy.SelectableProfileService, "groupToolkitProfile")
    .get(() => fakeToolkitProfile);

  let currentProfileValue = backupIsLegacy
    ? null
    : { name: "test-selectable-profile" };

  sandbox
    .stub(lazy.SelectableProfileService, "currentProfile")
    .get(() => currentProfileValue);

  // Set the initial pref value based on backup type (selectable = !legacy)
  Services.prefs.setBoolPref("browser.profiles.created", !backupIsLegacy);

  sandbox
    .stub(lazy.SelectableProfileService, "hasCreatedSelectableProfiles")
    .callsFake(() => {
      // Read the actual pref so we pick up changes from the catch block
      return Services.prefs.getBoolPref("browser.profiles.created", false);
    });

  let resources = {
    FakeBackupResource1,
    FakeBackupResource2,
    FakeBackupResource3,
  };

  if (!backupIsLegacy) {
    resources.SelectableProfileBackupResource = SelectableProfileBackupResource;
  }

  let bs = BackupService.init(resources);

  sandbox
    .stub(FakeBackupResource1.prototype, "backup")
    .resolves({ fake1: "data" });
  sandbox.stub(FakeBackupResource1.prototype, "recover").resolves();
  sandbox
    .stub(FakeBackupResource2.prototype, "backup")
    .rejects(new Error("Expected failure"));
  sandbox.stub(FakeBackupResource2.prototype, "recover");
  sandbox
    .stub(FakeBackupResource3.prototype, "backup")
    .resolves({ fake3: "data" });
  sandbox.stub(FakeBackupResource3.prototype, "recover").resolves();

  let selectableProfileRecoverStub;
  if (!backupIsLegacy) {
    sandbox
      .stub(SelectableProfileBackupResource.prototype, "backup")
      .resolves(null);
    selectableProfileRecoverStub = sandbox
      .stub(SelectableProfileBackupResource.prototype, "recover")
      .resolves();
  }

  let { archivePath } = await bs.createBackup({ profilePath: fakeProfilePath });

  let currentSelectableProfile = {
    name: "current-profile",
    avatar: "current-avatar",
    theme: { themeBg: "#ffffff" },
    hasCustomAvatar: false,
  };

  // Stub maybeSetupDataStore for conversion (selectable backup into legacy env)
  let maybeSetupDataStoreStub = sandbox
    .stub(lazy.SelectableProfileService, "maybeSetupDataStore")
    .callsFake(async () => {
      // initProfilesData() changes storeID and sets pref to true before it can fail
      fakeToolkitProfile.storeID = "new-store-id-after-conversion";
      Services.prefs.setBoolPref("browser.profiles.created", true);
      currentProfileValue = currentSelectableProfile;

      if (options.conversionShouldFail) {
        throw new Error("Conversion failed");
      }
    });

  // Track metadata for legacy->selectable with replaceCurrentProfile
  let setAvatarStub = sandbox.stub().resolves();
  let newSelectableProfile = {
    id: 1,
    name: "new-profile",
    avatar: "new-avatar",
    theme: { themeBg: "#000000" },
    path: recoveredProfilePath,
    setAvatar: setAvatarStub,
  };

  // Stub createNewProfile (called by recoverFromSnapshotFolderIntoSelectableProfile)
  let createNewProfileStub = sandbox
    .stub(lazy.SelectableProfileService, "createNewProfile")
    .callsFake(async () => newSelectableProfile);

  // Spy on recovery methods to verify the correct one is called
  let recoverFromSnapshotFolderSpy = sandbox.spy(
    bs,
    "recoverFromSnapshotFolder"
  );
  let recoverFromSnapshotFolderIntoSelectableProfileSpy = sandbox.spy(
    bs,
    "recoverFromSnapshotFolderIntoSelectableProfile"
  );

  // Stub deleteAndQuitCurrentSelectableProfile to prevent actual quit
  let deleteAndQuitStub = sandbox
    .stub(bs, "deleteAndQuitCurrentSelectableProfile")
    .resolves(null);

  // currentProfile is null only when staying in legacy mode:
  // legacy backup + legacy recovery + replaceCurrentProfile
  let staysLegacy =
    backupIsLegacy && recoveryIsLegacy && options.replaceCurrentProfile;
  currentProfileValue = staysLegacy ? null : currentSelectableProfile;

  // Setting browser.profiles.enabled triggers updateEnabledState() via the
  // pref observer, which must happen before setting browser.profiles.created
  // because migrateToProfilesCreatedPref() can overwrite it.
  Services.prefs.setBoolPref("browser.profiles.enabled", !staysLegacy);
  Services.prefs.setBoolPref("browser.profiles.created", !recoveryIsLegacy);

  await bs.getBackupFileInfo(archivePath);
  const restoreID = bs.state.restoreID;

  let restoreStartedEvents;
  let restoreCompleteCallback = () => {
    Services.obs.removeObserver(
      restoreCompleteCallback,
      "browser-backup-restore-complete"
    );
    restoreStartedEvents = Glean.browserBackup.restoreStarted.testGetValue();
  };
  Services.obs.addObserver(
    restoreCompleteCallback,
    "browser-backup-restore-complete"
  );

  await bs.recoverFromBackupArchive(
    archivePath,
    null,
    false,
    fakeProfilePath,
    recoveredProfilePath,
    options.replaceCurrentProfile || false
  );

  await maybeRemovePath(archivePath);
  await maybeRemovePath(fakeProfilePath);
  await maybeRemovePath(recoveredProfilePath);

  BackupService.uninit();

  // Clean up prefs set during the test
  Services.prefs.clearUserPref("browser.profiles.created");
  Services.prefs.clearUserPref("browser.profiles.enabled");

  return {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    selectableProfileRecoverStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
    fakeToolkitProfile,
    originalStoreID,
    deleteAndQuitStub,
    newSelectableProfile,
    currentSelectableProfile,
    setAvatarStub,
    restoreStartedEvents,
    restoreID,
  };
}

/**
 * Legacy backup recovered into legacy profile with replaceCurrentProfile=false (default).
 * This should convert the legacy profile to selectable via maybeSetupDataStore,
 * then use recoverFromSnapshotFolderIntoSelectableProfile.
 */
add_task(async function test_legacy_backup_into_legacy_profile() {
  let sandbox = sinon.createSandbox();

  let {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
  } = await createBackupAndRecover(sandbox, true, true);

  Assert.ok(
    maybeSetupDataStoreStub.calledOnce,
    "maybeSetupDataStore should be called to convert legacy to selectable"
  );
  Assert.ok(
    createNewProfileStub.calledOnce,
    "createNewProfile should be called once (to create profile for recovery)"
  );
  Assert.ok(
    !recoverFromSnapshotFolderSpy.called,
    "recoverFromSnapshotFolder should NOT be called when converting to selectable"
  );
  Assert.ok(
    recoverFromSnapshotFolderIntoSelectableProfileSpy.calledOnce,
    "recoverFromSnapshotFolderIntoSelectableProfile should be called after conversion"
  );

  sandbox.restore();
});

/**
 * Legacy backup recovered into legacy profile with replaceCurrentProfile=true.
 * This should NOT convert - stays legacy and uses recoverFromSnapshotFolder.
 */
add_task(async function test_legacy_backup_replace_legacy_profile() {
  let sandbox = sinon.createSandbox();

  let {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
  } = await createBackupAndRecover(sandbox, true, true, {
    replaceCurrentProfile: true,
  });

  Assert.ok(
    !maybeSetupDataStoreStub.called,
    "maybeSetupDataStore should NOT be called (replacing legacy profile)"
  );
  Assert.ok(
    !createNewProfileStub.called,
    "createNewProfile should NOT be called for legacy-to-legacy replace"
  );
  Assert.ok(
    recoverFromSnapshotFolderSpy.calledOnce,
    "recoverFromSnapshotFolder should be called for legacy-to-legacy replace"
  );
  Assert.ok(
    !recoverFromSnapshotFolderIntoSelectableProfileSpy.called,
    "recoverFromSnapshotFolderIntoSelectableProfile should NOT be called for legacy-to-legacy replace"
  );

  sandbox.restore();
});

/**
 * Legacy backup recovered into selectable profile.
 * createNewProfile IS called (by recoverFromSnapshotFolderIntoSelectableProfile to create the profile).
 * But NOT for conversion (backup is legacy, no conversion needed).
 */
add_task(async function test_legacy_backup_into_selectable_profile() {
  let sandbox = sinon.createSandbox();

  let {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
  } = await createBackupAndRecover(sandbox, true, false);

  Assert.ok(
    !maybeSetupDataStoreStub.called,
    "maybeSetupDataStore should NOT be called (backup is legacy, no conversion needed)"
  );
  Assert.ok(
    createNewProfileStub.calledOnce,
    "createNewProfile should be called once (to create profile for recovery)"
  );
  Assert.ok(
    !recoverFromSnapshotFolderSpy.called,
    "recoverFromSnapshotFolder should NOT be called for legacy-to-selectable recovery"
  );
  Assert.ok(
    recoverFromSnapshotFolderIntoSelectableProfileSpy.calledOnce,
    "recoverFromSnapshotFolderIntoSelectableProfile should be called for legacy-to-selectable recovery"
  );

  sandbox.restore();
});

/**
 * Selectable profile backup recovered into selectable profile.
 * createNewProfile IS called (by recoverFromSnapshotFolderIntoSelectableProfile).
 * But NOT for conversion (environment is already selectable).
 */
add_task(async function test_selectable_backup_into_selectable_profile() {
  let sandbox = sinon.createSandbox();

  let {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    selectableProfileRecoverStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
  } = await createBackupAndRecover(sandbox, false, false);

  Assert.ok(
    !maybeSetupDataStoreStub.called,
    "maybeSetupDataStore should NOT be called (recovery env is already selectable)"
  );
  Assert.ok(
    createNewProfileStub.calledOnce,
    "createNewProfile should be called once (to create profile for recovery)"
  );
  Assert.ok(
    selectableProfileRecoverStub.called,
    "SelectableProfileBackupResource.recover should be called"
  );
  Assert.ok(
    !recoverFromSnapshotFolderSpy.called,
    "recoverFromSnapshotFolder should NOT be called for selectable-to-selectable recovery"
  );
  Assert.ok(
    recoverFromSnapshotFolderIntoSelectableProfileSpy.calledOnce,
    "recoverFromSnapshotFolderIntoSelectableProfile should be called for selectable-to-selectable recovery"
  );

  sandbox.restore();
});

/**
 * Selectable profile backup recovered into legacy profile.
 * maybeSetupDataStore is called for conversion, then
 * recoverFromSnapshotFolderIntoSelectableProfile calls createNewProfile.
 */
add_task(async function test_selectable_backup_into_legacy_profile() {
  let sandbox = sinon.createSandbox();

  let {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    selectableProfileRecoverStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
  } = await createBackupAndRecover(sandbox, false, true);

  Assert.ok(
    maybeSetupDataStoreStub.calledOnce,
    "maybeSetupDataStore should be called once for conversion"
  );
  Assert.ok(
    createNewProfileStub.calledOnce,
    "createNewProfile should be called once (by recoverFromSnapshotFolderIntoSelectableProfile)"
  );
  Assert.ok(
    selectableProfileRecoverStub.called,
    "SelectableProfileBackupResource.recover should be called after conversion succeeds"
  );
  Assert.ok(
    !recoverFromSnapshotFolderSpy.called,
    "recoverFromSnapshotFolder should NOT be called when conversion succeeds"
  );
  Assert.ok(
    recoverFromSnapshotFolderIntoSelectableProfileSpy.calledOnce,
    "recoverFromSnapshotFolderIntoSelectableProfile should be called when conversion succeeds"
  );

  sandbox.restore();
});

/**
 * Selectable profile backup recovered into legacy profile with replaceCurrentProfile=true.
 * This should convert to selectable (since backup is selectable, not legacy),
 * use recoverFromSnapshotFolderIntoSelectableProfile, then call deleteAndQuitCurrentSelectableProfile.
 */
add_task(async function test_selectable_backup_replace_legacy_profile() {
  let sandbox = sinon.createSandbox();

  let {
    createNewProfileStub,
    maybeSetupDataStoreStub,
    selectableProfileRecoverStub,
    recoverFromSnapshotFolderSpy,
    recoverFromSnapshotFolderIntoSelectableProfileSpy,
    deleteAndQuitStub,
  } = await createBackupAndRecover(sandbox, false, true, {
    replaceCurrentProfile: true,
  });

  Assert.ok(
    maybeSetupDataStoreStub.calledOnce,
    "maybeSetupDataStore should be called to convert legacy to selectable"
  );
  Assert.ok(
    createNewProfileStub.calledOnce,
    "createNewProfile should be called (by recoverFromSnapshotFolderIntoSelectableProfile)"
  );
  Assert.ok(
    selectableProfileRecoverStub.called,
    "SelectableProfileBackupResource.recover should be called after conversion"
  );
  Assert.ok(
    !recoverFromSnapshotFolderSpy.called,
    "recoverFromSnapshotFolder should NOT be called when converting to selectable"
  );
  Assert.ok(
    recoverFromSnapshotFolderIntoSelectableProfileSpy.calledOnce,
    "recoverFromSnapshotFolderIntoSelectableProfile should be called after conversion"
  );
  Assert.ok(
    deleteAndQuitStub.calledOnce,
    "deleteAndQuitCurrentSelectableProfile should be called when replaceCurrentProfile=true"
  );

  sandbox.restore();
});

/**
 * When replaceCurrentProfile=true and recovering selectable backup into selectable profile,
 * deleteAndQuitCurrentSelectableProfile should be called after successful recovery.
 */
add_task(
  async function test_replaceCurrentProfile_selectable_to_selectable_triggers_delete_and_quit() {
    let sandbox = sinon.createSandbox();

    let { deleteAndQuitStub, restoreStartedEvents, restoreID } =
      await createBackupAndRecover(sandbox, false, false, {
        replaceCurrentProfile: true,
      });

    Assert.ok(
      deleteAndQuitStub.calledOnce,
      "deleteAndQuitCurrentSelectableProfile should be called when replaceCurrentProfile=true"
    );

    Assert.equal(
      restoreStartedEvents.length,
      1,
      "Should have a single restore started event"
    );
    Assert.deepEqual(
      restoreStartedEvents[0].extra,
      { restore_id: restoreID, replace: "true" },
      "Restore started event should have replace=true"
    );

    sandbox.restore();
  }
);

/**
 * When replaceCurrentProfile=false (default), deleteAndQuitCurrentSelectableProfile
 * should NOT be called.
 */
add_task(
  async function test_replaceCurrentProfile_false_does_not_trigger_delete_and_quit() {
    let sandbox = sinon.createSandbox();

    let { deleteAndQuitStub, restoreStartedEvents, restoreID } =
      await createBackupAndRecover(sandbox, false, false, {
        replaceCurrentProfile: false,
      });

    Assert.ok(
      !deleteAndQuitStub.called,
      "deleteAndQuitCurrentSelectableProfile should NOT be called when replaceCurrentProfile=false"
    );

    Assert.equal(
      restoreStartedEvents.length,
      1,
      "Should have a single restore started event"
    );
    Assert.deepEqual(
      restoreStartedEvents[0].extra,
      { restore_id: restoreID, replace: "false" },
      "Restore started event should have replace=false"
    );

    sandbox.restore();
  }
);

/**
 * When recovering a legacy backup into a selectable profile with replaceCurrentProfile=true,
 * the new profile should inherit the current profile's metadata (name, avatar, theme).
 */
add_task(
  async function test_replaceCurrentProfile_legacy_backup_copies_metadata() {
    let sandbox = sinon.createSandbox();

    let {
      newSelectableProfile,
      currentSelectableProfile,
      deleteAndQuitStub,
      setAvatarStub,
    } = await createBackupAndRecover(sandbox, true, false, {
      replaceCurrentProfile: true,
    });

    Assert.equal(
      newSelectableProfile.name,
      currentSelectableProfile.name,
      "New profile should inherit current profile's name"
    );
    Assert.ok(
      setAvatarStub.calledOnce,
      "setAvatar should be called to copy avatar"
    );
    Assert.equal(
      setAvatarStub.firstCall.args[0],
      currentSelectableProfile.avatar,
      "setAvatar should be called with current profile's avatar"
    );
    Assert.equal(
      newSelectableProfile.theme,
      currentSelectableProfile.theme,
      "New profile should inherit current profile's theme"
    );
    Assert.ok(
      deleteAndQuitStub.calledOnce,
      "deleteAndQuitCurrentSelectableProfile should still be called"
    );

    sandbox.restore();
  }
);
