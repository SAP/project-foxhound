/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * @import { ChatConversation } from "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
 */

import { sanitizeUntrustedContent } from "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  ToolUI: "moz-src:///browser/components/aiwindow/ui/modules/ToolUI.sys.mjs",
});

/**
 * Finds tabs in active AI windows whose URLs are in validUrls.
 *
 * @param {Set<string>} validUrls
 * @returns {{ matchedTabs: Array<object>, topAIWin: object|null }}
 */
function findMatchingAIWindowTabs(validUrls) {
  const matchedTabs = [];
  let topAIWin = null;

  for (const win of lazy.BrowserWindowTracker.orderedWindows) {
    if (!lazy.AIWindow.isAIWindowActive(win) || win.closed || !win.gBrowser) {
      continue;
    }
    if (!topAIWin) {
      topAIWin = win;
    }
    for (const tab of win.gBrowser.tabs) {
      const url = tab.linkedBrowser?.currentURI?.spec;
      if (validUrls.has(url)) {
        matchedTabs.push({ tab, win, url, linkedPanel: tab.linkedPanel });
      }
    }
  }

  return { matchedTabs, topAIWin };
}

/**
 * Returns true if the matched tabs require user confirmation before acting
 * (pinned/selected tabs, current tab, all tabs of the top AI window, or
 * untrusted input).
 *
 * @param {Array<object>} tabs - list of tabs to check
 * @param {object} topAIWin - the top active AI window
 * @param {object} securityProperties - The security properties of the conversation.
 * @returns {boolean}
 */
function shouldRequireUserConfirmation(tabs, topAIWin, securityProperties) {
  if (securityProperties?.untrustedInput) {
    return true;
  }
  if (tabs.some(({ tab }) => tab.pinned === true)) {
    return true;
  }
  if (tabs.some(({ tab, win }) => win.gBrowser.selectedTab === tab)) {
    return true;
  }
  if (topAIWin) {
    const topWinTabs = new Set(
      tabs.filter(({ win }) => win === topAIWin).map(({ tab }) => tab)
    );
    if (
      topWinTabs.size &&
      topAIWin.gBrowser.tabs.every(tab => topWinTabs.has(tab))
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Handles the close_tabs action of manage_tabs: resolves URL tokens to
 * open tabs, then either prompts for confirmation or closes them.
 *
 * @param {{ validUrls: Set<string>, ask_confirmation: boolean }} params
 * @param {ChatConversation} conversation
 * @returns {Promise<object>}
 */
export async function closeTabsAction(
  { validUrls, ask_confirmation },
  conversation
) {
  const { matchedTabs, topAIWin } = findMatchingAIWindowTabs(validUrls);

  if (!matchedTabs.length) {
    return {
      toolResult: "Error: None of the provided URL tokens match an open tab.",
      uiData: null,
    };
  }

  const tabs = matchedTabs.map(({ tab, win, url, linkedPanel }) => ({
    linkedPanel,
    url,
    title: sanitizeUntrustedContent(tab.label),
    userContextId: tab.userContextId,
    pinned: tab.pinned,
    selected: win.gBrowser.selectedTab === tab,
    iconSrc: url ? `page-icon:${url}` : "",
    checked: true,
  }));

  const summarizedTabInfo = tabs.map(({ url, title, checked }) => ({
    url,
    title,
    checked,
  }));

  if (
    ask_confirmation ||
    shouldRequireUserConfirmation(
      matchedTabs,
      topAIWin,
      conversation.securityProperties
    )
  ) {
    return {
      toolResult: {
        description:
          "The following tabs were found. User confirmation is required to close them.",
        pending: true,
        action: "close_tabs",
        selectedTabs: summarizedTabInfo,
      },
      uiData: {
        uiType: "website-confirmation",
        properties: { tabs },
      },
    };
  }

  const result = await lazy.ToolUI.closeSelectedTabs(tabs, topAIWin);
  if (!result || !result.operationId) {
    return { toolResult: "Error: Failed to close tabs.", uiData: null };
  }

  const failedPanels = new Set(
    (result.failedTabs ?? [])
      .map(failedTab => failedTab.tab?.linkedPanel)
      .filter(Boolean)
  );
  const closedTabs = tabs.map(({ url, title, linkedPanel }) => ({
    url,
    title,
    closed: !failedPanels.has(linkedPanel),
  }));

  const failedCount = closedTabs.filter(tab => !tab.closed).length;
  return {
    toolResult: {
      description: failedCount
        ? `Some tabs failed to close (${failedCount} of ${tabs.length}).`
        : "Tabs were successfully closed.",
      selectedTabs: closedTabs,
    },
    uiData: {
      uiType: "ai-action-result",
      properties: {
        confirmedData: {
          selectedTabs: tabs,
          operationId: result.operationId,
          actionTimestamp: Date.now(),
        },
      },
    },
  };
}
