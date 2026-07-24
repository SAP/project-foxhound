/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { XPCOMUtils } from "resource://gre/modules/XPCOMUtils.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "fxAccounts", () =>
  ChromeUtils.importESModule(
    "resource://gre/modules/FxAccounts.sys.mjs"
  ).getFxAccountsSingleton()
);
ChromeUtils.defineLazyGetter(
  lazy,
  "hiddenBrowserManager",
  () =>
    ChromeUtils.importESModule("resource://gre/modules/HiddenFrame.sys.mjs")
      .HiddenBrowserManager
);
ChromeUtils.defineLazyGetter(
  lazy,
  "JsonSchemaValidator",
  () =>
    ChromeUtils.importESModule(
      "resource://gre/modules/components-utils/JsonSchemaValidator.sys.mjs"
    ).JsonSchemaValidator
);

if (Services.appinfo.processType !== Services.appinfo.PROCESS_TYPE_DEFAULT) {
  throw new Error("Guardian.sys.mjs should only run in the parent process");
}

/**
 * An HTTP Client to talk to the Guardian service.
 * Allows to enroll FxA users to the proxy service,
 * fetch a proxy pass and check if the user is a proxy user.
 *
 */
export class GuardianClient {
  /**
   * @param {typeof gConfig} [config]
   */
  constructor(config = gConfig) {
    this.guardianEndpoint = config.guardianEndpoint;
    this.fxaOrigin = config.fxaOrigin;
    this.getToken = config.getToken;
  }
  /**
   * Checks the current user's FxA account to see if it is linked to the Guardian service.
   * This should be used before attempting to check Entitlement info.
   *
   * @param { boolean } onlyCached - if true only the cached clients will be checked.
   * @returns {Promise<boolean>}
   *  - True: The user is linked to the Guardian service, they might be a proxy user or have/had a VPN-Subscription.
   *          This needs to be followed up with a call to `fetchUserInfo()` to check if they are a proxy user.
   *  - False: The user is not linked to the Guardian service, they cannot be a proxy user.
   */
  async isLinkedToGuardian(onlyCached = false) {
    const guardian_clientId = CLIENT_ID_MAP[this.#successURL.origin];
    if (!guardian_clientId) {
      // If we end up using an unknown successURL, we are definitely not linked to Guardian.
      return false;
    }

    const cached_clients = await lazy.fxAccounts.listAttachedOAuthClients();
    if (cached_clients.some(client => client.id === guardian_clientId)) {
      return true;
    }
    if (onlyCached) {
      return false;
    }
    // If we don't have the client in the cache, we refresh it, just to be sure.
    const refreshed_clients =
      await lazy.fxAccounts.listAttachedOAuthClients(true);
    if (refreshed_clients.some(client => client.id === guardian_clientId)) {
      return true;
    }
    return false;
  }

  /**
   * Tries to enroll the user to the proxy service.
   * It will silently try to sign in the user into guardian using their FxA account.
   * If the user already has a proxy entitlement, the experiment type will update.
   *
   * @param { "alpha" | "beta" | "delta" | "gamma" } aExperimentType - The experiment type to enroll the user into.
   * The experiment type controls which feature set the user will get in Firefox.
   *
   * @param { AbortSignal | null } aAbortSignal - An AbortSignal to cancel the operation.
   * @returns {Promise<{error?: string, ok?: boolean}>}
   */
  async enroll(aExperimentType = "alpha", aAbortSignal = null) {
    // We abort loading the page if the origion is not allowed.
    const allowedOrigins = [
      new URL(this.guardianEndpoint).origin,
      new URL(this.fxaOrigin).origin,
    ];
    // If the browser is redirected to one of those urls
    // we know we're done with the browser.
    const finalizerURLs = [this.#successURL, this.#enrollmentError];
    return await lazy.hiddenBrowserManager.withHiddenBrowser(async browser => {
      aAbortSignal?.addEventListener("abort", () => {
        browser.stop();
        browser.remove();
        throw new Error("aborted");
      });
      const finalEndpoint = waitUntilURL(browser, url => {
        const urlObj = new URL(url);
        if (url === "about:blank") {
          return false;
        }
        if (!allowedOrigins.includes(urlObj.origin)) {
          browser.stop();
          browser.remove();
          throw new Error(
            `URL ${url} with origin ${urlObj.origin} is not allowed.`
          );
        }
        if (
          finalizerURLs.some(
            finalizer =>
              urlObj.pathname === finalizer.pathname &&
              urlObj.origin === finalizer.origin
          )
        ) {
          return true;
        }
        return false;
      });
      const loginURL = this.#loginURL;
      loginURL.searchParams.set("experiment", aExperimentType);
      browser.loadURI(Services.io.newURI(loginURL.href), {
        // TODO: Make sure this is the right principal to use?
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });

      const result = await finalEndpoint;
      return GuardianClient._parseGuardianSuccessURL(result);
    });
  }

  static _parseGuardianSuccessURL(aUrl) {
    if (!aUrl) {
      return { error: "timeout", ok: false };
    }
    const url = new URL(aUrl);
    const params = new URLSearchParams(url.search);
    const error = params.get("error");
    if (error) {
      return { error, ok: false };
    }
    // Otherwise we should have:
    // - a code in the URL query
    if (!params.has("code")) {
      return { error: "missing_code", ok: false };
    }
    return { ok: true };
  }

  /**
   * Fetches a proxy pass from the Guardian service.
   *
   * @param {AbortSignal} [abortSignal=null] - a signal to indicate the fetch should be aborted
   * @returns {Promise<{error?: string, status?:number, pass?: ProxyPass, usage?: ProxyUsage|null, retryAfter?: string|null}>} Resolves with an object containing either an error string or the proxy pass data and a status code.
   *
   * Return values:
   * - {pass, status, usage}: Success with proxy pass and optional usage info
   * - {error: "login_needed", usage: null}: No FxA token available
   * - {status: 429, error: "quota_exceeded", usage, retryAfter}: Usage quota exceeded
   * - {status, error: "invalid_response", usage}: Invalid response from server
   * - {status, error: "parse_error", usage}: Failed to parse response
   *
   * Status codes to watch for:
   * - 200: User is a proxy user and a new pass was fetched
   * - 429: Usage quota exceeded
   * - 403: The FxA was valid but the user is not a proxy user.
   * - 401: The FxA token was rejected.
   * - 5xx: Internal guardian error.
   */
  async fetchProxyPass(abortSignal = null) {
    using tokenHandle = await this.getToken(abortSignal);
    const response = await fetch(this.#tokenURL, {
      method: "GET",
      cache: "no-cache",
      headers: {
        Authorization: `Bearer ${tokenHandle.token}`,
        "Content-Type": "application/json",
      },
      signal: abortSignal,
    });
    if (!response) {
      return { error: "login_needed", usage: null };
    }
    const status = response.status;

    let usage = null;
    try {
      usage = ProxyUsage.fromResponse(response);
    } catch (error) {
      console.warn(
        "Usage headers missing or invalid, continuing without usage:",
        error
      );
    }

    if (status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      return {
        status,
        error: "quota_exceeded",
        usage,
        retryAfter,
      };
    }

    try {
      const pass = await ProxyPass.fromResponse(response);
      if (!pass) {
        return { status, error: "invalid_response", usage };
      }
      return { pass, status, usage };
    } catch (error) {
      console.error("Error parsing pass:", error);
      return { status, error: "parse_error", usage };
    }
  }
  /**
   * Fetches the user's entitlement information.
   *
   * @param {AbortSignal} [abortSignal=null] - a signal to indicate the fetch should be aborted
   * @returns {Promise<{status?: number, entitlement?: Entitlement|null, error?:string}>} A promise that resolves to an object containing the HTTP status code and the user's entitlement information.
   *
   * Status codes to watch for:
   * - 200: User is a proxy user and the entitlement information is available.
   * - 404: User is not a proxy user, no entitlement information available.
   * - 401: The FxA token was rejected, probably guardian and fxa mismatch. (i.e guardian-stage and fxa-prod)
   */
  async fetchUserInfo(abortSignal = null) {
    using tokenHandle = await this.getToken(abortSignal);
    const response = await fetch(this.#statusURL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenHandle.token}`,
        "Content-Type": "application/json",
      },
      cache: "no-cache",
      signal: abortSignal,
    });
    if (!response) {
      return { error: "login_needed" };
    }
    const status = response.status;
    try {
      const entitlement = await Entitlement.fromResponse(response);
      if (!entitlement) {
        return { status, error: "parse_error" };
      }
      return {
        status,
        entitlement,
      };
    } catch (error) {
      return { status, error: "parse_error" };
    }
  }

  /**
   * Returns the user's proxy usage information, without fetching a new proxy pass.
   *
   * @param {AbortSignal} abortSignal - Signal for when this function should be aborted
   * @returns {ProxyUsage | null}
   */
  async fetchProxyUsage(abortSignal) {
    using tokenHandle = await this.getToken(abortSignal);
    const response = await fetch(this.#tokenURL, {
      method: "HEAD",
      signal: abortSignal,
      headers: {
        Authorization: `Bearer ${tokenHandle.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response) {
      return null;
    }
    try {
      return ProxyUsage.fromResponse(response);
    } catch (error) {
      console.warn(
        "Usage headers missing or invalid, continuing without usage:",
        error
      );
    }
    return null;
  }

  /** This is the URL that will be used to fetch the proxy pass. */
  get #tokenURL() {
    const url = new URL(this.guardianEndpoint);
    url.pathname = "/api/v1/fpn/token";
    return url;
  }
  /** This is the URL that will be used to log in to the Guardian service. */
  get #loginURL() {
    const url = new URL(this.guardianEndpoint);
    url.pathname = "/api/v1/fpn/auth";
    return url;
  }
  /** This is the URL that the user will be redirected to after a successful enrollment. */
  get #successURL() {
    const url = new URL(this.guardianEndpoint);
    url.pathname = "/oauth/success";
    return url;
  }
  /**
   * This is the URL that the user will be redirected to after a rejected/failed enrollment.
   * The url will contain an error query parameter with the error message.
   */
  get #enrollmentError() {
    const url = new URL(this.guardianEndpoint);
    url.pathname = "/api/v1/fpn/error";
    return url;
  }
  /** This is the URL that will be used to check the user's proxy status. */
  get #statusURL() {
    const url = new URL(this.guardianEndpoint);
    url.pathname = "/api/v1/fpn/status";
    return url;
  }
  guardianEndpoint = "";
}

/**
 * A ProxyPass contains a JWT token that can be used to authenticate the proxy service.
 * It also contains the timestamp until which the token is valid.
 * The Proxy will reject new connections if the token is not valid anymore.
 *
 * Immutable after creation.
 */
export class ProxyPass extends EventTarget {
  #body = {
    /** Not Before */
    nbf: 0,
    /** Expiration */
    exp: 0,
  };
  /**
   * @param {string} token - The JWT to use for authentication.
   */
  constructor(token) {
    super();
    if (typeof token !== "string") {
      throw new TypeError(
        "Invalid arguments for ProxyPass constructor, token is not a string"
      );
    }
    this.token = token;
    // Contains [header.body.signature]
    const parts = this.token.split(".");
    if (parts.length !== 3) {
      throw new TypeError("Invalid token format");
    }
    try {
      const body = JSON.parse(atob(parts[1]));
      if (
        !lazy.JsonSchemaValidator.validate(body, ProxyPass.bodySchema).valid
      ) {
        throw new TypeError("Token body does not match schema");
      }
      this.#body = body;
    } catch (error) {
      throw new TypeError("Invalid token format: " + error.message);
    }
  }

  isValid(now = Temporal.Now.instant()) {
    // If the remaining duration is zero or positive, the pass is still valid.
    return (
      Temporal.Instant.compare(now, this.from) >= 0 &&
      Temporal.Instant.compare(now, this.until) < 0
    );
  }

  shouldRotate(now = Temporal.Now.instant()) {
    if (!this.isValid(now)) {
      return true;
    }
    return Temporal.Instant.compare(now, this.rotationTimePoint) >= 0;
  }

  get from() {
    // nbf is in seconds since epoch
    return Temporal.Instant.fromEpochMilliseconds(this.#body.nbf * 1000);
  }

  get until() {
    // exp is in seconds since epoch
    return Temporal.Instant.fromEpochMilliseconds(this.#body.exp * 1000);
  }

  /**
   * Parses a ProxyPass from a Response object.
   *
   * @param {Response} response
   * @returns {Promise<ProxyPass|null>} A promise that resolves to a ProxyPass instance or null if the response is invalid.
   */
  static async fromResponse(response) {
    // if the response is not 200 return null
    if (!response.ok) {
      console.error(
        `Failed to fetch proxy pass: ${response.status} ${response.statusText}`
      );
      return null;
    }

    try {
      // Parse JSON response
      const responseData = await response.json();
      const token = responseData?.token;

      if (!token || typeof token !== "string") {
        console.error("Missing or invalid token in response");
        return null;
      }
      return new ProxyPass(token);
    } catch (error) {
      console.error("Error parsing proxy pass response:", error);
      return null;
    }
  }
  /**
   * @type {Temporal.Instant} - The Point in time when the token should be rotated.
   */
  get rotationTimePoint() {
    return this.until.subtract(ProxyPass.ROTATION_TIME);
  }

  asBearerToken() {
    return `Bearer ${this.token}`;
  }
  // Rotate 2 Minutes from the End Time
  static ROTATION_TIME = Temporal.Duration.from({ minutes: 2 });

  static get bodySchema() {
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "JWT Claims",
      type: "object",
      properties: {
        sub: {
          type: "string",
          description: "Subject identifier",
        },
        aud: {
          type: "string",
          format: "uri",
          description: "Audience for which the token is intended",
        },
        iat: {
          type: "integer",
          description: "Issued-at time (seconds since Unix epoch)",
        },
        nbf: {
          type: "integer",
          description: "Not-before time (seconds since Unix epoch)",
        },
        exp: {
          type: "integer",
          description: "Expiration time (seconds since Unix epoch)",
        },
        iss: {
          type: "string",
          description: "Issuer identifier",
        },
      },
      required: ["sub", "aud", "iat", "nbf", "exp", "iss"],
      additionalProperties: true,
    };
  }
}

/**
 * Represents a user's Entitlement for the Proxy Service of Guardian.
 *
 * Right now any FxA user can have one entitlement.
 * If a user has an entitlement, they may access the proxy service.
 *
 * Immutable after creation.
 */
export class Entitlement {
  /** True if the User may Use the Autostart feature  */
  autostart = false;
  /** The date the entitlement was added to the user */
  created_at = new Date();
  /** True if the User has a limited bandwidth */
  limited_bandwidth = false;
  /** True if the User may Use the location controls */
  location_controls = false;
  /** True if the User has any valid subscription plan to the Mozilla VPN (not firefox VPN) */
  subscribed = false;
  /** The Guardian User ID */
  uid = 0;
  /** True if the User has website inclusion */
  website_inclusion = false;
  /** The maximum number of bytes allowed for the user */
  maxBytes = BigInt(0);

  constructor(
    args = {
      autostart: false,
      created_at: new Date().toISOString(),
      limited_bandwidth: false,
      location_controls: false,
      subscribed: false,
      uid: 0,
      website_inclusion: false,
      maxBytes: "0",
    }
  ) {
    const parsed = Date.parse(args.created_at);
    if (isNaN(parsed)) {
      throw new TypeError("created_at is not a valid date string");
    }
    this.autostart = args.autostart;
    this.limited_bandwidth = args.limited_bandwidth;
    this.location_controls = args.location_controls;
    this.website_inclusion = args.website_inclusion;
    this.subscribed = args.subscribed;
    this.uid = args.uid;
    this.created_at = new Date(parsed);
    this.maxBytes = BigInt(args.maxBytes);
    Object.freeze(this);
  }
  static fromResponse(response) {
    // if the response is not 200 return null
    if (!response.ok) {
      return null;
    }
    return response.json().then(data => {
      const result = lazy.JsonSchemaValidator.validate(
        data,
        Entitlement.schema
      );
      if (!result.valid) {
        return null;
      }
      return new Entitlement(data);
    });
  }

  static get schema() {
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      title: "Entitlement",
      type: "object",
      properties: {
        autostart: {
          type: "boolean",
          description: "True if the User may Use the Autostart feature",
        },
        created_at: {
          type: "string",
          description: "The date the entitlement was added to the user",
          format: "date-time", // ISO 8601
          pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$",
        },
        limited_bandwidth: {
          type: "boolean",
        },
        location_controls: {
          type: "boolean",
        },
        subscribed: {
          type: "boolean",
        },
        uid: {
          type: "integer",
        },
        website_inclusion: {
          type: "boolean",
        },
        maxBytes: {
          type: "string",
          description:
            "A BigInt string representing the maximum number of bytes allowed for the user",
        },
      },
      required: [
        "autostart",
        "created_at",
        "limited_bandwidth",
        "location_controls",
        "subscribed",
        "uid",
        "website_inclusion",
        "maxBytes",
      ],
      additionalProperties: true,
    };
  }

  toString() {
    return JSON.stringify({
      ...this,
      maxBytes: this.maxBytes.toString(),
      created_at: this.created_at.toISOString(),
    });
  }
}

/**
 * Represents usage tracking information for the Proxy Service.
 * Contains data about quota limits, remaining quota, and reset time.
 *
 * Immutable after creation.
 */
export class ProxyUsage {
  /** @type {bigint} - Maximum bytes allowed */
  max = BigInt(0);
  /** @type {bigint} - Remaining bytes available */
  remaining = BigInt(0);
  /** @type {Temporal.Instant} - When the usage quota resets */
  reset = null;

  /**
   * @param {string} max - Maximum bytes allowed (as string for BigInt parsing)
   * @param {string} remaining - Remaining bytes available (as string for BigInt parsing)
   * @param {string} reset - ISO 8601 timestamp when quota resets
   */
  constructor(max, remaining, reset) {
    this.max = BigInt(max);
    if (this.max < BigInt(0)) {
      throw new TypeError("max must be non-negative");
    }

    this.remaining = BigInt(remaining);
    if (this.remaining < BigInt(0)) {
      throw new TypeError("remaining must be non-negative");
    }

    if (this.remaining > this.max) {
      throw new TypeError("remaining cannot exceed max");
    }

    this.reset = Temporal.Instant.from(reset);

    Object.freeze(this);
  }

  static fromResponse(response) {
    const getOrThrow = headerName => {
      const value = response.headers.get(headerName);
      if (!value) {
        throw new TypeError(`Missing required header: ${headerName}`);
      }
      return value;
    };

    const quotaLimit = getOrThrow("X-Quota-Limit");
    const quotaRemaining = getOrThrow("X-Quota-Remaining");
    const quotaReset = getOrThrow("X-Quota-Reset");

    return new ProxyUsage(quotaLimit, quotaRemaining, quotaReset);
  }
}

/**
 * Maps the Guardian service endpoint to the public OAuth client ID.
 */
const CLIENT_ID_MAP = {
  "http://localhost:3000": "6089c54fdc970aed",
  "https://guardian-dev.herokuapp.com": "64ef9b544a31bca8",
  "https://dev.vpn.nonprod.webservices.mozgcp.net": "64ef9b544a31bca8",
  "https://stage.guardian.nonprod.cloudops.mozgcp.net": "e6eb0d1e856335fc",
  "https://stage.vpn.nonprod.webservices.mozgcp.net": "e6eb0d1e856335fc",
  "https://fpn.firefox.com": "e6eb0d1e856335fc",
  "https://vpn.mozilla.org": "e6eb0d1e856335fc",
};

/**
 * Adds a strong reference to keep listeners alive until
 * we're done with it.
 * (From kungFuDeathGrip in XPCShellContentUtils.sys.mjs)
 */
const listeners = new Set();

/**
 * Waits for a specific URL to be loaded in the browser.
 *
 * @param {*} browser - The browser instance to listen for URL changes.
 * @param {(location: string) => boolean} predicate - A function that returns true if the location matches the desired URL.
 * @returns {Promise<string>} A promise that resolves to the matching URL.
 */
async function waitUntilURL(browser, predicate) {
  const prom = Promise.withResolvers();
  let done = false;
  const check = arg => {
    if (done) {
      return;
    }
    if (predicate(arg)) {
      done = true;
      listeners.delete(listener);
      browser.removeProgressListener(listener);
      prom.resolve(arg);
    }
  };
  const listener = {
    QueryInterface: ChromeUtils.generateQI([
      "nsIWebProgressListener",
      "nsISupportsWeakReference",
    ]),

    // Runs the check after the document has stopped loading.
    onStateChange(webProgress, request, stateFlags, status) {
      request.QueryInterface(Ci.nsIChannel);

      if (
        webProgress.isTopLevel &&
        stateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
        status !== Cr.NS_BINDING_ABORTED
      ) {
        check(request.URI?.spec);
      }
    },

    // Unused callbacks we still need to implement:
    onLocationChange() {},
    onProgressChange() {},
    onStatusChange(_, request, status) {
      if (Components.isSuccessCode(status)) {
        return;
      }
      try {
        const url = request.QueryInterface(Ci.nsIChannel).URI.spec;
        check(url);
      } catch (ex) {}
    },
    onSecurityChange() {},
    onContentBlockingEvent() {},
  };
  listeners.add(listener);
  browser.addProgressListener(listener, Ci.nsIWebProgress.NOTIFY_STATE_WINDOW);
  const url = await prom.promise;
  return url;
}

let gConfig = {
  /**
   * Executes the callback with an FxA token and returns its result.
   * Destroys the token after use.
   *
   * @template T
   * @param {AbortSignal} abortSignal - An Abort Signal to abort the fetch.
   * @returns {Promise<{token:string} & Disposable>} - A disposable, that will auto revoke the token after use.
   */
  getToken: async (abortSignal = null) => {
    let tasks = [
      lazy.fxAccounts.getOAuthToken({
        scope: ["profile", "https://identity.mozilla.com/apps/vpn"],
      }),
    ];
    if (abortSignal) {
      abortSignal.throwIfAborted();
      tasks.push(
        new Promise((_, rej) => {
          abortSignal?.addEventListener("abort", rej, { once: true });
        })
      );
    }
    const token = await Promise.race(tasks);
    if (!token) {
      return null;
    }
    return {
      token,
      [Symbol.dispose]: () => {
        lazy.fxAccounts.removeCachedOAuthToken({
          token,
        });
      },
    };
  },
  guardianEndpoint: "",
  fxaOrigin: "",
};
XPCOMUtils.defineLazyPreferenceGetter(
  gConfig,
  "guardianEndpoint",
  "browser.ipProtection.guardian.endpoint",
  "https://vpn.mozilla.com"
);
XPCOMUtils.defineLazyPreferenceGetter(
  gConfig,
  "fxaOrigin",
  "identity.fxaccounts.remote.root"
);
