/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BackupResource } from "resource:///modules/backup/BackupResource.sys.mjs";
import { Sqlite } from "resource://gre/modules/Sqlite.sys.mjs";

/**
 * Class representing files that modify preferences and permissions within a user profile.
 */
export class PreferencesBackupResource extends BackupResource {
  static get key() {
    return "preferences";
  }

  static get requiresEncryption() {
    return false;
  }

  async backup(stagingPath, profilePath = PathUtils.profileDir) {
    // These are files that can be simply copied into the staging folder using
    // IOUtils.copy.
    const simpleCopyFiles = [
      "xulstore.json",
      "containers.json",
      "handlers.json",
      "search.json.mozlz4",
      "user.js",
      "chrome",
    ];

    for (let fileName of simpleCopyFiles) {
      let sourcePath = PathUtils.join(profilePath, fileName);
      let destPath = PathUtils.join(stagingPath, fileName);
      if (await IOUtils.exists(sourcePath)) {
        await IOUtils.copy(sourcePath, destPath, { recursive: true });
      }
    }

    const sqliteDatabases = ["permissions.sqlite", "content-prefs.sqlite"];

    for (let fileName of sqliteDatabases) {
      let sourcePath = PathUtils.join(profilePath, fileName);
      let destPath = PathUtils.join(stagingPath, fileName);
      let connection;

      try {
        connection = await Sqlite.openConnection({
          path: sourcePath,
        });

        await connection.backup(destPath);
      } finally {
        await connection.close();
      }
    }

    // prefs.js is a special case - we have a helper function to flush the
    // current prefs state to disk off of the main thread.
    let prefsDestPath = PathUtils.join(stagingPath, "prefs.js");
    let prefsDestFile = await IOUtils.getFile(prefsDestPath);
    await Services.prefs.backupPrefFile(prefsDestFile);

    return null;
  }

  async measure(profilePath = PathUtils.profileDir) {
    const files = [
      "prefs.js",
      "xulstore.json",
      "permissions.sqlite",
      "content-prefs.sqlite",
      "containers.json",
      "handlers.json",
      "search.json.mozlz4",
      "user.js",
    ];
    let fullSize = 0;

    for (let filePath of files) {
      let resourcePath = PathUtils.join(profilePath, filePath);
      let resourceSize = await BackupResource.getFileSize(resourcePath);
      if (Number.isInteger(resourceSize)) {
        fullSize += resourceSize;
      }
    }

    const chromeDirectoryPath = PathUtils.join(profilePath, "chrome");
    let chromeDirectorySize = await BackupResource.getDirectorySize(
      chromeDirectoryPath
    );
    if (Number.isInteger(chromeDirectorySize)) {
      fullSize += chromeDirectorySize;
    }

    Glean.browserBackup.preferencesSize.set(fullSize);
  }
}
