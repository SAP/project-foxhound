/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Tests that the new profile ping is submitted correctly.
 */

add_task(async () => {
  let hash = xreDirProvider.getInstallHash();

  let profileData = {
    options: {
      startWithLastProfile: true,
    },
    profiles: [
      {
        name: "Profile1",
        path: "Path1",
      },
    ],
    installs: {
      [hash]: {
        default: "Path1",
      },
    },
  };

  writeProfilesIni(profileData);

  Services.prefs.setBoolPref("toolkit.profiles.newProfileSubmitted", true);

  let { profile, didCreate } = selectStartupProfile();
  checkStartupReason("default");

  let service = getProfileService();
  checkProfileService(profileData);

  Assert.ok(!didCreate, "Should not have created a new profile.");
  Assert.equal(
    profile,
    service.defaultProfile,
    "Should have returned the default profile."
  );
  Assert.equal(
    profile.name,
    "Profile1",
    "Should have selected the right profile"
  );

  await Assert.rejects(
    GleanPings.newProfile.testSubmission(
      () => {},
      () => {
        Services.obs.notifyObservers(null, "test-quit-application");
      }
    ),
    /Ping did not submit immediately/
  );
});
