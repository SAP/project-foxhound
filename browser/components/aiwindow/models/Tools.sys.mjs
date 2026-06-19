/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * This file contains LLM tool abstractions and tool definitions.
 */

/**
 * @import { ChatConversation } from "moz-src:///browser/components/aiwindow/ui/modules/ChatConversation.sys.mjs"
 */

import { searchBrowsingHistory as implSearchBrowsingHistory } from "moz-src:///browser/components/aiwindow/models/SearchBrowsingHistory.sys.mjs";
import { WCSMerinoClient } from "moz-src:///browser/components/aiwindow/models/WCSMerinoClient.sys.mjs";
import { PageExtractorParent } from "resource://gre/actors/PageExtractorParent.sys.mjs";
import {
  ChatStore,
  MESSAGE_ROLE,
} from "moz-src:///browser/components/aiwindow/ui/modules/ChatStore.sys.mjs";
import {
  sanitizeUntrustedContent,
  isNewPageUrl,
} from "moz-src:///browser/components/aiwindow/models/ChatUtils.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
  SmartWindowNavigationInfo:
    "moz-src:///browser/components/aiwindow/models/SmartWindowNavigationInfo.sys.mjs",
  // @todo Bug 2009194
  // PageDataService:
  //   "moz-src:///browser/components/pagedata/PageDataService.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "console", () =>
  console.createInstance({
    prefix: "Conversation",
    maxLogLevelPref: "browser.smartwindow.conversation.logLevel",
  })
);

// Important! Changing or removing this value requires a security review.
//
// Hard code a reasonable working limit for how many tabs that a language model can retrieve.
// The metadata from each tab contains untrusted text content that we limit (for instance
// with truncation) in order to treat this information as trusted.
//
// We also make this limited in a non-configurable way so that it reduces the risk
// of exfiltration for private data. While most users only have a few tabs open at a time,
// some users can have thousands of tabs open at once.
const MAX_TABS = 15;

// Allow list of URL protocols for tabs and pages exposed to the LLM. Only http/https are
// permitted; internal (about:, chrome:, moz-extension:, file:, data:, etc.)
const ALLOWED_URL_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedURL(url) {
  try {
    return ALLOWED_URL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

// Important! Changing or removing this value requires a security review.
//
// Hard code a reasonable working limit for how many history results that a language model
// can retrieve. The metadata from each of these history items contains untrusted text
// content that we limit (for instance with truncation) in order to treat this information
// as trusted.
//
// We also make this limited in a non-configurable way so that it reduces the risk
// of exfiltration for private data. A language model that can make arbitrary requests
// through prompt injection could leak the contents of a user's entire history.
const MAX_HISTORY_RESULTS = 15;

export const GET_OPEN_TABS = "get_open_tabs";
export const SEARCH_BROWSING_HISTORY = "search_browsing_history";
export const GET_PAGE_CONTENT = "get_page_content";
export const RUN_SEARCH = "run_search";
export const GET_USER_MEMORIES = "get_user_memories";
export const GET_NAVIGATION_INFO = "get_navigation_info";
export const WORLD_CUP_MATCHES = "world_cup_matches";
export const WORLD_CUP_LIVE = "world_cup_live";

// Tools gated behind a feature pref. Filtered out of the model's tool list
// in Chat.sys.mjs when the pref is off.
export const WORLD_CUP_TOOLS = new Set([WORLD_CUP_MATCHES, WORLD_CUP_LIVE]);
export const WORLD_CUP_PREF = "browser.smartwindow.worldcup.enabled";

export const TOOLS = [
  GET_OPEN_TABS,
  SEARCH_BROWSING_HISTORY,
  GET_PAGE_CONTENT,
  RUN_SEARCH,
  GET_USER_MEMORIES,
  GET_NAVIGATION_INFO,
  WORLD_CUP_MATCHES,
  WORLD_CUP_LIVE,
];

export const RUN_SEARCH_VERBATIM_QUERY_DESCRIPTION =
  "Perform a web search using the browser's default search engine and return " +
  "the search results page content. Use this when the user needs current web " +
  "information that would benefit from a live search. This tool uses the current user message as the query.";

export const RUN_SEARCH_GENERATED_QUERY_DESCRIPION =
  "Perform a web search using the browser's default search engine and return " +
  "the search results page content. Use this when the user needs current web " +
  "information that would benefit from a live search.";

const RUN_SEARCH_TOOL_CONFIG_VERBATIM_QUERY = {
  type: "function",
  function: {
    name: RUN_SEARCH,
    description: RUN_SEARCH_VERBATIM_QUERY_DESCRIPTION,
    parameters: {
      type: "object",
      properties: {},
    },
  },
};

const RUN_SEARCH_TOOL_CONFIG_GENERATED_QUERY = {
  type: "function",
  function: {
    name: RUN_SEARCH,
    description: RUN_SEARCH_GENERATED_QUERY_DESCRIPION,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The search query to execute. Should be specific and search-engine optimized.",
        },
      },
      required: ["query"],
    },
  },
};

export const toolsConfig = [
  {
    type: "function",
    function: {
      name: GET_OPEN_TABS,
      description:
        `Access the user's browser and return up to ${MAX_TABS} currently open tabs, ` +
        "ordered by most recently viewed.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: SEARCH_BROWSING_HISTORY,
      description:
        "Retrieve pages from the user's past browsing history, optionally filtered by " +
        "topic and/or time range.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description:
              "A concise phrase describing what the user is trying to find in their " +
              "browsing history (topic, site, or purpose).",
          },
          startTs: {
            type: "string",
            description:
              "Inclusive start of the time range as a local ISO 8601 datetime " +
              "('YYYY-MM-DDTHH:mm:ss', no timezone).",
          },
          endTs: {
            type: "string",
            description:
              "Inclusive end of the time range as a local ISO 8601 datetime " +
              "('YYYY-MM-DDTHH:mm:ss', no timezone).",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: GET_PAGE_CONTENT,
      description:
        "Retrieve cleaned text content of all the provided browser page URL Tokens in the list.",
      parameters: {
        type: "object",
        properties: {
          url_list: {
            type: "array",
            items: {
              type: "string",
              description:
                "A URL token that appeared in the conversation, formatted as §url_token: DOMAIN_TLD_PATH_n§. " +
                "Do NOT fabricate tokens. Only use tokens from user messages and tool results.",
            },
            minItems: 1,
            description: "List of URL tokens to fetch content from.",
          },
        },
        required: ["url_list"],
      },
    },
  },
  RUN_SEARCH_TOOL_CONFIG_VERBATIM_QUERY,
  {
    type: "function",
    function: {
      name: GET_NAVIGATION_INFO,
      description:
        "Find relevant Firefox preferences pages based on a user query. " +
        "Use this when the user asks where to find a setting, how to configure something in " +
        "Firefox, or where to manage Smart Window features like memories.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "A natural-language description of what the user is looking for, " +
              "e.g. 'where to manage memories' or 'privacy settings'.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: GET_USER_MEMORIES,
      description:
        'Retrieves all memories saved about the user to answer questions like "What do you know about me?", "What memories have you saved?", "What do you remember about me?", etc. Respond to the user that these are memories.',
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: WORLD_CUP_MATCHES,
      description:
        "Retrieve World Cup soccer matches in a 14-day window centered on a date. " +
        "Returns matches grouped into previous (older), current (on the date), and " +
        "next (newer). Use this for questions about results, fixtures, schedules, " +
        "scores from a recent or upcoming day, or how a specific team is doing. " +
        "Prefer this over a web search for World Cup match data.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description:
              "Center of the +/-7 day window as RFC date 'YYYY-MM-DD'. " +
              "Omit to default to today (UTC).",
          },
          teams: {
            type: "string",
            description:
              "Comma-separated 3-letter team keys to filter on, e.g. 'BRA,ARG'. " +
              "Omit to include all teams.",
          },
          limit: {
            type: "integer",
            description:
              "Maximum number of matches to return across the three buckets. " +
              "Omit unless the user asks for a small number.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: WORLD_CUP_LIVE,
      description:
        "Retrieve World Cup soccer matches that are currently in progress. " +
        "Use this when the user asks what's playing now, the live score, or " +
        "what's happening right now in the World Cup.",
      parameters: {
        type: "object",
        properties: {
          teams: {
            type: "string",
            description:
              "Comma-separated 3-letter team keys to filter on, e.g. 'BRA,ARG'. " +
              "Omit to include all live matches.",
          },
        },
      },
    },
  },
];

/**
 * Metadata about a Tab used in chat conversations.
 *
 * @typedef {object} TabInfo
 * @property {string} url - The url of the tab.
 * @property {string} title - Title of the tab.
 * @property {number} lastAccessed - When the tab was last accessed in milliseconds.
 */

/**
 * Retrieves a list of the latest open tabs from the current active browser window.
 * Tabs are sorted by most recently accessed and limited to MAX_TABS results.
 * Only includes tabs with http/https URLs.
 *
 * @param {ChatConversation} conversation
 * @returns {Promise<Array<TabInfo>>}
 */
export async function getOpenTabs(conversation) {
  // No security check needed. The security checks prevent data exfiltration,
  // which requires external communication. This tool makes no external requests.

  const startTime = ChromeUtils.now();

  /** @type {Array<TabInfo>} */
  const tabs = [];

  for (const win of lazy.BrowserWindowTracker.orderedWindows) {
    if (!lazy.AIWindow.isAIWindowActive(win)) {
      continue;
    }

    if (!win.closed && win.gBrowser) {
      for (const tab of win.gBrowser.tabs) {
        const browser = tab.linkedBrowser;
        const url = browser?.currentURI?.spec;
        const title = tab.label;

        if (isAllowedURL(url) && !isNewPageUrl(url)) {
          tabs.push({
            url,
            title: sanitizeUntrustedContent(title),
            lastAccessed: tab.lastAccessed,
          });
        }
      }
    }
  }

  tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);

  const recentTabs = tabs.slice(0, MAX_TABS);

  // Tab titles are truncated to 100 characters and therefore not expected to
  // contain enough untrusted data for a prompt injection attack.
  conversation.securityProperties.setPrivateData();
  lazy.console.log("[Tool] getOpenTabs", recentTabs);

  conversation.addSeenUrls(recentTabs.map(({ url }) => url));

  ChromeUtils.addProfilerMarker(
    "SmartWindow",
    { startTime },
    `Tool:get_open_tabs(${recentTabs.length})`
  );

  return recentTabs;
}

/**
 * Tool entrypoint for search_browsing_history.
 *
 * Parameters (defaults shown):
 * - searchTerm: ""        - string used for search
 * - startTs: null         - local ISO timestamp lower bound, or null
 * - endTs: null           - local ISO timestamp upper bound, or null
 * Detailed behavior and implementation are in SearchBrowsingHistory.sys.mjs.
 *
 * @param {object} toolParams
 *  The search parameters.
 * @param {string} toolParams.searchTerm
 *  The search string. If null or empty, semantic search is skipped and
 *  results are filtered by time range and sorted by last_visit_date and frecency.
 * @param {string|null} toolParams.startTs
 *  Optional local ISO-8601 start timestamp (e.g. "2025-11-07T09:00:00").
 * @param {string|null} toolParams.endTs
 *  Optional local ISO-8601 end timestamp (e.g. "2025-11-07T09:00:00").
 * @param {number} toolParams.historyLimit
 *  Maximum number of history results to return.
 * @param {ChatConversation} conversation
 * @returns {Promise<object>}
 *  A promise resolving to an object with the search term and history results.
 *  Includes `count` when matches exist, a `message` when none are found, or an
 *  `error` string on failure.
 */
export async function searchBrowsingHistory(toolParams, conversation) {
  // No security check, always allowed because it makes no external requests.
  const params = toolParams && typeof toolParams === "object" ? toolParams : {};

  const { searchTerm = "", startTs = null, endTs = null } = params;

  const result = await implSearchBrowsingHistory({
    searchTerm,
    startTs,
    endTs,
    historyLimit: MAX_HISTORY_RESULTS,
  });

  conversation.addSeenUrls(result.results.map(({ url }) => url));
  conversation.securityProperties.setPrivateData();
  lazy.console.log("[Tool] searchBrowsingHistory", result);
  return result;
}

/**
 * Strips heavy or unnecessary fields from a browser history search result.
 *
 * @param {string} result
 *  A JSON string representing the history search response.
 * @returns {string}
 *  The sanitized JSON string with large fields (e.g., favicon, thumbnail)
 *  removed, or the original string if parsing fails.
 */
export function stripSearchBrowsingHistoryFields(result) {
  try {
    const data = JSON.parse(result);
    if (
      data.error ||
      !Array.isArray(data.results) ||
      data.results.length === 0
    ) {
      return result;
    }

    // Remove large or unnecessary fields to save tokens
    const OMIT_KEYS = ["favicon", "thumbnail"];
    for (const item of data.results) {
      if (item && typeof item === "object") {
        for (const k of OMIT_KEYS) {
          delete item[k];
        }
      }
    }
    return JSON.stringify(data);
  } catch {
    return result;
  }
}

/**
 * Performs a web search using the browser's default search engine,
 * waits for the results page to load, and extracts its content.
 */
export class RunSearch {
  static NAVIGATION_TIMEOUT_MS = 15000;
  static CONTENT_SETTLE_MS = 2000;
  static MAX_CHARACTERS = 15000;

  static #ensureTabSelected(tab) {
    if (!tab.selected) {
      tab.documentGlobal.gBrowser.selectedTab = tab;
    }
  }

  /**
   * Switches the run_search tool description to the one for verbatim queries
   *
   * @param {object} chatToolsConfig
   * @returns {object}
   */
  static setVerbatimSearchQueryDescription(chatToolsConfig) {
    const indexOfRunSearchConfig = chatToolsConfig.findIndex(
      item => item.function.name === RUN_SEARCH
    );
    if (
      chatToolsConfig[indexOfRunSearchConfig].function.description !=
      RUN_SEARCH_VERBATIM_QUERY_DESCRIPTION
    ) {
      chatToolsConfig[indexOfRunSearchConfig] =
        RUN_SEARCH_TOOL_CONFIG_VERBATIM_QUERY;
    }
    return chatToolsConfig;
  }

  /**
   * Switches the run_search tool description to the one for generated queries
   *
   * @param {object} chatToolsConfig
   * @returns {object}
   */
  static setGeneratedSearchQueryDescription(chatToolsConfig) {
    const indexOfRunSearchConfig = chatToolsConfig.findIndex(
      item => item.function.name === RUN_SEARCH
    );
    if (
      chatToolsConfig[indexOfRunSearchConfig].function.description !=
      RUN_SEARCH_GENERATED_QUERY_DESCRIPION
    ) {
      chatToolsConfig[indexOfRunSearchConfig] =
        RUN_SEARCH_TOOL_CONFIG_GENERATED_QUERY;
    }
    return chatToolsConfig;
  }

  /**
   * @param {object} [toolParams]
   * @param {BrowsingContext} browsingContext
   * @param {ChatConversation} conversation
   * @returns {Promise<string>}
   */
  static async runSearch(toolParams, browsingContext, conversation) {
    // No security check, always allowed because we assume that the search
    // provider is trusted.

    // Decide if we'll use the user message verbatim as the search query or generate one
    let query;
    if (toolParams.query) {
      query = toolParams.query;
    } else {
      const recentUserMessages = await ChatStore.getMostRecentMessages(
        MESSAGE_ROLE.USER,
        1
      );
      if (!recentUserMessages.length) {
        return "Error: no user messages stored to user as the search query.";
      }
      query = recentUserMessages[0].content.body;
    }

    if (!query || typeof query !== "string" || !query.trim()) {
      return "Error: a non-empty search query is required.";
    }

    if (!browsingContext) {
      return "Error: no browsingContext provided to perform search.";
    }

    const win = browsingContext.topChromeWindow;
    if (!win || win.closed) {
      return "Error: associated browser window not available or closed.";
    }

    // Get the original tab from the browsing context, not the currently selected tab
    const originalBrowser = browsingContext.embedderElement;
    let targetTab =
      originalBrowser && win.gBrowser?.getTabForBrowser(originalBrowser);

    if (targetTab) {
      // Switch to the original tab if it's different from currently selected
      RunSearch.#ensureTabSelected(targetTab);
    } else {
      return "Error: Original tab no longer exists, aborting search to avoid interfering with existing conversation.";
    }

    // If the original tab is the AI Window page, move to sidebar first
    if (lazy.AIWindow.isAIWindowContentPage(originalBrowser.currentURI)) {
      await RunSearch.#moveToSidebarIfNeeded(win, targetTab);

      // Ensure we're still on the correct tab after the await
      RunSearch.#ensureTabSelected(targetTab);
    }

    RunSearch.#showSearchingIndicator(win, true, query.trim());

    let result;
    try {
      await RunSearch.#performSearchAndWait(win, originalBrowser, query.trim());
      result = RunSearch.#extractSerpContent(originalBrowser, conversation);
    } catch (e) {
      console.error("[RunSearch] search failed:", e);
      result = `Error performing search for "${query}": ${e.message}`;
    } finally {
      RunSearch.#showSearchingIndicator(win, false, null);
    }

    // Mark the SERP entry as having user interaction so Back doesn't skip it
    // (browser.navigation.requireUserInteraction). The user asked for this
    // navigation via the assistant even if they never gesture on the SERP.
    const sh = originalBrowser.browsingContext?.sessionHistory;
    const entry = sh && sh.index >= 0 ? sh.getEntryAtIndex(sh.index) : null;
    if (entry) {
      entry.hasUserInteraction = true;
    }

    conversation.securityProperties.setPrivateData();
    conversation.securityProperties.setUntrustedInput();

    lazy.console.log("[Tool] runSearch", result);
    return result;
  }

  // TODO - this may be dead code. The fetch with history already yields a
  // searching state, and the sidebar implementation may not need this at all.
  // Revisit this in the future:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=2016252 to find a more
  // concrete way to target what side bar needs to show the indicator, if any
  // at all. My guess is that this might be here because of the move to sidebar
  // implementation, and the indicator state does not "transfer over". Possibly
  // look into tapping into something more concrete like the conversation state
  // in the AIWindow store to trigger this kind of UI state instead of trying
  // to directly manipulate the sidebar UI from here.
  static #showSearchingIndicator(win, isSearching, searchQuery) {
    try {
      const sidebar = win.document.getElementById("ai-window-box");
      if (!sidebar) {
        return;
      }
      const aiBrowser = sidebar.querySelector("#ai-window-browser");
      if (!aiBrowser?.contentDocument) {
        return;
      }
      const aiWindow = aiBrowser.contentDocument.querySelector("ai-window");
      if (aiWindow?.showSearchingIndicator) {
        aiWindow.showSearchingIndicator(isSearching, searchQuery);
      }
    } catch {
      // Sidebar may not be available
    }
  }

  static async #moveToSidebarIfNeeded(win, tab) {
    await lazy.AIWindow.moveConversationToSidebar(win, tab);
  }

  /**
   * Navigates to the search results and waits for the page to finish loading.
   *
   * @param {Window} win
   * @param {XULElement} browser
   * @param {string} query
   */
  static async #performSearchAndWait(win, browser, query) {
    const navigationPromise = new Promise((resolve, reject) => {
      const timeout = lazy.setTimeout(() => {
        win.gBrowser.removeProgressListener(listener);
        reject(new Error("Navigation timed out"));
      }, RunSearch.NAVIGATION_TIMEOUT_MS);

      const listener = {
        QueryInterface: ChromeUtils.generateQI([
          "nsIWebProgressListener",
          "nsISupportsWeakReference",
        ]),
        onStateChange(_webProgress, _request, stateFlags) {
          const complete =
            Ci.nsIWebProgressListener.STATE_STOP |
            Ci.nsIWebProgressListener.STATE_IS_NETWORK;
          if ((stateFlags & complete) === complete) {
            lazy.clearTimeout(timeout);
            win.gBrowser.removeProgressListener(listener);
            resolve();
          }
        },
        onLocationChange() {},
        onProgressChange() {},
        onStatusChange() {},
        onSecurityChange() {},
        onContentBlockingEvent() {},
      };

      win.gBrowser.addProgressListener(listener);
    });

    await lazy.AIWindow.performSearch(query, win);
    await navigationPromise;

    // Allow JS rendering to settle
    await new Promise(r => lazy.setTimeout(r, RunSearch.CONTENT_SETTLE_MS));
  }

  /**
   * Run PageExtractor on the search engine page.
   *
   * @param {MozBrowser} browser
   * @param {ChatConversation} conversation
   * @returns {string}
   */
  static async #extractSerpContent(browser, conversation) {
    const windowContext = browser.browsingContext?.currentWindowContext;
    if (!windowContext) {
      return "Error: could not access search results page content.";
    }

    /** @type {string} */
    let text;
    /** @type {PageExtractorParent} */
    const pageExtractor = await windowContext.getActor("PageExtractor");
    try {
      const result = await pageExtractor.getText({
        sufficientLength: RunSearch.MAX_CHARACTERS,
        cleanWhitespace: true,
        removeBoilerplate: false,
        sourceUrl: browser.currentURI?.spec,
      });
      if (!result) {
        return "No content could be extracted from the search results page.";
      }
      text = result.text;
      conversation.addSeenUrls(result.links);
    } catch {
      return "Error: failed to extract search results content.";
    }

    const url = browser.currentURI?.spec || "unknown";

    return `Search results from ${url}:\n\n${text}`;
  }
}

/**
 * Class for handling page content extraction with configurable modes and limits.
 */
export class GetPageContent {
  static MAX_CHARACTERS = 10000;

  /**
   * Tool entrypoint for get_page_content.
   *
   * @param {object} toolParams
   * @param {string[]} toolParams.url_list
   * @param {ChatConversation} conversation
   * @returns {Promise<Array<string>>}
   *  A promise resolving to a string containing the extracted page content
   *  with a descriptive header, or an error message if extraction fails.
   */
  static async getPageContent({ url_list }, conversation) {
    // This is a decision table for allowing and blocking fetches on the configuration of the
    // SecurityProperties and the URLs. Tab URLs don't do any new page loads. Mention urls
    // have been added by the user so they should be allowed. And all other URLs are
    // restricted when both private and untrusted data has been seen.
    //
    // │ Flags               │ tab urls │ mention urls │ any urls │
    // ├─────────────────────┼──────────┼──────────────┼──────────┤
    // │ Private only        │ ALLOW    │ ALLOW        │ ALLOW    │
    // │ Untrusted only      │ ALLOW    │ ALLOW        │ ALLOW    │
    // │ Private + Untrusted │ ALLOW    │ ALLOW        │ BLOCK    │

    // Sanitize the inputs from the language model:
    if (!Array.isArray(url_list)) {
      throw new Error("The url list must be an array of stirngs");
    }

    // Collect these one time before the loop below since it must iterate through
    // all of the conversations and collect a new Set of mentions.
    const mentionedUrls = conversation.getAllMentionURLs();

    const results = await Promise.all(
      url_list.map(async (url, index) => {
        if (!isAllowedURL(url)) {
          return "This URL is not allowed: " + url;
        }
        const startTime = ChromeUtils.now();
        try {
          const text = await GetPageContent.#getPageContentsForSingleURL(
            url,
            mentionedUrls,
            conversation
          );
          ChromeUtils.addProfilerMarker(
            "SmartWindow",
            { startTime },
            `Tool:get_page_content(${url})`
          );
          return text;
        } catch (error) {
          console.error(error);
          return `Could not retrieve the content for the page: ${url_list[index]}`;
        }
      })
    );
    lazy.console.log("[Tool] getPageContent", results);

    return results;
  }

  /**
   * Search through all AI Windows to find the tab with the matching URL.
   *
   * @param {string} url
   * @returns {Tab | null}
   */
  static getTabWithURL(url) {
    for (const win of lazy.BrowserWindowTracker.orderedWindows) {
      if (!lazy.AIWindow.isAIWindowActive(win) || win.closed || !win.gBrowser) {
        continue;
      }

      for (const tab of win.gBrowser.tabs) {
        if (tab?.linkedBrowser?.currentURI?.spec === url) {
          return tab;
        }
      }
    }

    return null;
  }

  /**
   * @param {string} url
   * @param {Set<string>} mentionedUrls
   * @param {ChatConversation} conversation
   *
   * @returns {Promise<string>}
   */
  static async #getPageContentsForSingleURL(url, mentionedUrls, conversation) {
    // First try to get the contents from an existing tab. This is always allowed from
    // a security perspective as it doesn't involve a network request, so there is
    // no risk for data exfiltration.
    const tab = GetPageContent.getTabWithURL(url);
    if (tab) {
      // Extract the tab contents.
      const currentWindowContext =
        tab.linkedBrowser.browsingContext?.currentWindowContext;

      if (!currentWindowContext) {
        return `Cannot access content from the following webpage:\n - Title: ${sanitizeUntrustedContent(tab.label)}\n - URL: ${url}.`;
      }

      // Extract page content using PageExtractor
      const pageExtractor =
        await currentWindowContext.getActor("PageExtractor");

      return GetPageContent.#runExtraction(
        pageExtractor,
        conversation,
        `${sanitizeUntrustedContent(tab.label)} (${url})`,
        url
      );
    }

    // Fetch the page headlessly since it's not loaded as a tab. This requires elevated
    // security permissions since an external network request is required, and is a
    // risk for the exfiltration of private data. If the URL is mentioned by the user
    // then the security properties check is bypassed here.
    if (
      !mentionedUrls.has(url) &&
      conversation.securityProperties.untrustedInput &&
      conversation.securityProperties.privateData
    ) {
      return (
        `Access is not allowed for ${url} because of untrusted and private content ` +
        "in the conversation."
      );
    }

    return PageExtractorParent.getHeadlessExtractor(url, pageExtractor =>
      GetPageContent.#runExtraction(pageExtractor, conversation, url, url)
    );
  }

  /**
   * Main extraction function.
   * label is of form `{tab.title} ({tab.url})`.
   *
   * @param {PageExtractorParent} pageExtractor
   * @param {ChatConversation} conversation
   * @param {string} label
   * @param {string} sourceUrl
   * @returns {Promise<string>}
   *  A promise resolving to a formatted string containing the page content
   *  with mode and label information, or an error message if no content is available.
   */
  static async #runExtraction(pageExtractor, conversation, label, sourceUrl) {
    const extraction = await pageExtractor.getText({
      sufficientLength: GetPageContent.MAX_CHARACTERS,
      cleanWhitespace: true,
      removeBoilerplate: true,
      sourceUrl,
    });

    if (!extraction) {
      return `get_page_content returned no content for ${label}.`;
    }

    const { text, links } = extraction;
    conversation.addSeenUrls(links);

    // If an extraction succeeds set the security properties.
    // The page content is private since it uses a web page load that has credentials.
    // The information is untrusted since it's arbitrary web content.
    conversation.securityProperties.setPrivateData();
    conversation.securityProperties.setUntrustedInput();

    return `Content from ${label}:\n\n${text}`;
  }
}

/**
 * Returns Firefox settings navigation entries semantically relevant to the query.
 * No conversation parameter is needed.
 *
 * @param {object} toolParams
 * @param {string} toolParams.query
 * @returns {Promise<Array<{url, label, breadcrumb, description, similarity}>>}
 */
export async function getNavigationInfo(toolParams) {
  const params = toolParams && typeof toolParams === "object" ? toolParams : {};
  const { query = "" } = params;

  if (!query.trim()) {
    return [];
  }

  // No flags set: results are static browser UI metadata bundled with Firefox.
  // No network requests are made and no user data is read, so there is no
  // privacy risk and no untrusted content that could carry a prompt injection.
  return lazy.SmartWindowNavigationInfo.getRelevantNavigation(query);
}

/**
 * Retrieves the summaries of all saved memories
 *
 * @param {ChatConversation} conversation
 * @returns {Promise<Array<string>>}
 */
export async function getUserMemories(conversation) {
  // No security check, always allowed because it makes no external requests.
  const memories = await lazy.MemoriesManager.getAllMemories();

  const result = memories.map(memory => memory.memory_summary);
  // Memory summaries are private user data. They are truncated to 100
  // characters, so they are not considered untrusted input.
  conversation.securityProperties.setPrivateData();
  lazy.console.log("[Tool] getUserMemories", result);
  return result;
}

/**
 * Strips fields the language model doesn't need (icons, colors) from a
 * single match payload.
 *
 * @param {object} match
 * @returns {object}
 */
function trimWorldCupMatch(match) {
  if (!match || typeof match !== "object") {
    return match;
  }
  const trim = team => {
    if (!team || typeof team !== "object") {
      return team;
    }
    const out = { ...team };
    delete out.icon_url;
    delete out.colors;
    return out;
  };
  return {
    ...match,
    home_team: trim(match.home_team),
    away_team: trim(match.away_team),
  };
}

/**
 * Tool entrypoint for world_cup_matches. Returns the matches grouped by
 * previous/current/next. Trims UI-only fields. On failure, returns an
 * `{error}` object so the model can recover gracefully.
 *
 * @param {object} toolParams
 * @param {string} [toolParams.date]
 * @param {string} [toolParams.teams]
 * @param {number} [toolParams.limit]
 * @param {ChatConversation} conversation
 * @returns {Promise<object>}
 */
export async function worldCupMatches(toolParams, conversation) {
  const params = toolParams && typeof toolParams === "object" ? toolParams : {};
  const { date, teams, limit } = params;

  let result;
  try {
    result = await WCSMerinoClient.fetchMatches({ date, teams, limit });
  } catch (error) {
    lazy.console.log("[Tool] worldCupMatches error", error);
    return { error: `Failed to retrieve World Cup matches: ${error.message}` };
  }

  const trimmed = {
    previous: (result.previous || []).map(trimWorldCupMatch),
    current: (result.current || []).map(trimWorldCupMatch),
    next: (result.next || []).map(trimWorldCupMatch),
  };

  // Match data is public, server-provided, and not user data. We still
  // mark it as untrusted because the response strings (team names, status
  // text) flow into the model context.
  conversation.securityProperties.setUntrustedInput();
  lazy.console.log("[Tool] worldCupMatches", trimmed);
  return trimmed;
}

/**
 * Tool entrypoint for world_cup_live. Returns matches currently in play.
 *
 * @param {object} toolParams
 * @param {string} [toolParams.teams]
 * @param {ChatConversation} conversation
 * @returns {Promise<object>}
 */
export async function worldCupLive(toolParams, conversation) {
  const params = toolParams && typeof toolParams === "object" ? toolParams : {};
  const { teams } = params;

  let result;
  try {
    result = await WCSMerinoClient.fetchLive({ teams });
  } catch (error) {
    lazy.console.log("[Tool] worldCupLive error", error);
    return {
      error: `Failed to retrieve live World Cup matches: ${error.message}`,
    };
  }

  const trimmed = {
    matches: (result.matches || []).map(trimWorldCupMatch),
  };

  conversation.securityProperties.setUntrustedInput();
  lazy.console.log("[Tool] worldCupLive", trimmed);
  return trimmed;
}

export const toolFns = {
  getOpenTabs,
  searchBrowsingHistory,
  getUserMemories,
  getNavigationInfo,
  worldCupMatches,
  worldCupLive,
};
