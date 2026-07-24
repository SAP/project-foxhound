/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { AppConstants } from "resource://gre/modules/AppConstants.sys.mjs";
import { DownloadPaths } from "resource://gre/modules/DownloadPaths.sys.mjs";
import { FileUtils } from "resource://gre/modules/FileUtils.sys.mjs";
import { ProfilesDatastoreService } from "moz-src:///toolkit/profile/ProfilesDatastoreService.sys.mjs";
import { SelectableProfileService } from "resource:///modules/profiles/SelectableProfileService.sys.mjs";
import { BackupService } from "resource:///modules/backup/BackupService.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "localization", () => {
  return new Localization(["branding/brand.ftl", "browser/profiles.ftl"]);
});

const STANDARD_AVATARS = new Set([
  "barbell",
  "bike",
  "book",
  "briefcase",
  "canvas",
  "craft",
  "default-favicon",
  "diamond",
  "flower",
  "folder",
  "hammer",
  "heart",
  "heart-rate",
  "history",
  "leaf",
  "lightbulb",
  "makeup",
  "message",
  "musical-note",
  "palette",
  "paw-print",
  "plane",
  "present",
  "shopping",
  "soccer",
  "sparkle-single",
  "star",
  "video-game-controller",
]);

const STANDARD_AVATAR_SIZES = [16, 20, 48, 80];

function standardAvatarURL(avatar, size = "80") {
  return `chrome://browser/content/profiles/assets/${size}_${avatar}.svg`;
}

/**
 * Resolve a relative path against an absolute path. The relative path may only
 * contain parent directory or child directory parts.
 *
 * @param {string} absolute The absolute path
 * @param {string} relative The relative path
 * @returns {string} The resolved path
 */
function resolveDir(absolute, relative) {
  let target = absolute;

  for (let pathPart of PathUtils.splitRelative(relative, {
    allowParentDir: true,
  })) {
    if (pathPart === "..") {
      target = PathUtils.parent(target);

      // On Windows there is no notion of a single root directory. Instead each
      // disk has a root directory. Traversing to a different disk means allowing
      // going above the root of the first disk then the next path part will be
      // the new disk.
      if (!target && AppConstants.platform != "win") {
        throw new Error("Invalid path");
      }
    } else {
      target = target ? PathUtils.join(target, pathPart) : pathPart;
    }
  }

  if (!target) {
    throw new Error("Invalid path");
  }

  return target;
}

/**
 * The selectable profile
 */
export class SelectableProfile {
  // DB internal autoincremented integer ID.
  // eslint-disable-next-line no-unused-private-class-members
  #id;

  // Path to profile on disk.
  #path;

  // The user-editable name
  #name;

  // Name of the user's chosen avatar, which corresponds to a list of standard
  // SVG avatars. Or if the avatar is a custom image, the filename of the image
  // stored in the avatars directory.
  #avatar;

  // lastAvatarURL is saved when URL.createObjectURL is invoked so we can
  // revoke the url at a later time.
  #lastAvatarURL;

  // Cached theme properties, used to allow displaying a SelectableProfile
  // without loading the AddonManager to get theme info.
  #themeId;
  #themeFg;
  #themeBg;

  constructor(row) {
    this.#id = row.getResultByName("id");
    this.#path = row.getResultByName("path");
    this.#name = row.getResultByName("name");
    this.#avatar = row.getResultByName("avatar");
    this.#themeId = row.getResultByName("themeId");
    this.#themeFg = row.getResultByName("themeFg");
    this.#themeBg = row.getResultByName("themeBg");
  }

  /**
   * Get the id of the profile.
   *
   * @returns {number} Id of profile
   */
  get id() {
    return this.#id;
  }

  // Note: setters update the object, then ask the SelectableProfileService to save it.

  /**
   * Get the user-editable name for the profile.
   *
   * @returns {string} Name of profile
   */
  get name() {
    return this.#name;
  }

  /**
   * Update the user-editable name for the profile, then trigger saving the profile,
   * which will notify() other running instances.
   *
   * @param {string} aName The new name of the profile
   */
  set name(aName) {
    this.setNameAsync(aName);
  }

  /**
   * Async setter for the name field. Update the user-editable name for the profile,
   * then trigger saving the profile, which will notify() other running instances.
   *
   * @param {string} aName The new name of the profile
   */
  async setNameAsync(aName) {
    this.#name = aName;
    await SelectableProfileService.updateProfile(this);
    Services.prefs.setBoolPref("browser.profiles.profile-name.updated", true);
  }

  /**
   * Get the full path to the profile as a string.
   *
   * @returns {string} Path of profile
   */
  get path() {
    return resolveDir(
      ProfilesDatastoreService.constructor.getDirectory("UAppData").path,
      this.#path
    );
  }

  /**
   * Get the profile directory as an nsIFile.
   *
   * @returns {Promise<nsIFile>} A promise that resolves to an nsIFile for
   * the profile directory
   */
  get rootDir() {
    return IOUtils.getDirectory(this.path);
  }

  /**
   * Get the profile local directory as an nsIFile.
   *
   * @returns {Promise<nsIFile>} A promise that resolves to an nsIFile for
   * the profile local directory
   */
  get localDir() {
    return this.rootDir.then(root =>
      ProfilesDatastoreService.toolkitProfileService.getLocalDirFromRootDir(
        root
      )
    );
  }

  /**
   * Get the name of the avatar for the profile.
   *
   * @returns {string} Name of the avatar
   */
  get avatar() {
    return this.#avatar;
  }

  /**
   * Get the path of the current avatar.
   * If the avatar is standard, the return value will be of the form
   * 'chrome://browser/content/profiles/assets/{avatar}.svg'.
   * If the avatar is custom, the return value will be the path to the file on
   * disk.
   *
   * @param {string|number} size
   * @returns {string} Path to the current avatar.
   */
  getAvatarPath(size) {
    if (!this.hasCustomAvatar) {
      return standardAvatarURL(this.avatar, size);
    }

    return PathUtils.join(
      ProfilesDatastoreService.constructor.PROFILE_GROUPS_DIR,
      "avatars",
      this.avatar
    );
  }

  /**
   * Get the URL of the current avatar.
   * If the avatar is standard, the return value will be of the form
   * 'chrome://browser/content/profiles/assets/${size}_${avatar}.svg'.
   * If the avatar is custom, the return value will be a blob URL.
   *
   * @param {string|number} size optional Must be one of the sizes in
   * STANDARD_AVATAR_SIZES. Will be converted to a string.
   *
   * @returns {Promise<string>} Resolves to the URL of the current avatar
   */
  async getAvatarURL(size) {
    if (!this.hasCustomAvatar) {
      return standardAvatarURL(this.avatar, size);
    }

    if (this.#lastAvatarURL) {
      URL.revokeObjectURL(this.#lastAvatarURL);
    }

    const fileExists = await IOUtils.exists(this.getAvatarPath());
    if (!fileExists) {
      throw new Error("Custom avatar file doesn't exist.");
    }
    const file = await File.createFromFileName(this.getAvatarPath());
    this.#lastAvatarURL = URL.createObjectURL(file);

    return this.#lastAvatarURL;
  }

  /**
   * Get the avatar file. This is only used for custom avatars to generate an
   * object url. Standard avatars should use getAvatarURL or getAvatarPath.
   *
   * @returns {Promise<File>} Resolves to a file of the avatar
   */
  async getAvatarFile() {
    if (!this.hasCustomAvatar) {
      throw new Error(
        "Profile does not have custom avatar. Custom avatar file doesn't exist."
      );
    }

    return File.createFromFileName(this.getAvatarPath());
  }

  get hasCustomAvatar() {
    return !STANDARD_AVATARS.has(this.avatar);
  }

  /**
   * Update the avatar, then trigger saving the profile, which will notify()
   * other running instances.
   *
   * @param {string|File} aAvatarOrFile Name of the avatar or File os custom avatar
   */
  async setAvatar(aAvatarOrFile) {
    if (aAvatarOrFile === this.avatar) {
      // The avatar is the same so do nothing. See the comment in
      // SelectableProfileService.maybeSetupDataStore for resetting the avatar
      // to draw the avatar icon in the dock.
    } else if (STANDARD_AVATARS.has(aAvatarOrFile)) {
      this.#avatar = aAvatarOrFile;
    } else {
      await this.#uploadCustomAvatar(aAvatarOrFile);
    }

    await this.saveUpdatesToDB();
  }

  async #uploadCustomAvatar(file) {
    const avatarsDir = PathUtils.join(
      ProfilesDatastoreService.constructor.PROFILE_GROUPS_DIR,
      "avatars"
    );

    // Create avatars directory if it does not exist
    await IOUtils.makeDirectory(avatarsDir, { ignoreExisting: true });

    let uuid = Services.uuid.generateUUID().toString().slice(1, -1);

    const filePath = PathUtils.join(avatarsDir, uuid);

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    await IOUtils.write(filePath, uint8Array, { tmpPath: `${filePath}.tmp` });

    this.#avatar = uuid;
  }

  /**
   * Get the l10n id for the current avatar.
   *
   * @returns {string} L10n id for the current avatar
   */
  get avatarL10nId() {
    switch (this.avatar) {
      case "barbell":
        return "barbell-avatar-alt";
      case "bike":
        return "bike-avatar-alt";
      case "book":
        return "book-avatar-alt";
      case "briefcase":
        return "briefcase-avatar-alt";
      case "canvas":
        return "picture-avatar-alt";
      case "craft":
        return "craft-avatar-alt";
      case "default-favicon":
        return "globe-avatar-alt";
      case "diamond":
        return "diamond-avatar-alt";
      case "flower":
        return "flower-avatar-alt";
      case "folder":
        return "folder-avatar-alt";
      case "hammer":
        return "hammer-avatar-alt";
      case "heart":
        return "heart-avatar-alt";
      case "heart-rate":
        return "heart-rate-avatar-alt";
      case "history":
        return "clock-avatar-alt";
      case "leaf":
        return "leaf-avatar-alt";
      case "lightbulb":
        return "lightbulb-avatar-alt";
      case "makeup":
        return "makeup-avatar-alt";
      case "message":
        return "message-avatar-alt";
      case "musical-note":
        return "musical-note-avatar-alt";
      case "palette":
        return "palette-avatar-alt";
      case "paw-print":
        return "paw-print-avatar-alt";
      case "plane":
        return "plane-avatar-alt";
      case "present":
        return "present-avatar-alt";
      case "shopping":
        return "shopping-avatar-alt";
      case "soccer":
        return "soccer-ball-avatar-alt";
      case "sparkle-single":
        return "sparkle-single-avatar-alt";
      case "star":
        return "star-avatar-alt";
      case "video-game-controller":
        return "video-game-controller-avatar-alt";
      default:
        return "custom-avatar-alt";
    }
  }

  // Note, theme properties are set and returned as a group.

  /**
   * Get the theme l10n-id as a string, like "theme-foo-name".
   *     the theme foreground color as CSS style string, like "rgb(1,1,1)",
   *     the theme background color as CSS style string, like "rgb(0,0,0)".
   *
   * @returns {object} an object of the form { themeId, themeFg, themeBg }.
   */
  get theme() {
    return {
      themeId: this.#themeId,
      themeFg: this.#themeFg,
      themeBg: this.#themeBg,
    };
  }

  get iconPaintContext() {
    return {
      fillColor: this.#themeBg,
      strokeColor: this.#themeFg,
      fillOpacity: 1.0,
      strokeOpacity: 1.0,
    };
  }

  /**
   * Update the theme (all three properties are required), then trigger saving
   * the profile, which will notify() other running instances.
   *
   * @param {object} param0 The theme object
   * @param {string} param0.themeId L10n id of the theme
   * @param {string} param0.themeFg Foreground color of theme as CSS style string, like "rgb(1,1,1)",
   * @param {string} param0.themeBg Background color of theme as CSS style string, like "rgb(0,0,0)".
   */
  set theme({ themeId, themeFg, themeBg }) {
    this.setThemeAsync({ themeId, themeFg, themeBg });
  }

  /**
   * Async setter for the theme fields. Update the theme (all three properties are required),
   * then trigger saving the profile, which will notify() other running instances.
   *
   * @param {object} param0 The theme object
   * @param {string} param0.themeId L10n id of the theme
   * @param {string} param0.themeFg Foreground color of theme as CSS style string, like "rgb(1,1,1)",
   * @param {string} param0.themeBg Background color of theme as CSS style string, like "rgb(0,0,0)".
   */
  async setThemeAsync({ themeId, themeFg, themeBg }) {
    this.#themeId = themeId;
    this.#themeFg = themeFg;
    this.#themeBg = themeBg;

    await SelectableProfileService.updateProfile(this);
  }

  saveUpdatesToDB() {
    SelectableProfileService.updateProfile(this);
  }

  /**
   * Returns on object with only fields needed for the database.
   *
   * @returns {object} An object with only fields need for the database
   */
  toDbObject() {
    let profileObj = {
      id: this.id,
      path: this.#path,
      name: this.name,
      avatar: this.avatar,
      ...this.theme,
    };

    return profileObj;
  }

  /**
   * Returns an object representation of the profile.
   * Note: No custom avatar URLs are included because URL.createObjectURL needs
   * to be invoked in the content process for the avatar to be visible.
   *
   * @returns {object} An object representation of the profile
   */
  async toContentSafeObject() {
    let profileObj = {
      id: this.id,
      path: this.#path,
      name: this.name,
      avatar: this.avatar,
      avatarL10nId: this.avatarL10nId,
      hasCustomAvatar: this.hasCustomAvatar,
      ...this.theme,
    };

    if (this.hasCustomAvatar) {
      let path = this.getAvatarPath();
      let file = await this.getAvatarFile();

      profileObj.avatarPaths = Object.fromEntries(
        STANDARD_AVATAR_SIZES.map(s => [`path${s}`, path])
      );
      profileObj.avatarFiles = Object.fromEntries(
        STANDARD_AVATAR_SIZES.map(s => [`file${s}`, file])
      );
      profileObj.avatarURLs = {};
    } else {
      profileObj.avatarPaths = Object.fromEntries(
        STANDARD_AVATAR_SIZES.map(s => [`path${s}`, this.getAvatarPath(s)])
      );
      profileObj.avatarURLs = Object.fromEntries(
        await Promise.all(
          STANDARD_AVATAR_SIZES.map(async s => [
            `url${s}`,
            await this.getAvatarURL(s),
          ])
        )
      );

      const response = await fetch(profileObj.avatarURLs.url16);

      let faviconSVGText = await response.text();
      faviconSVGText = faviconSVGText
        .replaceAll("context-fill", profileObj.themeBg)
        .replaceAll("context-stroke", profileObj.themeFg);
      profileObj.faviconSVGText = faviconSVGText;
    }

    return profileObj;
  }

  async copyProfile() {
    // This pref is used to control targeting for the backup welcome messaging.
    // If this pref is set, the backup welcome messaging will not show.
    // We set the pref here so the copied profile will inherit this pref and
    // the copied profile will not show the backup welcome messaging.
    Services.prefs.setBoolPref("browser.profiles.profile-copied", true);

    // If the user has created a desktop shortcut, clear the shortcut name pref
    // to prevent the copied profile trying to manage the original profile's
    // shortcut.
    let shortcutFileName = Services.prefs.getCharPref(
      "browser.profiles.shortcutFileName",
      ""
    );
    if (shortcutFileName !== "") {
      Services.prefs.clearUserPref("browser.profiles.shortcutFileName");
    }

    const backupServiceInstance = new BackupService();

    let encState = await backupServiceInstance.loadEncryptionState(this.path);
    let createdEncState = false;
    if (!encState) {
      // If we don't have encryption enabled, temporarily create encryption so
      // we can copy resources that require encryption
      await backupServiceInstance.enableEncryption(
        Services.uuid.generateUUID().toString().slice(1, -1),
        this.path
      );
      encState = await backupServiceInstance.loadEncryptionState(this.path);
      createdEncState = true;
    }
    let result = await backupServiceInstance.createAndPopulateStagingFolder(
      this.path
    );

    // Clear the pref now that the copied profile has inherited it.
    Services.prefs.clearUserPref("browser.profiles.profile-copied");

    // Restore the desktop shortcut pref now that the copied profile will not
    // inherit it.
    if (shortcutFileName !== "") {
      Services.prefs.setCharPref(
        "browser.profiles.shortcutFileName",
        shortcutFileName
      );
    }

    if (result.error) {
      throw result.error;
    }

    let copiedProfile =
      await backupServiceInstance.recoverFromSnapshotFolderIntoSelectableProfile(
        result.stagingPath,
        true, // shouldLaunch
        encState, // encState
        this // copiedProfile
      );

    if (createdEncState) {
      await backupServiceInstance.disableEncryption(this.path);
    }

    copiedProfile.theme = this.theme;
    await copiedProfile.setAvatar(this.avatar);

    return copiedProfile;
  }

  // Desktop shortcut-related methods, currently Windows-only.

  /**
   * Getter that returns the nsIWindowsShellService, created to simplify
   * mocking for tests.
   *
   * @returns {nsIWindowsShellService|null} shell service on Windows, null on other platforms
   */
  getWindowsShellService() {
    if (AppConstants.platform !== "win") {
      return null;
    }
    return Cc["@mozilla.org/browser/shell-service;1"].getService(
      Ci.nsIWindowsShellService
    );
  }

  /**
   * Returns a promise that resolves to the desktop shortcut as an nsIFile,
   * or null on platforms other than Windows.
   *
   * @returns {Promise<nsIFile|null>}
   *   A promise that resolves to the desktop shortcut or null.
   */
  async ensureDesktopShortcut() {
    if (AppConstants.platform !== "win") {
      return null;
    }

    if (!this.hasDesktopShortcut()) {
      let shortcutFileName = await this.getSafeDesktopShortcutFileName();
      if (!shortcutFileName) {
        return null;
      }

      let exeFile = Services.dirsvc.get("XREExeF", Ci.nsIFile);
      let shellService = this.getWindowsShellService();
      try {
        await shellService.createShortcut(
          exeFile,
          ["--profile", this.path],
          this.name,
          exeFile,
          0,
          "",
          "Desktop",
          shortcutFileName
        );

        // The shortcut name is not necessarily the sanitized profile name.
        // In certain circumstances we use a default shortcut name, or might
        // have duplicate shortcuts on the desktop that require appending a
        // counter like "(1)" or "(2)", etc., to the filename to deduplicate.
        // Save the shortcut name in a pref to keep track of it.
        Services.prefs.setCharPref(
          "browser.profiles.shortcutFileName",
          shortcutFileName
        );
      } catch (e) {
        console.error("Failed to create shortcut: ", e);
      }
    }

    return this.getDesktopShortcut();
  }

  /**
   * Returns a promise that resolves to the desktop shortcut, either null
   * if it was deleted, or the shortcut as an nsIFile if deletion failed.
   *
   * @returns {boolean} true if deletion succeeded, false otherwise
   */
  async removeDesktopShortcut() {
    if (!this.hasDesktopShortcut()) {
      return false;
    }

    let fileName = Services.prefs.getCharPref(
      "browser.profiles.shortcutFileName",
      ""
    );
    try {
      let shellService = this.getWindowsShellService();
      await shellService.deleteShortcut("Desktop", fileName);

      // Wait to clear the pref until deletion succeeds.
      Services.prefs.clearUserPref("browser.profiles.shortcutFileName");
    } catch (e) {
      console.error("Failed to remove shortcut: ", e);
    }
    return this.hasDesktopShortcut();
  }

  /**
   * Returns the desktop shortcut as an nsIFile, or null if not found.
   *
   * Note the shortcut will not be found if the profile name has changed since
   * the shortcut was created (we plan to handle name updates in bug 1992897).
   *
   * @returns {nsIFile|null} The desktop shortcut or null.
   */
  getDesktopShortcut() {
    if (AppConstants.platform !== "win") {
      return null;
    }

    let shortcutName = Services.prefs.getCharPref(
      "browser.profiles.shortcutFileName",
      ""
    );
    if (!shortcutName) {
      return null;
    }

    let file;
    try {
      file = new FileUtils.File(
        PathUtils.join(
          Services.dirsvc.get("Desk", Ci.nsIFile).path,
          shortcutName
        )
      );
    } catch (e) {
      console.error("Failed to get shortcut: ", e);
    }
    return file?.exists() ? file : null;
  }

  /**
   * Checks the filesystem to determine if the desktop shortcut exists with the
   * expected name from the pref.
   *
   * @returns {boolean} - true if the shortcut exists on the Desktop
   */
  hasDesktopShortcut() {
    let shortcut = this.getDesktopShortcut();
    return shortcut !== null;
  }

  /**
   * Returns the profile name with illegal characters sanitized, length
   * truncated, and with ".lnk" appended, suitable for use as the name of
   * a Windows desktop shortcut. If the sanitized profile name is empty,
   * uses a reasonable default. Appends "(1)", "(2)", etc. as needed to ensure
   * the desktop shortcut file name is unique.
   *
   * @returns {string} Safe desktop shortcut file name for the current profile,
   *                   or empty string if something went wrong.
   */
  async getSafeDesktopShortcutFileName() {
    let existingShortcutName = Services.prefs.getCharPref(
      "browser.profiles.shortcutFileName",
      ""
    );
    if (existingShortcutName) {
      return existingShortcutName;
    }

    let desktopFile = Services.dirsvc.get("Desk", Ci.nsIFile);

    // Strip out any illegal chars and whitespace. Most illegal chars are
    // converted to '_' but others are just removed (".", "\\") so we may
    // wind up with an empty string.
    let fileName = DownloadPaths.sanitize(this.name);

    // To avoid exceeding the Windows default `MAX_PATH` of 260 chars, subtract
    // the length of the Desktop path, 4 chars for the ".lnk" file extension,
    // one more char for the path separator between "Desktop" and the shortcut
    // file name, and 6 chars for the largest possible deduplicating counter
    // "(9999)" added by `DownloadPaths.createNiceUniqueFile()` below,
    // giving us a working max path of 260 - 4 - 1 - 6 = 249.
    let maxLength = 249 - desktopFile.path.length;
    fileName = fileName.substring(0, maxLength);

    // Use the brand name as default if the sanitized `fileName` is empty.
    if (!fileName) {
      let strings = await lazy.localization.formatMessages([
        "default-desktop-shortcut-name",
      ]);
      fileName = strings[0].value;
    }

    fileName = fileName + ".lnk";

    // At this point, it's possible the fileName would not be a unique file
    // because of other shortcuts on the desktop. To ensure uniqueness, we use
    // `DownloadPaths.createNiceUniqueFile()` to append a "(1)", "(2)", etc.,
    // up to a max of (9999). See `DownloadPaths` docs for other things we try
    // if incrementing a counter in the name fails.
    try {
      let shortcutFile = new FileUtils.File(
        PathUtils.join(desktopFile.path, fileName)
      );
      let uniqueShortcutFile = DownloadPaths.createNiceUniqueFile(shortcutFile);
      fileName = uniqueShortcutFile.leafName;
      // `createNiceUniqueFile` actually creates the file, which we don't want.
      await IOUtils.remove(uniqueShortcutFile.path);
    } catch (e) {
      console.error("Unable to create a shortcut name: ", e);
      fileName = "";
    }

    return fileName;
  }
}
