/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * NetworkObserver is the main class in DevTools to observe network requests
 * out of many events fired by the platform code.
 */

// Enable logging all platform events this module listen to
const DEBUG_PLATFORM_EVENTS = false;

const lazy = {};

import { DevToolsInfaillibleUtils } from "resource://devtools/shared/DevToolsInfaillibleUtils.sys.mjs";

ChromeUtils.defineESModuleGetters(lazy, {
  ChannelMap: "resource://devtools/shared/network-observer/ChannelMap.sys.mjs",
  NetworkHelper:
    "resource://devtools/shared/network-observer/NetworkHelper.sys.mjs",
  NetworkResponseListener:
    "resource://devtools/shared/network-observer/NetworkResponseListener.sys.mjs",
  NetworkThrottleManager:
    "resource://devtools/shared/network-observer/NetworkThrottleManager.sys.mjs",
  NetworkUtils:
    "resource://devtools/shared/network-observer/NetworkUtils.sys.mjs",
  wildcardToRegExp:
    "resource://devtools/shared/network-observer/WildcardToRegexp.sys.mjs",
});

const gActivityDistributor = Cc[
  "@mozilla.org/network/http-activity-distributor;1"
].getService(Ci.nsIHttpActivityDistributor);

function logPlatformEvent(eventName, channel, message = "") {
  if (!DEBUG_PLATFORM_EVENTS) {
    return;
  }
  dump(`[netmonitor] ${channel.channelId} - ${eventName} ${message}\n`);
}

// The maximum uint32 value.
const PR_UINT32_MAX = 4294967295;

// HTTP status codes.
const HTTP_MOVED_PERMANENTLY = 301;
const HTTP_FOUND = 302;
const HTTP_SEE_OTHER = 303;
const HTTP_TEMPORARY_REDIRECT = 307;

const HTTP_TRANSACTION_CODES = {
  0x5001: "REQUEST_HEADER",
  0x5002: "REQUEST_BODY_SENT",
  0x5003: "RESPONSE_START",
  0x5004: "RESPONSE_HEADER",
  0x5005: "RESPONSE_COMPLETE",
  0x5006: "TRANSACTION_CLOSE",

  0x804b0003: "STATUS_RESOLVING",
  0x804b000b: "STATUS_RESOLVED",
  0x804b0007: "STATUS_CONNECTING_TO",
  0x804b0004: "STATUS_CONNECTED_TO",
  0x804b0005: "STATUS_SENDING_TO",
  0x804b000a: "STATUS_WAITING_FOR",
  0x804b0006: "STATUS_RECEIVING_FROM",
  0x804b000c: "STATUS_TLS_STARTING",
  0x804b000d: "STATUS_TLS_ENDING",
};

const HTTP_DOWNLOAD_ACTIVITIES = [
  gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_START,
  gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_HEADER,
  gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_COMPLETE,
  gActivityDistributor.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE,
];

/**
 * The network monitor uses the nsIHttpActivityDistributor to monitor network
 * requests. The nsIObserverService is also used for monitoring
 * http-on-examine-response notifications. All network request information is
 * routed to the remote Web Console.
 *
 * @constructor
 * @param {Object} options
 * @param {Function(nsIChannel): boolean} options.ignoreChannelFunction
 *        This function will be called for every detected channel to decide if it
 *        should be monitored or not.
 * @param {Function(NetworkEvent): owner} options.onNetworkEvent
 *        This method is invoked once for every new network request with two
 *        arguments:
 *        - {Object} networkEvent: object created by NetworkUtils:createNetworkEvent,
 *          containing initial network request information as an argument.
 *        - {nsIChannel} channel: the channel for which the request was detected
 *
 *        `onNetworkEvent()` must return an "owner" object which holds several add*()
 *        methods which are used to add further network request/response information.
 */
export class NetworkObserver {
  /**
   * Map of URL patterns to RegExp
   *
   * @type {Map}
   */
  #blockedURLs = new Map();
  /**
   * Used by NetworkHelper.parseSecurityInfo to skip decoding known certificates.
   *
   * @type {Map}
   */
  #decodedCertificateCache = new Map();
  /**
   * See constructor argument of the same name.
   *
   * @type {Function}
   */
  #ignoreChannelFunction;
  /**
   * Used to store channels intercepted for service-worker requests.
   *
   * @type {WeakSet}
   */
  #interceptedChannels = new WeakSet();
  /**
   * Explicit flag to check if this observer was already destroyed.
   *
   * @type {boolean}
   */
  #isDestroyed = false;
  /**
   * See constructor argument of the same name.
   *
   * @type {Function}
   */
  #onNetworkEvent;
  /**
   * Object that holds the HTTP activity objects for ongoing requests.
   *
   * @type {ChannelMap}
   */
  #openRequests = new lazy.ChannelMap();
  /**
   * Network response bodies are piped through a buffer of the given size
   * (in bytes).
   *
   * @type {Number}
   */
  #responsePipeSegmentSize = Services.prefs.getIntPref(
    "network.buffer.cache.size"
  );
  /**
   * Whether to save the bodies of network requests and responses.
   *
   * @type {boolean}
   */
  #saveRequestAndResponseBodies = true;
  /**
   * Throttling configuration, see constructor of NetworkThrottleManager
   *
   * @type {Object}
   */
  #throttleData = null;
  /**
   * NetworkThrottleManager instance, created when a valid throttleData is set.
   * @type {NetworkThrottleManager}
   */
  #throttler = null;

  constructor(options = {}) {
    const { ignoreChannelFunction, onNetworkEvent } = options;
    if (typeof ignoreChannelFunction !== "function") {
      throw new Error(
        `Expected "ignoreChannelFunction" to be a function, got ${ignoreChannelFunction} (${typeof ignoreChannelFunction})`
      );
    }

    if (typeof onNetworkEvent !== "function") {
      throw new Error(
        `Expected "onNetworkEvent" to be a function, got ${onNetworkEvent} (${typeof onNetworkEvent})`
      );
    }

    this.#ignoreChannelFunction = ignoreChannelFunction;
    this.#onNetworkEvent = onNetworkEvent;

    // Start all platform observers.
    if (Services.appinfo.processType != Ci.nsIXULRuntime.PROCESS_TYPE_CONTENT) {
      gActivityDistributor.addObserver(this);
      Services.obs.addObserver(
        this.#httpResponseExaminer,
        "http-on-examine-response"
      );
      Services.obs.addObserver(
        this.#httpResponseExaminer,
        "http-on-examine-cached-response"
      );
      Services.obs.addObserver(
        this.#httpModifyExaminer,
        "http-on-modify-request"
      );
      Services.obs.addObserver(this.#httpStopRequest, "http-on-stop-request");
    } else {
      Services.obs.addObserver(
        this.#httpFailedOpening,
        "http-on-failed-opening-request"
      );
    }
    // In child processes, only watch for service worker requests
    // everything else only happens in the parent process
    Services.obs.addObserver(
      this.#serviceWorkerRequest,
      "service-worker-synthesized-response"
    );
  }

  setSaveRequestAndResponseBodies(save) {
    this.#saveRequestAndResponseBodies = save;
  }

  getThrottleData() {
    return this.#throttleData;
  }

  setThrottleData(value) {
    this.#throttleData = value;
    // Clear out any existing throttlers
    this.#throttler = null;
  }

  #getThrottler() {
    if (this.#throttleData !== null && this.#throttler === null) {
      this.#throttler = new lazy.NetworkThrottleManager(this.#throttleData);
    }
    return this.#throttler;
  }

  #serviceWorkerRequest = DevToolsInfaillibleUtils.makeInfallible(
    (subject, topic, data) => {
      const channel = subject.QueryInterface(Ci.nsIHttpChannel);

      if (this.#ignoreChannelFunction(channel)) {
        return;
      }

      logPlatformEvent(topic, channel);

      this.#interceptedChannels.add(subject);

      // Service workers never fire http-on-examine-cached-response, so fake one.
      this.#httpResponseExaminer(channel, "http-on-examine-cached-response");
    }
  );

  /**
   * Observes for http-on-failed-opening-request notification to catch any
   * channels for which asyncOpen has synchronously failed.  This is the only
   * place to catch early security check failures.
   */
  #httpFailedOpening = DevToolsInfaillibleUtils.makeInfallible(
    (subject, topic) => {
      if (
        this.#isDestroyed ||
        topic != "http-on-failed-opening-request" ||
        !(subject instanceof Ci.nsIHttpChannel)
      ) {
        return;
      }

      const channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (this.#ignoreChannelFunction(channel)) {
        return;
      }

      logPlatformEvent(topic, channel);

      // Ignore preload requests to avoid duplicity request entries in
      // the Network panel. If a preload fails (for whatever reason)
      // then the platform kicks off another 'real' request.
      if (lazy.NetworkUtils.isPreloadRequest(channel)) {
        return;
      }

      this.#httpResponseExaminer(subject, topic);
    }
  );

  #httpStopRequest = DevToolsInfaillibleUtils.makeInfallible(
    (subject, topic) => {
      if (
        this.#isDestroyed ||
        topic != "http-on-stop-request" ||
        !(subject instanceof Ci.nsIHttpChannel)
      ) {
        return;
      }

      const channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (this.#ignoreChannelFunction(channel)) {
        return;
      }

      logPlatformEvent(topic, channel);

      const httpActivity = this.#createOrGetActivityObject(channel);
      const serverTimings = this.#extractServerTimings(channel);

      if (httpActivity.owner) {
        // Try extracting server timings. Note that they will be sent to the client
        // in the `_onTransactionClose` method together with network event timings.
        httpActivity.owner.addServerTimings(serverTimings);

        // If the owner isn't set we need to create the network event and send
        // it to the client. This happens in case where:
        // - the request has been blocked (e.g. CORS) and "http-on-stop-request" is the first notification.
        // - the NetworkObserver is start *after* the request started and we only receive the http-stop notification,
        //   but that doesn't mean the request is blocked, so check for its status.
      } else if (Components.isSuccessCode(channel.status)) {
        // Do not pass any blocked reason, as this request is just fine.
        // Bug 1489217 - Prevent watching for this request response content,
        // as this request is already running, this is too late to watch for it.
        this.#createNetworkEvent(subject, { inProgressRequest: true });
      } else {
        // Handles any early blockings e.g by Web Extensions or by CORS
        const {
          blockingExtension,
          blockedReason,
        } = lazy.NetworkUtils.getBlockedReason(channel);
        this.#createNetworkEvent(subject, { blockedReason, blockingExtension });
      }
    }
  );

  /**
   * Observe notifications for the http-on-examine-response topic, coming from
   * the nsIObserverService.
   *
   * @private
   * @param nsIHttpChannel subject
   * @param string topic
   * @returns void
   */
  #httpResponseExaminer = DevToolsInfaillibleUtils.makeInfallible(
    (subject, topic) => {
      // The httpResponseExaminer is used to retrieve the uncached response
      // headers.
      if (
        this.#isDestroyed ||
        (topic != "http-on-examine-response" &&
          topic != "http-on-examine-cached-response" &&
          topic != "http-on-failed-opening-request") ||
        !(subject instanceof Ci.nsIHttpChannel) ||
        !(subject instanceof Ci.nsIClassifiedChannel)
      ) {
        return;
      }

      const blockedOrFailed = topic === "http-on-failed-opening-request";

      subject.QueryInterface(Ci.nsIClassifiedChannel);
      const channel = subject.QueryInterface(Ci.nsIHttpChannel);

      if (this.#ignoreChannelFunction(channel)) {
        return;
      }

      logPlatformEvent(
        topic,
        subject,
        blockedOrFailed
          ? "blockedOrFailed:" + channel.loadInfo.requestBlockingReason
          : channel.responseStatus
      );

      // Read response headers and cookies.
      const responseHeaders = [];
      const responseCookies = [];
      if (!blockedOrFailed) {
        const setCookieHeaders = [];
        channel.visitOriginalResponseHeaders({
          visitHeader(name, value) {
            const lowerName = name.toLowerCase();
            if (lowerName == "set-cookie") {
              setCookieHeaders.push(value);
            }
            responseHeaders.push({ name, value });
          },
        });

        if (!responseHeaders.length) {
          // No need to continue.
          return;
        }

        setCookieHeaders.forEach(header => {
          const cookies = lazy.NetworkHelper.parseSetCookieHeader(header);
          responseCookies.push(...cookies);
        });
      }

      channel.QueryInterface(Ci.nsIHttpChannelInternal);

      let httpVersion, status, statusText;
      if (!blockedOrFailed) {
        const httpVersionMaj = {};
        const httpVersionMin = {};

        channel.getResponseVersion(httpVersionMaj, httpVersionMin);
        if (httpVersionMaj.value > 1) {
          httpVersion = "HTTP/" + httpVersionMaj.value;
        } else {
          httpVersion =
            "HTTP/" + httpVersionMaj.value + "." + httpVersionMin.value;
        }

        status = channel.responseStatus;
        statusText = channel.responseStatusText;
      }

      let httpActivity = this.#createOrGetActivityObject(channel);
      if (topic === "http-on-examine-cached-response") {
        // Service worker requests emits cached-response notification on non-e10s,
        // and we fake one on e10s.
        const fromServiceWorker = this.#interceptedChannels.has(channel);
        this.#interceptedChannels.delete(channel);

        // If this is a cached response (which are also emitted by service worker requests),
        // there never was a request event so we need to construct one here
        // so the frontend gets all the expected events.
        if (!httpActivity.owner) {
          httpActivity = this.#createNetworkEvent(channel, {
            fromCache: !fromServiceWorker,
            fromServiceWorker,
          });
        }

        // We need to send the request body to the frontend for
        // the faked (cached/service worker request) event.
        this.#onRequestBodySent(httpActivity);
        this.#sendRequestBody(httpActivity);

        httpActivity.owner.addResponseStart(
          {
            httpVersion,
            protocol: this.#getProtocol(httpActivity),
            fromCache: this.#isFromCache(httpActivity),
            remoteAddress: "",
            remotePort: "",
            status,
            statusText,
            bodySize: 0,
            headersSize: 0,
            waitingTime: 0,
          },
          "",
          true
        );

        // There also is never any timing events, so we can fire this
        // event with zeroed out values.
        const timings = this.#setupHarTimings(httpActivity, true);

        const serverTimings = this.#extractServerTimings(httpActivity.channel);
        httpActivity.owner.addEventTimings(
          timings.total,
          timings.timings,
          timings.offsets,
          serverTimings
        );
      } else if (topic === "http-on-failed-opening-request") {
        const { blockedReason } = lazy.NetworkUtils.getBlockedReason(channel);
        this.#createNetworkEvent(channel, { blockedReason });
      }

      if (httpActivity.owner) {
        httpActivity.owner.addResponseHeaders(responseHeaders);
        httpActivity.owner.addResponseCookies(responseCookies);
      }
    }
  );

  /**
   * Observe notifications for the http-on-modify-request topic, coming from
   * the nsIObserverService.
   *
   * @private
   * @param nsIHttpChannel aSubject
   * @returns void
   */
  #httpModifyExaminer = DevToolsInfaillibleUtils.makeInfallible(subject => {
    const throttler = this.#getThrottler();
    if (throttler) {
      const channel = subject.QueryInterface(Ci.nsIHttpChannel);
      if (this.#ignoreChannelFunction(channel)) {
        return;
      }
      logPlatformEvent("http-on-modify-request", channel);

      // Read any request body here, before it is throttled.
      const httpActivity = this.#createOrGetActivityObject(channel);
      this.#onRequestBodySent(httpActivity);
      throttler.manageUpload(channel);
    }
  });

  /**
   * A helper function for observeActivity.  This does whatever work
   * is required by a particular http activity event.  Arguments are
   * the same as for observeActivity.
   */
  #dispatchActivity(
    httpActivity,
    channel,
    activityType,
    activitySubtype,
    timestamp,
    extraSizeData,
    extraStringData
  ) {
    // Store the time information for this activity subtype.
    if (activitySubtype in HTTP_TRANSACTION_CODES) {
      const stage = HTTP_TRANSACTION_CODES[activitySubtype];
      if (stage in httpActivity.timings) {
        httpActivity.timings[stage].last = timestamp;
      } else {
        httpActivity.timings[stage] = {
          first: timestamp,
          last: timestamp,
        };
      }
    }

    switch (activitySubtype) {
      case gActivityDistributor.ACTIVITY_SUBTYPE_REQUEST_BODY_SENT:
        this.#onRequestBodySent(httpActivity);
        this.#sendRequestBody(httpActivity);
        break;
      case gActivityDistributor.ACTIVITY_SUBTYPE_RESPONSE_HEADER:
        this.#onResponseHeader(httpActivity, extraStringData);
        break;
      case gActivityDistributor.ACTIVITY_SUBTYPE_TRANSACTION_CLOSE:
        this.#onTransactionClose(httpActivity);
        break;
      default:
        break;
    }
  }

  getActivityTypeString(activityType, activitySubtype) {
    if (
      activityType === Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_SOCKET_TRANSPORT
    ) {
      for (const name in Ci.nsISocketTransport) {
        if (Ci.nsISocketTransport[name] === activitySubtype) {
          return "SOCKET_TRANSPORT:" + name;
        }
      }
    } else if (
      activityType === Ci.nsIHttpActivityObserver.ACTIVITY_TYPE_HTTP_TRANSACTION
    ) {
      for (const name in Ci.nsIHttpActivityObserver) {
        if (Ci.nsIHttpActivityObserver[name] === activitySubtype) {
          return "HTTP_TRANSACTION:" + name.replace("ACTIVITY_SUBTYPE_", "");
        }
      }
    }
    return "unexpected-activity-types:" + activityType + ":" + activitySubtype;
  }

  /**
   * Begin observing HTTP traffic that originates inside the current tab.
   *
   * @see https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIHttpActivityObserver
   *
   * @param nsIHttpChannel channel
   * @param number activityType
   * @param number activitySubtype
   * @param number timestamp
   * @param number extraSizeData
   * @param string extraStringData
   */
  observeActivity = DevToolsInfaillibleUtils.makeInfallible(function(
    channel,
    activityType,
    activitySubtype,
    timestamp,
    extraSizeData,
    extraStringData
  ) {
    if (
      this.#isDestroyed ||
      (activityType != gActivityDistributor.ACTIVITY_TYPE_HTTP_TRANSACTION &&
        activityType != gActivityDistributor.ACTIVITY_TYPE_SOCKET_TRANSPORT)
    ) {
      return;
    }

    if (
      !(channel instanceof Ci.nsIHttpChannel) ||
      !(channel instanceof Ci.nsIClassifiedChannel)
    ) {
      return;
    }

    channel = channel.QueryInterface(Ci.nsIHttpChannel);
    channel = channel.QueryInterface(Ci.nsIClassifiedChannel);

    if (DEBUG_PLATFORM_EVENTS) {
      logPlatformEvent(
        this.getActivityTypeString(activityType, activitySubtype),
        channel
      );
    }

    if (
      activitySubtype == gActivityDistributor.ACTIVITY_SUBTYPE_REQUEST_HEADER
    ) {
      this.#onRequestHeader(channel, timestamp, extraStringData);
      return;
    }

    // Iterate over all currently ongoing requests. If channel can't
    // be found within them, then exit this function.
    const httpActivity = this.#findActivityObject(channel);
    if (!httpActivity) {
      return;
    }

    // If we're throttling, we must not report events as they arrive
    // from platform, but instead let the throttler emit the events
    // after some time has elapsed.
    if (
      httpActivity.downloadThrottle &&
      HTTP_DOWNLOAD_ACTIVITIES.includes(activitySubtype)
    ) {
      const callback = this.#dispatchActivity.bind(this);
      httpActivity.downloadThrottle.addActivityCallback(
        callback,
        httpActivity,
        channel,
        activityType,
        activitySubtype,
        timestamp,
        extraSizeData,
        extraStringData
      );
    } else {
      this.#dispatchActivity(
        httpActivity,
        channel,
        activityType,
        activitySubtype,
        timestamp,
        extraSizeData,
        extraStringData
      );
    }
  });

  /**
   * Craft the "event" object passed to the Watcher class in order
   * to instantiate the NetworkEventActor.
   *
   * /!\ This method does many other important things:
   * - Cancel requests blocked by DevTools
   * - Fetch request headers/cookies
   * - Set a few attributes on http activity object
   * - Register listener to record response content
   */
  #createNetworkEvent(
    channel,
    {
      timestamp,
      extraStringData,
      fromCache,
      fromServiceWorker,
      blockedReason,
      blockingExtension,
      inProgressRequest,
    }
  ) {
    const httpActivity = this.#createOrGetActivityObject(channel);

    if (timestamp) {
      httpActivity.timings.REQUEST_HEADER = {
        first: timestamp,
        last: timestamp,
      };
    }

    // Check the request URL with ones manually blocked by the user in DevTools.
    // If it's meant to be blocked, we cancel the request and annotate the event.
    if (blockedReason === undefined && this.#shouldBlockChannel(channel)) {
      channel.cancel(Cr.NS_BINDING_ABORTED);
      blockedReason = "devtools";
    }

    const event = lazy.NetworkUtils.createNetworkEvent(channel, {
      timestamp,
      fromCache,
      fromServiceWorker,
      extraStringData,
      blockedReason,
      blockingExtension,
      saveRequestAndResponseBodies: this.#saveRequestAndResponseBodies,
    });

    httpActivity.isXHR = event.isXHR;
    httpActivity.private = event.private;
    httpActivity.fromServiceWorker = fromServiceWorker;
    httpActivity.owner = this.#onNetworkEvent(event, channel);

    // Bug 1489217 - Avoid watching for response content for blocked or in-progress requests
    // as it can't be observed and would throw if we try.
    const recordRequestContent = !event.blockedReason && !inProgressRequest;
    if (recordRequestContent) {
      this.#setupResponseListener(httpActivity, fromCache);
    }

    const {
      cookies,
      headers,
    } = lazy.NetworkUtils.fetchRequestHeadersAndCookies(channel);

    httpActivity.owner.addRequestHeaders(headers, extraStringData);
    httpActivity.owner.addRequestCookies(cookies);

    return httpActivity;
  }

  /**
   * Handler for ACTIVITY_SUBTYPE_REQUEST_HEADER. When a request starts the
   * headers are sent to the server. This method creates the |httpActivity|
   * object where we store the request and response information that is
   * collected through its lifetime.
   *
   * @private
   * @param nsIHttpChannel channel
   * @param number timestamp
   * @param string extraStringData
   * @return void
   */
  #onRequestHeader(channel, timestamp, extraStringData) {
    if (this.#ignoreChannelFunction(channel)) {
      return;
    }

    this.#createNetworkEvent(channel, {
      timestamp,
      extraStringData,
    });
  }

  /**
   * Check if the provided channel should be blocked given the current
   * blocked URLs configured for this network observer.
   */
  #shouldBlockChannel(channel) {
    for (const regexp of this.#blockedURLs.values()) {
      if (regexp.test(channel.URI.spec)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Find an HTTP activity object for the channel.
   *
   * @param nsIHttpChannel channel
   *        The HTTP channel whose activity object we want to find.
   * @return object
   *        The HTTP activity object, or null if it is not found.
   */
  #findActivityObject(channel) {
    return this.#openRequests.get(channel);
  }

  /**
   * Find an existing HTTP activity object, or create a new one. This
   * object is used for storing all the request and response
   * information.
   *
   * This is a HAR-like object. Conformance to the spec is not guaranteed at
   * this point.
   *
   * @see http://www.softwareishard.com/blog/har-12-spec
   * @param nsIHttpChannel channel
   *        The HTTP channel for which the HTTP activity object is created.
   * @return object
   *         The new HTTP activity object.
   */
  #createOrGetActivityObject(channel) {
    let httpActivity = this.#findActivityObject(channel);
    if (!httpActivity) {
      const win = lazy.NetworkHelper.getWindowForRequest(channel);
      const charset = win ? win.document.characterSet : null;

      httpActivity = {
        id: gSequenceId(),
        // The nsIChannel for which this activity object was created.
        channel,
        // See #onRequestBodySent()
        charset,
        // The postData sent by this request.
        sentBody: null,
        // The URL for the current channel.
        url: channel.URI.spec,
        // The encoded response body size.
        bodySize: 0,
        // The response headers size.
        headersSize: 0,
        // needed for host specific security info
        hostname: channel.URI.host,
        discardRequestBody: !this.#saveRequestAndResponseBodies,
        discardResponseBody: !this.#saveRequestAndResponseBodies,
        // internal timing information, see observeActivity()
        timings: {},
        // see #onResponseHeader()
        responseStatus: null,
        // the activity owner which is notified when changes happen
        owner: null,
      };

      this.#openRequests.set(channel, httpActivity);
    }

    return httpActivity;
  }

  /**
   * Block a request based on certain filtering options.
   *
   * Currently, exact URL match or URL patterns are supported.
   */
  blockRequest(filter) {
    if (!filter || !filter.url) {
      // In the future, there may be other types of filters, such as domain.
      // For now, ignore anything other than URL.
      return;
    }

    this.#addBlockedUrl(filter.url);
  }

  /**
   * Unblock a request based on certain filtering options.
   *
   * Currently, exact URL match or URL patterns are supported.
   */
  unblockRequest(filter) {
    if (!filter || !filter.url) {
      // In the future, there may be other types of filters, such as domain.
      // For now, ignore anything other than URL.
      return;
    }

    this.#blockedURLs.delete(filter.url);
  }

  /**
   * Updates the list of blocked request strings
   *
   * This match will be a (String).includes match, not an exact URL match
   */
  setBlockedUrls(urls) {
    urls = urls || [];
    this.#blockedURLs = new Map();
    urls.forEach(url => this.#addBlockedUrl(url));
  }

  #addBlockedUrl(url) {
    this.#blockedURLs.set(url, lazy.wildcardToRegExp(url));
  }

  /**
   * Returns a list of blocked requests
   * Useful as blockedURLs is mutated by both console & netmonitor
   */
  getBlockedUrls() {
    return this.#blockedURLs.keys();
  }

  /**
   * Setup the network response listener for the given HTTP activity. The
   * NetworkResponseListener is responsible for storing the response body.
   *
   * @private
   * @param object httpActivity
   *        The HTTP activity object we are tracking.
   */
  #setupResponseListener(httpActivity, fromCache) {
    const channel = httpActivity.channel;
    channel.QueryInterface(Ci.nsITraceableChannel);

    if (!fromCache) {
      const throttler = this.#getThrottler();
      if (throttler) {
        httpActivity.downloadThrottle = throttler.manage(channel);
      }
    }

    // The response will be written into the outputStream of this pipe.
    // This allows us to buffer the data we are receiving and read it
    // asynchronously.
    // Both ends of the pipe must be blocking.
    const sink = Cc["@mozilla.org/pipe;1"].createInstance(Ci.nsIPipe);

    // The streams need to be blocking because this is required by the
    // stream tee.
    sink.init(false, false, this.#responsePipeSegmentSize, PR_UINT32_MAX, null);

    // Add listener for the response body.
    const newListener = new lazy.NetworkResponseListener(
      httpActivity,
      this.#decodedCertificateCache
    );

    // Remember the input stream, so it isn't released by GC.
    newListener.inputStream = sink.inputStream;
    newListener.sink = sink;

    const tee = Cc["@mozilla.org/network/stream-listener-tee;1"].createInstance(
      Ci.nsIStreamListenerTee
    );

    const originalListener = channel.setNewListener(tee);

    tee.init(originalListener, sink.outputStream, newListener);
  }

  /**
   * Handler for ACTIVITY_SUBTYPE_REQUEST_BODY_SENT. The request body is logged
   * here.
   *
   * @private
   * @param object httpActivity
   *        The HTTP activity object we are working with.
   */
  #onRequestBodySent(httpActivity) {
    // Return early if we don't need the request body, or if we've
    // already found it.
    if (httpActivity.discardRequestBody || httpActivity.sentBody !== null) {
      return;
    }

    let sentBody = lazy.NetworkHelper.readPostTextFromRequest(
      httpActivity.channel,
      httpActivity.charset
    );

    if (
      sentBody !== null &&
      this.window &&
      httpActivity.url == this.window.location.href
    ) {
      // If the request URL is the same as the current page URL, then
      // we can try to get the posted text from the page directly.
      // This check is necessary as otherwise the
      //   lazy.NetworkHelper.readPostTextFromPageViaWebNav()
      // function is called for image requests as well but these
      // are not web pages and as such don't store the posted text
      // in the cache of the webpage.
      const webNav = this.window.docShell.QueryInterface(Ci.nsIWebNavigation);
      sentBody = lazy.NetworkHelper.readPostTextFromPageViaWebNav(
        webNav,
        httpActivity.charset
      );
    }

    if (sentBody !== null) {
      httpActivity.sentBody = sentBody;
    }
  }

  /**
   * Handler for ACTIVITY_SUBTYPE_RESPONSE_HEADER. This method stores
   * information about the response headers.
   *
   * @private
   * @param object httpActivity
   *        The HTTP activity object we are working with.
   * @param string extraStringData
   *        The uncached response headers.
   */
  #onResponseHeader(httpActivity, extraStringData) {
    // extraStringData contains the uncached response headers. The first line
    // contains the response status (e.g. HTTP/1.1 200 OK).
    //
    // Note: The response header is not saved here. Calling the
    // channel.visitResponseHeaders() method at this point sometimes causes an
    // NS_ERROR_NOT_AVAILABLE exception.
    //
    // We could parse extraStringData to get the headers and their values, but
    // that is not trivial to do in an accurate manner. Hence, we save the
    // response headers in this.#httpResponseExaminer().

    // Extract the protocol (called httpVersion here), response's status and
    // statusText from the raw headers.
    const headers = extraStringData.split(/\r\n|\n|\r/);
    const statusLine = headers.shift();
    const statusLineArray = statusLine.split(" ");
    httpActivity.httpVersion = statusLineArray.shift();
    httpActivity.responseStatus = statusLineArray.shift();
    httpActivity.responseStatusText = statusLineArray.join(" ");
    httpActivity.headersSize = extraStringData.length;

    // Discard the response body for known response statuses.
    switch (parseInt(httpActivity.responseStatus, 10)) {
      case HTTP_MOVED_PERMANENTLY:
      case HTTP_FOUND:
      case HTTP_SEE_OTHER:
      case HTTP_TEMPORARY_REDIRECT:
        httpActivity.discardResponseBody = true;
        break;
    }

    // Build the response object
    const response = {};
    response.discardResponseBody = httpActivity.discardResponseBody;
    response.httpVersion = httpActivity.httpVersion;
    response.protocol = this.#getProtocol(httpActivity);
    response.fromCache = this.#isFromCache(httpActivity);
    response.remoteAddress = httpActivity.channel.remoteAddress;
    response.remotePort = httpActivity.channel.remotePort;
    response.status = httpActivity.responseStatus;
    response.statusText = httpActivity.responseStatusText;
    response.bodySize = httpActivity.bodySize;
    response.headersSize = httpActivity.headersSize;
    response.transferredSize = httpActivity.bodySize + httpActivity.headersSize;
    response.waitingTime = this.#convertTimeToMs(
      this.#getWaitTiming(httpActivity.timings)
    );

    // Mime type needs to be sent on response start for identifying an sse channel.
    const contentType = headers.find(header => {
      const lowerName = header.toLowerCase();
      return lowerName.startsWith("content-type");
    });

    if (contentType) {
      response.mimeType = contentType.slice("Content-Type: ".length);
    }

    httpActivity.owner.addResponseStart(response, extraStringData);
  }

  /**
   * Handler for ACTIVITY_SUBTYPE_TRANSACTION_CLOSE. This method updates the HAR
   * timing information on the HTTP activity object and clears the request
   * from the list of known open requests.
   *
   * @private
   * @param object httpActivity
   *        The HTTP activity object we work with.
   */
  #onTransactionClose(httpActivity) {
    if (httpActivity.owner) {
      const result = this.#setupHarTimings(httpActivity);
      const serverTimings = this.#extractServerTimings(httpActivity.channel);

      httpActivity.owner.addEventTimings(
        result.total,
        result.timings,
        result.offsets,
        serverTimings
      );
    }
  }

  /**
   * Get the protocol for the provided httpActivity. Either the ALPN negotiated
   * protocol or as a fallback a protocol computed from the scheme and the
   * response status.
   *
   * TODO: The `protocol` is similar to another response property called
   * `httpVersion`. `httpVersion` is uppercase and purely computed from the
   * response status, whereas `protocol` uses nsIHttpChannel.protocolVersion by
   * default and otherwise falls back on `httpVersion`. Ideally we should merge
   * the two properties.
   *
   * @param {Object} httpActivity
   *     The httpActivity object for which we need to get the protocol.
   *
   * @returns {string}
   *     The protocol as a string.
   */
  #getProtocol(httpActivity) {
    const { channel, httpVersion } = httpActivity;
    let protocol = "";
    try {
      const httpChannel = channel.QueryInterface(Ci.nsIHttpChannel);
      // protocolVersion corresponds to ALPN negotiated protocol.
      protocol = httpChannel.protocolVersion;
    } catch (e) {
      // Ignore errors reading protocolVersion.
    }

    if (["", "unknown"].includes(protocol)) {
      protocol = channel.URI.scheme;
      if (
        typeof httpVersion == "string" &&
        (protocol === "http" || protocol === "https")
      ) {
        protocol = httpVersion.toLowerCase();
      }
    }

    return protocol;
  }

  /**
   * Check if the channel data for the provided http activity is loaded from the
   * cache or not.
   *
   * @param {Object} httpActivity
   *     The httpActivity object for which we need to check the cache status.
   *
   * @returns {boolean}
   *     True if the channel data is loaded from the cache, false otherwise.
   */
  #isFromCache(httpActivity) {
    const { channel } = httpActivity;
    if (channel instanceof Ci.nsICacheInfoChannel) {
      try {
        return channel.isFromCache();
      } catch (e) {
        // Bug 1817750: isFromCache() can throw when called after onStopRequest.
      }
    }

    return false;
  }

  #getBlockedTiming(timings) {
    if (timings.STATUS_RESOLVING && timings.STATUS_CONNECTING_TO) {
      return timings.STATUS_RESOLVING.first - timings.REQUEST_HEADER.first;
    } else if (timings.STATUS_SENDING_TO) {
      return timings.STATUS_SENDING_TO.first - timings.REQUEST_HEADER.first;
    }

    return -1;
  }

  #getDnsTiming(timings) {
    if (timings.STATUS_RESOLVING && timings.STATUS_RESOLVED) {
      return timings.STATUS_RESOLVED.last - timings.STATUS_RESOLVING.first;
    }

    return -1;
  }

  #getConnectTiming(timings) {
    if (timings.STATUS_CONNECTING_TO && timings.STATUS_CONNECTED_TO) {
      return (
        timings.STATUS_CONNECTED_TO.last - timings.STATUS_CONNECTING_TO.first
      );
    }

    return -1;
  }

  #getReceiveTiming(timings) {
    if (timings.RESPONSE_START && timings.RESPONSE_COMPLETE) {
      return timings.RESPONSE_COMPLETE.last - timings.RESPONSE_START.first;
    }

    return -1;
  }

  #getWaitTiming(timings) {
    if (timings.RESPONSE_START) {
      return (
        timings.RESPONSE_START.first -
        (timings.REQUEST_BODY_SENT || timings.STATUS_SENDING_TO).last
      );
    }

    return -1;
  }

  #getSslTiming(timings) {
    if (timings.STATUS_TLS_STARTING && timings.STATUS_TLS_ENDING) {
      return timings.STATUS_TLS_ENDING.last - timings.STATUS_TLS_STARTING.first;
    }

    return -1;
  }

  #getSendTiming(timings) {
    if (timings.STATUS_SENDING_TO) {
      return timings.STATUS_SENDING_TO.last - timings.STATUS_SENDING_TO.first;
    } else if (timings.REQUEST_HEADER && timings.REQUEST_BODY_SENT) {
      return timings.REQUEST_BODY_SENT.last - timings.REQUEST_HEADER.first;
    }

    return -1;
  }

  #getDataFromTimedChannel(timedChannel) {
    const lookUpArr = [
      "tcpConnectEndTime",
      "connectStartTime",
      "connectEndTime",
      "secureConnectionStartTime",
      "domainLookupEndTime",
      "domainLookupStartTime",
    ];

    return lookUpArr.reduce((prev, prop) => {
      const propName = prop + "Tc";
      return {
        ...prev,
        [propName]: (() => {
          if (!timedChannel) {
            return 0;
          }

          const value = timedChannel[prop];

          if (
            value != 0 &&
            timedChannel.asyncOpenTime &&
            value < timedChannel.asyncOpenTime
          ) {
            return 0;
          }

          return value;
        })(),
      };
    }, {});
  }

  #getSecureConnectionStartTimeInfo(timings) {
    let secureConnectionStartTime = 0;
    let secureConnectionStartTimeRelative = false;

    if (timings.STATUS_TLS_STARTING && timings.STATUS_TLS_ENDING) {
      if (timings.STATUS_CONNECTING_TO) {
        secureConnectionStartTime =
          timings.STATUS_TLS_STARTING.first -
          timings.STATUS_CONNECTING_TO.first;
      }

      if (secureConnectionStartTime < 0) {
        secureConnectionStartTime = 0;
      }
      secureConnectionStartTimeRelative = true;
    }

    return {
      secureConnectionStartTime,
      secureConnectionStartTimeRelative,
    };
  }

  #getStartSendingTimeInfo(timings, connectStartTimeTc) {
    let startSendingTime = 0;
    let startSendingTimeRelative = false;

    if (timings.STATUS_SENDING_TO) {
      if (timings.STATUS_CONNECTING_TO) {
        startSendingTime =
          timings.STATUS_SENDING_TO.first - timings.STATUS_CONNECTING_TO.first;
        startSendingTimeRelative = true;
      } else if (connectStartTimeTc != 0) {
        startSendingTime = timings.STATUS_SENDING_TO.first - connectStartTimeTc;
        startSendingTimeRelative = true;
      }

      if (startSendingTime < 0) {
        startSendingTime = 0;
      }
    }
    return { startSendingTime, startSendingTimeRelative };
  }

  /**
   * Update the HTTP activity object to include timing information as in the HAR
   * spec. The HTTP activity object holds the raw timing information in
   * |timings| - these are timings stored for each activity notification. The
   * HAR timing information is constructed based on these lower level
   * data.
   *
   * @param object httpActivity
   *        The HTTP activity object we are working with.
   * @param boolean fromCache
   *        Indicates that the result was returned from the browser cache
   * @return object
   *         This object holds two properties:
   *         - total - the total time for all of the request and response.
   *         - timings - the HAR timings object.
   */
  #setupHarTimings(httpActivity, fromCache) {
    if (fromCache) {
      // If it came from the browser cache, we have no timing
      // information and these should all be 0
      return {
        total: 0,
        timings: {
          blocked: 0,
          dns: 0,
          ssl: 0,
          connect: 0,
          send: 0,
          wait: 0,
          receive: 0,
        },
        offsets: {
          blocked: 0,
          dns: 0,
          ssl: 0,
          connect: 0,
          send: 0,
          wait: 0,
          receive: 0,
        },
      };
    }

    const timings = httpActivity.timings;
    const harTimings = {};
    // If the TCP Fast Open option or tls1.3 0RTT is used tls and data can
    // be dispatched in SYN packet and not after tcp socket is connected.
    // To demostrate this properly we will calculated TLS and send start time
    // relative to CONNECTING_TO.
    // Similary if 0RTT is used, data can be sent as soon as a TLS handshake
    // starts.

    harTimings.blocked = this.#getBlockedTiming(timings);
    // DNS timing information is available only in when the DNS record is not
    // cached.
    harTimings.dns = this.#getDnsTiming(timings);
    harTimings.connect = this.#getConnectTiming(timings);
    harTimings.ssl = this.#getSslTiming(timings);

    let {
      secureConnectionStartTime,
      secureConnectionStartTimeRelative,
    } = this.#getSecureConnectionStartTimeInfo(timings);

    // sometimes the connection information events are attached to a speculative
    // channel instead of this one, but necko might glue them back together in the
    // nsITimedChannel interface used by Resource and Navigation Timing
    const timedChannel = httpActivity.channel.QueryInterface(
      Ci.nsITimedChannel
    );

    const {
      tcpConnectEndTimeTc,
      connectStartTimeTc,
      connectEndTimeTc,
      secureConnectionStartTimeTc,
      domainLookupEndTimeTc,
      domainLookupStartTimeTc,
    } = this.#getDataFromTimedChannel(timedChannel);

    if (
      harTimings.connect <= 0 &&
      timedChannel &&
      tcpConnectEndTimeTc != 0 &&
      connectStartTimeTc != 0
    ) {
      harTimings.connect = tcpConnectEndTimeTc - connectStartTimeTc;
      if (secureConnectionStartTimeTc != 0) {
        harTimings.ssl = connectEndTimeTc - secureConnectionStartTimeTc;
        secureConnectionStartTime =
          secureConnectionStartTimeTc - connectStartTimeTc;
        secureConnectionStartTimeRelative = true;
      } else {
        harTimings.ssl = -1;
      }
    } else if (
      timedChannel &&
      timings.STATUS_TLS_STARTING &&
      secureConnectionStartTimeTc != 0
    ) {
      // It can happen that TCP Fast Open actually have not sent any data and
      // timings.STATUS_TLS_STARTING.first value will be corrected in
      // timedChannel.secureConnectionStartTime
      if (secureConnectionStartTimeTc > timings.STATUS_TLS_STARTING.first) {
        // TCP Fast Open actually did not sent any data.
        harTimings.ssl = connectEndTimeTc - secureConnectionStartTimeTc;
        secureConnectionStartTimeRelative = false;
      }
    }

    if (
      harTimings.dns <= 0 &&
      timedChannel &&
      domainLookupEndTimeTc != 0 &&
      domainLookupStartTimeTc != 0
    ) {
      harTimings.dns = domainLookupEndTimeTc - domainLookupStartTimeTc;
    }

    harTimings.send = this.#getSendTiming(timings);
    harTimings.wait = this.#getWaitTiming(timings);
    harTimings.receive = this.#getReceiveTiming(timings);
    let {
      startSendingTime,
      startSendingTimeRelative,
    } = this.#getStartSendingTimeInfo(timings, connectStartTimeTc);

    if (secureConnectionStartTimeRelative) {
      const time = Math.max(Math.round(secureConnectionStartTime / 1000), -1);
      secureConnectionStartTime = time;
    }
    if (startSendingTimeRelative) {
      const time = Math.max(Math.round(startSendingTime / 1000), -1);
      startSendingTime = time;
    }

    const ot = this.#calculateOffsetAndTotalTime(
      harTimings,
      secureConnectionStartTime,
      startSendingTimeRelative,
      secureConnectionStartTimeRelative,
      startSendingTime
    );
    return {
      total: ot.total,
      timings: harTimings,
      offsets: ot.offsets,
    };
  }

  #extractServerTimings(channel) {
    if (!channel || !channel.serverTiming) {
      return null;
    }

    const serverTimings = new Array(channel.serverTiming.length);

    for (let i = 0; i < channel.serverTiming.length; ++i) {
      const {
        name,
        duration,
        description,
      } = channel.serverTiming.queryElementAt(i, Ci.nsIServerTiming);
      serverTimings[i] = { name, duration, description };
    }

    return serverTimings;
  }

  #convertTimeToMs(timing) {
    return Math.max(Math.round(timing / 1000), -1);
  }

  #calculateOffsetAndTotalTime(
    harTimings,
    secureConnectionStartTime,
    startSendingTimeRelative,
    secureConnectionStartTimeRelative,
    startSendingTime
  ) {
    let totalTime = 0;
    for (const timing in harTimings) {
      const time = this.#convertTimeToMs(harTimings[timing]);
      harTimings[timing] = time;
      if (time > -1 && timing != "connect" && timing != "ssl") {
        totalTime += time;
      }
    }

    // connect, ssl and send times can be overlapped.
    if (startSendingTimeRelative) {
      totalTime += startSendingTime;
    } else if (secureConnectionStartTimeRelative) {
      totalTime += secureConnectionStartTime;
      totalTime += harTimings.ssl;
    }

    const offsets = {};
    offsets.blocked = 0;
    offsets.dns = harTimings.blocked;
    offsets.connect = offsets.dns + harTimings.dns;
    if (secureConnectionStartTimeRelative) {
      offsets.ssl = offsets.connect + secureConnectionStartTime;
    } else {
      offsets.ssl = offsets.connect + harTimings.connect;
    }
    if (startSendingTimeRelative) {
      offsets.send = offsets.connect + startSendingTime;
      if (!secureConnectionStartTimeRelative) {
        offsets.ssl = offsets.send - harTimings.ssl;
      }
    } else {
      offsets.send = offsets.ssl + harTimings.ssl;
    }
    offsets.wait = offsets.send + harTimings.send;
    offsets.receive = offsets.wait + harTimings.wait;

    return {
      total: totalTime,
      offsets,
    };
  }

  #sendRequestBody(httpActivity) {
    if (httpActivity.sentBody !== null) {
      const limit = Services.prefs.getIntPref(
        "devtools.netmonitor.requestBodyLimit"
      );
      const size = httpActivity.sentBody.length;
      if (size > limit && limit > 0) {
        httpActivity.sentBody = httpActivity.sentBody.substr(0, limit);
      }
      httpActivity.owner.addRequestPostData({
        text: httpActivity.sentBody,
        size,
      });
      httpActivity.sentBody = null;
    }
  }

  /*
   * Clears the open requests channel map.
   */
  clear() {
    this.#openRequests.clear();
  }

  /**
   * Suspend observer activity. This is called when the Network monitor actor stops
   * listening.
   */
  destroy() {
    if (Services.appinfo.processType != Ci.nsIXULRuntime.PROCESS_TYPE_CONTENT) {
      gActivityDistributor.removeObserver(this);
      Services.obs.removeObserver(
        this.#httpResponseExaminer,
        "http-on-examine-response"
      );
      Services.obs.removeObserver(
        this.#httpResponseExaminer,
        "http-on-examine-cached-response"
      );
      Services.obs.removeObserver(
        this.#httpModifyExaminer,
        "http-on-modify-request"
      );
      Services.obs.removeObserver(
        this.#httpStopRequest,
        "http-on-stop-request"
      );
    } else {
      Services.obs.removeObserver(
        this.#httpFailedOpening,
        "http-on-failed-opening-request"
      );
    }

    Services.obs.removeObserver(
      this.#serviceWorkerRequest,
      "service-worker-synthesized-response"
    );

    this.#ignoreChannelFunction = null;
    this.#onNetworkEvent = null;
    this.#throttler = null;
    this.#decodedCertificateCache.clear();
    this.clear();

    this.#isDestroyed = true;
  }
}

function gSequenceId() {
  return gSequenceId.n++;
}

gSequenceId.n = 1;
