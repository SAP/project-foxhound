/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const PATH_SEPARATOR = AppConstants.platform == "win" ? "\\" : "/";

add_setup(() => {
  Services.prefs.setBoolPref("browser.profiles.enabled", true);
});

add_task(async function test_create_profile() {
  let hash = xreDirProvider.getInstallHash();

  // In the test harness gProfD is outside of the mocked app data directory so
  // this will will use a relative profile path starting with `..`.
  let absolutePath = gProfD.clone();
  absolutePath.append("absoluteProfile");
  absolutePath.create(Ci.nsIFile.DIRECTORY_TYPE, 0o755);

  let profileData = {
    profiles: [
      {
        name: "default",
        path: absolutePath.path,
        isRelative: false,
      },
    ],
    installs: {
      [hash]: {
        default: absolutePath.path,
      },
    },
  };

  writeProfilesIni(profileData);

  startProfileService();
  let service = getProfileService();
  Assert.equal(service.currentProfile.rootDir.path, absolutePath.path);

  await initSelectableProfileService();

  let currentProfile = getSelectableProfileService().currentProfile;

  Assert.equal(
    (await currentProfile.rootDir).path,
    absolutePath.path,
    "The profile root path should be correct"
  );

  Assert.equal(
    (await currentProfile.localDir).path,
    absolutePath.path,
    "The profile local path should be correct"
  );

  let db = await openDatabase();
  let rows = await db.execute("SELECT path FROM Profiles WHERE id=:id;", {
    id: currentProfile.id,
  });
  await db.close();

  Assert.equal(rows.length, 1, "There should be one row for the profile");
  Assert.equal(
    rows[0].getResultByName("path"),
    `..${PATH_SEPARATOR}absoluteProfile`,
    "The profile path in the database should be relative"
  );
});
