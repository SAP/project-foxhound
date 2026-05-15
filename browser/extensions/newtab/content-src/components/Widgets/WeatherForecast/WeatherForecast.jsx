/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, { useCallback, useRef } from "react";
import { useSelector, batch } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { useIntersectionObserver } from "../../../lib/utils";
import { LocationSearch } from "content-src/components/Weather/LocationSearch";

const USER_ACTION_TYPES = {
  CHANGE_LOCATION: "change_location",
  DETECT_LOCATION: "detect_location",
  CHANGE_TEMP_UNIT: "change_temperature_units",
  CHANGE_DISPLAY: "change_weather_display",
  LEARN_MORE: "learn_more",
  PROVIDER_LINK_CLICK: "provider_link_click",
};

function WeatherForecast({ dispatch, isMaximized, widgetsMayBeMaximized }) {
  const prefs = useSelector(state => state.Prefs.values);
  const weatherData = useSelector(state => state.Weather);
  const impressionFired = useRef(false);

  const isSmallSize = !isMaximized && widgetsMayBeMaximized;
  const widgetSize = isSmallSize ? "small" : "medium";

  const handleIntersection = useCallback(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;

    const telemetryData = {
      widget_name: "weather",
      widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
    };
    dispatch(
      ac.AlsoToMain({
        type: at.WIDGETS_IMPRESSION,
        data: telemetryData,
      })
    );
  }, [dispatch, widgetSize, widgetsMayBeMaximized]);

  const forecastRef = useIntersectionObserver(handleIntersection);

  const WEATHER_SUGGESTION = weatherData.suggestions?.[0];

  const nimbusWeatherDisplay = prefs.trainhopConfig?.weather?.display;
  const showDetailedView =
    nimbusWeatherDisplay === "detailed" ||
    prefs["weather.display"] === "detailed";

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
  if (
    !showDetailedView ||
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
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
      widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
    };
    dispatch(
      ac.OnlyToMain({
        type: at.WIDGETS_USER_EVENT,
        data: telemetryData,
      })
    );
  }

  return (
    <article
      className={`weather-forecast-widget${isSmallSize ? " small-widget" : ""}`}
      ref={el => {
        forecastRef.current = [el];
      }}
    >
      <div className="city-wrapper">
        <div className="city-name">
          {searchActive ? (
            <LocationSearch outerClassName="" />
          ) : (
            <h3>{weatherData.locationData.city}</h3>
          )}
        </div>
        <div className="weather-forecast-context-menu-wrapper">
          <moz-button
            className="weather-forecast-context-menu-button"
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
            {!showDetailedView ? (
              <panel-item
                data-l10n-id="newtab-weather-menu-change-weather-display-detailed"
                onClick={() => handleChangeDisplay("detailed")}
              />
            ) : (
              <panel-item
                data-l10n-id="newtab-weather-menu-change-weather-display-simple"
                onClick={() => handleChangeDisplay("simple")}
              />
            )}
            <panel-item
              data-l10n-id="newtab-weather-menu-hide-weather-v2"
              onClick={handleHideWeather}
            />
            <panel-item
              data-l10n-id="newtab-weather-menu-learn-more"
              onClick={handleLearnMore}
            />
          </panel-list>
        </div>
      </div>
      {!isSmallSize && (
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
                <span className="arrow-icon arrow-up" />
                {
                  WEATHER_SUGGESTION.forecast.high[
                    prefs["weather.temperatureUnits"]
                  ]
                }
                &deg;
              </span>

              <span className="low-temperature">
                <span className="arrow-icon arrow-down" />
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
      <div className="forecast-row">
        {!isSmallSize && (
          <p
            className="today-forecast"
            data-l10n-id="newtab-weather-todays-forecast"
          ></p>
        )}
        <ul className="forecast-row-items">
          <li>
            <span>80&deg;</span>
            <span
              className={`weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
            ></span>
            <span>7:00</span>
          </li>
          <li>
            <span>80&deg;</span>
            <span
              className={`weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
            ></span>
            <span>7:00</span>
          </li>
          <li>
            <span>80&deg;</span>
            <span
              className={`weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
            ></span>
            <span>7:00</span>
          </li>
          <li>
            <span>80&deg;</span>
            <span
              className={`weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
            ></span>
            <span>7:00</span>
          </li>
          <li>
            <span>80&deg;</span>
            <span
              className={`weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
            ></span>
            <span>7:00</span>
          </li>
        </ul>
      </div>

      <div className="forecast-footer">
        <a
          href={WEATHER_SUGGESTION.forecast.url}
          className="full-forecast"
          data-l10n-id="newtab-weather-see-full-forecast"
          onClick={handleProviderLinkClick}
        ></a>
        <span
          className="sponsored-text"
          data-l10n-id="newtab-weather-sponsored"
          data-l10n-args='{"provider": "AccuWeather®"}'
        ></span>
      </div>
    </article>
  );
}

export { WeatherForecast };
