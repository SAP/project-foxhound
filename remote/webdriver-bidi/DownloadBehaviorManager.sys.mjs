/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  DownloadListener:
    "chrome://remote/content/shared/listeners/DownloadListener.sys.mjs",
  DownloadPaths: "resource://gre/modules/DownloadPaths.sys.mjs",
  FileUtils: "resource://gre/modules/FileUtils.sys.mjs",
});

/**
 * A DownloadBehaviorManager class controls per user context and global download behavior.
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
    } else {
      this.#downloadListener.stopListening();
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

      if (downloadBehavior !== null) {
        if (downloadBehavior.allowed && downloadBehavior.destinationFolder) {
          // Since the temporary and partial data are already saved,
          // we have to clean it up before saving the download at the requested location.
          // This is a workaround until bug 2017252 is implemented.

          // Mark the download as intercepted to avoid sending the event when we pause the download.
          download.intercepted = true;
          // Pause the download to clean up any data saved.
          download.cancel();
          await download.removePartialData();
          const targetPath = PathUtils.join(
            downloadBehavior.destinationFolder,
            PathUtils.filename(download.target.path)
          );

          download.target.path = lazy.DownloadPaths.createNiceUniqueFile(
            new lazy.FileUtils.File(targetPath)
          ).path;

          // Restart the download.
          download.intercepted = false;
          download.start();
        } else if (!downloadBehavior.allowed) {
          download.cancel();
        }
      }
    }
  };
}
