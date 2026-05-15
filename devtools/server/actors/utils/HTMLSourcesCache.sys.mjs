/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Helper class spawn independently from target to watcher for HTML source content
 * being emitted by the C++ HTML Parser.
 *
 * As HTML sources are parsed before the HTML document's WindowGlobal is created,
 * they will be parsed before the target gets created.
 * This class is instantiated as soon as we start watching for WindowGlobal's
 * and will hold HTML sources and deliver them on-demand to SourcesManager.
 *
 * This cache clears itself automatically when the WindowGlobals are destroyed.
 */
class HtmlCache {
  // Map<string ->
  //   Map<string -> Object{
  //     content: string
  //     complete: boolean,
  //     parserID: string,
  //   }>
  // >
  // Nested Maps of source objects keyed by source url, stored into
  // this map keyed by Browsing Context ID.
  #sourcesByBrowsingContext = new Map();

  // Map<string: number>
  // Number of active listeners (WindowGlobal target watchers) for all currently observed browser element IDs.
  #noOfActiveTargetWatchers = new Map();

  // Map<number -> number>
  // Map the browsing context ID for each currently active Window global InnerWindowID
  //
  // We have to keep track of the relationship between innerWindowID and browsingContextID
  // as inner-window-destroyed only emits the innerWindowID number, from which
  // we can't derivate the browsingContextID required to clear `#sourcesByBrowsingContext` Map.
  #browsingContextIDByInnerWindowId = new Map();

  constructor() {
    Services.obs.addObserver(this, "devtools-html-content");
    Services.obs.addObserver(this, "document-element-inserted");
    Services.obs.addObserver(this, "inner-window-destroyed");
  }

  destroy() {
    Services.obs.removeObserver(this, "devtools-html-content");
    Services.obs.removeObserver(this, "document-element-inserted");
    Services.obs.removeObserver(this, "inner-window-destroyed");
  }

  watch(browserId) {
    const noOfTargetWatchers =
      this.#noOfActiveTargetWatchers.get(browserId) || 0;
    this.#noOfActiveTargetWatchers.set(browserId, noOfTargetWatchers + 1);
  }

  unwatch(browserId) {
    const noOfTargetWatchers = this.#noOfActiveTargetWatchers.get(browserId);
    if (noOfTargetWatchers > 1) {
      this.#noOfActiveTargetWatchers.set(browserId, noOfTargetWatchers - 1);
    } else {
      this.#noOfActiveTargetWatchers.delete(browserId);
    }
  }

  get(browsingContextID, url, partial) {
    const sourcesByUrl = this.#sourcesByBrowsingContext.get(browsingContextID);
    if (sourcesByUrl) {
      const source = sourcesByUrl.get(url);
      if (source) {
        if (!partial && !source.complete) {
          return source.onComplete.then(() => {
            return {
              content: source.content,
              contentType: "text/html",
            };
          });
        }
        return {
          content: source.content,
          contentType: "text/html",
        };
      }
    }
    if (partial) {
      return {
        content: "",
        contentType: "",
      };
    }
    return null;
  }

  /**
   * Listener for new HTML content.
   */
  observe(subject, topic, data) {
    if (topic === "inner-window-destroyed") {
      const innerWindowId = subject.QueryInterface(Ci.nsISupportsPRUint64).data;
      const browsingContextID =
        this.#browsingContextIDByInnerWindowId.get(innerWindowId);
      if (browsingContextID) {
        this.#sourcesByBrowsingContext.delete(browsingContextID);
        this.#browsingContextIDByInnerWindowId.delete(innerWindowId);
      }
    } else if (topic === "document-element-inserted") {
      const window = subject.defaultView;
      // Ignore any non-HTML document
      if (!window) {
        return;
      }
      const innerWindowId = window.windowGlobalChild.innerWindowId;
      const browsingContextID = window.browsingContext.id;
      this.#browsingContextIDByInnerWindowId.set(
        innerWindowId,
        browsingContextID
      );
    } else if (topic === "devtools-html-content") {
      const {
        parserID,
        browserId,
        browsingContextID,
        uri,
        contents,
        complete,
      } = JSON.parse(data);

      // Only save data if the related browser element is being observed
      if (!this.#noOfActiveTargetWatchers.has(browserId)) {
        return;
      }

      let sourcesByUrl = this.#sourcesByBrowsingContext.get(browsingContextID);
      if (!sourcesByUrl) {
        sourcesByUrl = new Map();
        this.#sourcesByBrowsingContext.set(browsingContextID, sourcesByUrl);
      }
      const source = sourcesByUrl.get(uri);
      if (source) {
        // We received many devtools-html-content events, if we already received one,
        // aggregate the data with the one we already received.
        if (source.parserID == parserID) {
          source.content += contents;
          source.complete = complete;

          // After the HTML has finished loading, resolve any promises
          // waiting for the complete file contents. Waits will only
          // occur when the URL was ever partially loaded.
          if (complete) {
            source.resolveComplete();
          }
        }
      } else if (contents) {
        const { promise, resolve } = Promise.withResolvers();
        // Ensure that `contents` is non-empty. We may miss all the devtools-html-content events except the last
        // one which has an empty `contents` and `complete` set to true.
        // This reproduces when opening a same-process iframe. In this particular scenario, we instantiate the target and thread actor
        // on `DOMDocElementInserted` and the HTML document is already parsed, but we still receive this one very last notification.
        sourcesByUrl.set(uri, {
          // String: HTML source text content
          content: contents,
          // Boolean: is the source complete
          complete,
          // String: uuid generated by the html parser to uniquely identify a document
          parserID,
          // Promise: resolved when the source is complete
          onComplete: promise,
          // Function: to be called when the source is complete
          resolveComplete: resolve,
        });
      }
    }
  }
}

export const HTMLSourcesCache = new HtmlCache();
