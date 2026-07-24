/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React, { useEffect, useRef } from "react";
import { useDispatch, useSelector, batch } from "react-redux";
import { Lists } from "./Lists/Lists";
import { FocusTimer } from "./FocusTimer/FocusTimer";
import { WeatherForecast } from "./WeatherForecast/WeatherForecast";
import { MessageWrapper } from "content-src/components/MessageWrapper/MessageWrapper";
import { WidgetsFeatureHighlight } from "../DiscoveryStreamComponents/FeatureHighlight/WidgetsFeatureHighlight";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";

const CONTAINER_ACTION_TYPES = {
  HIDE_ALL: "hide_all",
  CHANGE_SIZE_ALL: "change_size_all",
};

const PREF_WIDGETS_LISTS_ENABLED = "widgets.lists.enabled";
const PREF_WIDGETS_SYSTEM_LISTS_ENABLED = "widgets.system.lists.enabled";
const PREF_WIDGETS_TIMER_ENABLED = "widgets.focusTimer.enabled";
const PREF_WIDGETS_SYSTEM_TIMER_ENABLED = "widgets.system.focusTimer.enabled";
const PREF_WIDGETS_SYSTEM_WEATHER_FORECAST_ENABLED =
  "widgets.system.weatherForecast.enabled";
const PREF_WIDGETS_MAXIMIZED = "widgets.maximized";
const PREF_WIDGETS_SYSTEM_MAXIMIZED = "widgets.system.maximized";

// resets timer to default values (exported for testing)
// In practice, this logic runs inside a useEffect when
// the timer widget is disabled (after the pref flips from true to false).
// Because Enzyme tests cannot reliably simulate that pref update or trigger
// the related useEffect, we expose this helper to at least just test the reset behavior instead

export function resetTimerToDefaults(dispatch, timerType) {
  const originalTime = timerType === "focus" ? 1500 : 300;

  // Reset both focus and break timers to their initial durations
  dispatch(
    ac.AlsoToMain({
      type: at.WIDGETS_TIMER_RESET,
      data: {
        timerType,
        duration: originalTime,
        initialDuration: originalTime,
      },
    })
  );

  // Set the timer type back to "focus"
  dispatch(
    ac.AlsoToMain({
      type: at.WIDGETS_TIMER_SET_TYPE,
      data: {
        timerType: "focus",
      },
    })
  );
}

function Widgets() {
  const prefs = useSelector(state => state.Prefs.values);
  const weatherData = useSelector(state => state.Weather);
  const { messageData } = useSelector(state => state.Messages);
  const timerType = useSelector(state => state.TimerWidget.timerType);
  const timerData = useSelector(state => state.TimerWidget);
  const isMaximized = prefs[PREF_WIDGETS_MAXIMIZED];
  const widgetsMayBeMaximized = prefs[PREF_WIDGETS_SYSTEM_MAXIMIZED];
  const dispatch = useDispatch();

  const nimbusListsEnabled = prefs.widgetsConfig?.listsEnabled;
  const nimbusTimerEnabled = prefs.widgetsConfig?.timerEnabled;
  const nimbusListsTrainhopEnabled =
    prefs.trainhopConfig?.widgets?.listsEnabled;
  const nimbusTimerTrainhopEnabled =
    prefs.trainhopConfig?.widgets?.timerEnabled;
  const nimbusWeatherForecastTrainhopEnabled =
    prefs.trainhopConfig?.widgets?.weatherForecastEnabled;
  const nimbusMaximizedTrainhopEnabled =
    prefs.trainhopConfig?.widgets?.maximized;

  const listsEnabled =
    (nimbusListsTrainhopEnabled ||
      nimbusListsEnabled ||
      prefs[PREF_WIDGETS_SYSTEM_LISTS_ENABLED]) &&
    prefs[PREF_WIDGETS_LISTS_ENABLED];

  const timerEnabled =
    (nimbusTimerTrainhopEnabled ||
      nimbusTimerEnabled ||
      prefs[PREF_WIDGETS_SYSTEM_TIMER_ENABLED]) &&
    prefs[PREF_WIDGETS_TIMER_ENABLED];

  // This weather forecast widget will only show when the following are true:
  // - The weather view is set to "detailed" (can be checked with the weather.display pref)
  // - Weather is displayed on New Tab (system.showWeather)
  // - The weather forecast widget is enabled (system.weatherForecast.enabled)
  // Note that if the view is set to "detailed" but the weather forecast widget is not enabled,
  // then the mini weather widget will display with the "detailed" view
  const weatherForecastSystemEnabled =
    nimbusWeatherForecastTrainhopEnabled ||
    prefs[PREF_WIDGETS_SYSTEM_WEATHER_FORECAST_ENABLED];

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

  const weatherForecastEnabled =
    weatherForecastSystemEnabled &&
    showDetailedView &&
    weatherData?.initialized &&
    isWeatherEnabled;

  // Widget size is "small" only when maximize feature is enabled and widgets
  // are currently minimized. Otherwise defaults to "medium".
  const widgetSize = widgetsMayBeMaximized && !isMaximized ? "small" : "medium";

  // track previous timerEnabled state to detect when it becomes disabled
  const prevTimerEnabledRef = useRef(timerEnabled);

  // Reset timer when it becomes disabled
  useEffect(() => {
    const wasTimerEnabled = prevTimerEnabledRef.current;
    const isTimerEnabled = timerEnabled;

    // Only reset if timer was enabled and is now disabled
    if (wasTimerEnabled && !isTimerEnabled && timerData) {
      resetTimerToDefaults(dispatch, timerType);
    }

    // Update the ref to track current state
    prevTimerEnabledRef.current = isTimerEnabled;
  }, [timerEnabled, timerData, dispatch, timerType]);

  // Bug 2013978 - Replace hardcoded widget list with programmatic registry
  function hideAllWidgets() {
    batch(() => {
      dispatch(ac.SetPref(PREF_WIDGETS_LISTS_ENABLED, false));
      dispatch(ac.SetPref(PREF_WIDGETS_TIMER_ENABLED, false));
      // If weather forecast widget is visible, turn off the weather
      if (weatherForecastEnabled) {
        dispatch(ac.SetPref("showWeather", false));
      }

      const telemetryData = {
        action_type: CONTAINER_ACTION_TYPES.HIDE_ALL,
        widget_size: widgetSize,
      };

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_CONTAINER_ACTION,
          data: telemetryData,
        })
      );

      // Dispatch WIDGETS_ENABLED for each widget being hidden
      if (listsEnabled) {
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_ENABLED,
            data: {
              widget_name: "lists",
              widget_source: "widget",
              enabled: false,
              widget_size: widgetSize,
            },
          })
        );
      }

      if (timerEnabled) {
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_ENABLED,
            data: {
              widget_name: "focus_timer",
              widget_source: "widget",
              enabled: false,
              widget_size: widgetSize,
            },
          })
        );
      }

      // Send telemetry for weather widget if it was visible when hiding all widgets
      if (weatherForecastEnabled) {
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_ENABLED,
            data: {
              widget_name: "weather",
              widget_source: "widget",
              enabled: false,
              widget_size: widgetSize,
            },
          })
        );
      }
    });
  }

  function handleHideAllWidgetsClick(e) {
    e.preventDefault();
    hideAllWidgets();
  }

  function handleHideAllWidgetsKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      hideAllWidgets();
    }
  }

  function toggleMaximize() {
    const newMaximizedState = !isMaximized;
    const newWidgetSize =
      widgetsMayBeMaximized && !newMaximizedState ? "small" : "medium";

    batch(() => {
      dispatch(ac.SetPref(PREF_WIDGETS_MAXIMIZED, newMaximizedState));

      const telemetryData = {
        action_type: CONTAINER_ACTION_TYPES.CHANGE_SIZE_ALL,
        action_value: newMaximizedState
          ? "maximize_widgets"
          : "minimize_widgets",
        widget_size: newWidgetSize,
      };

      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_CONTAINER_ACTION,
          data: telemetryData,
        })
      );
    });
  }

  function handleToggleMaximizeClick(e) {
    e.preventDefault();
    toggleMaximize();
  }

  function handleToggleMaximizeKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleMaximize();
    }
  }

  function handleUserInteraction(widgetName) {
    const prefName = `widgets.${widgetName}.interaction`;
    const hasInteracted = prefs[prefName];
    // we want to make sure that the value is a strict false (and that the property exists)
    if (hasInteracted === false) {
      dispatch(ac.SetPref(prefName, true));
    }
  }

  if (!(listsEnabled || timerEnabled || weatherForecastEnabled)) {
    return null;
  }

  return (
    <div className="widgets-wrapper">
      <div className="widgets-section-container">
        <div className="widgets-title-container">
          <div className="widgets-title-container-text">
            <h1 data-l10n-id="newtab-widget-section-title"></h1>
            {messageData?.content?.messageType === "WidgetMessage" && (
              <MessageWrapper dispatch={dispatch}>
                <WidgetsFeatureHighlight dispatch={dispatch} />
              </MessageWrapper>
            )}
          </div>

          {(nimbusMaximizedTrainhopEnabled ||
            prefs[PREF_WIDGETS_SYSTEM_MAXIMIZED]) && (
            <moz-button
              id="toggle-widgets-size-button"
              type="icon ghost"
              size="small"
              // Toggle the icon and hover text
              data-l10n-id={
                isMaximized
                  ? "newtab-widget-section-minimize"
                  : "newtab-widget-section-maximize"
              }
              iconsrc={`chrome://browser/skin/${isMaximized ? "fullscreen-exit" : "fullscreen"}.svg`}
              onClick={handleToggleMaximizeClick}
              onKeyDown={handleToggleMaximizeKeyDown}
            />
          )}
          <moz-button
            id="hide-all-widgets-button"
            type="icon ghost"
            size="small"
            data-l10n-id="newtab-widget-section-hide-all-button"
            iconsrc="chrome://global/skin/icons/close.svg"
            onClick={handleHideAllWidgetsClick}
            onKeyDown={handleHideAllWidgetsKeyDown}
          />
        </div>
        <div
          className={`widgets-container${isMaximized ? " is-maximized" : ""}`}
        >
          {listsEnabled && (
            <Lists
              dispatch={dispatch}
              handleUserInteraction={handleUserInteraction}
              isMaximized={isMaximized}
              widgetsMayBeMaximized={widgetsMayBeMaximized}
            />
          )}
          {timerEnabled && (
            <FocusTimer
              dispatch={dispatch}
              handleUserInteraction={handleUserInteraction}
              isMaximized={isMaximized}
              widgetsMayBeMaximized={widgetsMayBeMaximized}
            />
          )}
          {weatherForecastEnabled && (
            <WeatherForecast
              dispatch={dispatch}
              handleUserInteraction={handleUserInteraction}
              isMaximized={isMaximized}
              widgetsMayBeMaximized={widgetsMayBeMaximized}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { Widgets };
