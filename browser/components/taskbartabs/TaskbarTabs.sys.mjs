/* vim: se cin sw=2 ts=2 et filetype=javascript :
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file represents the entry point into the Taskbar Tabs system,
 * initializing necessary subsystems before the export can be used. Code driving
 * the Taskbar Tabs systems should interact with it through this interface.
 */

import {
  TaskbarTabsRegistry,
  TaskbarTabsRegistryStorage,
  kTaskbarTabsRegistryEvents,
} from "resource:///modules/taskbartabs/TaskbarTabsRegistry.sys.mjs";
import { TaskbarTabsWindowManager } from "resource:///modules/taskbartabs/TaskbarTabsWindowManager.sys.mjs";
import { TaskbarTabsPin } from "resource:///modules/taskbartabs/TaskbarTabsPin.sys.mjs";
import { TaskbarTabsUtils } from "resource:///modules/taskbartabs/TaskbarTabsUtils.sys.mjs";

let lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  ManifestObtainer: "resource://gre/modules/ManifestObtainer.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "logConsole", () => {
  return console.createInstance({
    prefix: "TaskbarTabs",
    maxLogLevel: "Warn",
  });
});

/**
 * A Taskbar Tabs singleton which ensures the system has been initialized before
 * it can be interacted with. Methods on this object pass through to the Taskbar
 * Tabs registry or window manager.
 */
export const TaskbarTabs = new (class {
  #ready;
  #registry;
  #windowManager;

  constructor() {
    this.#ready = initRegistry().then(registry => {
      this.#registry = registry;
      this.#windowManager = initWindowManager(registry);

      this.#updateMetrics();
    });
  }

  #updateMetrics() {
    Glean.webApp.installedWebAppCount.set(this.#registry.countTaskbarTabs());
  }

  async waitUntilReady() {
    await this.#ready;
  }

  async getTaskbarTab(...args) {
    await this.#ready;
    return this.#registry.getTaskbarTab(...args);
  }

  /**
   * Finds an existing Taskbar Tab that matches aUrl within aUserContextId. If
   * one does not exist, it is created.
   *
   * Additionally, this will register the Taskbar Tab with the system and (on
   * Windows) request to pin the shortcut.
   *
   * @param {nsIURL} aUrl - The URL to create a Taskbar Tab for.
   * @param {number} aUserContextId - The container to create the Taskbar Tab
   * in.
   * @param {object} aDetails - Additional parameters for the Taskbar Tab. See
   * TaskbarTabsRegistry.findOrCreateTaskbarTab for other members.
   * @param {nsIURL} [aDetails.createdForUrl] - The page that the Taskbar Tab
   * was created on. This allows getting the favicon of that page if there
   * isn't a better option.
   */
  async findOrCreateTaskbarTab(aUrl, aUserContextId, aDetails = {}) {
    // The result of #findOrCreateTaskbarTab sometimes contains additional
    // properties for internal use, often for moveTabIntoTaskbarTab. Only a few
    // values should actually be given to outside callers.
    let result = await this.#findOrCreateTaskbarTab(
      aUrl,
      aUserContextId,
      aDetails
    );
    return {
      created: result.created,
      taskbarTab: result.taskbarTab,
      window: result.window,
    };
  }

  // Used internally; can expose non-public members in its result.
  async #findOrCreateTaskbarTab(aUrl, aUserContextId, aDetails = {}) {
    await this.#ready;
    let result = this.#registry.findOrCreateTaskbarTab(
      aUrl,
      aUserContextId,
      aDetails
    );

    if (result.created) {
      this.#updateMetrics();

      let icon = await fetchIconForTaskbarTab(
        result.taskbarTab,
        aDetails.creatingForUrl
      );
      result.icon = icon;

      // Don't wait for the pinning to complete.
      TaskbarTabsPin.pinTaskbarTab(result.taskbarTab, this.#registry, icon);
    } else {
      result.icon = await loadSavedTaskbarTabIcon(result.taskbarTab.id);
    }

    return result;
  }

  async findTaskbarTab(...args) {
    await this.#ready;
    return this.#registry.findTaskbarTab(...args);
  }

  /**
   * Moves an existing tab into a new Taskbar Tab window.
   *
   * If there is already a Taskbar Tab for the tab's selected URL and container,
   * opens the existing Taskbar Tab. If not, a new Taskbar Tab is created.
   *
   * @param {MozTabbrowserTab} aTab - The tab to move into a Taskbar Tab window.
   * @returns {{window: DOMWindow, taskbarTab: TaskbarTab}} The created window
   * and the Taskbar Tab it is associated with.
   */
  async moveTabIntoTaskbarTab(aTab) {
    const browser = aTab.linkedBrowser;
    let url = browser.currentURI;
    let userContextId = aTab.userContextId;

    let [, manifest] = await Promise.all([
      this.#ready,
      lazy.ManifestObtainer.browserObtainManifest(browser).catch(e => {
        lazy.logConsole.error(e);
        return {};
      }),
    ]);

    let { taskbarTab, icon } = await this.#findOrCreateTaskbarTab(
      url,
      userContextId,
      {
        // 'manifest' can be null if the site doesn't have a manifest.
        ...(manifest ? { manifest } : {}),
        creatingForUrl: url,
      }
    );

    let win = await this.#windowManager.replaceTabWithWindow(
      taskbarTab,
      aTab,
      icon
    );
    return {
      window: win,
      taskbarTab,
    };
  }

  async resetForTests(...args) {
    await this.#ready;
    return this.#registry.resetForTests(...args);
  }

  async removeTaskbarTab(...args) {
    await this.#ready;

    let taskbarTab = this.#registry.removeTaskbarTab(...args);
    this.#updateMetrics();

    // Don't wait for unpinning to finish.
    TaskbarTabsPin.unpinTaskbarTab(taskbarTab, this.#registry);
  }

  async openWindow(aTaskbarTab) {
    await this.#ready;

    let icon = await loadSavedTaskbarTabIcon(aTaskbarTab.id);
    return this.#windowManager.openWindow(aTaskbarTab, icon);
  }

  async replaceTabWithWindow(aTaskbarTab, aTab) {
    await this.#ready;

    let icon = await loadSavedTaskbarTabIcon(aTaskbarTab.id);
    return this.#windowManager.replaceTabWithWindow(aTaskbarTab, aTab, icon);
  }

  async ejectWindow(...args) {
    await this.#ready;
    return this.#windowManager.ejectWindow(...args);
  }

  async getCountForId(...args) {
    await this.#ready;
    return this.#windowManager.getCountForId(...args);
  }
})();

/**
 * Taskbar Tabs Registry initialization.
 *
 * @returns {TaskbarTabsRegistry} A registry after loading and hooking saving to persistent storage.
 */
async function initRegistry() {
  const kRegistryFilename = "taskbartabs.json";
  // Construct the path [Profile]/taskbartabs/taskbartabs.json.
  let registryFile = TaskbarTabsUtils.getTaskbarTabsFolder();
  registryFile.append(kRegistryFilename);

  let init = {};
  if (registryFile.exists()) {
    init.loadFile = registryFile;
  }

  let registry = await TaskbarTabsRegistry.create(init);

  // Initialize persistent storage.
  let storage = new TaskbarTabsRegistryStorage(registry, registryFile);
  registry.on(kTaskbarTabsRegistryEvents.created, () => {
    storage.save();
  });
  registry.on(kTaskbarTabsRegistryEvents.patched, () => {
    storage.save();
  });
  registry.on(kTaskbarTabsRegistryEvents.removed, () => {
    storage.save();
  });

  return registry;
}

/**
 * Taskbar Tabs Window Manager initialization.
 *
 * @returns {TaskbarTabsWindowManager} The initialized Window Manager
 */
function initWindowManager() {
  let wm = new TaskbarTabsWindowManager();

  return wm;
}

async function fetchIconForTaskbarTab(aTaskbarTab, aCreatedForUrl) {
  let startUri = Services.io.newURI(aTaskbarTab.startUrl);
  const choices = [
    async () => await TaskbarTabsUtils.getFaviconUri(startUri),
    async () => await TaskbarTabsUtils.getFaviconUri(aCreatedForUrl),
  ];

  for (const choice of choices) {
    try {
      let dataURI = await choice();
      if (!dataURI) {
        continue;
      }
      let candidate = await TaskbarTabsUtils._imageFromLocalURI(dataURI);
      if (candidate) {
        return candidate;
      }
    } catch (e) {
      lazy.logConsole.warn("Could not load Taskbar Tab icon: ", e);
    }
  }

  lazy.logConsole.warn("Falling back to default Taskbar Tab icon.");
  return await TaskbarTabsUtils.getDefaultIcon();
}

/**
 * Looks up the saved icon for a Taskbar Tab on disk.
 *
 * @param {string} aTaskbarTabId - The ID of the Taskbar Tab to look up.
 * @returns {imgIContainer} The icon saved on disk.
 */
async function loadSavedTaskbarTabIcon(aTaskbarTabId) {
  let iconPath = TaskbarTabsUtils.getTaskbarTabsFolder();
  iconPath.append("icons");
  iconPath.append(aTaskbarTabId + ".ico");
  try {
    return await TaskbarTabsUtils._imageFromLocalURI(
      Services.io.newFileURI(iconPath)
    );
  } catch (e) {
    return await TaskbarTabsUtils.getDefaultIcon();
  }
}
