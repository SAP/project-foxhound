/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { FileUtils } from "resource://gre/modules/FileUtils.sys.mjs";

import { MigrationUtils } from "resource:///modules/MigrationUtils.sys.mjs";
import { MigratorBase } from "resource:///modules/MigratorBase.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FormHistory: "resource://gre/modules/FormHistory.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  PropertyListUtils: "resource://gre/modules/PropertyListUtils.sys.mjs",
});

function Bookmarks(aBookmarksFile) {
  this._file = aBookmarksFile;
}
Bookmarks.prototype = {
  type: MigrationUtils.resourceTypes.BOOKMARKS,

  migrate: function B_migrate(aCallback) {
    return (async () => {
      let dict = await new Promise(resolve =>
        lazy.PropertyListUtils.read(this._file, resolve)
      );
      if (!dict) {
        throw new Error("Could not read Bookmarks.plist");
      }
      let children = dict.get("Children");
      if (!children) {
        throw new Error("Invalid Bookmarks.plist format");
      }

      let collection =
        dict.get("Title") == "com.apple.ReadingList"
          ? this.READING_LIST_COLLECTION
          : this.ROOT_COLLECTION;
      await this._migrateCollection(children, collection);
    })().then(
      () => aCallback(true),
      e => {
        console.error(e);
        aCallback(false);
      }
    );
  },

  // Bookmarks collections in Safari.  Constants for migrateCollection.
  ROOT_COLLECTION: 0,
  MENU_COLLECTION: 1,
  TOOLBAR_COLLECTION: 2,
  READING_LIST_COLLECTION: 3,

  /**
   * Recursively migrate a Safari collection of bookmarks.
   *
   * @param {object[]} aEntries
   *   The collection's children
   * @param {number} aCollection
   *   One of the _COLLECTION values above.
   */
  async _migrateCollection(aEntries, aCollection) {
    // A collection of bookmarks in Safari resembles places roots.  In the
    // property list files (Bookmarks.plist, ReadingList.plist) they are
    // stored as regular bookmarks folders, and thus can only be distinguished
    // from by their names and places in the hierarchy.

    let entriesFiltered = [];
    if (aCollection == this.ROOT_COLLECTION) {
      for (let entry of aEntries) {
        let type = entry.get("WebBookmarkType");
        if (type == "WebBookmarkTypeList" && entry.has("Children")) {
          let title = entry.get("Title");
          let children = entry.get("Children");
          if (title == "BookmarksBar") {
            await this._migrateCollection(children, this.TOOLBAR_COLLECTION);
          } else if (title == "BookmarksMenu") {
            await this._migrateCollection(children, this.MENU_COLLECTION);
          } else if (title == "com.apple.ReadingList") {
            await this._migrateCollection(
              children,
              this.READING_LIST_COLLECTION
            );
          } else if (entry.get("ShouldOmitFromUI") !== true) {
            entriesFiltered.push(entry);
          }
        } else if (type == "WebBookmarkTypeLeaf") {
          entriesFiltered.push(entry);
        }
      }
    } else {
      entriesFiltered = aEntries;
    }

    if (!entriesFiltered.length) {
      return;
    }

    let folderGuid = -1;
    switch (aCollection) {
      case this.ROOT_COLLECTION: {
        // In Safari, it is possible (though quite cumbersome) to move
        // bookmarks to the bookmarks root, which is the parent folder of
        // all bookmarks "collections".  That is somewhat in parallel with
        // both the places root and the unfiled-bookmarks root.
        // Because the former is only an implementation detail in our UI,
        // the unfiled root seems to be the best choice.
        folderGuid = lazy.PlacesUtils.bookmarks.unfiledGuid;
        break;
      }
      case this.MENU_COLLECTION: {
        folderGuid = lazy.PlacesUtils.bookmarks.menuGuid;
        break;
      }
      case this.TOOLBAR_COLLECTION: {
        folderGuid = lazy.PlacesUtils.bookmarks.toolbarGuid;
        break;
      }
      case this.READING_LIST_COLLECTION: {
        // Reading list items are imported as regular bookmarks.
        // They are imported under their own folder, created either under the
        // bookmarks menu (in the case of startup migration).
        let readingListTitle = await MigrationUtils.getLocalizedString(
          "imported-safari-reading-list"
        );
        folderGuid = (
          await MigrationUtils.insertBookmarkWrapper({
            parentGuid: lazy.PlacesUtils.bookmarks.menuGuid,
            type: lazy.PlacesUtils.bookmarks.TYPE_FOLDER,
            title: readingListTitle,
          })
        ).guid;
        break;
      }
      default:
        throw new Error("Unexpected value for aCollection!");
    }
    if (folderGuid == -1) {
      throw new Error("Invalid folder GUID");
    }

    await this._migrateEntries(entriesFiltered, folderGuid);
  },

  // migrate the given array of safari bookmarks to the given places
  // folder.
  _migrateEntries(entries, parentGuid) {
    let convertedEntries = this._convertEntries(entries);
    return MigrationUtils.insertManyBookmarksWrapper(
      convertedEntries,
      parentGuid
    );
  },

  _convertEntries(entries) {
    return entries
      .map(function(entry) {
        let type = entry.get("WebBookmarkType");
        if (type == "WebBookmarkTypeList" && entry.has("Children")) {
          return {
            title: entry.get("Title"),
            type: lazy.PlacesUtils.bookmarks.TYPE_FOLDER,
            children: this._convertEntries(entry.get("Children")),
          };
        }
        if (type == "WebBookmarkTypeLeaf" && entry.has("URLString")) {
          // Check we understand this URL before adding it:
          let url = entry.get("URLString");
          try {
            new URL(url);
          } catch (ex) {
            console.error(
              `Ignoring ${url} when importing from Safari because of exception: ${ex}`
            );
            return null;
          }
          let title;
          if (entry.has("URIDictionary")) {
            title = entry.get("URIDictionary").get("title");
          }
          return { url, title };
        }
        return null;
      }, this)
      .filter(e => !!e);
  },
};

function History(aHistoryFile) {
  this._file = aHistoryFile;
}
History.prototype = {
  type: MigrationUtils.resourceTypes.HISTORY,

  // Helper method for converting the visit date property to a PRTime value.
  // The visit date is stored as a string, so it's not read as a Date
  // object by PropertyListUtils.
  _parseCocoaDate: function H___parseCocoaDate(aCocoaDateStr) {
    let asDouble = parseFloat(aCocoaDateStr);
    if (!isNaN(asDouble)) {
      // reference date of NSDate.
      let date = new Date("1 January 2001, GMT");
      date.setMilliseconds(asDouble * 1000);
      return date;
    }
    return new Date();
  },

  migrate: function H_migrate(aCallback) {
    lazy.PropertyListUtils.read(this._file, aDict => {
      try {
        if (!aDict) {
          throw new Error("Could not read history property list");
        }
        if (!aDict.has("WebHistoryDates")) {
          throw new Error("Unexpected history-property list format");
        }

        let pageInfos = [];
        let entries = aDict.get("WebHistoryDates");
        let failedOnce = false;
        for (let entry of entries) {
          if (entry.has("lastVisitedDate")) {
            let date = this._parseCocoaDate(entry.get("lastVisitedDate"));
            try {
              pageInfos.push({
                url: new URL(entry.get("")),
                title: entry.get("title"),
                visits: [
                  {
                    // Safari's History file contains only top-level urls.  It does not
                    // distinguish between typed urls and linked urls.
                    transition: lazy.PlacesUtils.history.TRANSITIONS.LINK,
                    date,
                  },
                ],
              });
            } catch (ex) {
              // Safari's History file may contain malformed URIs which
              // will be ignored.
              console.error(ex);
              failedOnce = true;
            }
          }
        }
        if (!pageInfos.length) {
          // If we failed at least once, then we didn't succeed in importing,
          // otherwise we didn't actually have anything to import, so we'll
          // report it as a success.
          aCallback(!failedOnce);
          return;
        }

        MigrationUtils.insertVisitsWrapper(pageInfos).then(
          () => aCallback(true),
          () => aCallback(false)
        );
      } catch (ex) {
        console.error(ex);
        aCallback(false);
      }
    });
  },
};

/**
 * Safari's preferences property list is independently used for three purposes:
 * (a) importation of preferences
 * (b) importation of search strings
 * (c) retrieving the home page.
 *
 * So, rather than reading it three times, it's cached and managed here.
 *
 * @param {nsIFile} aPreferencesFile
 *   The .plist file to be read.
 */
function MainPreferencesPropertyList(aPreferencesFile) {
  this._file = aPreferencesFile;
  this._callbacks = [];
}
MainPreferencesPropertyList.prototype = {
  /**
   * @see PropertyListUtils.read
   * @param {Function} aCallback
   *   A callback called with an Object representing the key-value pairs
   *   read out of the .plist file.
   */
  read: function MPPL_read(aCallback) {
    if ("_dict" in this) {
      aCallback(this._dict);
      return;
    }

    let alreadyReading = !!this._callbacks.length;
    this._callbacks.push(aCallback);
    if (!alreadyReading) {
      lazy.PropertyListUtils.read(this._file, aDict => {
        this._dict = aDict;
        for (let callback of this._callbacks) {
          try {
            callback(aDict);
          } catch (ex) {
            console.error(ex);
          }
        }
        this._callbacks.splice(0);
      });
    }
  },
};

function SearchStrings(aMainPreferencesPropertyListInstance) {
  this._mainPreferencesPropertyList = aMainPreferencesPropertyListInstance;
}
SearchStrings.prototype = {
  type: MigrationUtils.resourceTypes.OTHERDATA,

  migrate: function SS_migrate(aCallback) {
    this._mainPreferencesPropertyList.read(
      MigrationUtils.wrapMigrateFunction(function migrateSearchStrings(aDict) {
        if (!aDict) {
          throw new Error("Could not get preferences dictionary");
        }

        if (aDict.has("RecentSearchStrings")) {
          let recentSearchStrings = aDict.get("RecentSearchStrings");
          if (recentSearchStrings && recentSearchStrings.length) {
            let changes = recentSearchStrings.map(searchString => ({
              op: "add",
              fieldname: "searchbar-history",
              value: searchString,
            }));
            lazy.FormHistory.update(changes);
          }
        }
      }, aCallback)
    );
  },
};

/**
 * Safari migrator
 */
export class SafariProfileMigrator extends MigratorBase {
  static get key() {
    return "safari";
  }

  static get displayNameL10nID() {
    return "migration-wizard-migrator-display-name-safari";
  }

  getResources() {
    let profileDir = FileUtils.getDir("ULibDir", ["Safari"], false);
    if (!profileDir.exists()) {
      return null;
    }

    let resources = [];
    let pushProfileFileResource = function(aFileName, aConstructor) {
      let file = profileDir.clone();
      file.append(aFileName);
      if (file.exists()) {
        resources.push(new aConstructor(file));
      }
    };

    pushProfileFileResource("History.plist", History);
    pushProfileFileResource("Bookmarks.plist", Bookmarks);

    // The Reading List feature was introduced at the same time in Windows and
    // Mac versions of Safari.  Not surprisingly, they are stored in the same
    // format in both versions.  Surpsingly, only on Windows there is a
    // separate property list for it.  This code is used on mac too, because
    // Apple may fix this at some point.
    pushProfileFileResource("ReadingList.plist", Bookmarks);

    let prefs = this.mainPreferencesPropertyList;
    if (prefs) {
      resources.push(new SearchStrings(prefs));
    }

    return resources;
  }

  async getLastUsedDate() {
    const profileDir = FileUtils.getDir("ULibDir", ["Safari"], false);
    const dates = await Promise.all(
      ["Bookmarks.plist", "History.plist"].map(file => {
        const path = PathUtils.join(profileDir.path, file);
        return IOUtils.stat(path)
          .then(info => info.lastModified)
          .catch(() => 0);
      })
    );

    return new Date(Math.max(...dates));
  }

  async hasPermissions() {
    if (this._hasPermissions) {
      return true;
    }
    // Check if we have access:
    let target = FileUtils.getDir(
      "ULibDir",
      ["Safari", "Bookmarks.plist"],
      false
    );
    try {
      // 'stat' is always allowed, but reading is somehow not, if the user hasn't
      // allowed it:
      await IOUtils.read(target.path, { maxBytes: 1 });
      this._hasPermissions = true;
      return true;
    } catch (ex) {
      return false;
    }
  }

  async getPermissions(win) {
    // Keep prompting the user until they pick a file that grants us access,
    // or they cancel out of the file open panel.
    while (!(await this.hasPermissions())) {
      let fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
      // The title (second arg) is not displayed on macOS, so leave it blank.
      fp.init(win, "", Ci.nsIFilePicker.modeOpen);
      // This is a little weird. You'd expect that it matters which file
      // the user picks, but it doesn't really, as long as it's in this
      // directory. Anyway, let's not confuse the user: the sensible idea
      // here is to ask for permissions for Bookmarks.plist, and we'll
      // silently accept whatever input as long as we can then read the plist.
      fp.appendFilter("plist", "*.plist");
      fp.filterIndex = 1;
      fp.displayDirectory = FileUtils.getDir("ULibDir", ["Safari"], false);
      // Now wait for the filepicker to open and close. If the user picks
      // any file in this directory, macOS will grant us read access, so
      // we don't need to check or do anything else with the file returned
      // by the filepicker.
      let result = await new Promise(resolve => fp.open(resolve));
      // Bail if the user cancels the dialog:
      if (result == Ci.nsIFilePicker.returnCancel) {
        return false;
      }
    }
    return true;
  }

  get mainPreferencesPropertyList() {
    if (this._mainPreferencesPropertyList === undefined) {
      let file = FileUtils.getDir("UsrPrfs", [], false);
      if (file.exists()) {
        file.append("com.apple.Safari.plist");
        if (file.exists()) {
          this._mainPreferencesPropertyList = new MainPreferencesPropertyList(
            file
          );
          return this._mainPreferencesPropertyList;
        }
      }
      this._mainPreferencesPropertyList = null;
      return this._mainPreferencesPropertyList;
    }
    return this._mainPreferencesPropertyList;
  }
}
