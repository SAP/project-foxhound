/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// We use importESModule here instead of static import so that
// the Karma test environment won't choke on this module. This
// is because the Karma test environment already stubs out
// AppConstants, and overrides importESModule to be a no-op (which
// can't be done for a static import statement).

// eslint-disable-next-line mozilla/use-static-import
const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  AboutPreferences: "resource://activity-stream/lib/AboutPreferences.sys.mjs",
  DEFAULT_SITES: "resource://activity-stream/lib/DefaultSites.sys.mjs",
  DefaultPrefs: "resource://activity-stream/lib/ActivityStreamPrefs.sys.mjs",
  DiscoveryStreamFeed:
    "resource://activity-stream/lib/DiscoveryStreamFeed.sys.mjs",
  FaviconFeed: "resource://activity-stream/lib/FaviconFeed.sys.mjs",
  HighlightsFeed: "resource://activity-stream/lib/HighlightsFeed.sys.mjs",
  NewTabInit: "resource://activity-stream/lib/NewTabInit.sys.mjs",
  NimbusFeatures: "resource://nimbus/ExperimentAPI.sys.mjs",
  PrefsFeed: "resource://activity-stream/lib/PrefsFeed.sys.mjs",
  PlacesFeed: "resource://activity-stream/lib/PlacesFeed.sys.mjs",
  RecommendationProvider:
    "resource://activity-stream/lib/RecommendationProvider.sys.mjs",
  Region: "resource://gre/modules/Region.sys.mjs",
  SectionsFeed: "resource://activity-stream/lib/SectionsManager.sys.mjs",
  Store: "resource://activity-stream/lib/Store.sys.mjs",
  SystemTickFeed: "resource://activity-stream/lib/SystemTickFeed.sys.mjs",
  TelemetryFeed: "resource://activity-stream/lib/TelemetryFeed.sys.mjs",
  TopSitesFeed: "resource://activity-stream/lib/TopSitesFeed.sys.mjs",
  TopStoriesFeed: "resource://activity-stream/lib/TopStoriesFeed.sys.mjs",
  WallpaperFeed: "resource://activity-stream/lib/WallpaperFeed.sys.mjs",
  WeatherFeed: "resource://activity-stream/lib/WeatherFeed.sys.mjs",
});

// NB: Eagerly load modules that will be loaded/constructed/initialized in the
// common case to avoid the overhead of wrapping and detecting lazy loading.
import {
  actionCreators as ac,
  actionTypes as at,
} from "resource://activity-stream/common/Actions.mjs";

const REGION_TOPICS_CONFIG =
  "browser.newtabpage.activity-stream.discoverystream.topicSelection.region-topics-config";
const LOCALE_TOPICS_CONFIG =
  "browser.newtabpage.activity-stream.discoverystream.topicSelection.locale-topics-config";
const REGION_BASIC_CONFIG =
  "browser.newtabpage.activity-stream.discoverystream.region-basic-config";

const REGION_THUMBS_CONFIG =
  "browser.newtabpage.activity-stream.discoverystream.thumbsUpDown.region-thumbs-config";
const LOCALE_THUMBS_CONFIG =
  "browser.newtabpage.activity-stream.discoverystream.thumbsUpDown.locale-thumbs-config";

// Determine if spocs should be shown for a geo/locale
function showSpocs({ geo }) {
  const spocsGeoString =
    lazy.NimbusFeatures.pocketNewtab.getVariable("regionSpocsConfig") || "";
  const spocsGeo = spocsGeoString.split(",").map(s => s.trim());
  return spocsGeo.includes(geo);
}

function showWeather({ geo, locale }) {
  const weatherGeoString =
    lazy.NimbusFeatures.pocketNewtab.getVariable("regionWeatherConfig") || "";
  const weatherLocaleString =
    lazy.NimbusFeatures.pocketNewtab.getVariable("localeWeatherConfig") || "";
  const weatherGeo = weatherGeoString
    .split(",")
    .map(s => s.trim())
    .filter(item => item);
  const weatherLocale = weatherLocaleString
    .split(",")
    .map(s => s.trim())
    .filter(item => item);
  return weatherGeo.includes(geo) && weatherLocale.includes(locale);
}

function showTopicsSelection({ geo, locale }) {
  const topicsGeoString =
    Services.prefs.getStringPref(REGION_TOPICS_CONFIG) || "";
  const topicsLocaleString =
    Services.prefs.getStringPref(LOCALE_TOPICS_CONFIG) || "";
  const topicsGeo = topicsGeoString
    .split(",")
    .map(s => s.trim())
    .filter(item => item);
  const topicsLocale = topicsLocaleString
    .split(",")
    .map(s => s.trim())
    .filter(item => item);
  return topicsGeo.includes(geo) && topicsLocale.includes(locale);
}

function showThumbsUpDown({ geo, locale }) {
  const thumbsUpDownGeoString =
    Services.prefs.getStringPref(REGION_THUMBS_CONFIG) || "";
  const thumbsUpDownLocaleString =
    Services.prefs.getStringPref(LOCALE_THUMBS_CONFIG) || "";
  const thumbsUpDownGeo = thumbsUpDownGeoString
    .split(",")
    .map(s => s.trim())
    .filter(item => item);
  const thumbsUpDownLocale = thumbsUpDownLocaleString
    .split(",")
    .map(s => s.trim())
    .filter(item => item);
  return thumbsUpDownGeo.includes(geo) && thumbsUpDownLocale.includes(locale);
}

// Configure default Activity Stream prefs with a plain `value` or a `getValue`
// that computes a value. A `value_local_dev` is used for development defaults.
export const PREFS_CONFIG = new Map([
  [
    "default.sites",
    {
      title:
        "Comma-separated list of default top sites to fill in behind visited sites",
      getValue: ({ geo }) =>
        lazy.DEFAULT_SITES.get(lazy.DEFAULT_SITES.has(geo) ? geo : ""),
    },
  ],
  [
    "feeds.section.topstories.options",
    {
      title: "Configuration options for top stories feed",
      // This is a dynamic pref as it depends on the feed being shown or not
      getValue: args =>
        JSON.stringify({
          api_key_pref: "extensions.pocket.oAuthConsumerKey",
          // Use the opposite value as what default value the feed would have used
          hidden: !PREFS_CONFIG.get("feeds.system.topstories").getValue(args),
          provider_icon: "chrome://global/skin/icons/pocket.svg",
          provider_name: "Pocket",
          read_more_endpoint:
            "https://getpocket.com/explore/trending?src=fx_new_tab",
          stories_endpoint: `https://getpocket.cdn.mozilla.net/v3/firefox/global-recs?version=3&consumer_key=$apiKey&locale_lang=${
            args.locale
          }&feed_variant=${
            showSpocs(args) ? "default_spocs_on" : "default_spocs_off"
          }`,
          stories_referrer: "https://getpocket.com/recommendations",
          topics_endpoint: `https://getpocket.cdn.mozilla.net/v3/firefox/trending-topics?version=2&consumer_key=$apiKey&locale_lang=${args.locale}`,
          show_spocs: showSpocs(args),
        }),
    },
  ],
  [
    "feeds.topsites",
    {
      title: "Displays Top Sites on the New Tab Page",
      value: true,
    },
  ],
  [
    "hideTopSitesTitle",
    {
      title:
        "Hide the top sites section's title, including the section and collapse icons",
      value: false,
    },
  ],
  [
    "showSponsored",
    {
      title: "User pref for sponsored Pocket content",
      value: true,
    },
  ],
  [
    "system.showSponsored",
    {
      title: "System pref for sponsored Pocket content",
      // This pref is dynamic as the sponsored content depends on the region
      getValue: showSpocs,
    },
  ],
  [
    "showSponsoredTopSites",
    {
      title: "Show sponsored top sites",
      value: true,
    },
  ],
  [
    "system.showWeather",
    {
      title: "system.showWeather",
      // pref is dynamic
      getValue: showWeather,
    },
  ],
  [
    "showWeather",
    {
      title: "showWeather",
      value: true,
    },
  ],
  [
    "weather.query",
    {
      title: "weather.query",
      value: "",
    },
  ],
  [
    "weather.locationSearchEnabled",
    {
      title: "Enable the option to search for a specific city",
      value: false,
    },
  ],
  [
    "weather.temperatureUnits",
    {
      title: "Switch the temperature between Celsius and Fahrenheit",
      getValue: args => (args.locale === "en-US" ? "f" : "c"),
    },
  ],
  [
    "weather.display",
    {
      title:
        "Toggle the weather widget to include a text summary of the current conditions",
      value: "simple",
    },
  ],
  [
    "pocketCta",
    {
      title: "Pocket cta and button for logged out users.",
      value: JSON.stringify({
        cta_button: "",
        cta_text: "",
        cta_url: "",
        use_cta: false,
      }),
    },
  ],
  [
    "showSearch",
    {
      title: "Show the Search bar",
      value: true,
    },
  ],
  [
    "topSitesRows",
    {
      title: "Number of rows of Top Sites to display",
      value: 1,
    },
  ],
  [
    "telemetry",
    {
      title: "Enable system error and usage data collection",
      value: true,
      value_local_dev: false,
    },
  ],
  [
    "telemetry.ut.events",
    {
      title: "Enable Unified Telemetry event data collection",
      value: AppConstants.EARLY_BETA_OR_EARLIER,
      value_local_dev: false,
    },
  ],
  [
    "telemetry.structuredIngestion.endpoint",
    {
      title: "Structured Ingestion telemetry server endpoint",
      value: "https://incoming.telemetry.mozilla.org/submit",
    },
  ],
  [
    "section.highlights.includeVisited",
    {
      title:
        "Boolean flag that decides whether or not to show visited pages in highlights.",
      value: true,
    },
  ],
  [
    "section.highlights.includeBookmarks",
    {
      title:
        "Boolean flag that decides whether or not to show bookmarks in highlights.",
      value: true,
    },
  ],
  [
    "section.highlights.includePocket",
    {
      title:
        "Boolean flag that decides whether or not to show saved Pocket stories in highlights.",
      value: true,
    },
  ],
  [
    "section.highlights.includeDownloads",
    {
      title:
        "Boolean flag that decides whether or not to show saved recent Downloads in highlights.",
      value: true,
    },
  ],
  [
    "section.highlights.rows",
    {
      title: "Number of rows of Highlights to display",
      value: 1,
    },
  ],
  [
    "section.topstories.rows",
    {
      title: "Number of rows of Top Stories to display",
      value: 1,
    },
  ],
  [
    "sectionOrder",
    {
      title: "The rendering order for the sections",
      value: "topsites,topstories,highlights",
    },
  ],
  [
    "newtabWallpapers.enabled",
    {
      title: "Boolean flag to turn wallpaper functionality on and off",
      value: false,
    },
  ],
  [
    "newtabWallpapers.v2.enabled",
    {
      title: "Boolean flag to turn wallpaper v2 functionality on and off",
      value: false,
    },
  ],
  [
    "newtabWallpapers.highlightEnabled",
    {
      title: "Boolean flag to show the highlight about the Wallpaper feature",
      value: false,
    },
  ],
  [
    "newtabWallpapers.highlightDismissed",
    {
      title:
        "Boolean flag to remember if the user has seen the feature highlight",
      value: false,
    },
  ],
  [
    "newtabWallpapers.highlightSeenCounter",
    {
      title: "Count the number of times a user has seen the feature highlight",
      value: 0,
    },
  ],
  [
    "newtabWallpapers.highlightHeaderText",
    {
      title: "Changes the wallpaper feature highlight header text",
      value: "",
    },
  ],
  [
    "newtabWallpapers.highlightContentText",
    {
      title: "Changes the wallpaper feature highlight content text",
      value: "",
    },
  ],
  [
    "newtabWallpapers.highlightCtaText",
    {
      title: "Changes the wallpaper feature highlight cta text",
      value: "",
    },
  ],
  [
    "newtabWallpapers.wallpaper-light",
    {
      title: "Currently set light wallpaper",
      value: "",
    },
  ],
  [
    "newtabWallpapers.wallpaper-dark",
    {
      title: "Currently set dark wallpaper",
      value: "",
    },
  ],
  [
    "newtabWallpapers.wallpaper",
    {
      title: "Currently set wallpaper",
      value: "",
    },
  ],
  [
    "improvesearch.noDefaultSearchTile",
    {
      title: "Remove tiles that are the same as the default search",
      value: true,
    },
  ],
  [
    "improvesearch.topSiteSearchShortcuts.searchEngines",
    {
      title:
        "An ordered, comma-delimited list of search shortcuts that we should try and pin",
      // This pref is dynamic as the shortcuts vary depending on the region
      getValue: ({ geo }) => {
        if (!geo) {
          return "";
        }
        const searchShortcuts = [];
        if (geo === "CN") {
          searchShortcuts.push("baidu");
        } else if (["BY", "KZ", "RU", "TR"].includes(geo)) {
          searchShortcuts.push("yandex");
        } else {
          searchShortcuts.push("google");
        }
        if (["DE", "FR", "GB", "IT", "JP", "US"].includes(geo)) {
          searchShortcuts.push("amazon");
        }
        return searchShortcuts.join(",");
      },
    },
  ],
  [
    "improvesearch.topSiteSearchShortcuts.havePinned",
    {
      title:
        "A comma-delimited list of search shortcuts that have previously been pinned",
      value: "",
    },
  ],
  [
    "asrouter.devtoolsEnabled",
    {
      title: "Are the asrouter devtools enabled?",
      value: false,
    },
  ],
  [
    "discoverystream.flight.blocks",
    {
      title: "Track flight blocks",
      skipBroadcast: true,
      value: "{}",
    },
  ],
  [
    "discoverystream.config",
    {
      title: "Configuration for the new pocket new tab",
      getValue: () => {
        return JSON.stringify({
          api_key_pref: "extensions.pocket.oAuthConsumerKey",
          collapsible: true,
          enabled: true,
        });
      },
    },
  ],
  [
    "discoverystream.endpoints",
    {
      title:
        "Endpoint prefixes (comma-separated) that are allowed to be requested",
      value:
        "https://getpocket.cdn.mozilla.net/,https://firefox-api-proxy.cdn.mozilla.net/,https://spocs.getpocket.com/,https://merino.services.mozilla.com/",
    },
  ],
  [
    "discoverystream.isCollectionDismissible",
    {
      title: "Allows Pocket story collections to be dismissed",
      value: false,
    },
  ],
  [
    "discoverystream.onboardingExperience.dismissed",
    {
      title: "Allows the user to dismiss the new Pocket onboarding experience",
      skipBroadcast: true,
      alsoToPreloaded: true,
      value: false,
    },
  ],
  [
    "discoverystream.thumbsUpDown.enabled",
    {
      title: "Allow users to give thumbs up/down on recommended stories",
      // pref is dynamic
      getValue: showThumbsUpDown,
    },
  ],
  [
    "discoverystream.thumbsUpDown.searchTopsitesCompact",
    {
      title:
        "A compact layout of the search/topsites/stories sections to account for new height from thumbs up/down icons ",
      value: false,
    },
  ],
  [
    "discoverystream.region-basic-layout",
    {
      title: "Decision to use basic layout based on region.",
      getValue: ({ geo }) => {
        const preffedRegionsString =
          Services.prefs.getStringPref(REGION_BASIC_CONFIG) || "";
        // If no regions are set to basic,
        // we don't need to bother checking against the region.
        // We are also not concerned if geo is not set,
        // because stories are going to be empty until we have geo.
        if (!preffedRegionsString) {
          return false;
        }
        const preffedRegions = preffedRegionsString
          .split(",")
          .map(s => s.trim());

        return preffedRegions.includes(geo);
      },
    },
  ],
  [
    "discoverystream.spoc.impressions",
    {
      title: "Track spoc impressions",
      skipBroadcast: true,
      value: "{}",
    },
  ],
  [
    "discoverystream.endpointSpocsClear",
    {
      title:
        "Endpoint for when a user opts-out of sponsored content to delete the user's data from the ad server.",
      value: "https://spocs.getpocket.com/user",
    },
  ],
  [
    "discoverystream.rec.impressions",
    {
      title: "Track rec impressions",
      skipBroadcast: true,
      value: "{}",
    },
  ],
  [
    "discoverystream.topicSelection.enabled",
    {
      title: "Enables topic selection for discovery stream",
      // pref is dynamic
      getValue: showTopicsSelection,
    },
  ],
  [
    "discoverystream.topicSelection.topics",
    {
      title: "Topics available",
      value:
        "business, arts, food, health, finance, government, sports, tech, travel, education-science, society",
    },
  ],
  [
    "discoverystream.topicSelection.selectedTopics",
    {
      title: "Selected topics",
      value: "",
    },
  ],
  [
    "discoverystream.topicSelection.suggestedTopics",
    {
      title: "Suggested topics to choose during onboarding for topic selection",
      value: "business, arts, government",
    },
  ],
  [
    "discoverystream.topicSelection.hasBeenUpdatedPreviously",
    {
      title: "Returns true only if the user has previously selected topics",
      value: false,
    },
  ],
  [
    "discoverystream.topicSelection.onboarding.displayCount",
    {
      title: "amount of times that topic selection onboarding has been shown",
      value: 0,
    },
  ],
  [
    "discoverystream.topicSelection.onboarding.maybeDisplay",
    {
      title:
        "Whether the onboarding should be shown, based on previous interactions",
      value: true,
    },
  ],
  [
    "discoverystream.topicSelection.onboarding.lastDisplayed",
    {
      title:
        "time in ms that onboarding was last shown (stored as string due to contraits of prefs)",
      value: "",
    },
  ],
  [
    "discoverystream.topicSelection.onboarding.displayTimeout",
    {
      title: "time in ms that the onboarding show be shown next",
      value: 0,
    },
  ],
  [
    "discoverystream.topicSelection.onboarding.enabled",
    {
      title: "enabled onboarding experience for topic selection onboarding",
      value: false,
    },
  ],
  [
    "discoverystream.topicLabels.enabled",
    {
      title: "Enables topic labels for discovery stream",
      value: true,
    },
  ],
  [
    "showRecentSaves",
    {
      title: "Control whether a user wants recent saves visible on Newtab",
      value: true,
    },
  ],
  [
    "discoverystream.spocs.cacheTimeout",
    {
      title: "Set sponsored content cache timeout in minutes.",
    },
  ],
  [
    "discoverystream.spocs.startupCache.enabled",
    {
      title: "Controls if spocs should be included in startup cache.",
      value: true,
    },
  ],
  [
    "support.url",
    {
      title: "Link to HNT's support page",
      getValue: () => {
        // Services.urlFormatter completes the in-product SUMO page URL:
        // https://support.mozilla.org/1/firefox/%VERSION%/%OS%/%LOCALE%/new-tab
        const baseUrl = Services.urlFormatter.formatURLPref(
          "app.support.baseURL"
        );
        return `${baseUrl}new-tab`;
      },
    },
  ],
]);

// Array of each feed's FEEDS_CONFIG factory and values to add to PREFS_CONFIG
const FEEDS_DATA = [
  {
    name: "aboutpreferences",
    factory: () => new lazy.AboutPreferences(),
    title: "about:preferences rendering",
    value: true,
  },
  {
    name: "newtabinit",
    factory: () => new lazy.NewTabInit(),
    title: "Sends a copy of the state to each new tab that is opened",
    value: true,
  },
  {
    name: "places",
    factory: () => new lazy.PlacesFeed(),
    title: "Listens for and relays various Places-related events",
    value: true,
  },
  {
    name: "prefs",
    factory: () => new lazy.PrefsFeed(PREFS_CONFIG),
    title: "Preferences",
    value: true,
  },
  {
    name: "sections",
    factory: () => new lazy.SectionsFeed(),
    title: "Manages sections",
    value: true,
  },
  {
    name: "section.highlights",
    factory: () => new lazy.HighlightsFeed(),
    title: "Fetches content recommendations from places db",
    value: false,
  },
  {
    name: "system.topstories",
    factory: () =>
      new lazy.TopStoriesFeed(PREFS_CONFIG.get("discoverystream.config")),
    title:
      "System pref that fetches content recommendations from a configurable content provider",
    // Dynamically determine if Pocket should be shown for a geo / locale
    getValue: ({ geo, locale }) => {
      // If we don't have geo, we don't want to flash the screen with stories while geo loads.
      // Best to display nothing until geo is ready.
      if (!geo) {
        return false;
      }
      const preffedRegionsBlockString =
        lazy.NimbusFeatures.pocketNewtab.getVariable("regionStoriesBlock") ||
        "";
      const preffedRegionsString =
        lazy.NimbusFeatures.pocketNewtab.getVariable("regionStoriesConfig") ||
        "";
      const preffedLocaleListString =
        lazy.NimbusFeatures.pocketNewtab.getVariable("localeListConfig") || "";
      const preffedBlockRegions = preffedRegionsBlockString
        .split(",")
        .map(s => s.trim());
      const preffedRegions = preffedRegionsString.split(",").map(s => s.trim());
      const preffedLocales = preffedLocaleListString
        .split(",")
        .map(s => s.trim());
      const locales = {
        US: ["en-CA", "en-GB", "en-US"],
        CA: ["en-CA", "en-GB", "en-US"],
        GB: ["en-CA", "en-GB", "en-US"],
        AU: ["en-CA", "en-GB", "en-US"],
        NZ: ["en-CA", "en-GB", "en-US"],
        IN: ["en-CA", "en-GB", "en-US"],
        IE: ["en-CA", "en-GB", "en-US"],
        ZA: ["en-CA", "en-GB", "en-US"],
        CH: ["de"],
        BE: ["de"],
        DE: ["de"],
        AT: ["de"],
        IT: ["it"],
        FR: ["fr"],
        ES: ["es-ES"],
        PL: ["pl"],
        JP: ["ja", "ja-JP-mac"],
      }[geo];

      const regionBlocked = preffedBlockRegions.includes(geo);
      const localeEnabled = locale && preffedLocales.includes(locale);
      const regionEnabled =
        preffedRegions.includes(geo) && !!locales && locales.includes(locale);
      return !regionBlocked && (localeEnabled || regionEnabled);
    },
  },
  {
    name: "systemtick",
    factory: () => new lazy.SystemTickFeed(),
    title: "Produces system tick events to periodically check for data expiry",
    value: true,
  },
  {
    name: "telemetry",
    factory: () => new lazy.TelemetryFeed(),
    title: "Relays telemetry-related actions to PingCentre",
    value: true,
  },
  {
    name: "favicon",
    factory: () => new lazy.FaviconFeed(),
    title: "Fetches tippy top manifests from remote service",
    value: true,
  },
  {
    name: "system.topsites",
    factory: () => new lazy.TopSitesFeed(),
    title: "Queries places and gets metadata for Top Sites section",
    value: true,
  },
  {
    name: "recommendationprovider",
    factory: () => new lazy.RecommendationProvider(),
    title: "Handles setup and interaction for the personality provider",
    value: true,
  },
  {
    name: "discoverystreamfeed",
    factory: () => new lazy.DiscoveryStreamFeed(),
    title: "Handles new pocket ui for the new tab page",
    value: true,
  },
  {
    name: "wallpaperfeed",
    factory: () => new lazy.WallpaperFeed(),
    title: "Handles fetching and managing wallpaper data from RemoteSettings",
    value: true,
  },
  {
    name: "weatherfeed",
    factory: () => new lazy.WeatherFeed(),
    title: "Handles fetching and caching weather data",
    value: true,
  },
];

const FEEDS_CONFIG = new Map();
for (const config of FEEDS_DATA) {
  const pref = `feeds.${config.name}`;
  FEEDS_CONFIG.set(pref, config.factory);
  PREFS_CONFIG.set(pref, config);
}

export class ActivityStream {
  /**
   * constructor - Initializes an instance of ActivityStream
   */
  constructor() {
    this.initialized = false;
    this.store = new lazy.Store();
    this.feeds = FEEDS_CONFIG;
    this._defaultPrefs = new lazy.DefaultPrefs(PREFS_CONFIG);
  }

  init() {
    try {
      this._updateDynamicPrefs();
      this._defaultPrefs.init();
      Services.obs.addObserver(this, "intl:app-locales-changed");

      // Look for outdated user pref values that might have been accidentally
      // persisted when restoring the original pref value at the end of an
      // experiment across versions with a different default value.
      const DS_CONFIG =
        "browser.newtabpage.activity-stream.discoverystream.config";
      if (
        Services.prefs.prefHasUserValue(DS_CONFIG) &&
        [
          // Firefox 66
          `{"api_key_pref":"extensions.pocket.oAuthConsumerKey","enabled":false,"show_spocs":true,"layout_endpoint":"https://getpocket.com/v3/newtab/layout?version=1&consumer_key=$apiKey&layout_variant=basic"}`,
          // Firefox 67
          `{"api_key_pref":"extensions.pocket.oAuthConsumerKey","enabled":false,"show_spocs":true,"layout_endpoint":"https://getpocket.cdn.mozilla.net/v3/newtab/layout?version=1&consumer_key=$apiKey&layout_variant=basic"}`,
          // Firefox 68
          `{"api_key_pref":"extensions.pocket.oAuthConsumerKey","collapsible":true,"enabled":false,"show_spocs":true,"hardcoded_layout":true,"personalized":false,"layout_endpoint":"https://getpocket.cdn.mozilla.net/v3/newtab/layout?version=1&consumer_key=$apiKey&layout_variant=basic"}`,
        ].includes(Services.prefs.getStringPref(DS_CONFIG))
      ) {
        Services.prefs.clearUserPref(DS_CONFIG);
      }

      // Hook up the store and let all feeds and pages initialize
      this.store.init(
        this.feeds,
        ac.BroadcastToContent({
          type: at.INIT,
          data: {
            locale: this.locale,
          },
          meta: {
            isStartup: true,
          },
        }),
        { type: at.UNINIT }
      );

      this.initialized = true;
    } catch (e) {
      // TelemetryFeed could be unavailable if the telemetry is disabled, or
      // the telemetry feed is not yet initialized.
      const telemetryFeed = this.store.feeds.get("feeds.telemetry");
      if (telemetryFeed) {
        telemetryFeed.handleUndesiredEvent({
          data: { event: "ADDON_INIT_FAILED" },
        });
      }
      throw e;
    }
  }

  /**
   * Check if an old pref has a custom value to migrate. Clears the pref so that
   * it's the default after migrating (to avoid future need to migrate).
   *
   * @param oldPrefName {string} Pref to check and migrate
   * @param cbIfNotDefault {function} Callback that gets the current pref value
   */
  _migratePref(oldPrefName, cbIfNotDefault) {
    // Nothing to do if the user doesn't have a custom value
    if (!Services.prefs.prefHasUserValue(oldPrefName)) {
      return;
    }

    // Figure out what kind of pref getter to use
    let prefGetter;
    switch (Services.prefs.getPrefType(oldPrefName)) {
      case Services.prefs.PREF_BOOL:
        prefGetter = "getBoolPref";
        break;
      case Services.prefs.PREF_INT:
        prefGetter = "getIntPref";
        break;
      case Services.prefs.PREF_STRING:
        prefGetter = "getStringPref";
        break;
    }

    // Give the callback the current value then clear the pref
    cbIfNotDefault(Services.prefs[prefGetter](oldPrefName));
    Services.prefs.clearUserPref(oldPrefName);
  }

  uninit() {
    if (this.geo === "") {
      Services.obs.removeObserver(this, lazy.Region.REGION_TOPIC);
    }

    Services.obs.removeObserver(this, "intl:app-locales-changed");

    this.store.uninit();
    this.initialized = false;
  }

  _updateDynamicPrefs() {
    // Save the geo pref if we have it
    if (lazy.Region.home) {
      this.geo = lazy.Region.home;
    } else if (this.geo !== "") {
      // Watch for geo changes and use a dummy value for now
      Services.obs.addObserver(this, lazy.Region.REGION_TOPIC);
      this.geo = "";
    }

    this.locale = Services.locale.appLocaleAsBCP47;

    // Update the pref config of those with dynamic values
    for (const pref of PREFS_CONFIG.keys()) {
      // Only need to process dynamic prefs
      const prefConfig = PREFS_CONFIG.get(pref);
      if (!prefConfig.getValue) {
        continue;
      }

      // Have the dynamic pref just reuse using existing default, e.g., those
      // set via Autoconfig or policy
      try {
        const existingDefault = this._defaultPrefs.get(pref);
        if (existingDefault !== undefined && prefConfig.value === undefined) {
          prefConfig.getValue = () => existingDefault;
        }
      } catch (ex) {
        // We get NS_ERROR_UNEXPECTED for prefs that have a user value (causing
        // default branch to believe there's a type) but no actual default value
      }

      // Compute the dynamic value (potentially generic based on dummy geo)
      const newValue = prefConfig.getValue({
        geo: this.geo,
        locale: this.locale,
      });

      // If there's an existing value and it has changed, that means we need to
      // overwrite the default with the new value.
      if (prefConfig.value !== undefined && prefConfig.value !== newValue) {
        this._defaultPrefs.set(pref, newValue);
      }

      prefConfig.value = newValue;
    }
  }

  observe(subject, topic) {
    switch (topic) {
      case "intl:app-locales-changed":
      case lazy.Region.REGION_TOPIC:
        this._updateDynamicPrefs();
        break;
    }
  }
}
