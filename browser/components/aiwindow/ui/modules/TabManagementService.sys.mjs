/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { SessionStore } from "resource:///modules/sessionstore/SessionStore.sys.mjs";

const lazy = {};

ChromeUtils.defineLazyGetter(lazy, "console", () =>
  console.createInstance({
    prefix: "TabManagementService",
  })
);

/**
 * Service for managing browser tabs from AI Window UI components.
 *
 * This service closes tabs using gBrowser.removeTab(), allowing Firefox's
 * native SessionStore machinery to keep the actual closed-tab restore state.
 *
 * The service only stores lightweight operation metadata so the AI Window can
 * target a specific close operation when the user clicks "Undo".
 */
export class TabManagementService {
  /**
   * Constructor allows dependency injection for testing.
   *
   * @param {object} sessionStore - Optional SessionStore instance for testing
   */
  constructor(sessionStore = null) {
    this.#sessionStore = sessionStore || SessionStore;
  }

  /**
   * SessionStore instance (real or mock)
   */
  #sessionStore;
  /**
   * Map of operation ID to close-operation metadata.
   *
   * Structure:
   * Map<string, {
   *   closedTabs: Array<{
   *     // Tab identification
   *     tabId: string | null,        // Custom tab ID if assigned
   *     url: string | null,           // Tab URL (primary matching key)
   *     title: string,                // Tab title for display
   *     userContextId: number,        // Container ID (0 = default, >0 = container)
   *
   *     // Operation metadata
   *     operationTimestamp: number    // When this close operation occurred
   *   }>,
   *   timestamp: number               // When operation was stored
   * }>
   *
   * Note: This only stores lightweight metadata for matching tabs in SessionStore.
   * The actual restore data (history, scroll position, form data, etc.) remains
   * in SessionStore's closed-tab list.
   */
  #recentCloseOperations = new Map();

  /**
   * Maximum number of close operations to remember for undo.
   */
  #MAX_STORED_OPERATIONS = 10;

  /**
   * Counter for generating unique operation IDs.
   */
  #operationCounter = 0;

  /**
   * Restores tabs closed by a specific operation.
   *
   * @param {object} options
   * @param {string} options.operationId - ID returned from closeTabs()
   * @param {Window} options.window - Browser window to restore tabs in
   * @returns {Promise<object>} Restore summary
   */
  async restoreTabs({ operationId, window }) {
    if (!window?.gBrowser) {
      throw new Error("Invalid browser window provided");
    }

    const operation = this.#recentCloseOperations.get(operationId);

    if (!operation) {
      lazy.console.warn(`No stored tab-close operation found: ${operationId}`);

      return {
        restoredTabs: [],
        restoredCount: 0,
        requestedCount: 0,
        failedTabs: [],
      };
    }

    const restoredTabs = [];
    const failedTabs = [];

    // Remember the currently selected tab to switch back to it after restoration
    const originalSelectedTab = window.gBrowser.selectedTab;

    for (const closedOperationTab of operation.closedTabs) {
      try {
        const closedTabIndex = this.#findClosedTabIndexForOperationTab(
          window,
          closedOperationTab
        );

        if (closedTabIndex == null) {
          failedTabs.push({
            tab: closedOperationTab,
            reason: "matching-closed-tab-not-found",
          });
          continue;
        }

        const restoredTab = this.#sessionStore.undoCloseTab(
          window,
          closedTabIndex
        );

        if (restoredTab) {
          restoredTabs.push(restoredTab);
        } else {
          failedTabs.push({
            tab: closedOperationTab,
            reason: "undo-returned-null",
          });
        }
      } catch (error) {
        lazy.console.error(
          `Failed to restore tab ${closedOperationTab.url}:`,
          error
        );
        failedTabs.push({
          tab: closedOperationTab,
          reason: "exception",
          message: error.message,
        });
      }
    }

    // Switch back to the originally selected tab to keep restorations in background
    if (
      originalSelectedTab &&
      window.gBrowser.tabs.includes(originalSelectedTab)
    ) {
      window.gBrowser.selectedTab = originalSelectedTab;
    }

    // Only delete the operation if all tabs were successfully restored
    if (!failedTabs.length) {
      this.#recentCloseOperations.delete(operationId);
    }

    return {
      restoredTabs,
      restoredCount: restoredTabs.length,
      requestedCount: operation.closedTabs.length,
      failedTabs,
    };
  }

  /**
   * Stores metadata for a close operation.
   *
   * The actual restore data is owned by SessionStore. This metadata is only
   * used to find the matching closed-tab entries later.
   *
   * @param {object} options
   * @param {Array<object>} options.closedTabs
   * @returns {string|null}
   */
  storeClosedTabsForUndo({ closedTabs }) {
    if (!closedTabs?.length) {
      return null;
    }

    this.#operationCounter++;
    const operationId = `tab-close-${this.#operationCounter}`;

    if (this.#recentCloseOperations.size >= this.#MAX_STORED_OPERATIONS) {
      const oldestId = this.#recentCloseOperations.keys().next().value;
      this.#recentCloseOperations.delete(oldestId);
    }

    this.#recentCloseOperations.set(operationId, {
      closedTabs,
      timestamp: Date.now(),
    });

    return operationId;
  }

  /**
   * Gets stored metadata for a close operation.
   *
   * @param {string} operationId
   * @returns {object|null}
   */
  getStoredTabsForUndo(operationId) {
    return this.#recentCloseOperations.get(operationId) || null;
  }

  /**
   * Closes tabs based on provided tab data.
   *
   * @param {object} options
   * @param {Array<Tab>} options.tabs - Array of tab objects
   * @param {Window} options.window - Browser window containing the tabs
   * @returns {Promise<object>} Close summary
   */
  async closeTabs({ tabs, window }) {
    if (!tabs?.length) {
      lazy.console.warn("No tabs to close");

      return {
        requestedCount: 0,
        operationId: null,
        failedTabs: [],
      };
    }

    if (!window?.gBrowser) {
      throw new Error("Invalid browser window provided");
    }

    const failedTabs = [];
    const tabsToClose = this.#validateTabsForClosing(tabs, window, failedTabs);

    const { closedTabs, error } = await this.#performTabClosing(
      tabsToClose,
      window
    );

    let operationId = null;
    if (closedTabs.length) {
      operationId = this.storeClosedTabsForUndo({ closedTabs });
    }

    if (error) {
      lazy.console.error("Failed to close tabs:", error);
      failedTabs.push({
        reason: "exception",
        message: error.message,
      });
    }

    return {
      requestedCount: tabs.length,
      operationId,
      failedTabs,
    };
  }

  /**
   * Validates tabs and filters out invalid ones.
   *
   * @param {Array<Tab>} tabs - Tabs to validate
   * @param {Window} window - Browser window
   * @param {Array} failedTabs - Array to collect failed tabs
   * @returns {Array<Tab>} Valid tabs that can be closed
   * @private
   */
  #validateTabsForClosing(tabs, window, failedTabs) {
    return tabs.filter(tab => {
      const tabInWindow = tab?.linkedBrowser && tab.documentGlobal === window;

      if (!tabInWindow) {
        failedTabs.push({
          tab,
          reason: "invalid-tab",
        });
        return false;
      }

      if (tab.closing) {
        failedTabs.push({
          tab,
          reason: "already-closing",
        });
        return false;
      }

      return true;
    });
  }

  /**
   * Actually closes the validated tabs.
   *
   * @param {Array<Tab>} tabsToClose - Validated tabs to close
   * @param {Window} window - Browser window
   * @returns {Promise<object>} Object with closedTabs, and error (if any)
   * @private
   */
  async #performTabClosing(tabsToClose, window) {
    const closedTabs = [];
    let error = null;

    try {
      const operationTimestamp = Date.now();

      for (const browserTab of tabsToClose) {
        /**
         * Store lightweight metadata immediately before closing.
         *
         * SessionStore remains the source of truth for the actual restore data.
         */
        closedTabs.push({
          ...this.#getTabInfo(browserTab),
          operationTimestamp,
        });

        window.gBrowser.removeTab(browserTab);
      }
    } catch (err) {
      error = err;
    }

    return { closedTabs, error };
  }

  #compareClosedTabTimestamps(matches, operationTimestamp) {
    const targetTime = operationTimestamp || 0;
    let bestMatch = matches[0];
    let smallestDiff = Math.abs(bestMatch.closedAt - targetTime);

    for (const match of matches.slice(1)) {
      const diff = Math.abs(match.closedAt - targetTime);
      if (diff < smallestDiff) {
        smallestDiff = diff;
        bestMatch = match;
      }
    }

    return bestMatch.index;
  }

  /**
   * Finds the current SessionStore closed-tab index for a tab that belonged
   * to a specific close operation.
   *
   * @param {Window} window - Browser window
   * @param {object} operationTab - Tab metadata from the close operation
   * @returns {number|null} Index in SessionStore's closed-tab list, or null if not found
   * @private
   */
  #findClosedTabIndexForOperationTab(window, operationTab) {
    const closedTabData = this.#getClosedTabData(window);

    const matches = [];
    for (const [index, closedTab] of closedTabData.entries()) {
      if (this.#closedTabMatchesOperationTab(closedTab, operationTab)) {
        // SessionStore stores closedAt timestamp in milliseconds
        const closedAt = closedTab.closedAt || closedTab.state?.closedAt || 0;
        matches.push({ index, closedAt });
      }
    }

    if (!matches.length) {
      return null;
    }

    if (matches.length === 1) {
      return matches[0].index;
    }

    return this.#compareClosedTabTimestamps(
      matches,
      operationTab.operationTimestamp
    );
  }

  /**
   * Checks whether a SessionStore closed-tab entry matches a tab from this
   * close operation.
   *
   * @param {object} closedTab - SessionStore closed-tab entry
   * @param {object} operationTab - Tab metadata from the close operation
   * @returns {boolean} True if tabs match
   */
  #closedTabMatchesOperationTab(closedTab, operationTab) {
    const closedTabInfo = this.#normalizeClosedTab(closedTab);
    if (!closedTabInfo.url || !operationTab.url) {
      return false;
    }
    const urlsMatch = operationTab.url === closedTabInfo.url;
    const userContextIdsMatch =
      closedTabInfo.userContextId === operationTab.userContextId;

    return urlsMatch && userContextIdsMatch;
  }

  /**
   * Reads closed-tab data from SessionStore.
   *
   * @param {Window} window
   * @returns {Array<object>}
   * @private
   */
  #getClosedTabData(window) {
    const closedTabData = this.#sessionStore.getClosedTabDataForWindow(window);
    return Array.isArray(closedTabData) ? closedTabData : [];
  }

  /**
   * Normalizes a SessionStore closed-tab entry into the small amount of data
   * this service needs for matching.
   *
   * @param {object} closedTab - SessionStore closed-tab entry
   * @returns {{
   *   url: string | null,
   *   title: string | null,
   *   userContextId: number,
   *   pinned: boolean | null
   * }} Normalized tab data for matching
   * @private
   */
  #normalizeClosedTab(closedTab) {
    const state = closedTab?.state ?? closedTab ?? {};
    const entries = state.entries ?? [];

    // SessionStore uses 1-based indices.
    const activeIndex = Math.max((state.index ?? 1) - 1, 0);
    const activeEntry = entries[activeIndex] ?? entries.at?.(-1);
    const url = activeEntry?.url ?? state.url ?? null;
    const title = activeEntry?.title ?? state.title ?? closedTab?.title ?? null;

    const userContextId =
      state.userContextId ??
      state.originAttributes?.userContextId ??
      closedTab?.userContextId ??
      0;

    const pinned = typeof state.pinned === "boolean" ? state.pinned : null;

    return { url, title, userContextId, pinned };
  }

  /**
   * Creates lightweight tab info for UI/model disambiguation and later
   * SessionStore matching.
   *
   * @param {Tab} tab - Firefox tab object
   * @returns {{
   *   tabId: string | null,
   *   url: string | null,
   *   title: string,
   *   userContextId: number
   * }} Minimal tab metadata needed for matching
   * @private
   */
  #getTabInfo(tab) {
    const browser = tab.linkedBrowser;
    const principal = browser.contentPrincipal;
    const userContextId =
      principal?.originAttributes?.userContextId || tab.userContextId || 0;

    return {
      tabId: tab.getAttribute("data-tab-id") || null,
      url: browser.currentURI?.spec || null,
      title: tab.label,
      userContextId,
    };
  }
}

export const tabManagementService = new TabManagementService();
