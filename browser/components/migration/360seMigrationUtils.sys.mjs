/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

import { MigrationUtils } from "resource:///modules/MigrationUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  Sqlite: "resource://gre/modules/Sqlite.sys.mjs",
});

XPCOMUtils.defineLazyGetter(
  lazy,
  "filenamesRegex",
  () => /^360(?:default_ori|sefav)_([0-9_]+)\.favdb$/i
);

const kBookmarksFileName = "360sefav.dat";

function Bookmarks(aProfileFolder) {
  let file = aProfileFolder.clone();
  file.append(kBookmarksFileName);

  this._file = file;
}
Bookmarks.prototype = {
  type: MigrationUtils.resourceTypes.BOOKMARKS,

  get exists() {
    return this._file.exists() && this._file.isReadable();
  },

  migrate(aCallback) {
    return (async () => {
      let folderMap = new Map();
      let toolbarBMs = [];

      let connection = await lazy.Sqlite.openConnection({
        path: this._file.path,
      });

      try {
        let rows = await connection.execute(
          `WITH RECURSIVE
           bookmark(id, parent_id, is_folder, title, url, pos) AS (
             VALUES(0, -1, 1, '', '', 0)
             UNION
             SELECT f.id, f.parent_id, f.is_folder, f.title, f.url, f.pos
             FROM tb_fav AS f
             JOIN bookmark AS b ON f.parent_id = b.id
             ORDER BY f.pos ASC
           )
           SELECT id, parent_id, is_folder, title, url FROM bookmark WHERE id`
        );

        for (let row of rows) {
          let id = parseInt(row.getResultByName("id"), 10);
          let parent_id = parseInt(row.getResultByName("parent_id"), 10);
          let is_folder = parseInt(row.getResultByName("is_folder"), 10);
          let title = row.getResultByName("title");
          let url = row.getResultByName("url");

          let bmToInsert;

          if (is_folder) {
            bmToInsert = {
              children: [],
              title,
              type: lazy.PlacesUtils.bookmarks.TYPE_FOLDER,
            };
            folderMap.set(id, bmToInsert);
          } else {
            try {
              new URL(url);
            } catch (ex) {
              console.error(
                `Ignoring ${url} when importing from 360se because of exception: ${ex}`
              );
              continue;
            }

            bmToInsert = {
              title,
              url,
            };
          }

          if (folderMap.has(parent_id)) {
            folderMap.get(parent_id).children.push(bmToInsert);
          } else if (parent_id === 0) {
            toolbarBMs.push(bmToInsert);
          }
        }
      } finally {
        await connection.close();
      }

      if (toolbarBMs.length) {
        let parentGuid = lazy.PlacesUtils.bookmarks.toolbarGuid;
        await MigrationUtils.insertManyBookmarksWrapper(toolbarBMs, parentGuid);
      }
    })().then(
      () => aCallback(true),
      e => {
        console.error(e);
        aCallback(false);
      }
    );
  },
};

export var Qihoo360seMigrationUtils = {
  async getAlternativeBookmarks({ bookmarksPath, localState }) {
    let lastModificationDate = new Date(0);
    let path = bookmarksPath;
    let profileFolder = PathUtils.parent(bookmarksPath);

    if (await IOUtils.exists(bookmarksPath)) {
      try {
        let { lastModified } = await IOUtils.stat(bookmarksPath);
        lastModificationDate = new Date(lastModified);
      } catch (ex) {
        console.error(ex);
      }
    }

    // Somewhat similar to source profiles, but for bookmarks only
    let subDir =
      (localState.sync_login_info && localState.sync_login_info.filepath) || "";

    if (subDir) {
      let legacyBookmarksPath = PathUtils.join(
        profileFolder,
        subDir,
        kBookmarksFileName
      );
      if (await IOUtils.exists(legacyBookmarksPath)) {
        try {
          let { lastModified } = await IOUtils.stat(legacyBookmarksPath);
          lastModificationDate = new Date(lastModified);
          path = legacyBookmarksPath;
        } catch (ex) {
          console.error(ex);
        }
      }
    }

    let dailyBackupPath = PathUtils.join(profileFolder, subDir, "DailyBackup");
    for (const entry of await IOUtils.getChildren(dailyBackupPath, {
      ignoreAbsent: true,
    })) {
      let filename = PathUtils.filename(entry);
      let matches = lazy.filenamesRegex.exec(filename);
      if (!matches) {
        continue;
      }

      let entryDate = new Date(matches[1].replace(/_/g, "-"));
      if (entryDate < lastModificationDate) {
        continue;
      }

      lastModificationDate = entryDate;
      path = entry;
    }

    if (PathUtils.filename(path) === kBookmarksFileName) {
      let resource = this.getLegacyBookmarksResource(PathUtils.parent(path));
      return { resource };
    }
    return { path };
  },

  getLegacyBookmarksResource(aParentFolder) {
    let parentFolder;
    try {
      parentFolder = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
      parentFolder.initWithPath(aParentFolder);
    } catch (ex) {
      console.error(ex);
      return null;
    }

    let bookmarks = new Bookmarks(parentFolder);
    return bookmarks.exists ? bookmarks : null;
  },
};
