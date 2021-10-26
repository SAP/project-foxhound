/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

var EXPORTED_SYMBOLS = ["DevToolsFrameChild"];

const { EventEmitter } = ChromeUtils.import(
  "resource://gre/modules/EventEmitter.jsm"
);
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const Loader = ChromeUtils.import("resource://devtools/shared/Loader.jsm");
const { XPCOMUtils } = ChromeUtils.import(
  "resource://gre/modules/XPCOMUtils.jsm"
);
XPCOMUtils.defineLazyModuleGetters(this, {
  TargetActorRegistry:
    "resource://devtools/server/actors/targets/target-actor-registry.jsm",
});

XPCOMUtils.defineLazyModuleGetters(this, {
  WindowGlobalLogger:
    "resource://devtools/server/connectors/js-window-actor/WindowGlobalLogger.jsm",
});

// Name of the attribute into which we save data in `sharedData` object.
const SHARED_DATA_KEY_NAME = "DevTools:watchedPerWatcher";

// If true, log info about WindowGlobal's being created.
const DEBUG = false;

/**
 * Helper function to know if a given WindowGlobal should be exposed via watchTargets("frame") API
 */
function shouldNotifyWindowGlobal(windowGlobal, watchedBrowserId) {
  const browsingContext = windowGlobal.browsingContext;

  // Ignore about:blank loads, which spawn a document that never finishes loading
  // and would require somewhat useless Target and all its related overload.
  const window = Services.wm.getCurrentInnerWindowWithId(
    windowGlobal.innerWindowId
  );
  // For some unknown reason, the print preview of PDFs generates an about:blank document,
  // which, on the parent process, has windowGlobal.documentURI.spec set to the pdf's URL.
  // So that Frame target helper accept this WindowGlobal and instantiate a target for it.
  // Which is great as this is a valuable document to debug.
  // But at the end of the day, in the content process, this ends up being an about:blank document,
  // and hasLoadedNonBlankURI is always false.
  // As print preview uses a dialog, check for `opener` being set. It is hard to find
  // any very good differenciator...
  if (!window.docShell.hasLoadedNonBlankURI && !browsingContext.opener) {
    return false;
  }

  // If we are focusing only on a sub-tree of Browsing Element,
  // Ignore the out of the sub tree elements.
  if (watchedBrowserId && browsingContext.browserId != watchedBrowserId) {
    return false;
  }

  // For now, we only mention the "remote frames".
  // i.e. the frames which are in a distinct process compared to their parent document
  // If there is no parent, this is most likely the top level document.
  // Ignore it only if this is the top level target we are watching.
  // For now we don't expect a target to be created, but we will as TabDescriptors arise.
  if (
    !browsingContext.parent &&
    browsingContext.browserId == watchedBrowserId
  ) {
    return false;
  }

  // `isInProcess` is always false, even if the window runs in the same process.
  // `osPid` attribute is not set on WindowGlobalChild
  // so it is hard to guess if the given WindowGlobal runs in this process or not,
  // which is what we want to know here. Here is a workaround way to know it :/
  // ---
  // Also. It might be a bit surprising to have a DevToolsFrameChild/JSWindowActorChild
  // to be instantiated for WindowGlobals that aren't from this process... Is that expected?
  if (Cu.isRemoteProxy(windowGlobal.window)) {
    return false;
  }

  // When Fission is turned off, we still process here the iframes that are running in the
  // same process.
  // As we can't use isInProcess, nor osPid (see previous block), we have
  // to fallback to other checks. Here we check if we are able to access the parent document's window.
  // If we can, it means that it runs in the same process as the current iframe we are processing.
  if (
    browsingContext.parent &&
    browsingContext.parent.window &&
    !Cu.isRemoteProxy(browsingContext.parent.window)
  ) {
    return false;
  }

  return true;
}

function logWindowGlobal(windowGlobal, message) {
  if (!DEBUG) {
    return;
  }
  WindowGlobalLogger.logWindowGlobal(windowGlobal, message);
}

class DevToolsFrameChild extends JSWindowActorChild {
  constructor() {
    super();

    // The map is indexed by the Watcher Actor ID.
    // The values are objects containing the following properties:
    // - connection: the DevToolsServerConnection itself
    // - actor: the FrameTargetActor instance
    this._connections = new Map();

    this._onConnectionChange = this._onConnectionChange.bind(this);
    EventEmitter.decorate(this);
  }

  instantiate() {
    const { sharedData } = Services.cpmm;
    const watchedDataByWatcherActor = sharedData.get(SHARED_DATA_KEY_NAME);
    if (!watchedDataByWatcherActor) {
      throw new Error(
        "Request to instantiate the target(s) for the BrowsingContext, but `sharedData` is empty about watched targets"
      );
    }

    // Create one Target actor for each prefix/client which listen to frames
    for (const [watcherActorID, watchedData] of watchedDataByWatcherActor) {
      const { connectionPrefix, browserId } = watchedData;
      if (
        watchedData.targets.includes("frame") &&
        shouldNotifyWindowGlobal(this.manager, browserId)
      ) {
        this._createTargetActor(watcherActorID, connectionPrefix, watchedData);
      }
    }
  }

  /**
   * Instantiate a new WindowGlobalTarget for the given connection.
   *
   * @param String watcherActorID
   *        The ID of the WatcherActor who requested to observe and create these target actors.
   * @param String parentConnectionPrefix
   *        The prefix of the DevToolsServerConnection of the Watcher Actor.
   *        This is used to compute a unique ID for the target actor.
   * @param Object initialData
   *        All data managed by the Watcher Actor and WatcherRegistry.jsm, containing
   *        target types, resources types to be listened as well as breakpoints and any
   *        other data meant to be shared across processes and threads.
   */
  _createTargetActor(watcherActorID, parentConnectionPrefix, initialData) {
    if (this._connections.get(watcherActorID)) {
      throw new Error(
        "DevToolsFrameChild _createTargetActor was called more than once" +
          ` for the same Watcher (Actor ID: "${watcherActorID}")`
      );
    }

    // Compute a unique prefix, just for this WindowGlobal,
    // which will be used to create a JSWindowActorTransport pair between content and parent processes.
    // This is slightly hacky as we typicaly compute Prefix and Actor ID via `DevToolsServerConnection.allocID()`,
    // but here, we can't have access to any DevTools connection as we are really early in the content process startup
    // XXX: WindowGlobal's innerWindowId should be unique across processes, I think. So that should be safe?
    // (this.manager == WindowGlobalChild interface)
    const forwardingPrefix =
      parentConnectionPrefix + "windowGlobal" + this.manager.innerWindowId;

    logWindowGlobal(
      this.manager,
      "Instantiate WindowGlobalTarget with prefix: " + forwardingPrefix
    );

    const { connection, targetActor } = this._createConnectionAndActor(
      forwardingPrefix
    );
    this._connections.set(watcherActorID, {
      connection,
      actor: targetActor,
    });

    // Pass initialization data to the target actor
    for (const type in initialData) {
      targetActor.addWatcherDataEntry(type, initialData[type]);
    }

    // Immediately queue a message for the parent process,
    // in order to ensure that the JSWindowActorTransport is instantiated
    // before any packet is sent from the content process.
    // As the order of messages is quaranteed to be delivered in the order they
    // were queued, we don't have to wait for anything around this sendAsyncMessage call.
    // In theory, the FrameTargetActor may emit events in its constructor.
    // If it does, such RDP packets may be lost. But in practice, no events
    // are emitted during its construction. Instead the frontend will start
    // the communication first.
    this.sendAsyncMessage("DevToolsFrameChild:connectFromContent", {
      watcherActorID,
      forwardingPrefix,
      actor: targetActor.form(),
    });
  }

  _destroyTargetActor(watcherActorID) {
    const connectionInfo = this._connections.get(watcherActorID);
    // This connection has already been cleaned?
    if (!connectionInfo) {
      throw new Error(
        `Trying to destroy a target actor that doesn't exists, or has already been destroyed. Watcher Actor ID:${watcherActorID}`
      );
    }
    connectionInfo.connection.close();
    this._connections.delete(watcherActorID);
    if (this._connections.size == 0) {
      this.didDestroy();
    }
  }

  _createConnectionAndActor(forwardingPrefix) {
    this.useCustomLoader = this.document.nodePrincipal.isSystemPrincipal;

    // When debugging chrome pages, use a new dedicated loader, using a distinct chrome compartment.
    if (!this.loader) {
      this.loader = this.useCustomLoader
        ? new Loader.DevToolsLoader({
            invisibleToDebugger: true,
          })
        : Loader;
    }
    const { DevToolsServer } = this.loader.require(
      "devtools/server/devtools-server"
    );

    const { FrameTargetActor } = this.loader.require(
      "devtools/server/actors/targets/frame"
    );

    DevToolsServer.init();

    // We want a special server without any root actor and only target-scoped actors.
    // We are going to spawn a FrameTargetActor instance in the next few lines,
    // it is going to act like a root actor without being one.
    DevToolsServer.registerActors({ target: true });
    DevToolsServer.on("connectionchange", this._onConnectionChange);

    const connection = DevToolsServer.connectToParentWindowActor(
      this,
      forwardingPrefix
    );

    // Create the actual target actor.
    const targetActor = new FrameTargetActor(connection, this.docShell, {
      followWindowGlobalLifeCycle: true,
      doNotFireFrameUpdates: true,
    });
    targetActor.manage(targetActor);

    return { connection, targetActor };
  }

  /**
   * Destroy the server once its last connection closes. Note that multiple
   * frame scripts may be running in parallel and reuse the same server.
   */
  _onConnectionChange() {
    const { DevToolsServer } = this.loader.require(
      "devtools/server/devtools-server"
    );

    // Only destroy the server if there is no more connections to it. It may be
    // used to debug another tab running in the same process.
    if (DevToolsServer.hasConnection() || DevToolsServer.keepAlive) {
      return;
    }

    if (this._destroyed) {
      return;
    }
    this._destroyed = true;

    DevToolsServer.off("connectionchange", this._onConnectionChange);
    DevToolsServer.destroy();
  }

  /**
   * Supported Queries
   */

  sendPacket(packet, prefix) {
    this.sendAsyncMessage("DevToolsFrameChild:packet", { packet, prefix });
  }

  /**
   * JsWindowActor API
   */

  async sendQuery(msg, args) {
    try {
      const res = await super.sendQuery(msg, args);
      return res;
    } catch (e) {
      console.error("Failed to sendQuery in DevToolsFrameChild", msg);
      console.error(e.toString());
      throw e;
    }
  }

  receiveMessage(message) {
    // All messages but "packet" one pass `browserId` and are expected
    // to match shouldNotifyWindowGlobal result.
    if (message.name != "DevToolsFrameParent:packet") {
      const { browserId } = message.data;
      // Re-check here, just to ensure that both parent and content processes agree
      // on what should or should not be watched.
      if (
        this.manager.browsingContext.browserId != browserId &&
        !shouldNotifyWindowGlobal(this.manager, browserId)
      ) {
        throw new Error(
          "Mismatch between DevToolsFrameParent and DevToolsFrameChild  " +
            (this.manager.browsingContext.browserId == browserId
              ? "window global shouldn't be notified (shouldNotifyWindowGlobal mismatch)"
              : `expected browsing context with browserId ${browserId}, but got ${this.manager.browsingContext.browserId}`)
        );
      }
    }
    switch (message.name) {
      case "DevToolsFrameParent:instantiate-already-available": {
        const { watcherActorID, connectionPrefix, watchedData } = message.data;
        return this._createTargetActor(
          watcherActorID,
          connectionPrefix,
          watchedData
        );
      }
      case "DevToolsFrameParent:destroy": {
        const { watcherActorID } = message.data;
        return this._destroyTargetActor(watcherActorID);
      }
      case "DevToolsFrameParent:addWatcherDataEntry": {
        const { watcherActorID, browserId, type, entries } = message.data;
        return this._addWatcherDataEntry(
          watcherActorID,
          browserId,
          type,
          entries
        );
      }
      case "DevToolsFrameParent:removeWatcherDataEntry": {
        const { watcherActorID, browserId, type, entries } = message.data;
        return this._removeWatcherDataEntry(
          watcherActorID,
          browserId,
          type,
          entries
        );
      }
      case "DevToolsFrameParent:packet":
        return this.emit("packet-received", message);
      default:
        throw new Error(
          "Unsupported message in DevToolsFrameParent: " + message.name
        );
    }
  }

  _getTargetActorForWatcherActorID(watcherActorID, browserId) {
    const connectionInfo = this._connections.get(watcherActorID);
    let targetActor = connectionInfo ? connectionInfo.actor : null;
    // We might not get the target actor created by DevToolsFrameChild.
    // For the Tab top-level target for content toolbox,
    // we are still using the "message manager connector",
    // so that they keep working across navigation.
    // We will surely remove all of this. "Message manager connector", and
    // this special codepath once we are ready to make the top level target to
    // be destroyed on navigations. See bug 1602748 for more context.
    if (!targetActor && this.manager.browsingContext.browserId == browserId) {
      // Ensure retrieving the one target actor related to this connection.
      // This allows to distinguish actors created for various toolboxes.
      // For ex, regular toolbox versus browser console versus browser toolbox
      const connectionPrefix = watcherActorID.replace(/watcher\d+$/, "");
      targetActor = TargetActorRegistry.getTargetActor(
        browserId,
        connectionPrefix
      );
    }
    return targetActor;
  }

  _addWatcherDataEntry(watcherActorID, browserId, type, entries) {
    const targetActor = this._getTargetActorForWatcherActorID(
      watcherActorID,
      browserId
    );
    if (!targetActor) {
      throw new Error(
        `No target actor for this Watcher Actor ID:"${watcherActorID}" / BrowserId:${browserId}`
      );
    }
    return targetActor.addWatcherDataEntry(type, entries);
  }

  _removeWatcherDataEntry(watcherActorID, browserId, type, entries) {
    const targetActor = this._getTargetActorForWatcherActorID(
      watcherActorID,
      browserId
    );
    // By the time we are calling this, the target may already have been destroyed.
    if (targetActor) {
      return targetActor.removeWatcherDataEntry(type, entries);
    }
    return null;
  }

  handleEvent({ type }) {
    // DOMWindowCreated is registered from FrameWatcher via `ActorManagerParent.addJSWindowActors`
    // as a DOM event to be listened to and so is fired by JS Window Actor code platform code.
    if (type == "DOMWindowCreated") {
      this.instantiate();
    }
  }

  didDestroy() {
    for (const [, connectionInfo] of this._connections) {
      connectionInfo.connection.close();
    }
    this._connections.clear();
    if (this.useCustomLoader) {
      this.loader.destroy();
    }
  }
}
