/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { TestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/TestUtils.sys.mjs"
);

/**
 * Tests that preferences are properly set by distribution.ini
 */

registerCleanupFunction(async function () {
  // Remove the distribution dir, even if the test failed, otherwise all
  // next tests will use it.
  let folderPath = PathUtils.join(PathUtils.profileDir, "distribution");
  await IOUtils.remove(folderPath, { ignoreAbsent: true, recursive: true });
  Assert.ok(!(await IOUtils.exists(folderPath)));
  Services.prefs.clearUserPref("distribution.testing.loadFromProfile");
});

add_task(async function () {
  // Set special pref to load distribution.ini from the profile folder.
  Services.prefs.setBoolPref("distribution.testing.loadFromProfile", true);

  // Copy distribution.ini file to the profile dir.
  let distroDir = gProfD.clone();
  distroDir.leafName = "distribution";
  let iniFile = distroDir.clone();
  iniFile.append("distribution.ini");
  if (iniFile.exists()) {
    iniFile.remove(false);
    print("distribution.ini already exists, did some test forget to cleanup?");
  }

  let testDistributionFile = do_get_cwd().clone();
  testDistributionFile.append("distribution.ini");
  testDistributionFile.copyTo(distroDir, "distribution.ini");
  Assert.ok(testDistributionFile.exists());
});

add_task(async function () {
  let { DistributionManagement } = ChromeUtils.importESModule(
    "resource:///modules/distribution.sys.mjs"
  );

  DistributionManagement.applyCustomizations();

  var defaultBranch = Services.prefs.getDefaultBranch(null);

  Assert.equal(defaultBranch.getCharPref("distribution.id"), "disttest");
  Assert.equal(defaultBranch.getCharPref("distribution.version"), "1.0");
  Assert.equal(
    defaultBranch.getStringPref("distribution.about"),
    "Tèƨƭ δïƨƭřïβúƭïôñ ƒïℓè"
  );

  Assert.equal(
    defaultBranch.getCharPref("distribution.test.string"),
    "Test String"
  );
  Assert.equal(
    defaultBranch.getCharPref("distribution.test.string.noquotes"),
    "Test String"
  );
  Assert.equal(defaultBranch.getIntPref("distribution.test.int"), 777);
  Assert.equal(defaultBranch.getBoolPref("distribution.test.bool.true"), true);
  Assert.equal(
    defaultBranch.getBoolPref("distribution.test.bool.false"),
    false
  );

  Assert.throws(
    () => defaultBranch.getCharPref("distribution.test.empty"),
    /NS_ERROR_UNEXPECTED/
  );
  Assert.throws(
    () => defaultBranch.getIntPref("distribution.test.empty"),
    /NS_ERROR_UNEXPECTED/
  );
  Assert.throws(
    () => defaultBranch.getBoolPref("distribution.test.empty"),
    /NS_ERROR_UNEXPECTED/
  );

  Assert.equal(
    defaultBranch.getCharPref("distribution.test.pref.locale"),
    "en-US"
  );
  Assert.equal(
    defaultBranch.getCharPref("distribution.test.pref.language.en"),
    "en"
  );
  Assert.equal(
    defaultBranch.getCharPref("distribution.test.pref.locale.en-US"),
    "en-US"
  );
  Assert.throws(
    () => defaultBranch.getCharPref("distribution.test.pref.language.de"),
    /NS_ERROR_UNEXPECTED/
  );
  // This value was never set because of the empty language specific pref
  Assert.throws(
    () => defaultBranch.getCharPref("distribution.test.pref.language.reset"),
    /NS_ERROR_UNEXPECTED/
  );
  // This value was never set because of the empty locale specific pref
  Assert.throws(
    () => defaultBranch.getCharPref("distribution.test.pref.locale.reset"),
    /NS_ERROR_UNEXPECTED/
  );
  // This value was overridden by a locale specific setting
  Assert.equal(
    defaultBranch.getCharPref("distribution.test.pref.locale.set"),
    "Locale Set"
  );
  // This value was overridden by a language specific setting
  Assert.equal(
    defaultBranch.getCharPref("distribution.test.pref.language.set"),
    "Language Set"
  );
  // Language should not override locale
  Assert.notEqual(
    defaultBranch.getCharPref("distribution.test.pref.locale.set"),
    "Language Set"
  );

  Assert.equal(
    defaultBranch.getStringPref("distribution.test.locale"),
    "en-US"
  );
  Assert.equal(defaultBranch.getStringPref("distribution.test.language"), "en");
  Assert.deepEqual(Services.locale.requestedLocales, ["en-US"]);
});

add_task(async function test_localizable_prefs_update_on_locale_change() {
  let defaultBranch = Services.prefs.getDefaultBranch(null);
  let originalLocales = Services.locale.requestedLocales;

  let localeChanged = TestUtils.topicObserved("intl:requested-locales-changed");
  Services.locale.requestedLocales = ["de-DE"];
  await localeChanged;

  Assert.equal(
    defaultBranch.getStringPref("distribution.test.locale"),
    "de-DE"
  );
  Assert.equal(defaultBranch.getStringPref("distribution.test.language"), "de");

  Services.locale.requestedLocales = originalLocales;
});
