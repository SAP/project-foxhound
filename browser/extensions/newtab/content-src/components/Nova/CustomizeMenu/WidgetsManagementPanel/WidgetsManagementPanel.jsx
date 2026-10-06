/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// @nova-cleanup(move-directory): Move to components/CustomizeMenu/WidgetsManagementPanel/ after Nova ships

import React, { useEffect, useRef } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { WIDGET_REGISTRY, resolveWidgetSize } from "common/WidgetsRegistry.mjs";
// eslint-disable-next-line no-shadow
import { CSSTransition } from "react-transition-group";

function WidgetsManagementPanel({
  onSubpanelToggle,
  togglePanel,
  showPanel,
  enabledSections,
  enabledWidgets,
  mayHaveWeather,
  mayHaveTimerWidget,
  mayHaveListsWidget,
  mayHaveSportsWidget,
  mayHaveClocksWidget,
  setPref,
}) {
  const prefs = useSelector(state => state.Prefs.values);
  const arrowButtonRef = useRef(null);
  const panelRef = useRef(null);
  const dispatch = useDispatch();

  // Notify parent menu when subpanel opens/closes
  useEffect(() => {
    if (onSubpanelToggle) {
      onSubpanelToggle(showPanel);
    }
  }, [showPanel, onSubpanelToggle]);

  const handlePanelEntered = () => {
    arrowButtonRef.current?.focus();
  };

  const onToggleWidget = e => {
    const { preference, eventSource } = e.target.dataset;
    const value = e.target.pressed;

    batch(() => {
      dispatch(
        ac.UserEvent({
          event: "PREF_CHANGED",
          source: eventSource,
          value: { status: value, menu_source: "CUSTOMIZE_MENU" },
        })
      );

      let widgetName;
      switch (eventSource) {
        case "WEATHER":
          widgetName = "weather";
          break;
        case "WIDGET_LISTS":
          widgetName = "lists";
          break;
        case "WIDGET_TIMER":
          widgetName = "focus_timer";
          break;
        case "WIDGET_SPORTS":
          widgetName = "sports";
          break;
        case "WIDGET_CLOCKS":
          widgetName = "clocks";
          break;
      }

      if (widgetName) {
        const widget = WIDGET_REGISTRY.find(
          w => w.telemetryName === widgetName
        );
        const widgetSize = resolveWidgetSize(widget, prefs);

        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_ENABLED,
            data: {
              widget_name: widgetName,
              widget_source: "customize_panel",
              enabled: value,
              widget_size: widgetSize,
            },
          })
        );
      }

      setPref(preference, value);
    });
  };

  const { weatherEnabled } = enabledSections;
  const { timerEnabled, listsEnabled, sportsWidgetEnabled, clocksEnabled } =
    enabledWidgets;
  const isRTL = typeof document !== "undefined" && document.dir === "rtl";
  // @backward-compat { version 151 } Switch to chrome://global/skin/icons/shaft-arrow-${dir}.svg
  // once Firefox 151 reaches Release (icons not available in toolkit until then).
  const arrowIconSrc = `chrome://newtab/content/data/content/assets/shaft-arrow-${isRTL ? "right" : "left"}.svg`;

  return (
    <div id="widgets-management-panel" className="widgets-mgmt-panel-container">
      <moz-box-button
        onClick={togglePanel}
        data-l10n-id="newtab-widget-manage-widget-button"
      ></moz-box-button>
      <CSSTransition
        nodeRef={panelRef}
        in={showPanel}
        timeout={300}
        classNames="widgets-mgmt-panel"
        unmountOnExit={true}
        onEntered={handlePanelEntered}
      >
        <div ref={panelRef} className="widgets-mgmt-panel">
          <div className="panel-content">
            <div className="arrow-wrapper">
              <moz-button
                ref={arrowButtonRef}
                type="ghost"
                className="arrow-button"
                iconSrc={arrowIconSrc}
                onClick={togglePanel}
              ></moz-button>
              <h2 data-l10n-id="newtab-widget-manage-title"></h2>
            </div>
            <div className="settings-widgets">
              {mayHaveWeather && (
                <div id="weather-section" className="section">
                  <moz-toggle
                    id="weather-toggle"
                    pressed={weatherEnabled || null}
                    ontoggle={onToggleWidget}
                    data-preference="widgets.weather.enabled"
                    data-event-source="WEATHER"
                    data-l10n-id="newtab-custom-widget-weather-toggle"
                  />
                </div>
              )}
              {mayHaveTimerWidget && (
                <div id="timer-widget-section" className="section">
                  <moz-toggle
                    id="timer-toggle"
                    pressed={timerEnabled || null}
                    ontoggle={onToggleWidget}
                    data-preference="widgets.focusTimer.enabled"
                    data-event-source="WIDGET_TIMER"
                    data-l10n-id="newtab-custom-widget-timer-toggle"
                  />
                </div>
              )}
              {mayHaveListsWidget && (
                <div id="lists-widget-section" className="section">
                  <moz-toggle
                    id="lists-toggle"
                    pressed={listsEnabled || null}
                    ontoggle={onToggleWidget}
                    data-preference="widgets.lists.enabled"
                    data-event-source="WIDGET_LISTS"
                    data-l10n-id="newtab-custom-widget-lists-toggle"
                  />
                </div>
              )}
              {mayHaveSportsWidget && (
                <div id="sports-widget-section" className="section">
                  <moz-toggle
                    id="sports-widget-toggle"
                    pressed={sportsWidgetEnabled || null}
                    ontoggle={onToggleWidget}
                    data-preference="widgets.sportsWidget.enabled"
                    data-event-source="WIDGET_SPORTS"
                    data-l10n-id="newtab-custom-widget-sports-toggle2"
                  />
                </div>
              )}
              {mayHaveClocksWidget && (
                <div id="clocks-widget-section" className="section">
                  <moz-toggle
                    id="clocks-toggle"
                    pressed={clocksEnabled || null}
                    ontoggle={onToggleWidget}
                    data-preference="widgets.clocks.enabled"
                    data-event-source="WIDGET_CLOCKS"
                    data-l10n-id="newtab-custom-widget-clock-toggle"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CSSTransition>
    </div>
  );
}

export { WidgetsManagementPanel };
