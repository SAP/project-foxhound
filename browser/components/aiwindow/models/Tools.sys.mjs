/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * This file contains LLM tool abstractions and tool definitions.
 */

import { searchBrowsingHistory as implSearchBrowsingHistory } from "moz-src:///browser/components/aiwindow/models/SearchBrowsingHistory.sys.mjs";
import { PageExtractorParent } from "resource://gre/actors/PageExtractorParent.sys.mjs";

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
  BrowserWindowTracker: "resource:///modules/BrowserWindowTracker.sys.mjs",
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  MemoriesManager:
    "moz-src:///browser/components/aiwindow/models/memories/MemoriesManager.sys.mjs",
  // @todo Bug 2009194
  // PageDataService:
  //   "moz-src:///browser/components/pagedata/PageDataService.sys.mjs",
});

const GET_OPEN_TABS = "get_open_tabs";
const SEARCH_BROWSING_HISTORY = "search_browsing_history";
const GET_PAGE_CONTENT = "get_page_content";
const RUN_SEARCH = "run_search";
const GET_USER_MEMORIES = "get_user_memories";

export const TOOLS = [
  GET_OPEN_TABS,
  SEARCH_BROWSING_HISTORY,
  GET_PAGE_CONTENT,
  RUN_SEARCH,
  GET_USER_MEMORIES,
];

export const toolsConfig = [
  {
    type: "function",
    function: {
      name: GET_OPEN_TABS,
      description:
        "Access the user's browser and return a list of most recently browsed tabs. " +
        "Each tab is represented by a JSON with the page's url, title and description " +
        "if available. Default to return maximum 15 tabs.",
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
        "Retrieve cleaned text content of all the provided browser page URLs in the list.",
      parameters: {
        type: "object",
        properties: {
          url_list: {
            type: "array",
            items: {
              type: "string",
              description:
                "The complete URL of the page to fetch content from. This must exactly match " +
                "a URL from the current conversation context. Use the full URL including " +
                "protocol (http/https). Example: 'https://www.example.com/article'.",
            },
            minItems: 1,
            description: "List of URLs to fetch content from.",
          },
        },
        required: ["url_list"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: RUN_SEARCH,
      description:
        "Perform a web search using the browser's default search engine and return " +
        "the search results page content. Use this when the user needs current web " +
        "information that would benefit from a live search.",
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
];

/**
 * Retrieves a list of (up to n) the latest open tabs from the current active browser window.
 * Ignores config pages (about:xxx).
 * TODO: Ignores chat-only pages (FE to implement isSidebarMode flag).
 *
 * @param {number} n
 *  Maximum number of tabs to return. Defaults to 15.
 * @returns {Promise<Array<object>>}
 *  A promise resolving to an array of tab metadata objects, each containing:
 *  - url {string}: The tab's current URL
 *  - title {string}: The tab's title
 *  - description {string}: Optional description (empty string if not available)
 *  - lastAccessed {number}: Last accessed timestamp in milliseconds
 *  Tabs are sorted by most recently accessed and limited to the first n results.
 */
export async function getOpenTabs(n = 15) {
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

        if (url && !url.startsWith("about:")) {
          tabs.push({
            url,
            title,
            lastAccessed: tab.lastAccessed,
          });
        }
      }
    }
  }

  tabs.sort((a, b) => b.lastAccessed - a.lastAccessed);

  const topTabs = tabs.slice(0, n);

  return Promise.all(
    topTabs.map(async ({ url, title, lastAccessed }) => {
      let description = "";
      if (url) {
        // @todo Bug 2009194
        // PageDataService halts code execution even in try/catch
        //
        // try {
        //   description =
        //     lazy.PageDataService.getCached(url)?.description ||
        //     (await lazy.PageDataService.fetchPageData(url))?.description ||
        //     "";
        // } catch (e) {
        //   console.log(e);
        //   description = "";
        // }
      }
      return { url, title, description, lastAccessed };
    })
  );
}

/**
 * Tool entrypoint for search_browsing_history.
 *
 * Parameters (defaults shown):
 * - searchTerm: ""        - string used for search
 * - startTs: null         - local ISO timestamp lower bound, or null
 * - endTs: null           - local ISO timestamp upper bound, or null
 * - historyLimit: 15      - max number of results
 *
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
 * @returns {Promise<object>}
 *  A promise resolving to an object with the search term and history results.
 *  Includes `count` when matches exist, a `message` when none are found, or an
 *  `error` string on failure.
 */
export async function searchBrowsingHistory(toolParams) {
  const params = toolParams && typeof toolParams === "object" ? toolParams : {};

  const {
    searchTerm = "",
    startTs = null,
    endTs = null,
    historyLimit = 15,
  } = params;

  return implSearchBrowsingHistory({
    searchTerm,
    startTs,
    endTs,
    historyLimit,
  });
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

  static #ensureTabSelected(tab) {
    if (!tab.selected) {
      tab.ownerGlobal.gBrowser.selectedTab = tab;
    }
  }

  /**
   * @param {object} toolParams
   * @param {string} toolParams.query
   * @param {object} [context]
   * @param {BrowsingContext} [context.browsingContext]
   * @returns {Promise<string>}
   */
  static async runSearch({ query }, context = {}) {
    if (!query || typeof query !== "string" || !query.trim()) {
      return "Error: a non-empty search query is required.";
    }

    if (!context.browsingContext) {
      return "Error: no browsingContext provided to perform search.";
    }

    const win = context.browsingContext.topChromeWindow;
    if (!win || win.closed) {
      return "Error: associated browser window not available or closed.";
    }

    // Get the original tab from the browsing context, not the currently selected tab
    const originalBrowser = context.browsingContext.embedderElement;
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

    try {
      await RunSearch.#performSearchAndWait(win, originalBrowser, query.trim());
      return RunSearch.#extractSerpContent(originalBrowser);
    } catch (e) {
      console.error("[RunSearch] search failed:", e);
      return `Error performing search for "${query}": ${e.message}`;
    } finally {
      RunSearch.#showSearchingIndicator(win, false, null);
    }
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

  static async #extractSerpContent(browser) {
    const windowContext = browser.browsingContext?.currentWindowContext;
    if (!windowContext) {
      return "Error: could not access search results page content.";
    }

    const pageExtractor = await windowContext.getActor("PageExtractor");
    let extraction;
    try {
      extraction = await pageExtractor.getReaderModeContent();
    } catch {
      // Fall back to full text extraction
    }

    let text = extraction?.text ?? "";
    if (!text) {
      try {
        extraction = await pageExtractor.getText();
        text = extraction?.text ?? "";
      } catch {
        return "Error: failed to extract search results content.";
      }
    }

    if (!text) {
      return "No content could be extracted from the search results page.";
    }

    let cleanContent = text
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const MAX_CHARS = 15000;
    if (cleanContent.length > MAX_CHARS) {
      const truncatePoint = cleanContent.lastIndexOf(".", MAX_CHARS);
      if (truncatePoint > MAX_CHARS - 100) {
        cleanContent = cleanContent.substring(0, truncatePoint + 1);
      } else {
        cleanContent = cleanContent.substring(0, MAX_CHARS) + "...";
      }
    }

    const url = browser.currentURI?.spec || "unknown";
    return `Search results from ${url}:\n\n${cleanContent}`;
  }
}

/**
 * Class for handling page content extraction with configurable modes and limits.
 */
export class GetPageContent {
  static DEFAULT_MODE = "reader";
  static FALLBACK_MODE = "full";
  static MAX_CHARACTERS = 10000;

  /**
   * @type {Record<string, (pageExtractor: PageExtractor) => Promise<{ text: string }>>}
   */
  static MODE_HANDLERS = {
    viewport: async pageExtractor =>
      pageExtractor.getText({ justViewport: true }),
    reader: async pageExtractor => pageExtractor.getReaderModeContent(),
    full: async pageExtractor => pageExtractor.getText(),
  };

  /**
   * Tool entrypoint for get_page_content.
   *
   * @param {object} toolParams
   * @param {string[]} toolParams.url_list
   * @param {Set<string>} allowedUrls
   * @returns {Promise<Array<string>>}
   *  A promise resolving to a string containing the extracted page content
   *  with a descriptive header, or an error message if extraction fails.
   */
  static async getPageContent({ url_list }, allowedUrls = new Set()) {
    // Ensure `url_list` is always an array
    if (!Array.isArray(url_list)) {
      throw new Error("getPageContent now requires { url_list: [...] }");
    }

    const promises = url_list.map(url =>
      GetPageContent.#processSingleURL(url, allowedUrls)
    );

    // Run all fetches in parallel
    const ret_contents = await Promise.all(promises);
    return ret_contents;
  }

  static async #processSingleURL(url, allowedUrls) {
    try {
      // Search through the allowed URLs and extract directly if exists
      if (!allowedUrls.has(url)) {
        //  Bug 2006418  - This will load the page headlessly, and then extract the content.
        // It might be a better idea to have the lifetime of the page be tied to the chat
        // while it's open, and with a "keep alive" timeout. For now it's simpler to just
        // load the page fresh every time.
        return PageExtractorParent.getHeadlessExtractor(url, pageExtractor =>
          GetPageContent.#runExtraction(
            pageExtractor,
            GetPageContent.DEFAULT_MODE,
            url
          )
        );
      }

      // Search through all AI Windows to find the tab with the matching URL
      let targetTab = null;
      for (const win of lazy.BrowserWindowTracker.orderedWindows) {
        if (!lazy.AIWindow.isAIWindowActive(win)) {
          continue;
        }

        if (!win.closed && win.gBrowser) {
          const tabs = win.gBrowser.tabs;

          // Find the tab with the matching URL in this window
          for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const currentURI = tab?.linkedBrowser?.currentURI;
            if (currentURI?.spec === url) {
              targetTab = tab;
              break;
            }
          }

          // If no match, try hostname matching for cases where protocols differ
          if (!targetTab) {
            try {
              const inputHostPort = new URL(url).host;
              targetTab = tabs.find(tab => {
                try {
                  const tabHostPort = tab.linkedBrowser.currentURI.hostPort;
                  return tabHostPort === inputHostPort;
                } catch {
                  return false;
                }
              });
            } catch {
              // Invalid URL, continue with original logic
            }
          }

          // If we found the tab, stop searching
          if (targetTab) {
            break;
          }
        }
      }

      // If still no match, abort
      if (!targetTab) {
        return `Cannot find URL: ${url}, page content extraction failed.`;
      }

      // Attempt extraction
      const currentWindowContext =
        targetTab.linkedBrowser.browsingContext?.currentWindowContext;

      if (!currentWindowContext) {
        return `Cannot access content from "${targetTab.label}" at ${url}.`;
        // Stripped message "The tab may still be loading or is not accessible." to not confuse the LLM
      }

      // Extract page content using PageExtractor
      const pageExtractor =
        await currentWindowContext.getActor("PageExtractor");

      return GetPageContent.#runExtraction(
        pageExtractor,
        GetPageContent.DEFAULT_MODE,
        `"${targetTab.label}" (${url})`
      );
    } catch (error) {
      // Bug 2006425 - Decide on the strategy for error handling in tool calls
      // i.e., will the LLM keep retrying get_page_content due to error?
      console.error(error);
      return `Error retrieving content from ${url}.`;
      // Stripped ${error.message} content to not confuse the LLM
    }
  }

  /**
   * Main extraction function.
   * label is of form `{tab.title} ({tab.url})`.
   *
   * @param {PageExtractor} pageExtractor
   * @param {string} mode
   * @param {string} label
   * @returns {Promise<string>}
   *  A promise resolving to a formatted string containing the page content
   *  with mode and label information, or an error message if no content is available.
   */
  static async #runExtraction(pageExtractor, mode, label) {
    const selectedMode =
      typeof mode === "string" && GetPageContent.MODE_HANDLERS[mode]
        ? mode
        : GetPageContent.DEFAULT_MODE;
    const handler = GetPageContent.MODE_HANDLERS[selectedMode];
    let extraction = null;

    try {
      extraction = await handler(pageExtractor);
    } catch (err) {
      console.error(
        "[SmartWindow] get_page_content mode failed",
        selectedMode,
        err
      );
    }

    let pageContent = extraction?.text ?? "";

    // Track which mode was actually used (in case we fall back)
    let actualMode = selectedMode;

    // If reader mode returns no content, fall back to full mode
    if (!pageContent && selectedMode === "reader") {
      try {
        const fallbackHandler =
          GetPageContent.MODE_HANDLERS[GetPageContent.FALLBACK_MODE];
        extraction = await fallbackHandler(pageExtractor);
        pageContent = extraction?.text ?? "";
        if (pageContent) {
          actualMode = GetPageContent.FALLBACK_MODE;
        }
      } catch (err) {
        console.error(
          "[SmartWindow] get_page_content fallback mode failed",
          GetPageContent.FALLBACK_MODE,
          err
        );
      }
    }

    if (!pageContent) {
      return `get_page_content(${selectedMode}) returned no content for ${label}.`;
      // Stripped message "Try another mode if you still need information." to not confuse the LLM
    }

    // Clean and truncate content for better LLM consumption
    //  Bug 2006436 - Consider doing this directly in pageExtractor if absolutely needed.
    let cleanContent = pageContent
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n\s*\n/g, "\n") // Clean up line breaks
      .trim();

    // Limit content length but be more generous for LLM processing
    // Bug 1995043 - once reader mode has length truncation,
    // we can remove this and directly do this in pageExtractor.
    if (cleanContent.length > GetPageContent.MAX_CHARACTERS) {
      // Try to cut at a sentence boundary
      const truncatePoint = cleanContent.lastIndexOf(
        ".",
        GetPageContent.MAX_CHARACTERS
      );
      if (truncatePoint > GetPageContent.MAX_CHARACTERS - 100) {
        cleanContent = cleanContent.substring(0, truncatePoint + 1);
      } else {
        cleanContent =
          cleanContent.substring(0, GetPageContent.MAX_CHARACTERS) + "...";
      }
    }

    const modeLabel = {
      viewport: "current viewport",
      reader: "reader mode",
      full: "full page",
    }[actualMode];

    return `Content (${modeLabel}) from ${label}:\n\n${cleanContent}`;
  }
}

export async function getUserMemories() {
  const memories = await lazy.MemoriesManager.getAllMemories();

  return memories.map(memory => memory.memory_summary);
}
