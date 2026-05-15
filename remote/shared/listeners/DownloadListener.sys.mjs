/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  Downloads: "resource://gre/modules/Downloads.sys.mjs",
  EventEmitter: "resource://gre/modules/EventEmitter.sys.mjs",
});

/**
 * The DownloadListener can be used to listen for download lifecycle events
 * such as when a downloads starts.
 *
 * Example:
 * ```
 * const listener = new DownloadListener();
 * listener.on("download-started", onDownloadStarted);
 * listener.startListening();
 *
 * const onDownloadStarted = (eventName, data = {}) => {
 *   const { download } = data;
 *   console.log("Download started:", download.source.url);
 * };
 * ```
 *
 * @fires DownloadListener#"download-started"
 *    The DownloadListener emits the following events:
 *    - "download-started" when a download begins,
 *    - "download-stopped" when a download is stopped
 *    with the following object as payload:
 *      - {Download} download
 *            The Download object that started.
 */
export class DownloadListener {
  #destroyed;
  #downloadList;
  #downloadListPromise;
  #downloadView;
  #listening;
  #trackedDownloads;

  /**
   * Create a new DownloadListener instance.
   */
  constructor() {
    lazy.EventEmitter.decorate(this);

    this.#destroyed = false;
    this.#downloadList = null;

    // The downloadListPromise will be initialized when we lazily start
    // downloading the list, in order to make sure this is done only once.
    this.#downloadListPromise = null;

    this.#downloadView = {
      onDownloadAdded: this.#onDownloadAdded,
      onDownloadChanged: this.#onDownloadChanged,
      onDownloadRemoved: this.#onDownloadRemoved,
    };

    this.#listening = false;
    this.#trackedDownloads = new WeakMap();
  }

  destroy() {
    this.stopListening();

    this.#downloadList = null;
    this.#downloadView = null;

    this.#destroyed = true;
  }

  async startListening() {
    if (this.#listening) {
      return;
    }
    // Flip the flag immediately before waiting for the download list.
    this.#listening = true;

    // Wait for the download list to be retrieved.
    await this.#waitForDownloadList();

    // Check if we are still listening since the previous step is async.
    if (this.#listening) {
      // Prior to adding the view, track all existing downloads to avoid sending
      // unexpected backfill download-started events for existing downloads.
      const downloads = await this.#downloadList.getAll();
      for (const download of downloads) {
        this.#trackedDownloads.set(download, {
          started: download.startTime !== null,
        });
      }
      // Bug 1983012: addView/removeView are flagged as async but are fully sync.
      this.#downloadList.addView(this.#downloadView);
    }
  }

  stopListening() {
    if (!this.#listening) {
      return;
    }

    // Note: this.#downloadList might be null since its initialization is async.
    if (this.#downloadList) {
      // Remove this object as a view from the download list
      this.#downloadList.removeView(this.#downloadView);
    }

    // Clear tracked downloads
    this.#trackedDownloads = new WeakMap();

    this.#listening = false;
  }

  /**
   * Retrieve the internal listener state for a given download.
   *
   * @param {Download} download
   *     The download object for which we want to retrieve the listener state.
   *
   * @returns {object}
   *     The state for the download object.
   */
  #getDownloadState(download) {
    if (!this.#trackedDownloads.has(download)) {
      this.#trackedDownloads.set(download, {
        started: false,
      });
    }

    return this.#trackedDownloads.get(download);
  }

  #maybeEmitDownloadStarted(state, download) {
    if (!state.started && download.startTime) {
      state.started = true;
      this.emit("download-started", {
        download,
      });
    }
  }

  /**
   * DownloadList view callback triggered when a download is added.
   * Note that this will be triggered for all existing downloads when a new view
   * is added to the DownloadList.
   *
   * @param {Download} download
   *     The download object added to the list.
   */
  #onDownloadAdded = download => {
    const state = this.#getDownloadState(download);
    this.#maybeEmitDownloadStarted(state, download);
  };

  /**
   * DownloadList view callback triggered when a download status changed.
   *
   * @param {Download} download
   *     The download object which changed.
   */
  #onDownloadChanged = download => {
    const state = this.#getDownloadState(download);
    this.#maybeEmitDownloadStarted(state, download);

    // canceled + hasPartialData corresponds to a paused download.
    const paused = download.canceled && download.hasPartialData;
    // intercepted flag means that the download was paused by `DownloadBehaviorManager`
    // to cleanup potential partial data.
    if (
      !state.stopped &&
      download.stopped &&
      !paused &&
      !download.intercepted
    ) {
      state.stopped = true;
      this.emit("download-stopped", {
        download,
      });
    }
  };

  /**
   * DownloadList view callback triggered when a download is removed from the
   * list.
   *
   * @param {Download} download
   *     The download object which was removed from the list.
   */
  #onDownloadRemoved = download => {
    this.#trackedDownloads.delete(download);
  };

  async #waitForDownloadList() {
    if (this.#downloadListPromise == null) {
      const { promise, resolve } = Promise.withResolvers();
      this.#downloadListPromise = promise;
      const downloadList = await lazy.Downloads.getList(lazy.Downloads.ALL);
      if (this.#destroyed) {
        // Bail out before setting the downloadList if the listener was already
        // destroyed.
        return;
      }
      this.#downloadList = downloadList;
      resolve();
    }

    await this.#downloadListPromise;
  }
}
