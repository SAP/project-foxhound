/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FirefoxViewPlacesQuery:
    "resource:///modules/firefox-view-places-query.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
});

let XPCOMUtils = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
).XPCOMUtils;

XPCOMUtils.defineLazyPreferenceGetter(
  lazy,
  "maxRowsPref",
  "browser.firefox-view.max-history-rows",
  -1
);

const HISTORY_MAP_L10N_IDS = {
  sidebar: {
    "history-date-today": "sidebar-history-date-today",
    "history-date-yesterday": "sidebar-history-date-yesterday",
    "history-date-this-month": "sidebar-history-date-this-month",
    "history-date-prev-month": "sidebar-history-date-prev-month",
  },
  firefoxview: {
    "history-date-today": "firefoxview-history-date-today",
    "history-date-yesterday": "firefoxview-history-date-yesterday",
    "history-date-this-month": "firefoxview-history-date-this-month",
    "history-date-prev-month": "firefoxview-history-date-prev-month",
  },
};

export class HistoryController {
  host;
  allHistoryItems;
  historyMapByDate;
  historyMapBySite;
  searchQuery;
  searchResults;
  sortOption;

  constructor(host, options) {
    this.allHistoryItems = new Map();
    this.historyMapByDate = [];
    this.historyMapBySite = [];
    this.placesQuery = new lazy.FirefoxViewPlacesQuery();
    this.searchQuery = "";
    this.searchResults = null;
    this.sortOption = "date";
    this.searchResultsLimit = options?.searchResultsLimit || 300;
    this.component = HISTORY_MAP_L10N_IDS?.[options?.component]
      ? options?.component
      : "firefoxview";
    this.host = host;

    host.addController(this);
  }

  async hostConnected() {
    this.placesQuery.observeHistory(data => this.updateAllHistoryItems(data));
    await this.updateHistoryData();
    this.createHistoryMaps();
  }

  hostDisconnected() {
    this.placesQuery.close();
  }

  deleteFromHistory() {
    lazy.PlacesUtils.history.remove(this.host.triggerNode.url);
  }

  async onSearchQuery(e) {
    this.searchQuery = e.detail.query;
    await this.updateSearchResults();
    this.host.requestUpdate();
  }

  async onChangeSortOption(e) {
    this.sortOption = e.target.value;
    await this.updateHistoryData();
    await this.updateSearchResults();
    this.host.requestUpdate();
  }

  async updateHistoryData() {
    this.allHistoryItems = await this.placesQuery.getHistory({
      daysOld: 60,
      limit: lazy.maxRowsPref,
      sortBy: this.sortOption,
    });
  }

  async updateAllHistoryItems(allHistoryItems) {
    if (allHistoryItems) {
      this.allHistoryItems = allHistoryItems;
    } else {
      await this.updateHistoryData();
    }
    this.resetHistoryMaps();
    this.host.requestUpdate();
    await this.updateSearchResults();
  }

  async updateSearchResults() {
    if (this.searchQuery) {
      try {
        this.searchResults = await this.placesQuery.searchHistory(
          this.searchQuery,
          this.searchResultsLimit
        );
      } catch (e) {
        // Connection interrupted, ignore.
      }
    } else {
      this.searchResults = null;
    }
  }

  resetHistoryMaps() {
    this.historyMapByDate = [];
    this.historyMapBySite = [];
  }

  createHistoryMaps() {
    if (!this.historyMapByDate.length) {
      const {
        visitsFromToday,
        visitsFromYesterday,
        visitsByDay,
        visitsByMonth,
      } = this.placesQuery;

      // Add visits from today and yesterday.
      if (visitsFromToday.length) {
        this.historyMapByDate.push({
          l10nId: HISTORY_MAP_L10N_IDS[this.component]["history-date-today"],
          items: visitsFromToday,
        });
      }
      if (visitsFromYesterday.length) {
        this.historyMapByDate.push({
          l10nId:
            HISTORY_MAP_L10N_IDS[this.component]["history-date-yesterday"],
          items: visitsFromYesterday,
        });
      }

      // Add visits from this month, grouped by day.
      visitsByDay.forEach(visits => {
        this.historyMapByDate.push({
          l10nId:
            HISTORY_MAP_L10N_IDS[this.component]["history-date-this-month"],
          items: visits,
        });
      });

      // Add visits from previous months, grouped by month.
      visitsByMonth.forEach(visits => {
        this.historyMapByDate.push({
          l10nId:
            HISTORY_MAP_L10N_IDS[this.component]["history-date-prev-month"],
          items: visits,
        });
      });
    } else if (
      this.sortOption === "site" &&
      !this.historyMapBySite.length &&
      this.component === "firefoxview"
    ) {
      this.historyMapBySite = Array.from(
        this.allHistoryItems.entries(),
        ([domain, items]) => ({
          domain,
          items,
          l10nId: domain ? null : "firefoxview-history-site-localhost",
        })
      ).sort((a, b) => a.domain.localeCompare(b.domain));
    }
    this.host.requestUpdate();
  }
}
