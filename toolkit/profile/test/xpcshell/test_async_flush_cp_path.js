/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Verifies that if multiple profiles match the path then we fail to incrementally flush
add_task(
  {
    skip_if: () => !AppConstants.MOZ_SELECTABLE_PROFILES,
  },
  async () => {
    let hash = xreDirProvider.getInstallHash();
    let defaultProfile = makeRandomProfileDir("default");
    let otherProfile = makeRandomProfileDir("other");

    let absoluteProfile = gProfD.clone();
    absoluteProfile.append("absolute");
    absoluteProfile.createUnique(Ci.nsIFile.DIRECTORY_TYPE, 0o755);

    let profilesIni = {
      profiles: [
        {
          name: "default1",
          path: defaultProfile.leafName,
          default: true,
        },
        {
          name: "default2",
          path: defaultProfile.leafName,
          default: false,
        },
      ],
      installs: {
        [hash]: {
          default: defaultProfile.leafName,
        },
      },
    };
    writeProfilesIni(profilesIni);

    let service = getProfileService();
    let { profile } = selectStartupProfile(["-P", "default1"]);

    Assert.equal(
      profile.name,
      "default1",
      "Should have selected the profile based on the command line"
    );

    // Attempt to change the root dir.
    profile.rootDir = otherProfile;

    // This fails because there are multiple profiles with the same path, so we can't be sure which one to update.
    await Assert.rejects(
      service.asyncFlushCurrentProfile(),
      /NS_ERROR_UNEXPECTED/,
      "Should have failed to flush the profile because of the duplicate path"
    );
  }
);
