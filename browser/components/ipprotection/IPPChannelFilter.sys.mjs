/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  IPPExceptionsManager:
    "moz-src:///browser/components/ipprotection/IPPExceptionsManager.sys.mjs",
  ProxyService: {
    service: "@mozilla.org/network/protocol-proxy-service;1",
    iid: Ci.nsIProtocolProxyService,
  },
});
const { TRANSPARENT_PROXY_RESOLVES_HOST, ALWAYS_TUNNEL_VIA_PROXY } =
  Ci.nsIProxyInfo;
const failOverTimeout = 10; // seconds

const MODE_PREF = "browser.ipProtection.mode";

const INCLUSION_PREF = "browser.ipProtection.inclusion.match_patterns";

const isXpcshell = Services.env.exists("XPCSHELL_TEST_PROFILE_DIR");

const MATCH_PATTERN_OPTIONS = {
  ignorePath: true,
  restrictSchemes: false,
};

/**
 * The IPP Mode the default behavior of Channels
 */
export const IPPMode = Object.freeze({
  /**
   * Tunnel Everything by default
   */
  MODE_FULL: 0,
  /**
   * Tunnel if it is Private Browsing mode by default
   */
  MODE_PB: 1,
  /**
   * Tunnel if it is a tracker
   */
  MODE_TRACKER: 2,
  /**
   * Tunnel No requests by default.
   */
  MODE_INCLUSION: 3,
});

const TRACKING_FLAGS =
  Ci.nsIClassifiedChannel.CLASSIFIED_TRACKING |
  Ci.nsIClassifiedChannel.CLASSIFIED_TRACKING_AD |
  Ci.nsIClassifiedChannel.CLASSIFIED_TRACKING_ANALYTICS |
  Ci.nsIClassifiedChannel.CLASSIFIED_TRACKING_SOCIAL |
  Ci.nsIClassifiedChannel.CLASSIFIED_TRACKING_CONTENT;

const DEFAULT_EXCLUDED_URL_PREFS = [
  "browser.ipProtection.guardian.endpoint",
  "identity.fxaccounts.remote.profile.uri",
  "identity.fxaccounts.auth.uri",
  "identity.fxaccounts.remote.profile.uri",
  "captivedetect.canonicalURL",
];

/**
 * IPPChannelFilter is a class that implements the nsIProtocolProxyChannelFilter
 *
 * While active it will review every request the browser makes.
 * Depending on IPPMode - it will proxy the request unless a rule is attached to the Destination.
 *
 * -> Exclusions can be made by putting the page into excludedPages OR by attaching the IPP-Deny permission to the Principal.
 *    See also IPPExceptionsManager.sys.mjs
 * -> Inclusions can be made by putting pages into the INCLUSION_PREF matchset
 *
 * If a Channel Matches both Exclusion and Inclusion Rule, the Inclusion Rule is taken.
 *
 */
export class IPPChannelFilter {
  /**
   * Creates a new IPPChannelFilter that can connect to a proxy server. After
   * created, the proxy can be immediately activated. It will suspend all the
   * received nsIChannel until the object is fully initialized.
   *
   * @param {Array<string>} [excludedPages] - list of page URLs whose *origin* should bypass the proxy
   */
  static create(excludedPages = []) {
    return new IPPChannelFilter(excludedPages);
  }

  /**
   * Sets the IPP Mode.
   *
   * @param {IPPMode} [mode] - the new mode
   */
  static setMode(mode) {
    Services.prefs.setIntPref(MODE_PREF, mode);
  }

  /**
   * Takes a protocol definition and constructs the appropriate nsIProxyInfo
   *
   * @typedef {import("./IPProtectionServerlist.sys.mjs").MasqueProtocol} MasqueProtocol
   * @typedef {import("./IPProtectionServerlist.sys.mjs").ConnectProtocol } ConnectProtocol
   *
   * @param {string} authToken - a bearer token for the proxy server.
   * @param {string} isolationKey - the isolation key for the proxy connection.
   * @param {MasqueProtocol|ConnectProtocol} protocol - the protocol definition.
   * @param {nsIProxyInfo} fallBackInfo - optional fallback proxy info.
   * @param {boolean} [alwaysTunnel] - when true, always tunnel requests through the proxy
   * @returns {nsIProxyInfo}
   */
  static constructProxyInfo(
    authToken,
    isolationKey,
    protocol,
    fallBackInfo = null,
    alwaysTunnel = false
  ) {
    switch (protocol.name) {
      case "masque":
        return lazy.ProxyService.newMASQUEProxyInfo(
          protocol.host,
          protocol.port,
          protocol.templateString,
          authToken,
          isolationKey,
          TRANSPARENT_PROXY_RESOLVES_HOST,
          failOverTimeout,
          fallBackInfo
        );
      case "connect": {
        const flags =
          TRANSPARENT_PROXY_RESOLVES_HOST |
          (alwaysTunnel ? ALWAYS_TUNNEL_VIA_PROXY : 0);
        return lazy.ProxyService.newProxyInfo(
          protocol.scheme,
          protocol.host,
          protocol.port,
          authToken,
          isolationKey,
          flags,
          failOverTimeout,
          fallBackInfo
        );
      }
      default:
        throw new Error(
          "Cannot construct ProxyInfo for Unknown server-protocol: " +
            protocol.name
        );
    }
  }
  /**
   * Takes a server definition and constructs the appropriate nsIProxyInfo
   * If the server supports multiple Protocols, a fallback chain will be created.
   * The first protocol in the list will be the primary one, with the others as fallbacks.
   *
   * @typedef {import("./IPProtectionServerlist.sys.mjs").Server} Server
   * @param {string} authToken - a bearer token for the proxy server.
   * @param {Server} server - the server to connect to.
   * @returns {nsIProxyInfo}
   */
  static serverToProxyInfo(authToken, server) {
    const isolationKey = IPPChannelFilter.makeIsolationKey();
    // When running tests, we can’t set alwaysTunnel to true because our test
    // server doesn’t support tunneling.
    const alwaysTunnel = !(Cu.isInAutomation || isXpcshell);
    return server.protocols.reduceRight((fallBackInfo, protocol) => {
      return IPPChannelFilter.constructProxyInfo(
        authToken,
        isolationKey,
        protocol,
        fallBackInfo,
        alwaysTunnel
      );
    }, null);
  }

  /**
   * Initialize a IPPChannelFilter object. After this step, the filter, if
   * active, will process the new and the pending channels.
   *
   * @typedef {import("./IPProtectionServerlist.sys.mjs").Server} Server
   * @param {string} authToken - a bearer token for the proxy server.
   * @param {Server} server - the server to connect to.
   */
  initialize(authToken = "", server) {
    if (this.proxyInfo) {
      throw new Error("Double initialization?!?");
    }
    const proxyInfo = IPPChannelFilter.serverToProxyInfo(authToken, server);
    Object.freeze(proxyInfo);
    this.proxyInfo = proxyInfo;

    this.#processPendingChannels();
  }

  /**
   * Uninitializes the IPPChannelFilter, removing the proxyInfo and aborting any pending channels.
   * After this step, the filter will pause channels that should be proxied until a new proxyInfo is set through initialize() again, or the filter is stopped.
   */
  uninitialize() {
    this.proxyInfo = null;
  }

  /**
   * @param {Array<string>} [excludedPages]
   */
  constructor(excludedPages = []) {
    // Normalize and store excluded origins (scheme://host[:port])
    this.#excludedOrigins = new Set();
    excludedPages.forEach(url => {
      this.addPageExclusion(url);
    });
    this.#inclusionSet = IPPChannelFilter.getInclusionList();

    DEFAULT_EXCLUDED_URL_PREFS.forEach(pref => {
      const prefValue = Services.prefs.getStringPref(pref, "");
      if (prefValue) {
        this.addPageExclusion(prefValue);
      }
    });

    XPCOMUtils.defineLazyPreferenceGetter(
      this,
      "mode",
      MODE_PREF,
      IPPMode.MODE_FULL
    );
  }

  /**
   * This method (which is required by the nsIProtocolProxyService interface)
   * is called to apply proxy filter rules for the given URI and proxy object
   * (or list of proxy objects).
   *
   * @param {nsIChannel} channel The channel for which these proxy settings apply.
   * @param {nsIProxyInfo|null} defaultProxyInfo The proxy (or list of proxies) that
   *     would be used by default for the given URI. This may be null.
   * @param {nsIProxyProtocolFilterResult} proxyFilter
   */
  applyFilter(channel, defaultProxyInfo, proxyFilter) {
    if (!this.shouldProxy(channel)) {
      // Calling this with "null" will enforce a non-proxy connection
      proxyFilter.onProxyFilterResult(defaultProxyInfo);
      return;
    }

    if (!this.proxyInfo) {
      // We are not initialized yet!
      this.#pendingChannels.push({ channel, proxyFilter });
      return;
    }

    proxyFilter.onProxyFilterResult(this.proxyInfo);

    // Notify observers that the channel is being proxied
    this.#observers.forEach(observer => {
      observer(channel);
    });
  }

  /**
   * Returns true when this channel should take a proxy.
   *
   * @param {*} channel - The Channel to observe
   * @returns {boolean} -
   *    True: The Channel should be Proxied by this ChannelFilter
   *    False: The Channel should NOT be proxied.
   */
  shouldProxy(channel) {
    // Exclude system channels essential to starting the proxy until the proxy is ready.
    if (
      !this.proxyInfo &&
      !channel.isDocument &&
      channel.loadInfo?.triggeringPrincipal?.isSystemPrincipal
    ) {
      return false;
    }
    if (this.shouldInclude(channel)) {
      return true;
    }
    if (this.shouldExclude(channel)) {
      return false;
    }
    return this.#matchMode(channel);
  }

  #matchMode(channel) {
    switch (this.mode) {
      case IPPMode.MODE_PB:
        return !!channel.loadInfo.originAttributes.privateBrowsingId;

      case IPPMode.MODE_TRACKER:
        return !!(
          TRACKING_FLAGS &
          channel.loadInfo.triggeringThirdPartyClassificationFlags
        );
      case IPPMode.MODE_INCLUSION:
        return false;
      case IPPMode.MODE_FULL:
      default:
        return true;
    }
  }

  /**
   * Decides whether a channel *should* take the proxy
   *
   * @param {nsIChannel} channel
   * @returns {boolean} - True: The channel *should* take the proxy.
   */
  shouldInclude(channel) {
    try {
      return this.#inclusionSet.matches(channel.URI);
    } catch (_) {
      return false;
    }
  }

  /**
   * Decide whether a channel should bypass the proxy based on origin.
   *
   * @param {nsIChannel} channel
   * @returns {boolean}
   */
  shouldExclude(channel) {
    try {
      const uri = channel.URI; // nsIURI
      if (!uri) {
        return true;
      }

      if (!["http", "https"].includes(uri.scheme)) {
        return true;
      }

      if (IPPChannelFilter.isLocal(uri)) {
        return true;
      }

      const origin = uri.prePath; // scheme://host[:port]

      let principal =
        channel.loadInfo?.loadingPrincipal ||
        Services.scriptSecurityManager.getChannelURIPrincipal(channel);

      let hasExclusion = lazy.IPPExceptionsManager.hasExclusion(principal);

      if (hasExclusion) {
        return true;
      }

      return this.#excludedOrigins.has(origin);
    } catch (_) {
      return true;
    }
  }

  static getInclusionList() {
    let raw = Services.prefs.getStringPref(INCLUSION_PREF, "[]");
    let arr = JSON.parse(raw);
    if (!Array.isArray(arr)) {
      throw new TypeError(`${INCLUSION_PREF} does not contain a JSON array`);
    }
    let patterns = arr.filter(s => typeof s === "string" && s.length);
    return new MatchPatternSet(patterns, MATCH_PATTERN_OPTIONS);
  }

  static isLocal(uri) {
    if (Services.io.hostnameIsLocalIPAddress(uri)) {
      return true;
    }

    const hostname = uri.host;
    return (
      /^(.+\.)?localhost$/.test(hostname) ||
      /^(.+\.)?localhost6$/.test(hostname) ||
      /^(.+\.)?localhost.localdomain$/.test(hostname) ||
      /^(.+\.)?localhost6.localdomain6$/.test(hostname) ||
      // https://tools.ietf.org/html/rfc2606
      /\.example$/.test(hostname) ||
      /\.invalid$/.test(hostname) ||
      /\.test$/.test(hostname) ||
      // https://tools.ietf.org/html/rfc8375
      /^(.+\.)?home\.arpa$/.test(hostname) ||
      // https://tools.ietf.org/html/rfc6762
      /\.local$/.test(hostname) ||
      // Loopback
      /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
    );
  }

  /**
   * Adds a page URL to the exclusion list.
   *
   * @param {string} url - The URL to exclude.
   * @param {Set<string>} [list] - The exclusion list to add the URL to.
   */
  addPageExclusion(url, list = this.#excludedOrigins) {
    try {
      const uri = Services.io.newURI(url);
      // prePath is scheme://host[:port]
      list.add(uri.prePath);
    } catch (_) {
      // ignore bad entries
    }
  }

  /**
   * Starts the Channel Filter, feeding all following Requests through the proxy.
   */
  start() {
    lazy.ProxyService.registerChannelFilter(
      this /* nsIProtocolProxyChannelFilter aFilter */,
      0 /* unsigned long aPosition */
    );
    this.#active = true;
  }

  /**
   * Stops the Channel Filter, stopping all following Requests from being proxied.
   */
  stop() {
    if (!this.#active) {
      return;
    }

    lazy.ProxyService.unregisterChannelFilter(this);

    this.#abortPendingChannels();

    this.#active = false;
    this.#abort.abort();
  }

  /**
   * Returns the isolation key of the proxy connection.
   * All ProxyInfo objects related to this Connection will have the same isolation key.
   */
  get isolationKey() {
    if (!this.proxyInfo) {
      return null;
    }
    return this.proxyInfo.connectionIsolationKey;
  }

  get hasPendingChannels() {
    return !!this.#pendingChannels.length;
  }

  /**
   * Replaces the authentication token used by the proxy connection.
   * --> Important <--: This Changes the isolationKey of the Connection!
   *
   * @param {string} newToken - The new authentication token.
   */
  replaceAuthToken(newToken) {
    const newInfo = lazy.ProxyService.newProxyInfo(
      this.proxyInfo.type,
      this.proxyInfo.host,
      this.proxyInfo.port,
      newToken,
      IPPChannelFilter.makeIsolationKey(),
      TRANSPARENT_PROXY_RESOLVES_HOST,
      failOverTimeout,
      null // Failover proxy info
    );
    Object.freeze(newInfo);
    this.proxyInfo = newInfo;
  }

  /**
   * Returns an async generator that yields channels this Connection is proxying.
   *
   * This allows to introspect channels that are proxied, i.e
   * to measure usage, or catch proxy errors.
   *
   * @returns {AsyncGenerator<nsIChannel>} An async generator that yields proxied channels.
   * @yields {object}
   *   Proxied channels.
   */
  async *proxiedChannels() {
    const stop = Promise.withResolvers();
    this.#abort.signal.addEventListener(
      "abort",
      () => {
        stop.reject();
      },
      { once: true }
    );
    while (this.#active) {
      const { promise, resolve } = Promise.withResolvers();
      this.#observers.push(resolve);
      try {
        const result = await Promise.race([stop.promise, promise]);
        this.#observers = this.#observers.filter(
          observer => observer !== resolve
        );
        yield result;
      } catch (error) {
        // Stop iteration if the filter is stopped or aborted
        return;
      }
    }
  }

  /**
   * Returns true if this filter is active.
   */
  get active() {
    return this.#active;
  }

  #processPendingChannels() {
    if (this.#pendingChannels.length) {
      this.#pendingChannels.forEach(data =>
        this.applyFilter(data.channel, null, data.proxyFilter)
      );
      this.#pendingChannels = [];
    }
  }

  #abortPendingChannels() {
    if (this.#pendingChannels.length) {
      this.#pendingChannels.forEach(data =>
        data.channel.cancel(Cr.NS_BINDING_ABORTED)
      );
      this.#pendingChannels = [];
    }
  }

  #abort = new AbortController();
  #observers = [];
  #active = false;
  #excludedOrigins = new Set();
  #pendingChannels = [];
  #inclusionSet = new MatchPatternSet([], MATCH_PATTERN_OPTIONS);

  static makeIsolationKey() {
    return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
  }
}
