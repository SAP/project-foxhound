/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
  Utils: "resource://services-settings/Utils.sys.mjs",
});

import {
  actionTypes as at,
  actionCreators as ac,
} from "resource://newtab/common/Actions.mjs";

const PREF_WALLPAPERS_ENABLED =
  "browser.newtabpage.activity-stream.newtabWallpapers.enabled";

const PREF_WALLPAPERS_HIGHLIGHT_SEEN_COUNTER =
  "browser.newtabpage.activity-stream.newtabWallpapers.highlightSeenCounter";

const WALLPAPER_REMOTE_SETTINGS_COLLECTION_V2 = "newtab-wallpapers-v2";

const PREF_WALLPAPERS_CUSTOM_WALLPAPER_ENABLED =
  "browser.newtabpage.activity-stream.newtabWallpapers.customWallpaper.enabled";

const PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID =
  "browser.newtabpage.activity-stream.newtabWallpapers.customWallpaper.uuid";

const PREF_SELECTED_WALLPAPER =
  "browser.newtabpage.activity-stream.newtabWallpapers.wallpaper";

const PREF_WALLPAPERS_USER_ENABLED_MIGRATED =
  "browser.newtabpage.activity-stream.newtabWallpapers.user.enabled.migrated";

const RS_FALLBACK_BASE_URL =
  "https://firefox-settings-attachments.cdn.mozilla.net/";

export class WallpaperFeed {
  constructor() {
    this.loaded = false;
    this.wallpaperClient = null;
    this._onSync = this.onSync.bind(this);
  }

  // Constructs a moz-newtab-wallpaper:// URI for the given wallpaper UUID.
  getWallpaperURL(uuid) {
    return `moz-newtab-wallpaper://${uuid}`;
  }

  /**
   * This thin wrapper around global.fetch makes it easier for us to write
   * automated tests that simulate responses from this fetch.
   */
  fetch(...args) {
    return fetch(...args);
  }

  /**
   * This thin wrapper around lazy.RemoteSettings makes it easier for us to write
   * automated tests that simulate responses from this fetch.
   */
  RemoteSettings(...args) {
    return lazy.RemoteSettings(...args);
  }

  async wallpaperSetup(isStartup = false) {
    const wallpapersEnabled = Services.prefs.getBoolPref(
      PREF_WALLPAPERS_ENABLED
    );

    if (wallpapersEnabled) {
      // newtabWallpapers.user.enabled defaults to false, but users who already
      // had a wallpaper selected before this pref was introduced should have
      // it set to true so their wallpaper remains visible after updating.
      //
      // PREF_WALLPAPERS_USER_ENABLED_MIGRATED tracks whether this one-time
      // check has already run. Without it, wallpaperSetup (which is called on
      // startup and on Remote Settings sync) would re-run the check every time,
      // undoing any explicit toggle-off the user makes.
      //
      // @backward-compat { version 152 }
      // This migration block and PREF_WALLPAPERS_USER_ENABLED_MIGRATED can be
      // removed once Firefox 152 is on Release, at which point all users will
      // have run this migration.
      if (
        !Services.prefs.getBoolPref(
          PREF_WALLPAPERS_USER_ENABLED_MIGRATED,
          false
        )
      ) {
        // Mark as done immediately so subsequent wallpaperSetup calls skip this.
        Services.prefs.setBoolPref(PREF_WALLPAPERS_USER_ENABLED_MIGRATED, true);
        const selectedWallpaper = Services.prefs.getStringPref(
          PREF_SELECTED_WALLPAPER,
          ""
        );
        if (selectedWallpaper) {
          this.store.dispatch(
            ac.SetPref("newtabWallpapers.user.enabled", true)
          );
        }
      }

      if (!this.wallpaperClient) {
        // getting collection
        this.wallpaperClient = this.RemoteSettings(
          WALLPAPER_REMOTE_SETTINGS_COLLECTION_V2
        );
      }

      this.wallpaperClient.on("sync", this._onSync);
      this.updateWallpapers(isStartup);
    }
  }

  async wallpaperTeardown() {
    if (this._onSync) {
      this.wallpaperClient?.off("sync", this._onSync);
    }
    this.loaded = false;
    this.wallpaperClient = null;
  }

  async onSync() {
    this.wallpaperTeardown();
    await this.wallpaperSetup(false /* isStartup */);
  }

  async updateWallpapers(isStartup = false) {
    let uuid = Services.prefs.getStringPref(
      PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID,
      ""
    );

    const selectedWallpaper = Services.prefs.getStringPref(
      PREF_SELECTED_WALLPAPER,
      ""
    );

    if (uuid && selectedWallpaper === "custom") {
      const wallpaperURI = this.getWallpaperURL(uuid);

      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WALLPAPERS_CUSTOM_SET,
          data: wallpaperURI,
        })
      );
    } else {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WALLPAPERS_CUSTOM_SET,
          data: null,
        })
      );
    }

    // retrieving all records in collection
    const records = await this.wallpaperClient.get();
    if (!records?.length) {
      return;
    }

    const customWallpaperEnabled = Services.prefs.getBoolPref(
      PREF_WALLPAPERS_CUSTOM_WALLPAPER_ENABLED
    );

    let baseAttachmentURL = RS_FALLBACK_BASE_URL;
    try {
      baseAttachmentURL = await lazy.Utils.baseAttachmentsURL();
    } catch (error) {
      console.error(
        `Error fetching remote settings base url from CDN. Falling back to ${RS_FALLBACK_BASE_URL}`,
        error
      );
    }

    const wallpapers = [
      ...records.map(record => {
        return {
          ...record,
          ...(record.attachment
            ? {
                wallpaperUrl: `${baseAttachmentURL}${record.attachment.location}`,
              }
            : {}),
          background_position: record.background_position || "center",
          category: record.category || "",
          order: record.order || 0,
          thumbnail: record.thumbnail || null,
        };
      }),
    ];

    const CATEGORY_ORDER = [
      "custom-wallpaper",
      "firefox",
      "abstracts",
      "celestial",
      "photographs",
      "solid-colors",
    ];

    const categories = [
      ...new Set(
        wallpapers.map(wallpaper => wallpaper.category).filter(Boolean)
      ),
      ...(customWallpaperEnabled ? ["custom-wallpaper"] : []), // Conditionally add custom wallpaper input
    ].sort((a, b) => {
      const aIndex = CATEGORY_ORDER.indexOf(a);
      const bIndex = CATEGORY_ORDER.indexOf(b);
      const aOrder = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
      const bOrder = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
      return aOrder - bOrder;
    });

    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WALLPAPERS_SET,
        data: wallpapers,
        meta: {
          isStartup,
        },
      })
    );

    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WALLPAPERS_CATEGORY_SET,
        data: categories,
        meta: {
          isStartup,
        },
      })
    );
  }

  initHighlightCounter() {
    let counter = Services.prefs.getIntPref(
      PREF_WALLPAPERS_HIGHLIGHT_SEEN_COUNTER
    );

    this.store.dispatch(
      ac.AlsoToPreloaded({
        type: at.WALLPAPERS_FEATURE_HIGHLIGHT_COUNTER_INCREMENT,
        data: {
          value: counter,
        },
      })
    );
  }

  wallpaperSeenEvent() {
    let counter = Services.prefs.getIntPref(
      PREF_WALLPAPERS_HIGHLIGHT_SEEN_COUNTER
    );

    const newCount = counter + 1;

    this.store.dispatch(
      ac.OnlyToMain({
        type: at.SET_PREF,
        data: {
          name: "newtabWallpapers.highlightSeenCounter",
          value: newCount,
        },
      })
    );

    this.store.dispatch(
      ac.AlsoToPreloaded({
        type: at.WALLPAPERS_FEATURE_HIGHLIGHT_COUNTER_INCREMENT,
        data: {
          value: newCount,
        },
      })
    );
  }

  async wallpaperUpload(file, wallpaperTheme) {
    if (!Blob.isInstance(file)) {
      console.error("wallpaperUpload: file is not a Blob");
      return null;
    }
    if (wallpaperTheme !== "dark" && wallpaperTheme !== "light") {
      console.error("wallpaperUpload: invalid theme");
      return null;
    }
    try {
      const wallpaperDir = PathUtils.join(PathUtils.profileDir, "wallpaper");

      // create wallpaper directory if it does not exist
      await IOUtils.makeDirectory(wallpaperDir, { ignoreExisting: true });

      let uuid = Services.uuid.generateUUID().toString().slice(1, -1);
      Services.prefs.setStringPref(PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID, uuid);

      const filePath = PathUtils.join(wallpaperDir, uuid);

      // convert to Uint8Array for IOUtils
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      await IOUtils.write(filePath, uint8Array, { tmpPath: `${filePath}.tmp` });

      const wallpaperURI = this.getWallpaperURL(uuid);

      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WALLPAPERS_CUSTOM_SET,
          data: wallpaperURI,
        })
      );

      this.store.dispatch(
        ac.SetPref("newtabWallpapers.customWallpaper.theme", wallpaperTheme)
      );

      return filePath;
    } catch (error) {
      console.error("Error saving wallpaper:", error);
      return null;
    }
  }

  async removeCustomWallpaper() {
    try {
      let uuid = Services.prefs.getStringPref(
        PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID,
        ""
      );

      if (!uuid) {
        return;
      }

      const wallpaperDir = PathUtils.join(PathUtils.profileDir, "wallpaper");
      const filePath = PathUtils.join(wallpaperDir, uuid);

      await IOUtils.remove(filePath, { ignoreAbsent: true });

      Services.prefs.clearUserPref(PREF_WALLPAPERS_CUSTOM_WALLPAPER_UUID);

      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WALLPAPERS_CUSTOM_SET,
          data: null,
        })
      );
    } catch (error) {
      console.error("Failed to remove custom wallpaper:", error);
    }
  }

  async onAction(action) {
    switch (action.type) {
      case at.INIT:
        await this.wallpaperSetup(true /* isStartup */);
        this.initHighlightCounter();
        break;
      case at.UNINIT:
        break;
      case at.SYSTEM_TICK:
        break;
      case at.PREF_CHANGED:
        if (
          action.data.name === "newtabWallpapers.customColor.enabled" ||
          action.data.name === "newtabWallpapers.customWallpaper.enabled" ||
          action.data.name === "newtabWallpapers.enabled" ||
          action.data.name === "nova.enabled"
        ) {
          this.wallpaperTeardown();
          await this.wallpaperSetup(false /* isStartup */);
        }
        if (action.data.name === "newtabWallpapers.highlightSeenCounter") {
          // Reset redux highlight counter to pref
          this.initHighlightCounter();
        }
        break;
      case at.WALLPAPERS_SET:
        break;
      case at.WALLPAPERS_FEATURE_HIGHLIGHT_SEEN:
        this.wallpaperSeenEvent();
        break;
      case at.WALLPAPER_UPLOAD:
        this.wallpaperUpload(action.data.file, action.data.theme);
        break;
      case at.WALLPAPER_REMOVE_UPLOAD:
        await this.removeCustomWallpaper();
        break;
    }
  }
}
