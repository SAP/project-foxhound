/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useCallback, useEffect, useRef } from "react";
import { useSelector, batch } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { useIntersectionObserver } from "../../../lib/utils";
import { LocationSearch } from "content-src/components/Weather/LocationSearch";

const USER_ACTION_TYPES = {
  CHANGE_LOCATION: "change_location",
  DETECT_LOCATION: "detect_location",
  CHANGE_TEMP_UNIT: "change_temperature_units",
  CHANGE_DISPLAY: "change_weather_display",
  CHANGE_SIZE: "change_size",
  LEARN_MORE: "learn_more",
  PROVIDER_LINK_CLICK: "provider_link_click",
};

const PREF_NOVA_ENABLED = "nova.enabled";
const PREF_WEATHER_SIZE = "widgets.weather.size";

function WeatherForecast({ dispatch, isMaximized, widgetsMayBeMaximized }) {
  const prefs = useSelector(state => state.Prefs.values);
  const weatherData = useSelector(state => state.Weather);
  const impressionFired = useRef(false);
  const errorTelemetrySent = useRef(false);
  const errorRef = useRef(null);
  // @nova-cleanup(remove-pref): Remove pref check, always apply col-4 class after Nova ships
  const novaEnabled = prefs[PREF_NOVA_ENABLED];
  const isSmallSize = novaEnabled
    ? (prefs[PREF_WEATHER_SIZE] || "large") !== "large"
    : !isMaximized && widgetsMayBeMaximized;
  let widgetSize;
  if (novaEnabled) {
    widgetSize = prefs[PREF_WEATHER_SIZE] || "large";
  } else {
    widgetSize = isSmallSize ? "small" : "medium";
  }

  const handleChangeSize = useCallback(
    size => {
      batch(() => {
        dispatch(
          ac.OnlyToMain({
            type: at.SET_PREF,
            data: {
              name: PREF_WEATHER_SIZE,
              value: size,
            },
          })
        );
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: {
              widget_name: "weather",
              widget_source: "context_menu",
              user_action: USER_ACTION_TYPES.CHANGE_SIZE,
              action_value: size,
              widget_size: size,
            },
          })
        );
      });
    },
    [dispatch]
  );

  const sizeSubmenuRef = useRef(null);
  useEffect(() => {
    const el = sizeSubmenuRef.current;
    if (!el) {
      return undefined;
    }
    // The size submenu panel-list is moved into the panel-item's shadow DOM by
    // the panel-list custom element, so React's synthetic onClick doesn't reach
    // inner items. We use composedPath() to find the clicked item across the
    // shadow boundary via its data-size attribute.
    const listener = e => {
      const item = e.composedPath().find(node => node.dataset?.size);
      if (item) {
        handleChangeSize(item.dataset.size);
      }
    };
    el.addEventListener("click", listener);
    return () => el.removeEventListener("click", listener);
  }, [handleChangeSize]);

  const handleIntersection = useCallback(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;

    const telemetryData = {
      widget_name: "weather",
      widget_size: widgetSize,
    };
    dispatch(
      ac.AlsoToMain({
        type: at.WIDGETS_IMPRESSION,
        data: telemetryData,
      })
    );
  }, [dispatch, widgetSize]);

  const forecastRef = useIntersectionObserver(handleIntersection);

  const WEATHER_SUGGESTION = weatherData.suggestions?.[0];
  const HOURLY_FORECASTS = weatherData.hourlyForecasts ?? [];

  const hasError =
    !WEATHER_SUGGESTION?.current_conditions ||
    !WEATHER_SUGGESTION?.forecast ||
    !HOURLY_FORECASTS[0];

  const handleErrorIntersection = useCallback(
    entries => {
      const entry = entries.find(e => e.isIntersecting);
      if (entry && !errorTelemetrySent.current) {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_ERROR,
            data: {
              widget_name: "weather",
              widget_size: widgetSize,
              error_type: "load_error",
            },
          })
        );
        errorTelemetrySent.current = true;
      }
    },
    [dispatch, widgetSize]
  );

  useEffect(() => {
    if (errorRef.current && !errorTelemetrySent.current) {
      const observer = new IntersectionObserver(handleErrorIntersection);
      observer.observe(errorRef.current);

      return () => {
        observer.disconnect();
      };
    }
    return undefined;
  }, [handleErrorIntersection, hasError]);

  const showDetailedView = prefs["weather.display"] === "detailed";

  // Check if weather is enabled (browser.newtabpage.activity-stream.showWeather)
  const { showWeather } = prefs;
  const systemShowWeather = prefs["system.showWeather"];
  const weatherExperimentEnabled = prefs.trainhopConfig?.weather?.enabled;
  const isWeatherEnabled =
    showWeather && (systemShowWeather || weatherExperimentEnabled);

  // Check if the WeatherForecast widget is enabled
  const nimbusWeatherForecastTrainhopEnabled =
    prefs.trainhopConfig?.widgets?.weatherForecastEnabled;

  const weatherForecastWidgetEnabled =
    nimbusWeatherForecastTrainhopEnabled ||
    prefs["widgets.system.weatherForecast.enabled"];

  // This weather forecast widget will only show when the following are true:
  // - The weather view is set to "detailed" (can be checked with the weather.display pref)
  // - Weather is displayed on New Tab (system.showWeather)
  // - The weather forecast widget is enabled (system.weatherForecast.enabled)
  // Note that if the view is set to "detailed" but the weather forecast widget is not enabled,
  // then the mini weather widget will display with the "detailed" view
  // @nova-cleanup(remove-conditional): Remove the !showDetailedView branch; after Nova
  // ships only the size-based check remains, replace with `widgetSize === "small"`
  if (
    (novaEnabled ? widgetSize === "small" : !showDetailedView) ||
    !weatherData?.initialized ||
    !weatherForecastWidgetEnabled ||
    !isWeatherEnabled
  ) {
    return null;
  }

  const weatherOptIn = prefs["system.showWeatherOptIn"];
  const nimbusWeatherOptInEnabled =
    prefs.trainhopConfig?.weather?.weatherOptInEnabled;
  const isOptInEnabled = weatherOptIn || nimbusWeatherOptInEnabled;

  const { searchActive } = weatherData;

  function handleChangeLocation() {
    batch(() => {
      dispatch(
        ac.BroadcastToContent({
          type: at.WEATHER_SEARCH_ACTIVE,
          data: true,
        })
      );
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: USER_ACTION_TYPES.CHANGE_LOCATION,
        widget_size: widgetSize,
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
  }

  function handleDetectLocation() {
    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_USER_OPT_IN_LOCATION,
        })
      );
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: USER_ACTION_TYPES.DETECT_LOCATION,
        widget_size: widgetSize,
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
  }

  function handleChangeTempUnit(unit) {
    batch(() => {
      dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "weather.temperatureUnits",
            value: unit,
          },
        })
      );
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: USER_ACTION_TYPES.CHANGE_TEMP_UNIT,
        widget_size: widgetSize,
        action_value: unit,
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
  }

  function handleChangeDisplay(display) {
    batch(() => {
      dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "weather.display",
            value: display,
          },
        })
      );
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: USER_ACTION_TYPES.CHANGE_DISPLAY,
        action_value: "switch_to_mini_widget",
        widget_size: widgetSize,
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
  }

  function handleHideWeather() {
    batch(() => {
      dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "showWeather",
            value: false,
          },
        })
      );
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        enabled: false,
        widget_size: widgetSize,
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_ENABLED,
          data: telemetryData,
        })
      );
    });
  }

  function handleLearnMore() {
    batch(() => {
      dispatch(
        ac.OnlyToMain({
          type: at.OPEN_LINK,
          data: {
            url: "https://support.mozilla.org/kb/firefox-new-tab-widgets",
          },
        })
      );
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: USER_ACTION_TYPES.LEARN_MORE,
        widget_size: widgetSize,
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
  }

  function handleProviderLinkClick() {
    const telemetryData = {
      widget_name: "weather",
      widget_source: "widget",
      user_action: USER_ACTION_TYPES.PROVIDER_LINK_CLICK,
      widget_size: widgetSize,
    };
    dispatch(
      ac.OnlyToMain({
        type: at.WIDGETS_USER_EVENT,
        data: telemetryData,
      })
    );
  }

  function renderContextMenu() {
    return (
      <div className="weather-forecast-context-menu-wrapper">
        <moz-button
          className="weather-forecast-context-menu-button"
          data-l10n-id="newtab-menu-section-tooltip"
          iconSrc="chrome://global/skin/icons/more.svg"
          menuId="weather-forecast-context-menu"
          type="ghost"
          size={`${isSmallSize ? "small" : "default"}`}
        />
        <panel-list id="weather-forecast-context-menu">
          {prefs["weather.locationSearchEnabled"] && (
            <panel-item
              data-l10n-id="newtab-weather-menu-change-location"
              onClick={handleChangeLocation}
            />
          )}
          {isOptInEnabled && (
            <panel-item
              data-l10n-id="newtab-weather-menu-detect-my-location"
              onClick={handleDetectLocation}
            />
          )}
          {prefs["weather.temperatureUnits"] === "f" ? (
            <panel-item
              data-l10n-id="newtab-weather-menu-change-temperature-units-celsius"
              onClick={() => handleChangeTempUnit("c")}
            />
          ) : (
            <panel-item
              data-l10n-id="newtab-weather-menu-change-temperature-units-fahrenheit"
              onClick={() => handleChangeTempUnit("f")}
            />
          )}
          {
            // @nova-cleanup(remove-conditional): Remove this block; the simple/detailed
            // display toggle is replaced by the size submenu after Nova ships
            !novaEnabled &&
              (!showDetailedView ? (
                <panel-item
                  data-l10n-id="newtab-weather-menu-change-weather-display-detailed"
                  onClick={() => handleChangeDisplay("detailed")}
                />
              ) : (
                <panel-item
                  data-l10n-id="newtab-weather-menu-change-weather-display-simple"
                  onClick={() => handleChangeDisplay("simple")}
                />
              ))
          }
          {
            // @nova-cleanup(remove-conditional): Remove the novaEnabled check
            // Always render the size submenu
            novaEnabled && (
              <panel-item
                submenu="weather-forecast-size-submenu"
                data-l10n-id="newtab-widget-menu-change-size"
              >
                <panel-list
                  ref={sizeSubmenuRef}
                  slot="submenu"
                  id="weather-forecast-size-submenu"
                >
                  {["small", "medium", "large"].map(size => (
                    <panel-item
                      key={size}
                      type="checkbox"
                      checked={widgetSize === size || undefined}
                      data-size={size}
                      data-l10n-id={`newtab-widget-size-${size}`}
                    />
                  ))}
                </panel-list>
              </panel-item>
            )
          }
          <panel-item
            data-l10n-id="newtab-widget-menu-hide"
            onClick={handleHideWeather}
          />
          <panel-item
            data-l10n-id="newtab-weather-menu-learn-more"
            onClick={handleLearnMore}
          />
        </panel-list>
      </div>
    );
  }

  return (
    <article
      className={`weather-forecast-widget widget ${novaEnabled ? "col-4" : ""} ${isMaximized ? "is-maximized" : ""} ${isSmallSize ? " is-small" : ""} ${hasError ? "forecast-error-state" : ""}`}
      ref={el => {
        forecastRef.current = [el];
      }}
    >
      {!hasError && (
        <a
          className="forecast-anchor"
          href={HOURLY_FORECASTS[0].url || "#"}
          aria-label={weatherData.locationData.city}
          onClick={handleProviderLinkClick}
        />
      )}
      <div className="city-wrapper">
        <div className="city-name">
          {searchActive ? (
            <LocationSearch outerClassName="" />
          ) : (
            <h2>{weatherData.locationData.city}</h2>
          )}
        </div>
        {renderContextMenu()}
      </div>
      {!isSmallSize && !hasError && (
        <>
          <div className="current-weather-wrapper">
            <div className="weather-icon-column">
              <span
                className={`weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
              ></span>
            </div>
            <div className="weather-info-column">
              <span className="temperature-unit">
                {
                  WEATHER_SUGGESTION.current_conditions.temperature[
                    prefs["weather.temperatureUnits"]
                  ]
                }
                &deg;{prefs["weather.temperatureUnits"]}
              </span>
              <span className="temperature-description">
                {WEATHER_SUGGESTION.current_conditions.summary}
              </span>
            </div>
            <div className="high-low-column">
              <span className="high-temperature">
                <span
                  className="arrow-icon arrow-up"
                  data-l10n-id="newtab-weather-high"
                />
                {
                  WEATHER_SUGGESTION.forecast.high[
                    prefs["weather.temperatureUnits"]
                  ]
                }
                &deg;
              </span>

              <span className="low-temperature">
                <span
                  className="arrow-icon arrow-down"
                  data-l10n-id="newtab-weather-low"
                />
                {
                  WEATHER_SUGGESTION.forecast.low[
                    prefs["weather.temperatureUnits"]
                  ]
                }
                &deg;
              </span>
            </div>
          </div>
          <hr />
        </>
      )}

      {/* Error state for medium sized card */}
      {hasError && (
        <div className="forecast-error" ref={errorRef}>
          <span className="icon icon-info-warning" />{" "}
          <p data-l10n-id="newtab-weather-error-not-available"></p>
        </div>
      )}
      {!hasError && (
        <div className="forecast-row">
          {!isSmallSize && (
            <p
              className="today-forecast"
              data-l10n-id="newtab-weather-todays-forecast"
            ></p>
          )}
          <ul className="forecast-row-items">
            {HOURLY_FORECASTS.map(slot => (
              <li key={slot.epoch_date_time}>
                <span>
                  {slot.temperature[prefs["weather.temperatureUnits"]]}&deg;
                </span>
                <span
                  className={`weather-icon iconId${slot.icon_id}`}
                  aria-label={slot.summary}
                  role="img"
                ></span>
                <span>
                  {(() => {
                    const date = new Date(slot.date_time);
                    const hours = date.getHours() % 12 || 12; // displays a 12-hour format
                    return `${hours}:${String(date.getMinutes()).padStart(2, "0")}`; // gets rid of the extra :00 at the end
                  })()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="forecast-footer">
        <span
          className="sponsored-text"
          aria-hidden="true"
          data-l10n-id="newtab-weather-sponsored"
          data-l10n-args='{"provider": "AccuWeather®"}'
        ></span>
        <a
          className="full-forecast"
          href={HOURLY_FORECASTS[0]?.url || "#"}
          onClick={handleProviderLinkClick}
          data-l10n-id="newtab-weather-see-full-forecast"
        ></a>
      </div>
    </article>
  );
}

export { WeatherForecast };
