/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  AppConstants: "resource://gre/modules/AppConstants.sys.mjs",
  BackupError: "resource:///modules/backup/BackupError.mjs",
});

add_task(function test_empty() {
  let bs = new BackupService();
  Assert.throws(
    () => bs.setParentDirPath(""),
    BackupError,
    "empty string is rejected"
  );
});

add_task(function test_typical() {
  let bs = new BackupService();
  let name = "setParentDirPath_typical";
  let path = PathUtils.join(do_get_profile().path, name);
  bs.setParentDirPath(path);
  Assert.equal(
    Services.prefs.getStringPref("browser.backup.location"),
    PathUtils.join(path, "Restore Firefox"),
    "Path with 'Restore Firefox' appended is used"
  );
});

add_task(function test_already_decorated() {
  let bs = new BackupService();
  let name = "setParentDirPath_already_decorated";
  let path = PathUtils.join(do_get_profile().path, name, "Restore Firefox");
  bs.setParentDirPath(path);
  Assert.equal(
    Services.prefs.getStringPref("browser.backup.location"),
    path,
    "No duplicate 'Restore Firefox' is appended"
  );
});
