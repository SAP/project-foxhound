/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const webTransportEventService = Cc[
  "@mozilla.org/webtransportevent/service;1"
].getService(Ci.nsIWebTransportEventService);

class WebTransportWatcher {
  constructor() {
    this.windowIds = new Map();
    this.abortController = new AbortController();
    this.onWindowReady = this.onWindowReady.bind(this);
    this.onWindowDestroy = this.onWindowDestroy.bind(this);
  }

  static createResource(wtMessageType, eventParams) {
    return {
      wtMessageType,
      ...eventParams,
    };
  }

  watch(targetActor, { onAvailable }) {
    this.targetActor = targetActor;
    this.onAvailable = onAvailable;

    for (const window of this.targetActor.windows) {
      const { innerWindowId } = window.windowGlobalChild;
      this.startListening(innerWindowId);
    }

    // On navigate/reload we should re-start listening with the new `innerWindowID`
    if (!this.targetActor.followWindowGlobalLifeCycle) {
      this.targetActor.on("window-ready", this.onWindowReady, {
        signal: this.abortController.signal,
      });
      this.targetActor.on("window-destroyed", this.onWindowDestroy, {
        signal: this.abortController.signal,
      });
    }
  }

  onWindowReady({ window }) {
    const { innerWindowId } = window.windowGlobalChild;
    this.startListening(innerWindowId);
  }

  onWindowDestroy({ id }) {
    this.stopListening(id);
  }

  startListening(innerWindowId) {
    if (!this.windowIds.has(innerWindowId)) {
      const listener = {
        // methods for the webTransportEventService
        webTransportSessionCreated: () => {},
        webTransportSessionClosed: () => {},
      };
      this.windowIds.set(innerWindowId, listener);
      webTransportEventService.addListener(innerWindowId, listener);
    }
  }

  stopListening(innerWindowId) {
    if (this.windowIds.has(innerWindowId)) {
      if (!webTransportEventService.hasListenerFor(innerWindowId)) {
        // The listener might have already been cleaned up on `window-destroy`.
        console.warn(
          "Already stopped listening to webtransport events for this window."
        );
        return;
      }
      webTransportEventService.removeListener(
        innerWindowId,
        this.windowIds.get(innerWindowId)
      );
      this.windowIds.delete(innerWindowId);
    }
  }

  destroy() {
    this.abortController.abort();
    for (const id of this.windowIds) {
      this.stopListening(id);
    }
  }
}

module.exports = WebTransportWatcher;
