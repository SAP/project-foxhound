/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Tests that asyncFlushCurrentProfile succeeds if we startup into
 * the default managed profile for a profile group (see bug 1963173).
 */
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

    let storeID = "b0bacafe";
    let profilesIni = {
      profiles: [
        {
          name: "default",
          path: defaultProfile.leafName,
          storeID,
          default: true,
        },
      ],
      installs: {
        [hash]: {
          default: defaultProfile.leafName,
        },
      },
    };
    writeProfilesIni(profilesIni);

    Services.prefs.setCharPref("toolkit.profiles.storeID", storeID);

    let service = getProfileService();
    selectStartupProfile();

    // Overwrite profiles.ini: simulate another instance launching, getting
    // app focus, and flushing to disk, overwriting the default path.
    let overwriteProfilesIni = () => {
      let updated = {
        profiles: [
          {
            name: "default",
            path: otherProfile.leafName,
            storeID,
            default: true,
          },
        ],
        installs: {
          [hash]: {
            default: otherProfile.leafName,
          },
        },
      };
      writeProfilesIni(updated);
      let profileData = readProfilesIni();
      Assert.equal(
        profileData.profiles[0].path,
        otherProfile.leafName,
        "Default path should now be the unmanaged profile path"
      );
    };
    overwriteProfilesIni();

    // Now, simulate the default profile receiving app focus: asyncFlush would
    // fail, since profiles.ini has been updated since startup, but we should
    // then fall back to asyncFlushCurrentProfile, which should succeed.
    let asyncRewriteDefault = async (expectedPath, expectedRelative) => {
      await service.asyncFlushCurrentProfile();
      let profileData = readProfilesIni();

      Assert.equal(
        profileData.profiles[0].path,
        expectedPath,
        "AsyncFlushCurrentProfile should have updated the path to the path of the current managed profile"
      );

      Assert.equal(
        profileData.profiles[0].isRelative,
        expectedRelative,
        "AsyncFlushCurrentProfile should have updated IsRelative correctly"
      );

      Assert.equal(
        profileData.installs[hash].default,
        expectedPath,
        "AsyncFlushCurrentProfile should have updated the path to the path of the current managed profile"
      );
    };
    await asyncRewriteDefault(defaultProfile.leafName, true);

    // Just to be sure, repeat the other instance setting itself to default,
    // then this instance flushing over top of those changes.
    overwriteProfilesIni();
    await asyncRewriteDefault(defaultProfile.leafName, true);

    // Now change the root dir and flush.
    service.currentProfile.rootDir = absoluteProfile;
    await asyncRewriteDefault(absoluteProfile.path, false);
  }
);
