/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

import { getLogger } from "chrome://browser/content/firefoxview/helpers.mjs";

ChromeUtils.defineESModuleGetters(lazy, {
  AIWindow:
    "moz-src:///browser/components/aiwindow/ui/modules/AIWindow.sys.mjs",
});

const CHAT_MAP_L10N_IDS = {
  "chat-date-today": "firefoxview-chat-date-today",
  "chat-date-yesterday": "firefoxview-chat-date-yesterday",
  "chat-date-this-month": "firefoxview-chat-date-this-month",
  "chat-date-prev-month": "firefoxview-chat-date-prev-month",
};

const DAYS_IN_MILLIS = 86400000;

/**
 * A list of chat items displayed on a card.
 *
 * @typedef {object} CardEntry
 * @property {Array} items - Chat items for this card
 * @property {string} l10nId - Localization ID for the card header
 */

/**
 * Manages chat history display and organization in Firefox View.
 * Handles fetching, searching, grouping by date, and normalizing chat data for display.
 */
export class ChatsController {
  /**
   * @type {{ entries: CardEntry[]; searchQuery: string; }}
   */
  cache;

  /** @type {object} The host element this controller is attached to */
  host;

  // TODO Bug 2009070 - Implement Search
  /** @type {string} Current search query string */
  // searchQuery;

  /** @type {Date} Today's date at midnight */
  #todaysDate;

  /** @type {Date} Yesterday's date at midnight */
  #yesterdaysDate;

  /**
   * Creates a ChatsController instance.
   *
   * @param {object} host - The host element that this controller manages
   * @param {object} [_options] - Configuration options (unused until Bug 2009070)
   * @param {number} [_options.searchResultsLimit=300] - Maximum number of search results to return
   *
   * TODO: The _options parameter is prefixed with underscore because it's currently unused
   * while search functionality is disabled. When implementing Bug 2009070 (search), rename
   * this back to 'options' and uncomment the search-related code below.
   */
  constructor(host, _options) {
    this.chatStore = lazy.AIWindow.chatStore;
    // TODO Bug 2009070 - Implement Search
    // this.searchQuery = "";
    // this.searchResultsLimit = options?.searchResultsLimit || 300;
    this.cache = {
      entries: null,
      // TODO Bug 2009070 - Implement Search
      // searchQuery: null,
    };
    this.host = host;

    host.addController(this);
  }

  async deleteChat() {
    const convID = this.host.triggerNode.closedId;
    if (convID) {
      await this.chatStore.deleteConversationById(convID);
      await this.updateCache();
    }
  }

  // TODO Bug 2009070 - Implement Search
  /**
   * Handles search query events and updates the chat cache.
   *
   * @param {CustomEvent} e - The search query event
   * @param {object} e.detail - Event details
   * @param {string} e.detail.query - The search query string
   */
  // onSearchQuery(e) {
  //   this.searchQuery = e.detail.query;
  //   this.updateCache();
  // }

  /**
   * Gets all chat entries from the cache.
   *
   * @returns {CardEntry[]} Array of card entries containing chat items
   */
  get totalChats() {
    return this.cache.entries || [];
  }

  // TODO Bug 2009070 - Implement Search
  /**
   * Gets the current search results.
   *
   * @returns {Array} Array of search result items, or empty array if no search is active
   */
  // get searchResults() {
  //   if (this.cache.searchQuery && this.cache.entries?.length) {
  //     return this.cache.entries[0].items;
  //   }
  //   return [];
  // }

  /**
   * Gets the total number of chat items across all entries.
   *
   * @returns {number} Total count of chat items
   */
  get totalVisitsCount() {
    return this.totalChats.reduce(
      (count, entry) => count + entry.items.length,
      0
    );
  }

  /**
   * Checks if there are no chats to display.
   *
   * @returns {boolean} True if there are no chat entries
   */
  get isChatEmpty() {
    return !this.totalChats.length;
  }

  /**
   * Updates the cached chat data based on current search query.
   * Fetches either search results or all chats grouped by date.
   * Normalizes chat items and triggers host UI update.
   */
  async updateCache() {
    // TODO Bug 2009070 - Implement Search
    // const { searchQuery } = this;
    // const entries = searchQuery
    //   ? await this.#getChatsForSearchQuery(searchQuery)
    //   : await this.#getAllChatsGroupedByDate();
    const entries = await this.#getAllChatsGroupedByDate();

    // TODO Bug 2009070 - Implement Search
    // if (this.searchQuery !== searchQuery || !entries) {
    //   // This query is stale, discard results and do not update the cache / UI.
    //   return;
    // }
    if (!entries) {
      return;
    }

    // Normalize chat items for display
    for (const { items } of entries) {
      for (const item of items) {
        this.#normalizeChat(item);
      }
    }

    // TODO Bug 2009070 - Implement Search
    // this.cache = { entries, searchQuery };
    this.cache = { entries };
    this.host.requestUpdate();
  }

  /**
   * Normalize chat data for fxview-tabs-list.
   *
   * @param {ChatHistoryResult} chat
   *   The chat to format.
   */
  #normalizeChat(chat) {
    // Get most recent page URL (skip if it's the AI Window URL)
    const mostRecentPage = chat.urls?.[chat.urls.length - 1];
    const pageUrl =
      mostRecentPage?.href === lazy.AIWindow.newTabURL
        ? null
        : mostRecentPage?.href;

    // All chats link to AI Window - click handler will decide what to load
    const targetURI = lazy.AIWindow.newTabURL;

    if (pageUrl) {
      chat.icon = pageUrl;
      chat.pageUrl = pageUrl;
      chat.primaryL10nId = "fxviewtabrow-tabs-list-tab";
      chat.primaryL10nArgs = JSON.stringify({
        targetURI,
      });
    }
    chat.url = targetURI;
    chat.time = chat.updatedDate;
    chat.closedId = chat.convId;
    chat.secondaryL10nId = "fxviewtabrow-options-menu-button";
    chat.secondaryL10nArgs = JSON.stringify({
      tabTitle: chat.title || "Untitled Chat",
    });
  }

  // TODO Bug 2009070 - Implement Search
  /**
   * Fetches and formats chats matching a search query.
   *
   * @param {string} searchQuery - The search query string
   * @returns {Promise<CardEntry[]>} Array with single entry containing search results
   */
  // async #getChatsForSearchQuery(searchQuery) {
  //   try {
  //     const conversations = await this.chatStore.search(searchQuery, false);

  //     // Add aliases to conversation objects for display compatibility
  //     conversations.forEach(conv => {
  //       conv.convId = conv.id;
  //       conv.urls = conv.pageMeta?.urls || [];
  //     });

  //     return [{ items: conversations }];
  //   } catch (e) {
  //     getLogger("ChatsController").warn(
  //       "There is a new search query in progress, cancelling this one.",
  //       e
  //     );
  //     return [{ items: [] }];
  //   }
  // }

  /**
   * Fetches all chats and groups them by date categories.
   *
   * @returns {Promise<CardEntry[]>} Array of card entries grouped by date
   */
  async #getAllChatsGroupedByDate() {
    const chats = await this.#fetchChats();
    if (!chats || !chats.length) {
      return [];
    }

    this.#setTodaysDate();
    return this.#getChatsForDate(chats);
  }

  /**
   * Groups chats into date-based categories: today, yesterday, this month, previous months.
   *
   * @param {Array} chats - Array of chat objects to group
   * @returns {CardEntry[]} Array of card entries organized by date categories
   */
  #getChatsForDate(chats) {
    const entries = [];
    const chatsFromToday = this.#getChatsFromToday(chats);
    const chatsFromYesterday = this.#getChatsFromYesterday(chats);
    const chatsByDay = this.#getChatsByDay(chats);
    const chatsByMonth = this.#getChatsByMonth(chats);

    if (chatsFromToday.length) {
      entries.push({
        l10nId: CHAT_MAP_L10N_IDS["chat-date-today"],
        items: chatsFromToday,
      });
    }

    if (chatsFromYesterday.length) {
      entries.push({
        l10nId: CHAT_MAP_L10N_IDS["chat-date-yesterday"],
        items: chatsFromYesterday,
      });
    }

    chatsByDay.forEach(dayChats => {
      entries.push({
        l10nId: CHAT_MAP_L10N_IDS["chat-date-this-month"],
        items: dayChats,
      });
    });

    chatsByMonth.forEach(monthChats => {
      entries.push({
        l10nId: CHAT_MAP_L10N_IDS["chat-date-prev-month"],
        items: monthChats,
      });
    });

    return entries;
  }

  /**
   * Filters chats that were updated today.
   *
   * @param {Array} chats - Array of chat objects
   * @returns {Array} Chats from today
   */
  #getChatsFromToday(chats) {
    const todayStart = this.#todaysDate.getTime();
    const todayEnd = todayStart + DAYS_IN_MILLIS;
    return chats.filter(
      chat => chat.updatedDate >= todayStart && chat.updatedDate < todayEnd
    );
  }

  /**
   * Filters chats that were updated yesterday.
   *
   * @param {Array} chats - Array of chat objects
   * @returns {Array} Chats from yesterday
   */
  #getChatsFromYesterday(chats) {
    const todayStart = this.#todaysDate.getTime();
    const yesterdayStart = this.#yesterdaysDate.getTime();
    return chats.filter(
      chat =>
        chat.updatedDate >= yesterdayStart && chat.updatedDate < todayStart
    );
  }

  /**
   * Groups chats by individual days within the current month.
   * Excludes today and yesterday chats.
   *
   * @param {Array} chats - Array of chat objects
   * @returns {Array<Array>} Array of arrays, each containing chats from the same day
   */
  #getChatsByDay(chats) {
    const yesterdayStart = this.#yesterdaysDate.getTime();
    const chatsPerDay = [];
    let currentDay = null;
    let currentDayChats = [];

    for (const chat of chats) {
      if (chat.updatedDate >= yesterdayStart) {
        continue;
      }

      const chatDate = new Date(chat.updatedDate);
      if (!this.#isSameMonth(chatDate, this.#todaysDate)) {
        break;
      }

      const dayKey = `${chatDate.getFullYear()}-${chatDate.getMonth()}-${chatDate.getDate()}`;
      if (dayKey !== currentDay) {
        if (currentDayChats.length) {
          chatsPerDay.push(currentDayChats);
        }
        currentDay = dayKey;
        currentDayChats = [chat];
      } else {
        currentDayChats.push(chat);
      }
    }

    if (currentDayChats.length) {
      chatsPerDay.push(currentDayChats);
    }

    return chatsPerDay;
  }

  /**
   * Groups chats by month for dates outside the current month.
   * Excludes today, yesterday, and current month chats.
   *
   * @param {Array} chats - Array of chat objects
   * @returns {Array<Array>} Array of arrays, each containing chats from the same month
   */
  #getChatsByMonth(chats) {
    const yesterdayStart = this.#yesterdaysDate.getTime();
    const chatsPerMonth = [];
    let currentMonth = null;
    let currentMonthChats = [];

    for (const chat of chats) {
      if (chat.updatedDate >= yesterdayStart) {
        continue;
      }

      const chatDate = new Date(chat.updatedDate);
      if (this.#isSameMonth(chatDate, this.#todaysDate)) {
        continue;
      }

      const monthKey = `${chatDate.getFullYear()}-${chatDate.getMonth()}`;
      if (monthKey !== currentMonth) {
        if (currentMonthChats.length) {
          chatsPerMonth.push(currentMonthChats);
        }
        currentMonth = monthKey;
        currentMonthChats = [chat];
      } else {
        currentMonthChats.push(chat);
      }
    }

    if (currentMonthChats.length) {
      chatsPerMonth.push(currentMonthChats);
    }

    return chatsPerMonth;
  }

  /**
   * Check if two dates have the same month and year.
   *
   * @param {Date} dateToCheck
   * @param {Date} month
   * @returns {boolean}
   */
  #isSameMonth(dateToCheck, month) {
    return (
      dateToCheck.getMonth() === month.getMonth() &&
      dateToCheck.getFullYear() === month.getFullYear()
    );
  }

  /**
   * Sets today's and yesterday's dates at midnight for date comparison operations.
   */
  #setTodaysDate() {
    const now = new Date();
    this.#todaysDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    this.#yesterdaysDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1
    );
  }

  /**
   * Fetches chats from the chat store.
   *
   * @returns {Promise<Array>} Array of chat objects, or empty array on error
   */
  async #fetchChats() {
    try {
      // Use chatHistoryView for paginated, optimized results
      // Get first 100 chats, sorted by date descending
      const chats = await this.chatStore.chatHistoryView(1, 100, "desc");
      return chats;
    } catch (e) {
      getLogger("ChatsController").error("Error fetching chats", e);
      return [];
    }
  }
}
