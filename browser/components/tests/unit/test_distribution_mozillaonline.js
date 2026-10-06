/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const MOZILLAONLINE_INI = `
[Global]
id=MozillaOnline
version=1.0
about=Mozilla Online distribution

[Preferences]
distribution.test.mozillaonline=true
`;

async function setupDistributionDir(iniContent) {
  Services.prefs.setBoolPref("distribution.testing.loadFromProfile", true);

  let distroDir = gProfD.clone();
  distroDir.leafName = "distribution";
  await IOUtils.makeDirectory(distroDir.path, { ignoreExisting: true });

  let iniFile = distroDir.clone();
  iniFile.append("distribution.ini");
  await IOUtils.writeUTF8(iniFile.path, iniContent);
}

registerCleanupFunction(async function () {
  let folderPath = PathUtils.join(PathUtils.profileDir, "distribution");
  await IOUtils.remove(folderPath, { ignoreAbsent: true, recursive: true });
  Services.prefs.clearUserPref("distribution.testing.loadFromProfile");
  Services.prefs.clearUserPref("distribution.mozillaonline.ignore");
  Services.fog.testResetFOG();
});

add_setup(async function () {
  do_get_profile();
  Services.fog.initializeFOG();
  await setupDistributionDir(MOZILLAONLINE_INI);
});

add_task(async function test_mozillaonline_distribution_ignored() {
  Services.prefs.setBoolPref("distribution.mozillaonline.ignore", true);

  let { DistributionManagement } = ChromeUtils.importESModule(
    "resource:///modules/distribution.sys.mjs"
  );

  DistributionManagement.applyCustomizations();

  let defaultBranch = Services.prefs.getDefaultBranch(null);

  Assert.throws(
    () => defaultBranch.getCharPref("distribution.id"),
    /NS_ERROR_UNEXPECTED/,
    "distribution.id should not be set for mozillaonline"
  );
  Assert.throws(
    () => defaultBranch.getBoolPref("distribution.test.mozillaonline"),
    /NS_ERROR_UNEXPECTED/,
    "distribution prefs should not be applied for mozillaonline"
  );

  Assert.ok(
    Glean.distribution.mozillaonlineIgnored.testGetValue(),
    "mozillaonline_ignored should be set to true"
  );
});
