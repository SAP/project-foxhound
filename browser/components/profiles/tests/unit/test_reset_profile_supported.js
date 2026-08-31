/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

let { ResetProfile } = ChromeUtils.importESModule(
  "resource://gre/modules/ResetProfile.sys.mjs"
);

add_task(async function test_resetSupportForProfiles() {
  let profileService = Cc["@mozilla.org/toolkit/profile-service;1"].getService(
    Ci.nsIToolkitProfileService
  );
  let currentToolkitProfile = profileService.currentProfile;

  const SelectableProfileService = getSelectableProfileService();
  let currentSelectableProfile = SelectableProfileService.currentProfile;

  Assert.equal(
    currentSelectableProfile,
    null,
    "Should not have a current selectable profile"
  );
  Assert.equal(
    currentToolkitProfile,
    null,
    "Should not have a current toolkit profile"
  );
  Assert.ok(
    !ResetProfile.resetSupported(),
    "Reset should not be supported because we don't have a current profile"
  );

  selectStartupProfile();

  currentToolkitProfile = profileService.currentProfile;

  Assert.equal(
    currentSelectableProfile,
    null,
    "Should not have a current selectable profile"
  );
  Assert.ok(currentToolkitProfile, "Should now have a current profile");
  Assert.ok(
    ResetProfile.resetSupported(),
    "Reset should now be supported because we have a current toolkit profile"
  );

  const ProfilesDatastoreService = getProfilesDatastoreService();
  await ProfilesDatastoreService.init();
  await SelectableProfileService.init();
  await SelectableProfileService.maybeSetupDataStore();

  currentToolkitProfile = profileService.currentProfile;
  currentSelectableProfile = SelectableProfileService.currentProfile;

  Assert.ok(
    currentSelectableProfile,
    "Should now have a current selectable profile"
  );
  Assert.ok(
    ResetProfile.resetSupported(),
    "Reset should still be supported with a current selectable profile"
  );
});
