/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { DiscoveryStreamAdmin } from "content-src/components/DiscoveryStreamAdmin/DiscoveryStreamAdmin";
import { ConfirmDialog } from "content-src/components/ConfirmDialog/ConfirmDialog";
import { connect } from "react-redux";
import { DiscoveryStreamBase } from "content-src/components/DiscoveryStreamBase/DiscoveryStreamBase";
import { ErrorBoundary } from "content-src/components/ErrorBoundary/ErrorBoundary";
import { CustomizeMenu } from "content-src/components/CustomizeMenu/CustomizeMenu";
import React from "react";
import { Search } from "content-src/components/Search/Search";
import { Sections } from "content-src/components/Sections/Sections";

const VISIBLE = "visible";
const VISIBILITY_CHANGE_EVENT = "visibilitychange";

export const PrefsButton = ({ onClick, icon }) => (
  <div className="prefs-button">
    <button
      className={`icon ${icon || "icon-settings"}`}
      onClick={onClick}
      data-l10n-id="newtab-settings-button"
    />
  </div>
);

// Returns a function will not be continuously triggered when called. The
// function will be triggered if called again after `wait` milliseconds.
function debounce(func, wait) {
  let timer;
  return (...args) => {
    if (timer) {
      return;
    }

    let wakeUp = () => {
      timer = null;
    };

    timer = setTimeout(wakeUp, wait);
    func.apply(this, args);
  };
}

export class _Base extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      message: {},
    };
    this.notifyContent = this.notifyContent.bind(this);
  }

  notifyContent(state) {
    this.setState(state);
  }

  componentWillUnmount() {
    this.updateTheme();
  }

  componentWillUpdate() {
    this.updateTheme();
  }

  updateTheme() {
    const bodyClassName = [
      "activity-stream",
      // If we skipped the about:welcome overlay and removed the CSS classes
      // we don't want to add them back to the Activity Stream view
      document.body.classList.contains("inline-onboarding")
        ? "inline-onboarding"
        : "",
    ]
      .filter(v => v)
      .join(" ");
    globalThis.document.body.className = bodyClassName;
  }

  render() {
    const { props } = this;
    const { App } = props;
    const isDevtoolsEnabled = props.Prefs.values["asrouter.devtoolsEnabled"];

    if (!App.initialized) {
      return null;
    }

    return (
      <ErrorBoundary className="base-content-fallback">
        <React.Fragment>
          <BaseContent {...this.props} adminContent={this.state} />
          {isDevtoolsEnabled ? (
            <DiscoveryStreamAdmin notifyContent={this.notifyContent} />
          ) : null}
        </React.Fragment>
      </ErrorBoundary>
    );
  }
}

export class BaseContent extends React.PureComponent {
  constructor(props) {
    super(props);
    this.openPreferences = this.openPreferences.bind(this);
    this.openCustomizationMenu = this.openCustomizationMenu.bind(this);
    this.closeCustomizationMenu = this.closeCustomizationMenu.bind(this);
    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
    this.onWindowScroll = debounce(this.onWindowScroll.bind(this), 5);
    this.setPref = this.setPref.bind(this);
    this.updateWallpaper = this.updateWallpaper.bind(this);
    this.prefersDarkQuery = null;
    this.handleColorModeChange = this.handleColorModeChange.bind(this);
    this.state = {
      fixedSearch: false,
      firstVisibleTimestamp: null,
      colorMode: "",
    };
  }

  setFirstVisibleTimestamp() {
    if (!this.state.firstVisibleTimestamp) {
      this.setState({
        firstVisibleTimestamp: Date.now(),
      });
    }
  }

  componentDidMount() {
    global.addEventListener("scroll", this.onWindowScroll);
    global.addEventListener("keydown", this.handleOnKeyDown);
    if (this.props.document.visibilityState === VISIBLE) {
      this.setFirstVisibleTimestamp();
    } else {
      this._onVisibilityChange = () => {
        if (this.props.document.visibilityState === VISIBLE) {
          this.setFirstVisibleTimestamp();
          this.props.document.removeEventListener(
            VISIBILITY_CHANGE_EVENT,
            this._onVisibilityChange
          );
          this._onVisibilityChange = null;
        }
      };
      this.props.document.addEventListener(
        VISIBILITY_CHANGE_EVENT,
        this._onVisibilityChange
      );
    }
    // track change event to dark/light mode
    this.prefersDarkQuery = globalThis.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    this.prefersDarkQuery.addEventListener(
      "change",
      this.handleColorModeChange
    );
    this.handleColorModeChange();
  }

  handleColorModeChange() {
    const colorMode = this.prefersDarkQuery?.matches ? "dark" : "light";
    this.setState({ colorMode });
  }

  componentWillUnmount() {
    this.prefersDarkQuery?.removeEventListener(
      "change",
      this.handleColorModeChange
    );
    global.removeEventListener("scroll", this.onWindowScroll);
    global.removeEventListener("keydown", this.handleOnKeyDown);
    if (this._onVisibilityChange) {
      this.props.document.removeEventListener(
        VISIBILITY_CHANGE_EVENT,
        this._onVisibilityChange
      );
    }
  }

  onWindowScroll() {
    const prefs = this.props.Prefs.values;
    const SCROLL_THRESHOLD = prefs["logowordmark.alwaysVisible"] ? 179 : 34;
    if (global.scrollY > SCROLL_THRESHOLD && !this.state.fixedSearch) {
      this.setState({ fixedSearch: true });
    } else if (global.scrollY <= SCROLL_THRESHOLD && this.state.fixedSearch) {
      this.setState({ fixedSearch: false });
    }
  }

  openPreferences() {
    this.props.dispatch(ac.OnlyToMain({ type: at.SETTINGS_OPEN }));
    this.props.dispatch(ac.UserEvent({ event: "OPEN_NEWTAB_PREFS" }));
  }

  openCustomizationMenu() {
    this.props.dispatch({ type: at.SHOW_PERSONALIZE });
    this.props.dispatch(ac.UserEvent({ event: "SHOW_PERSONALIZE" }));
  }

  closeCustomizationMenu() {
    if (this.props.App.customizeMenuVisible) {
      this.props.dispatch({ type: at.HIDE_PERSONALIZE });
      this.props.dispatch(ac.UserEvent({ event: "HIDE_PERSONALIZE" }));
    }
  }

  handleOnKeyDown(e) {
    if (e.key === "Escape") {
      this.closeCustomizationMenu();
    }
  }

  setPref(pref, value) {
    this.props.dispatch(ac.SetPref(pref, value));
  }

  renderWallpaperAttribution() {
    const { wallpaperList } = this.props.Wallpapers;
    const activeWallpaper =
      this.props.Prefs.values[
        `newtabWallpapers.wallpaper-${this.state.colorMode}`
      ];
    const selected = wallpaperList.find(wp => wp.title === activeWallpaper);
    // make sure a wallpaper is selected and that the attribution also exists
    if (!selected?.attribution) {
      return null;
    }

    const { name, webpage } = selected.attribution;
    if (activeWallpaper && wallpaperList && name.url) {
      return (
        <p
          className={`wallpaper-attribution`}
          key={name}
          data-l10n-id="newtab-wallpaper-attribution"
          data-l10n-args={JSON.stringify({
            author_string: name.string,
            author_url: name.url,
            webpage_string: webpage.string,
            webpage_url: webpage.url,
          })}
        >
          <a data-l10n-name="name-link" href={name.url}>
            {name.string}
          </a>
          <a data-l10n-name="webpage-link" href={webpage.url}>
            {webpage.string}
          </a>
        </p>
      );
    }
    return null;
  }

  async updateWallpaper() {
    const prefs = this.props.Prefs.values;
    const { wallpaperList } = this.props.Wallpapers;

    if (wallpaperList) {
      const lightWallpaper =
        wallpaperList.find(
          wp => wp.title === prefs["newtabWallpapers.wallpaper-light"]
        ) || "";
      const darkWallpaper =
        wallpaperList.find(
          wp => wp.title === prefs["newtabWallpapers.wallpaper-dark"]
        ) || "";
      global.document?.body.style.setProperty(
        `--newtab-wallpaper-light`,
        `url(${lightWallpaper?.wallpaperUrl || ""})`
      );

      global.document?.body.style.setProperty(
        `--newtab-wallpaper-dark`,
        `url(${darkWallpaper?.wallpaperUrl || ""})`
      );
    }
  }

  render() {
    const { props } = this;
    const { App } = props;
    const { initialized, customizeMenuVisible } = App;
    const prefs = props.Prefs.values;

    const activeWallpaper =
      prefs[`newtabWallpapers.wallpaper-${this.state.colorMode}`];
    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];

    const { pocketConfig } = prefs;

    const isDiscoveryStream =
      props.DiscoveryStream.config && props.DiscoveryStream.config.enabled;
    let filteredSections = props.Sections.filter(
      section => section.id !== "topstories"
    );

    let spocMessageVariant = "";
    if (
      props.App.locale?.startsWith("en-") &&
      pocketConfig?.spocMessageVariant === "variant-c"
    ) {
      spocMessageVariant = pocketConfig.spocMessageVariant;
    }

    const pocketEnabled =
      prefs["feeds.section.topstories"] && prefs["feeds.system.topstories"];
    const noSectionsEnabled =
      !prefs["feeds.topsites"] &&
      !pocketEnabled &&
      filteredSections.filter(section => section.enabled).length === 0;
    const searchHandoffEnabled = prefs["improvesearch.handoffToAwesomebar"];
    const enabledSections = {
      topSitesEnabled: prefs["feeds.topsites"],
      pocketEnabled: prefs["feeds.section.topstories"],
      highlightsEnabled: prefs["feeds.section.highlights"],
      showSponsoredTopSitesEnabled: prefs.showSponsoredTopSites,
      showSponsoredPocketEnabled: prefs.showSponsored,
      showRecentSavesEnabled: prefs.showRecentSaves,
      topSitesRowsCount: prefs.topSitesRows,
    };

    const pocketRegion = prefs["feeds.system.topstories"];
    const mayHaveSponsoredStories = prefs["system.showSponsored"];
    const { mayHaveSponsoredTopSites } = prefs;

    const outerClassName = [
      "outer-wrapper",
      isDiscoveryStream && pocketEnabled && "ds-outer-wrapper-search-alignment",
      isDiscoveryStream && "ds-outer-wrapper-breakpoint-override",
      prefs.showSearch &&
        this.state.fixedSearch &&
        !noSectionsEnabled &&
        "fixed-search",
      prefs.showSearch && noSectionsEnabled && "only-search",
      prefs["logowordmark.alwaysVisible"] && "visible-logo",
    ]
      .filter(v => v)
      .join(" ");
    if (wallpapersEnabled) {
      this.updateWallpaper();
    }

    return (
      <div>
        <CustomizeMenu
          onClose={this.closeCustomizationMenu}
          onOpen={this.openCustomizationMenu}
          openPreferences={this.openPreferences}
          setPref={this.setPref}
          enabledSections={enabledSections}
          wallpapersEnabled={wallpapersEnabled}
          activeWallpaper={activeWallpaper}
          pocketRegion={pocketRegion}
          mayHaveSponsoredTopSites={mayHaveSponsoredTopSites}
          mayHaveSponsoredStories={mayHaveSponsoredStories}
          spocMessageVariant={spocMessageVariant}
          showing={customizeMenuVisible}
        />
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions*/}
        <div className={outerClassName} onClick={this.closeCustomizationMenu}>
          <main>
            {prefs.showSearch && (
              <div className="non-collapsible-section">
                <ErrorBoundary>
                  <Search
                    showLogo={
                      noSectionsEnabled || prefs["logowordmark.alwaysVisible"]
                    }
                    handoffEnabled={searchHandoffEnabled}
                    {...props.Search}
                  />
                </ErrorBoundary>
              </div>
            )}
            <div className={`body-wrapper${initialized ? " on" : ""}`}>
              {isDiscoveryStream ? (
                <ErrorBoundary className="borderless-error">
                  <DiscoveryStreamBase
                    locale={props.App.locale}
                    mayHaveSponsoredStories={mayHaveSponsoredStories}
                    firstVisibleTimestamp={this.state.firstVisibleTimestamp}
                  />
                </ErrorBoundary>
              ) : (
                <Sections />
              )}
            </div>
            <ConfirmDialog />
            {wallpapersEnabled && this.renderWallpaperAttribution()}
          </main>
        </div>
      </div>
    );
  }
}

BaseContent.defaultProps = {
  document: global.document,
};

export const Base = connect(state => ({
  App: state.App,
  Prefs: state.Prefs,
  Sections: state.Sections,
  DiscoveryStream: state.DiscoveryStream,
  Search: state.Search,
  Wallpapers: state.Wallpapers,
}))(_Base);
