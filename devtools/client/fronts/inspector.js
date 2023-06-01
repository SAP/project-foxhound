/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const Telemetry = require("resource://devtools/client/shared/telemetry.js");
const {
  FrontClassWithSpec,
  registerFront,
} = require("resource://devtools/shared/protocol.js");
const {
  inspectorSpec,
} = require("resource://devtools/shared/specs/inspector.js");

loader.lazyRequireGetter(
  this,
  "captureScreenshot",
  "resource://devtools/client/shared/screenshot.js",
  true
);

const TELEMETRY_EYEDROPPER_OPENED = "DEVTOOLS_EYEDROPPER_OPENED_COUNT";
const TELEMETRY_EYEDROPPER_OPENED_MENU =
  "DEVTOOLS_MENU_EYEDROPPER_OPENED_COUNT";
const SHOW_ALL_ANONYMOUS_CONTENT_PREF =
  "devtools.inspector.showAllAnonymousContent";

const telemetry = new Telemetry();

/**
 * Client side of the inspector actor, which is used to create
 * inspector-related actors, including the walker.
 */
class InspectorFront extends FrontClassWithSpec(inspectorSpec) {
  constructor(client, targetFront, parentFront) {
    super(client, targetFront, parentFront);

    this._client = client;
    this._highlighters = new Map();

    // Attribute name from which to retrieve the actorID out of the target actor's form
    this.formAttributeName = "inspectorActor";

    // Map of highlighter types to unsettled promises to create a highlighter of that type
    this._pendingGetHighlighterMap = new Map();

    this.noopStylesheetListener = () => {};
  }

  // async initialization
  async initialize() {
    if (this.initialized) {
      return this.initialized;
    }

    // Watch STYLESHEET resources to fill the ResourceCommand cache.
    // StyleRule front's `get parentStyleSheet()` will query the cache to
    // retrieve the resource corresponding to the parent stylesheet of a rule.
    const { resourceCommand } = this.targetFront.commands;
    // Backup resourceCommand, targetFront.commands might be null in `destroy`.
    this.resourceCommand = resourceCommand;
    await resourceCommand.watchResources([resourceCommand.TYPES.STYLESHEET], {
      onAvailable: this.noopStylesheetListener,
    });

    // Bail out if the inspector is closed while watchResources was pending
    if (this.isDestroyed()) {
      return null;
    }

    this.initialized = await Promise.all([
      this._getWalker(),
      this._getPageStyle(),
    ]);

    return this.initialized;
  }

  async _getWalker() {
    const showAllAnonymousContent = Services.prefs.getBoolPref(
      SHOW_ALL_ANONYMOUS_CONTENT_PREF
    );
    this.walker = await this.getWalker({
      showAllAnonymousContent,
    });

    // We need to reparent the RootNode of remote iframe Walkers
    // so that their parent is the NodeFront of the <iframe>
    // element, coming from another process/target/WalkerFront.
    await this.walker.reparentRemoteFrame();
  }

  hasHighlighter(type) {
    return this._highlighters.has(type);
  }

  async _getPageStyle() {
    this.pageStyle = await super.getPageStyle();
  }

  async getCompatibilityFront() {
    if (!this._compatibility) {
      this._compatibility = await super.getCompatibility();
    }

    return this._compatibility;
  }

  destroy() {
    if (this.isDestroyed()) {
      return;
    }
    this._compatibility = null;

    const { resourceCommand } = this;
    resourceCommand.unwatchResources([resourceCommand.TYPES.STYLESHEET], {
      onAvailable: this.noopStylesheetListener,
    });
    this.resourceCommand = null;

    this.walker = null;

    // CustomHighlighter fronts are managed by InspectorFront and so will be
    // automatically destroyed. But we have to clear the `_highlighters`
    // Map as well as explicitly call `finalize` request on all of them.
    this.destroyHighlighters();
    super.destroy();
  }

  destroyHighlighters() {
    for (const type of this._highlighters.keys()) {
      if (this._highlighters.has(type)) {
        const highlighter = this._highlighters.get(type);
        if (!highlighter.isDestroyed()) {
          highlighter.finalize();
        }
        this._highlighters.delete(type);
      }
    }
  }

  async getHighlighterByType(typeName) {
    let highlighter = null;
    try {
      highlighter = await super.getHighlighterByType(typeName);
    } catch (_) {
      throw new Error(
        "The target doesn't support " +
          `creating highlighters by types or ${typeName} is unknown`
      );
    }
    return highlighter;
  }

  getKnownHighlighter(type) {
    return this._highlighters.get(type);
  }

  /**
   * Return a highlighter instance of the given type.
   * If an instance was previously created, return it. Else, create and return a new one.
   *
   * Store a promise for the request to create a new highlighter. If another request
   * comes in before that promise is resolved, wait for it to resolve and return the
   * highlighter instance it resolved with instead of creating a new request.
   *
   * @param  {String} type
   *         Highlighter type
   * @return {Promise}
   *         Promise which resolves with a highlighter instance of the given type
   */
  async getOrCreateHighlighterByType(type) {
    let front = this._highlighters.get(type);
    let pendingGetHighlighter = this._pendingGetHighlighterMap.get(type);

    if (!front && !pendingGetHighlighter) {
      pendingGetHighlighter = (async () => {
        const highlighter = await this.getHighlighterByType(type);
        this._highlighters.set(type, highlighter);
        this._pendingGetHighlighterMap.delete(type);
        return highlighter;
      })();

      this._pendingGetHighlighterMap.set(type, pendingGetHighlighter);
    }

    if (pendingGetHighlighter) {
      front = await pendingGetHighlighter;
    }

    return front;
  }

  async pickColorFromPage(options) {
    let screenshot = null;

    // @backward-compat { version 87 } ScreenshotContentActor was only added in 87.
    //                  When connecting to older server, the eyedropper will  use drawWindow
    //                  to retrieve the screenshot of the page (that's a decent fallback,
    //                  even if it doesn't handle remote frames).
    if (this.targetFront.hasActor("screenshotContent")) {
      try {
        // We use the screenshot actors as it can retrieve an image of the current viewport,
        // handling remote frame if need be.
        const { data } = await captureScreenshot(this.targetFront, {
          browsingContextID: this.targetFront.browsingContextID,
          disableFlash: true,
          ignoreDprForFileScale: true,
        });
        screenshot = data;
      } catch (e) {
        // We simply log the error and still call pickColorFromPage as it will default to
        // use drawWindow in order to get the screenshot of the page (that's a decent
        // fallback, even if it doesn't handle remote frames).
        console.error(
          "Error occured when taking a screenshot for the eyedropper",
          e
        );
      }
    }

    await super.pickColorFromPage({
      ...options,
      screenshot,
    });

    if (options?.fromMenu) {
      telemetry.getHistogramById(TELEMETRY_EYEDROPPER_OPENED_MENU).add(true);
    } else {
      telemetry.getHistogramById(TELEMETRY_EYEDROPPER_OPENED).add(true);
    }
  }

  /**
   * Given a node grip, return a NodeFront on the right context.
   *
   * @param {Object} grip: The node grip.
   * @returns {Promise<NodeFront|null>} A promise that resolves with  a NodeFront or null
   *                                    if the NodeFront couldn't be created/retrieved.
   */
  async getNodeFrontFromNodeGrip(grip) {
    return this.getNodeActorFromContentDomReference(grip.contentDomReference);
  }

  async getNodeActorFromContentDomReference(contentDomReference) {
    const { browsingContextId } = contentDomReference;
    // If the contentDomReference lives in the same browsing context id than the
    // current one, we can directly use the current walker.
    if (this.targetFront.browsingContextID === browsingContextId) {
      return this.walker.getNodeActorFromContentDomReference(
        contentDomReference
      );
    }

    // If the contentDomReference has a different browsing context than the current one,
    // we are either in Fission or in the Multiprocess Browser Toolbox, so we need to
    // retrieve the walker of the WindowGlobalTarget.
    // Get the target for this remote frame element

    // Tab and Process Descriptors expose a Watcher, which should be used to
    // fetch the node's target.
    let target;
    const { watcherFront } = this.targetFront.commands;
    if (watcherFront) {
      target = await watcherFront.getWindowGlobalTarget(browsingContextId);
    } else {
      // For descriptors which don't expose a watcher (e.g. WebExtension)
      // we used to call RootActor::getBrowsingContextDescriptor, but it was
      // removed in FF77.
      // Support for watcher in WebExtension descriptors is Bug 1644341.
      throw new Error(
        `Unable to call getNodeActorFromContentDomReference for ${this.targetFront.actorID}`
      );
    }
    const { walker } = await target.getFront("inspector");
    return walker.getNodeActorFromContentDomReference(contentDomReference);
  }
}

exports.InspectorFront = InspectorFront;
registerFront(InspectorFront);
