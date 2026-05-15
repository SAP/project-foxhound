/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/*
 * Tests that profile is inside App Group container when MOZ_APP_GROUP is set.
 */

add_task(async function test_appgroup_profile_location() {
  if (AppConstants.MOZ_UPDATE_CHANNEL != "nightly") {
    return;
  }
  Services.env.set("MOZ_APP_GROUP", "1");
  const profileName = "testappgroup";
  const service = getProfileService();
  const profile = service.createProfile(null, profileName);
  profile.lock({});
  service.flush();

  registerCleanupFunction(() => {
    if (profile) {
      profile.remove(true);
      service.flush();
    }
    Services.env.set("MOZ_APP_GROUP", "");
  });

  const profileDir = profile.rootDir;

  const APP_GROUP_PATH =
    "Group Containers/43AQ936H96.org.mozilla.firefox.browserprofiles";

  Assert.ok(
    profileDir.path.includes(APP_GROUP_PATH),
    "Profile should be inside App Group container when MOZ_APP_GROUP is set"
  );

  const uAppData = Services.dirsvc.get("UAppData", Ci.nsIFile);
  const iniFile = uAppData.clone();
  iniFile.append("profiles.ini");

  const factory = Cc["@mozilla.org/xpcom/ini-parser-factory;1"].getService(
    Ci.nsIINIParserFactory
  );
  const ini = factory.createINIParser(iniFile);

  // Find the section whose name matches our profile.
  let sectionName = null;
  const sections = ini.getSections();
  while (sections.hasMore()) {
    const s = sections.getNext();
    let name = "";
    try {
      name = ini.getString(s, "Name");
    } catch (_) {}
    if (name === profileName) {
      sectionName = s;
      break;
    }
  }
  Assert.ok(sectionName, "profiles.ini contains a section for this profile");

  // Ensure profiles.ini stores a relative entry.
  Assert.equal(
    ini.getString(sectionName, "IsRelative"),
    "1",
    "IsRelative=1 for App Group profile"
  );

  const relPath = ini.getString(sectionName, "Path");
  Assert.ok(!relPath.startsWith("/"), "profiles.ini Path is not absolute");
  Assert.ok(
    relPath.includes("/Profiles/"),
    "profiles.ini Path contains /Profiles/"
  );

  // localDir should also be under the App Group container.
  const localDir = profile.localDir;
  Assert.ok(
    localDir.path.includes(APP_GROUP_PATH) &&
      localDir.path.includes("/Library/Caches/Profiles/"),
    "localDir should be under App Group Library/Caches/Profiles"
  );

  const localTail = localDir.path.split("/Profiles/")[1];
  const rootTail = profileDir.path.split("/Profiles/")[1];
  Assert.equal(
    localTail,
    rootTail,
    "localDir keeps the same Profiles/ tail as rootDir"
  );
});
