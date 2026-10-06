/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BackupResource } from "resource:///modules/backup/BackupResource.sys.mjs";
import { MeasurementUtils } from "resource:///modules/backup/MeasurementUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PlacesDBUtils: "resource://gre/modules/PlacesDBUtils.sys.mjs",
});

/**
 * Class representing Places database related files within a user profile.
 */
export class PlacesBackupResource extends BackupResource {
  static get key() {
    return "places";
  }

  static get requiresEncryption() {
    return false;
  }

  static get priority() {
    return 1;
  }

  static get canBackupResource() {
    return BackupResource.backingUpPlaces;
  }

  async backup(
    stagingPath,
    profilePath = PathUtils.profileDir,
    _isEncrypting = false
  ) {
    // These are copied in parallel because they're attached[1], and we don't
    // want them to get out of sync with one another.
    //
    // [1]: https://www.sqlite.org/lang_attach.html
    let timedCopies = [
      MeasurementUtils.measure(
        Glean.browserBackup.placesTime,
        BackupResource.copySqliteDatabases(profilePath, stagingPath, [
          "places.sqlite",
        ])
      ),
      MeasurementUtils.measure(
        Glean.browserBackup.faviconsTime,
        BackupResource.copySqliteDatabases(profilePath, stagingPath, [
          "favicons.sqlite",
        ])
      ),
    ];
    await Promise.all(timedCopies);

    // Now that both databases are copied, open the places db copy to remove
    // downloaded files, since they won't be valid in the restored profile.
    await lazy.PlacesDBUtils.removeDownloadsMetadataFromDb(
      PathUtils.join(stagingPath, "places.sqlite")
    );

    return null;
  }

  async recover(manifestEntry, recoveryPath, destProfilePath) {
    const simpleCopyFiles = ["places.sqlite", "favicons.sqlite"];
    await BackupResource.copyFiles(
      recoveryPath,
      destProfilePath,
      simpleCopyFiles
    );
    return null;
  }

  async measure(profilePath = PathUtils.profileDir) {
    let placesDBPath = PathUtils.join(profilePath, "places.sqlite");
    let faviconsDBPath = PathUtils.join(profilePath, "favicons.sqlite");
    let placesDBSize = await BackupResource.getFileSize(placesDBPath);
    let faviconsDBSize = await BackupResource.getFileSize(faviconsDBPath);

    Glean.browserBackup.placesSize.set(placesDBSize);
    Glean.browserBackup.faviconsSize.set(faviconsDBSize);
  }
}
