/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { batch } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { SectionsMgmtPanel } from "../SectionsMgmtPanel/SectionsMgmtPanel";
import { WallpaperCategories } from "../../WallpaperCategories/WallpaperCategories";

export class ContentSection extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onPreferenceSelect = this.onPreferenceSelect.bind(this);

    // Refs are necessary for dynamically measuring drawer heights for slide animations
    this.topSitesDrawerRef = React.createRef();
    this.pocketDrawerRef = React.createRef();
  }

  inputUserEvent(eventSource, eventValue) {
    batch(() => {
      this.props.dispatch(
        ac.UserEvent({
          event: "PREF_CHANGED",
          source: eventSource,
          value: { status: eventValue, menu_source: "CUSTOMIZE_MENU" },
        })
      );

      // Dispatch unified widget telemetry for widget toggles.
      // Map the event source from the customize panel to the widget name
      // for the unified telemetry event.
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
      }

      if (widgetName) {
        const { widgetsMaximized, widgetsMayBeMaximized } =
          this.props.enabledWidgets;

        let widgetSize;
        if (widgetName === "weather") {
          if (
            this.props.mayHaveWeatherForecast &&
            this.props.weatherDisplay === "detailed"
          ) {
            widgetSize =
              widgetsMayBeMaximized && !widgetsMaximized ? "small" : "medium";
          } else {
            widgetSize = "mini";
          }
        } else {
          widgetSize =
            widgetsMayBeMaximized && !widgetsMaximized ? "small" : "medium";
        }

        const data = {
          widget_name: widgetName,
          widget_source: "customize_panel",
          enabled: eventValue,
          widget_size: widgetSize,
        };

        this.props.dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_ENABLED,
            data,
          })
        );
      }
    });
  }

  onPreferenceSelect(e) {
    // eventSource: WEATHER | TOP_SITES | TOP_STORIES | WIDGET_LISTS | WIDGET_TIMER
    const { preference, eventSource } = e.target.dataset;
    let value;
    if (e.target.nodeName === "SELECT") {
      value = parseInt(e.target.value, 10);
    } else if (e.target.nodeName === "INPUT") {
      value = e.target.checked;
      if (eventSource) {
        this.inputUserEvent(eventSource, value);
      }
    } else if (e.target.nodeName === "MOZ-TOGGLE") {
      value = e.target.pressed;
      if (eventSource) {
        this.inputUserEvent(eventSource, value);
      }
    }
    this.props.setPref(preference, value);
  }

  componentDidMount() {
    this.setDrawerMargins();
  }

  componentDidUpdate() {
    this.setDrawerMargins();
  }

  setDrawerMargins() {
    this.setDrawerMargin(
      `TOP_SITES`,
      this.props.enabledSections.topSitesEnabled
    );
    this.setDrawerMargin(
      `TOP_STORIES`,
      this.props.enabledSections.pocketEnabled
    );
  }

  setDrawerMargin(drawerID, isOpen) {
    let drawerRef;

    if (drawerID === `TOP_SITES`) {
      drawerRef = this.topSitesDrawerRef.current;
    } else if (drawerID === `TOP_STORIES`) {
      drawerRef = this.pocketDrawerRef.current;
    } else {
      return;
    }

    if (drawerRef) {
      // Use measured height if valid, otherwise use a large fallback
      // since overflow:hidden on the parent safely hides the drawer
      let drawerHeight =
        parseFloat(window.getComputedStyle(drawerRef)?.height) || 100;

      if (isOpen) {
        drawerRef.style.marginTop = "var(--space-small)";
      } else {
        drawerRef.style.marginTop = `-${drawerHeight + 3}px`;
      }
    }
  }

  render() {
    const {
      enabledSections,
      enabledWidgets,
      pocketRegion,
      mayHaveInferredPersonalization,
      mayHaveWeather,
      mayHaveWidgets,
      mayHaveTimerWidget,
      mayHaveListsWidget,
      openPreferences,
      wallpapersEnabled,
      activeWallpaper,
      setPref,
      mayHaveTopicSections,
      exitEventFired,
      onSubpanelToggle,
      toggleSectionsMgmtPanel,
      showSectionsMgmtPanel,
    } = this.props;
    const {
      topSitesEnabled,
      pocketEnabled,
      weatherEnabled,
      showInferredPersonalizationEnabled,
      topSitesRowsCount,
    } = enabledSections;
    const { timerEnabled, listsEnabled } = enabledWidgets;

    return (
      <div className="home-section">
        {wallpapersEnabled && (
          <>
            <div className="wallpapers-section">
              <WallpaperCategories
                setPref={setPref}
                activeWallpaper={activeWallpaper}
                exitEventFired={exitEventFired}
                onSubpanelToggle={onSubpanelToggle}
              />
            </div>
            {/* If widgets section is visible, hide this divider */}
            {!mayHaveWidgets && (
              <span className="divider" role="separator"></span>
            )}
          </>
        )}
        {mayHaveWidgets && (
          <div className="widgets-section">
            <div className="category-header">
              <h2 data-l10n-id="newtab-custom-widget-section-title"></h2>
            </div>
            <div className="settings-widgets">
              {/* Weather */}
              {mayHaveWeather && (
                <div id="weather-section" className="section">
                  <moz-toggle
                    id="weather-toggle"
                    pressed={weatherEnabled || null}
                    onToggle={this.onPreferenceSelect}
                    data-preference="showWeather"
                    data-event-source="WEATHER"
                    data-l10n-id="newtab-custom-widget-weather-toggle"
                  />
                </div>
              )}

              {/* Lists */}
              {mayHaveListsWidget && (
                <div id="lists-widget-section" className="section">
                  <moz-toggle
                    id="lists-toggle"
                    pressed={listsEnabled || null}
                    onToggle={this.onPreferenceSelect}
                    data-preference="widgets.lists.enabled"
                    data-event-source="WIDGET_LISTS"
                    data-l10n-id="newtab-custom-widget-lists-toggle"
                  />
                </div>
              )}

              {/* Timer */}
              {mayHaveTimerWidget && (
                <div id="timer-widget-section" className="section">
                  <moz-toggle
                    id="timer-toggle"
                    pressed={timerEnabled || null}
                    onToggle={this.onPreferenceSelect}
                    data-preference="widgets.focusTimer.enabled"
                    data-event-source="WIDGET_TIMER"
                    data-l10n-id="newtab-custom-widget-timer-toggle"
                  />
                </div>
              )}
              <span className="divider" role="separator"></span>
            </div>
          </div>
        )}
        <div className="settings-toggles">
          {/* Note: If widgets are enabled, the weather toggle will be moved under Widgets subsection */}
          {!mayHaveWidgets && mayHaveWeather && (
            <div id="weather-section" className="section">
              <moz-toggle
                id="weather-toggle"
                pressed={weatherEnabled || null}
                onToggle={this.onPreferenceSelect}
                data-preference="showWeather"
                data-event-source="WEATHER"
                data-l10n-id="newtab-custom-weather-toggle"
              />
            </div>
          )}

          <div id="shortcuts-section" className="section">
            <moz-toggle
              id="shortcuts-toggle"
              pressed={topSitesEnabled || null}
              onToggle={this.onPreferenceSelect}
              data-preference="feeds.topsites"
              data-event-source="TOP_SITES"
              data-l10n-id="newtab-custom-shortcuts-toggle"
            >
              <div slot="nested">
                <div className="more-info-top-wrapper">
                  <div
                    className="more-information"
                    ref={this.topSitesDrawerRef}
                  >
                    <select
                      id="row-selector"
                      className="selector"
                      name="row-count"
                      data-preference="topSitesRows"
                      value={topSitesRowsCount}
                      onChange={this.onPreferenceSelect}
                      disabled={!topSitesEnabled}
                      aria-labelledby="custom-shortcuts-title"
                    >
                      <option
                        value="1"
                        data-l10n-id="newtab-custom-row-selector"
                        data-l10n-args='{"num": 1}'
                      />
                      <option
                        value="2"
                        data-l10n-id="newtab-custom-row-selector"
                        data-l10n-args='{"num": 2}'
                      />
                      <option
                        value="3"
                        data-l10n-id="newtab-custom-row-selector"
                        data-l10n-args='{"num": 3}'
                      />
                      <option
                        value="4"
                        data-l10n-id="newtab-custom-row-selector"
                        data-l10n-args='{"num": 4}'
                      />
                    </select>
                  </div>
                </div>
              </div>
            </moz-toggle>
          </div>

          {pocketRegion && (
            <div id="pocket-section" className="section">
              <moz-toggle
                id="pocket-toggle"
                pressed={pocketEnabled || null}
                onToggle={this.onPreferenceSelect}
                aria-describedby="custom-pocket-subtitle"
                data-preference="feeds.section.topstories"
                data-event-source="TOP_STORIES"
                {...(mayHaveInferredPersonalization
                  ? {
                      "data-l10n-id":
                        "newtab-custom-stories-personalized-toggle",
                    }
                  : {
                      "data-l10n-id": "newtab-custom-stories-toggle",
                    })}
              >
                <div slot="nested">
                  {(mayHaveInferredPersonalization || mayHaveTopicSections) && (
                    <div className="more-info-pocket-wrapper">
                      <div
                        className="more-information"
                        ref={this.pocketDrawerRef}
                      >
                        {mayHaveInferredPersonalization && (
                          <div className="check-wrapper" role="presentation">
                            <input
                              id="inferred-personalization"
                              className="customize-menu-checkbox"
                              disabled={!pocketEnabled}
                              checked={showInferredPersonalizationEnabled}
                              type="checkbox"
                              onChange={this.onPreferenceSelect}
                              data-preference="discoverystream.sections.personalization.inferred.user.enabled"
                              data-event-source="INFERRED_PERSONALIZATION"
                            />
                            <label
                              className="customize-menu-checkbox-label"
                              htmlFor="inferred-personalization"
                              data-l10n-id="newtab-custom-stories-personalized-checkbox-label"
                            />
                          </div>
                        )}
                        {mayHaveTopicSections && (
                          <SectionsMgmtPanel
                            exitEventFired={exitEventFired}
                            pocketEnabled={pocketEnabled}
                            onSubpanelToggle={onSubpanelToggle}
                            togglePanel={toggleSectionsMgmtPanel}
                            showPanel={showSectionsMgmtPanel}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </moz-toggle>
            </div>
          )}
        </div>

        <span className="divider" role="separator"></span>

        <div>
          <button
            id="settings-link"
            className="external-link"
            onClick={openPreferences}
            data-l10n-id="newtab-custom-settings"
          />
        </div>
      </div>
    );
  }
}
