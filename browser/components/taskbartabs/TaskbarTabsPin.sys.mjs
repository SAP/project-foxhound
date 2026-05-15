/* vim: se cin sw=2 ts=2 et filetype=javascript :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

let lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ShellService: "moz-src:///browser/components/shell/ShellService.sys.mjs",
  TaskbarTabsUtils: "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logConsole", () => {
  return console.createInstance({
    prefix: "TaskbarTabs",
    maxLogLevel: "Warn",
  });
});

/**
 * Provides functionality to pin and unping Taskbar Tabs.
 */
export const TaskbarTabsPin = {
  /**
   * Pins the provided Taskbar Tab to the taskbar.
   *
   * @param {TaskbarTab} aTaskbarTab - A Taskbar Tab to pin to the taskbar.
   * @param {TaskbarTabsRegistry} aRegistry - The registry to track pin resources with.
   * @param {imgIContainer} aIcon - The icon to show with this Taskbar Tab.
   * @returns {Promise} Resolves once finished.
   */
  async pinTaskbarTab(aTaskbarTab, aRegistry, aIcon) {
    lazy.logConsole.info("Pinning Taskbar Tab to the taskbar.");

    try {
      let iconPath = await createTaskbarIcon(aTaskbarTab, aIcon);

      let shortcut = await createShortcut(aTaskbarTab, iconPath, aRegistry);

      await lazy.ShellService.pinShortcutToTaskbar(
        aTaskbarTab.id,
        "Programs",
        shortcut
      );
      Glean.webApp.pin.record({ result: "Success" });
    } catch (e) {
      lazy.logConsole.error(`An error occurred while pinning: ${e.message}`);
      Glean.webApp.pin.record({ result: e.name ?? "Unknown exception" });
    }
  },

  /**
   * Unpins the provided Taskbar Tab from the taskbar.
   *
   * @param {TaskbarTab} aTaskbarTab - The Taskbar Tab to unpin from the taskbar.
   * @param {TaskbarTabsRegistry} aRegistry - remove pinned resource tracking from.
   * @returns {Promise} Resolves once finished.
   */
  async unpinTaskbarTab(aTaskbarTab, aRegistry) {
    let unpinError = null;
    let removalError = null;

    try {
      lazy.logConsole.info("Unpinning Taskbar Tab from the taskbar.");

      let { relativePath } = await generateShortcutInfo(aTaskbarTab);

      try {
        lazy.ShellService.unpinShortcutFromTaskbar("Programs", relativePath);
      } catch (e) {
        lazy.logConsole.error(`Failed to unpin shortcut: ${e.message}`);
        unpinError = e;
      }

      let iconFile = getIconFile(aTaskbarTab);

      lazy.logConsole.debug(`Deleting ${relativePath}`);
      lazy.logConsole.debug(`Deleting ${iconFile.path}`);

      await Promise.all([
        lazy.ShellService.deleteShortcut("Programs", relativePath).then(() => {
          // Only update if that didn't throw an error.
          aRegistry.patchTaskbarTab(aTaskbarTab, {
            shortcutRelativePath: null,
          });
        }),
        IOUtils.remove(iconFile.path),
      ]);
    } catch (e) {
      lazy.logConsole.error(
        `An error occurred while uninstalling: ${e.message}`
      );
      removalError = e;
    }

    const message = e => (e ? (e.name ?? "Unknown exception") : "Success");
    Glean.webApp.unpin.record({
      result: message(unpinError),
      removal_result: message(removalError),
    });
  },

  /**
   * Gets a Localization object to use when creating shortcuts.
   *
   * @returns {Localization} An object to access localized strings.
   */
  _getLocalization() {
    return new Localization(["branding/brand.ftl", "browser/taskbartabs.ftl"]);
  },
};

/**
 * Fetches the favicon from the provided Taskbar Tab's start url, and saves it
 * to an icon file.
 *
 * @param {TaskbarTab} aTaskbarTab - The Taskbar Tab to generate an icon file for.
 * @param {imgIContainer} aIcon - The icon to associate with this Taskbar Tab.
 * @returns {Promise<nsIFile>} The created icon file.
 */
async function createTaskbarIcon(aTaskbarTab, aIcon) {
  lazy.logConsole.info("Creating Taskbar Tabs shortcut icon.");

  let iconFile = getIconFile(aTaskbarTab);

  lazy.logConsole.debug(`Using icon path: ${iconFile.path}`);

  await IOUtils.makeDirectory(iconFile.parent.path);

  await lazy.ShellService.createWindowsIcon(iconFile, aIcon);

  return iconFile;
}

/**
 * Creates a shortcut that opens Firefox with relevant Taskbar Tabs flags.
 *
 * @param {TaskbarTab} aTaskbarTab - The Taskbar Tab to generate a shortcut for.
 * @param {nsIFile} aFileIcon - The icon file to use for the shortcut.
 * @param {TaskbarTabsRegistry} aRegistry - The registry used to save the shortcut path.
 * @returns {Promise<string>} The path to the created shortcut.
 */
async function createShortcut(aTaskbarTab, aFileIcon, aRegistry) {
  lazy.logConsole.info("Creating Taskbar Tabs shortcut.");

  let { relativePath, description } = await generateShortcutInfo(aTaskbarTab);
  lazy.logConsole.debug(
    `Using shortcut path relative to Programs folder: ${relativePath}`
  );

  let targetfile = Services.dirsvc.get("XREExeF", Ci.nsIFile);
  let profileFolder = Services.dirsvc.get("ProfD", Ci.nsIFile);

  await lazy.ShellService.createShortcut(
    targetfile,
    [
      "-taskbar-tab",
      aTaskbarTab.id,
      "-new-window",
      aTaskbarTab.startUrl, // In case Taskbar Tabs is disabled, provide fallback url.
      "-profile",
      profileFolder.path,
      "-container",
      aTaskbarTab.userContextId,
    ],
    description,
    aFileIcon,
    0,
    aTaskbarTab.id, // AUMID
    "Programs",
    relativePath
  );

  // Only update if that didn't throw an error.
  aRegistry.patchTaskbarTab(aTaskbarTab, {
    shortcutRelativePath: relativePath,
  });

  return relativePath;
}

/**
 * Gets the path to the shortcut relative to the Start Menu folder,
 * as well as the description that should be attached to the shortcut.
 *
 * @param {TaskbarTab} aTaskbarTab - The Taskbar Tab to get the path of.
 * @returns {Promise<{description: string, relativePath: string}>} The description
 * and relative path of the shortcut.
 */
async function generateShortcutInfo(aTaskbarTab) {
  const l10n = TaskbarTabsPin._getLocalization();

  let basename = sanitizeFilename(aTaskbarTab.name + ".lnk");
  let dirname = await l10n.formatValue("taskbar-tab-shortcut-folder");
  dirname = sanitizeFilename(dirname, { allowDirectoryNames: true });

  const description = await l10n.formatValue(
    "taskbar-tab-shortcut-description",
    { name: aTaskbarTab.name }
  );

  return {
    description,
    relativePath: dirname + "\\" + basename,
  };
}

/**
 * Cleans up the filename so it can be saved safely. This means replacing invalid names
 * (e.g. DOS devices) with others, or replacing invalid characters (e.g. asterisks on
 * Windows) with underscores.
 *
 * @param {string} aWantedName - The name to validate and sanitize. Make sure
 * that aWantedName has an extension if it will be saved with one.
 * @param {object} aOptions - Options to affect the sanitization.
 * @param {boolean} aOptions.allowDirectoryNames - Indicates that the name will be used
 * as a directory. If so, the validation rules may be slightly more lax.
 * @returns {string} The sanitized name.
 */
function sanitizeFilename(aWantedName, { allowDirectoryNames = false } = {}) {
  const mimeService = Cc["@mozilla.org/mime;1"].getService(Ci.nsIMIMEService);

  let flags =
    Ci.nsIMIMEService.VALIDATE_SANITIZE_ONLY |
    Ci.nsIMIMEService.VALIDATE_DONT_COLLAPSE_WHITESPACE |
    // Don't add .download to the name if it ends with .lnk.
    Ci.nsIMIMEService.VALIDATE_ALLOW_INVALID_FILENAMES;

  if (allowDirectoryNames) {
    flags |= Ci.nsIMIMEService.VALIDATE_ALLOW_DIRECTORY_NAMES;
  }

  return mimeService.validateFileNameForSaving(aWantedName, "", flags);
}

/**
 * Generates a file path to use for the Taskbar Tab icon file.
 *
 * @param {TaskbarTab} aTaskbarTab - A Taskbar Tab to generate an icon file path for.
 * @returns {nsIFile} The icon file path for the Taskbar Tab.
 */
function getIconFile(aTaskbarTab) {
  let iconPath = lazy.TaskbarTabsUtils.getTaskbarTabsFolder();
  iconPath.append("icons");
  iconPath.append(aTaskbarTab.id + ".ico");
  return iconPath;
}
