/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

add_task(async function test_idle_cleanup() {
  Services.fog.testResetFOG();
  Services.prefs.setBoolPref(
    "network.cache.shutdown_purge_in_background_task",
    true
  );
  Services.prefs.setBoolPref("privacy.clearOnShutdown.cache", true);
  Services.prefs.setBoolPref("privacy.sanitize.sanitizeOnShutdown", true);
  let dir = Services.dirsvc.get("ProfD", Ci.nsIFile);
  dir.append("cache2.2021-11-25-08-47-04.purge.bg_rm");
  Assert.equal(dir.exists(), false, `Folder ${dir.path} should not exist`);
  dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0o744);
  Assert.equal(
    dir.exists(),
    true,
    `Folder ${dir.path} should have been created`
  );

  Services.obs.notifyObservers(null, "idle-daily");

  await TestUtils.waitForCondition(() => {
    return !dir.exists();
  });

  Assert.equal(
    dir.exists(),
    false,
    `Folder ${dir.path} should have been purged by background task`
  );
  Assert.equal(
    await Glean.networking.residualCacheFolderCount.testGetValue(),
    1
  );
  Assert.equal(
    await Glean.networking.residualCacheFolderRemoval.success.testGetValue(),
    1
  );
  Assert.equal(
    await Glean.networking.residualCacheFolderRemoval.failure.testGetValue(),
    null
  );

  // Check that telemetry properly detects folders failing to be deleted when readonly
  // Making folders readonly only works on windows
  if (AppConstants.platform == "win") {
    dir.create(Ci.nsIFile.DIRECTORY_TYPE, 0o744);
    dir.QueryInterface(Ci.nsILocalFileWin).readOnly = true;

    Services.obs.notifyObservers(null, "idle-daily");

    await BrowserTestUtils.waitForCondition(async () => {
      return (
        (await Glean.networking.residualCacheFolderRemoval.failure.testGetValue()) ==
        1
      );
    });

    Assert.equal(
      await Glean.networking.residualCacheFolderCount.testGetValue(),
      2
    );
    Assert.equal(
      await Glean.networking.residualCacheFolderRemoval.success.testGetValue(),
      1
    );
    Assert.equal(
      await Glean.networking.residualCacheFolderRemoval.failure.testGetValue(),
      1
    );

    dir.QueryInterface(Ci.nsILocalFileWin).readOnly = false;
    dir.remove(true);
  }

  Services.prefs.clearUserPref(
    "network.cache.shutdown_purge_in_background_task"
  );
  Services.prefs.clearUserPref("privacy.clearOnShutdown.cache");
  Services.prefs.clearUserPref("privacy.sanitize.sanitizeOnShutdown");
});
