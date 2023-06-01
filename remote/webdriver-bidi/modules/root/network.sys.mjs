/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Module } from "chrome://remote/content/shared/messagehandler/Module.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  error: "chrome://remote/content/shared/webdriver/Errors.sys.mjs",
  NetworkListener:
    "chrome://remote/content/shared/listeners/NetworkListener.sys.mjs",
  TabManager: "chrome://remote/content/shared/TabManager.sys.mjs",
  WindowGlobalMessageHandler:
    "chrome://remote/content/shared/messagehandler/WindowGlobalMessageHandler.sys.mjs",
});

/**
 * @typedef {Object} BaseParameters
 * @property {string=} context
 * @property {boolean} isRedirect
 * @property {Navigation=} navigation
 * @property {RequestData} request
 * @property {number} timestamp
 */

/**
 * @typedef {Object} Cookie
 * @property {Array<number>=} binaryValue
 * @property {string} domain
 * @property {number=} expires
 * @property {boolean} httpOnly
 * @property {string} name
 * @property {string} path
 * @property {('lax' | 'none' | 'strict')} sameSite
 * @property {boolean} secure
 * @property {number} size
 * @property {string=} value
 */

/**
 * @typedef {Object} FetchTimingInfo
 * @property {number} originTime
 * @property {number} requestTime
 * @property {number} redirectStart
 * @property {number} redirectEnd
 * @property {number} fetchStart
 * @property {number} dnsStart
 * @property {number} dnsEnd
 * @property {number} connectStart
 * @property {number} connectEnd
 * @property {number} tlsStart
 * @property {number} requestStart
 * @property {number} responseStart
 * @property {number} responseEnd
 */

/**
 * @typedef {Object} Header
 * @property {Array<number>=} binaryValue
 * @property {string} name
 * @property {string=} value
 */

/**
 * @typedef {string} InitiatorType
 **/

/**
 * Enum of possible initiator types.
 *
 * @readonly
 * @enum {InitiatorType}
 **/
const InitiatorType = {
  Other: "other",
  Parser: "parser",
  Preflight: "preflight",
  Script: "script",
};
/**
 * @typedef {Object} Initiator
 * @property {InitiatorType} type
 * @property {number=} columnNumber
 * @property {number=} lineNumber
 * @property {string=} request
 * @property {StackTrace=} stackTrace
 */

/**
 * @typedef {Object} RequestData
 * @property {number|null} bodySize
 *     Defaults to null.
 * @property {Array<Cookie>} cookies
 * @property {Array<Header>} headers
 * @property {number} headersSize
 * @property {string} method
 * @property {string} request
 * @property {FetchTimingInfo} timings
 * @property {string} url
 */

/**
 * @typedef {Object} BeforeRequestSentParametersProperties
 * @property {Initiator} initiator
 */

/**
 * Parameters for the BeforeRequestSent event
 *
 * @typedef {BaseParameters & BeforeRequestSentParametersProperties} BeforeRequestSentParameters
 */

/**
 * @typedef {Object} ResponseContent
 * @property {number|null} size
 *     Defaults to null.
 */

/**
 * @typedef {Object} ResponseData
 * @property {string} url
 * @property {string} protocol
 * @property {number} status
 * @property {string} statusText
 * @property {boolean} fromCache
 * @property {Array<Header>} headers
 * @property {string} mimeType
 * @property {number} bytesReceived
 * @property {number|null} headersSize
 *     Defaults to null.
 * @property {number|null} bodySize
 *     Defaults to null.
 * @property {ResponseContent} content
 */

/**
 * @typedef {Object} ResponseStartedParametersProperties
 * @property {ResponseData} response
 */

/**
 * Parameters for the ResponseStarted event
 *
 * @typedef {BaseParameters & ResponseStartedParametersProperties} ResponseStartedParameters
 */

/**
 * @typedef {Object} ResponseCompletedParametersProperties
 * @property {ResponseData} response
 */

/**
 * Parameters for the ResponseCompleted event
 *
 * @typedef {BaseParameters & ResponseCompletedParametersProperties} ResponseCompletedParameters
 */

class NetworkModule extends Module {
  #beforeRequestSentMap;
  #networkListener;
  #subscribedEvents;

  constructor(messageHandler) {
    super(messageHandler);

    // Map of request ids to redirect counts. A WebDriver BiDi request id is
    // identical for redirects of a given request, this map allows to know if we
    // already emitted a beforeRequestSent event for a given request with a
    // specific redirectCount.
    this.#beforeRequestSentMap = new Map();

    // Set of event names which have active subscriptions
    this.#subscribedEvents = new Set();

    this.#networkListener = new lazy.NetworkListener();
    this.#networkListener.on("before-request-sent", this.#onBeforeRequestSent);
    this.#networkListener.on("response-completed", this.#onResponseEvent);
    this.#networkListener.on("response-started", this.#onResponseEvent);
  }

  destroy() {
    this.#networkListener.off("before-request-sent", this.#onBeforeRequestSent);
    this.#networkListener.off("response-completed", this.#onResponseEvent);
    this.#networkListener.off("response-started", this.#onResponseEvent);

    this.#beforeRequestSentMap = null;
    this.#subscribedEvents = null;
  }

  #getContextInfo(browsingContext) {
    return {
      contextId: browsingContext.id,
      type: lazy.WindowGlobalMessageHandler.type,
    };
  }

  #onBeforeRequestSent = (name, data) => {
    const { contextId, requestData, timestamp, redirectCount } = data;

    const isRedirect = redirectCount > 0;
    this.#beforeRequestSentMap.set(requestData.requestId, redirectCount);

    // Bug 1805479: Handle the initiator, including stacktrace details.
    const initiator = {
      type: InitiatorType.Other,
    };

    const baseParameters = {
      context: contextId,
      isRedirect,
      redirectCount,
      // Bug 1805405: Handle the navigation id.
      navigation: null,
      request: requestData,
      timestamp,
    };

    const beforeRequestSentEvent = {
      ...baseParameters,
      initiator,
    };

    const browsingContext = lazy.TabManager.getBrowsingContextById(contextId);
    this.emitEvent(
      "network.beforeRequestSent",
      beforeRequestSentEvent,
      this.#getContextInfo(browsingContext)
    );
  };

  #onResponseEvent = (name, data) => {
    const {
      contextId,
      requestData,
      responseData,
      timestamp,
      redirectCount,
    } = data;

    const isRedirect = redirectCount > 0;

    const requestId = requestData.requestId;
    if (this.#beforeRequestSentMap.get(requestId) != redirectCount) {
      throw new lazy.error.UnknownError(
        `Redirect count of the request ${requestId} does not match the before request sent map`
      );
    }

    const baseParameters = {
      context: contextId,
      isRedirect,
      redirectCount,
      // Bug 1805405: Handle the navigation id.
      navigation: null,
      request: requestData,
      timestamp,
    };

    const responseEvent = {
      ...baseParameters,
      response: responseData,
    };

    const protocolEventName =
      name === "response-started"
        ? "network.responseStarted"
        : "network.responseCompleted";

    const browsingContext = lazy.TabManager.getBrowsingContextById(contextId);
    this.emitEvent(
      protocolEventName,
      responseEvent,
      this.#getContextInfo(browsingContext)
    );
  };

  #startListening(event) {
    if (this.#subscribedEvents.size == 0) {
      this.#networkListener.startListening();
    }
    this.#subscribedEvents.add(event);
  }

  #stopListening(event) {
    this.#subscribedEvents.delete(event);
    if (this.#subscribedEvents.size == 0) {
      this.#networkListener.stopListening();
    }
  }

  #subscribeEvent(event) {
    if (this.constructor.supportedEvents.includes(event)) {
      this.#startListening(event);
    }
  }

  #unsubscribeEvent(event) {
    if (this.constructor.supportedEvents.includes(event)) {
      this.#stopListening(event);
    }
  }

  /**
   * Internal commands
   */

  _applySessionData(params) {
    // TODO: Bug 1775231. Move this logic to a shared module or an abstract
    // class.
    const { category } = params;
    if (category === "event") {
      const filteredSessionData = params.sessionData.filter(item =>
        this.messageHandler.matchesContext(item.contextDescriptor)
      );
      for (const event of this.#subscribedEvents.values()) {
        const hasSessionItem = filteredSessionData.some(
          item => item.value === event
        );
        // If there are no session items for this context, we should unsubscribe from the event.
        if (!hasSessionItem) {
          this.#unsubscribeEvent(event);
        }
      }

      // Subscribe to all events, which have an item in SessionData.
      for (const { value } of filteredSessionData) {
        this.#subscribeEvent(value);
      }
    }
  }

  static get supportedEvents() {
    return [
      "network.beforeRequestSent",
      "network.responseCompleted",
      "network.responseStarted",
    ];
  }
}

export const network = NetworkModule;
