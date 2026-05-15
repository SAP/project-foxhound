/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  cleanNoncanonicalUrl:
    "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs",
  findCandidates: "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs",
  pickCanonicalUrl:
    "moz-src:///browser/components/tabnotes/CanonicalURL.sys.mjs",
});

/**
 * Identifies the canonical URL in a top-level content frame, if possible,
 * and notifies the parent process about it.
 */
export class CanonicalURLChild extends JSWindowActorChild {
  /**
   * @param {Event} event
   */
  handleEvent(event) {
    switch (event.type) {
      case "DOMContentLoaded":
      case "pageshow":
        this.#discoverCanonicalUrl();
        break;
      case "popstate":
        /**
         * `document` does not fully reflect the new state of the page when
         * `popstate` is emitted. An immediate timeout is enough for some,
         * but not all, web sites to update their documents.
         *
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event#the_history_stack
         */
        this.contentWindow.setTimeout(() => this.#discoverCanonicalUrl(), 0);
        break;
    }
  }

  /**
   * Called when a message is received from the parent process.
   *
   * @param {ReceiveMessageArgument} msg
   */
  receiveMessage(msg) {
    switch (msg.name) {
      case "CanonicalURL:Detect":
        this.#discoverCanonicalUrl();
        break;
      case "CanonicalURL:DetectFromPushState":
        this.sendAsyncMessage("CanonicalURL:Identified", {
          canonicalUrl: lazy.cleanNoncanonicalUrl(msg.data.pushStateUrl),
          canonicalUrlSources: ["pushState"],
        });
        break;
    }
  }

  /**
   * Find a canonical URL in the document and tell the parent about it.
   */
  #discoverCanonicalUrl() {
    const candidates = lazy.findCandidates(this.document);
    const canonicalUrl = lazy.pickCanonicalUrl(candidates);
    const canonicalUrlSources = Object.keys(candidates).filter(
      candidate => candidates[candidate]
    );
    this.sendAsyncMessage("CanonicalURL:Identified", {
      canonicalUrl,
      canonicalUrlSources,
    });
  }
}
