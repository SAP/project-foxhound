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
import React, { useState, useEffect } from "react";
import { Search } from "content-src/components/Search/Search";
import { Sections } from "content-src/components/Sections/Sections";
import { Logo } from "content-src/components/Logo/Logo";
import { Weather } from "content-src/components/Weather/Weather";
import { DownloadModalToggle } from "content-src/components/DownloadModalToggle/DownloadModalToggle";
import { Notifications } from "content-src/components/Notifications/Notifications";
import { TopicSelection } from "content-src/components/DiscoveryStreamComponents/TopicSelection/TopicSelection";
import { DownloadMobilePromoHighlight } from "../DiscoveryStreamComponents/FeatureHighlight/DownloadMobilePromoHighlight";
import { WallpaperFeatureHighlight } from "../DiscoveryStreamComponents/FeatureHighlight/WallpaperFeatureHighlight";
import { ActivationWindowMessage } from "../ActivationWindowMessage/ActivationWindowMessage";
import { MessageWrapper } from "content-src/components/MessageWrapper/MessageWrapper";

const VISIBLE = "visible";
const VISIBILITY_CHANGE_EVENT = "visibilitychange";
const PREF_INFERRED_PERSONALIZATION_SYSTEM =
  "discoverystream.sections.personalization.inferred.enabled";
const PREF_INFERRED_PERSONALIZATION_USER =
  "discoverystream.sections.personalization.inferred.user.enabled";

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

export function WithDsAdmin(props) {
  const { hash = globalThis?.location?.hash || "" } = props;

  const [devtoolsCollapsed, setDevtoolsCollapsed] = useState(
    !hash.startsWith("#devtools")
  );

  useEffect(() => {
    const onHashChange = () => {
      const h = globalThis?.location?.hash || "";
      setDevtoolsCollapsed(!h.startsWith("#devtools"));
    };

    // run once in case hash changed before mount
    onHashChange();

    globalThis?.addEventListener("hashchange", onHashChange);
    return () => globalThis?.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <>
      <DiscoveryStreamAdmin devtoolsCollapsed={devtoolsCollapsed} />
      {devtoolsCollapsed ? <BaseContent {...props} /> : null}
    </>
  );
}

export function _Base(props) {
  const isDevtoolsEnabled = props.Prefs.values["asrouter.devtoolsEnabled"];
  const { App } = props;

  if (!App.initialized) {
    return null;
  }

  return (
    <ErrorBoundary className="base-content-fallback">
      {isDevtoolsEnabled ? (
        <WithDsAdmin {...props} />
      ) : (
        <BaseContent {...props} />
      )}
    </ErrorBoundary>
  );
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
    this.shouldShowOMCHighlight = this.shouldShowOMCHighlight.bind(this);
    this.updateWallpaper = this.updateWallpaper.bind(this);
    this.prefersDarkQuery = null;
    this.handleColorModeChange = this.handleColorModeChange.bind(this);
    this.onVisible = this.onVisible.bind(this);
    this.toggleDownloadHighlight = this.toggleDownloadHighlight.bind(this);
    this.handleDismissDownloadHighlight =
      this.handleDismissDownloadHighlight.bind(this);
    this.applyBodyClasses = this.applyBodyClasses.bind(this);
    this.toggleSectionsMgmtPanel = this.toggleSectionsMgmtPanel.bind(this);
    this.state = {
      fixedSearch: false,
      firstVisibleTimestamp: null,
      colorMode: "",
      fixedNavStyle: {},
      wallpaperTheme: "",
      showDownloadHighlightOverride: null,
      visible: false,
      showSectionsMgmtPanel: false,
    };
    this.spocPlaceholderStartTime = null;
  }

  setFirstVisibleTimestamp() {
    if (!this.state.firstVisibleTimestamp) {
      this.setState({
        firstVisibleTimestamp: Date.now(),
      });
    }
  }

  onVisible() {
    this.setState({
      visible: true,
    });
    this.setFirstVisibleTimestamp();
    this.shouldDisplayTopicSelectionModal();
    this.onVisibilityDispatch();

    if (this.isSpocsOnDemandExpired && !this.spocPlaceholderStartTime) {
      this.spocPlaceholderStartTime = Date.now();
    }
  }

  onVisibilityDispatch() {
    const { onDemand = {} } = this.props.DiscoveryStream.spocs;

    // We only need to dispatch this if:
    // 1. onDemand is enabled,
    // 2. onDemand spocs have not been loaded on this tab.
    // 3. Spocs are expired.
    if (onDemand.enabled && !onDemand.loaded && this.isSpocsOnDemandExpired) {
      // This dispatches that spocs are expired and we need to update them.
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_SPOCS_ONDEMAND_UPDATE,
        })
      );
    }
  }

  get isSpocsOnDemandExpired() {
    const {
      onDemand = {},
      cacheUpdateTime,
      lastUpdated,
    } = this.props.DiscoveryStream.spocs;

    // We can bail early if:
    // 1. onDemand is off,
    // 2. onDemand spocs have been loaded on this tab.
    if (!onDemand.enabled || onDemand.loaded) {
      return false;
    }

    return Date.now() - lastUpdated >= cacheUpdateTime;
  }

  spocsOnDemandUpdated() {
    const { onDemand = {}, loaded } = this.props.DiscoveryStream.spocs;

    // We only need to fire this if:
    // 1. Spoc data is loaded.
    // 2. onDemand is enabled.
    // 3. The component is visible (not preloaded tab).
    // 4. onDemand spocs have not been loaded on this tab.
    // 5. Spocs are not expired.
    if (
      loaded &&
      onDemand.enabled &&
      this.state.visible &&
      !onDemand.loaded &&
      !this.isSpocsOnDemandExpired
    ) {
      // This dispatches that spocs have been loaded on this tab
      // and we don't need to update them again for this tab.
      this.props.dispatch(
        ac.BroadcastToContent({ type: at.DISCOVERY_STREAM_SPOCS_ONDEMAND_LOAD })
      );
    }
  }

  componentDidMount() {
    this.applyBodyClasses();
    global.addEventListener("scroll", this.onWindowScroll);
    global.addEventListener("keydown", this.handleOnKeyDown);
    const prefs = this.props.Prefs.values;
    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];

    if (!prefs["externalComponents.enabled"]) {
      if (prefs["search.useHandoffComponent"]) {
        // Dynamically import the contentSearchHandoffUI module, but don't worry
        // about webpacking this one.
        import(
          /* webpackIgnore: true */ "chrome://browser/content/contentSearchHandoffUI.mjs"
        );
      } else {
        const scriptURL = "chrome://browser/content/contentSearchHandoffUI.js";
        const scriptEl = document.createElement("script");
        scriptEl.src = scriptURL;
        document.head.appendChild(scriptEl);
      }
    }

    if (this.props.document.visibilityState === VISIBLE) {
      this.onVisible();
    } else {
      this._onVisibilityChange = () => {
        if (this.props.document.visibilityState === VISIBLE) {
          this.onVisible();
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
    if (wallpapersEnabled) {
      this.updateWallpaper();
    }

    this._onHashChange = () => {
      const hash = globalThis.location?.hash || "";
      if (hash === "#customize" || hash === "#customize-topics") {
        this.openCustomizationMenu();

        if (hash === "#customize-topics") {
          this.toggleSectionsMgmtPanel();
        }
      } else if (this.props.App.customizeMenuVisible) {
        this.closeCustomizationMenu();
      }
    };

    // Using the Performance API to detect page reload vs fresh navigation.
    // Only open customize menu on fresh navigation, not on page refresh.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType
    // See: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry/entryType#navigation
    // See: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/type
    const isReload =
      globalThis.performance?.getEntriesByType("navigation")[0]?.type ===
      "reload";

    if (!isReload) {
      this._onHashChange();
    }

    globalThis.addEventListener("hashchange", this._onHashChange);
  }

  componentDidUpdate(prevProps) {
    this.applyBodyClasses();
    const prefs = this.props.Prefs.values;

    // Check if weather widget was re-enabled from customization menu
    const wasWeatherDisabled = !prevProps.Prefs.values.showWeather;
    const isWeatherEnabled = this.props.Prefs.values.showWeather;

    if (wasWeatherDisabled && isWeatherEnabled) {
      // If weather widget was enabled from customization menu, display opt-in dialog
      this.props.dispatch(ac.SetPref("weather.optInDisplayed", true));
    }

    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];
    if (wallpapersEnabled) {
      // destructure current and previous props with fallbacks
      // (preventing undefined errors)
      const {
        Wallpapers: { uploadedWallpaper = null, wallpaperList = null } = {},
      } = this.props;

      const {
        Wallpapers: {
          uploadedWallpaper: prevUploadedWallpaper = null,
          wallpaperList: prevWallpaperList = null,
        } = {},
        Prefs: { values: prevPrefs = {} } = {},
      } = prevProps;

      const selectedWallpaper = prefs["newtabWallpapers.wallpaper"];
      const prevSelectedWallpaper = prevPrefs["newtabWallpapers.wallpaper"];
      const uploadedWallpaperTheme =
        prefs["newtabWallpapers.customWallpaper.theme"];
      const prevUploadedWallpaperTheme =
        prevPrefs["newtabWallpapers.customWallpaper.theme"];

      // don't update wallpaper unless the wallpaper is being changed.
      if (
        selectedWallpaper !== prevSelectedWallpaper || // selecting a new wallpaper
        uploadedWallpaper !== prevUploadedWallpaper || // uploading a new wallpaper
        wallpaperList !== prevWallpaperList || // remote settings wallpaper list updates
        this.props.App.isForStartupCache.Wallpaper !==
          prevProps.App.isForStartupCache.Wallpaper || // Startup cached page wallpaper is updating
        uploadedWallpaperTheme !== prevUploadedWallpaperTheme
      ) {
        this.updateWallpaper();
      }
    }

    this.spocsOnDemandUpdated();
    this.trackSpocPlaceholderDuration(prevProps);
  }

  trackSpocPlaceholderDuration(prevProps) {
    // isExpired returns true when the current props have expired spocs (showing placeholders)
    const isExpired = this.isSpocsOnDemandExpired;

    // Init tracking when placeholders become visible
    if (isExpired && this.state.visible && !this.spocPlaceholderStartTime) {
      this.spocPlaceholderStartTime = Date.now();
    }

    // wasExpired returns true when the previous props had expired spocs (showing placeholders)
    const wasExpired =
      prevProps.DiscoveryStream.spocs.onDemand?.enabled &&
      !prevProps.DiscoveryStream.spocs.onDemand?.loaded &&
      Date.now() - prevProps.DiscoveryStream.spocs.lastUpdated >=
        prevProps.DiscoveryStream.spocs.cacheUpdateTime;

    // Record duration telemetry event when placeholders are replaced with real content
    if (wasExpired && !isExpired && this.spocPlaceholderStartTime) {
      const duration = Date.now() - this.spocPlaceholderStartTime;
      this.props.dispatch(
        ac.OnlyToMain({
          type: at.DISCOVERY_STREAM_SPOC_PLACEHOLDER_DURATION,
          data: { duration },
        })
      );
      this.spocPlaceholderStartTime = null;
    }
  }

  handleColorModeChange() {
    const colorMode = this.prefersDarkQuery?.matches ? "dark" : "light";
    if (colorMode !== this.state.colorMode) {
      this.setState({ colorMode });
      this.updateWallpaper();
    }
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
    if (this._onHashChange) {
      globalThis.removeEventListener("hashchange", this._onHashChange);
    }
  }

  onWindowScroll() {
    if (window.innerHeight <= 700) {
      // Bug 1937296: Only apply fixed-search logic
      // if the page is tall enough to support it.
      return;
    }

    const prefs = this.props.Prefs.values;
    const { showSearch } = prefs;

    if (!showSearch) {
      // Bug 1944718: Only apply fixed-search logic
      // if search is visible.
      return;
    }

    const logoAlwaysVisible = prefs["logowordmark.alwaysVisible"];

    /* Bug 1917937: The logic presented below is fragile but accurate to the pixel. As new tab experiments with layouts, we have a tech debt of competing styles and classes the slightly modify where the search bar sits on the page. The larger solution for this is to replace everything with an intersection observer, but would require a larger refactor of this file. In the interim, we can programmatically calculate when to fire the fixed-scroll event and account for the moved elements so that topsites/etc stays in the same place. The CSS this references has been flagged to reference this logic so (hopefully) keep them in sync. */

    let SCROLL_THRESHOLD = 0; // When the fixed-scroll event fires
    let MAIN_OFFSET_PADDING = 0; // The padding to compensate for the moved elements

    const CSS_VAR_SPACE_XXLARGE = 32.04; // Custom Acorn themed variable (8 * 0.267rem);

    let layout = {
      outerWrapperPaddingTop: 32.04,
      searchWrapperPaddingTop: 16.02,
      searchWrapperPaddingBottom: CSS_VAR_SPACE_XXLARGE,
      searchWrapperFixedScrollPaddingTop: 24.03,
      searchWrapperFixedScrollPaddingBottom: 24.03,
      searchInnerWrapperMinHeight: 52,
      logoAndWordmarkWrapperHeight: 0,
      logoAndWordmarkWrapperMarginBottom: 0,
    };

    // Logo visibility applies to all layouts
    if (!logoAlwaysVisible) {
      layout.logoAndWordmarkWrapperHeight = 0;
      layout.logoAndWordmarkWrapperMarginBottom = 0;
    }

    SCROLL_THRESHOLD =
      layout.outerWrapperPaddingTop +
      layout.searchWrapperPaddingTop +
      layout.logoAndWordmarkWrapperHeight +
      layout.logoAndWordmarkWrapperMarginBottom -
      layout.searchWrapperFixedScrollPaddingTop;

    MAIN_OFFSET_PADDING =
      layout.searchWrapperPaddingTop +
      layout.searchWrapperPaddingBottom +
      layout.searchInnerWrapperMinHeight +
      layout.logoAndWordmarkWrapperHeight +
      layout.logoAndWordmarkWrapperMarginBottom;

    // Edge case if logo and thums are turned off, but Var A is enabled
    if (SCROLL_THRESHOLD < 1) {
      SCROLL_THRESHOLD = 1;
    }

    if (global.scrollY > SCROLL_THRESHOLD && !this.state.fixedSearch) {
      this.setState({
        fixedSearch: true,
        fixedNavStyle: { paddingBlockStart: `${MAIN_OFFSET_PADDING}px` },
      });
    } else if (global.scrollY <= SCROLL_THRESHOLD && this.state.fixedSearch) {
      this.setState({ fixedSearch: false, fixedNavStyle: {} });
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

  applyBodyClasses() {
    const { body } = this.props.document;
    if (!body) {
      return;
    }

    if (!body.classList.contains("activity-stream")) {
      body.classList.add("activity-stream");
    }
  }

  renderWallpaperAttribution() {
    const { wallpaperList } = this.props.Wallpapers;
    const activeWallpaper =
      this.props.Prefs.values[`newtabWallpapers.wallpaper`];
    const selected = wallpaperList.find(wp => wp.title === activeWallpaper);
    // make sure a wallpaper is selected and that the attribution also exists
    if (!selected?.attribution) {
      return null;
    }

    const { name: authorDetails, webpage } = selected.attribution;
    if (activeWallpaper && wallpaperList && authorDetails.url) {
      return (
        <p
          className={`wallpaper-attribution`}
          key={authorDetails.string}
          data-l10n-id="newtab-wallpaper-attribution"
          data-l10n-args={JSON.stringify({
            author_string: authorDetails.string,
            author_url: authorDetails.url,
            webpage_string: webpage.string,
            webpage_url: webpage.url,
          })}
        >
          <a data-l10n-name="name-link" href={authorDetails.url}>
            {authorDetails.string}
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
    const selectedWallpaper = prefs["newtabWallpapers.wallpaper"];
    const { wallpaperList, uploadedWallpaper: uploadedWallpaperUrl } =
      this.props.Wallpapers;
    const uploadedWallpaperTheme =
      prefs["newtabWallpapers.customWallpaper.theme"];
    // Uuse this.prefersDarkQuery since this.state.colorMode can be undefined when this is called
    const colorMode = this.prefersDarkQuery?.matches ? "dark" : "light";
    let url = "";
    let color = "transparent";
    let newTheme = colorMode;
    let backgroundPosition = "center";

    // if no selected wallpaper fallback to browser/theme styles
    if (!selectedWallpaper) {
      global.document?.body.style.removeProperty("--newtab-wallpaper");
      global.document?.body.style.removeProperty("--newtab-wallpaper-color");
      global.document?.body.style.removeProperty(
        "--newtab-wallpaper-backgroundPosition"
      );
      global.document?.body.classList.remove("lightWallpaper", "darkWallpaper");
      return;
    }

    // uploaded wallpaper
    if (selectedWallpaper === "custom" && uploadedWallpaperUrl) {
      url = uploadedWallpaperUrl;
      color = "transparent";
      // Note: There is no method to set a specific background position for custom wallpapers
      backgroundPosition = "center";
      newTheme = uploadedWallpaperTheme || colorMode;
    } else if (wallpaperList) {
      const wallpaper = wallpaperList.find(
        wp => wp.title === selectedWallpaper
      );
      // solid color picker
      if (selectedWallpaper.includes("solid-color-picker")) {
        const regexRGB = /#([a-fA-F0-9]{6})/;
        const hex = selectedWallpaper.match(regexRGB)?.[0];
        url = "";
        color = hex;
        const rgbColors = this.getRGBColors(hex);
        newTheme = this.isWallpaperColorDark(rgbColors) ? "dark" : "light";
        // standard wallpaper & solid colors
      } else if (selectedWallpaper) {
        url = wallpaper?.wallpaperUrl || "";
        backgroundPosition = wallpaper?.background_position || "center";
        color = wallpaper?.solid_color || "transparent";
        newTheme = wallpaper?.theme || colorMode;
        // if a solid color, determine if dark or light
        if (wallpaper?.solid_color) {
          const rgbColors = this.getRGBColors(wallpaper.solid_color);
          const isColorDark = this.isWallpaperColorDark(rgbColors);
          newTheme = isColorDark ? "dark" : "light";
        }
      }
    }
    global.document?.body.style.setProperty(
      "--newtab-wallpaper",
      `url(${url})`
    );
    global.document?.body.style.setProperty(
      "--newtab-wallpaper-backgroundPosition",
      backgroundPosition
    );
    global.document?.body.style.setProperty(
      "--newtab-wallpaper-color",
      color || "transparent"
    );

    global.document?.body.classList.remove("lightWallpaper", "darkWallpaper");
    global.document?.body.classList.add(
      newTheme === "dark" ? "darkWallpaper" : "lightWallpaper"
    );
  }

  shouldShowOMCHighlight(componentId) {
    const messageData = this.props.Messages?.messageData;
    const isVisible = this.props.Messages?.isVisible;
    if (!messageData || Object.keys(messageData).length === 0 || !isVisible) {
      return false;
    }
    return messageData?.content?.messageType === componentId;
  }

  toggleDownloadHighlight() {
    this.setState(prevState => {
      const override = !(
        prevState.showDownloadHighlightOverride ??
        this.shouldShowOMCHighlight("DownloadMobilePromoHighlight")
      );

      if (override) {
        // Emit an open event manually since OMC isn't handling it
        this.props.dispatch(
          ac.DiscoveryStreamUserEvent({
            event: "FEATURE_HIGHLIGHT_OPEN",
            source: "FEATURE_HIGHLIGHT",
            value: { feature: "FEATURE_DOWNLOAD_MOBILE_PROMO" },
          })
        );
      }

      return {
        showDownloadHighlightOverride: override,
      };
    });
  }

  handleDismissDownloadHighlight() {
    this.setState({ showDownloadHighlightOverride: false });
  }

  getRGBColors(input) {
    if (input.length !== 7) {
      return [];
    }

    const r = parseInt(input.substr(1, 2), 16);
    const g = parseInt(input.substr(3, 2), 16);
    const b = parseInt(input.substr(5, 2), 16);

    return [r, g, b];
  }

  isWallpaperColorDark([r, g, b]) {
    return 0.2125 * r + 0.7154 * g + 0.0721 * b <= 110;
  }

  toggleSectionsMgmtPanel() {
    this.setState(prevState => ({
      showSectionsMgmtPanel: !prevState.showSectionsMgmtPanel,
    }));
  }

  shouldDisplayTopicSelectionModal() {
    const prefs = this.props.Prefs.values;
    const pocketEnabled =
      prefs["feeds.section.topstories"] && prefs["feeds.system.topstories"];
    const topicSelectionOnboardingEnabled =
      prefs["discoverystream.topicSelection.onboarding.enabled"] &&
      pocketEnabled;
    const maybeShowModal =
      prefs["discoverystream.topicSelection.onboarding.maybeDisplay"];
    const displayTimeout =
      prefs["discoverystream.topicSelection.onboarding.displayTimeout"];
    const lastDisplayed =
      prefs["discoverystream.topicSelection.onboarding.lastDisplayed"];
    const displayCount =
      prefs["discoverystream.topicSelection.onboarding.displayCount"];

    if (
      !maybeShowModal ||
      !prefs["discoverystream.topicSelection.enabled"] ||
      !topicSelectionOnboardingEnabled
    ) {
      return;
    }

    const day = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();

    const timeoutOccured = now - parseFloat(lastDisplayed) > displayTimeout;
    if (displayCount < 3) {
      if (displayCount === 0 || timeoutOccured) {
        this.props.dispatch(
          ac.BroadcastToContent({ type: at.TOPIC_SELECTION_SPOTLIGHT_OPEN })
        );
        this.setPref(
          "discoverystream.topicSelection.onboarding.displayTimeout",
          day
        );
      }
    }
  }

  // eslint-disable-next-line max-statements, complexity
  render() {
    const { props } = this;
    const { App, DiscoveryStream } = props;
    const { initialized, customizeMenuVisible } = App;
    const prefs = props.Prefs.values;

    const activeWallpaper = prefs[`newtabWallpapers.wallpaper`];
    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];
    const weatherEnabled = prefs.showWeather;
    const { showTopicSelection } = DiscoveryStream;
    const mayShowTopicSelection =
      showTopicSelection && prefs["discoverystream.topicSelection.enabled"];

    const isDiscoveryStream =
      props.DiscoveryStream.config && props.DiscoveryStream.config.enabled;
    let filteredSections = props.Sections.filter(
      section => section.id !== "topstories"
    );

    const pocketEnabled =
      prefs["feeds.section.topstories"] && prefs["feeds.system.topstories"];
    const noSectionsEnabled =
      !prefs["feeds.topsites"] &&
      !pocketEnabled &&
      filteredSections.filter(section => section.enabled).length === 0;
    const enabledSections = {
      topSitesEnabled: prefs["feeds.topsites"],
      pocketEnabled: prefs["feeds.section.topstories"],
      showInferredPersonalizationEnabled:
        prefs[PREF_INFERRED_PERSONALIZATION_USER],
      topSitesRowsCount: prefs.topSitesRows,
      weatherEnabled: prefs.showWeather,
    };

    const pocketRegion = prefs["feeds.system.topstories"];
    const mayHaveInferredPersonalization =
      prefs[PREF_INFERRED_PERSONALIZATION_SYSTEM];
    const mayHaveWeather =
      prefs["system.showWeather"] || prefs.trainhopConfig?.weather?.enabled;
    const supportUrl = prefs["support.url"];

    // Widgets experiment pref check
    const nimbusWidgetsEnabled = prefs.widgetsConfig?.enabled;
    const nimbusListsEnabled = prefs.widgetsConfig?.listsEnabled;
    const nimbusTimerEnabled = prefs.widgetsConfig?.timerEnabled;
    const nimbusWidgetsTrainhopEnabled = prefs.trainhopConfig?.widgets?.enabled;
    const nimbusListsTrainhopEnabled =
      prefs.trainhopConfig?.widgets?.listsEnabled;
    const nimbusTimerTrainhopEnabled =
      prefs.trainhopConfig?.widgets?.timerEnabled;

    const mayHaveWidgets =
      prefs["widgets.system.enabled"] ||
      nimbusWidgetsEnabled ||
      nimbusWidgetsTrainhopEnabled;
    const mayHaveListsWidget =
      prefs["widgets.system.lists.enabled"] ||
      nimbusListsEnabled ||
      nimbusListsTrainhopEnabled;
    const mayHaveTimerWidget =
      prefs["widgets.system.focusTimer.enabled"] ||
      nimbusTimerEnabled ||
      nimbusTimerTrainhopEnabled;

    // These prefs set the initial values on the Customize panel toggle switches
    const enabledWidgets = {
      listsEnabled: prefs["widgets.lists.enabled"],
      timerEnabled: prefs["widgets.focusTimer.enabled"],
      weatherEnabled: prefs.showWeather,
      widgetsMaximized: prefs["widgets.maximized"],
      widgetsMayBeMaximized: prefs["widgets.system.maximized"],
    };

    // Mobile Download Promo Pref Checks
    const mobileDownloadPromoEnabled = prefs["mobileDownloadModal.enabled"];
    const mobileDownloadPromoVariantAEnabled =
      prefs["mobileDownloadModal.variant-a"];
    const mobileDownloadPromoVariantBEnabled =
      prefs["mobileDownloadModal.variant-b"];
    const mobileDownloadPromoVariantCEnabled =
      prefs["mobileDownloadModal.variant-c"];
    const mobileDownloadPromoVariantABorC =
      mobileDownloadPromoVariantAEnabled ||
      mobileDownloadPromoVariantBEnabled ||
      mobileDownloadPromoVariantCEnabled;
    const mobileDownloadPromoWrapperHeightModifier =
      prefs["weather.display"] === "detailed" &&
      weatherEnabled &&
      mayHaveWeather
        ? "is-tall"
        : "";
    const sectionsEnabled = prefs["discoverystream.sections.enabled"];
    const sectionsCustomizeMenuPanelEnabled =
      prefs["discoverystream.sections.customizeMenuPanel.enabled"];
    const sectionsPersonalizationEnabled =
      prefs["discoverystream.sections.personalization.enabled"];

    // Logic to show follow/block topic mgmt panel in Customize panel
    const mayHavePersonalizedTopicSections =
      sectionsPersonalizationEnabled &&
      sectionsEnabled &&
      sectionsCustomizeMenuPanelEnabled &&
      DiscoveryStream.feeds.loaded;

    const featureClassName = [
      mobileDownloadPromoEnabled &&
        mobileDownloadPromoVariantABorC &&
        "has-mobile-download-promo", // Mobile download promo modal is enabled/visible
      weatherEnabled && mayHaveWeather && "has-weather", // Weather widget is enabled/visible
      prefs.showSearch ? "has-search" : "no-search",
      // layoutsVariantAEnabled ? "layout-variant-a" : "", // Layout experiment variant A
      // layoutsVariantBEnabled ? "layout-variant-b" : "", // Layout experiment variant B
      pocketEnabled ? "has-recommended-stories" : "no-recommended-stories",
      sectionsEnabled ? "has-sections-grid" : "",
    ]
      .filter(v => v)
      .join(" ");

    const outerClassName = [
      "outer-wrapper",
      isDiscoveryStream && pocketEnabled && "ds-outer-wrapper-search-alignment",
      isDiscoveryStream && "ds-outer-wrapper-breakpoint-override",
      prefs.showSearch &&
        this.state.fixedSearch &&
        !noSectionsEnabled &&
        "fixed-search",
      prefs.showSearch && noSectionsEnabled && "only-search",
      prefs["feeds.topsites"] &&
        !pocketEnabled &&
        !prefs.showSearch &&
        "only-topsites",
      noSectionsEnabled && "no-sections",
      prefs["logowordmark.alwaysVisible"] && "visible-logo",
    ]
      .filter(v => v)
      .join(" ");

    // If state.showDownloadHighlightOverride has value, let it override the logic
    // Otherwise, defer to OMC message display logic
    const shouldShowDownloadHighlight =
      this.state.showDownloadHighlightOverride ??
      this.shouldShowOMCHighlight("DownloadMobilePromoHighlight");

    return (
      <div className={featureClassName}>
        <div className="weatherWrapper">
          {weatherEnabled && (
            <ErrorBoundary>
              <Weather />
            </ErrorBoundary>
          )}
        </div>
        <div
          className={`mobileDownloadPromoWrapper ${mobileDownloadPromoWrapperHeightModifier}`}
        >
          {mobileDownloadPromoEnabled && mobileDownloadPromoVariantABorC && (
            <ErrorBoundary>
              <DownloadModalToggle
                isActive={shouldShowDownloadHighlight}
                onClick={this.toggleDownloadHighlight}
              />
              {shouldShowDownloadHighlight && (
                <MessageWrapper
                  hiddenOverride={shouldShowDownloadHighlight}
                  onDismiss={this.handleDismissDownloadHighlight}
                  dispatch={this.props.dispatch}
                >
                  <DownloadMobilePromoHighlight
                    position={`inset-inline-start inset-block-end`}
                    dispatch={this.props.dispatch}
                  />
                </MessageWrapper>
              )}
            </ErrorBoundary>
          )}
        </div>

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions*/}
        <div className={outerClassName} onClick={this.closeCustomizationMenu}>
          <main className="newtab-main" style={this.state.fixedNavStyle}>
            {prefs.showSearch && (
              <div className="non-collapsible-section">
                <ErrorBoundary>
                  <Search
                    showLogo={
                      noSectionsEnabled || prefs["logowordmark.alwaysVisible"]
                    }
                    {...props.Search}
                  />
                </ErrorBoundary>
              </div>
            )}
            {/* Bug 1914055: Show logo regardless if search is enabled */}
            {!prefs.showSearch && !noSectionsEnabled && <Logo />}
            <div className={`body-wrapper${initialized ? " on" : ""}`}>
              {this.shouldShowOMCHighlight("ActivationWindowMessage") && (
                <MessageWrapper dispatch={this.props.dispatch}>
                  <ActivationWindowMessage
                    dispatch={this.props.dispatch}
                    messageData={this.props.Messages.messageData}
                  />
                </MessageWrapper>
              )}
              {isDiscoveryStream ? (
                <ErrorBoundary className="borderless-error">
                  <DiscoveryStreamBase
                    locale={props.App.locale}
                    firstVisibleTimestamp={this.state.firstVisibleTimestamp}
                    placeholder={this.isSpocsOnDemandExpired}
                  />
                </ErrorBoundary>
              ) : (
                <Sections />
              )}
            </div>
            <ConfirmDialog />
            {wallpapersEnabled && this.renderWallpaperAttribution()}
          </main>
          <aside>
            {this.props.Notifications?.showNotifications && (
              <ErrorBoundary>
                <Notifications dispatch={this.props.dispatch} />
              </ErrorBoundary>
            )}
          </aside>
          {/* Only show the modal on currently visible pages (not preloaded) */}
          {mayShowTopicSelection && pocketEnabled && (
            <TopicSelection supportUrl={supportUrl} />
          )}
        </div>
        {/* Floating menu for customize menu toggle */}
        <menu className="personalizeButtonWrapper">
          <CustomizeMenu
            onClose={this.closeCustomizationMenu}
            onOpen={this.openCustomizationMenu}
            openPreferences={this.openPreferences}
            setPref={this.setPref}
            enabledSections={enabledSections}
            enabledWidgets={enabledWidgets}
            wallpapersEnabled={wallpapersEnabled}
            activeWallpaper={activeWallpaper}
            pocketRegion={pocketRegion}
            mayHaveTopicSections={mayHavePersonalizedTopicSections}
            mayHaveInferredPersonalization={mayHaveInferredPersonalization}
            mayHaveWeather={mayHaveWeather}
            mayHaveWidgets={mayHaveWidgets}
            mayHaveTimerWidget={mayHaveTimerWidget}
            mayHaveListsWidget={mayHaveListsWidget}
            mayHaveWeatherForecast={
              prefs["widgets.system.weatherForecast.enabled"]
            }
            weatherDisplay={prefs["weather.display"]}
            showing={customizeMenuVisible}
            toggleSectionsMgmtPanel={this.toggleSectionsMgmtPanel}
            showSectionsMgmtPanel={this.state.showSectionsMgmtPanel}
          />
          {this.shouldShowOMCHighlight("CustomWallpaperHighlight") && (
            <MessageWrapper dispatch={this.props.dispatch}>
              <WallpaperFeatureHighlight
                position="inset-block-start inset-inline-start"
                dispatch={this.props.dispatch}
              />
            </MessageWrapper>
          )}
        </menu>
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
  Messages: state.Messages,
  Notifications: state.Notifications,
  Search: state.Search,
  Wallpapers: state.Wallpapers,
  Weather: state.Weather,
}))(_Base);
