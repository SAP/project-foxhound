/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

/* import-globals-from ../../../../../toolkit/profile/test/xpcshell/head.js */

/* import-globals-from ../../../profiles/tests/unit/head.js */

const ENABLED_ON_PROFILES_PREF = "browser.backup.enabled_on.profiles";

add_setup(async function () {
  await initSelectableProfileService();

  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
  });
});

add_task(async function test_maybeAddToEnabledListPref() {
  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);

  BackupService.maybeAddToEnabledListPref("profile-1");
  let value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(value.includes("profile-1"), "profile-1 should be in the pref");

  BackupService.maybeAddToEnabledListPref("profile-2");
  value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(value.includes("profile-1"), "profile-1 should still be present");
  Assert.ok(value.includes("profile-2"), "profile-2 should also be present");

  // Calling add again for an existing profile should not create duplicates
  BackupService.maybeAddToEnabledListPref("profile-1");
  BackupService.maybeAddToEnabledListPref("profile-1");
  value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.equal(
    value.filter(id => id === "profile-1").length,
    1,
    "profile-1 should not be duplicated"
  );

  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});

add_task(async function test_maybeRemoveFromEnabledListPref() {
  Services.prefs.setStringPref(
    ENABLED_ON_PROFILES_PREF,
    JSON.stringify(["profile-1", "profile-2"])
  );

  await BackupService.maybeRemoveFromEnabledListPref("profile-1");
  let value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(!value.includes("profile-1"), "profile-1 should have been removed");
  Assert.ok(value.includes("profile-2"), "profile-2 should still be present");

  await BackupService.maybeRemoveFromEnabledListPref("profile-2");
  value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.deepEqual(value, [], "Pref should be an empty array");

  // Removing a profile not in the list should be a no-op
  Services.prefs.setStringPref(
    ENABLED_ON_PROFILES_PREF,
    JSON.stringify(["profile-1"])
  );

  await BackupService.maybeRemoveFromEnabledListPref("profile-nonexistent");
  value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(value.includes("profile-1"), "profile-1 should still be present");
  Assert.equal(value.length, 1, "No entry should have been removed");

  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});

add_task(async function test_defaults_to_current_profile() {
  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);

  const SelectableProfileService = getSelectableProfileService();
  let currentProfile = SelectableProfileService.currentProfile;

  BackupService.maybeAddToEnabledListPref();
  let value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(
    value.includes(currentProfile.id),
    "Should default to current profile ID on add"
  );

  await BackupService.maybeRemoveFromEnabledListPref();
  value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(
    !value.includes(currentProfile.id),
    "Should default to current profile ID on remove"
  );

  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});

add_task(async function test_no_op_without_selectable_profiles() {
  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);

  let sandbox = sinon.createSandbox();
  sandbox.stub(getSelectableProfileService(), "currentProfile").get(() => null);

  let valueBefore = Services.prefs.getStringPref(
    ENABLED_ON_PROFILES_PREF,
    "[]"
  );
  BackupService.maybeAddToEnabledListPref();
  let valueAfter = Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]");
  Assert.equal(
    valueAfter,
    valueBefore,
    "Pref should be unchanged when no current profile"
  );

  Services.prefs.setStringPref(
    ENABLED_ON_PROFILES_PREF,
    JSON.stringify(["profile-1"])
  );
  await BackupService.maybeRemoveFromEnabledListPref();
  let removeValue = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(
    removeValue.includes("profile-1"),
    "profile-1 should still be present after no-op remove"
  );

  sandbox.restore();
  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});

add_task(async function test_maybeAddToEnabledListPref_migrates_object() {
  Services.prefs.setStringPref(
    ENABLED_ON_PROFILES_PREF,
    JSON.stringify({ "profile-1": true })
  );

  BackupService.maybeAddToEnabledListPref("profile-2");
  let value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(Array.isArray(value), "Pref should be an array after add");
  Assert.ok(value.includes("profile-1"), "profile-1 should be migrated");
  Assert.ok(value.includes("profile-2"), "profile-2 should be added");

  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});

add_task(async function test_maybeRemoveFromEnabledListPref_migrates_object() {
  Services.prefs.setStringPref(
    ENABLED_ON_PROFILES_PREF,
    JSON.stringify({ "profile-1": true, "profile-2": true })
  );

  await BackupService.maybeRemoveFromEnabledListPref("profile-1");
  let value = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(Array.isArray(value), "Pref should be an array after remove");
  Assert.ok(!value.includes("profile-1"), "profile-1 should be removed");
  Assert.ok(value.includes("profile-2"), "profile-2 should remain");

  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});

add_task(async function test_enabledListPref_shared_across_profiles() {
  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);

  const SelectableProfileService = getSelectableProfileService();
  let currentProfile = SelectableProfileService.currentProfile;

  BackupService.maybeAddToEnabledListPref();
  await updateNotified();

  let dbValue = await SelectableProfileService.getDBPref(
    ENABLED_ON_PROFILES_PREF
  );
  let dbParsed = JSON.parse(dbValue);
  Assert.ok(
    dbParsed.includes(currentProfile.id),
    "DB should contain the current profile ID"
  );

  await SelectableProfileService.uninit();

  let db = await openDatabase();
  let simulatedValue = JSON.parse(dbValue);
  simulatedValue.push("other-profile-id");
  await db.execute("UPDATE SharedPrefs SET value=:value WHERE name=:name;", {
    value: JSON.stringify(simulatedValue),
    name: ENABLED_ON_PROFILES_PREF,
  });
  await db.close();

  await SelectableProfileService.init();

  let localValue = JSON.parse(
    Services.prefs.getStringPref(ENABLED_ON_PROFILES_PREF, "[]")
  );
  Assert.ok(
    localValue.includes(currentProfile.id),
    "Local pref should still contain the original profile ID"
  );
  Assert.ok(
    localValue.includes("other-profile-id"),
    "Local pref should now also contain the simulated other profile ID"
  );

  Services.prefs.clearUserPref(ENABLED_ON_PROFILES_PREF);
});
