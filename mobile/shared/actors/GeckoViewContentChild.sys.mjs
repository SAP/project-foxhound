/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GeckoViewActorChild } from "resource://gre/modules/GeckoViewActorChild.sys.mjs";

// This needs to match ScreenLength.java
const SCREEN_LENGTH_TYPE_PIXEL = 0;
const SCREEN_LENGTH_TYPE_VISUAL_VIEWPORT_WIDTH = 1;
const SCREEN_LENGTH_TYPE_VISUAL_VIEWPORT_HEIGHT = 2;
const SCREEN_LENGTH_DOCUMENT_WIDTH = 3;
const SCREEN_LENGTH_DOCUMENT_HEIGHT = 4;

// This need to match PanZoomController.java
const SCROLL_BEHAVIOR_SMOOTH = 0;
const SCROLL_BEHAVIOR_AUTO = 1;

const SCREEN_ORIENTATION_PORTRAIT = 0;
const SCREEN_ORIENTATION_LANDSCAPE = 1;

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  PrivacyFilter: "resource://gre/modules/sessionstore/PrivacyFilter.sys.mjs",
});

export class GeckoViewContentChild extends GeckoViewActorChild {
  constructor() {
    super();
    this.lastOrientation = SCREEN_ORIENTATION_PORTRAIT;
  }

  actorCreated() {
    this.pageShow = new Promise(resolve => {
      this.receivedPageShow = resolve;
    });
  }

  toPixels(aLength, aType) {
    const { contentWindow } = this;
    if (aType === SCREEN_LENGTH_TYPE_PIXEL) {
      return aLength;
    } else if (aType === SCREEN_LENGTH_TYPE_VISUAL_VIEWPORT_WIDTH) {
      return aLength * contentWindow.visualViewport.width;
    } else if (aType === SCREEN_LENGTH_TYPE_VISUAL_VIEWPORT_HEIGHT) {
      return aLength * contentWindow.visualViewport.height;
    } else if (aType === SCREEN_LENGTH_DOCUMENT_WIDTH) {
      return aLength * contentWindow.document.body.scrollWidth;
    } else if (aType === SCREEN_LENGTH_DOCUMENT_HEIGHT) {
      return aLength * contentWindow.document.body.scrollHeight;
    }

    return aLength;
  }

  toScrollBehavior(aBehavior) {
    const { contentWindow } = this;
    if (!contentWindow) {
      return 0;
    }
    const { windowUtils } = contentWindow;
    if (aBehavior === SCROLL_BEHAVIOR_SMOOTH) {
      return windowUtils.SCROLL_MODE_SMOOTH;
    } else if (aBehavior === SCROLL_BEHAVIOR_AUTO) {
      return windowUtils.SCROLL_MODE_INSTANT;
    }
    return windowUtils.SCROLL_MODE_SMOOTH;
  }

  orientation() {
    const currentOrientationType = this.contentWindow?.screen.orientation.type;
    if (!currentOrientationType) {
      // Unfortunately, we don't know current screen orientation.
      // Return portrait as default.
      return SCREEN_ORIENTATION_PORTRAIT;
    }
    if (currentOrientationType.startsWith("landscape")) {
      return SCREEN_ORIENTATION_LANDSCAPE;
    }
    return SCREEN_ORIENTATION_PORTRAIT;
  }

  receiveMessage(message) {
    const { name } = message;
    debug`receiveMessage: ${name}`;

    switch (name) {
      case "GeckoView:DOMFullscreenEntered": {
        const windowUtils = this.contentWindow?.windowUtils;
        const actor =
          this.contentWindow?.windowGlobalChild?.getActor("ContentDelegate");
        if (!windowUtils) {
          // If we are not able to enter fullscreen, tell the parent to just
          // exit.
          actor?.sendAsyncMessage("GeckoView:DOMFullscreenExit", {});
          break;
        }
        this.lastOrientation = this.orientation();
        let remoteFrameBC = message.data.remoteFrameBC;
        if (remoteFrameBC) {
          let remoteFrame = remoteFrameBC.embedderElement;
          if (!remoteFrame) {
            // This could happen when the page navigate away and trigger a
            // process switching during fullscreen transition, tell the parent
            // to just exit.
            actor?.sendAsyncMessage("GeckoView:DOMFullscreenExit", {});
            break;
          }

          windowUtils.remoteFrameFullscreenChanged(remoteFrame);
          break;
        }

        if (
          !windowUtils.handleFullscreenRequests() &&
          !this.contentWindow?.document.fullscreenElement
        ) {
          // If we don't actually have any pending fullscreen request
          // to handle, neither we have been in fullscreen, tell the
          // parent to just exit.
          actor?.sendAsyncMessage("GeckoView:DOMFullscreenExit", {});
        }
        break;
      }
      case "GeckoView:DOMFullscreenExited": {
        // During fullscreen, window size is changed. So don't restore viewport size.
        const restoreViewSize = this.orientation() == this.lastOrientation;
        this.contentWindow?.windowUtils.exitFullscreen(!restoreViewSize);
        break;
      }
      case "GeckoView:ZoomToInput": {
        const { contentWindow } = this;
        const dwu = contentWindow.windowUtils;

        const zoomToFocusedInput = function () {
          if (!dwu.flushApzRepaints()) {
            dwu.zoomToFocusedInput();
            return;
          }
          Services.obs.addObserver(function apzFlushDone() {
            Services.obs.removeObserver(apzFlushDone, "apz-repaints-flushed");
            dwu.zoomToFocusedInput();
          }, "apz-repaints-flushed");
        };

        zoomToFocusedInput();
        break;
      }
      case "GeckoView:UpdateInitData": {
        // Provide a hook for native code to detect a transfer.
        Services.obs.notifyObservers(
          this.docShell,
          "geckoview-content-global-transferred"
        );
        break;
      }
      case "GeckoView:ScrollBy": {
        const x = {};
        const y = {};
        const { contentWindow } = this;
        const { widthValue, widthType, heightValue, heightType, behavior } =
          message.data;
        contentWindow.windowUtils.getVisualViewportOffset(x, y);
        contentWindow.windowUtils.scrollToVisual(
          x.value + this.toPixels(widthValue, widthType),
          y.value + this.toPixels(heightValue, heightType),
          contentWindow.windowUtils.UPDATE_TYPE_MAIN_THREAD,
          this.toScrollBehavior(behavior)
        );
        break;
      }
      case "GeckoView:ScrollTo": {
        const { contentWindow } = this;
        const { widthValue, widthType, heightValue, heightType, behavior } =
          message.data;
        contentWindow.windowUtils.scrollToVisual(
          this.toPixels(widthValue, widthType),
          this.toPixels(heightValue, heightType),
          contentWindow.windowUtils.UPDATE_TYPE_MAIN_THREAD,
          this.toScrollBehavior(behavior)
        );
        break;
      }
      case "ContainsFormData": {
        return this.containsFormData();
      }
    }

    return null;
  }

  async containsFormData() {
    const { contentWindow } = this;
    let formdata = SessionStoreUtils.collectFormData(contentWindow);
    formdata = lazy.PrivacyFilter.filterFormData(formdata || {});
    if (formdata) {
      return true;
    }
    return false;
  }

  // eslint-disable-next-line complexity
  handleEvent(aEvent) {
    debug`handleEvent: ${aEvent.type}`;

    switch (aEvent.type) {
      case "pageshow": {
        this.receivedPageShow();
        break;
      }

      case "mozcaretstatechanged":
        if (
          aEvent.reason === "presscaret" ||
          aEvent.reason === "releasecaret"
        ) {
          this.sendAsyncMessage("GeckoView:PinOnScreen", {
            pinned: aEvent.reason === "presscaret",
          });
        }
        break;
    }
  }
}

const { debug, warn } = GeckoViewContentChild.initLogging("GeckoViewContent");
