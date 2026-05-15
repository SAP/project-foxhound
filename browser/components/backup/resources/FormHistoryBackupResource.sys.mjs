/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BackupResource } from "resource:///modules/backup/BackupResource.sys.mjs";
import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PrivateBrowsingUtils: "resource://gre/modules/PrivateBrowsingUtils.sys.mjs",
});

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "isBrowsingHistoryEnabled",
  "places.history.enabled",
  true
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "isSanitizeOnShutdownEnabled",
  "privacy.sanitize.sanitizeOnShutdown",
  false
);

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "isFormDataClearedOnShutdown",
  "privacy.clearOnShutdown_v2.formdata",
  false
);

/**
 * Class representing Form history database within a user profile.
 */
export class FormHistoryBackupResource extends BackupResource {
  static get key() {
    return "formhistory";
  }

  static get requiresEncryption() {
    return false;
  }

  static get canBackupResource() {
    if (
      lazy.PrivateBrowsingUtils.permanentPrivateBrowsing ||
      !lazy.isBrowsingHistoryEnabled
    ) {
      return false;
    }

    if (!lazy.isSanitizeOnShutdownEnabled) {
      return true;
    }

    return !lazy.isFormDataClearedOnShutdown;
  }

  async backup(
    stagingPath,
    profilePath = PathUtils.profileDir,
    _isEncrypting = false
  ) {
    await BackupResource.copySqliteDatabases(profilePath, stagingPath, [
      "formhistory.sqlite",
    ]);

    return null;
  }

  async recover(_manifestEntry, recoveryPath, destProfilePath) {
    await BackupResource.copyFiles(recoveryPath, destProfilePath, [
      "formhistory.sqlite",
    ]);

    return null;
  }

  async measure(profilePath = PathUtils.profileDir) {
    let formHistoryDBPath = PathUtils.join(profilePath, "formhistory.sqlite");
    let formHistorySize = await BackupResource.getFileSize(formHistoryDBPath);

    Glean.browserBackup.formHistorySize.set(formHistorySize);
  }
}
