/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import { BackupResource } from "resource:///modules/backup/BackupResource.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  BookmarkJSONUtils: "resource://gre/modules/BookmarkJSONUtils.sys.mjs",
});

const BOOKMARKS_BACKUP_FILENAME = "bookmarks.jsonlz4";

/**
 * Class representing Bookmarks database related files within a user profile.
 */
export class BookmarksBackupResource extends BackupResource {
  static get key() {
    return "bookmarks";
  }

  static get requiresEncryption() {
    return false;
  }

  static get canBackupResource() {
    /**
     * We don't need to backup bookmarks if places is being backed up
     * since places.sqlite has bookmarks in it. This resource is to be used
     * when places cannot be backed up, like in the case of sanitizeOnShutdown
     * See Bug 1994875
     */
    return !BackupResource.backingUpPlaces;
  }

  static get priority() {
    return 1;
  }

  async backup(
    stagingPath,
    _profilePath = PathUtils.profileDir,
    _isEncrypting = false
  ) {
    let bookmarksBackupFile = PathUtils.join(
      stagingPath,
      BOOKMARKS_BACKUP_FILENAME
    );
    await lazy.BookmarkJSONUtils.exportToFile(bookmarksBackupFile, {
      compress: true,
    });
    return null;
  }

  async recover(_manifestEntry, recoveryPath, _destProfilePath) {
    /**
     * pass the file path to postRecovery() so that we can import all bookmarks into the new
     * profile once it's been launched and restored.
     */
    let bookmarksBackupPath = PathUtils.join(
      recoveryPath,
      BOOKMARKS_BACKUP_FILENAME
    );
    return { bookmarksBackupPath };
  }

  async postRecovery(postRecoveryEntry) {
    if (postRecoveryEntry?.bookmarksBackupPath) {
      await lazy.BookmarkJSONUtils.importFromFile(
        postRecoveryEntry.bookmarksBackupPath,
        {
          replace: true,
        }
      );
    }
  }

  async measure(_profilePath = PathUtils.profileDir) {
    // Unsure how to measure this!!
  }
}
