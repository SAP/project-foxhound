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
  SessionHistory: "resource://gre/modules/sessionstore/SessionHistory.sys.mjs",
});

export class GeckoViewContentChild extends GeckoViewActorChild {
  constructor() {
    super();
    this.lastOrientation = SCREEN_ORIENTATION_PORTRAIT;
  }

  actorCreated() {
    super.actorCreated();

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

  collectSessionState() {
    const { docShell, contentWindow } = this;
    const history = lazy.SessionHistory.collect(docShell);
    let formdata = SessionStoreUtils.collectFormData(contentWindow);
    let scrolldata = SessionStoreUtils.collectScrollPosition(contentWindow);

    // Save the current document resolution.
    let zoom = 1;
    const domWindowUtils = contentWindow.windowUtils;
    zoom = domWindowUtils.getResolution();
    scrolldata = scrolldata || {};
    scrolldata.zoom = {};
    scrolldata.zoom.resolution = zoom;

    // Save some data that'll help in adjusting the zoom level
    // when restoring in a different screen orientation.
    const displaySize = {};
    const width = {},
      height = {};
    domWindowUtils.getDocumentViewerSize(width, height);

    displaySize.width = width.value;
    displaySize.height = height.value;

    scrolldata.zoom.displaySize = displaySize;

    formdata = lazy.PrivacyFilter.filterFormData(formdata || {});

    return { history, formdata, scrolldata };
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
      case "GeckoView:DOMFullscreenEntered":
        this.lastOrientation = this.orientation();
        if (
          !this.contentWindow?.windowUtils.handleFullscreenRequests() &&
          !this.contentWindow?.document.fullscreenElement
        ) {
          // If we don't actually have any pending fullscreen request
          // to handle, neither we have been in fullscreen, tell the
          // parent to just exit.
          const actor =
            this.contentWindow?.windowGlobalChild?.getActor("ContentDelegate");
          actor?.sendAsyncMessage("GeckoView:DOMFullscreenExit", {});
        }
        break;
      case "GeckoView:DOMFullscreenExited":
        // During fullscreen, window size is changed. So don't restore viewport size.
        const restoreViewSize = this.orientation() == this.lastOrientation;
        this.contentWindow?.windowUtils.exitFullscreen(!restoreViewSize);
        break;
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
      case "RestoreSessionState": {
        this.restoreSessionState(message);
        break;
      }
      case "RestoreHistoryAndNavigate": {
        const { history, switchId } = message.data;
        if (history) {
          lazy.SessionHistory.restore(this.docShell, history);
          const historyIndex = history.requestedIndex - 1;
          const webNavigation = this.docShell.QueryInterface(
            Ci.nsIWebNavigation
          );

          if (!switchId) {
            // TODO: Bug 1648158 This won't work for Fission or HistoryInParent.
            webNavigation.sessionHistory.legacySHistory.reloadCurrentEntry();
          } else {
            webNavigation.resumeRedirectedLoad(switchId, historyIndex);
          }
        }
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
      case "CollectSessionState": {
        return this.collectSessionState();
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

  async restoreSessionState(message) {
    // Make sure we showed something before restoring scrolling and form data
    await this.pageShow;

    const { contentWindow } = this;
    const { formdata, scrolldata } = message.data;

    /**
     * Restores frame tree |data|, starting at the given root |frame|. As the
     * function recurses into descendant frames it will call cb(frame, data) for
     * each frame it encounters, starting with the given root.
     */
    function restoreFrameTreeData(frame, data, cb) {
      // Restore data for the root frame.
      // The callback can abort by returning false.
      if (cb(frame, data) === false) {
        return;
      }

      if (!data.hasOwnProperty("children")) {
        return;
      }

      // Recurse into child frames.
      SessionStoreUtils.forEachNonDynamicChildFrame(
        frame,
        (subframe, index) => {
          if (data.children[index]) {
            restoreFrameTreeData(subframe, data.children[index], cb);
          }
        }
      );
    }

    if (formdata) {
      restoreFrameTreeData(contentWindow, formdata, (frame, data) => {
        // restore() will return false, and thus abort restoration for the
        // current |frame| and its descendants, if |data.url| is given but
        // doesn't match the loaded document's URL.
        return SessionStoreUtils.restoreFormData(frame.document, data);
      });
    }

    if (scrolldata) {
      restoreFrameTreeData(contentWindow, scrolldata, (frame, data) => {
        if (data.scroll) {
          SessionStoreUtils.restoreScrollPosition(frame, data);
        }
      });
    }

    if (scrolldata && scrolldata.zoom && scrolldata.zoom.displaySize) {
      const utils = contentWindow.windowUtils;
      // Restore zoom level.
      utils.setRestoreResolution(
        scrolldata.zoom.resolution,
        scrolldata.zoom.displaySize.width,
        scrolldata.zoom.displaySize.height
      );
    }
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
          this.eventDispatcher.sendRequest({
            type: "GeckoView:PinOnScreen",
            pinned: aEvent.reason === "presscaret",
          });
        }
        break;
    }
  }
}

const { debug, warn } = GeckoViewContentChild.initLogging("GeckoViewContent");
