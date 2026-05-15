/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { connect, batch } from "react-redux";
import { LocationSearch } from "content-src/components/Weather/LocationSearch";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { useIntersectionObserver } from "../../lib/utils";
import React, { useState } from "react";

const USER_ACTION_TYPES = {
  CHANGE_DISPLAY: "change_weather_display",
  CHANGE_LOCATION: "change_location",
  CHANGE_TEMP_UNIT: "change_temperature_units",
  DETECT_LOCATION: "detect_location",
  LEARN_MORE: "learn_more",
  OPT_IN_ACCEPTED: "opt_in_accepted",
  PROVIDER_LINK_CLICK: "provider_link_click",
};

const VISIBLE = "visible";
const VISIBILITY_CHANGE_EVENT = "visibilitychange";
const PREF_SYSTEM_SHOW_WEATHER = "system.showWeather";

function WeatherPlaceholder() {
  const [isSeen, setIsSeen] = useState(false);

  // We are setting up a visibility and intersection event
  // so animations don't happen with headless automation.
  // The animations causes tests to fail beause they never stop,
  // and many tests wait until everything has stopped before passing.
  const ref = useIntersectionObserver(() => setIsSeen(true), 1);

  const isSeenClassName = isSeen ? `placeholder-seen` : ``;

  return (
    <div
      className={`weather weather-placeholder ${isSeenClassName}`}
      ref={el => {
        ref.current = [el];
      }}
    >
      <div className="placeholder-image placeholder-fill" />
      <div className="placeholder-context">
        <div className="placeholder-header placeholder-fill" />
        <div className="placeholder-description placeholder-fill" />
      </div>
    </div>
  );
}

export class _Weather extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      url: "https://example.com",
      impressionSeen: false,
      errorSeen: false,
    };
    this.setImpressionRef = element => {
      this.impressionElement = element;
    };
    this.setErrorRef = element => {
      this.errorElement = element;
    };
    this.setPanelRef = element => {
      this.panelElement = element;
    };
    this.onProviderClick = this.onProviderClick.bind(this);
    this.onMenuButtonClick = this.onMenuButtonClick.bind(this);
    this.onMenuButtonKeyDown = this.onMenuButtonKeyDown.bind(this);
  }

  componentDidMount() {
    const { props } = this;

    if (!props.dispatch) {
      return;
    }

    if (props.document.visibilityState === VISIBLE) {
      // Setup the impression observer once the page is visible.
      this.setImpressionObservers();
    } else {
      // We should only ever send the latest impression stats ping, so remove any
      // older listeners.
      if (this._onVisibilityChange) {
        props.document.removeEventListener(
          VISIBILITY_CHANGE_EVENT,
          this._onVisibilityChange
        );
      }

      this._onVisibilityChange = () => {
        if (props.document.visibilityState === VISIBLE) {
          // Setup the impression observer once the page is visible.
          this.setImpressionObservers();
          props.document.removeEventListener(
            VISIBILITY_CHANGE_EVENT,
            this._onVisibilityChange
          );
        }
      };
      props.document.addEventListener(
        VISIBILITY_CHANGE_EVENT,
        this._onVisibilityChange
      );
    }
  }

  componentWillUnmount() {
    // Remove observers on unmount
    if (this.observer && this.impressionElement) {
      this.observer.unobserve(this.impressionElement);
    }
    if (this.observer && this.errorElement) {
      this.observer.unobserve(this.errorElement);
    }
    if (this._onVisibilityChange) {
      this.props.document.removeEventListener(
        VISIBILITY_CHANGE_EVENT,
        this._onVisibilityChange
      );
    }
  }

  setImpressionObservers() {
    if (this.impressionElement) {
      this.observer = new IntersectionObserver(this.onImpression.bind(this));
      this.observer.observe(this.impressionElement);
    }
    if (this.errorElement) {
      this.observer = new IntersectionObserver(this.onError.bind(this));
      this.observer.observe(this.errorElement);
    }
  }

  onImpression(entries) {
    if (this.state) {
      const entry = entries.find(e => e.isIntersecting);

      if (entry) {
        if (this.impressionElement) {
          this.observer.unobserve(this.impressionElement);
        }

        batch(() => {
          // Old event (keep for backward compatibility)
          this.props.dispatch(
            ac.OnlyToMain({
              type: at.WEATHER_IMPRESSION,
            })
          );

          // New unified event
          this.props.dispatch(
            ac.OnlyToMain({
              type: at.WIDGETS_IMPRESSION,
              data: {
                widget_name: "weather",
                widget_size: "mini",
              },
            })
          );
        });

        // Stop observing since element has been seen
        this.setState({
          impressionSeen: true,
        });
      }
    }
  }

  onError(entries) {
    if (this.state) {
      const entry = entries.find(e => e.isIntersecting);

      if (entry) {
        if (this.errorElement) {
          this.observer.unobserve(this.errorElement);
        }

        batch(() => {
          // Old event (keep for backward compatibility)
          this.props.dispatch(
            ac.OnlyToMain({
              type: at.WEATHER_LOAD_ERROR,
            })
          );

          // New unified event
          this.props.dispatch(
            ac.OnlyToMain({
              type: at.WIDGETS_ERROR,
              data: {
                widget_name: "weather",
                widget_size: "mini",
                error_type: "load_error",
              },
            })
          );
        });

        // Stop observing since element has been seen
        this.setState({
          errorSeen: true,
        });
      }
    }
  }

  onProviderClick() {
    batch(() => {
      // Old event (keep for backward compatibility)
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WEATHER_OPEN_PROVIDER_URL,
          data: {
            source: "WEATHER",
          },
        })
      );

      // New unified event
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "widget",
            user_action: USER_ACTION_TYPES.PROVIDER_LINK_CLICK,
            widget_size: "mini",
          },
        })
      );
    });
  }

  handleChangeLocation = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    batch(() => {
      this.props.dispatch(
        ac.BroadcastToContent({
          type: at.WEATHER_SEARCH_ACTIVE,
          data: true,
        })
      );

      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "context_menu",
            user_action: USER_ACTION_TYPES.CHANGE_LOCATION,
            widget_size: "mini",
          },
        })
      );
    });
  };

  handleDetectLocation = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    batch(() => {
      // Old event (keep for backward compatibility)
      this.props.dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_USER_OPT_IN_LOCATION,
        })
      );

      // New unified event
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "context_menu",
            user_action: USER_ACTION_TYPES.DETECT_LOCATION,
            widget_size: "mini",
          },
        })
      );
    });
  };

  handleChangeTempUnit = value => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    batch(() => {
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "weather.temperatureUnits",
            value,
          },
        })
      );

      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "context_menu",
            user_action: USER_ACTION_TYPES.CHANGE_TEMP_UNIT,
            widget_size: "mini",
            action_value: value,
          },
        })
      );
    });
  };

  handleChangeDisplay = value => {
    const weatherForecastEnabled =
      this.props.Prefs.values["widgets.system.weatherForecast.enabled"];

    if (this.panelElement) {
      this.panelElement.hide();
    }
    batch(() => {
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "weather.display",
            value,
          },
        })
      );

      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "context_menu",
            user_action: USER_ACTION_TYPES.CHANGE_DISPLAY,
            widget_size: "mini",
            action_value: weatherForecastEnabled
              ? "switch_to_forecast_widget"
              : value,
          },
        })
      );
    });
  };

  handleHideWeather = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    batch(() => {
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "showWeather",
            value: false,
          },
        })
      );

      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_ENABLED,
          data: {
            widget_name: "weather",
            widget_source: "context_menu",
            enabled: false,
            widget_size: "mini",
          },
        })
      );
    });
  };

  handleLearnMore = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    batch(() => {
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.OPEN_LINK,
          data: {
            url: "https://support.mozilla.org/kb/customize-items-on-firefox-new-tab-page",
          },
        })
      );

      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "context_menu",
            user_action: USER_ACTION_TYPES.LEARN_MORE,
            widget_size: "mini",
          },
        })
      );
    });
  };

  onMenuButtonClick(e) {
    e.preventDefault();
    if (this.panelElement) {
      this.panelElement.toggle(e.currentTarget);
    }
  }

  onMenuButtonKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (this.panelElement) {
        this.panelElement.toggle(e.currentTarget);
      }
    } else if (e.key === "Escape") {
      if (this.panelElement) {
        this.panelElement.hide();
      }
    }
  }

  handleRejectOptIn = () => {
    batch(() => {
      this.props.dispatch(ac.SetPref("weather.optInAccepted", false));
      this.props.dispatch(ac.SetPref("weather.optInDisplayed", false));

      // Old event (keep for backward compatibility)
      this.props.dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_OPT_IN_PROMPT_SELECTION,
          data: "rejected opt-in",
        })
      );

      // New unified event
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "widget",
            user_action: USER_ACTION_TYPES.OPT_IN_ACCEPTED,
            widget_size: "mini",
            action_value: false,
          },
        })
      );
    });
  };

  handleAcceptOptIn = () => {
    batch(() => {
      // Old events (keep for backward compatibility)
      this.props.dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_USER_OPT_IN_LOCATION,
        })
      );

      this.props.dispatch(
        ac.AlsoToMain({
          type: at.WEATHER_OPT_IN_PROMPT_SELECTION,
          data: "accepted opt-in",
        })
      );

      // New unified event
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: {
            widget_name: "weather",
            widget_source: "widget",
            user_action: USER_ACTION_TYPES.OPT_IN_ACCEPTED,
            widget_size: "mini",
            action_value: true,
          },
        })
      );
    });
  };

  isEnabled() {
    const { values } = this.props.Prefs;
    const systemValue =
      values[PREF_SYSTEM_SHOW_WEATHER] && values["feeds.weatherfeed"];
    const experimentValue = values.trainhopConfig?.weather?.enabled;
    return systemValue || experimentValue;
  }

  render() {
    // Check if weather should be rendered
    if (!this.isEnabled()) {
      return false;
    }

    if (
      this.props.App.isForStartupCache.Weather ||
      !this.props.Weather.initialized
    ) {
      return <WeatherPlaceholder />;
    }

    const { props } = this;

    const { Prefs, Weather } = props;

    const WEATHER_SUGGESTION = Weather.suggestions?.[0];

    const nimbusWeatherDisplay = Prefs.values.trainhopConfig?.weather?.display;
    const showDetailedView =
      nimbusWeatherDisplay === "detailed" ||
      Prefs.values["weather.display"] === "detailed";

    const nimbusWeatherForecastTrainhopEnabled =
      Prefs.values.trainhopConfig?.widgets?.weatherForecastEnabled;

    const weatherForecastWidgetEnabled =
      nimbusWeatherForecastTrainhopEnabled ||
      Prefs.values["widgets.system.weatherForecast.enabled"];

    if (showDetailedView && weatherForecastWidgetEnabled) {
      return null;
    }

    const outerClassName = ["weather", Weather.searchActive && "search"]
      .filter(v => v)
      .join(" ");

    const weatherOptIn = Prefs.values["system.showWeatherOptIn"];
    const nimbusWeatherOptInEnabled =
      Prefs.values.trainhopConfig?.weather?.weatherOptInEnabled;
    // Bug 2009484: Controls button order in opt-in dialog for A/B testing.
    // When true, "Not now" gets slot="primary";
    // when false/undefined, "Yes" gets slot="primary".
    // Also note the primary button's position varies by platform:
    // on Windows, it appears on the left,
    // while on Linux and macOS, it appears on the right.
    const reverseOptInButtons =
      Prefs.values.trainhopConfig?.weather?.reverseOptInButtons;

    const optInDisplayed = Prefs.values["weather.optInDisplayed"];
    const optInUserChoice = Prefs.values["weather.optInAccepted"];
    const staticWeather = Prefs.values["weather.staticData.enabled"];

    // Conditionals for rendering feature based on prefs + nimbus experiment variables
    const isOptInEnabled = weatherOptIn || nimbusWeatherOptInEnabled;

    // Opt-in dialog should only show if:
    // - weather enabled on customization menu
    // - weather opt-in pref is enabled
    // - opt-in prompt is enabled
    // - user hasn't accepted the opt-in yet
    const shouldShowOptInDialog =
      isOptInEnabled && optInDisplayed && !optInUserChoice;

    // Show static weather data only if:
    // - weather is enabled on customization menu
    // - weather opt-in pref is enabled
    // - static weather data is enabled
    const showStaticData = isOptInEnabled && staticWeather;
    const showFullMenu = !showStaticData;
    const isLocationSearchEnabled =
      Prefs.values["weather.locationSearchEnabled"];
    const isFahrenheit = Prefs.values["weather.temperatureUnits"] === "f";
    const isSimpleDisplay = Prefs.values["weather.display"] === "simple";

    const contextMenu = (showFullContextMenu = true) => (
      <div className="weatherButtonContextMenuWrapper">
        {/* Bug 2013136 - Using a custom button instead of moz-button due to styling constraints.
            The moz-button component cannot be styled to match the existing design,
            so we use a standard button element that can be fully controlled with CSS. */}
        <button
          aria-haspopup="true"
          onKeyDown={this.onMenuButtonKeyDown}
          onClick={this.onMenuButtonClick}
          data-l10n-id="newtab-menu-section-tooltip"
          className="weatherButtonContextMenu"
        />
        <panel-list id="weather-context-menu" ref={this.setPanelRef}>
          {isLocationSearchEnabled && (
            <panel-item
              id="weather-menu-change-location"
              data-l10n-id="newtab-weather-menu-change-location"
              onClick={this.handleChangeLocation}
            />
          )}
          {isOptInEnabled && (
            <panel-item
              id="weather-menu-detect-location"
              data-l10n-id="newtab-weather-menu-detect-my-location"
              onClick={this.handleDetectLocation}
            />
          )}
          {showFullContextMenu &&
            (isFahrenheit ? (
              <panel-item
                id="weather-menu-temp-celsius"
                data-l10n-id="newtab-weather-menu-change-temperature-units-celsius"
                onClick={() => this.handleChangeTempUnit("c")}
              />
            ) : (
              <panel-item
                id="weather-menu-temp-fahrenheit"
                data-l10n-id="newtab-weather-menu-change-temperature-units-fahrenheit"
                onClick={() => this.handleChangeTempUnit("f")}
              />
            ))}
          {showFullContextMenu &&
            (isSimpleDisplay ? (
              <panel-item
                id="weather-menu-display-detailed"
                data-l10n-id="newtab-weather-menu-change-weather-display-detailed"
                onClick={() => this.handleChangeDisplay("detailed")}
              />
            ) : (
              <panel-item
                id="weather-menu-display-simple"
                data-l10n-id="newtab-weather-menu-change-weather-display-simple"
                onClick={() => this.handleChangeDisplay("simple")}
              />
            ))}
          <panel-item
            id="weather-menu-hide"
            data-l10n-id="newtab-weather-menu-hide-weather-v2"
            onClick={this.handleHideWeather}
          />
          <panel-item
            id="weather-menu-learn-more"
            data-l10n-id="newtab-weather-menu-learn-more"
            onClick={this.handleLearnMore}
          />
        </panel-list>
      </div>
    );

    if (Weather.searchActive) {
      return <LocationSearch outerClassName={outerClassName} />;
    } else if (WEATHER_SUGGESTION) {
      return (
        <div ref={this.setImpressionRef} className={outerClassName}>
          <div className="weatherCard">
            {showStaticData ? (
              <div className="weatherInfoLink staticWeatherInfo">
                <div className="weatherIconCol">
                  <span className="weatherIcon iconId3" />
                </div>
                <div className="weatherText">
                  <div className="weatherForecastRow">
                    <span className="weatherTemperature">
                      22&deg;{Prefs.values["weather.temperatureUnits"]}
                    </span>
                  </div>
                  <div className="weatherCityRow">
                    <span
                      className="weatherCity"
                      data-l10n-id="newtab-weather-static-city"
                    ></span>
                  </div>
                </div>
              </div>
            ) : (
              <a
                data-l10n-id="newtab-weather-see-forecast-description"
                data-l10n-args='{"provider": "AccuWeather®"}'
                data-l10n-attrs="aria-description"
                href={WEATHER_SUGGESTION.forecast.url}
                className="weatherInfoLink"
                onClick={this.onProviderClick}
              >
                <div className="weatherIconCol">
                  <span
                    className={`weatherIcon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`}
                  />
                </div>
                <div className="weatherText">
                  <div className="weatherForecastRow">
                    <span className="weatherTemperature">
                      {
                        WEATHER_SUGGESTION.current_conditions.temperature[
                          Prefs.values["weather.temperatureUnits"]
                        ]
                      }
                      &deg;{Prefs.values["weather.temperatureUnits"]}
                    </span>
                  </div>
                  <div className="weatherCityRow">
                    <span className="weatherCity">
                      {Weather.locationData.city}
                    </span>
                  </div>
                  {showDetailedView && !weatherForecastWidgetEnabled ? (
                    <div className="weatherDetailedSummaryRow">
                      <div className="weatherHighLowTemps">
                        <span>
                          {
                            WEATHER_SUGGESTION.forecast.high[
                              Prefs.values["weather.temperatureUnits"]
                            ]
                          }
                          &deg;
                          {Prefs.values["weather.temperatureUnits"]}
                        </span>
                        <span>&bull;</span>
                        <span>
                          {
                            WEATHER_SUGGESTION.forecast.low[
                              Prefs.values["weather.temperatureUnits"]
                            ]
                          }
                          &deg;
                          {Prefs.values["weather.temperatureUnits"]}
                        </span>
                      </div>
                      <span className="weatherTextSummary">
                        {WEATHER_SUGGESTION.current_conditions.summary}
                      </span>
                    </div>
                  ) : null}
                </div>
              </a>
            )}

            {contextMenu(showFullMenu)}
          </div>
          <span className="weatherSponsorText" aria-hidden="true">
            <span
              data-l10n-id="newtab-weather-sponsored"
              data-l10n-args='{"provider": "AccuWeather®"}'
            ></span>
          </span>

          {shouldShowOptInDialog && (
            <div className="weatherOptIn">
              <dialog open={true}>
                <span className="weatherOptInImg"></span>
                <div className="weatherOptInContent">
                  <h3 data-l10n-id="newtab-weather-opt-in-see-weather"></h3>
                  <moz-button-group className="button-group">
                    <moz-button
                      size="small"
                      type="default"
                      data-l10n-id="newtab-weather-opt-in-yes"
                      onClick={this.handleAcceptOptIn}
                      id="accept-opt-in"
                      slot={reverseOptInButtons ? "" : "primary"}
                    />
                    <moz-button
                      size="small"
                      type="default"
                      data-l10n-id="newtab-weather-opt-in-not-now"
                      onClick={this.handleRejectOptIn}
                      id="reject-opt-in"
                      slot={reverseOptInButtons ? "primary" : ""}
                    />
                  </moz-button-group>
                </div>
              </dialog>
            </div>
          )}
        </div>
      );
    }

    return (
      <div ref={this.setErrorRef} className={outerClassName}>
        <div className="weatherNotAvailable">
          <span className="icon icon-info-warning" />{" "}
          <p data-l10n-id="newtab-weather-error-not-available"></p>
          {/* We're passing false to only render applicable menu items during an error */}
          {contextMenu(false)}
        </div>
      </div>
    );
  }
}

export const Weather = connect(state => ({
  App: state.App,
  Weather: state.Weather,
  Prefs: state.Prefs,
  IntersectionObserver: globalThis.IntersectionObserver,
  document: globalThis.document,
}))(_Weather);
