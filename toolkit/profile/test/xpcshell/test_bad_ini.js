/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Tests that an invalid profiles.ini doesn't break things
 */

add_task(async () => {
  let target = gDataHome.clone();
  target.append("profiles.ini");

  await IOUtils.writeUTF8(target.path, "[General\r\nkey\r\n=value");

  let { profile, didCreate } = selectStartupProfile();
  checkStartupReason("firstrun-created-default");

  let service = getProfileService();
  Assert.equal(
    Glean.startup.profilesIniStatus.testGetValue("metrics"),
    "ini-error"
  );

  Assert.ok(didCreate, "Should have created a new profile.");
  Assert.equal(
    profile,
    service.defaultProfile,
    "Should have returned the default profile."
  );
  Assert.equal(
    profile.name,
    DEDICATED_NAME,
    "Should have selected the right profile"
  );
});
