/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// @ts-nocheck - TODO - Remove this to type check this file.

/**
 * Security utilities for Firefox Smart Window security layer.
 *
 * This module provides:
 * - URL normalization for consistent comparison
 * - eTLD+1 (effective top-level domain) validation
 * - TabLedger: Per-tab trusted URL storage
 * - SessionLedger: Container for all tab ledgers in a Smart Window session
 *
 * Security Model:
 * ---------------
 * - Each tab maintains its own ledger of trusted URLs
 * - Request-scoped context merges current tab + @mentioned tabs
 * - URLs are normalized before storage and comparison
 * - Same eTLD+1 validation prevents injection via canonical/og:url
 */

/** TTL for ledger entries (30 minutes) */
const DEFAULT_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** Max URLs per tab (prevents memory exhaustion) */
const MAX_URLS_PER_TAB = 1000;

/** Tracking params to strip during normalization */
const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "msclkid",
  "mc_eid",
  "_ga",
  // Note: utm_* params are handled via startsWith() pattern below
]);

/**
 * Normalizes a URL for consistent comparison.
 *
 * Ensures the same logical URL always produces the same normalized string,
 * regardless of superficial differences like:
 * - Default ports (https://example.com:443 → https://example.com)
 * - Fragments (https://example.com#section → https://example.com)
 * - Query param order (sorted alphabetically)
 * - Tracking params (utm_*, fbclid, etc. are stripped)
 * - Case differences in hostname
 *
 * @param {string} urlString - URL to normalize
 * @param {string} [baseUrl] - Base URL for relative resolution
 * @returns {object} { success, url?, error? }
 */
export function normalizeUrl(urlString, baseUrl = null) {
  if (!urlString || !String(urlString).trim()) {
    return {
      success: false,
      error: "Empty URL",
    };
  }

  try {
    let url;
    try {
      url = baseUrl ? new URL(urlString, baseUrl) : new URL(urlString);
    } catch (parseError) {
      return {
        success: false,
        error: "Invalid URL format",
      };
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return {
        success: false,
        error: `Unsupported scheme: ${url.protocol}`,
      };
    }

    const cleanedParams = new URLSearchParams();

    for (const [key, value] of url.searchParams) {
      if (key.startsWith("utm_") || TRACKING_PARAMS.has(key)) {
        continue;
      }
      cleanedParams.append(key, value);
    }

    cleanedParams.sort();
    const search = cleanedParams.toString();

    let normalizedUrl = `${url.protocol}//${url.hostname}`;

    if (url.port) {
      normalizedUrl += `:${url.port}`;
    }

    normalizedUrl += url.pathname;

    if (search) {
      normalizedUrl += `?${search}`;
    }

    return {
      success: true,
      url: normalizedUrl,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error),
    };
  }
}

/**
 * Per-tab storage for trusted URLs.
 *
 * Each tab maintains its own ledger of URLs that are authorized for
 * security-sensitive operations. URLs are stored with expiration timestamps
 * and the ledger enforces size limits to prevent memory exhaustion.
 */
export class TabLedger {
  /**
   * Creates a new tab ledger.
   *
   * @param {string} tabId - The tab identifier
   */
  constructor(tabId) {
    this.tabId = tabId;
    this.ttlMs = DEFAULT_TTL_MS;
    this.maxUrls = MAX_URLS_PER_TAB;

    /** @type {Map<string, number>} URL --> expiration timestamp */
    this.urls = new Map();

    /** @type {number} Last cleanup timestamp */
    this.lastCleanup = ChromeUtils.now();
  }

  /**
   * Seeds the ledger with initial URLs.
   *
   * Behavior:
   * - Runs cleanup of expired entries before adding
   * - Invalid URLs are skipped silently (no error thrown)
   * - Stops adding when maxUrls limit is reached
   * - Each URL expires after TTL (default 30 minutes)
   *
   * @param {string[]} urls - URLs to seed
   * @param {string} [baseUrl] - Optional base URL for resolving relative URLs
   */
  seed(urls, baseUrl = null) {
    const startTime = ChromeUtils.now();
    this.#cleanup();

    const now = ChromeUtils.now();
    const expiresAt = now + this.ttlMs;

    for (const url of urls) {
      if (this.urls.size >= this.maxUrls) {
        break;
      }

      const normalized = normalizeUrl(url, baseUrl);
      if (normalized.success) {
        this.urls.set(normalized.url, expiresAt);
      }
    }

    this.lastCleanup = now;

    ChromeUtils.addProfilerMarker(
      "ML.Security.TabLedger.seed",
      { startTime },
      `TabLedger.seed for ${urls?.length} urls and tabId: ${this.tabId}`
    );
  }

  /**
   * Adds a single URL to the ledger.
   *
   * @param {string} url - URL to add
   * @param {string} [baseUrl] - Optional base URL for resolving relatives
   * @returns {boolean} True if added successfully, false if invalid or at capacity
   */
  add(url, baseUrl = null) {
    this.#cleanup();

    if (this.urls.size >= this.maxUrls) {
      return false;
    }

    const normalized = normalizeUrl(url, baseUrl);
    if (!normalized.success) {
      return false;
    }

    const expiresAt = ChromeUtils.now() + this.ttlMs;
    this.urls.set(normalized.url, expiresAt);

    return true;
  }

  /**
   * Returns the normalized URL if it is in the ledger and not expired.
   *
   * @param {string} url - URL to check (will be normalized)
   * @param {string} [baseUrl] - Optional base URL for resolving relatives
   * @returns {string|null} Normalized URL if valid, otherwise null
   */
  lookup(url, baseUrl = null) {
    const startTime = ChromeUtils.now();
    let result = null;

    const normalized = normalizeUrl(url, baseUrl);
    if (normalized.success) {
      const expiresAt = this.urls.get(normalized.url);
      if (expiresAt !== undefined) {
        if (ChromeUtils.now() > expiresAt) {
          this.urls.delete(normalized.url);
        } else {
          result = normalized.url;
        }
      }
    }

    ChromeUtils.addProfilerMarker(
      "ML.Security.TabLedger.lookup",
      { startTime },
      `TabLedger.lookup for url ${url} and tabId: ${this.tabId}`
    );

    return result;
  }

  /**
   * Clears all URLs from the ledger.
   * Typically called on tab navigation or tab close.
   */
  clear() {
    this.urls.clear();
    this.lastCleanup = ChromeUtils.now();
  }

  /**
   * Returns the number of URLs currently in the ledger (including expired).
   *
   * @returns {number} Number of URLs
   */
  size() {
    return this.urls.size;
  }

  /**
   * Removes expired entries from the ledger.
   * Called automatically during add() and can be called manually.
   *
   * @private
   */
  #cleanup() {
    const now = ChromeUtils.now();
    for (const [url, expiresAt] of this.urls) {
      if (now > expiresAt) {
        this.urls.delete(url);
      }
    }
    this.lastCleanup = now;
  }

  /**
   * Returns all URLs currently in the ledger (expired entries removed).
   *
   * @returns {string[]} Array of URLs
   */
  getAll() {
    this.#cleanup();

    return Array.from(this.urls.keys());
  }
}

/**
 * Container for all tab ledgers in an AI Window session.
 *
 * A session represents a single AI Window instance. Each AI Window
 * creates its own SessionLedger when opened. The session ends when the AI
 * Window is closed.
 *
 * SessionLedger manages the lifecycle of individual TabLedgers and provides
 * methods to build request-scoped contexts by merging tab ledgers.
 *
 * Lifetime: SessionLedger is ephemeral and in-memory only. It is scoped to
 * the current browser session and cleared on restart. Ledgers are not
 * persisted to disk or restored via session restore.
 */
export class SessionLedger {
  /**
   * Creates a new session ledger.
   *
   * @param {string} sessionId - The Smart Window session identifier
   */
  constructor(sessionId) {
    this.sessionId = sessionId;

    /** @type {Map<string, TabLedger>} Map of tab ID --> TabLedger */
    this.tabs = new Map();
  }

  /**
   * Gets or creates a TabLedger for the specified tab.
   *
   * @param {string} tabId - The tab identifier
   * @returns {TabLedger} The tab's ledger
   */
  forTab(tabId) {
    if (!this.tabs.has(tabId)) {
      this.tabs.set(tabId, new TabLedger(tabId));
    }
    return this.tabs.get(tabId);
  }

  /**
   * Merges ledgers from multiple tabs into a temporary request-scoped ledger.
   *
   * This is used to build context for requests with @mentions, where the user
   * explicitly authorizes access to multiple tabs.
   *
   * IMPORTANT: The returned merged ledger is a temporary view. It should be
   * used for a single request and then discarded. It does NOT support add()
   * operations (read-only for policy evaluation).
   *
   * @param {string[]} tabIds - Tab IDs to merge (typically current + @mentioned)
   * @returns {object} Merged ledger with has() and size() methods
   */
  merge(tabIds) {
    const mergedUrls = new Set();

    for (const tabId of tabIds) {
      const ledger = this.forTab(tabId);
      const now = ChromeUtils.now();

      for (const [url, expiresAt] of ledger.urls) {
        if (now <= expiresAt) {
          mergedUrls.add(url);
        }
      }
    }

    // Return a temporary read-only ledger
    return {
      /**
       * Returns the normalized URL if it is in any of the merged ledgers.
       *
       * @param {string} url - URL to check
       * @param {string} [baseUrl] - Optional base URL
       * @returns {string|null} Normalized URL if found, otherwise null
       */
      lookup(url, baseUrl = null) {
        const normalized = normalizeUrl(url, baseUrl);
        if (!normalized.success) {
          return null;
        }

        if (!mergedUrls.has(normalized.url)) {
          return null;
        }

        return normalized.url;
      },

      /**
       * Returns number of unique URLs in merged ledger.
       *
       * @returns {number} Number of URLs
       */
      size() {
        return mergedUrls.size;
      },
    };
  }

  /**
   * Removes a tab's ledger completely.
   * Typically called when tab closes.
   *
   * @param {string} tabId - The tab identifier
   */
  removeTab(tabId) {
    this.tabs.delete(tabId);
  }

  /** Clears all tab ledgers. */
  clearAll() {
    for (const ledger of this.tabs.values()) {
      ledger.clear();
    }
    this.tabs.clear();
  }

  /** @returns {number} Number of tabs */
  tabCount() {
    return this.tabs.size;
  }
}
