/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = XPCOMUtils.declareLazy({
  IPPExceptionsManager:
    "moz-src:///toolkit/components/ipprotection/IPPExceptionsManager.sys.mjs",
  IPProtectionService:
    "moz-src:///toolkit/components/ipprotection/IPProtectionService.sys.mjs",
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
   * @param {string} [isolationKey] - the isolation key to bake into the
   *   proxyInfo. When omitted a new random one is generated.
   * @returns {nsIProxyInfo}
   */
  static serverToProxyInfo(
    authToken,
    server,
    isolationKey = IPPChannelFilter.makeIsolationKey()
  ) {
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
   * @typedef {import("./GuardianTypes.sys.mjs").ProxyPass} ProxyPass
   * @param {ProxyPass} pass - the proxy pass to authenticate with.
   * @param {Server} server - the server to connect to.
   */
  initialize(pass, server) {
    if (this.proxyInfo) {
      throw new Error("Double initialization?!?");
    }
    this.#pass = pass;
    this.#server = server;
    this.#setProxyInfo(IPPChannelFilter.makeIsolationKey());
  }

  /**
   * Builds the proxyInfo for the stored pass and server with the given isolation
   * key, saves the key, and flushes any queued channels.
   *
   * @param {string} isolationKey
   */
  #setProxyInfo(isolationKey) {
    this.#isolationKey = isolationKey;
    const proxyInfo = IPPChannelFilter.serverToProxyInfo(
      this.#pass.asBearerToken(),
      this.#server,
      isolationKey
    );
    Object.freeze(proxyInfo);
    this.proxyInfo = proxyInfo;
    this.#processPendingChannels();
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

    lazy.IPProtectionService.authProvider.excludedUrlPrefs.forEach(pref => {
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

    this.#inclusionPrefObserver = () => {
      this.#inclusionSet = IPPChannelFilter.getInclusionList();
    };
    Services.prefs.addObserver(INCLUSION_PREF, this.#inclusionPrefObserver);
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

      // DoH traffic must bypass the proxy: in TRR_ONLY mode (Max Protection)
      // sending DNS-over-HTTPS through the proxy creates a circular
      // resolution dependency that breaks all DNS.
      if (
        channel instanceof Ci.nsIHttpChannelInternal &&
        channel.isTRRServiceChannel
      ) {
        return true;
      }

      // Prefer a non-system loadingPrincipal, falling back to the channel URI
      // principal. For downloads, use the triggeringPrincipal instead so the
      // exclusion is attributed to the originating page.
      let { loadingPrincipal, triggeringPrincipal } = channel.loadInfo ?? {};
      let principal;
      if (loadingPrincipal && !loadingPrincipal.isSystemPrincipal) {
        principal = loadingPrincipal;
      } else if (
        channel.loadInfo?.isUserTriggeredSave &&
        triggeringPrincipal &&
        !triggeringPrincipal.isSystemPrincipal
      ) {
        principal = triggeringPrincipal;
      } else {
        principal =
          Services.scriptSecurityManager.getChannelURIPrincipal(channel);
      }

      if (IPPChannelFilter.isLocal(principal)) {
        return true;
      }

      const origin = uri.prePath; // scheme://host[:port]

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

  /**
   *
   * @param {nsIPrincipal} principal
   */
  static isLocal(principal) {
    return principal.isLoopbackHost || principal.isLocalIpAddress;
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

    if (this.#inclusionPrefObserver) {
      Services.prefs.removeObserver(
        INCLUSION_PREF,
        this.#inclusionPrefObserver
      );
      this.#inclusionPrefObserver = null;
    }

    lazy.ProxyService.unregisterChannelFilter(this);

    this.abortPendingChannels();

    this.#active = false;
    this.#abort.abort();
  }

  /**
   * Returns the isolation key of the active proxy connection, or null when
   * suspended. The key is also stored in #isolationKey so it survives a
   * suspend() and can be re-used by resume().
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
   * Suspends the filter: new channels that should be proxied are queued until
   * the filter is resumed.
   */
  suspend() {
    this.proxyInfo = null;
  }

  /**
   * True if the stored pass is still valid and not yet due for rotation, meaning
   * the connection can be resumed as-is (e.g. when waking from sleep).
   */
  get canResume() {
    return !!this.#pass?.isValid() && !this.#pass.shouldRotate();
  }

  /**
   * Rebuilds the connection from the stored pass, re-using the saved isolation
   * key so the woken connection keeps the same identity (e.g. resuming after
   * sleep). Flushes any queued channels.
   */
  resume() {
    this.#setProxyInfo(this.#isolationKey);
  }

  /**
   * Replaces the proxy pass and flushes any queued channels. This generates a
   * new isolation key for the connection.
   *
   * @typedef {import("./GuardianTypes.sys.mjs").ProxyPass} ProxyPass
   * @param {ProxyPass} pass - The new proxy pass.
   */
  replaceAuthTokenAndResume(pass) {
    this.#pass = pass;
    this.#setProxyInfo(IPPChannelFilter.makeIsolationKey());
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

  abortPendingChannels() {
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
  #inclusionPrefObserver = null;
  #server = null;
  /** @type {import("./GuardianTypes.sys.mjs").ProxyPass | null} */
  #pass = null;
  /** @type {string | null} */
  #isolationKey = null;

  static makeIsolationKey() {
    return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
  }
}
