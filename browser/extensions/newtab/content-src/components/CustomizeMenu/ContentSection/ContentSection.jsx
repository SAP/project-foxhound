/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import React from "react";
import { batch } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { SectionsMgmtPanel } from "../SectionsMgmtPanel/SectionsMgmtPanel";
import { WallpaperCategories } from "../../WallpaperCategories/WallpaperCategories";
// @nova-cleanup(move-directory): Update import path after WidgetsManagementPanel moves to components/CustomizeMenu/
import { WidgetsManagementPanel } from "content-src/components/Nova/CustomizeMenu/WidgetsManagementPanel/WidgetsManagementPanel";

export class ContentSection extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onPreferenceSelect = this.onPreferenceSelect.bind(this);

    // Refs are necessary for dynamically measuring drawer heights for slide animations
    this.topSitesDrawerRef = React.createRef();
    this.pocketDrawerRef = React.createRef();
    this.widgetsMgmtDrawerRef = React.createRef();
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
        case "WIDGET_CLOCKS":
          widgetName = "clocks";
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
              widgetsMayBeMaximized && !widgetsMaximized ? "medium" : "large";
          } else {
            widgetSize = "small";
          }
        } else {
          widgetSize =
            widgetsMayBeMaximized && !widgetsMaximized ? "medium" : "large";
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
    // eventSource: WALLPAPERS | WEATHER | TOP_SITES | TOP_STORIES | WIDGET_LISTS | WIDGET_TIMER
    const { preference, eventSource } = e.target.dataset;
    let value;
    if (e.target.nodeName === "MOZ-SELECT") {
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
    this.setDrawerMargin(`WIDGETS`, this.props.widgetsEnabled);
  }

  setDrawerMargin(drawerID, isOpen) {
    let drawerRef;

    switch (drawerID) {
      case `TOP_SITES`:
        drawerRef = this.topSitesDrawerRef.current;
        break;
      case `TOP_STORIES`:
        drawerRef = this.pocketDrawerRef.current;
        break;
      case `WIDGETS`:
        drawerRef = this.widgetsMgmtDrawerRef.current;
        break;
      default:
        return;
    }

    if (drawerRef) {
      // Use measured height if valid, otherwise use a large fallback
      // since overflow:hidden on the parent safely hides the drawer
      let drawerHeight = drawerRef.offsetHeight || 100;

      if (isOpen) {
        // @nova-cleanup(remove-conditional): Remove novaEnabled check, keep the marginTop assignment
        drawerRef.style.marginTop = this.props.novaEnabled
          ? ""
          : "var(--space-small)";
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
      mayHaveSportsWidget,
      mayHaveClocksWidget,
      mayHaveWeatherForecast,
      openPreferences,
      wallpapersUserEnabled,
      activeWallpaper,
      setPref,
      mayHaveTopicSections,
      weatherDisplay,
      exitEventFired,
      onSubpanelToggle,
      toggleSectionsMgmtPanel,
      showSectionsMgmtPanel,
      // @nova-cleanup(remove-conditional): Remove novaEnabled
      novaEnabled,
      wallpapersEnabled,
      toggleWidgetsManagementPanel,
      showWidgetsManagementPanel,
      widgetsEnabled,
    } = this.props;
    const {
      topSitesEnabled,
      pocketEnabled,
      weatherEnabled,
      showInferredPersonalizationEnabled,
      topSitesRowsCount,
    } = enabledSections;
    const { timerEnabled, listsEnabled, clocksEnabled } = enabledWidgets;

    // @nova-cleanup(remove-conditional): Remove novaEnabled check and newtab-custom-stories-toggle, default to newtab-recommended-stories-toggle
    let pocketToggleL10nId;
    if (mayHaveInferredPersonalization) {
      pocketToggleL10nId = "newtab-custom-stories-personalized-toggle";
    } else if (novaEnabled) {
      pocketToggleL10nId = "newtab-recommended-stories-toggle";
    } else {
      pocketToggleL10nId = "newtab-custom-stories-toggle";
    }

    // @nova-cleanup(remove-conditional): This conditional adds the toggle for wallpaper visibility.
    return (
      <>
        <div className="home-section">
          {wallpapersEnabled && (
            <>
              <div className="wallpapers-section">
                {novaEnabled && (
                  <moz-toggle
                    id="wallpapers-toggle"
                    pressed={
                      (wallpapersUserEnabled && !!activeWallpaper) || null
                    }
                    ontoggle={this.onPreferenceSelect}
                    data-preference="newtabWallpapers.user.enabled"
                    data-event-source="WALLPAPERS"
                    data-l10n-id="newtab-wallpaper-toggle-title"
                  />
                )}
                <WallpaperCategories
                  setPref={setPref}
                  activeWallpaper={activeWallpaper}
                  exitEventFired={exitEventFired}
                  onSubpanelToggle={onSubpanelToggle}
                />
              </div>
            </>
          )}
          {mayHaveWidgets && !novaEnabled && (
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
                      ontoggle={this.onPreferenceSelect}
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
                      ontoggle={this.onPreferenceSelect}
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
                      ontoggle={this.onPreferenceSelect}
                      data-preference="widgets.focusTimer.enabled"
                      data-event-source="WIDGET_TIMER"
                      data-l10n-id="newtab-custom-widget-timer-toggle"
                    />
                  </div>
                )}

                {/* Clocks */}
                {mayHaveClocksWidget && (
                  <div id="clocks-widget-section" className="section">
                    <moz-toggle
                      id="clocks-toggle"
                      pressed={!!clocksEnabled}
                      ontoggle={this.onPreferenceSelect}
                      data-preference="widgets.clocks.enabled"
                      data-event-source="WIDGET_CLOCKS"
                      data-l10n-id="newtab-custom-widget-clock-toggle"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="settings-toggles">
            {/* Note: If widgets are enabled, the weather toggle will be moved under Widgets subsection */}
            {
              // @nova-cleanup(remove-conditional): Remove novaEnabled conditional on data-preference; replace with data-preference="widgets.weather.enabled"
              !mayHaveWidgets && mayHaveWeather && (
                <div id="weather-section" className="section">
                  <moz-toggle
                    id="weather-toggle"
                    pressed={weatherEnabled || null}
                    ontoggle={this.onPreferenceSelect}
                    data-preference={
                      novaEnabled ? "widgets.weather.enabled" : "showWeather"
                    }
                    data-event-source="WEATHER"
                    data-l10n-id="newtab-custom-weather-toggle"
                  />
                </div>
              )
            }

            <span className="divider" role="separator"></span>

            <div id="shortcuts-section" className="section">
              <moz-toggle
                id="shortcuts-toggle"
                pressed={topSitesEnabled || null}
                ontoggle={this.onPreferenceSelect}
                data-preference="feeds.topsites"
                data-event-source="TOP_SITES"
                data-l10n-id={
                  novaEnabled
                    ? "newtab-custom-shortcuts-nova"
                    : "newtab-custom-shortcuts-toggle"
                }
              >
                <div slot="nested">
                  <div className="more-info-top-wrapper">
                    <div
                      className="more-information"
                      ref={this.topSitesDrawerRef}
                    >
                      <moz-select
                        id="row-selector"
                        className="selector"
                        name="row-count"
                        data-preference="topSitesRows"
                        value={topSitesRowsCount}
                        aria-labelledby="custom-shortcuts-title"
                        onChange={this.onPreferenceSelect}
                        // @nova-cleanup(remove-conditional): Remove novaEnabled conditional and spread operator, keep the attributes
                        {...(novaEnabled && {
                          "data-l10n-id": "newtab-custom-row-description",
                          inputLayout: "inline-end",
                        })}
                      >
                        {[1, 2, 3, 4].map(num =>
                          // @nova-cleanup(remove-conditional): Remove the conditional and "else" block after Nova lands
                          novaEnabled ? (
                            <moz-option
                              key={num}
                              value={String(num)}
                              label={String(num)}
                            />
                          ) : (
                            <moz-option
                              key={num}
                              value={String(num)}
                              data-l10n-id="newtab-custom-row-selector2"
                              data-l10n-args={`{"num": ${num}}`}
                            />
                          )
                        )}
                      </moz-select>
                    </div>
                  </div>
                </div>
              </moz-toggle>
            </div>

            {
              // @nova-cleanup(remove-conditional): Remove novaEnabled check, keep divider
              novaEnabled && mayHaveWidgets && (
                <span className="divider" role="separator"></span>
              )
            }
            {
              // @nova-cleanup(remove-conditional): Remove novaEnabled check, keep toggle and WidgetsManagementPanel
              novaEnabled && mayHaveWidgets && (
                <div id="widgets-section" className="section">
                  <moz-toggle
                    id="widgets-system-toggle"
                    pressed={widgetsEnabled || null}
                    ontoggle={this.onPreferenceSelect}
                    data-preference="widgets.enabled"
                    data-event-source="WIDGETS_SYSTEM"
                    data-l10n-id="newtab-custom-widget-section-toggle"
                  >
                    <div slot="nested">
                      <div className="more-info-widgets-wrapper">
                        <div
                          className="more-information"
                          ref={this.widgetsMgmtDrawerRef}
                        >
                          <WidgetsManagementPanel
                            enabledSections={enabledSections}
                            enabledWidgets={enabledWidgets}
                            mayHaveWeather={mayHaveWeather}
                            mayHaveTimerWidget={mayHaveTimerWidget}
                            mayHaveListsWidget={mayHaveListsWidget}
                            mayHaveSportsWidget={mayHaveSportsWidget}
                            mayHaveClocksWidget={mayHaveClocksWidget}
                            mayHaveWeatherForecast={mayHaveWeatherForecast}
                            weatherDisplay={weatherDisplay}
                            setPref={setPref}
                            onSubpanelToggle={onSubpanelToggle}
                            togglePanel={toggleWidgetsManagementPanel}
                            showPanel={showWidgetsManagementPanel}
                          />
                        </div>
                      </div>
                    </div>
                  </moz-toggle>
                </div>
              )
            }

            {
              // @nova-cleanup(remove-conditional): Remove novaEnabled check, keep divider
              // The pocketRegion check makes sure there is only one divider present if it's false
              novaEnabled && pocketRegion && (
                <span className="divider" role="separator"></span>
              )
            }

            {pocketRegion && (
              <div id="pocket-section" className="section">
                <moz-toggle
                  id="pocket-toggle"
                  pressed={pocketEnabled || null}
                  ontoggle={this.onPreferenceSelect}
                  data-preference="feeds.section.topstories"
                  data-event-source="TOP_STORIES"
                  data-l10n-id={pocketToggleL10nId}
                >
                  <div slot="nested">
                    {(mayHaveInferredPersonalization ||
                      mayHaveTopicSections) && (
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
                              novaEnabled={novaEnabled}
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
          {
            // @nova-cleanup(remove-conditional): Remove this divider once Nova lands
            !novaEnabled && <span className="divider" role="separator"></span>
          }
          {
            // @nova-cleanup(remove-conditional): Remove this block once Nova ships
            !novaEnabled && (
              <div>
                <button
                  id="settings-link"
                  className="external-link"
                  onClick={openPreferences}
                  data-l10n-id="newtab-custom-settings"
                />
              </div>
            )
          }
        </div>

        {
          // @nova-cleanup(remove-conditional): Remove novaEnabled check, keep manage-settings-footer
          novaEnabled && (
            <div className="manage-settings-footer">
              <button
                id="settings-link"
                className="external-link"
                onClick={openPreferences}
                data-l10n-id="newtab-custom-settings"
              />
            </div>
          )
        }
      </>
    );
  }
}
