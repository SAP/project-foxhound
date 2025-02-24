/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { TippyTopProvider } from "resource://activity-stream/lib/TippyTopProvider.sys.mjs";
import {
  insertPinned,
  TOP_SITES_MAX_SITES_PER_ROW,
} from "resource://activity-stream/common/Reducers.sys.mjs";
import { Dedupe } from "resource://activity-stream/common/Dedupe.sys.mjs";
import { shortURL } from "resource://activity-stream/lib/ShortURL.sys.mjs";

import {
  CUSTOM_SEARCH_SHORTCUTS,
  checkHasSearchEngine,
  getSearchProvider,
  getSearchFormURL,
} from "resource://activity-stream/lib/SearchShortcuts.sys.mjs";

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  FaviconFeed: "resource://activity-stream/lib/FaviconFeed.sys.mjs",
  FilterAdult: "resource://activity-stream/lib/FilterAdult.sys.mjs",
  LinksCache: "resource://activity-stream/lib/LinksCache.sys.mjs",
  NewTabUtils: "resource://gre/modules/NewTabUtils.sys.mjs",
  PlacesUtils: "resource://gre/modules/PlacesUtils.sys.mjs",
  Region: "resource://gre/modules/Region.sys.mjs",
  RemoteSettings: "resource://services-settings/remote-settings.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "log", () => {
  const { Logger } = ChromeUtils.importESModule(
    "resource://messaging-system/lib/Logger.sys.mjs"
  );
  return new Logger("TopSites");
});

export const DEFAULT_TOP_SITES = [];
const FRECENCY_THRESHOLD = 100 + 1; // 1 visit (skip first-run/one-time pages)
const MIN_FAVICON_SIZE = 96;
const PINNED_FAVICON_PROPS_TO_MIGRATE = [
  "favicon",
  "faviconRef",
  "faviconSize",
];

// Preferences
const NO_DEFAULT_SEARCH_TILE_PREF =
  "browser.newtabpage.activity-stream.improvesearch.noDefaultSearchTile";
const SEARCH_SHORTCUTS_HAVE_PINNED_PREF =
  "browser.newtabpage.activity-stream.improvesearch.topSiteSearchShortcuts.havePinned";
// TODO: Rename this when re-subscribing to the search engines pref.
const SEARCH_SHORTCUTS_ENGINES =
  "browser.newtabpage.activity-stream.improvesearch.topSiteSearchShortcuts.searchEngines";
const TOP_SITE_SEARCH_SHORTCUTS_PREF =
  "browser.newtabpage.activity-stream.improvesearch.topSiteSearchShortcuts";
const TOP_SITES_ROWS_PREF = "browser.newtabpage.activity-stream.topSitesRows";

// Search experiment stuff
const SEARCH_FILTERS = [
  "google",
  "search.yahoo",
  "yahoo",
  "bing",
  "ask",
  "duckduckgo",
];

const REMOTE_SETTING_DEFAULTS_PREF = "browser.topsites.useRemoteSetting";
const DEFAULT_SITES_OVERRIDE_PREF =
  "browser.newtabpage.activity-stream.default.sites";
const DEFAULT_SITES_EXPERIMENTS_PREF_BRANCH = "browser.topsites.experiment.";

function getShortURLForCurrentSearch() {
  const url = shortURL({ url: Services.search.defaultEngine.searchForm });
  return url;
}

class _TopSites {
  #inited = false;
  #searchShortcuts = [];
  #sites = [];

  constructor() {
    this._tippyTopProvider = new TippyTopProvider();
    ChromeUtils.defineLazyGetter(
      this,
      "_currentSearchHostname",
      getShortURLForCurrentSearch
    );
    this.dedupe = new Dedupe(this._dedupeKey);
    this.frecentCache = new lazy.LinksCache(
      lazy.NewTabUtils.activityStreamLinks,
      "getTopSites",
      [],
      (oldOptions, newOptions) =>
        // Refresh if no old options or requesting more items
        !(oldOptions.numItems >= newOptions.numItems)
    );
    this.pinnedCache = new lazy.LinksCache(
      lazy.NewTabUtils.pinnedLinks,
      "links",
      [...PINNED_FAVICON_PROPS_TO_MIGRATE]
    );
    this.faviconFeed = new lazy.FaviconFeed();
    this.handlePlacesEvents = this.handlePlacesEvents.bind(this);
  }

  async init() {
    if (this.#inited) {
      return;
    }
    this.#inited = true;
    lazy.log.debug("Initializing TopSites.");
    this.#addObservers();
    await this._readDefaults({ isStartup: true });
  }

  uninit() {
    if (!this.#inited) {
      return;
    }
    lazy.log.debug("Un-initializing TopSites.");
    this.#removeObservers();
    this.#searchShortcuts = [];
    this.#sites = [];
    this.#inited = false;
    this.frecentCache.expire();
    this.pinnedCache.expire();
  }

  #addObservers() {
    // If the feed was previously disabled PREFS_INITIAL_VALUES was never received
    Services.obs.addObserver(this, "browser-search-engine-modified");
    Services.obs.addObserver(this, "browser-region-updated");
    Services.obs.addObserver(this, "newtab-linkBlocked");
    Services.prefs.addObserver(REMOTE_SETTING_DEFAULTS_PREF, this);
    Services.prefs.addObserver(DEFAULT_SITES_OVERRIDE_PREF, this);
    Services.prefs.addObserver(DEFAULT_SITES_EXPERIMENTS_PREF_BRANCH, this);
    Services.prefs.addObserver(NO_DEFAULT_SEARCH_TILE_PREF, this);
    Services.prefs.addObserver(SEARCH_SHORTCUTS_ENGINES, this);
    Services.prefs.addObserver(TOP_SITES_ROWS_PREF, this);
    Services.prefs.addObserver(TOP_SITE_SEARCH_SHORTCUTS_PREF, this);
    lazy.PlacesUtils.observers.addListener(
      ["bookmark-added", "bookmark-removed", "history-cleared", "page-removed"],
      this.handlePlacesEvents
    );
  }

  #removeObservers() {
    Services.obs.removeObserver(this, "browser-search-engine-modified");
    Services.obs.removeObserver(this, "browser-region-updated");
    Services.obs.removeObserver(this, "newtab-linkBlocked");
    Services.prefs.removeObserver(REMOTE_SETTING_DEFAULTS_PREF, this);
    Services.prefs.removeObserver(DEFAULT_SITES_OVERRIDE_PREF, this);
    Services.prefs.removeObserver(DEFAULT_SITES_EXPERIMENTS_PREF_BRANCH, this);
    Services.prefs.removeObserver(NO_DEFAULT_SEARCH_TILE_PREF, this);
    Services.prefs.removeObserver(SEARCH_SHORTCUTS_ENGINES, this);
    Services.prefs.removeObserver(TOP_SITES_ROWS_PREF, this);
    Services.prefs.removeObserver(TOP_SITE_SEARCH_SHORTCUTS_PREF, this);
    lazy.PlacesUtils.observers.removeListener(
      ["bookmark-added", "bookmark-removed", "history-cleared", "page-removed"],
      this.handlePlacesEvents
    );
  }

  _reset() {
    // Allow automated tests to reset the internal state of the component.
    if (Cu.isInAutomation) {
      this.#searchShortcuts = [];
      this.#sites = [];
    }
  }

  observe(subj, topic, data) {
    switch (topic) {
      case "browser-search-engine-modified":
        // We should update the current top sites if the search engine has been changed since
        // the search engine that gets filtered out of top sites has changed.
        // We also need to drop search shortcuts when their engine gets removed / hidden.
        if (
          data === "engine-default" &&
          Services.prefs.getBoolPref(NO_DEFAULT_SEARCH_TILE_PREF, true)
        ) {
          delete this._currentSearchHostname;
          this._currentSearchHostname = getShortURLForCurrentSearch();
        }
        this.refresh({ broadcast: true });
        break;
      case "browser-region-updated":
        this._readDefaults();
        break;
      case "newtab-linkBlocked":
        this.frecentCache.expire();
        this.pinnedCache.expire();
        this.refresh();
        break;
      case "nsPref:changed":
        switch (data) {
          case DEFAULT_SITES_OVERRIDE_PREF:
          case REMOTE_SETTING_DEFAULTS_PREF:
            this._readDefaults();
            break;
          case NO_DEFAULT_SEARCH_TILE_PREF:
            this.refresh();
            break;
          case TOP_SITES_ROWS_PREF:
          case SEARCH_SHORTCUTS_ENGINES:
            this.refresh();
            break;
          case TOP_SITE_SEARCH_SHORTCUTS_PREF:
            if (Services.prefs.getBoolPref(TOP_SITE_SEARCH_SHORTCUTS_PREF)) {
              this.updateCustomSearchShortcuts();
            } else {
              this.unpinAllSearchShortcuts();
            }
            this.refresh();
            break;
          default:
            if (data.startsWith(DEFAULT_SITES_EXPERIMENTS_PREF_BRANCH)) {
              this._readDefaults();
            }
            break;
        }
        break;
    }
  }

  handlePlacesEvents(events) {
    for (const {
      itemType,
      source,
      url,
      isRemovedFromStore,
      isTagging,
      type,
    } of events) {
      switch (type) {
        case "history-cleared":
          this.frecentCache.expire();
          this.refresh();
          break;
        case "page-removed":
          if (isRemovedFromStore) {
            this.frecentCache.expire();
            this.refresh();
          }
          break;
        case "bookmark-added":
          // Skips items that are not bookmarks (like folders), about:* pages or
          // default bookmarks, added when the profile is created.
          if (
            isTagging ||
            itemType !== lazy.PlacesUtils.bookmarks.TYPE_BOOKMARK ||
            source === lazy.PlacesUtils.bookmarks.SOURCES.IMPORT ||
            source === lazy.PlacesUtils.bookmarks.SOURCES.RESTORE ||
            source === lazy.PlacesUtils.bookmarks.SOURCES.RESTORE_ON_STARTUP ||
            source === lazy.PlacesUtils.bookmarks.SOURCES.SYNC ||
            (!url.startsWith("http://") && !url.startsWith("https://"))
          ) {
            return;
          }

          // TODO: Add a timed delay in case many links are changed.
          this.frecentCache.expire();
          this.refresh();
          break;
        case "bookmark-removed":
          if (
            isTagging ||
            (itemType === lazy.PlacesUtils.bookmarks.TYPE_BOOKMARK &&
              source !== lazy.PlacesUtils.bookmarks.SOURCES.IMPORT &&
              source !== lazy.PlacesUtils.bookmarks.SOURCES.RESTORE &&
              source !==
                lazy.PlacesUtils.bookmarks.SOURCES.RESTORE_ON_STARTUP &&
              source !== lazy.PlacesUtils.bookmarks.SOURCES.SYNC)
          ) {
            // TODO: Add a timed delay in case many links are changed.
            this.frecentCache.expire();
            this.refresh();
          }
          break;
      }
    }
  }

  /**
   * Returns a copied version of non-sponsored Top Sites. It will initialize
   * the component if it hasn't been already in order to set up and cache the
   * list, which will include pinned sites and search shortcuts. The number of
   * Top Sites returned is based on the number shown on New Tab due to the fact
   * it is the interface in which sites can be pinned/removed.
   *
   * @returns {Array<object>}
   *   A list of Top Sites.
   */
  async getSites() {
    if (!this.#inited) {
      await this.init();
      // TopSites was initialized by the store calling the initialization
      // function and then updating custom search shortcuts. Since
      // initialization now happens upon the first get, we move the update
      // custom search shortcuts here.
      await this.updateCustomSearchShortcuts(true);
    }
    return structuredClone(this.#sites);
  }

  async getSearchShortcuts() {
    if (!this.#inited) {
      await this.init();
      // TopSites was initialized by the store calling the initialization
      // function and then updating custom search shortcuts. Since
      // initialization now happens upon the first get, we move the update
      // custom search shortcuts here.
      await this.updateCustomSearchShortcuts(true);
    }
    return structuredClone(this.#searchShortcuts);
  }

  _dedupeKey(site) {
    return site && site.hostname;
  }

  /**
   * _readDefaults - sets DEFAULT_TOP_SITES
   */
  async _readDefaults({ isStartup = false } = {}) {
    this._useRemoteSetting = false;

    if (!Services.prefs.getBoolPref(REMOTE_SETTING_DEFAULTS_PREF)) {
      let sites = Services.prefs.getStringPref(DEFAULT_SITES_OVERRIDE_PREF, "");
      await this.refreshDefaults(sites, { isStartup });
      return;
    }

    // Try using default top sites from enterprise policies or tests. The pref
    // is locked when set via enterprise policy. Tests have no default sites
    // unless they set them via this pref.
    if (
      Services.prefs.prefIsLocked(DEFAULT_SITES_OVERRIDE_PREF) ||
      Cu.isInAutomation
    ) {
      let sites = Services.prefs.getStringPref(DEFAULT_SITES_OVERRIDE_PREF, "");
      await this.refreshDefaults(sites, { isStartup });
      return;
    }

    // Clear out the array of any previous defaults.
    DEFAULT_TOP_SITES.length = 0;

    // Read defaults from remote settings.
    this._useRemoteSetting = true;
    let remoteSettingData = await this._getRemoteConfig();

    for (let siteData of remoteSettingData) {
      let hostname = shortURL(siteData);
      let link = {
        isDefault: true,
        url: siteData.url,
        hostname,
        sendAttributionRequest: !!siteData.send_attribution_request,
      };
      if (siteData.url_urlbar_override) {
        link.url_urlbar = siteData.url_urlbar_override;
      }
      if (siteData.title) {
        link.label = siteData.title;
      }
      if (siteData.search_shortcut) {
        link = await this.topSiteToSearchTopSite(link);
      }
      DEFAULT_TOP_SITES.push(link);
    }

    await this.refresh({ isStartup });
  }

  async refreshDefaults(sites, { isStartup = false } = {}) {
    // Clear out the array of any previous defaults
    DEFAULT_TOP_SITES.length = 0;

    // Add default sites if any based on the pref
    if (sites) {
      for (const url of sites.split(",")) {
        const site = {
          isDefault: true,
          url,
        };
        site.hostname = shortURL(site);
        DEFAULT_TOP_SITES.push(site);
      }
    }

    await this.refresh({ isStartup });
  }

  async _getRemoteConfig(firstTime = true) {
    if (!this._remoteConfig) {
      this._remoteConfig = await lazy.RemoteSettings("top-sites");
      this._remoteConfig.on("sync", () => {
        this._readDefaults();
      });
    }

    let result = [];
    let failed = false;
    try {
      result = await this._remoteConfig.get();
    } catch (ex) {
      console.error(ex);
      failed = true;
    }
    if (!result.length) {
      console.error("Received empty top sites configuration!");
      failed = true;
    }
    // If we failed, or the result is empty, try loading from the local dump.
    if (firstTime && failed) {
      await this._remoteConfig.db.clear();
      // Now call this again.
      return this._getRemoteConfig(false);
    }

    // Sort sites based on the "order" attribute.
    result.sort((a, b) => a.order - b.order);

    result = result.filter(topsite => {
      // Filter by region.
      if (topsite.exclude_regions?.includes(lazy.Region.home)) {
        return false;
      }
      if (
        topsite.include_regions?.length &&
        !topsite.include_regions.includes(lazy.Region.home)
      ) {
        return false;
      }

      // Filter by locale.
      if (topsite.exclude_locales?.includes(Services.locale.appLocaleAsBCP47)) {
        return false;
      }
      if (
        topsite.include_locales?.length &&
        !topsite.include_locales.includes(Services.locale.appLocaleAsBCP47)
      ) {
        return false;
      }

      // Filter by experiment.
      // Exclude this top site if any of the specified experiments are running.
      if (
        topsite.exclude_experiments?.some(experimentID =>
          Services.prefs.getBoolPref(
            DEFAULT_SITES_EXPERIMENTS_PREF_BRANCH + experimentID,
            false
          )
        )
      ) {
        return false;
      }
      // Exclude this top site if none of the specified experiments are running.
      if (
        topsite.include_experiments?.length &&
        topsite.include_experiments.every(
          experimentID =>
            !Services.prefs.getBoolPref(
              DEFAULT_SITES_EXPERIMENTS_PREF_BRANCH + experimentID,
              false
            )
        )
      ) {
        return false;
      }

      return true;
    });

    return result;
  }

  /**
   * shouldFilterSearchTile - is default filtering enabled and does a given hostname match the user's default search engine?
   *
   * @param {string} hostname a top site hostname, such as "amazon" or "foo"
   * @returns {bool}
   */
  shouldFilterSearchTile(hostname) {
    if (
      Services.prefs.getBoolPref(NO_DEFAULT_SEARCH_TILE_PREF, true) &&
      (SEARCH_FILTERS.includes(hostname) ||
        hostname === this._currentSearchHostname)
    ) {
      return true;
    }
    return false;
  }

  /**
   * _maybeInsertSearchShortcuts - if the search shortcuts experiment is running,
   *                               insert search shortcuts if needed
   *
   * @param {Array} plainPinnedSites (from the pinnedSitesCache)
   * @returns {boolean} Did we insert any search shortcuts?
   */
  async _maybeInsertSearchShortcuts(plainPinnedSites) {
    // Only insert shortcuts if the experiment is running
    if (Services.prefs.getBoolPref(TOP_SITE_SEARCH_SHORTCUTS_PREF, true)) {
      // We don't want to insert shortcuts we've previously inserted
      const prevInsertedShortcuts = Services.prefs
        .getStringPref(SEARCH_SHORTCUTS_HAVE_PINNED_PREF, "")
        .split(",")
        .filter(s => s); // Filter out empty strings
      const newInsertedShortcuts = [];

      let shouldPin = this._useRemoteSetting
        ? DEFAULT_TOP_SITES.filter(s => s.searchTopSite).map(s => s.hostname)
        : Services.prefs.getStringPref(SEARCH_SHORTCUTS_ENGINES, "").split(",");
      shouldPin = shouldPin
        .map(getSearchProvider)
        .filter(s => s && s.shortURL !== this._currentSearchHostname);

      // If we've previously inserted all search shortcuts return early
      if (
        shouldPin.every(shortcut =>
          prevInsertedShortcuts.includes(shortcut.shortURL)
        )
      ) {
        return false;
      }

      const numberOfSlots =
        Services.prefs.getIntPref(TOP_SITES_ROWS_PREF, 1) *
        TOP_SITES_MAX_SITES_PER_ROW;

      // The plainPinnedSites array is populated with pinned sites at their
      // respective indices, and null everywhere else, but is not always the
      // right length
      const emptySlots = Math.max(numberOfSlots - plainPinnedSites.length, 0);
      const pinnedSites = [...plainPinnedSites].concat(
        Array(emptySlots).fill(null)
      );

      const tryToInsertSearchShortcut = async shortcut => {
        const nextAvailable = pinnedSites.indexOf(null);
        // Only add a search shortcut if the site isn't already pinned, we
        // haven't previously inserted it, there's space to pin it, and the
        // search engine is available in Firefox
        if (
          !pinnedSites.find(s => s && shortURL(s) === shortcut.shortURL) &&
          !prevInsertedShortcuts.includes(shortcut.shortURL) &&
          nextAvailable > -1 &&
          (await checkHasSearchEngine(shortcut.keyword))
        ) {
          const site = await this.topSiteToSearchTopSite({ url: shortcut.url });
          this._pinSiteAt(site, nextAvailable);
          pinnedSites[nextAvailable] = site;
          newInsertedShortcuts.push(shortcut.shortURL);
        }
      };

      for (let shortcut of shouldPin) {
        await tryToInsertSearchShortcut(shortcut);
      }

      if (newInsertedShortcuts.length) {
        Services.prefs.setStringPref(
          SEARCH_SHORTCUTS_HAVE_PINNED_PREF,
          prevInsertedShortcuts.concat(newInsertedShortcuts).join(",")
        );
        return true;
      }
    }

    return false;
  }

  // eslint-disable-next-line max-statements
  async getLinksWithDefaults() {
    // Clear the previous sites.
    this.#sites = [];

    const numItems =
      Services.prefs.getIntPref(TOP_SITES_ROWS_PREF, 1) *
      TOP_SITES_MAX_SITES_PER_ROW;
    const searchShortcutsExperiment = Services.prefs.getBoolPref(
      TOP_SITE_SEARCH_SHORTCUTS_PREF,
      true
    );
    // We must wait for search services to initialize in order to access default
    // search engine properties without triggering a synchronous initialization
    try {
      await Services.search.init();
    } catch {
      // We continue anyway because we want the user to see their sponsored,
      // saved, or visited shortcut tiles even if search engines are not
      // available.
    }

    // Get all frecent sites from history.
    let frecent = [];
    let cache;
    try {
      // Request can throw if executing the linkGetter inside LinksCache returns
      // a null object.
      cache = await this.frecentCache.request({
        // We need to overquery due to the top 5 alexa search + default search possibly being removed
        numItems: numItems + SEARCH_FILTERS.length + 1,
        topsiteFrecency: FRECENCY_THRESHOLD,
      });
    } catch (ex) {
      cache = [];
    }

    for (let link of cache) {
      // The cache can contain null values.
      if (!link) {
        continue;
      }
      const hostname = shortURL(link);
      if (!this.shouldFilterSearchTile(hostname)) {
        frecent.push({
          ...(searchShortcutsExperiment
            ? await this.topSiteToSearchTopSite(link)
            : link),
          hostname,
        });
      }
    }

    // Get defaults.
    let notBlockedDefaultSites = [];
    for (let link of DEFAULT_TOP_SITES) {
      if (this.shouldFilterSearchTile(link.hostname)) {
        continue;
      }
      // Drop blocked default sites.
      if (
        lazy.NewTabUtils.blockedLinks.isBlocked({
          url: link.url,
        })
      ) {
        continue;
      }
      // If we've previously blocked a search shortcut, remove the default top site
      // that matches the hostname
      const searchProvider = getSearchProvider(shortURL(link));
      if (
        searchProvider &&
        lazy.NewTabUtils.blockedLinks.isBlocked({ url: searchProvider.url })
      ) {
        continue;
      }
      notBlockedDefaultSites.push(
        searchShortcutsExperiment
          ? await this.topSiteToSearchTopSite(link)
          : link
      );
    }

    // Get pinned links augmented with desired properties
    let plainPinned = await this.pinnedCache.request();

    // Insert search shortcuts if we need to.
    // _maybeInsertSearchShortcuts returns true if any search shortcuts are
    // inserted, meaning we need to expire and refresh the pinnedCache
    if (await this._maybeInsertSearchShortcuts(plainPinned)) {
      this.pinnedCache.expire();
      plainPinned = await this.pinnedCache.request();
    }

    const pinned = await Promise.all(
      plainPinned.map(async link => {
        if (!link) {
          return link;
        }

        // Drop pinned search shortcuts when their engine has been removed / hidden.
        if (link.searchTopSite) {
          const searchProvider = getSearchProvider(shortURL(link));
          if (
            !searchProvider ||
            !(await checkHasSearchEngine(searchProvider.keyword))
          ) {
            return null;
          }
        }

        // Copy all properties from a frecent link and add more
        const finder = other => other.url === link.url;

        const frecentSite = frecent.find(finder);
        // If the link is a frecent site, do not copy over 'isDefault', else check
        // if the site is a default site
        const copy = Object.assign(
          {},
          frecentSite || { isDefault: !!notBlockedDefaultSites.find(finder) },
          link,
          { hostname: shortURL(link) },
          { searchTopSite: !!link.searchTopSite }
        );

        // Add in favicons if we don't already have it
        if (!copy.favicon) {
          try {
            lazy.NewTabUtils.activityStreamProvider._faviconBytesToDataURI(
              await lazy.NewTabUtils.activityStreamProvider._addFavicons([copy])
            );

            for (const prop of PINNED_FAVICON_PROPS_TO_MIGRATE) {
              copy.__sharedCache.updateLink(prop, copy[prop]);
            }
          } catch (e) {
            // Some issue with favicon, so just continue without one
          }
        }

        return copy;
      })
    );

    // Remove any duplicates from frecent and default sites
    const [, dedupedFrecent, dedupedDefaults] = this.dedupe.group(
      pinned,
      frecent,
      notBlockedDefaultSites
    );
    const dedupedUnpinned = [...dedupedFrecent, ...dedupedDefaults];

    // Remove adult sites if we need to
    const checkedAdult = lazy.FilterAdult.filter(dedupedUnpinned);

    // Insert the original pinned sites into the deduped frecent and defaults.
    let withPinned = insertPinned(checkedAdult, pinned);
    // Remove excess items.
    withPinned = withPinned.slice(0, numItems);

    // Now, get a tippy top icon or a rich icon for every item.
    for (const link of withPinned) {
      if (link) {
        if (link.searchTopSite && !link.isDefault) {
          await this._attachTippyTopIconForSearchShortcut(link, link.label);
        } else {
          this._fetchIcon(link);
        }

        // Remove internal properties that might be updated after dispatch
        delete link.__sharedCache;

        // Indicate that these links should get a frecency bonus when clicked
        link.typedBonus = true;
      }
    }

    this.#sites = withPinned;

    return withPinned;
  }

  /**
   * Attach TippyTop icon to the given search shortcut
   *
   * Note that it queries the search form URL from search service For Yandex,
   * and uses it to choose the best icon for its shortcut variants.
   *
   * @param {object} link A link object with a `url` property
   * @param {string} keyword Search keyword
   */
  async _attachTippyTopIconForSearchShortcut(link, keyword) {
    if (
      ["@\u044F\u043D\u0434\u0435\u043A\u0441", "@yandex"].includes(keyword)
    ) {
      let site = { url: link.url };
      site.url = (await getSearchFormURL(keyword)) || site.url;
      this._tippyTopProvider.processSite(site);
      link.tippyTopIcon = site.tippyTopIcon;
      link.smallFavicon = site.smallFavicon;
      link.backgroundColor = site.backgroundColor;
    } else {
      this._tippyTopProvider.processSite(link);
    }
  }

  /**
   * Refresh the top sites data for content.
   *
   * @param {object} options
   * @param {bool} options.isStartup Being called while TopSitesFeed is initting.
   */
  async refresh(options = {}) {
    // Avoiding refreshing if it's already happening.
    if (this._refreshing) {
      return;
    }
    if (!this._startedUp && !options.isStartup) {
      // Initial refresh still pending.
      return;
    }
    this._refreshing = true;
    this._startedUp = true;

    if (!this._tippyTopProvider.initialized) {
      await this._tippyTopProvider.init();
    }

    await this.getLinksWithDefaults();
    this._refreshing = false;
    Services.obs.notifyObservers(null, "topsites-refreshed", options.isStartup);
  }

  async updateCustomSearchShortcuts(isStartup = false) {
    if (
      !Services.prefs.getBoolPref(
        "browser.newtabpage.activity-stream.improvesearch.noDefaultSearchTile",
        true
      )
    ) {
      return;
    }

    if (!this._tippyTopProvider.initialized) {
      await this._tippyTopProvider.init();
    }

    // Populate the state with available search shortcuts
    let searchShortcuts = [];
    for (const engine of await Services.search.getAppProvidedEngines()) {
      const shortcut = CUSTOM_SEARCH_SHORTCUTS.find(s =>
        engine.aliases.includes(s.keyword)
      );
      if (shortcut) {
        let clone = { ...shortcut };
        await this._attachTippyTopIconForSearchShortcut(clone, clone.keyword);
        searchShortcuts.push(clone);
      }
    }

    // TODO: Determine what the purpose of this is.
    this.#searchShortcuts = searchShortcuts;

    Services.obs.notifyObservers(
      null,
      "topsites-updated-custom-search-shortcuts",
      isStartup
    );
  }

  async topSiteToSearchTopSite(site) {
    const searchProvider = getSearchProvider(shortURL(site));
    if (
      !searchProvider ||
      !(await checkHasSearchEngine(searchProvider.keyword))
    ) {
      return site;
    }
    return {
      ...site,
      searchTopSite: true,
      label: searchProvider.keyword,
    };
  }

  /**
   * Get an image for the link preferring tippy top, or rich favicon.
   */
  async _fetchIcon(link) {
    // Nothing to do if we already have a rich icon from the page
    if (link.favicon && link.faviconSize >= MIN_FAVICON_SIZE) {
      return;
    }

    // Nothing more to do if we can use a default tippy top icon
    this._tippyTopProvider.processSite(link);
    if (link.tippyTopIcon) {
      return;
    }

    // Make a request for a better icon
    this._requestRichIcon(link.url);
  }

  _requestRichIcon(url) {
    this.faviconFeed.fetchIcon(url);
  }

  /**
   * Inform others that top sites data has been updated due to pinned changes.
   */
  _broadcastPinnedSitesUpdated() {
    // Pinned data changed, so make sure we get latest
    this.pinnedCache.expire();

    // Refresh to trigger deduping, etc.
    this.refresh();
  }

  /**
   * Pin a site at a specific position saving only the desired keys.
   *
   * @param label {string} User set string of custom site name
   */
  // To refactor in Bug 1891997
  /* eslint-enable jsdoc/check-param-names */
  async _pinSiteAt({ label, url, searchTopSite }, index) {
    const toPin = { url };
    if (label) {
      toPin.label = label;
    }
    if (searchTopSite) {
      toPin.searchTopSite = searchTopSite;
    }
    lazy.NewTabUtils.pinnedLinks.pin(toPin, index);
  }

  /**
   * Handle a pin action of a site to a position.
   */
  async pin(action) {
    let { site, index } = action.data;
    index = this._adjustPinIndexForSponsoredLinks(site, index);
    // If valid index provided, pin at that position
    if (index >= 0) {
      await this._pinSiteAt(site, index);
      this._broadcastPinnedSitesUpdated();
    } else {
      // Bug 1458658. If the top site is being pinned from an 'Add a Top Site' option,
      // then we want to make sure to unblock that link if it has previously been
      // blocked. We know if the site has been added because the index will be -1.
      if (index === -1) {
        lazy.NewTabUtils.blockedLinks.unblock({ url: site.url });
        this.frecentCache.expire();
      }
      this.insert(action);
    }
  }

  /**
   * Handle an unpin action of a site.
   */
  unpin(action) {
    const { site } = action.data;
    lazy.NewTabUtils.pinnedLinks.unpin(site);
    this._broadcastPinnedSitesUpdated();
  }

  unpinAllSearchShortcuts() {
    Services.prefs.clearUserPref(SEARCH_SHORTCUTS_HAVE_PINNED_PREF);
    for (let pinnedLink of lazy.NewTabUtils.pinnedLinks.links) {
      if (pinnedLink && pinnedLink.searchTopSite) {
        lazy.NewTabUtils.pinnedLinks.unpin(pinnedLink);
      }
    }
    this.pinnedCache.expire();
  }

  _unpinSearchShortcut(vendor) {
    for (let pinnedLink of lazy.NewTabUtils.pinnedLinks.links) {
      if (
        pinnedLink &&
        pinnedLink.searchTopSite &&
        shortURL(pinnedLink) === vendor
      ) {
        lazy.NewTabUtils.pinnedLinks.unpin(pinnedLink);
        this.pinnedCache.expire();

        const prevInsertedShortcuts = Services.prefs.getStringPref(
          SEARCH_SHORTCUTS_HAVE_PINNED_PREF,
          ""
        );
        Services.prefs.setStringPref(
          SEARCH_SHORTCUTS_HAVE_PINNED_PREF,
          prevInsertedShortcuts.filter(s => s !== vendor).join(",")
        );
        break;
      }
    }
  }

  /**
   * Reduces the given pinning index by the number of preceding sponsored
   * sites, to accomodate for sponsored sites pushing pinned ones to the side,
   * effectively increasing their index again.
   */
  _adjustPinIndexForSponsoredLinks(site, index) {
    if (!this.#sites) {
      return index;
    }
    // Adjust insertion index for sponsored sites since their position is
    // fixed.
    let adjustedIndex = index;
    for (let i = 0; i < index; i++) {
      const link = this.#sites[i];
      if (link && link.sponsored_position && this.#sites[i]?.url !== site.url) {
        adjustedIndex--;
      }
    }
    return adjustedIndex;
  }

  /**
   * Insert a site to pin at a position shifting over any other pinned sites.
   */
  _insertPin(site, originalIndex, draggedFromIndex) {
    let index = this._adjustPinIndexForSponsoredLinks(site, originalIndex);

    // Don't insert any pins past the end of the visible top sites. Otherwise,
    // we can end up with a bunch of pinned sites that can never be unpinned again
    // from the UI.
    const topSitesCount =
      Services.prefs.getIntPref(TOP_SITES_ROWS_PREF, 1) *
      TOP_SITES_MAX_SITES_PER_ROW;
    if (index >= topSitesCount) {
      return;
    }

    let pinned = lazy.NewTabUtils.pinnedLinks.links;
    if (!pinned[index]) {
      this._pinSiteAt(site, index);
    } else {
      pinned[draggedFromIndex] = null;
      // Find the hole to shift the pinned site(s) towards. We shift towards the
      // hole left by the site being dragged.
      let holeIndex = index;
      const indexStep = index > draggedFromIndex ? -1 : 1;
      while (pinned[holeIndex]) {
        holeIndex += indexStep;
      }
      if (holeIndex >= topSitesCount || holeIndex < 0) {
        // There are no holes, so we will effectively unpin the last slot and shifting
        // towards it. This only happens when adding a new top site to an already
        // fully pinned grid.
        holeIndex = topSitesCount - 1;
      }

      // Shift towards the hole.
      const shiftingStep = holeIndex > index ? -1 : 1;
      while (holeIndex !== index) {
        const nextIndex = holeIndex + shiftingStep;
        this._pinSiteAt(pinned[nextIndex], holeIndex);
        holeIndex = nextIndex;
      }
      this._pinSiteAt(site, index);
    }
  }

  /**
   * Handle an insert (drop/add) action of a site.
   */
  async insert(action) {
    let { index } = action.data;
    // Treat invalid pin index values (e.g., -1, undefined) as insert in the first position
    if (!(index > 0)) {
      index = 0;
    }

    // Inserting a top site pins it in the specified slot, pushing over any link already
    // pinned in the slot (unless it's the last slot, then it replaces).
    this._insertPin(
      action.data.site,
      index,
      action.data.draggedFromIndex !== undefined
        ? action.data.draggedFromIndex
        : Services.prefs.getIntPref(TOP_SITES_ROWS_PREF, 1) *
            TOP_SITES_MAX_SITES_PER_ROW
    );

    this._broadcastPinnedSitesUpdated();
  }

  updatePinnedSearchShortcuts({ addedShortcuts, deletedShortcuts }) {
    // Unpin the deletedShortcuts.
    deletedShortcuts.forEach(({ url }) => {
      lazy.NewTabUtils.pinnedLinks.unpin({ url });
    });

    // Pin the addedShortcuts.
    const numberOfSlots =
      Services.prefs.getIntPref(TOP_SITES_ROWS_PREF, 1) *
      TOP_SITES_MAX_SITES_PER_ROW;
    addedShortcuts.forEach(shortcut => {
      // Find first hole in pinnedLinks.
      let index = lazy.NewTabUtils.pinnedLinks.links.findIndex(link => !link);
      if (
        index < 0 &&
        lazy.NewTabUtils.pinnedLinks.links.length + 1 < numberOfSlots
      ) {
        // pinnedLinks can have less slots than the total available.
        index = lazy.NewTabUtils.pinnedLinks.links.length;
      }
      if (index >= 0) {
        lazy.NewTabUtils.pinnedLinks.pin(shortcut, index);
      } else {
        // No slots available, we need to do an insert in first slot and push over other pinned links.
        this._insertPin(shortcut, 0, numberOfSlots);
      }
    });

    this._broadcastPinnedSitesUpdated();
  }
}

export const TopSites = new _TopSites();
