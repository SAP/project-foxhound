/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DownloadListener:
    "chrome://remote/content/shared/listeners/DownloadListener.sys.mjs",
  HelperAppDialogHandler:
    "chrome://remote/content/webdriver-bidi/HelperAppDialogHandler.sys.mjs",
});

/**
 * A DownloadBehaviorManager class controls per user context and global download behavior.
 * Specifically if the downloads are allowed or prohibited. The download folder is controlled
 * via "downloadFolderOverride" property of a BrowsingContext instance, which is set
 * via _configuration module, and in HelperAppDialogHandler.
 */
export class DownloadBehaviorManager {
  #defaultBehavior;
  #downloadListener;
  #userContextBehaviors;

  constructor() {
    this.#defaultBehavior = null;
    this.#userContextBehaviors = new Map();

    this.#downloadListener = new lazy.DownloadListener();
    this.#downloadListener.on("download-started", this.#onDownloadStarted);
  }

  destroy() {
    this.#defaultBehavior = null;
    this.#userContextBehaviors = new Map();

    this.#downloadListener.off("download-started", this.#onDownloadStarted);
    this.#downloadListener.destroy();

    lazy.HelperAppDialogHandler.restoreDialogs(this);
  }

  /**
   * Set the global download behavior.
   *
   * @param {DownloadBehavior} behavior
   *     The settings of expected download behavior.
   */
  setDefaultBehavior(behavior) {
    this.#defaultBehavior = behavior;
    this.#controlDownloadListener();
  }

  /**
   * Set the download behavior per user context.
   *
   * @param {number} userContextId
   *     The internal id of a user context which holds the settings.
   * @param {DownloadBehavior} behavior
   *     The settings of expected download behavior.
   */
  setUserContextBehavior(userContextId, behavior) {
    if (behavior === null) {
      this.#userContextBehaviors.delete(userContextId);
    } else {
      this.#userContextBehaviors.set(userContextId, behavior);
    }
    this.#controlDownloadListener();
  }

  #controlDownloadListener() {
    if (this.#defaultBehavior !== null || this.#userContextBehaviors.size) {
      this.#downloadListener.startListening();
      lazy.HelperAppDialogHandler.interceptDialogs(this);
    } else {
      this.#downloadListener.stopListening();
      lazy.HelperAppDialogHandler.restoreDialogs(this);
    }
  }

  #onDownloadStarted = async (eventName, data) => {
    const { download } = data;
    const userContextId = download.source.userContextId;

    if (
      this.#defaultBehavior !== null ||
      this.#userContextBehaviors.has(userContextId)
    ) {
      // Download behavior per user context overrides the global download behavior.
      const downloadBehavior =
        this.#userContextBehaviors.get(userContextId) || this.#defaultBehavior;
      if (downloadBehavior !== null && !downloadBehavior.allowed) {
        // Finalize the download to cancel it and remove the partial data.
        download.finalize(true);
      }
    }
  };
}
