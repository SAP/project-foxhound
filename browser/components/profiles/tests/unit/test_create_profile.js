/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(() => {
  Services.prefs.setBoolPref("browser.profiles.enabled", true);

  let mockFs = [
    {
      path: `/localization/browser/profiles.ftl`,
      source: `
default-profile-name = Profile number: { $number }
original-profile-name = Original profile name
    `,
    },
  ];

  let mockSource = L10nFileSource.createMock(
    "test",
    "app",
    Services.locale.packagedLocales,
    "/localization/",
    mockFs
  );
  let registry = L10nRegistry.getInstance();
  registry.clearSources();
  registry.registerSources([mockSource]);
});

add_task(async function test_create_profile() {
  startProfileService();

  const SelectableProfileService = getSelectableProfileService();
  const ProfilesDatastoreService = getProfilesDatastoreService();

  await ProfilesDatastoreService.init();
  await SelectableProfileService.init();
  Assert.ok(SelectableProfileService.isEnabled, "Service should be enabled");

  let profiles = await SelectableProfileService.getAllProfiles();

  Assert.ok(!profiles.length, "No selectable profiles exist yet");

  await SelectableProfileService.maybeSetupDataStore();
  let currentProfile = SelectableProfileService.currentProfile;

  let leafName = (await currentProfile.rootDir).leafName;

  Assert.equal(
    leafName,
    getProfileService().currentProfile.rootDir.leafName,
    "The name for the original profile should be correct"
  );
  Assert.equal(
    currentProfile.name,
    "Original profile name",
    "The name for the original profile should be correct"
  );

  let newProfile = await SelectableProfileService.createNewProfile(false);
  leafName = (await newProfile.rootDir).leafName;

  Assert.equal(
    // Strip off the random salt prefix added to the profile path
    leafName.substring(8),
    ".Profile number_ 1",
    "The name for the new profile's directory should be correct"
  );
  Assert.equal(
    newProfile.name,
    "Profile number: 1",
    "The name for the new profile should be correct"
  );

  profiles = await SelectableProfileService.getAllProfiles();

  Assert.equal(profiles.length, 2, "Two selectable profiles exist");

  let db = await openDatabase();
  let rows = await db.execute("SELECT path FROM Profiles WHERE id=:id;", {
    id: newProfile.id,
  });
  await db.close();

  Assert.equal(rows.length, 1, "There should be one row for the profile");
  let path = rows[0].getResultByName("path");

  // Non-unix and mac prefix the profile path with "Profiles/"
  if (!AppConstants.XP_UNIX || AppConstants.platform == "macosx") {
    path = path.substring("Profiles".length + 1);
  }

  Assert.equal(path, leafName, "The profile path should be relative");
});
