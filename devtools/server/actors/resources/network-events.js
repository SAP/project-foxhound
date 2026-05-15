/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { Pool } = require("resource://devtools/shared/protocol/Pool.js");
const { ParentProcessWatcherRegistry } = ChromeUtils.importESModule(
  "resource://devtools/server/actors/watcher/ParentProcessWatcherRegistry.sys.mjs",
  // ParentProcessWatcherRegistry needs to be a true singleton and loads ActorManagerParent
  // which also has to be a true singleton.
  { global: "shared" }
);
const Targets = require("resource://devtools/server/actors/targets/index.js");

const lazy = {};

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs",
  { global: "contextual" }
);
XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "responseBodyLimit",
  "devtools.netmonitor.responseBodyLimit",
  0
);

ChromeUtils.defineESModuleGetters(
  lazy,
  {
    NetworkObserver:
      "resource://devtools/shared/network-observer/NetworkObserver.sys.mjs",
    NetworkUtils:
      "resource://devtools/shared/network-observer/NetworkUtils.sys.mjs",
  },
  { global: "contextual" }
);

loader.lazyRequireGetter(
  this,
  "NetworkEventActor",
  "resource://devtools/server/actors/network-monitor/network-event-actor.js",
  true
);

/**
 * Handles network events from the parent process
 */
class NetworkEventWatcher {
  /**
   * Start watching for all network events related to a given Watcher Actor.
   *
   * @param WatcherActor watcherActor
   *        The watcher actor in the parent process from which we should
   *        observe network events.
   * @param Object options
   *        Dictionary object with following attributes:
   *        - onAvailable: mandatory function
   *          This will be called for each resource.
   *        - onUpdated: optional function
   *          This would be called multiple times for each resource.
   */
  async watch(watcherActor, { onAvailable, onUpdated }) {
    this.networkEvents = new Map();

    this.watcherActor = watcherActor;
    this.onNetworkEventAvailable = onAvailable;
    this.onNetworkEventUpdated = onUpdated;
    // Boolean to know if we keep previous document network events or not.
    this.persist = false;
    this.listener = new lazy.NetworkObserver({
      decodeResponseBodies: true,
      responseBodyLimit: lazy.responseBodyLimit,
      ignoreChannelFunction: this.shouldIgnoreChannel.bind(this),
      onNetworkEvent: this.onNetworkEvent.bind(this),
    });

    this.watcherActor.on(
      "top-browsing-context-will-navigate",
      this.#onTopBrowsingContextWillNavigate
    );
  }

  /**
   * Clear all the network events and the related actors.
   *
   * This is called on actor destroy, but also from WatcherActor.clearResources(NETWORK_EVENT)
   */
  clear() {
    this.networkEvents.clear();
    this.listener.clear();
    if (this._pool) {
      this._pool.destroy();
      this._pool = null;
    }
  }

  /**
   * A protocol.js Pool to store all NetworkEventActor's which may be destroyed on navigations.
   */
  get pool() {
    if (this._pool) {
      return this._pool;
    }
    this._pool = new Pool(this.watcherActor.conn, "network-events");
    this.watcherActor.manage(this._pool);
    return this._pool;
  }

  /**
   * Instruct to keep reference to previous document requests or not.
   * If persist is disabled, we will clear all informations about previous document
   * on each navigation.
   * If persist is enabled, we will keep all informations for all documents, leading
   * to lots of allocations!
   *
   * @param {boolean} enabled
   */
  setPersist(enabled) {
    this.persist = enabled;
  }

  /**
   * Gets the throttle settings
   *
   * @return {*} data
   */
  getThrottleData() {
    return this.listener.getThrottleData();
  }

  /**
   * Sets the throttle data
   *
   * @param {*} data
   */
  setThrottleData(data) {
    this.listener.setThrottleData(data);
  }

  /**
   * Instruct to save or ignore request and response bodies
   *
   * @param {boolean} save
   */
  setSaveRequestAndResponseBodies(save) {
    this.listener.setSaveRequestAndResponseBodies(save);
  }

  /**
   * Block requests based on the filters
   *
   * @param {object} filters
   */
  blockRequest(filters) {
    this.listener.blockRequest(filters);
  }

  /**
   * Unblock requests based on the fitlers
   *
   * @param {object} filters
   */
  unblockRequest(filters) {
    this.listener.unblockRequest(filters);
  }

  /**
   * Calls the listener to set blocked urls
   *
   * @param {Array} urls
   *        The urls to block
   */

  setBlockedUrls(urls) {
    this.listener.setBlockedUrls(urls);
  }

  /**
   * Calls the listener to get the blocked urls
   *
   * @return {Array} urls
   *          The blocked urls
   */

  getBlockedUrls() {
    return this.listener.getBlockedUrls();
  }

  override(url, path) {
    this.listener.override(url, path);
  }

  removeOverride(url) {
    this.listener.removeOverride(url);
  }

  /**
   * Watch for previous document being unloaded in order to clear
   * all related network events, in case persist is disabled.
   * (which is the default behavior)
   *
   * This "will-navigate" event should only be fired when debugging tabs
   * (not for web extensions or browser toolbox).
   */
  #onTopBrowsingContextWillNavigate = () => {
    // If we persist, we will keep all requests allocated.
    if (this.persist) {
      return;
    }

    const { innerWindowId } =
      this.watcherActor.browserElement.browsingContext.currentWindowGlobal;

    // When a navigation starts, destroy all network request actors as the UI should not longer show them.
    // We can easily destroy all requests which aren't navigation request.
    // But navigation requests should be preserved as they started just before the navigation
    // (and the will-navigate" event fired).
    // The current WindowGloball is still for the document we navigate **from**,
    // so destroy navigation requests from iframes or the WindowGlobal from the previous navigation
    // with the `innerWindowId` comparison.
    for (const child of this.pool.poolChildren()) {
      if (
        !child.isNavigationRequest() ||
        (child.getInnerWindowId() && child.getInnerWindowId() != innerWindowId)
      ) {
        child.destroy();
      }
    }
  };

  /**
   * Called by NetworkObserver in order to know if the channel should be ignored
   */
  shouldIgnoreChannel(channel) {
    // First of all, check if the channel matches the watcherActor's session.
    const filters = { sessionContext: this.watcherActor.sessionContext };
    if (!lazy.NetworkUtils.matchRequest(channel, filters)) {
      return true;
    }

    // When we are in the browser toolbox in parent process scope,
    // the session context is still "all", but we are no longer watching frame and process targets.
    // In this case, we should ignore all requests belonging to a BrowsingContext that isn't in the parent process
    // (i.e. the process where this Watcher runs)
    const isParentProcessOnlyBrowserToolbox =
      this.watcherActor.sessionContext.type == "all" &&
      !ParentProcessWatcherRegistry.isWatchingTargets(
        this.watcherActor,
        Targets.TYPES.FRAME
      );
    if (isParentProcessOnlyBrowserToolbox) {
      // We should ignore all requests coming from BrowsingContext running in another process
      const browsingContextID =
        lazy.NetworkUtils.getChannelBrowsingContextID(channel);
      const browsingContext = BrowsingContext.get(browsingContextID);
      // We accept any request that isn't bound to any BrowsingContext.
      // This is most likely a privileged request done from a JSM/C++.
      // `isInProcess` will be true, when the document executes in the parent process.
      //
      // Note that we will still accept all requests that aren't bound to any BrowsingContext
      // See browser_resources_network_events_parent_process.js test with privileged request
      // made from the content processes.
      // We miss some attribute on channel/loadInfo to know that it comes from the content process.
      if (browsingContext?.currentWindowGlobal.isInProcess === false) {
        return true;
      }
    }
    return false;
  }

  onNetworkEvent(networkEventOptions, channel) {
    if (channel.channelId && this.networkEvents.has(channel.channelId)) {
      throw new Error(
        `Got notified about channel ${channel.channelId} more than once.`
      );
    }

    const actor = new NetworkEventActor(
      this.watcherActor.conn,
      this.watcherActor.sessionContext,
      {
        onNetworkEventUpdate: this.onNetworkEventUpdate.bind(this),
        onNetworkEventDestroy: this.onNetworkEventDestroy.bind(this),
      },
      networkEventOptions,
      channel
    );
    this.pool.manage(actor);

    const resource = actor.asResource();
    const isBlocked = !!resource.blockedReason;
    const networkEvent = {
      browsingContextID: resource.browsingContextID,
      innerWindowId: resource.innerWindowId,
      resourceId: resource.resourceId,
      isBlocked,
      receivedUpdates: [],
      resourceUpdates: {},
    };

    // Requests already come with request cookies and headers, so those
    // should always be considered as available. But the client still
    // heavily relies on those `Available` flags to fetch additional data,
    // so it is better to keep them for consistency.

    // Set the flags on the resource so that the front-end can fetch
    // and display request headers and cookies details asap.
    lazy.NetworkUtils.setEventAsAvailable(resource, [
      lazy.NetworkUtils.NETWORK_EVENT_TYPES.REQUEST_COOKIES,
      lazy.NetworkUtils.NETWORK_EVENT_TYPES.REQUEST_HEADERS,
    ]);

    this.networkEvents.set(resource.resourceId, networkEvent);

    this.onNetworkEventAvailable([resource]);

    // Blocked requests will not receive further updates and should emit an
    // update packet immediately.
    // The frontend expects to receive a dedicated update to consider the
    // request as completed. TODO: lift this restriction so that we can only
    // emit a resource available notification if no update is needed.
    if (isBlocked) {
      lazy.NetworkUtils.setEventAsAvailable(networkEvent.resourceUpdates, [
        lazy.NetworkUtils.NETWORK_EVENT_TYPES.RESPONSE_END,
      ]);
      this._emitUpdate(networkEvent);
    }

    return actor;
  }

  onNetworkEventUpdate(updateResource) {
    const networkEvent = this.networkEvents.get(updateResource.resourceId);

    if (!networkEvent) {
      return;
    }
    const { NETWORK_EVENT_TYPES } = lazy.NetworkUtils;
    const { resourceUpdates, receivedUpdates } = networkEvent;

    const networkEventTypes = [
      NETWORK_EVENT_TYPES.RESPONSE_COOKIES,
      NETWORK_EVENT_TYPES.RESPONSE_HEADERS,
    ];

    switch (updateResource.updateType) {
      case NETWORK_EVENT_TYPES.CACHE_DETAILS:
        resourceUpdates.fromCache = updateResource.fromCache;
        resourceUpdates.fromServiceWorker = updateResource.fromServiceWorker;
        break;
      case NETWORK_EVENT_TYPES.RESPONSE_START:
        resourceUpdates.httpVersion = updateResource.httpVersion;
        resourceUpdates.status = updateResource.status;
        resourceUpdates.statusText = updateResource.statusText;
        resourceUpdates.earlyHintsStatus = updateResource.earlyHintsStatus;
        resourceUpdates.remoteAddress = updateResource.remoteAddress;
        resourceUpdates.remotePort = updateResource.remotePort;
        // The mimetype is only set when then the contentType is available
        // in the _onResponseHeader and not for cached/service worker requests
        // in _httpResponseExaminer.
        resourceUpdates.mimeType = updateResource.mimeType;
        resourceUpdates.waitingTime = updateResource.waitingTime;
        resourceUpdates.isResolvedByTRR = updateResource.isResolvedByTRR;
        resourceUpdates.proxyHttpVersion = updateResource.proxyHttpVersion;
        resourceUpdates.proxyStatus = updateResource.proxyStatus;
        resourceUpdates.proxyStatusText = updateResource.proxyStatusText;
        resourceUpdates.isRedirect = updateResource.isRedirect;

        if (resourceUpdates.earlyHintsStatus.length) {
          networkEventTypes.push(
            NETWORK_EVENT_TYPES.EARLY_HINT_RESPONSE_HEADERS
          );
        }

        lazy.NetworkUtils.setEventAsAvailable(
          resourceUpdates,
          networkEventTypes
        );

        break;
      case NETWORK_EVENT_TYPES.RESPONSE_CONTENT:
        resourceUpdates.contentSize = updateResource.contentSize;
        resourceUpdates.transferredSize = updateResource.transferredSize;
        resourceUpdates.mimeType = updateResource.mimeType;
        break;
      case NETWORK_EVENT_TYPES.RESPONSE_CONTENT_COMPLETE:
        resourceUpdates.extension = updateResource.extension;
        resourceUpdates.blockedReason = updateResource.blockedReason;
        break;
      case NETWORK_EVENT_TYPES.EVENT_TIMINGS:
        resourceUpdates.totalTime = updateResource.totalTime;
        break;
      case NETWORK_EVENT_TYPES.SECURITY_INFO:
        resourceUpdates.securityState = updateResource.state;
        resourceUpdates.isRacing = updateResource.isRacing;
        break;
    }

    lazy.NetworkUtils.setEventAsAvailable(resourceUpdates, [
      updateResource.updateType,
    ]);

    receivedUpdates.push(updateResource.updateType);

    const isResponseComplete =
      receivedUpdates.includes(NETWORK_EVENT_TYPES.EVENT_TIMINGS) &&
      receivedUpdates.includes(NETWORK_EVENT_TYPES.RESPONSE_CONTENT_COMPLETE) &&
      receivedUpdates.includes(NETWORK_EVENT_TYPES.SECURITY_INFO);

    if (isResponseComplete) {
      // Lets add an event to clearly define the last update expected to be
      // emitted. There will be no more updates after this.
      lazy.NetworkUtils.setEventAsAvailable(resourceUpdates, [
        lazy.NetworkUtils.NETWORK_EVENT_TYPES.RESPONSE_END,
      ]);
    }

    if (
      updateResource.updateType == NETWORK_EVENT_TYPES.RESPONSE_START ||
      updateResource.updateType == NETWORK_EVENT_TYPES.RESPONSE_CONTENT ||
      isResponseComplete
    ) {
      this._emitUpdate(networkEvent);
      // clean up already sent updates
      networkEvent.resourceUpdates = {};
    }
  }

  _emitUpdate(networkEvent) {
    this.onNetworkEventUpdated([
      {
        resourceId: networkEvent.resourceId,
        resourceUpdates: networkEvent.resourceUpdates,
        browsingContextID: networkEvent.browsingContextID,
        innerWindowId: networkEvent.innerWindowId,
      },
    ]);
  }

  onNetworkEventDestroy(channelId) {
    if (this.networkEvents.has(channelId)) {
      this.networkEvents.delete(channelId);
    }
  }

  /**
   * Stop watching for network event related to a given Watcher Actor.
   */
  destroy() {
    if (this.listener) {
      this.clear();
      this.listener.destroy();
      this.watcherActor.off(
        "top-browsing-context-will-navigate",
        this.#onTopBrowsingContextWillNavigate
      );
    }
  }
}

module.exports = NetworkEventWatcher;
