/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { connect } from "react-redux";
import React, { useEffect } from "react";

// Pref Constants
const PREF_AD_SIZE_MEDIUM_RECTANGLE = "newtabAdSize.mediumRectangle";
const PREF_AD_SIZE_BILLBOARD = "newtabAdSize.billboard";
const PREF_AD_SIZE_LEADERBOARD = "newtabAdSize.leaderboard";
const PREF_SECTIONS_ENABLED = "discoverystream.sections.enabled";
const PREF_SPOC_PLACEMENTS = "discoverystream.placements.spocs";
const PREF_SPOC_COUNTS = "discoverystream.placements.spocs.counts";
const PREF_CONTEXTUAL_ADS_ENABLED =
  "discoverystream.sections.contextualAds.enabled";
const PREF_CONTEXTUAL_BANNER_PLACEMENTS =
  "discoverystream.placements.contextualBanners";
const PREF_CONTEXTUAL_BANNER_COUNTS =
  "discoverystream.placements.contextualBanners.counts";
const PREF_UNIFIED_ADS_ENABLED = "unifiedAds.spocs.enabled";
const PREF_UNIFIED_ADS_ENDPOINT = "unifiedAds.endpoint";
const PREF_ALLOWED_ENDPOINTS = "discoverystream.endpoints";
const PREF_OHTTP_CONFIG = "discoverystream.ohttp.configURL";
const PREF_OHTTP_RELAY = "discoverystream.ohttp.relayURL";

const Row = props => (
  <tr className="message-item" {...props}>
    {props.children}
  </tr>
);

function relativeTime(timestamp) {
  if (!timestamp) {
    return "";
  }
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (seconds < 2) {
    return "just now";
  } else if (seconds < 60) {
    return `${seconds} seconds ago`;
  } else if (minutes === 1) {
    return "1 minute ago";
  } else if (minutes < 600) {
    return `${minutes} minutes ago`;
  }
  return new Date(timestamp).toLocaleString();
}

export class ToggleStoryButton extends React.PureComponent {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.props.onClick(this.props.story);
  }

  render() {
    return <button onClick={this.handleClick}>collapse/open</button>;
  }
}

export class TogglePrefCheckbox extends React.PureComponent {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }

  onChange(event) {
    this.props.onChange(this.props.pref, event.target.checked);
  }

  render() {
    return (
      <>
        <input
          type="checkbox"
          checked={this.props.checked}
          onChange={this.onChange}
          disabled={this.props.disabled}
        />{" "}
        {this.props.pref}{" "}
      </>
    );
  }
}

export class DiscoveryStreamAdminUI extends React.PureComponent {
  constructor(props) {
    super(props);
    this.restorePrefDefaults = this.restorePrefDefaults.bind(this);
    this.setConfigValue = this.setConfigValue.bind(this);
    this.expireCache = this.expireCache.bind(this);
    this.refreshCache = this.refreshCache.bind(this);
    this.showPlaceholder = this.showPlaceholder.bind(this);
    this.idleDaily = this.idleDaily.bind(this);
    this.systemTick = this.systemTick.bind(this);
    this.syncRemoteSettings = this.syncRemoteSettings.bind(this);
    this.onStoryToggle = this.onStoryToggle.bind(this);
    this.handleWeatherSubmit = this.handleWeatherSubmit.bind(this);
    this.handleWeatherUpdate = this.handleWeatherUpdate.bind(this);
    this.resetBlocks = this.resetBlocks.bind(this);
    this.refreshInferredPersonalization =
      this.refreshInferredPersonalization.bind(this);
    this.refreshTopicSelectionCache =
      this.refreshTopicSelectionCache.bind(this);
    this.handleSectionsToggle = this.handleSectionsToggle.bind(this);
    this.toggleIABBanners = this.toggleIABBanners.bind(this);
    this.handleAllizomToggle = this.handleAllizomToggle.bind(this);
    this.sendConversionEvent = this.sendConversionEvent.bind(this);
    this.state = {
      toggledStories: {},
      weatherQuery: "",
    };
  }

  setConfigValue(configName, configValue) {
    this.props.dispatch(
      ac.OnlyToMain({
        type: at.DISCOVERY_STREAM_CONFIG_SET_VALUE,
        data: { name: configName, value: configValue },
      })
    );
  }

  restorePrefDefaults() {
    this.props.dispatch(
      ac.OnlyToMain({
        type: at.DISCOVERY_STREAM_CONFIG_RESET_DEFAULTS,
      })
    );
  }

  refreshCache() {
    const { config } = this.props.state.DiscoveryStream;
    this.props.dispatch(
      ac.OnlyToMain({
        type: at.DISCOVERY_STREAM_CONFIG_CHANGE,
        data: config,
      })
    );
  }

  refreshInferredPersonalization() {
    this.props.dispatch(
      ac.OnlyToMain({
        type: at.INFERRED_PERSONALIZATION_REFRESH,
      })
    );
  }

  refreshTopicSelectionCache() {
    this.props.dispatch(
      ac.SetPref("discoverystream.topicSelection.onboarding.displayCount", 0)
    );
    this.props.dispatch(
      ac.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", true)
    );
  }

  dispatchSimpleAction(type) {
    this.props.dispatch(
      ac.OnlyToMain({
        type,
      })
    );
  }

  resetBlocks() {
    this.props.dispatch(
      ac.OnlyToMain({
        type: at.DISCOVERY_STREAM_DEV_BLOCKS_RESET,
      })
    );
  }

  systemTick() {
    this.dispatchSimpleAction(at.DISCOVERY_STREAM_DEV_SYSTEM_TICK);
  }

  expireCache() {
    this.dispatchSimpleAction(at.DISCOVERY_STREAM_DEV_EXPIRE_CACHE);
  }

  showPlaceholder() {
    this.dispatchSimpleAction(at.DISCOVERY_STREAM_DEV_SHOW_PLACEHOLDER);
  }

  idleDaily() {
    this.dispatchSimpleAction(at.DISCOVERY_STREAM_DEV_IDLE_DAILY);
  }

  syncRemoteSettings() {
    this.dispatchSimpleAction(at.DISCOVERY_STREAM_DEV_SYNC_RS);
  }

  handleWeatherUpdate(e) {
    this.setState({ weatherQuery: e.target.value || "" });
  }

  handleWeatherSubmit(e) {
    e.preventDefault();
    const { weatherQuery } = this.state;
    this.props.dispatch(ac.SetPref("weather.query", weatherQuery));
  }

  toggleIABBanners(e) {
    const { pressed, id } = e.target;

    // Set the active pref to true/false
    switch (id) {
      case "newtab_billboard":
        // Update boolean pref for billboard ad size
        this.props.dispatch(ac.SetPref(PREF_AD_SIZE_BILLBOARD, pressed));

        break;
      case "newtab_leaderboard":
        // Update boolean pref for billboard ad size
        this.props.dispatch(ac.SetPref(PREF_AD_SIZE_LEADERBOARD, pressed));

        break;
      case "newtab_rectangle":
        // Update boolean pref for mediumRectangle (MREC) ad size
        this.props.dispatch(ac.SetPref(PREF_AD_SIZE_MEDIUM_RECTANGLE, pressed));

        break;
    }

    // Note: The counts array is passively updated whenever the placements array is updated.
    // The default pref values for each are:
    // PREF_SPOC_PLACEMENTS: "newtab_spocs"
    // PREF_SPOC_COUNTS: "6"
    const generateSpocPrefValues = () => {
      const placements =
        this.props.otherPrefs[PREF_SPOC_PLACEMENTS]?.split(",")
          .map(item => item.trim())
          .filter(item => item) || [];

      const counts =
        this.props.otherPrefs[PREF_SPOC_COUNTS]?.split(",")
          .map(item => item.trim())
          .filter(item => item) || [];

      // Confirm that the IAB type will have a count value of "1"
      const supportIABAdTypes = [
        "newtab_leaderboard",
        "newtab_rectangle",
        "newtab_billboard",
      ];
      let countValue;
      if (supportIABAdTypes.includes(id)) {
        countValue = "1"; // Default count value for all IAB ad types
      } else {
        throw new Error("IAB ad type not supported");
      }

      if (pressed) {
        // If pressed is true, add the id to the placements array
        if (!placements.includes(id)) {
          placements.push(id);
          counts.push(countValue);
        }
      } else {
        // If pressed is false, remove the id from the placements array
        const index = placements.indexOf(id);
        if (index !== -1) {
          placements.splice(index, 1);
          counts.splice(index, 1);
        }
      }

      return {
        placements: placements.join(", "),
        counts: counts.join(", "),
      };
    };

    const { placements, counts } = generateSpocPrefValues();

    // Update prefs with new values
    this.props.dispatch(ac.SetPref(PREF_SPOC_PLACEMENTS, placements));
    this.props.dispatch(ac.SetPref(PREF_SPOC_COUNTS, counts));

    // If contextual ads, sections, and one of the banners are enabled
    // update the contextualBanner prefs to include the banner value and count
    // Else, clear the prefs
    if (PREF_CONTEXTUAL_ADS_ENABLED && PREF_SECTIONS_ENABLED) {
      if (PREF_AD_SIZE_BILLBOARD && placements.includes("newtab_billboard")) {
        this.props.dispatch(
          ac.SetPref(PREF_CONTEXTUAL_BANNER_PLACEMENTS, "newtab_billboard")
        );
        this.props.dispatch(ac.SetPref(PREF_CONTEXTUAL_BANNER_COUNTS, "1"));
      } else if (
        PREF_AD_SIZE_LEADERBOARD &&
        placements.includes("newtab_leaderboard")
      ) {
        this.props.dispatch(
          ac.SetPref(PREF_CONTEXTUAL_BANNER_PLACEMENTS, "newtab_leaderboard")
        );
        this.props.dispatch(ac.SetPref(PREF_CONTEXTUAL_BANNER_COUNTS, "1"));
      } else {
        this.props.dispatch(ac.SetPref(PREF_CONTEXTUAL_BANNER_PLACEMENTS, ""));
        this.props.dispatch(ac.SetPref(PREF_CONTEXTUAL_BANNER_COUNTS, ""));
      }
    }
  }

  handleSectionsToggle(e) {
    const { pressed } = e.target;
    this.props.dispatch(ac.SetPref(PREF_SECTIONS_ENABLED, pressed));
    this.props.dispatch(
      ac.SetPref("discoverystream.sections.cards.enabled", pressed)
    );
  }

  sendConversionEvent() {
    const detail = {
      partnerId: "295BEEF7-1E3B-4128-B8F8-858E12AA660B",
      lookbackDays: 7,
      impressionType: "default",
    };
    const event = new CustomEvent("FirefoxConversionNotification", {
      detail,
      bubbles: true,
      composed: true,
    });
    window?.dispatchEvent(event);
  }

  renderComponent(width, component) {
    return (
      <table>
        <tbody>
          <Row>
            <td className="min">Type</td>
            <td>{component.type}</td>
          </Row>
          <Row>
            <td className="min">Width</td>
            <td>{width}</td>
          </Row>
          {component.feed && this.renderFeed(component.feed)}
        </tbody>
      </table>
    );
  }

  renderWeatherData() {
    const { suggestions } = this.props.state.Weather;
    let weatherTable;
    if (suggestions) {
      weatherTable = (
        <div className="weather-section">
          <form onSubmit={this.handleWeatherSubmit}>
            <label htmlFor="weather-query">Weather query</label>
            <input
              type="text"
              min="3"
              max="10"
              id="weather-query"
              onChange={this.handleWeatherUpdate}
              value={this.weatherQuery}
            />
            <button type="submit">Submit</button>
          </form>
          <table>
            <tbody>
              {suggestions.map(suggestion => (
                <tr className="message-item" key={suggestion.city_name}>
                  <td className="message-id">
                    <span>
                      {suggestion.city_name} <br />
                    </span>
                  </td>
                  <td className="message-summary">
                    <pre>{JSON.stringify(suggestion, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return weatherTable;
  }

  renderPersonalizationData() {
    const {
      inferredInterests,
      coarseInferredInterests,
      coarsePrivateInferredInterests,
    } = this.props.state.InferredPersonalization;
    return (
      <div>
        {" "}
        Inferred Interests:
        <pre>{JSON.stringify(inferredInterests, null, 2)}</pre> Coarse Inferred
        Interests:
        <pre>{JSON.stringify(coarseInferredInterests, null, 2)}</pre> Coarse
        Inferred Interests With Differential Privacy:
        <pre>{JSON.stringify(coarsePrivateInferredInterests, null, 2)}</pre>
      </div>
    );
  }

  renderFeedData(url) {
    const { feeds } = this.props.state.DiscoveryStream;
    const feed = feeds.data[url].data;
    return (
      <React.Fragment>
        <h4>Feed url: {url}</h4>
        <table>
          <tbody>
            {feed.recommendations?.map(story => this.renderStoryData(story))}
          </tbody>
        </table>
      </React.Fragment>
    );
  }

  renderFeedsData() {
    const { feeds } = this.props.state.DiscoveryStream;
    return (
      <React.Fragment>
        {Object.keys(feeds.data).map(url => this.renderFeedData(url))}
      </React.Fragment>
    );
  }

  renderImpressionsData() {
    const { impressions } = this.props.state.DiscoveryStream;
    return (
      <>
        <h4>Feed Impressions</h4>
        <table>
          <tbody>
            {Object.keys(impressions.feed).map(key => {
              return (
                <Row key={key}>
                  <td className="min">{key}</td>
                  <td>{relativeTime(impressions.feed[key]) || "(no data)"}</td>
                </Row>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }

  renderBlocksData() {
    const { blocks } = this.props.state.DiscoveryStream;
    return (
      <>
        <h4>Blocks</h4>
        <button className="button" onClick={this.resetBlocks}>
          Reset Blocks
        </button>{" "}
        <table>
          <tbody>
            {Object.keys(blocks).map(key => {
              return (
                <Row key={key}>
                  <td className="min">{key}</td>
                </Row>
              );
            })}
          </tbody>
        </table>
      </>
    );
  }

  handleAllizomToggle(e) {
    const prefs = this.props.otherPrefs;
    const unifiedAdsSpocsEnabled = prefs[PREF_UNIFIED_ADS_ENABLED];
    if (!unifiedAdsSpocsEnabled) {
      return;
    }
    const { pressed } = e.target;
    const { dispatch } = this.props;
    const allowedEndpoints = prefs[PREF_ALLOWED_ENDPOINTS];
    const setPref = (pref = "", value = "") => {
      dispatch(ac.SetPref(pref, value));
    };
    const clearPref = (pref = "") => {
      dispatch(
        ac.OnlyToMain({
          type: at.CLEAR_PREF,
          data: {
            name: pref,
          },
        })
      );
    };
    if (pressed) {
      setPref(PREF_UNIFIED_ADS_ENDPOINT, "https://ads.allizom.org/");
      setPref(
        PREF_ALLOWED_ENDPOINTS,
        `${allowedEndpoints},https://ads.allizom.org/`
      );
      setPref(
        PREF_OHTTP_CONFIG,
        "https://stage.ohttp-gateway.nonprod.webservices.mozgcp.net/ohttp-configs"
      );
      setPref(
        PREF_OHTTP_RELAY,
        "https://mozilla-ohttp-relay-test.edgecompute.app/"
      );
    } else {
      clearPref(PREF_UNIFIED_ADS_ENDPOINT);
      clearPref(PREF_ALLOWED_ENDPOINTS);
      clearPref(PREF_OHTTP_CONFIG);
      clearPref(PREF_OHTTP_RELAY);
    }
  }

  renderSpocs() {
    const { spocs } = this.props.state.DiscoveryStream;

    const unifiedAdsSpocsEnabled =
      this.props.otherPrefs[PREF_UNIFIED_ADS_ENABLED];

    // Determine which mechanism is querying the UAPI ads server
    const PREF_UNIFIED_ADS_ADSFEED_ENABLED = "unifiedAds.adsFeed.enabled";
    const adsFeedEnabled =
      this.props.otherPrefs[PREF_UNIFIED_ADS_ADSFEED_ENABLED];

    const unifiedAdsEndpoint = this.props.otherPrefs[PREF_UNIFIED_ADS_ENDPOINT];
    const spocsEndpoint = unifiedAdsSpocsEnabled
      ? unifiedAdsEndpoint
      : spocs.spocs_endpoint;

    let spocsData = [];
    let allizomEnabled = spocsEndpoint?.includes("allizom");

    if (
      spocs.data &&
      spocs.data.newtab_spocs &&
      spocs.data.newtab_spocs.items
    ) {
      spocsData = spocs.data.newtab_spocs.items || [];
    }

    return (
      <React.Fragment>
        <table>
          <tbody>
            <Row>
              <td colSpan="2">
                <moz-toggle
                  id="sections-toggle"
                  disabled={!unifiedAdsSpocsEnabled || null}
                  pressed={allizomEnabled || null}
                  onToggle={this.handleAllizomToggle}
                  label="Toggle allizom"
                />
              </td>
            </Row>
            <Row>
              <td className="min">adsfeed enabled</td>
              <td>{adsFeedEnabled ? "true" : "false"}</td>
            </Row>
            <Row>
              <td className="min">spocs endpoint</td>
              <td>{spocsEndpoint}</td>
            </Row>
            <Row>
              <td className="min">Data last fetched</td>
              <td>{relativeTime(spocs.lastUpdated)}</td>
            </Row>
          </tbody>
        </table>
        <h4>Spoc data</h4>
        <table>
          <tbody>{spocsData.map(spoc => this.renderStoryData(spoc))}</tbody>
        </table>
        <h4>Spoc frequency caps</h4>
        <table>
          <tbody>
            {spocs.frequency_caps.map(spoc => this.renderStoryData(spoc))}
          </tbody>
        </table>
      </React.Fragment>
    );
  }

  onStoryToggle(story) {
    const { toggledStories } = this.state;
    this.setState({
      toggledStories: {
        ...toggledStories,
        [story.id]: !toggledStories[story.id],
      },
    });
  }

  renderStoryData(story) {
    let storyData = "";
    if (this.state.toggledStories[story.id]) {
      storyData = JSON.stringify(story, null, 2);
    }
    return (
      <tr className="message-item" key={story.id}>
        <td className="message-id">
          <span>
            {story.id} <br />
          </span>
          <ToggleStoryButton story={story} onClick={this.onStoryToggle} />
        </td>
        <td className="message-summary">
          <pre>{storyData}</pre>
        </td>
      </tr>
    );
  }

  renderFeed(feed) {
    const { feeds } = this.props.state.DiscoveryStream;
    if (!feed.url) {
      return null;
    }
    return (
      <React.Fragment>
        <Row>
          <td className="min">Feed url</td>
          <td>{feed.url}</td>
        </Row>
        <Row>
          <td className="min">Data last fetched</td>
          <td>
            {relativeTime(
              feeds.data[feed.url] ? feeds.data[feed.url].lastUpdated : null
            ) || "(no data)"}
          </td>
        </Row>
      </React.Fragment>
    );
  }

  render() {
    const prefToggles = "enabled collapsible".split(" ");
    const { config, layout } = this.props.state.DiscoveryStream;
    const sectionsEnabled = this.props.otherPrefs[PREF_SECTIONS_ENABLED];

    // Prefs for IAB Banners
    const mediumRectangleEnabled =
      this.props.otherPrefs[PREF_AD_SIZE_MEDIUM_RECTANGLE];
    const billboardsEnabled = this.props.otherPrefs[PREF_AD_SIZE_BILLBOARD];
    const leaderboardEnabled = this.props.otherPrefs[PREF_AD_SIZE_LEADERBOARD];
    const spocPlacements = this.props.otherPrefs[PREF_SPOC_PLACEMENTS];
    const mediumRectangleEnabledPressed =
      mediumRectangleEnabled && spocPlacements.includes("newtab_rectangle");
    const billboardPressed =
      billboardsEnabled && spocPlacements.includes("newtab_billboard");
    const leaderboardPressed =
      leaderboardEnabled && spocPlacements.includes("newtab_leaderboard");

    return (
      <div>
        <button className="button" onClick={this.restorePrefDefaults}>
          Restore Pref Defaults
        </button>{" "}
        <button className="button" onClick={this.refreshCache}>
          Refresh Cache
        </button>
        <br />
        <button className="button" onClick={this.expireCache}>
          Expire Cache
        </button>{" "}
        <button className="button" onClick={this.systemTick}>
          Trigger System Tick
        </button>{" "}
        <button className="button" onClick={this.idleDaily}>
          Trigger Idle Daily
        </button>
        <br />
        <button
          className="button"
          onClick={this.refreshInferredPersonalization}
        >
          Refresh Inferred Personalization
        </button>
        <br />
        <button className="button" onClick={this.syncRemoteSettings}>
          Sync Remote Settings
        </button>{" "}
        <button className="button" onClick={this.refreshTopicSelectionCache}>
          Refresh Topic selection count
        </button>
        <br />
        <button className="button" onClick={this.showPlaceholder}>
          Show Placeholder Cards
        </button>{" "}
        <div className="toggle-wrapper">
          <moz-toggle
            id="sections-toggle"
            pressed={sectionsEnabled || null}
            onToggle={this.handleSectionsToggle}
            label="Toggle DS Sections"
          />
        </div>
        {/* Collapsible Sections for experiments for easy on/off */}
        <details className="details-section">
          <summary>IAB Banner Ad Sizes</summary>
          <div className="toggle-wrapper">
            <moz-toggle
              id="newtab_leaderboard"
              pressed={leaderboardPressed || null}
              onToggle={this.toggleIABBanners}
              label="Enable IAB Leaderboard"
            />
          </div>
          <div className="toggle-wrapper">
            <moz-toggle
              id="newtab_billboard"
              pressed={billboardPressed || null}
              onToggle={this.toggleIABBanners}
              label="Enable IAB Billboard"
            />
          </div>
          <div className="toggle-wrapper">
            <moz-toggle
              id="newtab_rectangle"
              pressed={mediumRectangleEnabledPressed || null}
              onToggle={this.toggleIABBanners}
              label="Enable IAB Medium Rectangle (MREC)"
            />
          </div>
        </details>
        <button className="button" onClick={this.sendConversionEvent}>
          Send conversion event
        </button>
        <table>
          <tbody>
            {prefToggles.map(pref => (
              <Row key={pref}>
                <td>
                  <TogglePrefCheckbox
                    checked={config[pref]}
                    pref={pref}
                    onChange={this.setConfigValue}
                  />
                </td>
              </Row>
            ))}
          </tbody>
        </table>
        <h3>Layout</h3>
        {layout.map((row, rowIndex) => (
          <div key={`row-${rowIndex}`}>
            {row.components.map((component, componentIndex) => (
              <div key={`component-${componentIndex}`} className="ds-component">
                {this.renderComponent(row.width, component)}
              </div>
            ))}
          </div>
        ))}
        <h3>Spocs</h3>
        {this.renderSpocs()}
        <h3>Feeds Data</h3>
        <div className="large-data-container">{this.renderFeedsData()}</div>
        <h3>Impressions Data</h3>
        <div className="large-data-container">
          {this.renderImpressionsData()}
        </div>
        <h3>Blocked Data</h3>
        <div className="large-data-container">{this.renderBlocksData()}</div>
        <h3>Weather Data</h3>
        {this.renderWeatherData()}
        <h3>Personalization Data</h3>
        {this.renderPersonalizationData()}
      </div>
    );
  }
}

export class DiscoveryStreamAdminInner extends React.PureComponent {
  constructor(props) {
    super(props);
    this.setState = this.setState.bind(this);
  }

  render() {
    return (
      <div
        className={`discoverystream-admin ${
          this.props.collapsed ? "collapsed" : "expanded"
        }`}
      >
        <main className="main-panel">
          <h1>Discovery Stream Admin</h1>

          <p className="helpLink">
            <span className="icon icon-small-spacer icon-info" />{" "}
            <span>
              Need to access the ASRouter Admin dev tools?{" "}
              <a target="blank" href="about:asrouter">
                Click here
              </a>
            </span>
          </p>

          <React.Fragment>
            <DiscoveryStreamAdminUI
              state={{
                DiscoveryStream: this.props.DiscoveryStream,
                Weather: this.props.Weather,
                InferredPersonalization: this.props.InferredPersonalization,
              }}
              otherPrefs={this.props.Prefs.values}
              dispatch={this.props.dispatch}
            />
          </React.Fragment>
        </main>
      </div>
    );
  }
}

export function CollapseToggle(props) {
  const { devtoolsCollapsed } = props;
  const label = `${devtoolsCollapsed ? "Expand" : "Collapse"} devtools`;

  useEffect(() => {
    // Set or remove body class depending on devtoolsCollapsed state
    if (devtoolsCollapsed) {
      globalThis.document.body.classList.remove("no-scroll");
    } else {
      globalThis.document.body.classList.add("no-scroll");
    }

    // Cleanup on unmount
    return () => {
      globalThis.document.body.classList.remove("no-scroll");
    };
  }, [devtoolsCollapsed]);

  return (
    <>
      <a
        href={devtoolsCollapsed ? "#devtools" : "#"}
        title={label}
        aria-label={label}
        className={`discoverystream-admin-toggle ${
          devtoolsCollapsed ? "expanded" : "collapsed"
        }`}
      >
        <span className="icon icon-devtools" />
      </a>
      {!devtoolsCollapsed ? (
        <DiscoveryStreamAdminInner {...props} collapsed={devtoolsCollapsed} />
      ) : null}
    </>
  );
}

const _DiscoveryStreamAdmin = props => <CollapseToggle {...props} />;

export const DiscoveryStreamAdmin = connect(state => ({
  Sections: state.Sections,
  DiscoveryStream: state.DiscoveryStream,
  InferredPersonalization: state.InferredPersonalization,
  Prefs: state.Prefs,
  Weather: state.Weather,
}))(_DiscoveryStreamAdmin);
