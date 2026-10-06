/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { WEATHER_OPTIN_REGIONS } from "./ActivityStream.sys.mjs";

// eslint-disable-next-line mozilla/use-static-import
const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  clearTimeout: "resource://gre/modules/Timer.sys.mjs",
  setTimeout: "resource://gre/modules/Timer.sys.mjs",
  PersistentCache: "resource://newtab/lib/PersistentCache.sys.mjs",
  Region: "resource://gre/modules/Region.sys.mjs",
});

ChromeUtils.defineLazyGetter(lazy, "MerinoClient", () => {
  // @backward-compat { version 151 }
  // Bug 2018111 - TemporaryMerinoClientShim backports fetchWeatherReport() and
  // fetchHourlyForecasts() with endpoint URL support. Remove this block
  // and use MerinoClient directly once Firefox 151 ships to release.
  if (Services.vc.compare(AppConstants.MOZ_APP_VERSION, "151.0a1") < 0) {
    return ChromeUtils.importESModule(
      "resource://newtab/lib/TemporaryMerinoClientShim.sys.mjs"
    ).TemporaryMerinoClientShim;
  }
  try {
    return ChromeUtils.importESModule(
      "moz-src:///browser/components/urlbar/MerinoClient.sys.mjs"
    ).MerinoClient;
  } catch {
    // Fallback to URI format prior to FF 144.
    return ChromeUtils.importESModule(
      "resource:///modules/MerinoClient.sys.mjs"
    ).MerinoClient;
  }
});

ChromeUtils.defineLazyGetter(lazy, "GeolocationUtils", () => {
  try {
    return ChromeUtils.importESModule(
      "moz-src:///browser/components/urlbar/private/GeolocationUtils.sys.mjs"
    ).GeolocationUtils;
  } catch {
    // Fallback to URI format prior to FF 144.
    return ChromeUtils.importESModule(
      "resource:///modules/urlbar/private/GeolocationUtils.sys.mjs"
    ).GeolocationUtils;
  }
});

import {
  actionTypes as at,
  actionCreators as ac,
} from "resource://newtab/common/Actions.mjs";

const CACHE_KEY = "weather_feed";
const WEATHER_UPDATE_TIME = 10 * 60 * 1000; // 10 minutes
const MERINO_PROVIDER = ["accuweather"];
const RETRY_DELAY_MS = 60 * 1000; // 1 minute in ms.
const MERINO_CLIENT_KEY = "HNT_WEATHER_FEED";

const PREF_WEATHER_QUERY = "weather.query";
const PREF_SHOW_WEATHER = "showWeather";
const PREF_SYSTEM_SHOW_WEATHER = "system.showWeather";
const PREF_NOVA_ENABLED = "nova.enabled";
const PREF_WIDGETS_WEATHER_ENABLED = "widgets.weather.enabled";

/**
 * A feature that periodically fetches weather suggestions from Merino for HNT.
 */
export class WeatherFeed {
  constructor() {
    this.loaded = false;
    this.merino = null;
    this.suggestions = [];
    this.hourlyForecasts = [];
    this.lastUpdated = null;
    this.locationData = {};
    this.fetchTimer = null;
    this.retryTimer = null;
    this.fetchIntervalMs = 30 * 60 * 1000; // 30 minutes
    this.timeoutMS = 5000;
    this.lastFetchTimeMs = 0;
    this.fetchDelayAfterComingOnlineMs = 3000; // 3s
    this.cache = this.PersistentCache(CACHE_KEY, true);
  }

  async resetCache() {
    if (this.cache) {
      await this.cache.set("weather", {});
    }
  }

  async resetWeather() {
    await this.resetCache();
    this.suggestions = [];
    this.hourlyForecasts = [];
    this.lastUpdated = null;
    this.loaded = false;
  }

  isEnabled() {
    const { values } = this.store.getState().Prefs;
    // @nova-cleanup(remove-conditional): Remove PREF_NOVA_ENABLED conditional; replace userValue with values[PREF_WIDGETS_WEATHER_ENABLED] directly
    const userValue = values[PREF_NOVA_ENABLED]
      ? values[PREF_WIDGETS_WEATHER_ENABLED]
      : values[PREF_SHOW_WEATHER];
    const systemValue = values[PREF_SYSTEM_SHOW_WEATHER];
    const experimentValue = values.trainhopConfig?.weather?.enabled || false;
    return userValue && (systemValue || experimentValue);
  }

  async init() {
    await this.loadWeather(true /* isStartup */);
  }

  stopFetching() {
    if (!this.merino) {
      return;
    }

    this.clearTimeout(this.fetchTimer);
    this.clearTimeout(this.retryTimer);
    this.merino = null;
    this.suggestions = null;
    this.hourlyForecasts = null;
    this.fetchTimer = 0;
    this.retryTimer = 0;
  }

  async fetch() {
    // Keep a handle on the `MerinoClient` instance that exists at the start of
    // this fetch. If fetching stops or this `Weather` instance is uninitialized
    // during the fetch, `#merino` will be nulled, and the fetch should stop. We
    // can compare `merino` to `this.merino` to tell when this occurs.
    if (!this.merino) {
      this.merino = await this.MerinoClient(MERINO_CLIENT_KEY);
    }

    const { suggestions, hourlyForecasts } = await this._fetchHelper();
    this.suggestions = suggestions;
    this.hourlyForecasts = hourlyForecasts;

    if (this.suggestions.length || this.hourlyForecasts.length) {
      const hasLocationData =
        !this.store.getState().Prefs.values[PREF_WEATHER_QUERY];
      this.lastUpdated = this.Date().now();
      await this.cache.set("weather", {
        suggestions: this.suggestions,
        hourlyForecasts: this.hourlyForecasts,
        lastUpdated: this.lastUpdated,
      });

      // only calls to merino without the query parameter would return the location data (and only city name)
      if (hasLocationData && this.suggestions.length) {
        const [data] = this.suggestions;
        this.locationData = {
          city: data.city_name,
          adminArea: "",
          country: "",
        };
        await this.cache.set("locationData", this.locationData);
      }
    }
    this.update();
  }

  async loadWeather(isStartup = false) {
    const cachedData = (await this.cache.get()) || {};
    const { weather, locationData } = cachedData;

    // if we have locationData in the cache set it to this.locationData so it is added to the redux store
    if (locationData?.city) {
      this.locationData = locationData;
    }
    // If we have nothing in cache, or cache has expired, we can make a fresh fetch.
    if (
      !weather?.lastUpdated ||
      !(this.Date().now() - weather.lastUpdated < WEATHER_UPDATE_TIME)
    ) {
      await this.fetch(isStartup);
    } else if (!this.lastUpdated) {
      this.suggestions = weather.suggestions;
      this.hourlyForecasts = weather.hourlyForecasts || [];
      this.lastUpdated = weather.lastUpdated;
      this.update();
    }
    this.loaded = true;
  }

  update() {
    this.store.dispatch(
      ac.BroadcastToContent({
        type: at.WEATHER_UPDATE,
        data: {
          suggestions: this.suggestions,
          hourlyForecasts: this.hourlyForecasts,
          lastUpdated: this.lastUpdated,
          locationData: this.locationData,
        },
      })
    );
  }

  restartFetchTimer(ms = this.fetchIntervalMs) {
    this.clearTimeout(this.fetchTimer);
    this.clearTimeout(this.retryTimer);
    this.fetchTimer = this.setTimeout(() => {
      this.fetch();
    }, ms);
    this.retryTimer = null; // tidy
  }

  async fetchLocationAutocomplete() {
    if (!this.merino) {
      this.merino = await this.MerinoClient(MERINO_CLIENT_KEY);
    }

    const query = this.store.getState().Weather.locationSearchString;
    let data;

    data = await this.merino.autoCompleteWeatherLocation({
      query,
      source: "newtab",
      timeoutMs: 7000,
    });

    if (data?.locations.length) {
      this.store.dispatch(
        ac.BroadcastToContent({
          type: at.WEATHER_LOCATION_SUGGESTIONS_UPDATE,
          data: data.locations,
        })
      );
    }
  }

  async onPrefChangedAction(action) {
    switch (action.data.name) {
      case PREF_WEATHER_QUERY:
        await this.fetch();
        break;
      // @nova-cleanup(remove-conditional): Remove case PREF_SHOW_WEATHER; keep only PREF_WIDGETS_WEATHER_ENABLED
      case PREF_SHOW_WEATHER:
      case PREF_WIDGETS_WEATHER_ENABLED:
      case PREF_SYSTEM_SHOW_WEATHER:
      case "trainhopConfig": {
        const enabled = this.isEnabled();
        if (enabled && !this.loaded) {
          await this.loadWeather();
        } else if (!enabled && this.loaded) {
          await this.resetWeather();
        }
        break;
      }
      case "weather.display":
      case "widgets.system.weatherForecast.enabled":
      case "widgets.system.weather.enabled":
      case "widgets.weather.size": {
        if (!this.hourlyForecasts?.length) {
          await this.fetch();
        }
        break;
      }
    }
  }

  async checkOptInRegion() {
    const currentRegion = await lazy.Region.home;
    const optIn =
      this.isEnabled() && WEATHER_OPTIN_REGIONS.includes(currentRegion);
    this.store.dispatch(ac.SetPref("system.showWeatherOptIn", optIn));
    return optIn;
  }

  async onAction(action) {
    switch (action.type) {
      case at.INIT:
        await this.checkOptInRegion();
        if (this.isEnabled() && !this.loaded) {
          await this.init();
        }
        break;
      case at.UNINIT:
        await this.resetWeather();
        break;
      case at.DISCOVERY_STREAM_DEV_SYSTEM_TICK:
      case at.SYSTEM_TICK:
        if (this.isEnabled()) {
          await this.loadWeather();
        }
        break;
      case at.PREF_CHANGED:
        if (action.data.name === "system.showWeather") {
          await this.checkOptInRegion();
        }
        await this.onPrefChangedAction(action);
        break;
      case at.WEATHER_LOCATION_SEARCH_UPDATE:
        await this.fetchLocationAutocomplete();
        break;
      case at.WEATHER_LOCATION_DATA_UPDATE: {
        // check that data is formatted correctly before adding to cache
        if (action.data.city) {
          this.locationData = action.data;
          await this.cache.set("locationData", {
            city: action.data.city,
            adminName: action.data.adminName,
            country: action.data.country,
          });
        }

        // Remove static weather data once location has been set
        this.store.dispatch(ac.SetPref("weather.staticData.enabled", false));
        break;
      }
      case at.WEATHER_USER_OPT_IN_LOCATION: {
        this.store.dispatch(ac.SetPref("weather.optInAccepted", true));
        this.store.dispatch(ac.SetPref("weather.optInDisplayed", false));

        const detectedLocation = await this._fetchNormalizedLocation();

        if (detectedLocation) {
          // Build the payload exactly like manual search does
          this.store.dispatch(
            ac.BroadcastToContent({
              type: at.WEATHER_LOCATION_DATA_UPDATE,
              data: {
                city: detectedLocation.localized_name,
                adminName: detectedLocation.administrative_area,
                country: detectedLocation.country,
              },
            })
          );

          // Use the AccuWeather key (canonical ID)
          if (detectedLocation.key) {
            this.store.dispatch(
              ac.SetPref("weather.query", detectedLocation.key)
            );
          }
        }
        break;
      }
    }
  }

  /**
   * This thin wrapper around the fetch call makes it easier for us to write
   * automated tests that simulate responses.
   */
  async _fetchHelper(maxRetries = 1, queryOverride = null) {
    this.restartFetchTimer();

    const weatherQuery = this.store.getState().Prefs.values[PREF_WEATHER_QUERY];
    const locationName = queryOverride ?? weatherQuery;
    const attempt = async (retry = 0) => {
      try {
        // Because this can happen after a timeout,
        // we want to ensure if it was called later after a teardown,
        // we don't throw. If we throw, we end up in another retry.
        if (!this.merino) {
          return { suggestions: [], hourlyForecasts: [] };
        }

        // Resolve geolocation once before the parallel fetch so both
        // fetchWeatherReport() and fetchHourlyForecasts() share the same
        // result, avoiding concurrent Merino requests that can result in a race condition.
        let city;
        let country;
        let region;
        if (!locationName) {
          const geolocation = await lazy.GeolocationUtils.geolocation();
          if (!geolocation) {
            return { suggestions: [], hourlyForecasts: [] };
          }
          country = geolocation.country_code;
          region =
            geolocation.region_code || geolocation.region || geolocation.city;
          city = geolocation.city || geolocation.region;
          if (!country || !region || !city) {
            return { suggestions: [], hourlyForecasts: [] };
          }
        }

        const { values } = this.store.getState().Prefs;

        // Hourly forecasts are only needed for medium/large widget sizes. The
        // condition checks all the ways the forecast widget can be enabled:
        //   - Nova path: weather.display is "detailed" AND the forecast feature
        //     is system-enabled (via pref or trainhopConfig)
        //   - Pre-Nova / trainhop path: the basic weather widget is enabled
        //     directly via system pref or trainhopConfig
        // The size guard short-circuits for "small" (sidebar) regardless of the
        // other flags, since that variant never shows hourly data.
        const weatherForecastWidgetEnabled =
          values["widgets.weather.size"] !== "small" &&
          ((values["weather.display"] === "detailed" &&
            (values["widgets.system.weatherForecast.enabled"] ||
              values.trainhopConfig?.widgets?.weatherForecastEnabled)) ||
            values["widgets.system.weather.enabled"] ||
            values.trainhopConfig?.widgets?.weatherEnabled);

        // @backward-compat { version 151 }
        // Read endpoint URLs from trainhopConfig or ActivityStream prefs so
        // they can be configured without a tree change. Remove once shipped;
        // MerinoClient will have the endpoints defined via UrlbarPrefs.
        const reportEndpointUrl =
          values.trainhopConfig?.weather?.reportEndpoint ||
          values["weather.reportEndpoint"];
        const hourlyEndpointUrl =
          values.trainhopConfig?.weather?.hourlyEndpoint ||
          values["weather.hourlyEndpoint"];

        const [reportResult, hourlyResult] = await Promise.all([
          this.merino.fetchWeatherReport({
            source: "newtab",
            locationName,
            city,
            region,
            country,
            timeoutMs: 7000,
            endpointUrl: reportEndpointUrl,
          }),
          weatherForecastWidgetEnabled
            ? // When locationName is set, city/region/country are unresolved
              // from geolocation and need to be populated in the fetch URL.
              // Fall back to this.locationData so the hourly endpoint can
              // resolve the selected location.
              this.merino
                .fetchHourlyForecasts({
                  source: "newtab",
                  locationName,
                  city: city || this.locationData?.city,
                  region: region || this.locationData?.adminName?.id,
                  country: country || this.locationData?.country?.id,
                  endpointUrl: hourlyEndpointUrl,
                })
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        return {
          suggestions: reportResult ? [reportResult] : [],
          hourlyForecasts: hourlyResult ?? [],
        };
      } catch (e) {
        // If we get an error, we try again in 1 minute,
        // and give up if we try more than maxRetries number of times.
        if (retry >= maxRetries) {
          return { suggestions: [], hourlyForecasts: [] };
        }
        await new Promise(res => {
          // store the timeout so it can be cancelled elsewhere
          this.retryTimer = this.setTimeout(() => {
            this.retryTimer = null; // cleanup once it fires
            res();
          }, RETRY_DELAY_MS);
        });
        return attempt(retry + 1);
      }
    };

    // results from the API or empty array
    return await attempt();
  }

  async _fetchNormalizedLocation() {
    const geolocation = await lazy.GeolocationUtils.geolocation();
    if (!geolocation) {
      return null;
    }

    // "region" might be able to be city if geolocation.city is null
    const city = geolocation.city || geolocation.region;
    if (!city) {
      return null;
    }

    if (!this.merino) {
      this.merino = await this.MerinoClient(MERINO_CLIENT_KEY);
    }

    try {
      // We use the given city name look up to get the normalized merino response
      const locationData = await this.merino.fetch({
        query: city,
        providers: MERINO_PROVIDER,
        timeoutMs: 7000,
        otherParams: {
          request_type: "location",
          source: "newtab",
        },
      });

      const response = locationData?.[0]?.locations?.[0];
      return response;
    } catch (err) {
      console.error("WeatherFeed failed to get normalized location");
      return null;
    }
  }
}

/**
 * Creating a thin wrapper around external tools.
 * This makes it easier for us to write automated tests that simulate responses.
 */
WeatherFeed.prototype.MerinoClient = name => {
  return new lazy.MerinoClient(name, { allowOhttp: false });
};
WeatherFeed.prototype.PersistentCache = (...args) => {
  return new lazy.PersistentCache(...args);
};
WeatherFeed.prototype.Date = () => {
  return Date;
};
WeatherFeed.prototype.setTimeout = (...args) => {
  return lazy.setTimeout(...args);
};
WeatherFeed.prototype.clearTimeout = (...args) => {
  return lazy.clearTimeout(...args);
};
