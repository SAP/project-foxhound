/*! THIS FILE IS AUTO-GENERATED: webpack.system-addon.config.js */
var NewtabRenderUtils;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  NewTab: () => (/* binding */ NewTab),
  renderCache: () => (/* binding */ renderCache),
  renderWithoutState: () => (/* binding */ renderWithoutState)
});

;// CONCATENATED MODULE: ./common/Actions.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file is accessed from both content and system scopes.

const MAIN_MESSAGE_TYPE = "ActivityStream:Main";
const CONTENT_MESSAGE_TYPE = "ActivityStream:Content";
const PRELOAD_MESSAGE_TYPE = "ActivityStream:PreloadedBrowser";
const UI_CODE = 1;
const BACKGROUND_PROCESS = 2;

/**
 * globalImportContext - Are we in UI code (i.e. react, a dom) or some kind of background process?
 *                       Use this in action creators if you need different logic
 *                       for ui/background processes.
 */
const globalImportContext =
  typeof Window === "undefined" ? BACKGROUND_PROCESS : UI_CODE;

// Create an object that avoids accidental differing key/value pairs:
// {
//   INIT: "INIT",
//   UNINIT: "UNINIT"
// }
const actionTypes = {};

for (const type of [
  "ABOUT_SPONSORED_TOP_SITES",
  "ADDONS_INFO_REQUEST",
  "ADDONS_INFO_RESPONSE",
  "ADS_FEED_UPDATE",
  "ADS_INIT",
  "ADS_RESET",
  "ADS_UPDATE_SPOCS",
  "ADS_UPDATE_TILES",
  "BLOCK_SECTION",
  "BLOCK_URL",
  "BOOKMARK_URL",
  "CARD_SECTION_IMPRESSION",
  "CLEAR_PREF",
  "COPY_DOWNLOAD_LINK",
  "DELETE_BOOKMARK_BY_ID",
  "DELETE_HISTORY_URL",
  "DIALOG_CANCEL",
  "DIALOG_CLOSE",
  "DIALOG_OPEN",
  "DISABLE_SEARCH",
  "DISCOVERY_STREAM_CONFIG_CHANGE",
  "DISCOVERY_STREAM_CONFIG_RESET",
  "DISCOVERY_STREAM_CONFIG_RESET_DEFAULTS",
  "DISCOVERY_STREAM_CONFIG_SETUP",
  "DISCOVERY_STREAM_CONFIG_SET_VALUE",
  "DISCOVERY_STREAM_DEV_BLOCKS",
  "DISCOVERY_STREAM_DEV_BLOCKS_RESET",
  "DISCOVERY_STREAM_DEV_EXPIRE_CACHE",
  "DISCOVERY_STREAM_DEV_IDLE_DAILY",
  "DISCOVERY_STREAM_DEV_IMPRESSIONS",
  "DISCOVERY_STREAM_DEV_SHOW_PLACEHOLDER",
  "DISCOVERY_STREAM_DEV_SYNC_RS",
  "DISCOVERY_STREAM_DEV_SYSTEM_TICK",
  "DISCOVERY_STREAM_EXPERIMENT_DATA",
  "DISCOVERY_STREAM_FEEDS_UPDATE",
  "DISCOVERY_STREAM_FEED_UPDATE",
  "DISCOVERY_STREAM_IMPRESSION_STATS",
  "DISCOVERY_STREAM_LAYOUT_RESET",
  "DISCOVERY_STREAM_LAYOUT_UPDATE",
  "DISCOVERY_STREAM_LINK_BLOCKED",
  "DISCOVERY_STREAM_LOADED_CONTENT",
  "DISCOVERY_STREAM_PREFS_SETUP",
  "DISCOVERY_STREAM_RETRY_FEED",
  "DISCOVERY_STREAM_SPOCS_CAPS",
  "DISCOVERY_STREAM_SPOCS_ENDPOINT",
  "DISCOVERY_STREAM_SPOCS_ONDEMAND_LOAD",
  "DISCOVERY_STREAM_SPOCS_ONDEMAND_RESET",
  "DISCOVERY_STREAM_SPOCS_ONDEMAND_UPDATE",
  "DISCOVERY_STREAM_SPOCS_PLACEMENTS",
  "DISCOVERY_STREAM_SPOCS_UPDATE",
  "DISCOVERY_STREAM_SPOC_BLOCKED",
  "DISCOVERY_STREAM_SPOC_IMPRESSION",
  "DISCOVERY_STREAM_SPOC_PLACEHOLDER_DURATION",
  "DISCOVERY_STREAM_TOPICS_LOADING",
  "DISCOVERY_STREAM_USER_EVENT",
  "DOWNLOAD_CHANGED",
  "FAKE_FOCUS_SEARCH",
  "FILL_SEARCH_TERM",
  "FOLLOW_SECTION",
  "HANDOFF_SEARCH_TO_AWESOMEBAR",
  "HIDE_PERSONALIZE",
  "HIDE_TOAST_MESSAGE",
  "INFERRED_PERSONALIZATION_MODEL_UPDATE",
  "INFERRED_PERSONALIZATION_REFRESH",
  "INFERRED_PERSONALIZATION_RESET",
  "INFERRED_PERSONALIZATION_UPDATE",
  "INIT",
  "INLINE_SELECTION_CLICK",
  "INLINE_SELECTION_IMPRESSION",
  "MESSAGE_BLOCK",
  "MESSAGE_CLICK",
  "MESSAGE_DISMISS",
  "MESSAGE_IMPRESSION",
  "MESSAGE_NOTIFY_VISIBILITY",
  "MESSAGE_SET",
  "MESSAGE_TOGGLE_VISIBILITY",
  "NEW_TAB_INIT",
  "NEW_TAB_INITIAL_STATE",
  "NEW_TAB_LOAD",
  "NEW_TAB_REHYDRATED",
  "NEW_TAB_STATE_REQUEST",
  "NEW_TAB_STATE_REQUEST_STARTUPCACHE",
  "NEW_TAB_STATE_REQUEST_WITHOUT_STARTUPCACHE",
  "NEW_TAB_UNLOAD",
  "OPEN_DOWNLOAD_FILE",
  "OPEN_LINK",
  "OPEN_NEW_WINDOW",
  "OPEN_PRIVATE_WINDOW",
  "OPEN_WEBEXT_SETTINGS",
  "PARTNER_LINK_ATTRIBUTION",
  "PLACES_BOOKMARKS_REMOVED",
  "PLACES_BOOKMARK_ADDED",
  "PLACES_HISTORY_CLEARED",
  "PLACES_LINKS_CHANGED",
  "PLACES_LINKS_DELETED",
  "PLACES_LINK_BLOCKED",
  "POCKET_CTA",
  "POCKET_WAITING_FOR_SPOC",
  "PREFS_INITIAL_VALUES",
  "PREF_CHANGED",
  "PREVIEW_REQUEST",
  "PREVIEW_REQUEST_CANCEL",
  "PREVIEW_RESPONSE",
  "PROMO_CARD_CLICK",
  "PROMO_CARD_DISMISS",
  "PROMO_CARD_IMPRESSION",
  "REFRESH_EXTERNAL_COMPONENTS",
  "REMOVE_DOWNLOAD_FILE",
  "REPORT_AD_OPEN",
  "REPORT_AD_SUBMIT",
  "REPORT_CLOSE",
  "REPORT_CONTENT_OPEN",
  "REPORT_CONTENT_SUBMIT",
  "RICH_ICON_MISSING",
  "SAVE_SESSION_PERF_DATA",
  "SCREENSHOT_UPDATED",
  "SECTION_DEREGISTER",
  "SECTION_DISABLE",
  "SECTION_ENABLE",
  "SECTION_OPTIONS_CHANGED",
  "SECTION_PERSONALIZATION_SET",
  "SECTION_PERSONALIZATION_UPDATE",
  "SECTION_REGISTER",
  "SECTION_UPDATE",
  "SECTION_UPDATE_CARD",
  "SETTINGS_CLOSE",
  "SETTINGS_OPEN",
  "SET_PREF",
  "SHOW_DOWNLOAD_FILE",
  "SHOW_FIREFOX_ACCOUNTS",
  "SHOW_PERSONALIZE",
  "SHOW_PRIVACY_INFO",
  "SHOW_SEARCH",
  "SHOW_TOAST_MESSAGE",
  "SKIPPED_SIGNIN",
  "SOV_UPDATED",
  "SUBMIT_EMAIL",
  "SUBMIT_SIGNIN",
  "SYSTEM_TICK",
  "TELEMETRY_IMPRESSION_STATS",
  "TELEMETRY_USER_EVENT",
  "TOPIC_SELECTION_IMPRESSION",
  "TOPIC_SELECTION_MAYBE_LATER",
  "TOPIC_SELECTION_SPOTLIGHT_CLOSE",
  "TOPIC_SELECTION_SPOTLIGHT_OPEN",
  "TOPIC_SELECTION_USER_DISMISS",
  "TOPIC_SELECTION_USER_OPEN",
  "TOPIC_SELECTION_USER_SAVE",
  "TOP_SITES_ADD",
  "TOP_SITES_CANCEL_EDIT",
  "TOP_SITES_CLOSE_SEARCH_SHORTCUTS_MODAL",
  "TOP_SITES_EDIT",
  "TOP_SITES_INSERT",
  "TOP_SITES_OPEN_SEARCH_SHORTCUTS_MODAL",
  "TOP_SITES_ORGANIC_IMPRESSION_STATS",
  "TOP_SITES_PIN",
  "TOP_SITES_PREFS_UPDATED",
  "TOP_SITES_SPONSORED_IMPRESSION_STATS",
  "TOP_SITES_UNPIN",
  "TOP_SITES_UPDATED",
  "TOTAL_BOOKMARKS_REQUEST",
  "TOTAL_BOOKMARKS_RESPONSE",
  "UNBLOCK_SECTION",
  "UNFOLLOW_SECTION",
  "UNINIT",
  "UPDATE_PINNED_SEARCH_SHORTCUTS",
  "UPDATE_SEARCH_SHORTCUTS",
  "WALLPAPERS_CATEGORY_SET",
  "WALLPAPERS_CUSTOM_SET",
  "WALLPAPERS_FEATURE_HIGHLIGHT_COUNTER_INCREMENT",
  "WALLPAPERS_FEATURE_HIGHLIGHT_CTA_CLICKED",
  "WALLPAPERS_FEATURE_HIGHLIGHT_DISMISSED",
  "WALLPAPERS_FEATURE_HIGHLIGHT_SEEN",
  "WALLPAPERS_SET",
  "WALLPAPER_CATEGORY_CLICK",
  "WALLPAPER_CLICK",
  "WALLPAPER_REMOVE_UPLOAD",
  "WALLPAPER_UPLOAD",
  "WEATHER_DETECT_LOCATION",
  "WEATHER_IMPRESSION",
  "WEATHER_LOAD_ERROR",
  "WEATHER_LOCATION_DATA_UPDATE",
  "WEATHER_LOCATION_SEARCH_UPDATE",
  "WEATHER_LOCATION_SUGGESTIONS_UPDATE",
  "WEATHER_OPEN_PROVIDER_URL",
  "WEATHER_OPT_IN_PROMPT_SELECTION",
  "WEATHER_QUERY_UPDATE",
  "WEATHER_SEARCH_ACTIVE",
  "WEATHER_UPDATE",
  "WEATHER_USER_OPT_IN_LOCATION",
  "WEBEXT_CLICK",
  "WEBEXT_DISMISS",
  "WIDGETS_CONTAINER_ACTION",
  "WIDGETS_ENABLED",
  "WIDGETS_ERROR",
  "WIDGETS_IMPRESSION",
  "WIDGETS_LISTS_CHANGE_SELECTED",
  "WIDGETS_LISTS_SET",
  "WIDGETS_LISTS_SET_SELECTED",
  "WIDGETS_LISTS_UPDATE",
  "WIDGETS_LISTS_USER_EVENT",
  "WIDGETS_LISTS_USER_IMPRESSION",
  "WIDGETS_TIMER_END",
  "WIDGETS_TIMER_PAUSE",
  "WIDGETS_TIMER_PLAY",
  "WIDGETS_TIMER_RESET",
  "WIDGETS_TIMER_SET",
  "WIDGETS_TIMER_SET_DURATION",
  "WIDGETS_TIMER_SET_TYPE",
  "WIDGETS_TIMER_USER_EVENT",
  "WIDGETS_TIMER_USER_IMPRESSION",
  "WIDGETS_USER_EVENT",
]) {
  actionTypes[type] = type;
}

// Helper function for creating routed actions between content and main
// Not intended to be used by consumers
function _RouteMessage(action, options) {
  const meta = action.meta ? { ...action.meta } : {};
  if (!options || !options.from || !options.to) {
    throw new Error(
      "Routed Messages must have options as the second parameter, and must at least include a .from and .to property."
    );
  }
  // For each of these fields, if they are passed as an option,
  // add them to the action. If they are not defined, remove them.
  ["from", "to", "toTarget", "fromTarget", "skipMain", "skipLocal"].forEach(
    o => {
      if (typeof options[o] !== "undefined") {
        meta[o] = options[o];
      } else if (meta[o]) {
        delete meta[o];
      }
    }
  );
  return { ...action, meta };
}

/**
 * AlsoToMain - Creates a message that will be dispatched locally and also sent to the Main process.
 *
 * @param  {object} action Any redux action (required)
 * @param  {object} options
 * @param  {bool}   skipLocal Used by OnlyToMain to skip the main reducer
 * @param  {string} fromTarget The id of the content port from which the action originated. (optional)
 * @return {object} An action with added .meta properties
 */
function AlsoToMain(action, fromTarget, skipLocal) {
  return _RouteMessage(action, {
    from: CONTENT_MESSAGE_TYPE,
    to: MAIN_MESSAGE_TYPE,
    fromTarget,
    skipLocal,
  });
}

/**
 * OnlyToMain - Creates a message that will be sent to the Main process and skip the local reducer.
 *
 * @param  {object} action Any redux action (required)
 * @param  {object} options
 * @param  {string} fromTarget The id of the content port from which the action originated. (optional)
 * @return {object} An action with added .meta properties
 */
function OnlyToMain(action, fromTarget) {
  return AlsoToMain(action, fromTarget, true);
}

/**
 * BroadcastToContent - Creates a message that will be dispatched to main and sent to ALL content processes.
 *
 * @param  {object} action Any redux action (required)
 * @param  {object} options (optional)
 * @return {object} An action with added .meta properties
 */
function BroadcastToContent(action, options) {
  return _RouteMessage(action, {
    from: MAIN_MESSAGE_TYPE,
    to: CONTENT_MESSAGE_TYPE,
    ...options,
  });
}

/**
 * AlsoToOneContent - Creates a message that will be will be dispatched to the main store
 *                    and also sent to a particular Content process.
 *
 * @param  {object} action Any redux action (required)
 * @param  {string} target The id of a content port
 * @param  {bool} skipMain Used by OnlyToOneContent to skip the main process
 * @return {object} An action with added .meta properties
 */
function AlsoToOneContent(action, target, skipMain) {
  if (!target) {
    throw new Error(
      "You must provide a target ID as the second parameter of AlsoToOneContent. If you want to send to all content processes, use BroadcastToContent"
    );
  }
  return _RouteMessage(action, {
    from: MAIN_MESSAGE_TYPE,
    to: CONTENT_MESSAGE_TYPE,
    toTarget: target,
    skipMain,
  });
}

/**
 * OnlyToOneContent - Creates a message that will be sent to a particular Content process
 *                    and skip the main reducer.
 *
 * @param  {object} action Any redux action (required)
 * @param  {string} target The id of a content port
 * @return {object} An action with added .meta properties
 */
function OnlyToOneContent(action, target) {
  return AlsoToOneContent(action, target, true);
}

/**
 * AlsoToPreloaded - Creates a message that dispatched to the main reducer and also sent to the preloaded tab.
 *
 * @param  {object} action Any redux action (required)
 * @return {object} An action with added .meta properties
 */
function AlsoToPreloaded(action) {
  return _RouteMessage(action, {
    from: MAIN_MESSAGE_TYPE,
    to: PRELOAD_MESSAGE_TYPE,
  });
}

/**
 * UserEvent - A telemetry ping indicating a user action. This should only
 *                   be sent from the UI during a user session.
 *
 * @param  {object} data Fields to include in the ping (source, etc.)
 * @return {object} An AlsoToMain action
 */
function UserEvent(data) {
  return AlsoToMain({
    type: actionTypes.TELEMETRY_USER_EVENT,
    data,
  });
}

/**
 * DiscoveryStreamUserEvent - A telemetry ping indicating a user action from Discovery Stream. This should only
 *                     be sent from the UI during a user session.
 *
 * @param  {object} data Fields to include in the ping (source, etc.)
 * @return {object} An AlsoToMain action
 */
function DiscoveryStreamUserEvent(data) {
  return AlsoToMain({
    type: actionTypes.DISCOVERY_STREAM_USER_EVENT,
    data,
  });
}

/**
 * ImpressionStats - A telemetry ping indicating an impression stats.
 *
 * @param  {object} data Fields to include in the ping
 * @param  {int} importContext (For testing) Override the import context for testing.
 * #return {object} An action. For UI code, a AlsoToMain action.
 */
function ImpressionStats(data, importContext = globalImportContext) {
  const action = {
    type: actionTypes.TELEMETRY_IMPRESSION_STATS,
    data,
  };
  return importContext === UI_CODE ? AlsoToMain(action) : action;
}

/**
 * DiscoveryStreamImpressionStats - A telemetry ping indicating an impression stats in Discovery Stream.
 *
 * @param  {object} data Fields to include in the ping
 * @param  {int} importContext (For testing) Override the import context for testing.
 * #return {object} An action. For UI code, a AlsoToMain action.
 */
function DiscoveryStreamImpressionStats(
  data,
  importContext = globalImportContext
) {
  const action = {
    type: actionTypes.DISCOVERY_STREAM_IMPRESSION_STATS,
    data,
  };
  return importContext === UI_CODE ? AlsoToMain(action) : action;
}

/**
 * DiscoveryStreamLoadedContent - A telemetry ping indicating a content gets loaded in Discovery Stream.
 *
 * @param  {object} data Fields to include in the ping
 * @param  {int} importContext (For testing) Override the import context for testing.
 * #return {object} An action. For UI code, a AlsoToMain action.
 */
function DiscoveryStreamLoadedContent(
  data,
  importContext = globalImportContext
) {
  const action = {
    type: actionTypes.DISCOVERY_STREAM_LOADED_CONTENT,
    data,
  };
  return importContext === UI_CODE ? AlsoToMain(action) : action;
}

function SetPref(prefName, value, importContext = globalImportContext) {
  const action = {
    type: actionTypes.SET_PREF,
    data: { name: prefName, value },
  };
  return importContext === UI_CODE ? AlsoToMain(action) : action;
}

function WebExtEvent(type, data, importContext = globalImportContext) {
  if (!data || !data.source) {
    throw new Error(
      'WebExtEvent actions should include a property "source", the id of the webextension that should receive the event.'
    );
  }
  const action = { type, data };
  return importContext === UI_CODE ? AlsoToMain(action) : action;
}

const actionCreators = {
  BroadcastToContent,
  UserEvent,
  DiscoveryStreamUserEvent,
  ImpressionStats,
  AlsoToOneContent,
  OnlyToOneContent,
  AlsoToMain,
  OnlyToMain,
  AlsoToPreloaded,
  SetPref,
  WebExtEvent,
  DiscoveryStreamImpressionStats,
  DiscoveryStreamLoadedContent,
};

// These are helpers to test for certain kinds of actions
const actionUtils = {
  isSendToMain(action) {
    if (!action.meta) {
      return false;
    }
    return (
      action.meta.to === MAIN_MESSAGE_TYPE &&
      action.meta.from === CONTENT_MESSAGE_TYPE
    );
  },
  isBroadcastToContent(action) {
    if (!action.meta) {
      return false;
    }
    if (action.meta.to === CONTENT_MESSAGE_TYPE && !action.meta.toTarget) {
      return true;
    }
    return false;
  },
  isSendToOneContent(action) {
    if (!action.meta) {
      return false;
    }
    if (action.meta.to === CONTENT_MESSAGE_TYPE && action.meta.toTarget) {
      return true;
    }
    return false;
  },
  isSendToPreloaded(action) {
    if (!action.meta) {
      return false;
    }
    return (
      action.meta.to === PRELOAD_MESSAGE_TYPE &&
      action.meta.from === MAIN_MESSAGE_TYPE
    );
  },
  isFromMain(action) {
    if (!action.meta) {
      return false;
    }
    return (
      action.meta.from === MAIN_MESSAGE_TYPE &&
      action.meta.to === CONTENT_MESSAGE_TYPE
    );
  },
  getPortIdOfSender(action) {
    return (action.meta && action.meta.fromTarget) || null;
  },
  _RouteMessage,
};

;// CONCATENATED MODULE: external "ReactRedux"
const external_ReactRedux_namespaceObject = ReactRedux;
;// CONCATENATED MODULE: external "React"
const external_React_namespaceObject = React;
var external_React_default = /*#__PURE__*/__webpack_require__.n(external_React_namespaceObject);
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamAdmin/DiscoveryStreamAdmin.jsx
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





// Pref Constants
const PREF_AD_SIZE_MEDIUM_RECTANGLE = "newtabAdSize.mediumRectangle";
const PREF_AD_SIZE_BILLBOARD = "newtabAdSize.billboard";
const PREF_AD_SIZE_LEADERBOARD = "newtabAdSize.leaderboard";
const PREF_SECTIONS_ENABLED = "discoverystream.sections.enabled";
const PREF_SPOC_PLACEMENTS = "discoverystream.placements.spocs";
const PREF_SPOC_COUNTS = "discoverystream.placements.spocs.counts";
const PREF_CONTEXTUAL_ADS_ENABLED = "discoverystream.sections.contextualAds.enabled";
const PREF_CONTEXTUAL_BANNER_PLACEMENTS = "discoverystream.placements.contextualBanners";
const PREF_CONTEXTUAL_BANNER_COUNTS = "discoverystream.placements.contextualBanners.counts";
const PREF_UNIFIED_ADS_ENABLED = "unifiedAds.spocs.enabled";
const PREF_UNIFIED_ADS_ENDPOINT = "unifiedAds.endpoint";
const PREF_ALLOWED_ENDPOINTS = "discoverystream.endpoints";
const PREF_OHTTP_CONFIG = "discoverystream.ohttp.configURL";
const PREF_OHTTP_RELAY = "discoverystream.ohttp.relayURL";
const Row = props => /*#__PURE__*/external_React_default().createElement("tr", _extends({
  className: "message-item"
}, props), props.children);
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
class ToggleStoryButton extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }
  handleClick() {
    this.props.onClick(this.props.story);
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("button", {
      onClick: this.handleClick
    }, "collapse/open");
  }
}
class TogglePrefCheckbox extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
  }
  onChange(event) {
    this.props.onChange(this.props.pref, event.target.checked);
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("input", {
      type: "checkbox",
      checked: this.props.checked,
      onChange: this.onChange,
      disabled: this.props.disabled
    }), " ", this.props.pref, " ");
  }
}
class DiscoveryStreamAdminUI extends (external_React_default()).PureComponent {
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
    this.refreshInferredPersonalization = this.refreshInferredPersonalization.bind(this);
    this.refreshTopicSelectionCache = this.refreshTopicSelectionCache.bind(this);
    this.handleSectionsToggle = this.handleSectionsToggle.bind(this);
    this.toggleIABBanners = this.toggleIABBanners.bind(this);
    this.handleAllizomToggle = this.handleAllizomToggle.bind(this);
    this.sendConversionEvent = this.sendConversionEvent.bind(this);
    this.state = {
      toggledStories: {},
      weatherQuery: ""
    };
  }
  setConfigValue(configName, configValue) {
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.DISCOVERY_STREAM_CONFIG_SET_VALUE,
      data: {
        name: configName,
        value: configValue
      }
    }));
  }
  restorePrefDefaults() {
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.DISCOVERY_STREAM_CONFIG_RESET_DEFAULTS
    }));
  }
  refreshCache() {
    const {
      config
    } = this.props.state.DiscoveryStream;
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.DISCOVERY_STREAM_CONFIG_CHANGE,
      data: config
    }));
  }
  refreshInferredPersonalization() {
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.INFERRED_PERSONALIZATION_REFRESH
    }));
  }
  refreshTopicSelectionCache() {
    this.props.dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.displayCount", 0));
    this.props.dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", true));
  }
  dispatchSimpleAction(type) {
    this.props.dispatch(actionCreators.OnlyToMain({
      type
    }));
  }
  resetBlocks() {
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.DISCOVERY_STREAM_DEV_BLOCKS_RESET
    }));
  }
  systemTick() {
    this.dispatchSimpleAction(actionTypes.DISCOVERY_STREAM_DEV_SYSTEM_TICK);
  }
  expireCache() {
    this.dispatchSimpleAction(actionTypes.DISCOVERY_STREAM_DEV_EXPIRE_CACHE);
  }
  showPlaceholder() {
    this.dispatchSimpleAction(actionTypes.DISCOVERY_STREAM_DEV_SHOW_PLACEHOLDER);
  }
  idleDaily() {
    this.dispatchSimpleAction(actionTypes.DISCOVERY_STREAM_DEV_IDLE_DAILY);
  }
  syncRemoteSettings() {
    this.dispatchSimpleAction(actionTypes.DISCOVERY_STREAM_DEV_SYNC_RS);
  }
  handleWeatherUpdate(e) {
    this.setState({
      weatherQuery: e.target.value || ""
    });
  }
  handleWeatherSubmit(e) {
    e.preventDefault();
    const {
      weatherQuery
    } = this.state;
    this.props.dispatch(actionCreators.SetPref("weather.query", weatherQuery));
  }
  toggleIABBanners(e) {
    const {
      pressed,
      id
    } = e.target;

    // Set the active pref to true/false
    switch (id) {
      case "newtab_billboard":
        // Update boolean pref for billboard ad size
        this.props.dispatch(actionCreators.SetPref(PREF_AD_SIZE_BILLBOARD, pressed));
        break;
      case "newtab_leaderboard":
        // Update boolean pref for billboard ad size
        this.props.dispatch(actionCreators.SetPref(PREF_AD_SIZE_LEADERBOARD, pressed));
        break;
      case "newtab_rectangle":
        // Update boolean pref for mediumRectangle (MREC) ad size
        this.props.dispatch(actionCreators.SetPref(PREF_AD_SIZE_MEDIUM_RECTANGLE, pressed));
        break;
    }

    // Note: The counts array is passively updated whenever the placements array is updated.
    // The default pref values for each are:
    // PREF_SPOC_PLACEMENTS: "newtab_spocs"
    // PREF_SPOC_COUNTS: "6"
    const generateSpocPrefValues = () => {
      const placements = this.props.otherPrefs[PREF_SPOC_PLACEMENTS]?.split(",").map(item => item.trim()).filter(item => item) || [];
      const counts = this.props.otherPrefs[PREF_SPOC_COUNTS]?.split(",").map(item => item.trim()).filter(item => item) || [];

      // Confirm that the IAB type will have a count value of "1"
      const supportIABAdTypes = ["newtab_leaderboard", "newtab_rectangle", "newtab_billboard"];
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
        counts: counts.join(", ")
      };
    };
    const {
      placements,
      counts
    } = generateSpocPrefValues();

    // Update prefs with new values
    this.props.dispatch(actionCreators.SetPref(PREF_SPOC_PLACEMENTS, placements));
    this.props.dispatch(actionCreators.SetPref(PREF_SPOC_COUNTS, counts));

    // If contextual ads, sections, and one of the banners are enabled
    // update the contextualBanner prefs to include the banner value and count
    // Else, clear the prefs
    if (PREF_CONTEXTUAL_ADS_ENABLED && PREF_SECTIONS_ENABLED) {
      if (PREF_AD_SIZE_BILLBOARD && placements.includes("newtab_billboard")) {
        this.props.dispatch(actionCreators.SetPref(PREF_CONTEXTUAL_BANNER_PLACEMENTS, "newtab_billboard"));
        this.props.dispatch(actionCreators.SetPref(PREF_CONTEXTUAL_BANNER_COUNTS, "1"));
      } else if (PREF_AD_SIZE_LEADERBOARD && placements.includes("newtab_leaderboard")) {
        this.props.dispatch(actionCreators.SetPref(PREF_CONTEXTUAL_BANNER_PLACEMENTS, "newtab_leaderboard"));
        this.props.dispatch(actionCreators.SetPref(PREF_CONTEXTUAL_BANNER_COUNTS, "1"));
      } else {
        this.props.dispatch(actionCreators.SetPref(PREF_CONTEXTUAL_BANNER_PLACEMENTS, ""));
        this.props.dispatch(actionCreators.SetPref(PREF_CONTEXTUAL_BANNER_COUNTS, ""));
      }
    }
  }
  handleSectionsToggle(e) {
    const {
      pressed
    } = e.target;
    this.props.dispatch(actionCreators.SetPref(PREF_SECTIONS_ENABLED, pressed));
    this.props.dispatch(actionCreators.SetPref("discoverystream.sections.cards.enabled", pressed));
  }
  sendConversionEvent() {
    const detail = {
      partnerId: "295BEEF7-1E3B-4128-B8F8-858E12AA660B",
      lookbackDays: 7,
      impressionType: "default"
    };
    const event = new CustomEvent("FirefoxConversionNotification", {
      detail,
      bubbles: true,
      composed: true
    });
    window?.dispatchEvent(event);
  }
  renderComponent(width, component) {
    return /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "Type"), /*#__PURE__*/external_React_default().createElement("td", null, component.type)), /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "Width"), /*#__PURE__*/external_React_default().createElement("td", null, width)), component.feed && this.renderFeed(component.feed)));
  }
  renderWeatherData() {
    const {
      suggestions
    } = this.props.state.Weather;
    let weatherTable;
    if (suggestions) {
      weatherTable = /*#__PURE__*/external_React_default().createElement("div", {
        className: "weather-section"
      }, /*#__PURE__*/external_React_default().createElement("form", {
        onSubmit: this.handleWeatherSubmit
      }, /*#__PURE__*/external_React_default().createElement("label", {
        htmlFor: "weather-query"
      }, "Weather query"), /*#__PURE__*/external_React_default().createElement("input", {
        type: "text",
        min: "3",
        max: "10",
        id: "weather-query",
        onChange: this.handleWeatherUpdate,
        value: this.weatherQuery
      }), /*#__PURE__*/external_React_default().createElement("button", {
        type: "submit"
      }, "Submit")), /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, suggestions.map(suggestion => /*#__PURE__*/external_React_default().createElement("tr", {
        className: "message-item",
        key: suggestion.city_name
      }, /*#__PURE__*/external_React_default().createElement("td", {
        className: "message-id"
      }, /*#__PURE__*/external_React_default().createElement("span", null, suggestion.city_name, " ", /*#__PURE__*/external_React_default().createElement("br", null))), /*#__PURE__*/external_React_default().createElement("td", {
        className: "message-summary"
      }, /*#__PURE__*/external_React_default().createElement("pre", null, JSON.stringify(suggestion, null, 2))))))));
    }
    return weatherTable;
  }
  renderPersonalizationData() {
    const {
      inferredInterests,
      coarseInferredInterests,
      coarsePrivateInferredInterests
    } = this.props.state.InferredPersonalization;
    return /*#__PURE__*/external_React_default().createElement("div", null, " ", "Inferred Interests:", /*#__PURE__*/external_React_default().createElement("pre", null, JSON.stringify(inferredInterests, null, 2)), " Coarse Inferred Interests:", /*#__PURE__*/external_React_default().createElement("pre", null, JSON.stringify(coarseInferredInterests, null, 2)), " Coarse Inferred Interests With Differential Privacy:", /*#__PURE__*/external_React_default().createElement("pre", null, JSON.stringify(coarsePrivateInferredInterests, null, 2)));
  }
  renderFeedData(url) {
    const {
      feeds
    } = this.props.state.DiscoveryStream;
    const feed = feeds.data[url].data;
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("h4", null, "Feed url: ", url), /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, feed.recommendations?.map(story => this.renderStoryData(story)))));
  }
  renderFeedsData() {
    const {
      feeds
    } = this.props.state.DiscoveryStream;
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, Object.keys(feeds.data).map(url => this.renderFeedData(url)));
  }
  renderImpressionsData() {
    const {
      impressions
    } = this.props.state.DiscoveryStream;
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("h4", null, "Feed Impressions"), /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, Object.keys(impressions.feed).map(key => {
      return /*#__PURE__*/external_React_default().createElement(Row, {
        key: key
      }, /*#__PURE__*/external_React_default().createElement("td", {
        className: "min"
      }, key), /*#__PURE__*/external_React_default().createElement("td", null, relativeTime(impressions.feed[key]) || "(no data)"));
    }))));
  }
  renderBlocksData() {
    const {
      blocks
    } = this.props.state.DiscoveryStream;
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("h4", null, "Blocks"), /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.resetBlocks
    }, "Reset Blocks"), " ", /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, Object.keys(blocks).map(key => {
      return /*#__PURE__*/external_React_default().createElement(Row, {
        key: key
      }, /*#__PURE__*/external_React_default().createElement("td", {
        className: "min"
      }, key));
    }))));
  }
  handleAllizomToggle(e) {
    const prefs = this.props.otherPrefs;
    const unifiedAdsSpocsEnabled = prefs[PREF_UNIFIED_ADS_ENABLED];
    if (!unifiedAdsSpocsEnabled) {
      return;
    }
    const {
      pressed
    } = e.target;
    const {
      dispatch
    } = this.props;
    const allowedEndpoints = prefs[PREF_ALLOWED_ENDPOINTS];
    const setPref = (pref = "", value = "") => {
      dispatch(actionCreators.SetPref(pref, value));
    };
    const clearPref = (pref = "") => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.CLEAR_PREF,
        data: {
          name: pref
        }
      }));
    };
    if (pressed) {
      setPref(PREF_UNIFIED_ADS_ENDPOINT, "https://ads.allizom.org/");
      setPref(PREF_ALLOWED_ENDPOINTS, `${allowedEndpoints},https://ads.allizom.org/`);
      setPref(PREF_OHTTP_CONFIG, "https://stage.ohttp-gateway.nonprod.webservices.mozgcp.net/ohttp-configs");
      setPref(PREF_OHTTP_RELAY, "https://mozilla-ohttp-relay-test.edgecompute.app/");
    } else {
      clearPref(PREF_UNIFIED_ADS_ENDPOINT);
      clearPref(PREF_ALLOWED_ENDPOINTS);
      clearPref(PREF_OHTTP_CONFIG);
      clearPref(PREF_OHTTP_RELAY);
    }
  }
  renderSpocs() {
    const {
      spocs
    } = this.props.state.DiscoveryStream;
    const unifiedAdsSpocsEnabled = this.props.otherPrefs[PREF_UNIFIED_ADS_ENABLED];

    // Determine which mechanism is querying the UAPI ads server
    const PREF_UNIFIED_ADS_ADSFEED_ENABLED = "unifiedAds.adsFeed.enabled";
    const adsFeedEnabled = this.props.otherPrefs[PREF_UNIFIED_ADS_ADSFEED_ENABLED];
    const unifiedAdsEndpoint = this.props.otherPrefs[PREF_UNIFIED_ADS_ENDPOINT];
    const spocsEndpoint = unifiedAdsSpocsEnabled ? unifiedAdsEndpoint : spocs.spocs_endpoint;
    let spocsData = [];
    let allizomEnabled = spocsEndpoint?.includes("allizom");
    if (spocs.data && spocs.data.newtab_spocs && spocs.data.newtab_spocs.items) {
      spocsData = spocs.data.newtab_spocs.items || [];
    }
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      colSpan: "2"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "sections-toggle",
      disabled: !unifiedAdsSpocsEnabled || null,
      pressed: allizomEnabled || null,
      onToggle: this.handleAllizomToggle,
      label: "Toggle allizom"
    }))), /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "adsfeed enabled"), /*#__PURE__*/external_React_default().createElement("td", null, adsFeedEnabled ? "true" : "false")), /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "spocs endpoint"), /*#__PURE__*/external_React_default().createElement("td", null, spocsEndpoint)), /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "Data last fetched"), /*#__PURE__*/external_React_default().createElement("td", null, relativeTime(spocs.lastUpdated))))), /*#__PURE__*/external_React_default().createElement("h4", null, "Spoc data"), /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, spocsData.map(spoc => this.renderStoryData(spoc)))), /*#__PURE__*/external_React_default().createElement("h4", null, "Spoc frequency caps"), /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, spocs.frequency_caps.map(spoc => this.renderStoryData(spoc)))));
  }
  onStoryToggle(story) {
    const {
      toggledStories
    } = this.state;
    this.setState({
      toggledStories: {
        ...toggledStories,
        [story.id]: !toggledStories[story.id]
      }
    });
  }
  renderStoryData(story) {
    let storyData = "";
    if (this.state.toggledStories[story.id]) {
      storyData = JSON.stringify(story, null, 2);
    }
    return /*#__PURE__*/external_React_default().createElement("tr", {
      className: "message-item",
      key: story.id
    }, /*#__PURE__*/external_React_default().createElement("td", {
      className: "message-id"
    }, /*#__PURE__*/external_React_default().createElement("span", null, story.id, " ", /*#__PURE__*/external_React_default().createElement("br", null)), /*#__PURE__*/external_React_default().createElement(ToggleStoryButton, {
      story: story,
      onClick: this.onStoryToggle
    })), /*#__PURE__*/external_React_default().createElement("td", {
      className: "message-summary"
    }, /*#__PURE__*/external_React_default().createElement("pre", null, storyData)));
  }
  renderFeed(feed) {
    const {
      feeds
    } = this.props.state.DiscoveryStream;
    if (!feed.url) {
      return null;
    }
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "Feed url"), /*#__PURE__*/external_React_default().createElement("td", null, feed.url)), /*#__PURE__*/external_React_default().createElement(Row, null, /*#__PURE__*/external_React_default().createElement("td", {
      className: "min"
    }, "Data last fetched"), /*#__PURE__*/external_React_default().createElement("td", null, relativeTime(feeds.data[feed.url] ? feeds.data[feed.url].lastUpdated : null) || "(no data)")));
  }
  render() {
    const prefToggles = "enabled collapsible".split(" ");
    const {
      config,
      layout
    } = this.props.state.DiscoveryStream;
    const sectionsEnabled = this.props.otherPrefs[PREF_SECTIONS_ENABLED];

    // Prefs for IAB Banners
    const mediumRectangleEnabled = this.props.otherPrefs[PREF_AD_SIZE_MEDIUM_RECTANGLE];
    const billboardsEnabled = this.props.otherPrefs[PREF_AD_SIZE_BILLBOARD];
    const leaderboardEnabled = this.props.otherPrefs[PREF_AD_SIZE_LEADERBOARD];
    const spocPlacements = this.props.otherPrefs[PREF_SPOC_PLACEMENTS];
    const mediumRectangleEnabledPressed = mediumRectangleEnabled && spocPlacements.includes("newtab_rectangle");
    const billboardPressed = billboardsEnabled && spocPlacements.includes("newtab_billboard");
    const leaderboardPressed = leaderboardEnabled && spocPlacements.includes("newtab_leaderboard");
    return /*#__PURE__*/external_React_default().createElement("div", null, /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.restorePrefDefaults
    }, "Restore Pref Defaults"), " ", /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.refreshCache
    }, "Refresh Cache"), /*#__PURE__*/external_React_default().createElement("br", null), /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.expireCache
    }, "Expire Cache"), " ", /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.systemTick
    }, "Trigger System Tick"), " ", /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.idleDaily
    }, "Trigger Idle Daily"), /*#__PURE__*/external_React_default().createElement("br", null), /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.refreshInferredPersonalization
    }, "Refresh Inferred Personalization"), /*#__PURE__*/external_React_default().createElement("br", null), /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.syncRemoteSettings
    }, "Sync Remote Settings"), " ", /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.refreshTopicSelectionCache
    }, "Refresh Topic selection count"), /*#__PURE__*/external_React_default().createElement("br", null), /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.showPlaceholder
    }, "Show Placeholder Cards"), " ", /*#__PURE__*/external_React_default().createElement("div", {
      className: "toggle-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "sections-toggle",
      pressed: sectionsEnabled || null,
      onToggle: this.handleSectionsToggle,
      label: "Toggle DS Sections"
    })), /*#__PURE__*/external_React_default().createElement("details", {
      className: "details-section"
    }, /*#__PURE__*/external_React_default().createElement("summary", null, "IAB Banner Ad Sizes"), /*#__PURE__*/external_React_default().createElement("div", {
      className: "toggle-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "newtab_leaderboard",
      pressed: leaderboardPressed || null,
      onToggle: this.toggleIABBanners,
      label: "Enable IAB Leaderboard"
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "toggle-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "newtab_billboard",
      pressed: billboardPressed || null,
      onToggle: this.toggleIABBanners,
      label: "Enable IAB Billboard"
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "toggle-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "newtab_rectangle",
      pressed: mediumRectangleEnabledPressed || null,
      onToggle: this.toggleIABBanners,
      label: "Enable IAB Medium Rectangle (MREC)"
    }))), /*#__PURE__*/external_React_default().createElement("button", {
      className: "button",
      onClick: this.sendConversionEvent
    }, "Send conversion event"), /*#__PURE__*/external_React_default().createElement("table", null, /*#__PURE__*/external_React_default().createElement("tbody", null, prefToggles.map(pref => /*#__PURE__*/external_React_default().createElement(Row, {
      key: pref
    }, /*#__PURE__*/external_React_default().createElement("td", null, /*#__PURE__*/external_React_default().createElement(TogglePrefCheckbox, {
      checked: config[pref],
      pref: pref,
      onChange: this.setConfigValue
    })))))), /*#__PURE__*/external_React_default().createElement("h3", null, "Layout"), layout.map((row, rowIndex) => /*#__PURE__*/external_React_default().createElement("div", {
      key: `row-${rowIndex}`
    }, row.components.map((component, componentIndex) => /*#__PURE__*/external_React_default().createElement("div", {
      key: `component-${componentIndex}`,
      className: "ds-component"
    }, this.renderComponent(row.width, component))))), /*#__PURE__*/external_React_default().createElement("h3", null, "Spocs"), this.renderSpocs(), /*#__PURE__*/external_React_default().createElement("h3", null, "Feeds Data"), /*#__PURE__*/external_React_default().createElement("div", {
      className: "large-data-container"
    }, this.renderFeedsData()), /*#__PURE__*/external_React_default().createElement("h3", null, "Impressions Data"), /*#__PURE__*/external_React_default().createElement("div", {
      className: "large-data-container"
    }, this.renderImpressionsData()), /*#__PURE__*/external_React_default().createElement("h3", null, "Blocked Data"), /*#__PURE__*/external_React_default().createElement("div", {
      className: "large-data-container"
    }, this.renderBlocksData()), /*#__PURE__*/external_React_default().createElement("h3", null, "Weather Data"), this.renderWeatherData(), /*#__PURE__*/external_React_default().createElement("h3", null, "Personalization Data"), this.renderPersonalizationData());
  }
}
class DiscoveryStreamAdminInner extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.setState = this.setState.bind(this);
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: `discoverystream-admin ${this.props.collapsed ? "collapsed" : "expanded"}`
    }, /*#__PURE__*/external_React_default().createElement("main", {
      className: "main-panel"
    }, /*#__PURE__*/external_React_default().createElement("h1", null, "Discovery Stream Admin"), /*#__PURE__*/external_React_default().createElement("p", {
      className: "helpLink"
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "icon icon-small-spacer icon-info"
    }), " ", /*#__PURE__*/external_React_default().createElement("span", null, "Need to access the ASRouter Admin dev tools?", " ", /*#__PURE__*/external_React_default().createElement("a", {
      target: "blank",
      href: "about:asrouter"
    }, "Click here"))), /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement(DiscoveryStreamAdminUI, {
      state: {
        DiscoveryStream: this.props.DiscoveryStream,
        Weather: this.props.Weather,
        InferredPersonalization: this.props.InferredPersonalization
      },
      otherPrefs: this.props.Prefs.values,
      dispatch: this.props.dispatch
    }))));
  }
}
function CollapseToggle(props) {
  const {
    devtoolsCollapsed
  } = props;
  const label = `${devtoolsCollapsed ? "Expand" : "Collapse"} devtools`;
  (0,external_React_namespaceObject.useEffect)(() => {
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
  return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("a", {
    href: devtoolsCollapsed ? "#devtools" : "#",
    title: label,
    "aria-label": label,
    className: `discoverystream-admin-toggle ${devtoolsCollapsed ? "expanded" : "collapsed"}`
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "icon icon-devtools"
  })), !devtoolsCollapsed ? /*#__PURE__*/external_React_default().createElement(DiscoveryStreamAdminInner, _extends({}, props, {
    collapsed: devtoolsCollapsed
  })) : null);
}
const _DiscoveryStreamAdmin = props => /*#__PURE__*/external_React_default().createElement(CollapseToggle, props);
const DiscoveryStreamAdmin = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Sections: state.Sections,
  DiscoveryStream: state.DiscoveryStream,
  InferredPersonalization: state.InferredPersonalization,
  Prefs: state.Prefs,
  Weather: state.Weather
}))(_DiscoveryStreamAdmin);
;// CONCATENATED MODULE: ./content-src/components/ConfirmDialog/ConfirmDialog.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





/**
 * ConfirmDialog component.
 * One primary action button, one cancel button.
 *
 * Content displayed is controlled by `data` prop the component receives.
 * Example:
 * data: {
 *   // Any sort of data needed to be passed around by actions.
 *   payload: site.url,
 *   // Primary button AlsoToMain action.
 *   action: "DELETE_HISTORY_URL",
 *   // Primary button USerEvent action.
 *   userEvent: "DELETE",
 *   // Array of locale ids to display.
 *   message_body: ["confirm_history_delete_p1", "confirm_history_delete_notice_p2"],
 *   // Text for primary button.
 *   confirm_button_string_id: "menu_action_delete"
 * },
 */
class _ConfirmDialog extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this._handleCancelBtn = this._handleCancelBtn.bind(this);
    this._handleConfirmBtn = this._handleConfirmBtn.bind(this);
    this.dialogRef = /*#__PURE__*/external_React_default().createRef();
  }
  componentDidUpdate() {
    const dialogElement = this.dialogRef.current;
    if (!dialogElement) {
      return;
    }

    // Open dialog when visible becomes true
    if (this.props.visible && !dialogElement.open) {
      dialogElement.showModal();
    }
    // Close dialog when visible becomes false
    else if (!this.props.visible && dialogElement.open) {
      dialogElement.close();
    }
  }
  _handleCancelBtn() {
    this.props.dispatch({
      type: actionTypes.DIALOG_CANCEL
    });
    this.props.dispatch(actionCreators.UserEvent({
      event: actionTypes.DIALOG_CANCEL,
      source: this.props.data.eventSource
    }));
  }
  _handleConfirmBtn() {
    this.props.data.onConfirm.forEach(this.props.dispatch);
  }
  _renderModalMessage() {
    const message_body = this.props.data.body_string_id;
    if (!message_body) {
      return null;
    }
    return /*#__PURE__*/external_React_default().createElement("span", null, message_body.map(msg => /*#__PURE__*/external_React_default().createElement("p", {
      key: msg,
      "data-l10n-id": msg
    })));
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("dialog", {
      ref: this.dialogRef,
      className: "confirmation-dialog",
      onClick: e => {
        // Close modal when clicking on the backdrop pseudo element (the background of the modal)
        if (e.target === this.dialogRef.current) {
          this._handleCancelBtn();
        }
      }
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "modal"
    }, /*#__PURE__*/external_React_default().createElement("section", {
      className: "modal-message"
    }, this.props.data.icon && /*#__PURE__*/external_React_default().createElement("span", {
      className: `icon icon-spacer icon-${this.props.data.icon}`
    }), this._renderModalMessage()), /*#__PURE__*/external_React_default().createElement("section", {
      className: "button-group"
    }, /*#__PURE__*/external_React_default().createElement("moz-button-group", null, /*#__PURE__*/external_React_default().createElement("moz-button", {
      onClick: this._handleCancelBtn,
      "data-l10n-id": this.props.data.cancel_button_string_id
    }), /*#__PURE__*/external_React_default().createElement("moz-button", {
      type: "primary",
      onClick: this._handleConfirmBtn,
      "data-l10n-id": this.props.data.confirm_button_string_id,
      "data-l10n-args": JSON.stringify(this.props.data.confirm_button_string_args)
    })))));
  }
}
const ConfirmDialog = (0,external_ReactRedux_namespaceObject.connect)(state => state.Dialog)(_ConfirmDialog);
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/DSImage/DSImage.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


const PLACEHOLDER_IMAGE_DATA_ARRAY = [{
  rotation: "0deg",
  offsetx: "20px",
  offsety: "8px",
  scale: "45%"
}, {
  rotation: "54deg",
  offsetx: "-26px",
  offsety: "62px",
  scale: "55%"
}, {
  rotation: "-30deg",
  offsetx: "78px",
  offsety: "30px",
  scale: "68%"
}, {
  rotation: "-22deg",
  offsetx: "0",
  offsety: "92px",
  scale: "60%"
}, {
  rotation: "-65deg",
  offsetx: "66px",
  offsety: "28px",
  scale: "60%"
}, {
  rotation: "22deg",
  offsetx: "-35px",
  offsety: "62px",
  scale: "52%"
}, {
  rotation: "-25deg",
  offsetx: "86px",
  offsety: "-15px",
  scale: "68%"
}];
const PLACEHOLDER_IMAGE_COLORS_ARRAY = "#0090ED #FF4F5F #2AC3A2 #FF7139 #A172FF #FFA437 #FF2A8A".split(" ");
function generateIndex({
  keyCode,
  max
}) {
  if (!keyCode) {
    // Just grab a random index if we cannot generate an index from a key.
    return Math.floor(Math.random() * max);
  }
  const hashStr = str => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      let charCode = str.charCodeAt(i);
      hash += charCode;
    }
    return hash;
  };
  const hash = hashStr(keyCode);
  return hash % max;
}
function PlaceholderImage({
  urlKey,
  titleKey
}) {
  const dataIndex = generateIndex({
    keyCode: urlKey,
    max: PLACEHOLDER_IMAGE_DATA_ARRAY.length
  });
  const colorIndex = generateIndex({
    keyCode: titleKey,
    max: PLACEHOLDER_IMAGE_COLORS_ARRAY.length
  });
  const {
    rotation,
    offsetx,
    offsety,
    scale
  } = PLACEHOLDER_IMAGE_DATA_ARRAY[dataIndex];
  const color = PLACEHOLDER_IMAGE_COLORS_ARRAY[colorIndex];
  const style = {
    "--placeholderBackgroundColor": color,
    "--placeholderBackgroundRotation": rotation,
    "--placeholderBackgroundOffsetx": offsetx,
    "--placeholderBackgroundOffsety": offsety,
    "--placeholderBackgroundScale": scale
  };
  return /*#__PURE__*/external_React_default().createElement("div", {
    style: style,
    className: "placeholder-image"
  });
}
class DSImage extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onOptimizedImageError = this.onOptimizedImageError.bind(this);
    this.onNonOptimizedImageError = this.onNonOptimizedImageError.bind(this);
    this.onLoad = this.onLoad.bind(this);
    this.state = {
      isLoaded: false,
      optimizedImageFailed: false,
      useTransition: false
    };
  }
  onIdleCallback() {
    if (!this.state.isLoaded) {
      this.setState({
        useTransition: true
      });
    }
  }

  // Wraps the image url with the Pocket proxy to both resize and crop the image.
  reformatImageURL(url, width, height) {
    const smart = this.props.smartCrop ? "smart/" : "";
    // Change the image URL to request a size tailored for the parent container width
    // Also: force WebP, quality 75, no upscaling, no EXIF data
    // Uses Thumbor: https://thumbor.readthedocs.io/en/latest/usage.html
    const formattedUrl = `https://img-getpocket.cdn.mozilla.net/${width}x${height}/${smart}filters:format(webp):quality(75):no_upscale():strip_exif()/${encodeURIComponent(url)}`;
    return this.secureImageURL(formattedUrl);
  }

  // Wraps the image URL with the moz-cached-ohttp:// protocol.
  // This enables Firefox to load resources over Oblivious HTTP (OHTTP),
  // providing privacy-preserving resource loading.
  // Applied only when inferred personalization is enabled.
  // See: https://firefox-source-docs.mozilla.org/browser/components/mozcachedohttp/docs/index.html
  secureImageURL(url) {
    if (!this.props.secureImage) {
      return url;
    }
    return `moz-cached-ohttp://newtab-image/?url=${encodeURIComponent(url)}`;
  }
  componentDidMount() {
    this.idleCallbackId = this.props.windowObj.requestIdleCallback(this.onIdleCallback.bind(this));
  }
  componentWillUnmount() {
    if (this.idleCallbackId) {
      this.props.windowObj.cancelIdleCallback(this.idleCallbackId);
    }
  }
  render() {
    let classNames = `ds-image
      ${this.props.extraClassNames ? ` ${this.props.extraClassNames}` : ``}
      ${this.state && this.state.useTransition ? ` use-transition` : ``}
      ${this.state && this.state.isLoaded ? ` loaded` : ``}
    `;
    let img;
    if (this.state) {
      if (this.props.optimize && this.props.rawSource && !this.state.optimizedImageFailed) {
        const baseSource = this.props.rawSource;

        // We don't care about securing this.props.source, as this exclusivly
        // comes from an older service that is not personalized.
        // This can also return a non secure url if this functionality is not enabled.
        const securedSource = this.secureImageURL(baseSource);
        let sizeRules = [];
        let srcSetRules = [];
        for (let rule of this.props.sizes) {
          let {
            mediaMatcher,
            width,
            height
          } = rule;
          let sizeRule = `${mediaMatcher} ${width}px`;
          sizeRules.push(sizeRule);
          let srcSetRule = `${this.reformatImageURL(baseSource, width, height)} ${width}w`;
          let srcSetRule2x = `${this.reformatImageURL(baseSource, width * 2, height * 2)} ${width * 2}w`;
          srcSetRules.push(srcSetRule);
          srcSetRules.push(srcSetRule2x);
        }
        if (this.props.sizes.length) {
          // We have to supply a fallback in the very unlikely event that none of
          // the media queries match. The smallest dimension was chosen arbitrarily.
          sizeRules.push(`${this.props.sizes[this.props.sizes.length - 1].width}px`);
        }
        img = /*#__PURE__*/external_React_default().createElement("img", {
          loading: "lazy",
          alt: this.props.alt_text,
          crossOrigin: "anonymous",
          onLoad: this.onLoad,
          onError: this.onOptimizedImageError,
          sizes: sizeRules.join(","),
          src: securedSource,
          srcSet: srcSetRules.join(",")
        });
      } else if (this.props.source && !this.state.nonOptimizedImageFailed) {
        img = /*#__PURE__*/external_React_default().createElement("img", {
          loading: "lazy",
          alt: this.props.alt_text,
          crossOrigin: "anonymous",
          onLoad: this.onLoad,
          onError: this.onNonOptimizedImageError,
          src: this.props.source
        });
      } else {
        // We consider a failed to load img or source without an image as loaded.
        classNames = `${classNames} loaded`;
        // Remove the img element if we have no source. Render a placeholder instead.
        // This only happens for recent saves without a source.
        if (this.props.isRecentSave && !this.props.rawSource && !this.props.source) {
          img = /*#__PURE__*/external_React_default().createElement(PlaceholderImage, {
            urlKey: this.props.url,
            titleKey: this.props.title
          });
        } else {
          img = /*#__PURE__*/external_React_default().createElement("div", {
            className: "broken-image"
          });
        }
      }
    }
    return /*#__PURE__*/external_React_default().createElement("picture", {
      className: classNames
    }, img);
  }
  onOptimizedImageError() {
    // This will trigger a re-render and the unoptimized 450px image will be used as a fallback
    this.setState({
      optimizedImageFailed: true
    });
  }
  onNonOptimizedImageError() {
    this.setState({
      nonOptimizedImageFailed: true
    });
  }
  onLoad() {
    this.setState({
      isLoaded: true
    });
  }
}
DSImage.defaultProps = {
  source: null,
  // The current source style from Pocket API (always 450px)
  rawSource: null,
  // Unadulterated image URL to filter through Thumbor
  extraClassNames: null,
  // Additional classnames to append to component
  optimize: true,
  // Measure parent container to request exact sizes
  alt_text: "",
  windowObj: window,
  // Added to support unit tests
  sizes: []
};
;// CONCATENATED MODULE: ./content-src/components/ContextMenu/ContextMenu.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



class ContextMenu extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.hideContext = this.hideContext.bind(this);
    this.onShow = this.onShow.bind(this);
    this.onClick = this.onClick.bind(this);
  }
  hideContext() {
    this.props.onUpdate(false);
  }
  onShow() {
    if (this.props.onShow) {
      this.props.onShow();
    }
  }
  componentDidMount() {
    this.onShow();
    setTimeout(() => {
      globalThis.addEventListener("click", this.hideContext);
    }, 0);
  }
  componentWillUnmount() {
    globalThis.removeEventListener("click", this.hideContext);
  }
  onClick(event) {
    // Eat all clicks on the context menu so they don't bubble up to window.
    // This prevents the context menu from closing when clicking disabled items
    // or the separators.
    event.stopPropagation();
  }
  render() {
    // Disabling focus on the menu span allows the first tab to focus on the first menu item instead of the wrapper.
    return (
      /*#__PURE__*/
      // eslint-disable-next-line jsx-a11y/interactive-supports-focus
      external_React_default().createElement("span", {
        className: "context-menu"
      }, /*#__PURE__*/external_React_default().createElement("ul", {
        role: "menu",
        onClick: this.onClick,
        onKeyDown: this.onClick,
        className: "context-menu-list"
      }, this.props.options.map((option, i) => option.type === "separator" ? /*#__PURE__*/external_React_default().createElement("li", {
        key: i,
        className: "separator",
        role: "separator"
      }) : option.type !== "empty" && /*#__PURE__*/external_React_default().createElement(ContextMenuItem, {
        key: i,
        option: option,
        hideContext: this.hideContext,
        keyboardAccess: this.props.keyboardAccess
      }))))
    );
  }
}
class _ContextMenuItem extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.focusFirst = this.focusFirst.bind(this);
  }
  onClick(event) {
    this.props.hideContext();
    this.props.option.onClick(event);
  }

  // Focus the first menu item if the menu was accessed via the keyboard.
  focusFirst(button) {
    if (this.props.keyboardAccess && button) {
      button.focus();
    }
  }

  // This selects the correct node based on the key pressed
  focusSibling(target, key) {
    const {
      parentNode
    } = target;
    const closestSiblingSelector = key === "ArrowUp" ? "previousSibling" : "nextSibling";
    if (!parentNode[closestSiblingSelector]) {
      return;
    }
    if (parentNode[closestSiblingSelector].firstElementChild) {
      parentNode[closestSiblingSelector].firstElementChild.focus();
    } else {
      parentNode[closestSiblingSelector][closestSiblingSelector].firstElementChild.focus();
    }
  }
  onKeyDown(event) {
    const {
      option
    } = this.props;
    switch (event.key) {
      case "Tab":
        // tab goes down in context menu, shift + tab goes up in context menu
        // if we're on the last item, one more tab will close the context menu
        // similarly, if we're on the first item, one more shift + tab will close it
        if (event.shiftKey && option.first || !event.shiftKey && option.last) {
          this.props.hideContext();
        }
        break;
      case "ArrowUp":
      case "ArrowDown":
        event.preventDefault();
        this.focusSibling(event.target, event.key);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        this.props.hideContext();
        option.onClick();
        break;
      case "Escape":
        this.props.hideContext();
        break;
    }
  }

  // Prevents the default behavior of spacebar
  // scrolling the page & auto-triggering buttons.
  onKeyUp(event) {
    if (event.key === " ") {
      event.preventDefault();
    }
  }
  render() {
    const {
      option
    } = this.props;
    const className = [option.disabled ? "disabled" : ""].join(" ");
    return /*#__PURE__*/external_React_default().createElement("li", {
      role: "presentation",
      className: "context-menu-item"
    }, /*#__PURE__*/external_React_default().createElement("button", {
      role: "menuitem",
      className: className,
      onClick: this.onClick,
      onKeyDown: this.onKeyDown,
      onKeyUp: this.onKeyUp,
      ref: option.first ? this.focusFirst : null,
      "aria-haspopup": option.id === "newtab-menu-edit-topsites" ? "dialog" : null
    }, /*#__PURE__*/external_React_default().createElement("span", {
      "data-l10n-id": option.string_id || option.id
    })));
  }
}
const ContextMenuItem = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Prefs: state.Prefs
}))(_ContextMenuItem);
;// CONCATENATED MODULE: ./content-src/lib/link-menu-options.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



const _OpenInPrivateWindow = site => ({
  id: "newtab-menu-open-new-private-window",
  icon: "new-window-private",
  action: actionCreators.OnlyToMain({
    type: actionTypes.OPEN_PRIVATE_WINDOW,
    data: {
      url: site.url,
      referrer: site.referrer,
      event_source: "CONTEXT_MENU",
    },
  }),
  userEvent: "OPEN_PRIVATE_WINDOW",
});

/**
 * List of functions that return items that can be included as menu options in a
 * LinkMenu. All functions take the site as the first parameter, and optionally
 * the index of the site.
 */
const LinkMenuOptions = {
  Separator: () => ({ type: "separator" }),
  EmptyItem: () => ({ type: "empty" }),
  ShowPrivacyInfo: () => ({
    id: "newtab-menu-show-privacy-info",
    icon: "info",
    action: {
      type: actionTypes.SHOW_PRIVACY_INFO,
    },
    userEvent: "SHOW_PRIVACY_INFO",
  }),
  AboutSponsored: site => ({
    id: "newtab-menu-show-privacy-info",
    icon: "info",
    action: actionCreators.AlsoToMain({
      type: actionTypes.ABOUT_SPONSORED_TOP_SITES,
      data: {
        advertiser_name: (site.label || site.hostname).toLocaleLowerCase(),
        position: site.sponsored_position,
        tile_id: site.sponsored_tile_id,
        block_key: site.block_key,
      },
    }),
    userEvent: "TOPSITE_SPONSOR_INFO",
  }),
  RemoveBookmark: site => ({
    id: "newtab-menu-remove-bookmark",
    icon: "bookmark-added",
    action: actionCreators.AlsoToMain({
      type: actionTypes.DELETE_BOOKMARK_BY_ID,
      data: site.bookmarkGuid,
    }),
    userEvent: "BOOKMARK_DELETE",
  }),
  AddBookmark: site => ({
    id: "newtab-menu-bookmark",
    icon: "bookmark-hollow",
    action: actionCreators.AlsoToMain({
      type: actionTypes.BOOKMARK_URL,
      data: { url: site.url, title: site.title, type: site.type },
    }),
    userEvent: "BOOKMARK_ADD",
  }),
  OpenInNewWindow: site => ({
    id: "newtab-menu-open-new-window",
    icon: "new-window",
    action: actionCreators.AlsoToMain({
      type: actionTypes.OPEN_NEW_WINDOW,
      data: {
        card_type: site.card_type,
        referrer: site.referrer,
        typedBonus: site.typedBonus,
        url: site.url,
        is_sponsored: !!site.sponsored_tile_id,
        event_source: "CONTEXT_MENU",
        topic: site.topic,
        firstVisibleTimestamp: site.firstVisibleTimestamp,
        tile_id: site.tile_id,
        recommendation_id: site.recommendation_id,
        scheduled_corpus_item_id: site.scheduled_corpus_item_id,
        corpus_item_id: site.corpus_item_id,
        received_rank: site.received_rank,
        recommended_at: site.recommended_at,
        format: site.format,
        ...(site.flight_id ? { flight_id: site.flight_id } : {}),
        is_pocket_card: site.type === "CardGrid",
        ...(site.section
          ? {
              section: site.section,
              section_position: site.section_position,
              is_section_followed: site.is_section_followed,
            }
          : {}),
      },
    }),
    userEvent: "OPEN_NEW_WINDOW",
  }),

  // This blocks the url for regular stories,
  // but also sends a message to DiscoveryStream with flight_id.
  // If DiscoveryStream sees this message for a flight_id
  // it also blocks it on the flight_id.
  BlockUrl: (site, index, eventSource) => {
    return LinkMenuOptions.BlockUrls([site], index, eventSource);
  },
  // Same as BlockUrl, except can work on an array of sites.
  BlockUrls: (tiles, pos, eventSource) => ({
    id: "newtab-menu-dismiss",
    icon: "dismiss",
    action: actionCreators.AlsoToMain({
      type: actionTypes.BLOCK_URL,
      source: eventSource,
      data: tiles.map(site => ({
        url: site.original_url || site.open_url || site.url,
        // pocket_id is only for pocket stories being in highlights, and then dismissed.
        pocket_id: site.pocket_id,
        tile_id: site.tile_id,
        ...(site.block_key ? { block_key: site.block_key } : {}),
        recommendation_id: site.recommendation_id,
        scheduled_corpus_item_id: site.scheduled_corpus_item_id,
        corpus_item_id: site.corpus_item_id,
        received_rank: site.received_rank,
        recommended_at: site.recommended_at,
        // used by PlacesFeed and TopSitesFeed for sponsored top sites blocking.
        isSponsoredTopSite: site.sponsored_position,
        type: site.type,
        card_type: site.card_type,
        ...(site.shim && site.shim.delete ? { shim: site.shim.delete } : {}),
        ...(site.flight_id ? { flight_id: site.flight_id } : {}),
        // If not sponsored, hostname could be anything (Cat3 Data!).
        // So only put in advertiser_name for sponsored topsites.
        ...(site.sponsored_position
          ? {
              advertiser_name: (
                site.label || site.hostname
              )?.toLocaleLowerCase(),
            }
          : {}),
        position: pos,
        ...(site.sponsored_tile_id ? { tile_id: site.sponsored_tile_id } : {}),
        is_pocket_card: site.type === "CardGrid",
        ...(site.format ? { format: site.format } : {}),
        ...(site.section
          ? {
              section: site.section,
              section_position: site.section_position,
              is_section_followed: site.is_section_followed,
            }
          : {}),
      })),
    }),
    impression: actionCreators.ImpressionStats({
      source: eventSource,
      block: 0,
      tiles: tiles.map((site, index) => ({
        id: site.guid,
        pos: pos + index,
        ...(site.shim && site.shim.delete ? { shim: site.shim.delete } : {}),
      })),
    }),
    userEvent: "BLOCK",
  }),

  // This is the "Dismiss" action for leaderboard/billboard ads.
  BlockAdUrl: (site, pos, eventSource) => ({
    id: "newtab-menu-dismiss",
    icon: "dismiss",
    action: actionCreators.AlsoToMain({
      type: actionTypes.BLOCK_URL,
      data: [site],
    }),
    impression: actionCreators.ImpressionStats({
      source: eventSource,
      block: 0,
      tiles: [
        {
          id: site.guid,
          pos,
          ...(site.shim && site.shim.save ? { shim: site.shim.save } : {}),
        },
      ],
    }),
    userEvent: "BLOCK",
  }),

  // This is an option for web extentions which will result in remove items from
  // memory and notify the web extenion, rather than using the built-in block list.
  WebExtDismiss: (site, index, eventSource) => ({
    id: "menu_action_webext_dismiss",
    string_id: "newtab-menu-dismiss",
    icon: "dismiss",
    action: actionCreators.WebExtEvent(actionTypes.WEBEXT_DISMISS, {
      source: eventSource,
      url: site.url,
      action_position: index,
    }),
  }),
  DeleteUrl: (site, index, eventSource, isEnabled, siteInfo) => ({
    id: "newtab-menu-delete-history",
    icon: "delete",
    action: {
      type: actionTypes.DIALOG_OPEN,
      data: {
        onConfirm: [
          actionCreators.AlsoToMain({
            type: actionTypes.DELETE_HISTORY_URL,
            data: {
              url: site.url,
              pocket_id: site.pocket_id,
              forceBlock: site.bookmarkGuid,
            },
          }),
          actionCreators.UserEvent(
            Object.assign(
              { event: "DELETE", source: eventSource, action_position: index },
              siteInfo
            )
          ),
          // Also broadcast that this url has been deleted so that
          // the confirmation dialog knows it needs to disappear now.
          actionCreators.AlsoToMain({
            type: actionTypes.DIALOG_CLOSE,
          }),
        ],
        eventSource,
        body_string_id: [
          "newtab-confirm-delete-history-p1",
          "newtab-confirm-delete-history-p2",
        ],
        confirm_button_string_id: "newtab-topsites-delete-history-button",
        cancel_button_string_id: "newtab-topsites-cancel-button",
        icon: "modal-delete",
      },
    },
    userEvent: "DIALOG_OPEN",
  }),
  ShowFile: site => ({
    id: "newtab-menu-show-file",
    icon: "search",
    action: actionCreators.OnlyToMain({
      type: actionTypes.SHOW_DOWNLOAD_FILE,
      data: { url: site.url },
    }),
  }),
  OpenFile: site => ({
    id: "newtab-menu-open-file",
    icon: "open-file",
    action: actionCreators.OnlyToMain({
      type: actionTypes.OPEN_DOWNLOAD_FILE,
      data: { url: site.url },
    }),
  }),
  CopyDownloadLink: site => ({
    id: "newtab-menu-copy-download-link",
    icon: "copy",
    action: actionCreators.OnlyToMain({
      type: actionTypes.COPY_DOWNLOAD_LINK,
      data: { url: site.url },
    }),
  }),
  GoToDownloadPage: site => ({
    id: "newtab-menu-go-to-download-page",
    icon: "download",
    action: actionCreators.OnlyToMain({
      type: actionTypes.OPEN_LINK,
      data: { url: site.referrer },
    }),
    disabled: !site.referrer,
  }),
  RemoveDownload: site => ({
    id: "newtab-menu-remove-download",
    icon: "delete",
    action: actionCreators.OnlyToMain({
      type: actionTypes.REMOVE_DOWNLOAD_FILE,
      data: { url: site.url },
    }),
  }),
  PinTopSite: (site, index) => ({
    id: "newtab-menu-pin",
    icon: "pin",
    action: actionCreators.AlsoToMain({
      type: actionTypes.TOP_SITES_PIN,
      data: {
        site,
        index,
      },
    }),
    userEvent: "PIN",
  }),
  UnpinTopSite: site => ({
    id: "newtab-menu-unpin",
    icon: "unpin",
    action: actionCreators.AlsoToMain({
      type: actionTypes.TOP_SITES_UNPIN,
      data: { site: { url: site.url } },
    }),
    userEvent: "UNPIN",
  }),
  EditTopSite: (site, index) => ({
    id: "newtab-menu-edit-topsites",
    icon: "edit",
    action: {
      type: actionTypes.TOP_SITES_EDIT,
      data: { index },
    },
  }),
  CheckBookmark: site =>
    site.bookmarkGuid
      ? LinkMenuOptions.RemoveBookmark(site)
      : LinkMenuOptions.AddBookmark(site),
  CheckPinTopSite: (site, index) =>
    site.isPinned
      ? LinkMenuOptions.UnpinTopSite(site)
      : LinkMenuOptions.PinTopSite(site, index),
  OpenInPrivateWindow: (site, index, eventSource, isEnabled) =>
    isEnabled ? _OpenInPrivateWindow(site) : LinkMenuOptions.EmptyItem(),
  SectionBlock: ({
    sectionPersonalization,
    sectionKey,
    sectionPosition,
    title,
  }) => ({
    id: "newtab-menu-section-block",
    icon: "delete",
    action: {
      // Open the confirmation dialog to block a section.
      type: actionTypes.DIALOG_OPEN,
      data: {
        onConfirm: [
          // Once the user confirmed their intention to block this section,
          // update their preferences.
          actionCreators.AlsoToMain({
            type: actionTypes.SECTION_PERSONALIZATION_SET,
            data: {
              ...sectionPersonalization,
              [sectionKey]: {
                isBlocked: true,
                isFollowed: false,
              },
            },
          }),
          // Telemetry
          actionCreators.OnlyToMain({
            type: actionTypes.BLOCK_SECTION,
            data: {
              section: sectionKey,
              section_position: sectionPosition,
              event_source: "CONTEXT_MENU",
            },
          }),
          // Also broadcast that this section has been blocked so that
          // the confirmation dialog knows it needs to disappear now.
          actionCreators.AlsoToMain({
            type: actionTypes.DIALOG_CLOSE,
          }),
        ],
        // Pass Fluent strings to ConfirmDialog component for the copy
        // of the prompt to block sections.
        body_string_id: [
          "newtab-section-confirm-block-topic-p1",
          "newtab-section-confirm-block-topic-p2",
        ],
        confirm_button_string_id: "newtab-section-block-topic-button",
        confirm_button_string_args: { topic: title },
        cancel_button_string_id: "newtab-section-cancel-button",
      },
    },
    userEvent: "DIALOG_OPEN",
  }),
  SectionUnfollow: ({
    sectionPersonalization,
    sectionKey,
    sectionPosition,
  }) => ({
    id: "newtab-menu-section-unfollow",
    action: actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: (({ [sectionKey]: _sectionKey, ...remaining }) => remaining)(
        sectionPersonalization
      ),
    }),
    impression: actionCreators.OnlyToMain({
      type: actionTypes.UNFOLLOW_SECTION,
      data: {
        section: sectionKey,
        section_position: sectionPosition,
        event_source: "CONTEXT_MENU",
      },
    }),
  }),
  ManageSponsoredContent: () => ({
    id: "newtab-menu-manage-sponsored-content",
    action: actionCreators.OnlyToMain({ type: actionTypes.SETTINGS_OPEN }),
    userEvent: "OPEN_NEWTAB_PREFS",
  }),
  // eslint-disable-next-line max-params
  OurSponsorsAndYourPrivacy: (
    site,
    index,
    source,
    isPrivateBrowsingEnabled,
    siteInfo,
    platform,
    privacyInfoUrl
  ) => ({
    id: "newtab-menu-our-sponsors-and-your-privacy",
    action: actionCreators.OnlyToMain({
      type: actionTypes.OPEN_LINK,
      data: {
        url: privacyInfoUrl,
      },
    }),
    userEvent: "CLICK_PRIVACY_INFO",
  }),
  ReportAd: site => {
    return {
      id: "newtab-menu-report-this-ad",
      action: actionCreators.AlsoToMain({
        type: actionTypes.REPORT_AD_OPEN,
        data: {
          card_type: site.card_type,
          position: site.position,
          reporting_url: site.shim.report,
          url: site.url,
        },
      }),
    };
  },

  ReportContent: site => {
    return {
      id: "newtab-menu-report",
      action: actionCreators.AlsoToMain({
        type: actionTypes.REPORT_CONTENT_OPEN,
        data: {
          card_type: site.card_type,
          corpus_item_id: site.corpus_item_id,
          scheduled_corpus_item_id: site.scheduled_corpus_item_id,
          section_position: site.section_position,
          section: site.section,
          title: site.title,
          topic: site.topic,
          url: site.url,
        },
      }),
    };
  },
};

;// CONCATENATED MODULE: ./content-src/components/LinkMenu/LinkMenu.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */






const DEFAULT_SITE_MENU_OPTIONS = ["CheckPinTopSite", "EditTopSite", "Separator", "OpenInNewWindow", "OpenInPrivateWindow", "Separator", "BlockUrl"];
class _LinkMenu extends (external_React_default()).PureComponent {
  getOptions() {
    const {
      props
    } = this;
    const {
      site,
      index,
      source,
      isPrivateBrowsingEnabled,
      siteInfo,
      platform,
      privacyInfoUrl,
      dispatch,
      options,
      shouldSendImpressionStats,
      userEvent = actionCreators.UserEvent
    } = props;

    // Handle special case of default site
    const propOptions = site.isDefault && !site.searchTopSite && !site.sponsored_position ? DEFAULT_SITE_MENU_OPTIONS : options;
    const linkMenuOptions = propOptions.map(o => LinkMenuOptions[o](site, index, source, isPrivateBrowsingEnabled, siteInfo, platform, privacyInfoUrl)).map(option => {
      const {
        action,
        impression,
        id,
        type,
        userEvent: eventName
      } = option;
      if (!type && id) {
        option.onClick = (event = {}) => {
          const {
            ctrlKey,
            metaKey,
            shiftKey,
            button
          } = event;
          // Only send along event info if there's something non-default to send
          if (ctrlKey || metaKey || shiftKey || button === 1) {
            action.data = Object.assign({
              event: {
                ctrlKey,
                metaKey,
                shiftKey,
                button
              }
            }, action.data);
          }
          dispatch(action);
          if (eventName) {
            let value;
            // Bug 1958135: Pass additional info to ac.OPEN_NEW_WINDOW event
            if (action.type === "OPEN_NEW_WINDOW") {
              const {
                card_type,
                corpus_item_id,
                event_source,
                fetchTimestamp,
                firstVisibleTimestamp,
                format,
                is_section_followed,
                received_rank,
                recommendation_id,
                recommended_at,
                scheduled_corpus_item_id,
                section_position,
                section,
                selected_topics,
                tile_id,
                topic
              } = action.data;
              value = {
                card_type,
                corpus_item_id,
                event_source,
                fetchTimestamp,
                firstVisibleTimestamp,
                format,
                received_rank,
                recommendation_id,
                recommended_at,
                scheduled_corpus_item_id,
                ...(section ? {
                  is_section_followed,
                  section_position,
                  section
                } : {}),
                selected_topics: selected_topics ? selected_topics : "",
                tile_id,
                topic
              };
            } else {
              value = {
                card_type: site.flight_id ? "spoc" : "organic"
              };
            }
            const userEventData = Object.assign({
              event: eventName,
              source,
              action_position: index,
              value
            }, siteInfo);
            dispatch(userEvent(userEventData));
            if (impression && shouldSendImpressionStats) {
              dispatch(impression);
            }
          }
        };
      }
      return option;
    });

    // This is for accessibility to support making each item tabbable.
    // We want to know which item is the first and which item
    // is the last, so we can close the context menu accordingly.
    linkMenuOptions[0].first = true;
    linkMenuOptions[linkMenuOptions.length - 1].last = true;
    return linkMenuOptions;
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement(ContextMenu, {
      onUpdate: this.props.onUpdate,
      onShow: this.props.onShow,
      options: this.getOptions(),
      keyboardAccess: this.props.keyboardAccess
    });
  }
}
const getState = state => ({
  isPrivateBrowsingEnabled: state.Prefs.values.isPrivateBrowsingEnabled,
  platform: state.Prefs.values.platform,
  privacyInfoUrl: state.Prefs.values["privacyInfo.url"]
});
const LinkMenu = (0,external_ReactRedux_namespaceObject.connect)(getState)(_LinkMenu);
;// CONCATENATED MODULE: ./content-src/components/ContextMenu/ContextMenuButton.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


class ContextMenuButton extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showContextMenu: false,
      contextMenuKeyboard: false
    };
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }
  openContextMenu(isKeyBoard) {
    if (this.props.onUpdate) {
      this.props.onUpdate(true);
    }
    this.setState({
      showContextMenu: true,
      contextMenuKeyboard: isKeyBoard
    });
  }
  onClick(event) {
    event.preventDefault();
    this.openContextMenu(false, event);
  }
  onKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      this.openContextMenu(true, event);
    }
  }
  onUpdate(showContextMenu) {
    if (this.props.onUpdate) {
      this.props.onUpdate(showContextMenu);
    }
    this.setState({
      showContextMenu
    });
  }
  render() {
    const {
      tooltipArgs,
      tooltip,
      children,
      refFunction
    } = this.props;
    const {
      showContextMenu,
      contextMenuKeyboard
    } = this.state;
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("button", {
      "aria-haspopup": "menu",
      "aria-expanded": showContextMenu,
      "data-l10n-id": tooltip,
      "data-l10n-args": tooltipArgs ? JSON.stringify(tooltipArgs) : null,
      className: "context-menu-button icon",
      onKeyDown: this.onKeyDown,
      onClick: this.onClick,
      ref: refFunction,
      tabIndex: this.props.tabIndex || 0,
      onFocus: this.props.onFocus
    }), showContextMenu ? /*#__PURE__*/external_React_default().cloneElement(children, {
      keyboardAccess: contextMenuKeyboard,
      onUpdate: this.onUpdate
    }) : null);
  }
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/DSLinkMenu/DSLinkMenu.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */






class _DSLinkMenu extends (external_React_default()).PureComponent {
  render() {
    const {
      index,
      dispatch
    } = this.props;
    let TOP_STORIES_CONTEXT_MENU_OPTIONS;
    const PREF_REPORT_ADS_ENABLED = "discoverystream.reportAds.enabled";
    const prefs = this.props.Prefs.values;
    const showAdsReporting = prefs[PREF_REPORT_ADS_ENABLED];
    const isSpoc = this.props.card_type === "spoc";
    if (isSpoc) {
      TOP_STORIES_CONTEXT_MENU_OPTIONS = ["BlockUrl", ...(showAdsReporting ? ["ReportAd"] : []), "ManageSponsoredContent", "OurSponsorsAndYourPrivacy"];
    } else {
      TOP_STORIES_CONTEXT_MENU_OPTIONS = ["CheckBookmark", "Separator", "OpenInNewWindow", "OpenInPrivateWindow", "Separator", "BlockUrl", ...(this.props.section ? ["ReportContent"] : [])];
    }
    const type = this.props.type || "DISCOVERY_STREAM";
    const title = this.props.title || this.props.source;
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "context-menu-position-container"
    }, /*#__PURE__*/external_React_default().createElement(ContextMenuButton, {
      tooltip: "newtab-menu-content-tooltip",
      tooltipArgs: {
        title
      },
      onUpdate: this.props.onMenuUpdate,
      tabIndex: this.props.tabIndex
    }, /*#__PURE__*/external_React_default().createElement(LinkMenu, {
      dispatch: dispatch,
      index: index,
      source: type.toUpperCase(),
      onShow: this.props.onMenuShow,
      options: TOP_STORIES_CONTEXT_MENU_OPTIONS,
      shouldSendImpressionStats: true,
      userEvent: actionCreators.DiscoveryStreamUserEvent,
      site: {
        referrer: "https://getpocket.com/recommendations",
        title: this.props.title,
        type: this.props.type,
        url: this.props.url,
        guid: this.props.id,
        pocket_id: this.props.pocket_id,
        card_type: this.props.card_type,
        shim: this.props.shim,
        bookmarkGuid: this.props.bookmarkGuid,
        flight_id: this.props.flightId,
        tile_id: this.props.tile_id,
        recommendation_id: this.props.recommendation_id,
        corpus_item_id: this.props.corpus_item_id,
        scheduled_corpus_item_id: this.props.scheduled_corpus_item_id,
        firstVisibleTimestamp: this.props.firstVisibleTimestamp,
        recommended_at: this.props.recommended_at,
        received_rank: this.props.received_rank,
        topic: this.props.topic,
        position: index,
        ...(this.props.format ? {
          format: this.props.format
        } : {}),
        ...(this.props.section ? {
          section: this.props.section,
          section_position: this.props.section_position,
          is_section_followed: this.props.is_section_followed
        } : {})
      }
    })));
  }
}
const DSLinkMenu = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Prefs: state.Prefs
}))(_DSLinkMenu);
;// CONCATENATED MODULE: ./content-src/lib/utils.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * A custom react hook that sets up an IntersectionObserver to observe a single
 * or list of elements and triggers a callback when the element comes into the viewport
 * Note: The refs used should be an array type
 *
 * @function useIntersectionObserver
 * @param {function} callback - The function to call when an element comes into the viewport
 * @param {object} options - Options object passed to Intersection Observer:
 * https://developer.mozilla.org/en-US/docs/Web/API/IntersectionObserver/IntersectionObserver#options
 * @param {boolean} [isSingle = false] Boolean if the elements are an array or single element
 *
 * @returns {React.MutableRefObject} a ref containing an array of elements or single element
 */
function useIntersectionObserver(callback, threshold = 0.3) {
  const elementsRef = (0,external_React_namespaceObject.useRef)([]);
  const triggeredElements = (0,external_React_namespaceObject.useRef)(new WeakSet());
  (0,external_React_namespaceObject.useEffect)(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !triggeredElements.current.has(entry.target)) {
          triggeredElements.current.add(entry.target);
          callback(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold
    });
    elementsRef.current.forEach(el => {
      if (el && !triggeredElements.current.has(el)) {
        observer.observe(el);
      }
    });

    // Cleanup function to disconnect observer on unmount
    return () => observer.disconnect();
  }, [callback, threshold]);
  return elementsRef;
}

/**
 * Determines which column layout is active based on the screen width
 *
 * @param {number} screenWidth - The current window width (in pixels)
 * @returns {string} The active column layout (e.g. "col-3", "col-2", "col-1")
 */
function getActiveColumnLayout(screenWidth) {
  const breakpoints = [{
    min: 1374,
    column: "col-4"
  },
  // $break-point-sections-variant
  {
    min: 1122,
    column: "col-3"
  },
  // $break-point-widest
  {
    min: 724,
    column: "col-2"
  },
  // $break-point-layout-variant
  {
    min: 0,
    column: "col-1"
  } // (default layout)
  ];
  return breakpoints.find(bp => screenWidth >= bp.min).column;
}

/**
 * Determines the active card size ("small", "medium", or "large") based on the screen width
 * and class names applied to the card element at the time of an event (example: click)
 *
 * @param {number} screenWidth - The current window width (in pixels).
 * @param {string | string[]} classNames - A string or array of class names applied to the sections card.
 * @param {boolean[]} sectionsEnabled - If sections is not enabled, all cards are `medium-card`
 * @param {number} flightId - Error ege case: This function should not be called on spocs, which have flightId
 * @returns {"small-card" | "medium-card" | "large-card" | null} The active card type, or null if none is matched.
 */
function getActiveCardSize(screenWidth, classNames, sectionsEnabled, flightId) {
  // Only applies to sponsored content
  if (flightId) {
    return "spoc";
  }

  // Default layout only supports `medium-card`
  if (!sectionsEnabled) {
    // Missing arguments
    return "medium-card";
  }

  // Return null if no values are available
  if (!screenWidth || !classNames) {
    // Missing arguments
    return null;
  }
  const classList = classNames.split(" ");
  const cardTypes = ["small", "medium", "large"];

  // Determine which column is active based on the current screen width
  const currColumnCount = getActiveColumnLayout(screenWidth);

  // Match the card type for that column count
  for (let type of cardTypes) {
    const className = `${currColumnCount}-${type}`;
    if (classList.includes(className)) {
      // Special case: below $break-point-medium (610px), report `col-1-small` as medium
      if (screenWidth < 610 && currColumnCount === "col-1" && type === "small") {
        return "medium-card";
      }
      // Will be either "small-card", "medium-card", or "large-card"
      return `${type}-card`;
    }
  }
  return null;
}
const CONFETTI_VARS = ["--color-red-40", "--color-yellow-40", "--color-purple-40", "--color-blue-40", "--color-green-40"];

/**
 * Custom hook to animate a confetti burst.
 *
 * @param {number} count   Number of particles
 * @param {number} spread  spread of confetti
 * @returns {[React.RefObject<HTMLCanvasElement>, () => void]}
 */
function useConfetti(count = 80, spread = Math.PI / 3) {
  // avoid errors from about:home cache
  const prefersReducedMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let colors;
  // if in abouthome cache, getComputedStyle will not be available
  if (typeof getComputedStyle === "function") {
    const styles = getComputedStyle(document.documentElement);
    colors = CONFETTI_VARS.map(variable => styles.getPropertyValue(variable).trim());
  } else {
    colors = ["#fa5e75", "#de9600", "#c671eb", "#3f94ff", "#37b847"];
  }
  const canvasRef = (0,external_React_namespaceObject.useRef)(null);
  const particlesRef = (0,external_React_namespaceObject.useRef)([]);
  const animationFrameRef = (0,external_React_namespaceObject.useRef)(0);

  // initialize/reset pool
  const initializeConfetti = (0,external_React_namespaceObject.useCallback)((width, height) => {
    const centerX = width / 2;
    const centerY = height;
    const pool = particlesRef.current;

    // Create or overwrite each particle’s initial state
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * spread;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const color = colors[Math.floor(Math.random() * colors.length)];
      pool[i] = {
        x: centerX + (Math.random() - 0.5) * 40,
        y: centerY,
        cos,
        sin,
        velocity: Math.random() * 6 + 6,
        gravity: 0.3,
        decay: 0.96,
        size: 8,
        color,
        life: 0,
        maxLife: 100,
        tilt: Math.random() * Math.PI * 2,
        tiltSpeed: Math.random() * 0.2 + 0.05
      };
    }
  }, [count, spread, colors]);

  // Core animation loop — updates physics & renders each frame
  const animateParticles = (0,external_React_namespaceObject.useCallback)(canvas => {
    const context = canvas.getContext("2d");
    const {
      width,
      height
    } = canvas;
    const pool = particlesRef.current;

    // Clear the entire canvas each frame
    context.clearRect(0, 0, width, height);
    let anyAlive = false;
    for (let particle of pool) {
      if (particle.life < particle.maxLife) {
        anyAlive = true;

        // update each particles physics: position, velocity decay, gravity, tilt, lifespan
        particle.velocity *= particle.decay;
        particle.x += particle.cos * particle.velocity;
        particle.y -= particle.sin * particle.velocity;
        particle.y += particle.gravity;
        particle.tilt += particle.tiltSpeed;
        particle.life += 1;
      }

      // Draw: apply alpha, transform & draw a rotated, scaled square
      const alphaValue = 1 - particle.life / particle.maxLife;
      const scaleY = Math.sin(particle.tilt);
      context.globalAlpha = alphaValue;
      context.setTransform(1, 0, 0, 1, particle.x, particle.y);
      context.rotate(Math.PI / 4);
      context.scale(1, scaleY);
      context.fillStyle = particle.color;
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);

      // reset each particle
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
    }
    if (anyAlive) {
      // continue the animation
      animationFrameRef.current = requestAnimationFrame(() => {
        animateParticles(canvas);
      });
    } else {
      cancelAnimationFrame(animationFrameRef.current);
      context.clearRect(0, 0, width, height);
    }
  }, []);

  // Resets and starts a new confetti animation
  const fireConfetti = (0,external_React_namespaceObject.useCallback)(() => {
    if (prefersReducedMotion) {
      return;
    }
    const canvas = canvasRef?.current;
    if (canvas) {
      cancelAnimationFrame(animationFrameRef.current);
      initializeConfetti(canvas.width, canvas.height);
      animateParticles(canvas);
    }
  }, [initializeConfetti, animateParticles, prefersReducedMotion]);
  return [canvasRef, fireConfetti];
}

;// CONCATENATED MODULE: ./content-src/components/TopSites/TopSitesConstants.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const TOP_SITES_SOURCE = "TOP_SITES";
const TOP_SITES_CONTEXT_MENU_OPTIONS = [
  "CheckPinTopSite",
  "EditTopSite",
  "Separator",
  "OpenInNewWindow",
  "OpenInPrivateWindow",
  "Separator",
  "BlockUrl",
  "DeleteUrl",
];
const TOP_SITES_SPOC_CONTEXT_MENU_OPTIONS = [
  "OpenInNewWindow",
  "OpenInPrivateWindow",
  "Separator",
  "BlockUrl",
  "ShowPrivacyInfo",
];
const TOP_SITES_SPONSORED_POSITION_CONTEXT_MENU_OPTIONS = [
  "OpenInNewWindow",
  "OpenInPrivateWindow",
  "Separator",
  "BlockUrl",
  "AboutSponsored",
];
// the special top site for search shortcut experiment can only have the option to unpin (which removes) the topsite
const TOP_SITES_SEARCH_SHORTCUTS_CONTEXT_MENU_OPTIONS = [
  "CheckPinTopSite",
  "Separator",
  "BlockUrl",
];
// minimum size necessary to show a rich icon instead of a screenshot
const MIN_RICH_FAVICON_SIZE = 96;
// minimum size necessary to show any icon
const MIN_SMALL_FAVICON_SIZE = 16;

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamImpressionStats/ImpressionStats.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





const VISIBLE = "visible";
const VISIBILITY_CHANGE_EVENT = "visibilitychange";

// Per analytical requirement, we set the minimal intersection ratio to
// 0.5, and an impression is identified when the wrapped item has at least
// 50% visibility.
//
// This constant is exported for unit test
const INTERSECTION_RATIO = 0.5;

/**
 * Impression wrapper for Discovery Stream related React components.
 *
 * It makes use of the Intersection Observer API to detect the visibility,
 * and relies on page visibility to ensure the impression is reported
 * only when the component is visible on the page.
 *
 * Note:
 *   * This wrapper used to be used either at the individual card level,
 *     or by the card container components.
 *     It is now only used for individual card level.
 *   * Each impression will be sent only once as soon as the desired
 *     visibility is detected
 *   * Batching is not yet implemented, hence it might send multiple
 *     impression pings separately
 */
class ImpressionStats_ImpressionStats extends (external_React_default()).PureComponent {
  // This checks if the given cards are the same as those in the last impression ping.
  // If so, it should not send the same impression ping again.
  _needsImpressionStats(cards) {
    if (!this.impressionCardGuids || this.impressionCardGuids.length !== cards.length) {
      return true;
    }
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].id !== this.impressionCardGuids[i]) {
        return true;
      }
    }
    return false;
  }
  _dispatchImpressionStats() {
    const {
      props
    } = this;
    const cards = props.rows;
    if (this.props.flightId) {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.DISCOVERY_STREAM_SPOC_IMPRESSION,
        data: {
          flightId: this.props.flightId
        }
      }));

      // Record sponsored topsites impressions if the source is `TOP_SITES_SOURCE`.
      if (this.props.source === TOP_SITES_SOURCE) {
        for (const card of cards) {
          this.props.dispatch(actionCreators.OnlyToMain({
            type: actionTypes.TOP_SITES_SPONSORED_IMPRESSION_STATS,
            data: {
              type: "impression",
              tile_id: card.id,
              source: "newtab",
              advertiser: card.advertiser,
              // Keep the 0-based position, can be adjusted by the telemetry
              // sender if necessary.
              position: card.pos,
              attribution: card.attribution
            }
          }));
        }
      }
    }
    if (this._needsImpressionStats(cards)) {
      const impressionData = {
        source: props.source.toUpperCase(),
        window_inner_width: window.innerWidth,
        window_inner_height: window.innerHeight,
        tiles: cards.map(link => ({
          id: link.id,
          pos: link.pos,
          type: props.flightId ? "spoc" : "organic",
          ...(link.shim ? {
            shim: link.shim
          } : {}),
          recommendation_id: link.recommendation_id,
          fetchTimestamp: link.fetchTimestamp,
          corpus_item_id: link.corpus_item_id,
          scheduled_corpus_item_id: link.scheduled_corpus_item_id,
          recommended_at: link.recommended_at,
          received_rank: link.received_rank,
          topic: link.topic,
          features: link.features,
          attribution: link.attribution,
          ...(link.format ? {
            format: link.format
          } : {
            format: getActiveCardSize(window.innerWidth, link.class_names, link.section, link.flightId)
          }),
          ...(link.section ? {
            section: link.section,
            section_position: link.section_position,
            is_section_followed: link.is_section_followed,
            layout_name: link.sectionLayoutName
          } : {})
        })),
        firstVisibleTimestamp: props.firstVisibleTimestamp
      };
      props.dispatch(actionCreators.DiscoveryStreamImpressionStats(impressionData));
      this.impressionCardGuids = cards.map(link => link.id);
    }
  }

  // This checks if the given cards are the same as those in the last loaded content ping.
  // If so, it should not send the same loaded content ping again.
  _needsLoadedContent(cards) {
    if (!this.loadedContentGuids || this.loadedContentGuids.length !== cards.length) {
      return true;
    }
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].id !== this.loadedContentGuids[i]) {
        return true;
      }
    }
    return false;
  }
  _dispatchLoadedContent() {
    const {
      props
    } = this;
    const cards = props.rows;
    if (this._needsLoadedContent(cards)) {
      props.dispatch(actionCreators.DiscoveryStreamLoadedContent({
        source: props.source.toUpperCase(),
        tiles: cards.map(link => ({
          id: link.id,
          pos: link.pos
        }))
      }));
      this.loadedContentGuids = cards.map(link => link.id);
    }
  }
  setImpressionObserverOrAddListener() {
    const {
      props
    } = this;
    if (!props.dispatch) {
      return;
    }
    if (props.document.visibilityState === VISIBLE) {
      // Send the loaded content ping once the page is visible.
      this._dispatchLoadedContent();
      this.setImpressionObserver();
    } else {
      // We should only ever send the latest impression stats ping, so remove any
      // older listeners.
      if (this._onVisibilityChange) {
        props.document.removeEventListener(VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
      }
      this._onVisibilityChange = () => {
        if (props.document.visibilityState === VISIBLE) {
          // Send the loaded content ping once the page is visible.
          this._dispatchLoadedContent();
          this.setImpressionObserver();
          props.document.removeEventListener(VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
        }
      };
      props.document.addEventListener(VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
  }

  /**
   * Set an impression observer for the wrapped component. It makes use of
   * the Intersection Observer API to detect if the wrapped component is
   * visible with a desired ratio, and only sends impression if that's the case.
   *
   * See more details about Intersection Observer API at:
   * https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
   */
  setImpressionObserver() {
    const {
      props
    } = this;
    if (!props.rows.length) {
      return;
    }
    this._handleIntersect = entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= INTERSECTION_RATIO)) {
        this._dispatchImpressionStats();
        this.impressionObserver.unobserve(this.refs.impression);
      }
    };
    const options = {
      threshold: INTERSECTION_RATIO
    };
    this.impressionObserver = new props.IntersectionObserver(this._handleIntersect, options);
    this.impressionObserver.observe(this.refs.impression);
  }
  componentDidMount() {
    if (this.props.rows.length) {
      this.setImpressionObserverOrAddListener();
    }
  }
  componentWillUnmount() {
    if (this._handleIntersect && this.impressionObserver) {
      this.impressionObserver.unobserve(this.refs.impression);
    }
    if (this._onVisibilityChange) {
      this.props.document.removeEventListener(VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("div", {
      ref: "impression",
      className: "impression-observer"
    }, this.props.children);
  }
}
ImpressionStats_ImpressionStats.defaultProps = {
  IntersectionObserver: globalThis.IntersectionObserver,
  document: globalThis.document,
  rows: [],
  source: ""
};
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/SafeAnchor/SafeAnchor.jsx
function SafeAnchor_extends() { return SafeAnchor_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, SafeAnchor_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



class SafeAnchor extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onClick = this.onClick.bind(this);
  }
  onClick(event) {
    // Use dispatch instead of normal link click behavior to include referrer
    if (this.props.dispatch) {
      event.preventDefault();
      const {
        altKey,
        button,
        ctrlKey,
        metaKey,
        shiftKey
      } = event;
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.OPEN_LINK,
        data: {
          event: {
            altKey,
            button,
            ctrlKey,
            metaKey,
            shiftKey
          },
          referrer: this.props.referrer || "https://getpocket.com/recommendations",
          // Use the anchor's url, which could have been cleaned up
          url: event.currentTarget.href,
          is_sponsored: this.props.isSponsored
        }
      }));
    }

    // Propagate event if there's a handler
    if (this.props.onLinkClick) {
      this.props.onLinkClick(event);
    }
  }
  safeURI(url) {
    let protocol = null;
    try {
      protocol = new URL(url).protocol;
    } catch (e) {
      return "";
    }
    const isAllowed = ["http:", "https:"].includes(protocol);
    if (!isAllowed) {
      console.warn(`${url} is not allowed for anchor targets.`); // eslint-disable-line no-console
      return "";
    }
    return url;
  }
  render() {
    const {
      url,
      className,
      title,
      isSponsored,
      onFocus
    } = this.props;
    let anchor = /*#__PURE__*/external_React_default().createElement("a", SafeAnchor_extends({
      href: this.safeURI(url),
      title: title,
      className: className,
      onClick: this.onClick,
      "data-is-sponsored-link": !!isSponsored
    }, this.props.tabIndex === 0 || this.props.tabIndex ? {
      ref: this.props.setRef,
      tabIndex: this.props.tabIndex
    } : {}, onFocus ? {
      onFocus
    } : {}), this.props.children);
    return anchor;
  }
}
;// CONCATENATED MODULE: ./content-src/components/Card/types.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const cardContextTypes = {
  history: {
    fluentID: "newtab-label-visited",
    icon: "history-item",
  },
  removedBookmark: {
    fluentID: "newtab-label-removed-bookmark",
    icon: "bookmark-removed",
  },
  bookmark: {
    fluentID: "newtab-label-bookmarked",
    icon: "bookmark-added",
  },
  trending: {
    fluentID: "newtab-label-recommended",
    icon: "trending",
  },
  pocket: {
    fluentID: "newtab-label-saved",
    icon: "pocket",
  },
  download: {
    fluentID: "newtab-label-download",
    icon: "download",
  },
};

;// CONCATENATED MODULE: external "ReactTransitionGroup"
const external_ReactTransitionGroup_namespaceObject = ReactTransitionGroup;
;// CONCATENATED MODULE: ./content-src/components/FluentOrText/FluentOrText.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



/**
 * Set text on a child element/component depending on if the message is already
 * translated plain text or a fluent id with optional args.
 */
class FluentOrText extends (external_React_default()).PureComponent {
  render() {
    // Ensure we have a single child to attach attributes
    const {
      children,
      message
    } = this.props;
    const child = children ? external_React_default().Children.only(children) : /*#__PURE__*/external_React_default().createElement("span", null);

    // For a string message, just use it as the child's text
    let grandChildren = message;
    let extraProps;

    // Convert a message object to set desired fluent-dom attributes
    if (typeof message === "object") {
      const args = message.args || message.values;
      extraProps = {
        "data-l10n-args": args && JSON.stringify(args),
        "data-l10n-id": message.id || message.string_id
      };

      // Use original children potentially with data-l10n-name attributes
      grandChildren = child.props.children;
    }

    // Add the message to the child via fluent attributes or text node
    return /*#__PURE__*/external_React_default().cloneElement(child, extraProps, grandChildren);
  }
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/DSContextFooter/DSContextFooter.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


// eslint-disable-next-line no-shadow




// Animation time is mirrored in DSContextFooter.scss
const ANIMATION_DURATION = 3000;
const DSMessageLabel = props => {
  const {
    context,
    context_type,
    mayHaveSectionsCards
  } = props;
  const {
    icon,
    fluentID
  } = cardContextTypes[context_type] || {};
  if (!context && context_type && !mayHaveSectionsCards) {
    return /*#__PURE__*/external_React_default().createElement(external_ReactTransitionGroup_namespaceObject.TransitionGroup, {
      component: null
    }, /*#__PURE__*/external_React_default().createElement(external_ReactTransitionGroup_namespaceObject.CSSTransition, {
      key: fluentID,
      timeout: ANIMATION_DURATION,
      classNames: "story-animate"
    }, /*#__PURE__*/external_React_default().createElement(StatusMessage, {
      icon: icon,
      fluentID: fluentID
    })));
  }
  return null;
};
const StatusMessage = ({
  icon,
  fluentID
}) => /*#__PURE__*/external_React_default().createElement("div", {
  className: "status-message"
}, /*#__PURE__*/external_React_default().createElement("span", {
  "aria-haspopup": "true",
  className: `story-badge-icon icon icon-${icon}`
}), /*#__PURE__*/external_React_default().createElement("div", {
  className: "story-context-label",
  "data-l10n-id": fluentID
}));
const SponsorLabel = ({
  sponsored_by_override,
  sponsor,
  context,
  newSponsoredLabel
}) => {
  const classList = `story-sponsored-label ${newSponsoredLabel || ""} clamp`;
  // If override is not false or an empty string.
  if (sponsored_by_override) {
    return /*#__PURE__*/external_React_default().createElement("p", {
      className: classList
    }, sponsored_by_override);
  } else if (sponsored_by_override === "") {
    // We specifically want to display nothing if the server returns an empty string.
    // So the server can turn off the label.
    // This is to support the use cases where the sponsored context is displayed elsewhere.
    return null;
  } else if (sponsor) {
    return /*#__PURE__*/external_React_default().createElement("p", {
      className: classList
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: {
        id: `newtab-label-sponsored-by`,
        values: {
          sponsor
        }
      }
    }));
  } else if (context) {
    return /*#__PURE__*/external_React_default().createElement("p", {
      className: classList
    }, context);
  }
  return null;
};
class DSContextFooter extends (external_React_default()).PureComponent {
  render() {
    const {
      context,
      context_type,
      sponsor,
      sponsored_by_override,
      cta_button_variant,
      source,
      mayHaveSectionsCards
    } = this.props;
    const sponsorLabel = SponsorLabel({
      sponsored_by_override,
      sponsor,
      context
    });
    const dsMessageLabel = DSMessageLabel({
      context,
      context_type,
      mayHaveSectionsCards
    });
    if (cta_button_variant === "variant-a") {
      return /*#__PURE__*/external_React_default().createElement("div", {
        className: "story-footer"
      }, /*#__PURE__*/external_React_default().createElement("button", {
        "aria-hidden": "true",
        className: "story-cta-button"
      }, "Shop Now"), sponsorLabel);
    }
    if (cta_button_variant === "variant-b") {
      return /*#__PURE__*/external_React_default().createElement("div", {
        className: "story-footer"
      }, sponsorLabel, /*#__PURE__*/external_React_default().createElement("span", {
        className: "source clamp cta-footer-source"
      }, source));
    }
    if (sponsorLabel || dsMessageLabel && context_type !== "pocket") {
      return /*#__PURE__*/external_React_default().createElement("div", {
        className: "story-footer"
      }, sponsorLabel, dsMessageLabel);
    }
    return null;
  }
}
const DSMessageFooter = props => {
  const {
    context,
    context_type
  } = props;
  const dsMessageLabel = DSMessageLabel({
    context,
    context_type
  });

  // This case is specific and already displayed to the user elsewhere.
  if (!dsMessageLabel) {
    return null;
  }
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "story-footer"
  }, dsMessageLabel);
};
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/DSCard/DSCard.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */











const READING_WPM = 220;
const PREF_OHTTP_MERINO = "discoverystream.merino-provider.ohttp.enabled";
const PREF_OHTTP_UNIFIED_ADS = "unifiedAds.ohttp.enabled";
const DSCard_PREF_SECTIONS_ENABLED = "discoverystream.sections.enabled";

/**
 * READ TIME FROM WORD COUNT
 *
 * @param {int} wordCount number of words in an article
 * @returns {int} number of words per minute in minutes
 */
function readTimeFromWordCount(wordCount) {
  if (!wordCount) {
    return false;
  }
  return Math.ceil(parseInt(wordCount, 10) / READING_WPM);
}
const DSSource = ({
  source,
  timeToRead,
  newSponsoredLabel,
  context,
  sponsor,
  sponsored_by_override,
  icon_src
}) => {
  const faviconSize = 20;

  // First try to display sponsored label or time to read here.
  if (newSponsoredLabel) {
    // If we can display something for spocs, do so.
    if (sponsored_by_override || sponsor || context) {
      return /*#__PURE__*/external_React_default().createElement(SponsorLabel, {
        context: context,
        sponsor: sponsor,
        sponsored_by_override: sponsored_by_override,
        newSponsoredLabel: "new-sponsored-label"
      });
    }
  }

  // If we are not a spoc, and can display a time to read value.
  if (source && timeToRead) {
    return /*#__PURE__*/external_React_default().createElement("p", {
      className: "source clamp time-to-read"
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: {
        id: `newtab-label-source-read-time`,
        values: {
          source,
          timeToRead
        }
      }
    }));
  }

  // Otherwise display a default source.
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "source-wrapper"
  }, icon_src && /*#__PURE__*/external_React_default().createElement("img", {
    src: icon_src,
    height: faviconSize,
    width: faviconSize,
    alt: ""
  }), /*#__PURE__*/external_React_default().createElement("p", {
    className: "source clamp"
  }, source));
};
const DefaultMeta = ({
  source,
  title,
  excerpt,
  timeToRead,
  newSponsoredLabel,
  context,
  context_type,
  sponsor,
  sponsored_by_override,
  ctaButtonVariant,
  dispatch,
  mayHaveSectionsCards,
  format,
  icon_src
}) => {
  const shouldShowFooter = format !== "rectangle" && format !== "spoc";
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "meta"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "info-wrap"
  }, /*#__PURE__*/external_React_default().createElement("h3", {
    className: "title clamp"
  }, format === "rectangle" ? "Sponsored" : title), format === "rectangle" ? /*#__PURE__*/external_React_default().createElement("p", {
    className: "excerpt clamp"
  }, "Sponsored content supports our mission to build a better web.") : excerpt && /*#__PURE__*/external_React_default().createElement("p", {
    className: "excerpt clamp"
  }, excerpt)), shouldShowFooter && /*#__PURE__*/external_React_default().createElement("div", {
    className: "sections-card-footer"
  }, format !== "rectangle" && format !== "spoc" && /*#__PURE__*/external_React_default().createElement(DSSource, {
    source: source,
    timeToRead: timeToRead,
    newSponsoredLabel: newSponsoredLabel,
    context: context,
    sponsor: sponsor,
    sponsored_by_override: sponsored_by_override,
    icon_src: icon_src
  })), !newSponsoredLabel && /*#__PURE__*/external_React_default().createElement(DSContextFooter, {
    context_type: context_type,
    context: context,
    sponsor: sponsor,
    sponsored_by_override: sponsored_by_override,
    cta_button_variant: ctaButtonVariant,
    source: source,
    dispatch: dispatch,
    mayHaveSectionsCards: mayHaveSectionsCards
  }), newSponsoredLabel && /*#__PURE__*/external_React_default().createElement(DSMessageFooter, {
    context_type: context_type,
    context: null
  }));
};
class _DSCard extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onLinkClick = this.onLinkClick.bind(this);
    this.doesLinkTopicMatchSelectedTopic = this.doesLinkTopicMatchSelectedTopic.bind(this);
    this.onMenuUpdate = this.onMenuUpdate.bind(this);
    this.onMenuShow = this.onMenuShow.bind(this);
    this.setContextMenuButtonHostRef = element => {
      this.contextMenuButtonHostElement = element;
    };
    this.setPlaceholderRef = element => {
      this.placeholderElement = element;
    };
    this.state = {
      isSeen: false
    };

    // If this is for the about:home startup cache, then we always want
    // to render the DSCard, regardless of whether or not its been seen.
    if (props.App.isForStartupCache.App) {
      this.state.isSeen = true;
    }

    // We want to choose the optimal thumbnail for the underlying DSImage, but
    // want to do it in a performant way. The breakpoints used in the
    // CSS of the page are, unfortuntely, not easy to retrieve without
    // causing a style flush. To avoid that, we hardcode them here.
    //
    // The values chosen here were the dimensions of the card thumbnails as
    // computed by getBoundingClientRect() for each type of viewport width
    // across both high-density and normal-density displays.
    this.standardCardImageSizes = [{
      mediaMatcher: "default",
      width: 296,
      height: 160
    }];
    this.listCardImageSizes = [{
      mediaMatcher: "(min-width: 1122px)",
      width: 75,
      height: 75
    }, {
      mediaMatcher: "default",
      width: 50,
      height: 50
    }];
    this.sectionsCardImagesSizes = {
      small: {
        width: 110,
        height: 117
      },
      medium: {
        width: 300,
        height: 160
      },
      large: {
        width: 190,
        height: 250
      }
    };
    this.sectionsColumnMediaMatcher = {
      1: "default",
      2: "(min-width: 724px)",
      3: "(min-width: 1122px)",
      4: "(min-width: 1390px)"
    };
  }
  getSectionImageSize(column, size) {
    const cardImageSize = {
      mediaMatcher: this.sectionsColumnMediaMatcher[column],
      width: this.sectionsCardImagesSizes[size].width,
      height: this.sectionsCardImagesSizes[size].height
    };
    return cardImageSize;
  }
  doesLinkTopicMatchSelectedTopic() {
    // Edge case for clicking on a card when topic selections have not be set
    if (!this.props.selectedTopics) {
      return "not-set";
    }

    // Edge case the topic of the card is not one of the available topics
    if (!this.props.availableTopics.includes(this.props.topic)) {
      return "topic-not-selectable";
    }
    if (this.props.selectedTopics.includes(this.props.topic)) {
      return "true";
    }
    return "false";
  }
  onLinkClick() {
    const matchesSelectedTopic = this.doesLinkTopicMatchSelectedTopic();
    if (this.props.dispatch) {
      this.props.dispatch(actionCreators.DiscoveryStreamUserEvent({
        event: "CLICK",
        source: this.props.type.toUpperCase(),
        action_position: this.props.pos,
        value: {
          event_source: "card",
          card_type: this.props.flightId ? "spoc" : "organic",
          recommendation_id: this.props.recommendation_id,
          tile_id: this.props.id,
          ...(this.props.shim && this.props.shim.click ? {
            shim: this.props.shim.click
          } : {}),
          fetchTimestamp: this.props.fetchTimestamp,
          firstVisibleTimestamp: this.props.firstVisibleTimestamp,
          corpus_item_id: this.props.corpus_item_id,
          scheduled_corpus_item_id: this.props.scheduled_corpus_item_id,
          recommended_at: this.props.recommended_at,
          received_rank: this.props.received_rank,
          topic: this.props.topic,
          features: this.props.features,
          matches_selected_topic: matchesSelectedTopic,
          selected_topics: this.props.selectedTopics,
          attribution: this.props.attribution,
          ...(this.props.format ? {
            format: this.props.format
          } : {
            format: getActiveCardSize(window.innerWidth, this.props.sectionsClassNames, this.props.section, this.props.flightId)
          }),
          ...(this.props.section ? {
            section: this.props.section,
            section_position: this.props.sectionPosition,
            is_section_followed: this.props.sectionFollowed,
            layout_name: this.props.sectionLayoutName
          } : {})
        }
      }));
      this.props.dispatch(actionCreators.ImpressionStats({
        source: this.props.type.toUpperCase(),
        click: 0,
        window_inner_width: this.props.windowObj.innerWidth,
        window_inner_height: this.props.windowObj.innerHeight,
        tiles: [{
          id: this.props.id,
          pos: this.props.pos,
          ...(this.props.shim && this.props.shim.click ? {
            shim: this.props.shim.click
          } : {}),
          type: this.props.flightId ? "spoc" : "organic",
          recommendation_id: this.props.recommendation_id,
          topic: this.props.topic,
          selected_topics: this.props.selectedTopics,
          ...(this.props.format ? {
            format: this.props.format
          } : {
            format: getActiveCardSize(window.innerWidth, this.props.sectionsClassNames, this.props.section, this.props.flightId)
          }),
          ...(this.props.section ? {
            section: this.props.section,
            section_position: this.props.sectionPosition,
            is_section_followed: this.props.sectionFollowed
          } : {})
        }]
      }));
    }
  }
  onMenuUpdate(showContextMenu) {
    if (!showContextMenu) {
      const dsLinkMenuHostDiv = this.contextMenuButtonHostElement;
      if (dsLinkMenuHostDiv) {
        dsLinkMenuHostDiv.classList.remove("active", "last-item");
      }
    }
  }
  async onMenuShow() {
    const dsLinkMenuHostDiv = this.contextMenuButtonHostElement;
    if (dsLinkMenuHostDiv) {
      // Force translation so we can be sure it's ready before measuring.
      await this.props.windowObj.document.l10n.translateFragment(dsLinkMenuHostDiv);
      if (this.props.windowObj.scrollMaxX > 0) {
        dsLinkMenuHostDiv.classList.add("last-item");
      }
      dsLinkMenuHostDiv.classList.add("active");
    }
  }
  onSeen(entries) {
    if (this.state) {
      const entry = entries.find(e => e.isIntersecting);
      if (entry) {
        if (this.placeholderElement) {
          this.observer.unobserve(this.placeholderElement);
        }

        // Stop observing since element has been seen
        this.setState({
          isSeen: true
        });
      }
    }
  }
  onIdleCallback() {
    if (!this.state.isSeen) {
      // To improve responsiveness without impacting performance,
      // we start rendering stories on idle.
      // To reduce the number of requests for secure OHTTP images,
      // we skip idle-time loading.
      if (!this.secureImage) {
        if (this.observer && this.placeholderElement) {
          this.observer.unobserve(this.placeholderElement);
        }
        this.setState({
          isSeen: true
        });
      }
    }
  }
  componentDidMount() {
    this.idleCallbackId = this.props.windowObj.requestIdleCallback(this.onIdleCallback.bind(this));
    if (this.placeholderElement) {
      this.observer = new IntersectionObserver(this.onSeen.bind(this));
      this.observer.observe(this.placeholderElement);
    }
  }
  componentWillUnmount() {
    // Remove observer on unmount
    if (this.observer && this.placeholderElement) {
      this.observer.unobserve(this.placeholderElement);
    }
    if (this.idleCallbackId) {
      this.props.windowObj.cancelIdleCallback(this.idleCallbackId);
    }
  }

  // Wraps the image URL with the moz-cached-ohttp:// protocol.
  // This enables Firefox to load resources over Oblivious HTTP (OHTTP),
  // providing privacy-preserving resource loading.
  // Applied only when inferred personalization is enabled.
  // See: https://firefox-source-docs.mozilla.org/browser/components/mozcachedohttp/docs/index.html
  secureImageURL(url) {
    return `moz-cached-ohttp://newtab-image/?url=${encodeURIComponent(url)}`;
  }
  getRawImageSrc() {
    let rawImageSrc = "";
    // There is no point in fetching images for startup cache.
    if (!this.props.App.isForStartupCache.App) {
      rawImageSrc = this.props.raw_image_src;
    }
    return rawImageSrc;
  }
  getFaviconSrc() {
    let faviconSrc = "";
    // There is no point in fetching favicons for startup cache.
    if (!this.props.App.isForStartupCache.App && this.props.icon_src) {
      faviconSrc = this.props.icon_src;
      if (this.secureImage) {
        faviconSrc = this.secureImageURL(this.props.icon_src);
      }
    }
    return faviconSrc;
  }
  get secureImage() {
    const {
      Prefs,
      flightId
    } = this.props;
    let ohttpEnabled = false;
    if (flightId) {
      ohttpEnabled = Prefs.values[PREF_OHTTP_UNIFIED_ADS];
    } else {
      ohttpEnabled = Prefs.values[PREF_OHTTP_MERINO];
    }
    const ohttpImagesEnabled = Prefs.values.ohttpImagesConfig?.enabled;
    const includeTopStoriesSection = Prefs.values.ohttpImagesConfig?.includeTopStoriesSection;
    const nonPersonalizedSections = ["top_stories_section"];
    const sectionPersonalized = !nonPersonalizedSections.includes(this.props.section) || includeTopStoriesSection;
    const secureImage = ohttpImagesEnabled && ohttpEnabled && sectionPersonalized;
    return secureImage;
  }
  renderImage({
    sizes = [],
    classNames = ""
  } = {}) {
    const {
      Prefs
    } = this.props;
    const rawImageSrc = this.getRawImageSrc();
    const smartCrop = Prefs.values["images.smart"];
    return /*#__PURE__*/external_React_default().createElement(DSImage, {
      extraClassNames: `img ${classNames}`,
      source: this.props.image_src,
      rawSource: rawImageSrc,
      sizes: sizes,
      url: this.props.url,
      title: this.props.title,
      isRecentSave: this.props.isRecentSave,
      alt_text: this.props.alt_text,
      smartCrop: smartCrop,
      secureImage: this.secureImage
    });
  }
  renderSectionCardImages() {
    const {
      sectionsCardImageSizes
    } = this.props;
    const columns = ["1", "2", "3", "4"];
    const images = [];
    for (const column of columns) {
      const size = sectionsCardImageSizes[column];
      const sizes = [this.getSectionImageSize(column, size)];
      const image = this.renderImage({
        sizes,
        classNames: `image-${column}`
      });
      images.push(image);
    }
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, images);
  }
  render() {
    const {
      isRecentSave,
      DiscoveryStream,
      Prefs,
      mayHaveSectionsCards,
      format
    } = this.props;
    if (this.props.placeholder || !this.state.isSeen) {
      // placeholder-seen is used to ensure the loading animation is only used if the card is visible.
      const placeholderClassName = this.state.isSeen ? `placeholder-seen` : ``;
      let placeholderElements = /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-image placeholder-fill"
      }), /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-label placeholder-fill"
      }), /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-header placeholder-fill"
      }), /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-description placeholder-fill"
      }));
      placeholderElements = /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-image placeholder-fill"
      }), /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-description placeholder-fill"
      }), /*#__PURE__*/external_React_default().createElement("div", {
        className: "placeholder-header placeholder-fill"
      }));
      return /*#__PURE__*/external_React_default().createElement("div", {
        className: `ds-card placeholder ${placeholderClassName}`,
        ref: this.setPlaceholderRef
      }, placeholderElements);
    }
    let source = this.props.source || this.props.publisher;
    if (!source) {
      try {
        source = new URL(this.props.url).hostname;
      } catch (e) {}
    }
    const {
      hideDescriptions,
      compactImages,
      imageGradient,
      newSponsoredLabel,
      titleLines = 3,
      descLines = 3,
      readTime: displayReadTime
    } = DiscoveryStream;
    const sectionsEnabled = Prefs.values[DSCard_PREF_SECTIONS_ENABLED];
    // We can ignore hideDescriptions if we are in sections.
    const excerpt = !hideDescriptions || sectionsEnabled ? this.props.excerpt : "";
    let timeToRead;
    if (displayReadTime) {
      timeToRead = this.props.time_to_read || readTimeFromWordCount(this.props.word_count);
    }
    const ctaButtonEnabled = this.props.ctaButtonSponsors?.includes(this.props.sponsor?.toLowerCase());
    let ctaButtonVariant = "";
    if (ctaButtonEnabled) {
      ctaButtonVariant = this.props.ctaButtonVariant;
    }
    let ctaButtonVariantClassName = ctaButtonVariant;
    const ctaButtonClassName = ctaButtonEnabled ? `ds-card-cta-button` : ``;
    const compactImagesClassName = compactImages ? `ds-card-compact-image` : ``;
    const imageGradientClassName = imageGradient ? `ds-card-image-gradient` : ``;
    const sectionsCardsClassName = [mayHaveSectionsCards ? `sections-card-ui` : ``, this.props.sectionsClassNames].join(" ");
    const titleLinesName = `ds-card-title-lines-${titleLines}`;
    const descLinesClassName = `ds-card-desc-lines-${descLines}`;
    const isMediumRectangle = format === "rectangle";
    const spocFormatClassName = isMediumRectangle ? `ds-spoc-rectangle` : ``;
    const faviconSrc = this.getFaviconSrc();
    let images = this.renderImage({
      sizes: this.standardCardImageSizes
    });
    if (isMediumRectangle) {
      images = this.renderImage();
    } else if (sectionsEnabled) {
      images = this.renderSectionCardImages();
    }
    return /*#__PURE__*/external_React_default().createElement("article", {
      className: `ds-card ${sectionsCardsClassName} ${compactImagesClassName} ${imageGradientClassName} ${titleLinesName} ${descLinesClassName} ${spocFormatClassName} ${ctaButtonClassName} ${ctaButtonVariantClassName}`,
      ref: this.setContextMenuButtonHostRef,
      "data-position-one": this.props["data-position-one"],
      "data-position-two": this.props["data-position-one"],
      "data-position-three": this.props["data-position-one"],
      "data-position-four": this.props["data-position-one"]
    }, /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
      className: "ds-card-link",
      dispatch: this.props.dispatch,
      onLinkClick: !this.props.placeholder ? this.onLinkClick : undefined,
      url: this.props.url,
      title: this.props.title,
      isSponsored: !!this.props.flightId,
      tabIndex: this.props.tabIndex,
      onFocus: this.props.onFocus
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "img-wrapper"
    }, images, this.props.isDailyBrief && this.props.topic && /*#__PURE__*/external_React_default().createElement("span", {
      className: "ds-card-daily-brief-topic",
      "data-l10n-id": `newtab-topic-label-${this.props.topic}`
    })), /*#__PURE__*/external_React_default().createElement(ImpressionStats_ImpressionStats, {
      flightId: this.props.flightId,
      rows: [{
        id: this.props.id,
        pos: this.props.pos,
        ...(this.props.shim && this.props.shim.impression ? {
          shim: this.props.shim.impression
        } : {}),
        recommendation_id: this.props.recommendation_id,
        fetchTimestamp: this.props.fetchTimestamp,
        corpus_item_id: this.props.corpus_item_id,
        scheduled_corpus_item_id: this.props.scheduled_corpus_item_id,
        recommended_at: this.props.recommended_at,
        received_rank: this.props.received_rank,
        topic: this.props.topic,
        features: this.props.features,
        ...(format ? {
          format
        } : {}),
        category: this.props.category,
        attribution: this.props.attribution,
        ...(this.props.section ? {
          section: this.props.section,
          section_position: this.props.sectionPosition,
          is_section_followed: this.props.sectionFollowed,
          sectionLayoutName: this.props.sectionLayoutName
        } : {}),
        ...(!format && this.props.section ?
        // Note: sectionsCardsClassName is passed to ImpressionStats.jsx in order to calculate format
        {
          class_names: sectionsCardsClassName
        } : {})
      }],
      dispatch: this.props.dispatch,
      source: this.props.type,
      firstVisibleTimestamp: this.props.firstVisibleTimestamp
    }), ctaButtonVariant === "variant-b" && /*#__PURE__*/external_React_default().createElement("div", {
      className: "cta-header"
    }, "Shop Now"), /*#__PURE__*/external_React_default().createElement(DefaultMeta, {
      source: source,
      title: this.props.title,
      excerpt: excerpt,
      newSponsoredLabel: newSponsoredLabel,
      timeToRead: timeToRead,
      context: this.props.context,
      context_type: this.props.context_type,
      sponsor: this.props.sponsor,
      sponsored_by_override: this.props.sponsored_by_override,
      ctaButtonVariant: ctaButtonVariant,
      dispatch: this.props.dispatch,
      mayHaveSectionsCards: this.props.mayHaveSectionsCards,
      state: this.state,
      format: format,
      icon_src: faviconSrc,
      tabIndex: this.props.tabIndex
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-stp-button-hover-background"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-stp-button-position-wrapper"
    }, /*#__PURE__*/external_React_default().createElement(DSLinkMenu, {
      id: this.props.id,
      index: this.props.pos,
      dispatch: this.props.dispatch,
      url: this.props.url,
      title: this.props.title,
      source: source,
      type: this.props.type,
      card_type: this.props.flightId ? "spoc" : "organic",
      pocket_id: this.props.pocket_id,
      shim: this.props.shim,
      bookmarkGuid: this.props.bookmarkGuid,
      flightId: this.props.flightId,
      showPrivacyInfo: !!this.props.flightId,
      onMenuUpdate: this.onMenuUpdate,
      onMenuShow: this.onMenuShow,
      isRecentSave: isRecentSave,
      recommendation_id: this.props.recommendation_id,
      tile_id: this.props.id,
      block_key: this.props.id,
      corpus_item_id: this.props.corpus_item_id,
      scheduled_corpus_item_id: this.props.scheduled_corpus_item_id,
      recommended_at: this.props.recommended_at,
      received_rank: this.props.received_rank,
      section: this.props.section,
      section_position: this.props.sectionPosition,
      is_section_followed: this.props.sectionFollowed,
      fetchTimestamp: this.props.fetchTimestamp,
      firstVisibleTimestamp: this.props.firstVisibleTimestamp,
      format: format ? format : getActiveCardSize(window.innerWidth, this.props.sectionsClassNames, this.props.section, this.props.flightId),
      isSectionsCard: this.props.mayHaveSectionsCards,
      topic: this.props.topic,
      selected_topics: this.props.selected_topics,
      tabIndex: this.props.tabIndex
    }))));
  }
}
_DSCard.defaultProps = {
  windowObj: window // Added to support unit tests
};
const DSCard = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  App: state.App,
  DiscoveryStream: state.DiscoveryStream,
  Prefs: state.Prefs
}))(_DSCard);
const PlaceholderDSCard = () => /*#__PURE__*/external_React_default().createElement(DSCard, {
  placeholder: true
});
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/DSEmptyState/DSEmptyState.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



class DSEmptyState extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onReset = this.onReset.bind(this);
    this.state = {};
  }
  componentWillUnmount() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
  onReset() {
    if (this.props.dispatch && this.props.feed) {
      const {
        feed
      } = this.props;
      const {
        url
      } = feed;
      this.props.dispatch({
        type: actionTypes.DISCOVERY_STREAM_FEED_UPDATE,
        data: {
          feed: {
            ...feed,
            data: {
              ...feed.data,
              status: "waiting"
            }
          },
          url
        }
      });
      this.setState({
        waiting: true
      });
      this.timeout = setTimeout(() => {
        this.timeout = null;
        this.setState({
          waiting: false
        });
      }, 300);
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.DISCOVERY_STREAM_RETRY_FEED,
        data: {
          feed
        }
      }));
    }
  }
  renderButton() {
    if (this.props.status === "waiting" || this.state.waiting) {
      return /*#__PURE__*/external_React_default().createElement("button", {
        className: "try-again-button waiting",
        "data-l10n-id": "newtab-discovery-empty-section-topstories-loading"
      });
    }
    return /*#__PURE__*/external_React_default().createElement("button", {
      className: "try-again-button",
      onClick: this.onReset,
      "data-l10n-id": "newtab-discovery-empty-section-topstories-try-again-button"
    });
  }
  renderState() {
    if (this.props.status === "waiting" || this.props.status === "failed") {
      return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("h2", {
        "data-l10n-id": "newtab-discovery-empty-section-topstories-timed-out"
      }), this.renderButton());
    }
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("h2", {
      "data-l10n-id": "newtab-discovery-empty-section-topstories-header"
    }), /*#__PURE__*/external_React_default().createElement("p", {
      "data-l10n-id": "newtab-discovery-empty-section-topstories-content"
    }));
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "section-empty-state"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "empty-state-message"
    }, this.renderState()));
  }
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/TopicsWidget/TopicsWidget.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */






function _TopicsWidget(props) {
  const {
    id,
    source,
    position,
    DiscoveryStream,
    dispatch
  } = props;
  const {
    utmCampaign,
    utmContent,
    utmSource
  } = DiscoveryStream.experimentData;
  let queryParams = `?utm_source=${utmSource}`;
  if (utmCampaign && utmContent) {
    queryParams += `&utm_content=${utmContent}&utm_campaign=${utmCampaign}`;
  }
  const topics = [{
    label: "Technology",
    name: "technology"
  }, {
    label: "Science",
    name: "science"
  }, {
    label: "Self-Improvement",
    name: "self-improvement"
  }, {
    label: "Travel",
    name: "travel"
  }, {
    label: "Career",
    name: "career"
  }, {
    label: "Entertainment",
    name: "entertainment"
  }, {
    label: "Food",
    name: "food"
  }, {
    label: "Health",
    name: "health"
  }, {
    label: "Must-Reads",
    name: "must-reads",
    url: `https://getpocket.com/collections${queryParams}`
  }];
  function onLinkClick(topic, positionInCard) {
    if (dispatch) {
      dispatch(actionCreators.DiscoveryStreamUserEvent({
        event: "CLICK",
        source,
        action_position: position,
        value: {
          card_type: "topics_widget",
          topic,
          ...(positionInCard || positionInCard === 0 ? {
            position_in_card: positionInCard
          } : {}),
          section_position: position
        }
      }));
      dispatch(actionCreators.ImpressionStats({
        source,
        click: 0,
        window_inner_width: props.windowObj.innerWidth,
        window_inner_height: props.windowObj.innerHeight,
        tiles: [{
          id,
          pos: position
        }]
      }));
    }
  }
  function mapTopicItem(topic, index) {
    return /*#__PURE__*/external_React_default().createElement("li", {
      key: topic.name,
      className: topic.overflow ? "ds-topics-widget-list-overflow-item" : ""
    }, /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
      url: topic.url || `https://getpocket.com/explore/${topic.name}${queryParams}`,
      dispatch: dispatch,
      onLinkClick: () => onLinkClick(topic.name, index)
    }, topic.label));
  }
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "ds-topics-widget"
  }, /*#__PURE__*/external_React_default().createElement("header", {
    className: "ds-topics-widget-header"
  }, "Popular Topics"), /*#__PURE__*/external_React_default().createElement("hr", null), /*#__PURE__*/external_React_default().createElement("div", {
    className: "ds-topics-widget-list-container"
  }, /*#__PURE__*/external_React_default().createElement("ul", null, topics.map(mapTopicItem))), /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
    className: "ds-topics-widget-button button primary",
    url: `https://getpocket.com/${queryParams}`,
    dispatch: dispatch,
    onLinkClick: () => onLinkClick("more-topics")
  }, "More Topics"), /*#__PURE__*/external_React_default().createElement(ImpressionStats_ImpressionStats, {
    dispatch: dispatch,
    rows: [{
      id,
      pos: position
    }],
    source: source
  }));
}
_TopicsWidget.defaultProps = {
  windowObj: window // Added to support unit tests
};
const TopicsWidget = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  DiscoveryStream: state.DiscoveryStream
}))(_TopicsWidget);
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/AdBannerContextMenu/AdBannerContextMenu.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





/**
 * A context menu for IAB banners (e.g. billboard, leaderboard).
 *
 * Note: MREC ad formats and sponsored stories share the context menu with
 * other cards: make sure you also look at DSLinkMenu component
 * to keep any updates to ad-related context menu items in sync.
 *
 * @param dispatch
 * @param spoc
 * @param position
 * @param type
 * @param showAdReporting
 * @returns {Element}
 * @class
 */
function AdBannerContextMenu({
  dispatch,
  spoc,
  position,
  type,
  showAdReporting,
  toggleActive = () => {}
}) {
  const ADBANNER_CONTEXT_MENU_OPTIONS = ["BlockAdUrl", ...(showAdReporting ? ["ReportAd"] : []), "ManageSponsoredContent", "OurSponsorsAndYourPrivacy"];
  const [showContextMenu, setShowContextMenu] = (0,external_React_namespaceObject.useState)(false);
  const [contextMenuClassNames, setContextMenuClassNames] = (0,external_React_namespaceObject.useState)("ads-context-menu");

  // The keyboard access parameter is passed down to LinkMenu component
  // that uses it to focus on the first context menu option for accessibility.
  const [isKeyboardAccess, setIsKeyboardAccess] = (0,external_React_namespaceObject.useState)(false);

  /**
   * Toggles the style fix for context menu hover/active styles.
   * This allows us to have unobtrusive, transparent button background by default,
   * yet flip it over to semi-transparent grey when the menu is visible.
   *
   * @param contextMenuOpen
   */
  const toggleContextMenuStyleSwitch = contextMenuOpen => {
    if (contextMenuOpen) {
      setContextMenuClassNames("ads-context-menu context-menu-open");
    } else {
      setContextMenuClassNames("ads-context-menu");
    }
  };

  /**
   * Toggles the context menu to open or close. Sets state depending on whether
   * the context menu is accessed by mouse or keyboard.
   *
   * @param isKeyBoard
   */
  const toggleContextMenu = isKeyBoard => {
    toggleContextMenuStyleSwitch(!showContextMenu);
    toggleActive(!showContextMenu);
    setShowContextMenu(!showContextMenu);
    setIsKeyboardAccess(isKeyBoard);
  };
  const onClick = e => {
    e.preventDefault();
    toggleContextMenu(false);
  };
  const onKeyDown = e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleContextMenu(true);
    }
  };
  const onUpdate = () => {
    toggleContextMenuStyleSwitch(!showContextMenu);
    toggleActive(!showContextMenu);
    setShowContextMenu(!showContextMenu);
  };
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "ads-context-menu-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: contextMenuClassNames
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon",
    size: "default",
    "data-l10n-id": "newtab-menu-content-tooltip",
    "data-l10n-args": JSON.stringify({
      title: spoc.title || spoc.sponsor || spoc.alt_text
    }),
    iconsrc: "chrome://global/skin/icons/more.svg",
    onClick: onClick,
    onKeyDown: onKeyDown
  }), showContextMenu && /*#__PURE__*/external_React_default().createElement(LinkMenu, {
    onUpdate: onUpdate,
    dispatch: dispatch,
    keyboardAccess: isKeyboardAccess,
    options: ADBANNER_CONTEXT_MENU_OPTIONS,
    shouldSendImpressionStats: true,
    userEvent: actionCreators.DiscoveryStreamUserEvent,
    site: {
      // Props we want to pass on for new ad types that come from Unified Ads API
      block_key: spoc.block_key,
      fetchTimestamp: spoc.fetchTimestamp,
      flight_id: spoc.flight_id,
      format: spoc.format,
      id: spoc.id,
      guid: spoc.guid,
      card_type: "spoc",
      // required to record telemetry for an action, see handleBlockUrl in TelemetryFeed.sys.mjs
      is_pocket_card: true,
      position,
      sponsor: spoc.sponsor,
      title: spoc.title,
      url: spoc.url || spoc.shim.url,
      personalization_models: spoc.personalization_models,
      priority: spoc.priority,
      score: spoc.score,
      alt_text: spoc.alt_text,
      shim: spoc.shim
    },
    index: position,
    source: type.toUpperCase()
  })));
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/PromoCard/PromoCard.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





const PREF_PROMO_CARD_DISMISSED = "discoverystream.promoCard.visible";

/**
 * The PromoCard component displays a promotional message.
 * It is used next to the AdBanner component in a four-column layout.
 */

const PromoCard = () => {
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  const onCtaClick = (0,external_React_namespaceObject.useCallback)(() => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.PROMO_CARD_CLICK
    }));
  }, [dispatch]);
  const onDismissClick = (0,external_React_namespaceObject.useCallback)(() => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.PROMO_CARD_DISMISS
    }));
    dispatch(actionCreators.SetPref(PREF_PROMO_CARD_DISMISSED, false));
  }, [dispatch]);
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.PROMO_CARD_IMPRESSION
    }));
  }, [dispatch]);
  const ref = useIntersectionObserver(handleIntersection);
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "promo-card-wrapper",
    ref: el => {
      ref.current = [el];
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "promo-card-dismiss-button"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon ghost",
    size: "small",
    "data-l10n-id": "newtab-promo-card-dismiss-button",
    iconsrc: "chrome://global/skin/icons/close.svg",
    onClick: onDismissClick,
    onKeyDown: onDismissClick
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "promo-card-inner"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "img-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("img", {
    src: "chrome://newtab/content/data/content/assets/puzzle-fox.svg",
    alt: ""
  })), /*#__PURE__*/external_React_default().createElement("span", {
    className: "promo-card-title",
    "data-l10n-id": "newtab-promo-card-title"
  }), /*#__PURE__*/external_React_default().createElement("span", {
    className: "promo-card-body",
    "data-l10n-id": "newtab-promo-card-body"
  }), /*#__PURE__*/external_React_default().createElement("span", {
    className: "promo-card-cta-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("a", {
    href: "https://support.mozilla.org/kb/sponsor-privacy",
    "data-l10n-id": "newtab-promo-card-cta",
    target: "_blank",
    rel: "noreferrer",
    onClick: onCtaClick
  }))));
};

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/AdBanner/AdBanner.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */







const AdBanner_PREF_SECTIONS_ENABLED = "discoverystream.sections.enabled";
const AdBanner_PREF_OHTTP_UNIFIED_ADS = "unifiedAds.ohttp.enabled";
const PREF_REPORT_ADS_ENABLED = "discoverystream.reportAds.enabled";
const PREF_PROMOCARD_ENABLED = "discoverystream.promoCard.enabled";
const PREF_PROMOCARD_VISIBLE = "discoverystream.promoCard.visible";

/**
 * A new banner ad that appears between rows of stories: leaderboard or billboard size.
 *
 * @param spoc
 * @param dispatch
 * @param firstVisibleTimestamp
 * @param row
 * @param type
 * @param prefs
 * @returns {Element}
 * @class
 */
const AdBanner = ({
  spoc,
  dispatch,
  firstVisibleTimestamp,
  row,
  type,
  prefs
}) => {
  const getDimensions = format => {
    switch (format) {
      case "leaderboard":
        return {
          width: "728",
          height: "90"
        };
      case "billboard":
        return {
          width: "970",
          height: "250"
        };
    }
    return {
      // image will still render with default values
      width: undefined,
      height: undefined
    };
  };
  const promoCardEnabled = spoc.format === "billboard" && prefs[PREF_PROMOCARD_ENABLED] && prefs[PREF_PROMOCARD_VISIBLE];
  const sectionsEnabled = prefs[AdBanner_PREF_SECTIONS_ENABLED];
  const ohttpEnabled = prefs[AdBanner_PREF_OHTTP_UNIFIED_ADS];
  const showAdReporting = prefs[PREF_REPORT_ADS_ENABLED];
  const ohttpImagesEnabled = prefs.ohttpImagesConfig?.enabled;
  const [menuActive, setMenuActive] = (0,external_React_namespaceObject.useState)(false);
  const adBannerWrapperClassName = `ad-banner-wrapper ${menuActive ? "active" : ""} ${promoCardEnabled ? "promo-card" : ""}`;
  const {
    width: imgWidth,
    height: imgHeight
  } = getDimensions(spoc.format);
  const onLinkClick = () => {
    dispatch(actionCreators.DiscoveryStreamUserEvent({
      event: "CLICK",
      source: type.toUpperCase(),
      // Banner ads don't have a position, but a row number
      action_position: parseInt(row, 10),
      value: {
        card_type: "spoc",
        tile_id: spoc.id,
        ...(spoc.shim?.click ? {
          shim: spoc.shim.click
        } : {}),
        fetchTimestamp: spoc.fetchTimestamp,
        firstVisibleTimestamp,
        format: spoc.format,
        ...(sectionsEnabled ? {
          section: spoc.format,
          section_position: parseInt(row, 10)
        } : {})
      }
    }));
  };
  const toggleActive = active => {
    setMenuActive(active);
  };

  // in the default card grid 1 would come before the 1st row of cards and 9 comes after the last row
  // using clamp to make sure its between valid values (1-9)
  const clampedRow = Math.max(1, Math.min(9, row));
  const secureImage = ohttpImagesEnabled && ohttpEnabled;
  let rawImageSrc = spoc.raw_image_src;

  // Wraps the image URL with the moz-cached-ohttp:// protocol.
  // This enables Firefox to load resources over Oblivious HTTP (OHTTP),
  // providing privacy-preserving resource loading.
  // Applied only when inferred personalization is enabled.
  // See: https://firefox-source-docs.mozilla.org/browser/components/mozcachedohttp/docs/index.html
  if (secureImage) {
    rawImageSrc = `moz-cached-ohttp://newtab-image/?url=${encodeURIComponent(spoc.raw_image_src)}`;
  }
  return /*#__PURE__*/external_React_default().createElement("aside", {
    className: adBannerWrapperClassName,
    style: {
      gridRow: clampedRow
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: `ad-banner-inner ${spoc.format}`
  }, /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
    className: "ad-banner-link",
    url: spoc.url,
    title: spoc.title || spoc.sponsor || spoc.alt_text,
    onLinkClick: onLinkClick,
    dispatch: dispatch,
    isSponsored: true
  }, /*#__PURE__*/external_React_default().createElement(ImpressionStats_ImpressionStats, {
    flightId: spoc.flight_id,
    rows: [{
      id: spoc.id,
      card_type: "spoc",
      pos: row,
      recommended_at: spoc.recommended_at,
      received_rank: spoc.received_rank,
      format: spoc.format,
      ...(spoc.shim?.impression ? {
        shim: spoc.shim.impression
      } : {})
    }],
    dispatch: dispatch,
    firstVisibleTimestamp: firstVisibleTimestamp
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: "ad-banner-content"
  }, /*#__PURE__*/external_React_default().createElement("img", {
    src: rawImageSrc,
    alt: spoc.alt_text,
    loading: "eager",
    width: imgWidth,
    height: imgHeight
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "ad-banner-sponsored"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "ad-banner-sponsored-label",
    "data-l10n-id": "newtab-label-sponsored-fixed"
  }))), /*#__PURE__*/external_React_default().createElement("div", {
    className: "ad-banner-hover-background"
  }, /*#__PURE__*/external_React_default().createElement(AdBannerContextMenu, {
    dispatch: dispatch,
    spoc: spoc,
    position: row,
    type: type,
    showAdReporting: showAdReporting,
    toggleActive: toggleActive
  }))), promoCardEnabled && /*#__PURE__*/external_React_default().createElement(PromoCard, null));
};
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/CardGrid/CardGrid.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */








const PREF_SECTIONS_CARDS_ENABLED = "discoverystream.sections.cards.enabled";
const PREF_TOPICS_ENABLED = "discoverystream.topicLabels.enabled";
const PREF_TOPICS_SELECTED = "discoverystream.topicSelection.selectedTopics";
const PREF_TOPICS_AVAILABLE = "discoverystream.topicSelection.topics";
const PREF_SPOCS_STARTUPCACHE_ENABLED = "discoverystream.spocs.startupCache.enabled";
const PREF_BILLBOARD_ENABLED = "newtabAdSize.billboard";
const PREF_BILLBOARD_POSITION = "newtabAdSize.billboard.position";
const PREF_LEADERBOARD_ENABLED = "newtabAdSize.leaderboard";
const PREF_LEADERBOARD_POSITION = "newtabAdSize.leaderboard.position";
const WIDGET_IDS = {
  TOPICS: 1
};
function DSSubHeader({
  children
}) {
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-top-bar ds-sub-header"
  }, /*#__PURE__*/external_React_default().createElement("h3", {
    className: "section-title-container"
  }, children));
}

// eslint-disable-next-line no-shadow
function CardGrid_IntersectionObserver({
  children,
  windowObj = window,
  onIntersecting
}) {
  const intersectionElement = (0,external_React_namespaceObject.useRef)(null);
  (0,external_React_namespaceObject.useEffect)(() => {
    let observer;
    if (!observer && onIntersecting && intersectionElement.current) {
      observer = new windowObj.IntersectionObserver(entries => {
        const entry = entries.find(e => e.isIntersecting);
        if (entry) {
          // Stop observing since element has been seen
          if (observer && intersectionElement.current) {
            observer.unobserve(intersectionElement.current);
          }
          onIntersecting();
        }
      });
      observer.observe(intersectionElement.current);
    }
    // Cleanup
    return () => observer?.disconnect();
  }, [windowObj, onIntersecting]);
  return /*#__PURE__*/external_React_default().createElement("div", {
    ref: intersectionElement
  }, children);
}
class _CardGrid extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      focusedIndex: 0
    };
    this.onCardFocus = this.onCardFocus.bind(this);
    this.handleCardKeyDown = this.handleCardKeyDown.bind(this);
  }
  onCardFocus(index) {
    this.setState({
      focusedIndex: index
    });
  }
  handleCardKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const currentCardEl = e.target.closest("article.ds-card");
      if (!currentCardEl) {
        return;
      }

      // Arrow direction should match visual navigation direction in RTL
      const isRTL = document.dir === "rtl";
      const navigateToPrevious = isRTL ? e.key === "ArrowRight" : e.key === "ArrowLeft";
      let targetCardEl = currentCardEl;

      // Walk through siblings to find the target card element
      while (targetCardEl) {
        targetCardEl = navigateToPrevious ? targetCardEl.previousElementSibling : targetCardEl.nextElementSibling;
        if (targetCardEl && targetCardEl.matches("article.ds-card")) {
          const link = targetCardEl.querySelector("a.ds-card-link");
          if (link) {
            link.focus();
          }
          break;
        }
      }
    }
  }

  // eslint-disable-next-line max-statements
  renderCards() {
    const prefs = this.props.Prefs.values;
    const {
      items,
      ctaButtonSponsors,
      ctaButtonVariant,
      widgets,
      DiscoveryStream
    } = this.props;
    const {
      topicsLoading
    } = DiscoveryStream;
    const mayHaveSectionsCards = prefs[PREF_SECTIONS_CARDS_ENABLED];
    const showTopics = prefs[PREF_TOPICS_ENABLED];
    const selectedTopics = prefs[PREF_TOPICS_SELECTED];
    const availableTopics = prefs[PREF_TOPICS_AVAILABLE];
    const spocsStartupCacheEnabled = prefs[PREF_SPOCS_STARTUPCACHE_ENABLED];
    const billboardEnabled = prefs[PREF_BILLBOARD_ENABLED];
    const leaderboardEnabled = prefs[PREF_LEADERBOARD_ENABLED];
    const recs = this.props.data.recommendations.slice(0, items);
    const cards = [];
    let cardIndex = 0;
    for (let index = 0; index < items; index++) {
      const rec = recs[index];
      const isPlaceholder = topicsLoading || this.props.placeholder || !rec || rec.placeholder || rec.flight_id && !spocsStartupCacheEnabled && this.props.App.isForStartupCache.DiscoveryStream;
      if (isPlaceholder) {
        cards.push(/*#__PURE__*/external_React_default().createElement(PlaceholderDSCard, {
          key: `dscard-${index}`
        }));
      } else {
        const currentCardIndex = cardIndex;
        cardIndex++;
        cards.push(/*#__PURE__*/external_React_default().createElement(DSCard, {
          key: `dscard-${rec.id}`,
          pos: rec.pos,
          flightId: rec.flight_id,
          image_src: rec.image_src,
          raw_image_src: rec.raw_image_src,
          icon_src: rec.icon_src,
          word_count: rec.word_count,
          time_to_read: rec.time_to_read,
          title: rec.title,
          topic: rec.topic,
          features: rec.features,
          showTopics: showTopics,
          selectedTopics: selectedTopics,
          excerpt: rec.excerpt,
          availableTopics: availableTopics,
          url: rec.url,
          id: rec.id,
          shim: rec.shim,
          fetchTimestamp: rec.fetchTimestamp,
          type: this.props.type,
          context: rec.context,
          sponsor: rec.sponsor,
          sponsored_by_override: rec.sponsored_by_override,
          dispatch: this.props.dispatch,
          source: rec.domain,
          publisher: rec.publisher,
          pocket_id: rec.pocket_id,
          context_type: rec.context_type,
          bookmarkGuid: rec.bookmarkGuid,
          ctaButtonSponsors: ctaButtonSponsors,
          ctaButtonVariant: ctaButtonVariant,
          recommendation_id: rec.recommendation_id,
          firstVisibleTimestamp: this.props.firstVisibleTimestamp,
          mayHaveSectionsCards: mayHaveSectionsCards,
          corpus_item_id: rec.corpus_item_id,
          scheduled_corpus_item_id: rec.scheduled_corpus_item_id,
          recommended_at: rec.recommended_at,
          received_rank: rec.received_rank,
          format: rec.format,
          alt_text: rec.alt_text,
          isTimeSensitive: rec.isTimeSensitive,
          tabIndex: currentCardIndex === this.state.focusedIndex ? 0 : -1,
          onFocus: () => this.onCardFocus(currentCardIndex),
          attribution: rec.attribution
        }));
      }
    }
    if (widgets?.positions?.length && widgets?.data?.length) {
      let positionIndex = 0;
      const source = "CARDGRID_WIDGET";
      for (const widget of widgets.data) {
        let widgetComponent = null;
        const position = widgets.positions[positionIndex];

        // Stop if we run out of positions to place widgets.
        if (!position) {
          break;
        }
        switch (widget?.type) {
          case "TopicsWidget":
            widgetComponent = /*#__PURE__*/external_React_default().createElement(TopicsWidget, {
              position: position.index,
              dispatch: this.props.dispatch,
              source: source,
              id: WIDGET_IDS.TOPICS
            });
            break;
        }
        if (widgetComponent) {
          // We found a widget, so up the position for next try.
          positionIndex++;
          // We replace an existing card with the widget.
          cards.splice(position.index, 1, widgetComponent);
        }
      }
    }

    // if a banner ad is enabled and we have any available, place them in the grid
    const {
      spocs
    } = this.props.DiscoveryStream;
    if ((billboardEnabled || leaderboardEnabled) && spocs?.data?.newtab_spocs?.items) {
      // Only render one AdBanner in the grid -
      // Prioritize rendering a leaderboard if it exists,
      // otherwise render a billboard
      const spocToRender = spocs.data.newtab_spocs.items.find(({
        format
      }) => format === "leaderboard" && leaderboardEnabled) || spocs.data.newtab_spocs.items.find(({
        format
      }) => format === "billboard" && billboardEnabled);
      if (spocToRender && !spocs.blocked.includes(spocToRender.url)) {
        const row = spocToRender.format === "leaderboard" ? prefs[PREF_LEADERBOARD_POSITION] : prefs[PREF_BILLBOARD_POSITION];
        function displayCardsPerRow() {
          // Determines the number of cards per row based on the window width:
          // width <= 1122px: 2 cards per row
          // width 1123px to 1697px: 3 cards per row
          // width >= 1698px: 4 cards per row
          if (window.innerWidth <= 1122) {
            return 2;
          } else if (window.innerWidth > 1122 && window.innerWidth < 1698) {
            return 3;
          }
          return 4;
        }
        const injectAdBanner = bannerIndex => {
          // .splice() inserts the AdBanner at the desired index, ensuring correct DOM order for accessibility and keyboard navigation.
          // .push() would place it at the end, which is visually incorrect even if adjusted with CSS.
          cards.splice(bannerIndex, 0, /*#__PURE__*/external_React_default().createElement(AdBanner, {
            spoc: spocToRender,
            key: `dscard-${spocToRender.id}`,
            dispatch: this.props.dispatch,
            type: this.props.type,
            firstVisibleTimestamp: this.props.firstVisibleTimestamp,
            row: row,
            prefs: prefs
          }));
        };
        const getBannerIndex = () => {
          // Calculate the index for where the AdBanner should be added, depending on number of cards per row on the grid
          const cardsPerRow = displayCardsPerRow();
          let bannerIndex = (row - 1) * cardsPerRow;
          return bannerIndex;
        };
        injectAdBanner(getBannerIndex());
      }
    }
    const gridClassName = this.renderGridClassName();
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, cards?.length > 0 && /*#__PURE__*/external_React_default().createElement("div", {
      className: gridClassName,
      onKeyDown: this.handleCardKeyDown
    }, cards));
  }
  renderGridClassName() {
    const {
      hybridLayout,
      hideCardBackground,
      fourCardLayout,
      compactGrid,
      hideDescriptions
    } = this.props;
    const hideCardBackgroundClass = hideCardBackground ? `ds-card-grid-hide-background` : ``;
    const fourCardLayoutClass = fourCardLayout ? `ds-card-grid-four-card-variant` : ``;
    const hideDescriptionsClassName = !hideDescriptions ? `ds-card-grid-include-descriptions` : ``;
    const compactGridClassName = compactGrid ? `ds-card-grid-compact` : ``;
    const hybridLayoutClassName = hybridLayout ? `ds-card-grid-hybrid-layout` : ``;
    const gridClassName = `ds-card-grid ${hybridLayoutClassName} ${hideCardBackgroundClass} ${fourCardLayoutClass} ${hideDescriptionsClassName} ${compactGridClassName}`;
    return gridClassName;
  }
  render() {
    const {
      data
    } = this.props;

    // Handle a render before feed has been fetched by displaying nothing
    if (!data) {
      return null;
    }

    // Handle the case where a user has dismissed all recommendations
    const isEmpty = data.recommendations.length === 0;
    return /*#__PURE__*/external_React_default().createElement("div", null, this.props.title && /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-header"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "title"
    }, this.props.title), this.props.context && /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: this.props.context
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-context"
    }))), isEmpty ? /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-card-grid empty"
    }, /*#__PURE__*/external_React_default().createElement(DSEmptyState, {
      status: data.status,
      dispatch: this.props.dispatch,
      feed: this.props.feed
    })) : this.renderCards());
  }
}
_CardGrid.defaultProps = {
  items: 4 // Number of stories to display
};
const CardGrid = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Prefs: state.Prefs,
  App: state.App,
  DiscoveryStream: state.DiscoveryStream
}))(_CardGrid);
;// CONCATENATED MODULE: ./content-src/components/A11yLinkButton/A11yLinkButton.jsx
function A11yLinkButton_extends() { return A11yLinkButton_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, A11yLinkButton_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function A11yLinkButton(props) {
  // function for merging classes, if necessary
  let className = "a11y-link-button";
  if (props.className) {
    className += ` ${props.className}`;
  }
  return /*#__PURE__*/external_React_default().createElement("button", A11yLinkButton_extends({
    type: "button"
  }, props, {
    className: className
  }), props.children);
}
;// CONCATENATED MODULE: ./content-src/components/ErrorBoundary/ErrorBoundary.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



class ErrorBoundaryFallback extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.windowObj = this.props.windowObj || window;
    this.onClick = this.onClick.bind(this);
  }

  /**
   * Since we only get here if part of the page has crashed, do a
   * forced reload to give us the best chance at recovering.
   */
  onClick() {
    this.windowObj.location.reload(true);
  }
  render() {
    const defaultClass = "as-error-fallback";
    let className;
    if ("className" in this.props) {
      className = `${this.props.className} ${defaultClass}`;
    } else {
      className = defaultClass;
    }

    // "A11yLinkButton" to force normal link styling stuff (eg cursor on hover)
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: className
    }, /*#__PURE__*/external_React_default().createElement("div", {
      "data-l10n-id": "newtab-error-fallback-info"
    }), /*#__PURE__*/external_React_default().createElement("span", null, /*#__PURE__*/external_React_default().createElement(A11yLinkButton, {
      className: "reload-button",
      onClick: this.onClick,
      "data-l10n-id": "newtab-error-fallback-refresh-link"
    })));
  }
}
ErrorBoundaryFallback.defaultProps = {
  className: "as-error-fallback"
};
class ErrorBoundary extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }
  componentDidCatch() {
    this.setState({
      hasError: true
    });
  }
  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return /*#__PURE__*/external_React_default().createElement(this.props.FallbackComponent, {
      className: this.props.className
    });
  }
}
ErrorBoundary.defaultProps = {
  FallbackComponent: ErrorBoundaryFallback
};
;// CONCATENATED MODULE: ./content-src/components/CollapsibleSection/CollapsibleSection.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */







/**
 * A section that can collapse. As of bug 1710937, it can no longer collapse.
 * See bug 1727365 for follow-up work to simplify this component.
 */
class _CollapsibleSection extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onBodyMount = this.onBodyMount.bind(this);
    this.onMenuButtonMouseEnter = this.onMenuButtonMouseEnter.bind(this);
    this.onMenuButtonMouseLeave = this.onMenuButtonMouseLeave.bind(this);
    this.onMenuUpdate = this.onMenuUpdate.bind(this);
    this.setContextMenuButtonRef = this.setContextMenuButtonRef.bind(this);
    this.handleTopicSelectionButtonClick = this.handleTopicSelectionButtonClick.bind(this);
    this.state = {
      menuButtonHover: false,
      showContextMenu: false
    };
  }
  setContextMenuButtonRef(element) {
    this.contextMenuButtonRef = element;
  }
  onBodyMount(node) {
    this.sectionBody = node;
  }
  onMenuButtonMouseEnter() {
    this.setState({
      menuButtonHover: true
    });
  }
  onMenuButtonMouseLeave() {
    this.setState({
      menuButtonHover: false
    });
  }
  onMenuUpdate(showContextMenu) {
    this.setState({
      showContextMenu
    });
  }
  handleTopicSelectionButtonClick() {
    const maybeDisplay = this.props.Prefs.values["discoverystream.topicSelection.onboarding.maybeDisplay"];
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.TOPIC_SELECTION_USER_OPEN
    }));
    if (maybeDisplay) {
      // if still part of onboarding, remove user from onboarding flow
      this.props.dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", false));
    }
    this.props.dispatch(actionCreators.BroadcastToContent({
      type: actionTypes.TOPIC_SELECTION_SPOTLIGHT_OPEN
    }));
  }
  render() {
    const {
      isAnimating,
      maxHeight,
      menuButtonHover,
      showContextMenu
    } = this.state;
    const {
      id,
      collapsed,
      title,
      subTitle,
      mayHaveTopicsSelection,
      sectionsEnabled
    } = this.props;
    const active = menuButtonHover || showContextMenu;
    let bodyStyle;
    if (isAnimating && !collapsed) {
      bodyStyle = {
        maxHeight
      };
    } else if (!isAnimating && collapsed) {
      bodyStyle = {
        display: "none"
      };
    }
    let titleStyle;
    if (this.props.hideTitle) {
      titleStyle = {
        visibility: "hidden"
      };
    }
    const hasSubtitleClassName = subTitle ? `has-subtitle` : ``;
    const hasBeenUpdatedPreviously = this.props.Prefs.values["discoverystream.topicSelection.hasBeenUpdatedPreviously"];
    const selectedTopics = this.props.Prefs.values["discoverystream.topicSelection.selectedTopics"];
    const topicsHaveBeenPreviouslySet = hasBeenUpdatedPreviously || selectedTopics;
    return /*#__PURE__*/external_React_default().createElement("section", {
      className: `collapsible-section ${this.props.className}${active ? " active" : ""}`
      // Note: data-section-id is used for web extension api tests in mozilla central
      ,
      "data-section-id": id
    }, !sectionsEnabled && /*#__PURE__*/external_React_default().createElement("div", {
      className: "section-top-bar"
    }, /*#__PURE__*/external_React_default().createElement("h2", {
      className: `section-title-container ${hasSubtitleClassName}`,
      style: titleStyle
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-title"
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: title
    })), subTitle && /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-sub-title"
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: subTitle
    }))), mayHaveTopicsSelection && /*#__PURE__*/external_React_default().createElement("div", {
      className: "button-topic-selection"
    }, /*#__PURE__*/external_React_default().createElement("moz-button", {
      "data-l10n-id": topicsHaveBeenPreviouslySet ? "newtab-topic-selection-button-update-interests" : "newtab-topic-selection-button-pick-interests",
      type: topicsHaveBeenPreviouslySet ? "default" : "primary",
      onClick: this.handleTopicSelectionButtonClick
    }))), /*#__PURE__*/external_React_default().createElement(ErrorBoundary, {
      className: "section-body-fallback"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      ref: this.onBodyMount,
      style: bodyStyle
    }, this.props.children)));
  }
}
_CollapsibleSection.defaultProps = {
  document: globalThis.document || {
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: "hidden"
  }
};
const CollapsibleSection = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Prefs: state.Prefs
}))(_CollapsibleSection);
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/ReportContent/ReportContent.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



const ReportContent = spocs => {
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  const modal = (0,external_React_namespaceObject.useRef)(null);
  const radioGroupRef = (0,external_React_namespaceObject.useRef)(null);
  const submitButtonRef = (0,external_React_namespaceObject.useRef)(null);
  const report = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream.report);
  const [valueSelected, setValueSelected] = (0,external_React_namespaceObject.useState)(false);
  const [selectedReason, setSelectedReason] = (0,external_React_namespaceObject.useState)(null);
  const spocData = spocs.spocs.data;

  // Sends a dispatch to update the redux store when modal is cancelled
  const handleCancel = () => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.REPORT_CLOSE
    }));
  };
  const handleSubmit = (0,external_React_namespaceObject.useCallback)(() => {
    const {
      card_type,
      corpus_item_id,
      position,
      reporting_url,
      scheduled_corpus_item_id,
      section_position,
      section,
      title,
      topic,
      url
    } = report;
    if (card_type === "organic") {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.REPORT_CONTENT_SUBMIT,
        data: {
          card_type,
          corpus_item_id,
          report_reason: selectedReason,
          scheduled_corpus_item_id,
          section_position,
          section,
          title,
          topic,
          url
        }
      }));
    } else if (card_type === "spoc") {
      // Retrieve placement_id by comparing spocData with the ad that was reported
      const getPlacementId = () => {
        if (!spocData || !report.url) {
          return null;
        }
        for (const [placementId, spocList] of Object.entries(spocData)) {
          for (const spoc of Object.values(spocList)) {
            if (spoc?.url === report.url) {
              return placementId;
            }
          }
        }
        return null;
      };
      const placement_id = getPlacementId();
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.REPORT_AD_SUBMIT,
        data: {
          report_reason: selectedReason,
          placement_id,
          position,
          reporting_url,
          url
        }
      }));
    }
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.BLOCK_URL,
      data: [{
        ...report
      }]
    }));
    dispatch(actionCreators.OnlyToOneContent({
      type: actionTypes.SHOW_TOAST_MESSAGE,
      data: {
        toastId: "reportSuccessToast",
        showNotifications: true
      }
    }, "ActivityStream:Content"));
  }, [dispatch, selectedReason, report, spocData]);

  // Opens and closes the modal based on user interaction
  (0,external_React_namespaceObject.useEffect)(() => {
    if (report.visible && modal?.current) {
      modal.current.showModal();

      // Clear any previously selected radio button
      const radioGroup = radioGroupRef.current;
      if (radioGroup) {
        const selectedRadioButton = radioGroup.querySelector("moz-radio[checked]");
        if (selectedRadioButton) {
          selectedRadioButton.removeAttribute("checked");
        }
      }

      // Clear out the states
      setValueSelected(false);
      setSelectedReason(null);
    } else if (!report.visible && modal?.current?.open) {
      modal.current.close();
    }
  }, [report.visible]);

  // Updates the submit button's state based on if a value is selected
  (0,external_React_namespaceObject.useEffect)(() => {
    const radioGroup = radioGroupRef.current;
    const submitButton = submitButtonRef.current;
    const handleRadioChange = e => {
      const reasonValue = e?.target?.value;
      if (reasonValue) {
        setValueSelected(true);
        setSelectedReason(reasonValue);
      }
    };
    if (radioGroup) {
      radioGroup.addEventListener("change", handleRadioChange);
    }

    // Handle submit button state on valueSelected change
    const updateSubmitState = () => {
      if (valueSelected) {
        submitButton.removeAttribute("disabled");
      } else {
        submitButton.setAttribute("disabled", "");
      }
    };
    updateSubmitState();
    return () => {
      if (radioGroup) {
        radioGroup.removeEventListener("change", handleRadioChange);
      }
    };
  }, [valueSelected, selectedReason]);
  return /*#__PURE__*/external_React_default().createElement("dialog", {
    className: "report-content-form",
    id: "dialog-report",
    ref: modal,
    onClose: () => dispatch({
      type: actionTypes.REPORT_CLOSE
    })
  }, /*#__PURE__*/external_React_default().createElement("form", {
    action: ""
  }, report.card_type === "spoc" ? /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("moz-radio-group", {
    name: "report",
    ref: radioGroupRef,
    id: "report-group",
    "data-l10n-id": "newtab-report-ads-why-reporting",
    className: "report-ads-options",
    headingLevel: "3"
  }, /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-ads-reason-not-interested",
    value: "not_interested"
  }), /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-ads-reason-inappropriate",
    value: "inappropriate"
  }), /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-ads-reason-seen-it-too-many-times",
    value: "seen_too_many_times"
  }))) : /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("moz-radio-group", {
    name: "report",
    ref: radioGroupRef,
    id: "report-group",
    "data-l10n-id": "newtab-report-content-why-reporting-this",
    className: "report-content-options",
    headingLevel: "3"
  }, /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-content-wrong-category",
    value: "wrong_category"
  }), /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-content-outdated",
    value: "outdated"
  }), /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-content-inappropriate-offensive",
    value: "inappropriate_or_offensive"
  }), /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-content-spam-misleading",
    value: "spam_or_misleading"
  }), /*#__PURE__*/external_React_default().createElement("moz-radio", {
    "data-l10n-id": "newtab-report-content-requires-payment-subscription",
    value: "requires_payment_or_subscription"
  }, /*#__PURE__*/external_React_default().createElement("a", {
    slot: "support-link",
    is: "moz-support-link",
    "support-page": "recommendations-firefox-new-tab#w_what-is-a-paywall",
    "data-l10n-id": "newtab-report-content-requires-payment-subscription-learn-more",
    rel: "noreferrer",
    target: "_blank"
  })))), /*#__PURE__*/external_React_default().createElement("moz-button-group", null, /*#__PURE__*/external_React_default().createElement("moz-button", {
    "data-l10n-id": "newtab-report-cancel",
    onClick: handleCancel,
    className: "cancel-report-btn"
  }), /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "primary",
    "data-l10n-id": "newtab-report-submit",
    ref: submitButtonRef,
    onClick: handleSubmit,
    className: "submit-report-btn"
  }))));
};
;// CONCATENATED MODULE: ./content-src/lib/screenshot-utils.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * List of helper functions for screenshot-based images.
 *
 * There are two kinds of images:
 * 1. Remote Image: This is the image from the main process and it refers to
 *    the image in the React props. This can either be an object with the `data`
 *    and `path` properties, if it is a blob, or a string, if it is a normal image.
 * 2. Local Image: This is the image object in the content process and it refers
 *    to the image *object* in the React component's state. All local image
 *    objects have the `url` property, and an additional property `path`, if they
 *    are blobs.
 */
const ScreenshotUtils = {
  isBlob(isLocal, image) {
    return !!(
      image &&
      image.path &&
      ((!isLocal && image.data) || (isLocal && image.url))
    );
  },

  // This should always be called with a remote image and not a local image.
  createLocalImageObject(remoteImage) {
    if (!remoteImage) {
      return null;
    }
    if (this.isBlob(false, remoteImage)) {
      return {
        url: globalThis.URL.createObjectURL(remoteImage.data),
        path: remoteImage.path,
      };
    }
    return { url: remoteImage };
  },

  // Revokes the object URL of the image if the local image is a blob.
  // This should always be called with a local image and not a remote image.
  maybeRevokeBlobObjectURL(localImage) {
    if (this.isBlob(true, localImage)) {
      globalThis.URL.revokeObjectURL(localImage.url);
    }
  },

  // Checks if remoteImage and localImage are the same.
  isRemoteImageLocal(localImage, remoteImage) {
    // Both remoteImage and localImage are present.
    if (remoteImage && localImage) {
      return this.isBlob(false, remoteImage)
        ? localImage.path === remoteImage.path
        : localImage.url === remoteImage;
    }

    // This will only handle the remaining three possible outcomes.
    // (i.e. everything except when both image and localImage are present)
    return !remoteImage && !localImage;
  },
};

;// CONCATENATED MODULE: ./content-src/components/Card/Card.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */









// Keep track of pending image loads to only request once
const gImageLoading = new Map();

/**
 * Card component.
 * Cards are found within a Section component and contain information about a link such
 * as preview image, page title, page description, and some context about if the page
 * was visited, bookmarked, trending etc...
 * Each Section can make an unordered list of Cards which will create one instane of
 * this class. Each card will then get a context menu which reflects the actions that
 * can be done on this Card.
 */
class _Card extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      activeCard: null,
      imageLoaded: false,
      cardImage: null
    };
    this.onMenuButtonUpdate = this.onMenuButtonUpdate.bind(this);
    this.onLinkClick = this.onLinkClick.bind(this);
  }

  /**
   * Helper to conditionally load an image and update state when it loads.
   */
  async maybeLoadImage() {
    // No need to load if it's already loaded or no image
    const {
      cardImage
    } = this.state;
    if (!cardImage) {
      return;
    }
    const imageUrl = cardImage.url;
    if (!this.state.imageLoaded) {
      // Initialize a promise to share a load across multiple card updates
      if (!gImageLoading.has(imageUrl)) {
        const loaderPromise = new Promise((resolve, reject) => {
          const loader = new Image();
          loader.addEventListener("load", resolve);
          loader.addEventListener("error", reject);
          loader.src = imageUrl;
        });

        // Save and remove the promise only while it's pending
        gImageLoading.set(imageUrl, loaderPromise);
        loaderPromise.catch(ex => ex).then(() => gImageLoading.delete(imageUrl));
      }

      // Wait for the image whether just started loading or reused promise
      try {
        await gImageLoading.get(imageUrl);
      } catch (ex) {
        // Ignore the failed image without changing state
        return;
      }

      // Only update state if we're still waiting to load the original image
      if (ScreenshotUtils.isRemoteImageLocal(this.state.cardImage, this.props.link.image) && !this.state.imageLoaded) {
        this.setState({
          imageLoaded: true
        });
      }
    }
  }

  /**
   * Helper to obtain the next state based on nextProps and prevState.
   *
   * NOTE: Rename this method to getDerivedStateFromProps when we update React
   *       to >= 16.3. We will need to update tests as well. We cannot rename this
   *       method to getDerivedStateFromProps now because there is a mismatch in
   *       the React version that we are using for both testing and production.
   *       (i.e. react-test-render => "16.3.2", react => "16.2.0").
   *
   * See https://github.com/airbnb/enzyme/blob/master/packages/enzyme-adapter-react-16/package.json#L43.
   */
  static getNextStateFromProps(nextProps, prevState) {
    const {
      image
    } = nextProps.link;
    const imageInState = ScreenshotUtils.isRemoteImageLocal(prevState.cardImage, image);
    let nextState = null;

    // Image is updating.
    if (!imageInState && nextProps.link) {
      nextState = {
        imageLoaded: false
      };
    }
    if (imageInState) {
      return nextState;
    }

    // Since image was updated, attempt to revoke old image blob URL, if it exists.
    ScreenshotUtils.maybeRevokeBlobObjectURL(prevState.cardImage);
    nextState = nextState || {};
    nextState.cardImage = ScreenshotUtils.createLocalImageObject(image);
    return nextState;
  }
  onMenuButtonUpdate(isOpen) {
    if (isOpen) {
      this.setState({
        activeCard: this.props.index
      });
    } else {
      this.setState({
        activeCard: null
      });
    }
  }

  /**
   * Report to telemetry additional information about the item.
   */
  _getTelemetryInfo() {
    // Filter out "history" type for being the default
    if (this.props.link.type !== "history") {
      return {
        value: {
          card_type: this.props.link.type
        }
      };
    }
    return null;
  }
  onLinkClick(event) {
    event.preventDefault();
    const {
      altKey,
      button,
      ctrlKey,
      metaKey,
      shiftKey
    } = event;
    if (this.props.link.type === "download") {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.OPEN_DOWNLOAD_FILE,
        data: Object.assign(this.props.link, {
          event: {
            button,
            ctrlKey,
            metaKey,
            shiftKey
          }
        })
      }));
    } else {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.OPEN_LINK,
        data: Object.assign(this.props.link, {
          event: {
            altKey,
            button,
            ctrlKey,
            metaKey,
            shiftKey
          }
        })
      }));
    }
    if (this.props.isWebExtension) {
      this.props.dispatch(actionCreators.WebExtEvent(actionTypes.WEBEXT_CLICK, {
        source: this.props.eventSource,
        url: this.props.link.url,
        action_position: this.props.index
      }));
    } else {
      this.props.dispatch(actionCreators.UserEvent(Object.assign({
        event: "CLICK",
        source: this.props.eventSource,
        action_position: this.props.index
      }, this._getTelemetryInfo())));
      if (this.props.shouldSendImpressionStats) {
        this.props.dispatch(actionCreators.ImpressionStats({
          source: this.props.eventSource,
          click: 0,
          tiles: [{
            id: this.props.link.guid,
            pos: this.props.index
          }]
        }));
      }
    }
  }
  componentDidMount() {
    this.maybeLoadImage();
  }
  componentDidUpdate() {
    this.maybeLoadImage();
  }

  // NOTE: Remove this function when we update React to >= 16.3 since React will
  //       call getDerivedStateFromProps automatically. We will also need to
  //       rename getNextStateFromProps to getDerivedStateFromProps.
  componentWillMount() {
    const nextState = _Card.getNextStateFromProps(this.props, this.state);
    if (nextState) {
      this.setState(nextState);
    }
  }

  // NOTE: Remove this function when we update React to >= 16.3 since React will
  //       call getDerivedStateFromProps automatically. We will also need to
  //       rename getNextStateFromProps to getDerivedStateFromProps.
  componentWillReceiveProps(nextProps) {
    const nextState = _Card.getNextStateFromProps(nextProps, this.state);
    if (nextState) {
      this.setState(nextState);
    }
  }
  componentWillUnmount() {
    ScreenshotUtils.maybeRevokeBlobObjectURL(this.state.cardImage);
  }
  render() {
    const {
      index,
      className,
      link,
      dispatch,
      contextMenuOptions,
      eventSource,
      shouldSendImpressionStats
    } = this.props;
    const {
      props
    } = this;
    const title = link.title || link.hostname;
    const isContextMenuOpen = this.state.activeCard === index;
    // Display "now" as "trending" until we have new strings #3402
    const {
      icon,
      fluentID
    } = cardContextTypes[link.type === "now" ? "trending" : link.type] || {};
    const hasImage = this.state.cardImage || link.hasImage;
    const imageStyle = {
      backgroundImage: this.state.cardImage ? `url(${this.state.cardImage.url})` : "none"
    };
    const outerClassName = ["card-outer", className, isContextMenuOpen && "active", props.placeholder && "placeholder"].filter(v => v).join(" ");
    return /*#__PURE__*/external_React_default().createElement("li", {
      className: outerClassName
    }, /*#__PURE__*/external_React_default().createElement("a", {
      href: link.type === "pocket" ? link.open_url : link.url,
      onClick: !props.placeholder ? this.onLinkClick : undefined
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "card"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-preview-image-outer"
    }, hasImage && /*#__PURE__*/external_React_default().createElement("div", {
      className: `card-preview-image${this.state.imageLoaded ? " loaded" : ""}`,
      style: imageStyle
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-details"
    }, link.type === "download" && /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-host-name alternate",
      "data-l10n-id": "newtab-menu-open-file"
    }), link.hostname && /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-host-name"
    }, link.hostname.slice(0, 100), link.type === "download" && `  \u2014 ${link.description}`), /*#__PURE__*/external_React_default().createElement("div", {
      className: ["card-text", icon ? "" : "no-context", link.description ? "" : "no-description", link.hostname ? "" : "no-host-name"].join(" ")
    }, /*#__PURE__*/external_React_default().createElement("h4", {
      className: "card-title",
      dir: "auto"
    }, link.title), /*#__PURE__*/external_React_default().createElement("p", {
      className: "card-description",
      dir: "auto"
    }, link.description)), /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-context"
    }, icon && !link.context && /*#__PURE__*/external_React_default().createElement("span", {
      "aria-haspopup": "true",
      className: `card-context-icon icon icon-${icon}`
    }), link.icon && link.context && /*#__PURE__*/external_React_default().createElement("span", {
      "aria-haspopup": "true",
      className: "card-context-icon icon",
      style: {
        backgroundImage: `url('${link.icon}')`
      }
    }), fluentID && !link.context && /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-context-label",
      "data-l10n-id": fluentID
    }), link.context && /*#__PURE__*/external_React_default().createElement("div", {
      className: "card-context-label"
    }, link.context))))), !props.placeholder && /*#__PURE__*/external_React_default().createElement(ContextMenuButton, {
      tooltip: "newtab-menu-content-tooltip",
      tooltipArgs: {
        title
      },
      onUpdate: this.onMenuButtonUpdate
    }, /*#__PURE__*/external_React_default().createElement(LinkMenu, {
      dispatch: dispatch,
      index: index,
      source: eventSource,
      options: link.contextMenuOptions || contextMenuOptions,
      site: link,
      siteInfo: this._getTelemetryInfo(),
      shouldSendImpressionStats: shouldSendImpressionStats
    })));
  }
}
_Card.defaultProps = {
  link: {}
};
const Card = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  platform: state.Prefs.values.platform
}))(_Card);
const PlaceholderCard = props => /*#__PURE__*/external_React_default().createElement(Card, {
  placeholder: true,
  className: props.className
});
;// CONCATENATED MODULE: ./content-src/lib/perf-service.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

let usablePerfObj = window.performance;

function _PerfService(options) {
  // For testing, so that we can use a fake Window.performance object with
  // known state.
  if (options && options.performanceObj) {
    this._perf = options.performanceObj;
  } else {
    this._perf = usablePerfObj;
  }
}

_PerfService.prototype = {
  /**
   * Calls the underlying mark() method on the appropriate Window.performance
   * object to add a mark with the given name to the appropriate performance
   * timeline.
   *
   * @param  {string} name  the name to give the current mark
   * @return {void}
   */
  mark: function mark(str) {
    this._perf.mark(str);
  },

  /**
   * Calls the underlying getEntriesByName on the appropriate Window.performance
   * object.
   *
   * @param  {string} name
   * @param  {string} type eg "mark"
   * @return {Array}       Performance* objects
   */
  getEntriesByName: function getEntriesByName(entryName, type) {
    return this._perf.getEntriesByName(entryName, type);
  },

  /**
   * The timeOrigin property from the appropriate performance object.
   * Used to ensure that timestamps from the add-on code and the content code
   * are comparable.
   *
   * Note: If this is called from a context without a window
   * (eg a JSM in chrome), it will return the timeOrigin of the XUL hidden
   * window, which appears to be the first created window (and thus
   * timeOrigin) in the browser.  Note also, however, there is also a private
   * hidden window, presumably for private browsing, which appears to be
   * created dynamically later.  Exactly how/when that shows up needs to be
   * investigated.
   *
   * @return {number} A double of milliseconds with a precision of 0.5us.
   */
  get timeOrigin() {
    return this._perf.timeOrigin;
  },

  /**
   * Returns the "absolute" version of performance.now(), i.e. one that
   * should ([bug 1401406](https://bugzilla.mozilla.org/show_bug.cgi?id=1401406)
   * be comparable across both chrome and content.
   *
   * @return {number}
   */
  absNow: function absNow() {
    return this.timeOrigin + this._perf.now();
  },

  /**
   * This returns the absolute startTime from the most recent performance.mark()
   * with the given name.
   *
   * @param  {string} name  the name to lookup the start time for
   *
   * @return {number}       the returned start time, as a DOMHighResTimeStamp
   *
   * @throws {Error}        "No Marks with the name ..." if none are available
   *
   * Note: Always surround calls to this by try/catch.  Otherwise your code
   * may fail when the `privacy.resistFingerprinting` pref is true.  When
   * this pref is set, all attempts to get marks will likely fail, which will
   * cause this method to throw.
   *
   * See [bug 1369303](https://bugzilla.mozilla.org/show_bug.cgi?id=1369303)
   * for more info.
   */
  getMostRecentAbsMarkStartByName(entryName) {
    let entries = this.getEntriesByName(entryName, "mark");

    if (!entries.length) {
      throw new Error(`No marks with the name ${entryName}`);
    }

    let mostRecentEntry = entries[entries.length - 1];
    return this._perf.timeOrigin + mostRecentEntry.startTime;
  },
};

const perfService = new _PerfService();

;// CONCATENATED MODULE: ./content-src/components/ComponentPerfTimer/ComponentPerfTimer.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





// Currently record only a fixed set of sections. This will prevent data
// from custom sections from showing up or from topstories.
const RECORDED_SECTIONS = ["highlights", "topsites"];
class ComponentPerfTimer extends (external_React_default()).Component {
  constructor(props) {
    super(props);
    // Just for test dependency injection:
    this.perfSvc = this.props.perfSvc || perfService;
    this._sendBadStateEvent = this._sendBadStateEvent.bind(this);
    this._sendPaintedEvent = this._sendPaintedEvent.bind(this);
    this._reportMissingData = false;
    this._timestampHandled = false;
    this._recordedFirstRender = false;
  }
  componentDidMount() {
    if (!RECORDED_SECTIONS.includes(this.props.id)) {
      return;
    }
    this._maybeSendPaintedEvent();
  }
  componentDidUpdate() {
    if (!RECORDED_SECTIONS.includes(this.props.id)) {
      return;
    }
    this._maybeSendPaintedEvent();
  }

  /**
   * Call the given callback after the upcoming frame paints.
   *
   * Note: Both setTimeout and requestAnimationFrame are throttled when the page
   * is hidden, so this callback may get called up to a second or so after the
   * requestAnimationFrame "paint" for hidden tabs.
   *
   * Newtabs hidden while loading will presumably be fairly rare (other than
   * preloaded tabs, which we will be filtering out on the server side), so such
   * cases should get lost in the noise.
   *
   * If we decide that it's important to find out when something that's hidden
   * has "painted", however, another option is to post a message to this window.
   * That should happen even faster than setTimeout, and, at least as of this
   * writing, it's not throttled in hidden windows in Firefox.
   *
   * @param {Function} callback
   *
   * @returns void
   */
  _afterFramePaint(callback) {
    requestAnimationFrame(() => setTimeout(callback, 0));
  }
  _maybeSendBadStateEvent() {
    // Follow up bugs:
    // https://github.com/mozilla/activity-stream/issues/3691
    if (!this.props.initialized) {
      // Remember to report back when data is available.
      this._reportMissingData = true;
    } else if (this._reportMissingData) {
      this._reportMissingData = false;
      // Report how long it took for component to become initialized.
      this._sendBadStateEvent();
    }
  }
  _maybeSendPaintedEvent() {
    // If we've already handled a timestamp, don't do it again.
    if (this._timestampHandled || !this.props.initialized) {
      return;
    }

    // And if we haven't, we're doing so now, so remember that. Even if
    // something goes wrong in the callback, we can't try again, as we'd be
    // sending back the wrong data, and we have to do it here, so that other
    // calls to this method while waiting for the next frame won't also try to
    // handle it.
    this._timestampHandled = true;
    this._afterFramePaint(this._sendPaintedEvent);
  }

  /**
   * Triggered by call to render. Only first call goes through due to
   * `_recordedFirstRender`.
   */
  _ensureFirstRenderTsRecorded() {
    // Used as t0 for recording how long component took to initialize.
    if (!this._recordedFirstRender) {
      this._recordedFirstRender = true;
      // topsites_first_render_ts, highlights_first_render_ts.
      const key = `${this.props.id}_first_render_ts`;
      this.perfSvc.mark(key);
    }
  }

  /**
   * Creates `SAVE_SESSION_PERF_DATA` with timestamp in ms
   * of how much longer the data took to be ready for display than it would
   * have been the ideal case.
   * https://github.com/mozilla/ping-centre/issues/98
   */
  _sendBadStateEvent() {
    // highlights_data_ready_ts, topsites_data_ready_ts.
    const dataReadyKey = `${this.props.id}_data_ready_ts`;
    this.perfSvc.mark(dataReadyKey);
    try {
      const firstRenderKey = `${this.props.id}_first_render_ts`;
      // value has to be Int32.
      const value = parseInt(this.perfSvc.getMostRecentAbsMarkStartByName(dataReadyKey) - this.perfSvc.getMostRecentAbsMarkStartByName(firstRenderKey), 10);
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SAVE_SESSION_PERF_DATA,
        // highlights_data_late_by_ms, topsites_data_late_by_ms.
        data: {
          [`${this.props.id}_data_late_by_ms`]: value
        }
      }));
    } catch (ex) {
      // If this failed, it's likely because the `privacy.resistFingerprinting`
      // pref is true.
    }
  }
  _sendPaintedEvent() {
    // Record first_painted event but only send if topsites.
    if (this.props.id !== "topsites") {
      return;
    }

    // topsites_first_painted_ts.
    const key = `${this.props.id}_first_painted_ts`;
    this.perfSvc.mark(key);
    try {
      const data = {};
      data[key] = this.perfSvc.getMostRecentAbsMarkStartByName(key);
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SAVE_SESSION_PERF_DATA,
        data
      }));
    } catch (ex) {
      // If this failed, it's likely because the `privacy.resistFingerprinting`
      // pref is true.  We should at least not blow up, and should continue
      // to set this._timestampHandled to avoid going through this again.
    }
  }
  render() {
    if (RECORDED_SECTIONS.includes(this.props.id)) {
      this._ensureFirstRenderTsRecorded();
      this._maybeSendBadStateEvent();
    }
    return this.props.children;
  }
}
;// CONCATENATED MODULE: ./content-src/components/MoreRecommendations/MoreRecommendations.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


class MoreRecommendations extends (external_React_default()).PureComponent {
  render() {
    const {
      read_more_endpoint
    } = this.props;
    if (read_more_endpoint) {
      return /*#__PURE__*/external_React_default().createElement("a", {
        className: "more-recommendations",
        href: read_more_endpoint,
        "data-l10n-id": "newtab-pocket-more-recommendations"
      });
    }
    return null;
  }
}
;// CONCATENATED MODULE: ./content-src/components/ModalOverlay/ModalOverlay.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function ModalOverlayWrapper({
  unstyled,
  innerClassName,
  onClose,
  children,
  headerId,
  id
}) {
  const dialogRef = (0,external_React_namespaceObject.useRef)(null);
  let className = unstyled ? "" : "modalOverlayInner";
  if (innerClassName) {
    className += ` ${innerClassName}`;
  }
  (0,external_React_namespaceObject.useEffect)(() => {
    const dialogElement = dialogRef.current;
    if (dialogElement && !dialogElement.open) {
      dialogElement.showModal();
    }
    const handleCancel = e => {
      e.preventDefault();
      onClose(e);
    };
    dialogElement?.addEventListener("cancel", handleCancel);
    return () => {
      dialogElement?.removeEventListener("cancel", handleCancel);
      if (dialogElement && dialogElement.open) {
        dialogElement.close();
      }
    };
  }, [onClose]);
  return /*#__PURE__*/external_React_default().createElement("dialog", {
    ref: dialogRef,
    className: "modalOverlayOuter",
    onClick: e => {
      if (e.target === dialogRef.current) {
        onClose(e);
      }
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: className,
    "aria-labelledby": headerId,
    id: id
  }, children));
}

;// CONCATENATED MODULE: ./content-src/components/TopSites/SearchShortcutsForm.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




class SelectableSearchShortcut extends (external_React_default()).PureComponent {
  render() {
    const {
      shortcut,
      selected
    } = this.props;
    const imageStyle = {
      backgroundImage: `url("${shortcut.tippyTopIcon}")`
    };
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-outer search-shortcut"
    }, /*#__PURE__*/external_React_default().createElement("input", {
      type: "checkbox",
      id: shortcut.keyword,
      name: shortcut.keyword,
      checked: selected,
      onChange: this.props.onChange
    }), /*#__PURE__*/external_React_default().createElement("label", {
      htmlFor: shortcut.keyword
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-inner"
    }, /*#__PURE__*/external_React_default().createElement("span", null, /*#__PURE__*/external_React_default().createElement("div", {
      className: "tile"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-icon rich-icon",
      style: imageStyle,
      "data-fallback": "@"
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-icon search-topsite"
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "title"
    }, /*#__PURE__*/external_React_default().createElement("span", {
      dir: "auto"
    }, shortcut.keyword))))));
  }
}
class SearchShortcutsForm extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.onCancelButtonClick = this.onCancelButtonClick.bind(this);
    this.onSaveButtonClick = this.onSaveButtonClick.bind(this);

    // clone the shortcuts and add them to the state so we can add isSelected property
    const shortcuts = [];
    const {
      rows,
      searchShortcuts
    } = props.TopSites;
    searchShortcuts.forEach(shortcut => {
      shortcuts.push({
        ...shortcut,
        isSelected: !!rows.find(row => row && row.isPinned && row.searchTopSite && row.label === shortcut.keyword)
      });
    });
    this.state = {
      shortcuts
    };
  }
  handleChange(event) {
    const {
      target
    } = event;
    const {
      name: targetName,
      checked
    } = target;
    this.setState(prevState => {
      const shortcuts = prevState.shortcuts.slice();
      let shortcut = shortcuts.find(({
        keyword
      }) => keyword === targetName);
      shortcut.isSelected = checked;
      return {
        shortcuts
      };
    });
  }
  onCancelButtonClick(ev) {
    ev.preventDefault();
    this.props.onClose();
  }
  onSaveButtonClick(ev) {
    ev.preventDefault();

    // Check if there were any changes and act accordingly
    const {
      rows
    } = this.props.TopSites;
    const pinQueue = [];
    const unpinQueue = [];
    this.state.shortcuts.forEach(shortcut => {
      const alreadyPinned = rows.find(row => row && row.isPinned && row.searchTopSite && row.label === shortcut.keyword);
      if (shortcut.isSelected && !alreadyPinned) {
        pinQueue.push(this._searchTopSite(shortcut));
      } else if (!shortcut.isSelected && alreadyPinned) {
        unpinQueue.push({
          url: alreadyPinned.url,
          searchVendor: shortcut.shortURL
        });
      }
    });

    // Tell the feed to do the work.
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.UPDATE_PINNED_SEARCH_SHORTCUTS,
      data: {
        addedShortcuts: pinQueue,
        deletedShortcuts: unpinQueue
      }
    }));

    // Send the Telemetry pings.
    pinQueue.forEach(shortcut => {
      this.props.dispatch(actionCreators.UserEvent({
        source: TOP_SITES_SOURCE,
        event: "SEARCH_EDIT_ADD",
        value: {
          search_vendor: shortcut.searchVendor
        }
      }));
    });
    unpinQueue.forEach(shortcut => {
      this.props.dispatch(actionCreators.UserEvent({
        source: TOP_SITES_SOURCE,
        event: "SEARCH_EDIT_DELETE",
        value: {
          search_vendor: shortcut.searchVendor
        }
      }));
    });
    this.props.onClose();
  }
  _searchTopSite(shortcut) {
    return {
      url: shortcut.url,
      searchTopSite: true,
      label: shortcut.keyword,
      searchVendor: shortcut.shortURL
    };
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("form", {
      className: "topsite-form"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "search-shortcuts-container"
    }, /*#__PURE__*/external_React_default().createElement("h3", {
      className: "section-title grey-title",
      "data-l10n-id": "newtab-topsites-add-search-engine-header"
    }), /*#__PURE__*/external_React_default().createElement("div", null, this.state.shortcuts.map(shortcut => /*#__PURE__*/external_React_default().createElement(SelectableSearchShortcut, {
      key: shortcut.keyword,
      shortcut: shortcut,
      selected: shortcut.isSelected,
      onChange: this.handleChange
    })))), /*#__PURE__*/external_React_default().createElement("section", {
      className: "actions"
    }, /*#__PURE__*/external_React_default().createElement("button", {
      className: "cancel",
      type: "button",
      onClick: this.onCancelButtonClick,
      "data-l10n-id": "newtab-topsites-cancel-button"
    }), /*#__PURE__*/external_React_default().createElement("button", {
      className: "done",
      type: "submit",
      onClick: this.onSaveButtonClick,
      "data-l10n-id": "newtab-topsites-save-button"
    })));
  }
}
;// CONCATENATED MODULE: ../../modules/Dedupe.sys.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

class Dedupe {
  constructor(createKey) {
    this.createKey = createKey || this.defaultCreateKey;
  }

  defaultCreateKey(item) {
    return item;
  }

  /**
   * Dedupe any number of grouped elements favoring those from earlier groups.
   *
   * @param {Array} groups Contains an arbitrary number of arrays of elements.
   * @returns {Array} A matching array of each provided group deduped.
   */
  group(...groups) {
    const globalKeys = new Set();
    const result = [];
    for (const values of groups) {
      const valueMap = new Map();
      for (const value of values) {
        const key = this.createKey(value);
        if (!globalKeys.has(key) && !valueMap.has(key)) {
          valueMap.set(key, value);
        }
      }
      result.push(valueMap);
      valueMap.forEach((value, key) => globalKeys.add(key));
    }
    return result.map(m => Array.from(m.values()));
  }
}

;// CONCATENATED MODULE: ../../components/topsites/constants.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const TOP_SITES_DEFAULT_ROWS = 1;
const TOP_SITES_MAX_SITES_PER_ROW = 8;

;// CONCATENATED MODULE: ./common/Reducers.sys.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */






const dedupe = new Dedupe(site => site && site.url);

const INITIAL_STATE = {
  App: {
    // Have we received real data from the app yet?
    initialized: false,
    locale: "",
    isForStartupCache: {
      App: false,
      TopSites: false,
      DiscoveryStream: false,
      Weather: false,
      Wallpaper: false,
    },
    customizeMenuVisible: false,
  },
  Ads: {
    initialized: false,
    lastUpdated: null,
    tiles: {},
    spocs: {},
    spocPlacements: {},
  },
  TopSites: {
    // Have we received real data from history yet?
    initialized: false,
    // The history (and possibly default) links
    rows: [],
    // Used in content only to dispatch action to TopSiteForm.
    editForm: null,
    // Used in content only to open the SearchShortcutsForm modal.
    showSearchShortcutsForm: false,
    // The list of available search shortcuts.
    searchShortcuts: [],
    // The "Share-of-Voice" allocations generated by TopSitesFeed
    sov: {
      ready: false,
      positions: [
        // {position: 0, assignedPartner: "amp"},
        // {position: 1, assignedPartner: "moz-sales"},
      ],
    },
  },
  Prefs: {
    initialized: false,
    values: { featureConfig: {} },
  },
  Dialog: {
    visible: false,
    data: {},
  },
  Sections: [],
  Pocket: {
    pocketCta: {},
    waitingForSpoc: true,
  },
  // This is the new pocket configurable layout state.
  DiscoveryStream: {
    // This is a JSON-parsed copy of the discoverystream.config pref value.
    config: { enabled: false },
    layout: [],
    topicsLoading: false,
    feeds: {
      data: {
        // "https://foo.com/feed1": {lastUpdated: 123, data: [], personalized: false}
      },
      loaded: false,
    },
    // Used to show impressions in newtab devtools.
    impressions: {
      feed: {},
    },
    // Used to show blocks in newtab devtools.
    blocks: {},
    spocs: {
      spocs_endpoint: "",
      lastUpdated: null,
      cacheUpdateTime: null,
      onDemand: {
        enabled: false,
        loaded: false,
      },
      data: {
        // "spocs": {title: "", context: "", items: [], personalized: false},
        // "placement1": {title: "", context: "", items: [], personalized: false},
      },
      loaded: false,
      frequency_caps: [],
      blocked: [],
      placements: [],
    },
    experimentData: {
      utmSource: "pocket-newtab",
      utmCampaign: undefined,
      utmContent: undefined,
    },
    showTopicSelection: false,
    report: {
      visible: false,
      data: {},
    },
    sectionPersonalization: {},
  },
  // Messages received from ASRouter to render in newtab
  Messages: {
    // messages received from ASRouter are initially visible
    isVisible: true,
    // portID for that tab that was sent the message
    portID: "",
    // READONLY Message data received from ASRouter
    messageData: {},
  },
  Notifications: {
    showNotifications: false,
    toastCounter: 0,
    toastId: "",
    // This queue is reset each time SHOW_TOAST_MESSAGE is ran.
    // For can be a queue in the future, but for now is one item
    toastQueue: [],
  },
  InferredPersonalization: {
    initialized: false,
    lastUpdated: null,
    inferredInterests: {},
    coarseInferredInterests: {},
    coarsePrivateInferredInterests: {},
  },
  Search: {
    // When search hand-off is enabled, we render a big button that is styled to
    // look like a search textbox. If the button is clicked, we style
    // the button as if it was a focused search box and show a fake cursor but
    // really focus the awesomebar without the focus styles ("hidden focus").
    fakeFocus: false,
    // Hide the search box after handing off to AwesomeBar and user starts typing.
    hide: false,
  },
  Wallpapers: {
    wallpaperList: [],
    highlightSeenCounter: 0,
    categories: [],
    uploadedWallpaper: "",
  },
  Weather: {
    initialized: false,
    lastUpdated: null,
    query: "",
    suggestions: [],
    locationData: {
      city: "",
      adminArea: "",
      country: "",
    },
    // Display search input in Weather widget
    searchActive: false,
    locationSearchString: "",
    suggestedLocations: [],
  },
  // Widgets
  ListsWidget: {
    // value pointing to last selectled list
    selected: "taskList",
    // Default state of an empty task list
    lists: {
      taskList: {
        label: "",
        tasks: [],
        completed: [],
      },
    },
  },
  TimerWidget: {
    // The timer will have 2 types of states, focus and break.
    // Focus will the default state
    timerType: "focus",
    focus: {
      // Timer duration set by user; 25 mins by default
      duration: 25 * 60,
      // Initial duration - also set by the user; does not update until timer ends or user resets timer
      initialDuration: 25 * 60,
      // the Date.now() value when a user starts/resumes a timer
      startTime: null,
      // Boolean indicating if timer is currently running
      isRunning: false,
    },
    break: {
      duration: 5 * 60,
      initialDuration: 5 * 60,
      startTime: null,
      isRunning: false,
    },
  },
  ExternalComponents: {
    components: [],
  },
};

function App(prevState = INITIAL_STATE.App, action) {
  switch (action.type) {
    case actionTypes.INIT:
      return Object.assign({}, prevState, action.data || {}, {
        initialized: true,
      });
    case actionTypes.TOP_SITES_UPDATED:
      // Toggle `isForStartupCache.TopSites` when receiving the `TOP_SITES_UPDATE` action
      // so that sponsored tiles can be rendered as usual. See Bug 1826360.
      return {
        ...prevState,
        isForStartupCache: { ...prevState.isForStartupCache, TopSites: false },
      };
    case actionTypes.DISCOVERY_STREAM_SPOCS_UPDATE:
      // Toggle `isForStartupCache.DiscoveryStream` when receiving the `DISCOVERY_STREAM_SPOCS_UPDATE` action
      // so that spoc cards can be rendered as usual.
      return {
        ...prevState,
        isForStartupCache: {
          ...prevState.isForStartupCache,
          DiscoveryStream: false,
        },
      };
    case actionTypes.WEATHER_UPDATE:
      // Toggle `isForStartupCache.Weather` when receiving the `WEATHER_UPDATE` action
      // so that weather can be rendered as usual.
      return {
        ...prevState,
        isForStartupCache: { ...prevState.isForStartupCache, Weather: false },
      };
    case actionTypes.WALLPAPERS_CUSTOM_SET:
      // Toggle `isForStartupCache.Wallpaper` when receiving the `WALLPAPERS_CUSTOM_SET` action
      // so that custom wallpaper can be rendered as usual.
      return {
        ...prevState,
        isForStartupCache: { ...prevState.isForStartupCache, Wallpaper: false },
      };
    case actionTypes.SHOW_PERSONALIZE:
      return Object.assign({}, prevState, {
        customizeMenuVisible: true,
      });
    case actionTypes.HIDE_PERSONALIZE:
      return Object.assign({}, prevState, {
        customizeMenuVisible: false,
      });
    default:
      return prevState;
  }
}

function TopSites(prevState = INITIAL_STATE.TopSites, action) {
  let hasMatch;
  let newRows;
  switch (action.type) {
    case actionTypes.TOP_SITES_UPDATED:
      if (!action.data || !action.data.links) {
        return prevState;
      }
      return Object.assign(
        {},
        prevState,
        { initialized: true, rows: action.data.links },
        action.data.pref ? { pref: action.data.pref } : {}
      );
    case actionTypes.TOP_SITES_PREFS_UPDATED:
      return Object.assign({}, prevState, { pref: action.data.pref });
    case actionTypes.TOP_SITES_EDIT:
      return Object.assign({}, prevState, {
        editForm: {
          index: action.data.index,
          previewResponse: null,
        },
      });
    case actionTypes.TOP_SITES_CANCEL_EDIT:
      return Object.assign({}, prevState, { editForm: null });
    case actionTypes.TOP_SITES_OPEN_SEARCH_SHORTCUTS_MODAL:
      return Object.assign({}, prevState, { showSearchShortcutsForm: true });
    case actionTypes.TOP_SITES_CLOSE_SEARCH_SHORTCUTS_MODAL:
      return Object.assign({}, prevState, { showSearchShortcutsForm: false });
    case actionTypes.PREVIEW_RESPONSE:
      if (
        !prevState.editForm ||
        action.data.url !== prevState.editForm.previewUrl
      ) {
        return prevState;
      }
      return Object.assign({}, prevState, {
        editForm: {
          index: prevState.editForm.index,
          previewResponse: action.data.preview,
          previewUrl: action.data.url,
        },
      });
    case actionTypes.PREVIEW_REQUEST:
      if (!prevState.editForm) {
        return prevState;
      }
      return Object.assign({}, prevState, {
        editForm: {
          index: prevState.editForm.index,
          previewResponse: null,
          previewUrl: action.data.url,
        },
      });
    case actionTypes.PREVIEW_REQUEST_CANCEL:
      if (!prevState.editForm) {
        return prevState;
      }
      return Object.assign({}, prevState, {
        editForm: {
          index: prevState.editForm.index,
          previewResponse: null,
        },
      });
    case actionTypes.SCREENSHOT_UPDATED:
      newRows = prevState.rows.map(row => {
        if (row && row.url === action.data.url) {
          hasMatch = true;
          return Object.assign({}, row, { screenshot: action.data.screenshot });
        }
        return row;
      });
      return hasMatch
        ? Object.assign({}, prevState, { rows: newRows })
        : prevState;
    case actionTypes.PLACES_BOOKMARK_ADDED:
      if (!action.data) {
        return prevState;
      }
      newRows = prevState.rows.map(site => {
        if (site && site.url === action.data.url) {
          const { bookmarkGuid, bookmarkTitle, dateAdded } = action.data;
          return Object.assign({}, site, {
            bookmarkGuid,
            bookmarkTitle,
            bookmarkDateCreated: dateAdded,
          });
        }
        return site;
      });
      return Object.assign({}, prevState, { rows: newRows });
    case actionTypes.PLACES_BOOKMARKS_REMOVED:
      if (!action.data) {
        return prevState;
      }
      newRows = prevState.rows.map(site => {
        if (site && action.data.urls.includes(site.url)) {
          const newSite = Object.assign({}, site);
          delete newSite.bookmarkGuid;
          delete newSite.bookmarkTitle;
          delete newSite.bookmarkDateCreated;
          return newSite;
        }
        return site;
      });
      return Object.assign({}, prevState, { rows: newRows });
    case actionTypes.PLACES_LINKS_DELETED:
      if (!action.data) {
        return prevState;
      }
      newRows = prevState.rows.filter(
        site => !action.data.urls.includes(site.url)
      );
      return Object.assign({}, prevState, { rows: newRows });
    case actionTypes.UPDATE_SEARCH_SHORTCUTS:
      return { ...prevState, searchShortcuts: action.data.searchShortcuts };
    case actionTypes.SOV_UPDATED: {
      const sov = {
        ready: action.data.ready,
        positions: action.data.positions,
      };
      return { ...prevState, sov };
    }
    default:
      return prevState;
  }
}

function Dialog(prevState = INITIAL_STATE.Dialog, action) {
  switch (action.type) {
    case actionTypes.DIALOG_OPEN:
      return Object.assign({}, prevState, { visible: true, data: action.data });
    case actionTypes.DIALOG_CANCEL:
      return Object.assign({}, prevState, { visible: false });
    case actionTypes.DIALOG_CLOSE:
      // Reset and hide the confirmation dialog once the action is complete.
      return Object.assign({}, INITIAL_STATE.Dialog);
    default:
      return prevState;
  }
}

function Prefs(prevState = INITIAL_STATE.Prefs, action) {
  let newValues;
  switch (action.type) {
    case actionTypes.PREFS_INITIAL_VALUES:
      return Object.assign({}, prevState, {
        initialized: true,
        values: action.data,
      });
    case actionTypes.PREF_CHANGED:
      newValues = Object.assign({}, prevState.values);
      newValues[action.data.name] = action.data.value;
      return Object.assign({}, prevState, { values: newValues });
    default:
      return prevState;
  }
}

function Sections(prevState = INITIAL_STATE.Sections, action) {
  let hasMatch;
  let newState;
  switch (action.type) {
    case actionTypes.SECTION_DEREGISTER:
      return prevState.filter(section => section.id !== action.data);
    case actionTypes.SECTION_REGISTER:
      // If section exists in prevState, update it
      newState = prevState.map(section => {
        if (section && section.id === action.data.id) {
          hasMatch = true;
          return Object.assign({}, section, action.data);
        }
        return section;
      });
      // Otherwise, append it
      if (!hasMatch) {
        const initialized = !!(action.data.rows && !!action.data.rows.length);
        const section = Object.assign(
          { title: "", rows: [], enabled: false },
          action.data,
          { initialized }
        );
        newState.push(section);
      }
      return newState;
    case actionTypes.SECTION_UPDATE:
      newState = prevState.map(section => {
        if (section && section.id === action.data.id) {
          // If the action is updating rows, we should consider initialized to be true.
          // This can be overridden if initialized is defined in the action.data
          const initialized = action.data.rows ? { initialized: true } : {};

          // Make sure pinned cards stay at their current position when rows are updated.
          // Disabling a section (SECTION_UPDATE with empty rows) does not retain pinned cards.
          if (
            action.data.rows &&
            !!action.data.rows.length &&
            section.rows.find(card => card.pinned)
          ) {
            const rows = Array.from(action.data.rows);
            section.rows.forEach((card, index) => {
              if (card.pinned) {
                // Only add it if it's not already there.
                if (rows[index].guid !== card.guid) {
                  rows.splice(index, 0, card);
                }
              }
            });
            return Object.assign(
              {},
              section,
              initialized,
              Object.assign({}, action.data, { rows })
            );
          }

          return Object.assign({}, section, initialized, action.data);
        }
        return section;
      });

      if (!action.data.dedupeConfigurations) {
        return newState;
      }

      action.data.dedupeConfigurations.forEach(dedupeConf => {
        newState = newState.map(section => {
          if (section.id === dedupeConf.id) {
            const dedupedRows = dedupeConf.dedupeFrom.reduce(
              (rows, dedupeSectionId) => {
                const dedupeSection = newState.find(
                  s => s.id === dedupeSectionId
                );
                const [, newRows] = dedupe.group(dedupeSection.rows, rows);
                return newRows;
              },
              section.rows
            );

            return Object.assign({}, section, { rows: dedupedRows });
          }

          return section;
        });
      });

      return newState;
    case actionTypes.SECTION_UPDATE_CARD:
      return prevState.map(section => {
        if (section && section.id === action.data.id && section.rows) {
          const newRows = section.rows.map(card => {
            if (card.url === action.data.url) {
              return Object.assign({}, card, action.data.options);
            }
            return card;
          });
          return Object.assign({}, section, { rows: newRows });
        }
        return section;
      });
    case actionTypes.PLACES_BOOKMARK_ADDED:
      if (!action.data) {
        return prevState;
      }
      return prevState.map(section =>
        Object.assign({}, section, {
          rows: section.rows.map(item => {
            // find the item within the rows that is attempted to be bookmarked
            if (item.url === action.data.url) {
              const { bookmarkGuid, bookmarkTitle, dateAdded } = action.data;
              return Object.assign({}, item, {
                bookmarkGuid,
                bookmarkTitle,
                bookmarkDateCreated: dateAdded,
                type: "bookmark",
              });
            }
            return item;
          }),
        })
      );
    case actionTypes.PLACES_BOOKMARKS_REMOVED:
      if (!action.data) {
        return prevState;
      }
      return prevState.map(section =>
        Object.assign({}, section, {
          rows: section.rows.map(item => {
            // find the bookmark within the rows that is attempted to be removed
            if (action.data.urls.includes(item.url)) {
              const newSite = Object.assign({}, item);
              delete newSite.bookmarkGuid;
              delete newSite.bookmarkTitle;
              delete newSite.bookmarkDateCreated;
              if (!newSite.type || newSite.type === "bookmark") {
                newSite.type = "history";
              }
              return newSite;
            }
            return item;
          }),
        })
      );
    case actionTypes.PLACES_LINKS_DELETED:
      if (!action.data) {
        return prevState;
      }
      return prevState.map(section =>
        Object.assign({}, section, {
          rows: section.rows.filter(
            site => !action.data.urls.includes(site.url)
          ),
        })
      );
    case actionTypes.PLACES_LINK_BLOCKED:
      if (!action.data) {
        return prevState;
      }
      return prevState.map(section =>
        Object.assign({}, section, {
          rows: section.rows.filter(site => site.url !== action.data.url),
        })
      );
    default:
      return prevState;
  }
}

function Messages(prevState = INITIAL_STATE.Messages, action) {
  switch (action.type) {
    case actionTypes.MESSAGE_SET:
      if (prevState.messageData.messageType) {
        return prevState;
      }
      return {
        ...prevState,
        messageData: action.data.message,
        portID: action.data.portID || "",
      };
    case actionTypes.MESSAGE_TOGGLE_VISIBILITY:
      return { ...prevState, isVisible: action.data.isVisible };
    default:
      return prevState;
  }
}

function Pocket(prevState = INITIAL_STATE.Pocket, action) {
  switch (action.type) {
    case actionTypes.POCKET_WAITING_FOR_SPOC:
      return { ...prevState, waitingForSpoc: action.data };
    case actionTypes.POCKET_CTA:
      return {
        ...prevState,
        pocketCta: {
          ctaButton: action.data.cta_button,
          ctaText: action.data.cta_text,
          ctaUrl: action.data.cta_url,
          useCta: action.data.use_cta,
        },
      };
    default:
      return prevState;
  }
}

function InferredPersonalization(
  prevState = INITIAL_STATE.InferredPersonalization,
  action
) {
  switch (action.type) {
    case actionTypes.INFERRED_PERSONALIZATION_UPDATE:
      return {
        ...prevState,
        initialized: true,
        inferredInterests: action.data.inferredInterests,
        coarseInferredInterests: action.data.coarseInferredInterests,
        coarsePrivateInferredInterests:
          action.data.coarsePrivateInferredInterests,
        lastUpdated: action.data.lastUpdated,
      };
    case actionTypes.INFERRED_PERSONALIZATION_RESET:
      return { ...INITIAL_STATE.InferredPersonalization };
    default:
      return prevState;
  }
}

// eslint-disable-next-line complexity
function DiscoveryStream(prevState = INITIAL_STATE.DiscoveryStream, action) {
  // Return if action data is empty, or spocs or feeds data is not loaded
  const isNotReady = () =>
    !action.data || !prevState.spocs.loaded || !prevState.feeds.loaded;

  const handlePlacements = handleSites => {
    const { data, placements } = prevState.spocs;
    const result = {};

    const forPlacement = placement => {
      const placementSpocs = data[placement.name];

      if (
        !placementSpocs ||
        !placementSpocs.items ||
        !placementSpocs.items.length
      ) {
        return;
      }

      result[placement.name] = {
        ...placementSpocs,
        items: handleSites(placementSpocs.items),
      };
    };

    if (!placements || !placements.length) {
      [{ name: "spocs" }].forEach(forPlacement);
    } else {
      placements.forEach(forPlacement);
    }
    return result;
  };

  const nextState = handleSites => ({
    ...prevState,
    spocs: {
      ...prevState.spocs,
      data: handlePlacements(handleSites),
    },
    feeds: {
      ...prevState.feeds,
      data: Object.keys(prevState.feeds.data).reduce(
        (accumulator, feed_url) => {
          accumulator[feed_url] = {
            data: {
              ...prevState.feeds.data[feed_url].data,
              recommendations: handleSites(
                prevState.feeds.data[feed_url].data.recommendations
              ),
            },
          };
          return accumulator;
        },
        {}
      ),
    },
  });

  switch (action.type) {
    case actionTypes.DISCOVERY_STREAM_CONFIG_CHANGE:
    // Fall through to a separate action is so it doesn't trigger a listener update on init
    case actionTypes.DISCOVERY_STREAM_CONFIG_SETUP:
      return { ...prevState, config: action.data || {} };
    case actionTypes.DISCOVERY_STREAM_EXPERIMENT_DATA:
      return { ...prevState, experimentData: action.data || {} };
    case actionTypes.DISCOVERY_STREAM_LAYOUT_UPDATE:
      return {
        ...prevState,
        layout: action.data.layout || [],
      };
    case actionTypes.DISCOVERY_STREAM_TOPICS_LOADING:
      return {
        ...prevState,
        topicsLoading: action.data,
      };
    case actionTypes.DISCOVERY_STREAM_PREFS_SETUP:
      return {
        ...prevState,
        hideDescriptions: action.data.hideDescriptions,
        compactImages: action.data.compactImages,
        imageGradient: action.data.imageGradient,
        newSponsoredLabel: action.data.newSponsoredLabel,
        titleLines: action.data.titleLines,
        descLines: action.data.descLines,
        readTime: action.data.readTime,
      };
    case actionTypes.SHOW_PRIVACY_INFO:
      return {
        ...prevState,
      };
    case actionTypes.DISCOVERY_STREAM_LAYOUT_RESET:
      return { ...INITIAL_STATE.DiscoveryStream, config: prevState.config };
    case actionTypes.DISCOVERY_STREAM_FEEDS_UPDATE:
      return {
        ...prevState,
        feeds: {
          ...prevState.feeds,
          loaded: true,
        },
      };
    case actionTypes.DISCOVERY_STREAM_FEED_UPDATE: {
      const newData = {};
      newData[action.data.url] = action.data.feed;
      return {
        ...prevState,
        feeds: {
          ...prevState.feeds,
          data: {
            ...prevState.feeds.data,
            ...newData,
          },
        },
      };
    }
    case actionTypes.DISCOVERY_STREAM_DEV_IMPRESSIONS:
      return {
        ...prevState,
        impressions: {
          ...prevState.impressions,
          feed: action.data,
        },
      };
    case actionTypes.DISCOVERY_STREAM_DEV_BLOCKS:
      return {
        ...prevState,
        blocks: action.data,
      };
    case actionTypes.DISCOVERY_STREAM_SPOCS_CAPS:
      return {
        ...prevState,
        spocs: {
          ...prevState.spocs,
          frequency_caps: [...prevState.spocs.frequency_caps, ...action.data],
        },
      };
    case actionTypes.DISCOVERY_STREAM_SPOCS_ENDPOINT:
      return {
        ...prevState,
        spocs: {
          ...INITIAL_STATE.DiscoveryStream.spocs,
          spocs_endpoint:
            action.data.url ||
            INITIAL_STATE.DiscoveryStream.spocs.spocs_endpoint,
        },
      };
    case actionTypes.DISCOVERY_STREAM_SPOCS_PLACEMENTS:
      return {
        ...prevState,
        spocs: {
          ...prevState.spocs,
          placements:
            action.data.placements ||
            INITIAL_STATE.DiscoveryStream.spocs.placements,
        },
      };
    case actionTypes.DISCOVERY_STREAM_SPOCS_UPDATE:
      if (action.data) {
        // If spocs have been loaded on this tab, we can ignore future updates.
        // This should never be true on the main store, only content pages.
        // We check agasint onDemand just to be safe. It generally shouldn't be needed.
        if (prevState.spocs?.onDemand?.loaded) {
          return prevState;
        }
        return {
          ...prevState,
          spocs: {
            ...prevState.spocs,
            lastUpdated: action.data.lastUpdated,
            data: action.data.spocs,
            cacheUpdateTime: action.data.spocsCacheUpdateTime,
            onDemand: {
              enabled: action.data.spocsOnDemand,
              loaded: false,
            },
            loaded: true,
          },
        };
      }
      return prevState;
    case actionTypes.DISCOVERY_STREAM_SPOCS_ONDEMAND_LOAD:
      return {
        ...prevState,
        spocs: {
          ...prevState.spocs,
          onDemand: {
            ...prevState.spocs.onDemand,
            loaded: true,
          },
        },
      };
    case actionTypes.DISCOVERY_STREAM_SPOCS_ONDEMAND_RESET:
      if (action.data) {
        return {
          ...prevState,
          spocs: {
            ...prevState.spocs,
            cacheUpdateTime: action.data.spocsCacheUpdateTime,
            onDemand: {
              ...prevState.spocs.onDemand,
              enabled: action.data.spocsOnDemand,
            },
          },
        };
      }
      return prevState;
    case actionTypes.DISCOVERY_STREAM_SPOC_BLOCKED:
      return {
        ...prevState,
        spocs: {
          ...prevState.spocs,
          blocked: [...prevState.spocs.blocked, action.data.url],
        },
      };
    case actionTypes.DISCOVERY_STREAM_LINK_BLOCKED:
      return isNotReady()
        ? prevState
        : nextState(items =>
            items.filter(item => item.url !== action.data.url)
          );

    case actionTypes.PLACES_BOOKMARK_ADDED: {
      const updateBookmarkInfo = item => {
        if (item.url === action.data.url) {
          const { bookmarkGuid, bookmarkTitle, dateAdded } = action.data;
          return Object.assign({}, item, {
            bookmarkGuid,
            bookmarkTitle,
            bookmarkDateCreated: dateAdded,
            context_type: "bookmark",
          });
        }
        return item;
      };
      return isNotReady()
        ? prevState
        : nextState(items => items.map(updateBookmarkInfo));
    }
    case actionTypes.PLACES_BOOKMARKS_REMOVED: {
      const removeBookmarkInfo = item => {
        if (action.data.urls.includes(item.url)) {
          const newSite = Object.assign({}, item);
          delete newSite.bookmarkGuid;
          delete newSite.bookmarkTitle;
          delete newSite.bookmarkDateCreated;
          if (!newSite.context_type || newSite.context_type === "bookmark") {
            newSite.context_type = "removedBookmark";
          }
          return newSite;
        }
        return item;
      };
      return isNotReady()
        ? prevState
        : nextState(items => items.map(removeBookmarkInfo));
    }
    case actionTypes.TOPIC_SELECTION_SPOTLIGHT_OPEN:
      return {
        ...prevState,
        showTopicSelection: true,
      };
    case actionTypes.TOPIC_SELECTION_SPOTLIGHT_CLOSE:
      return {
        ...prevState,
        showTopicSelection: false,
      };
    case actionTypes.SECTION_BLOCKED:
      return {
        ...prevState,
        showBlockSectionConfirmation: true,
        sectionPersonalization: action.data,
      };
    case actionTypes.REPORT_AD_OPEN:
      return {
        ...prevState,
        report: {
          ...prevState.report,
          card_type: action.data?.card_type,
          position: action.data?.position,
          placement_id: action.data?.placement_id,
          reporting_url: action.data?.reporting_url,
          url: action.data?.url,
          visible: true,
        },
      };
    case actionTypes.REPORT_CONTENT_OPEN:
      return {
        ...prevState,
        report: {
          ...prevState.report,
          card_type: action.data?.card_type,
          corpus_item_id: action.data?.corpus_item_id,
          scheduled_corpus_item_id: action.data?.scheduled_corpus_item_id,
          section_position: action.data?.section_position,
          section: action.data?.section,
          title: action.data?.title,
          topic: action.data?.topic,
          url: action.data?.url,
          visible: true,
        },
      };
    case actionTypes.REPORT_CLOSE:
    case actionTypes.REPORT_AD_SUBMIT:
    case actionTypes.REPORT_CONTENT_SUBMIT:
      return {
        ...prevState,
        report: {
          ...prevState.report,
          visible: false,
        },
      };
    case actionTypes.SECTION_PERSONALIZATION_UPDATE:
      return { ...prevState, sectionPersonalization: action.data };
    default:
      return prevState;
  }
}

function Search(prevState = INITIAL_STATE.Search, action) {
  switch (action.type) {
    case actionTypes.DISABLE_SEARCH:
      return Object.assign({ ...prevState, disable: true });
    case actionTypes.FAKE_FOCUS_SEARCH:
      return Object.assign({ ...prevState, fakeFocus: true });
    case actionTypes.SHOW_SEARCH:
      return Object.assign({ ...prevState, disable: false, fakeFocus: false });
    default:
      return prevState;
  }
}

function Wallpapers(prevState = INITIAL_STATE.Wallpapers, action) {
  switch (action.type) {
    case actionTypes.WALLPAPERS_SET:
      return {
        ...prevState,
        wallpaperList: action.data,
      };
    case actionTypes.WALLPAPERS_FEATURE_HIGHLIGHT_COUNTER_INCREMENT:
      return {
        ...prevState,
        highlightSeenCounter: action.data,
      };
    case actionTypes.WALLPAPERS_CATEGORY_SET:
      return { ...prevState, categories: action.data };
    case actionTypes.WALLPAPERS_CUSTOM_SET:
      return { ...prevState, uploadedWallpaper: action.data };
    default:
      return prevState;
  }
}

function Notifications(prevState = INITIAL_STATE.Notifications, action) {
  switch (action.type) {
    case actionTypes.SHOW_TOAST_MESSAGE:
      return {
        ...prevState,
        showNotifications: action.data.showNotifications,
        toastCounter: prevState.toastCounter + 1,
        toastId: action.data.toastId,
        toastQueue: [action.data.toastId],
      };
    case actionTypes.HIDE_TOAST_MESSAGE: {
      const { showNotifications, toastId: hiddenToastId } = action.data;
      const queuedToasts = [...prevState.toastQueue].filter(
        toastId => toastId !== hiddenToastId
      );
      return {
        ...prevState,
        toastCounter: queuedToasts.length,
        toastQueue: queuedToasts,
        toastId: "",
        showNotifications,
      };
    }
    default:
      return prevState;
  }
}

function Weather(prevState = INITIAL_STATE.Weather, action) {
  switch (action.type) {
    case actionTypes.WEATHER_UPDATE:
      return {
        ...prevState,
        suggestions: action.data.suggestions,
        lastUpdated: action.data.date,
        locationData: action.data.locationData || prevState.locationData,
        initialized: true,
      };
    case actionTypes.WEATHER_SEARCH_ACTIVE:
      return { ...prevState, searchActive: action.data };
    case actionTypes.WEATHER_LOCATION_SEARCH_UPDATE:
      return { ...prevState, locationSearchString: action.data };
    case actionTypes.WEATHER_LOCATION_SUGGESTIONS_UPDATE:
      return { ...prevState, suggestedLocations: action.data };
    case actionTypes.WEATHER_LOCATION_DATA_UPDATE:
      return { ...prevState, locationData: action.data };
    default:
      return prevState;
  }
}

function Ads(prevState = INITIAL_STATE.Ads, action) {
  switch (action.type) {
    case actionTypes.ADS_INIT:
      return {
        ...prevState,
        initialized: true,
      };
    case actionTypes.ADS_UPDATE_TILES:
      return {
        ...prevState,
        tiles: action.data.tiles,
      };
    case actionTypes.ADS_UPDATE_SPOCS:
      return {
        ...prevState,
        spocs: action.data.spocs,
        spocPlacements: action.data.spocPlacements,
      };
    case actionTypes.ADS_RESET:
      return { ...INITIAL_STATE.Ads };
    default:
      return prevState;
  }
}

function TimerWidget(prevState = INITIAL_STATE.TimerWidget, action) {
  // fallback to current timerType in state if not provided in action
  const timerType = action.data?.timerType || prevState.timerType;
  switch (action.type) {
    case actionTypes.WIDGETS_TIMER_SET:
      return {
        ...prevState,
        ...action.data,
      };
    case actionTypes.WIDGETS_TIMER_SET_TYPE:
      return {
        ...prevState,
        timerType: action.data.timerType,
      };
    case actionTypes.WIDGETS_TIMER_SET_DURATION:
      return {
        ...prevState,
        [timerType]: {
          // setting a dynamic key assignment to let us dynamically update timer type's state based on what is set
          duration: action.data.duration,
          initialDuration: action.data.duration,
          startTime: null,
          isRunning: false,
        },
      };
    case actionTypes.WIDGETS_TIMER_PLAY:
      return {
        ...prevState,
        [timerType]: {
          ...prevState[timerType],
          startTime: Math.floor(Date.now() / 1000), // reflected in seconds
          isRunning: true,
        },
      };
    case actionTypes.WIDGETS_TIMER_PAUSE:
      if (prevState[timerType]?.isRunning) {
        return {
          ...prevState,
          [timerType]: {
            ...prevState[timerType],
            duration: action.data.duration,
            // setting startTime to null on pause because we need to check the exact time the user presses play,
            // whether it's when the user starts or resumes the timer. This helps get accurate results
            startTime: null,
            isRunning: false,
          },
        };
      }
      return prevState;
    case actionTypes.WIDGETS_TIMER_RESET:
      return {
        ...prevState,
        [timerType]: {
          ...prevState[timerType],
          duration: action.data.duration,
          initialDuration: action.data.duration,
          startTime: null,
          isRunning: false,
        },
      };
    case actionTypes.WIDGETS_TIMER_END:
      return {
        ...prevState,
        [timerType]: {
          ...prevState[timerType],
          duration: action.data.duration,
          initialDuration: action.data.duration,
          startTime: null,
          isRunning: false,
        },
      };
    default:
      return prevState;
  }
}

function ListsWidget(prevState = INITIAL_STATE.ListsWidget, action) {
  switch (action.type) {
    case actionTypes.WIDGETS_LISTS_SET:
      return { ...prevState, lists: action.data };
    case actionTypes.WIDGETS_LISTS_SET_SELECTED:
      return { ...prevState, selected: action.data };
    default:
      return prevState;
  }
}

function ExternalComponents(
  prevState = INITIAL_STATE.ExternalComponents,
  action
) {
  switch (action.type) {
    case actionTypes.REFRESH_EXTERNAL_COMPONENTS:
      return { ...prevState, components: action.data };
    default:
      return prevState;
  }
}

const reducers = {
  TopSites,
  App,
  Ads,
  Prefs,
  Dialog,
  Sections,
  Messages,
  Notifications,
  Pocket,
  InferredPersonalization,
  DiscoveryStream,
  Search,
  TimerWidget,
  ListsWidget,
  Wallpapers,
  Weather,
  ExternalComponents,
};

;// CONCATENATED MODULE: ./content-src/components/TopSites/TopSiteFormInput.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


class TopSiteFormInput extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      validationError: this.props.validationError
    };
    this.onChange = this.onChange.bind(this);
    this.onMount = this.onMount.bind(this);
    this.onClearIconPress = this.onClearIconPress.bind(this);
  }
  componentWillReceiveProps(nextProps) {
    if (nextProps.shouldFocus && !this.props.shouldFocus) {
      this.input.focus();
    }
    if (nextProps.validationError && !this.props.validationError) {
      this.setState({
        validationError: true
      });
    }
    // If the component is in an error state but the value was cleared by the parent
    if (this.state.validationError && !nextProps.value) {
      this.setState({
        validationError: false
      });
    }
  }
  onClearIconPress(event) {
    // If there is input in the URL or custom image URL fields,
    // and we hit 'enter' while tabbed over the clear icon,
    // we should execute the function to clear the field.
    if (event.key === "Enter") {
      this.props.onClear();
    }
  }
  onChange(ev) {
    if (this.state.validationError) {
      this.setState({
        validationError: false
      });
    }
    this.props.onChange(ev);
  }
  onMount(input) {
    this.input = input;
  }
  renderLoadingOrCloseButton() {
    const showClearButton = this.props.value && this.props.onClear;
    if (this.props.loading) {
      return /*#__PURE__*/external_React_default().createElement("div", {
        className: "loading-container"
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "loading-animation"
      }));
    } else if (showClearButton) {
      return /*#__PURE__*/external_React_default().createElement("button", {
        type: "button",
        className: "icon icon-clear-input icon-button-style",
        onClick: this.props.onClear,
        onKeyPress: this.onClearIconPress
      });
    }
    return null;
  }
  render() {
    const {
      typeUrl
    } = this.props;
    const {
      validationError
    } = this.state;
    return /*#__PURE__*/external_React_default().createElement("label", null, /*#__PURE__*/external_React_default().createElement("span", {
      "data-l10n-id": this.props.titleId
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: `field ${typeUrl ? "url" : ""}${validationError ? " invalid" : ""}`
    }, /*#__PURE__*/external_React_default().createElement("input", {
      type: "text",
      value: this.props.value,
      ref: this.onMount,
      onChange: this.onChange,
      "data-l10n-id": this.props.placeholderId
      // Set focus on error if the url field is valid or when the input is first rendered and is empty
      // eslint-disable-next-line jsx-a11y/no-autofocus
      ,
      autoFocus: this.props.autoFocusOnOpen,
      disabled: this.props.loading
    }), this.renderLoadingOrCloseButton(), validationError && /*#__PURE__*/external_React_default().createElement("aside", {
      className: "error-tooltip",
      "data-l10n-id": this.props.errorMessageId
    })));
  }
}
TopSiteFormInput.defaultProps = {
  showClearButton: false,
  value: "",
  validationError: false
};
;// CONCATENATED MODULE: ./content-src/components/TopSites/TopSiteImpressionWrapper.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



const TopSiteImpressionWrapper_VISIBLE = "visible";
const TopSiteImpressionWrapper_VISIBILITY_CHANGE_EVENT = "visibilitychange";

// Per analytical requirement, we set the minimal intersection ratio to
// 0.5, and an impression is identified when the wrapped item has at least
// 50% visibility.
//
// This constant is exported for unit test
const TopSiteImpressionWrapper_INTERSECTION_RATIO = 0.5;

/**
 * Impression wrapper for a TopSite tile.
 *
 * It makses use of the Intersection Observer API to detect the visibility,
 * and relies on page visibility to ensure the impression is reported
 * only when the component is visible on the page.
 */
class TopSiteImpressionWrapper extends (external_React_default()).PureComponent {
  _dispatchImpressionStats() {
    const {
      actionType,
      tile
    } = this.props;
    if (!actionType) {
      return;
    }
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionType,
      data: {
        type: "impression",
        ...tile
      }
    }));
  }
  setImpressionObserverOrAddListener() {
    const {
      props
    } = this;
    if (!props.dispatch) {
      return;
    }
    if (props.document.visibilityState === TopSiteImpressionWrapper_VISIBLE) {
      this.setImpressionObserver();
    } else {
      // We should only ever send the latest impression stats ping, so remove any
      // older listeners.
      if (this._onVisibilityChange) {
        props.document.removeEventListener(TopSiteImpressionWrapper_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
      }
      this._onVisibilityChange = () => {
        if (props.document.visibilityState === TopSiteImpressionWrapper_VISIBLE) {
          this.setImpressionObserver();
          props.document.removeEventListener(TopSiteImpressionWrapper_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
        }
      };
      props.document.addEventListener(TopSiteImpressionWrapper_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
  }

  /**
   * Set an impression observer for the wrapped component. It makes use of
   * the Intersection Observer API to detect if the wrapped component is
   * visible with a desired ratio, and only sends impression if that's the case.
   *
   * See more details about Intersection Observer API at:
   * https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
   */
  setImpressionObserver() {
    const {
      props
    } = this;
    if (!props.tile) {
      return;
    }
    this._handleIntersect = entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= TopSiteImpressionWrapper_INTERSECTION_RATIO)) {
        this._dispatchImpressionStats();
        this.impressionObserver.unobserve(this.refs.topsite_impression_wrapper);
      }
    };
    const options = {
      threshold: TopSiteImpressionWrapper_INTERSECTION_RATIO
    };
    this.impressionObserver = new props.IntersectionObserver(this._handleIntersect, options);
    this.impressionObserver.observe(this.refs.topsite_impression_wrapper);
  }
  componentDidMount() {
    if (this.props.tile) {
      this.setImpressionObserverOrAddListener();
    }
  }
  componentWillUnmount() {
    if (this._handleIntersect && this.impressionObserver) {
      this.impressionObserver.unobserve(this.refs.topsite_impression_wrapper);
    }
    if (this._onVisibilityChange) {
      this.props.document.removeEventListener(TopSiteImpressionWrapper_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("div", {
      ref: "topsite_impression_wrapper",
      className: "topsite-impression-observer"
    }, this.props.children);
  }
}
TopSiteImpressionWrapper.defaultProps = {
  IntersectionObserver: globalThis.IntersectionObserver,
  document: globalThis.document,
  actionType: null,
  tile: null
};
;// CONCATENATED MODULE: ./content-src/components/MessageWrapper/MessageWrapper.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */






// Note: MessageWrapper emits events via submitGleanPingForPing() in the OMC messaging-system.
// If a feature is triggered outside of this flow (e.g., the Mobile Download QR Promo),
// it should emit New Tab-specific Glean events independently.

function MessageWrapper({
  children,
  dispatch,
  hiddenOverride,
  onDismiss
}) {
  const message = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Messages);
  const [isIntersecting, setIsIntersecting] = (0,external_React_namespaceObject.useState)(false);
  const [tabIsVisible, setTabIsVisible] = (0,external_React_namespaceObject.useState)(() => typeof document !== "undefined" && document.visibilityState === "visible");
  const [hasRun, setHasRun] = (0,external_React_namespaceObject.useState)();
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    setIsIntersecting(true);
    // only send impression if messageId is defined and tab is visible
    if (tabIsVisible && message.messageData.id && !hasRun) {
      setHasRun(true);
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.MESSAGE_IMPRESSION,
        data: message.messageData
      }));
    }
  }, [dispatch, message, tabIsVisible, hasRun]);
  (0,external_React_namespaceObject.useEffect)(() => {
    // we dont want to dispatch this action unless the current tab is open and visible
    if (message.isVisible && tabIsVisible) {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.MESSAGE_NOTIFY_VISIBILITY,
        data: true
      }));
    }
  }, [message, dispatch, tabIsVisible]);
  (0,external_React_namespaceObject.useEffect)(() => {
    const handleVisibilityChange = () => {
      setTabIsVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);
  const ref = useIntersectionObserver(handleIntersection);
  const handleClose = (0,external_React_namespaceObject.useCallback)(() => {
    const action = {
      type: actionTypes.MESSAGE_TOGGLE_VISIBILITY,
      data: false //isVisible
    };
    if (message.portID) {
      dispatch(actionCreators.OnlyToOneContent(action, message.portID));
    } else {
      dispatch(actionCreators.AlsoToMain(action));
    }
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.MESSAGE_NOTIFY_VISIBILITY,
      data: false
    }));
    onDismiss?.();
  }, [dispatch, message, onDismiss]);
  function handleDismiss() {
    const {
      id
    } = message.messageData;
    if (id) {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.MESSAGE_DISMISS,
        data: {
          message: message.messageData
        }
      }));
    }
    handleClose();
  }
  function handleBlock() {
    const {
      id
    } = message.messageData;
    if (id) {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.MESSAGE_BLOCK,
        data: id
      }));
    }
  }
  function handleClick(elementId) {
    const {
      id
    } = message.messageData;
    if (id) {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.MESSAGE_CLICK,
        data: {
          message: message.messageData,
          source: elementId || ""
        }
      }));
    }
  }
  if (!message || !hiddenOverride && !message.isVisible) {
    return null;
  }

  // only display the message if `isVisible` is true
  return /*#__PURE__*/external_React_default().createElement("div", {
    ref: el => {
      ref.current = [el];
    },
    className: "message-wrapper"
  }, /*#__PURE__*/external_React_default().cloneElement(children, {
    isIntersecting,
    handleDismiss,
    handleClick,
    handleBlock,
    handleClose
  }));
}

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/FeatureHighlight/FeatureHighlight.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



function FeatureHighlight({
  message,
  icon,
  toggle,
  arrowPosition = "",
  position = "top-left",
  verticalPosition = "",
  title,
  ariaLabel,
  feature = "FEATURE_HIGHLIGHT_DEFAULT",
  dispatch = () => {},
  windowObj = __webpack_require__.g,
  openedOverride = false,
  showButtonIcon = true,
  dismissCallback = () => {},
  outsideClickCallback = () => {},
  modalClassName = ""
}) {
  const [opened, setOpened] = (0,external_React_namespaceObject.useState)(openedOverride);
  const ref = (0,external_React_namespaceObject.useRef)(null);
  (0,external_React_namespaceObject.useEffect)(() => {
    const handleOutsideClick = e => {
      if (!ref?.current?.contains(e.target)) {
        setOpened(false);
        outsideClickCallback();
      }
    };
    const handleKeyDown = e => {
      if (e.key === "Escape") {
        outsideClickCallback();
      }
    };
    windowObj.document.addEventListener("click", handleOutsideClick);
    windowObj.document.addEventListener("keydown", handleKeyDown);
    return () => {
      windowObj.document.removeEventListener("click", handleOutsideClick);
      windowObj.document.removeEventListener("keydown", handleKeyDown);
    };
  }, [windowObj, outsideClickCallback]);
  const onToggleClick = (0,external_React_namespaceObject.useCallback)(() => {
    if (!opened) {
      dispatch(actionCreators.DiscoveryStreamUserEvent({
        event: "CLICK",
        source: "FEATURE_HIGHLIGHT",
        value: {
          feature
        }
      }));
    }
    setOpened(!opened);
  }, [dispatch, feature, opened]);
  const onDismissClick = (0,external_React_namespaceObject.useCallback)(() => {
    setOpened(false);
    dismissCallback();
  }, [dismissCallback]);
  const hideButtonClass = showButtonIcon ? `` : `isHidden`;
  const openedClassname = opened ? `opened` : `closed`;
  return /*#__PURE__*/external_React_default().createElement("div", {
    ref: ref,
    className: `feature-highlight ${verticalPosition}`
  }, /*#__PURE__*/external_React_default().createElement("button", {
    title: title,
    "aria-haspopup": "true",
    "aria-label": ariaLabel,
    className: `toggle-button ${hideButtonClass}`,
    onClick: onToggleClick
  }, toggle), /*#__PURE__*/external_React_default().createElement("div", {
    className: `feature-highlight-modal ${position} ${arrowPosition} ${modalClassName} ${openedClassname}`
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "message-icon"
  }, icon), /*#__PURE__*/external_React_default().createElement("p", {
    className: "content-wrapper"
  }, message), /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon ghost",
    size: "small",
    "data-l10n-id": "feature-highlight-dismiss-button",
    iconsrc: "chrome://global/skin/icons/close.svg",
    onClick: onDismissClick,
    onKeyDown: onDismissClick
  })));
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/FeatureHighlight/ShortcutFeatureHighlight.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



function ShortcutFeatureHighlight({
  dispatch,
  feature,
  handleBlock,
  handleDismiss,
  messageData,
  position
}) {
  const onDismiss = (0,external_React_namespaceObject.useCallback)(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `shortcut-feature-highlight ${messageData.content?.darkModeDismiss ? "is-inverted-dark-dismiss-button" : ""}`
  }, /*#__PURE__*/external_React_default().createElement(FeatureHighlight, {
    position: position,
    feature: feature,
    dispatch: dispatch,
    message: /*#__PURE__*/external_React_default().createElement("div", {
      className: "shortcut-feature-highlight-content"
    }, /*#__PURE__*/external_React_default().createElement("picture", {
      className: "follow-section-button-highlight-image"
    }, /*#__PURE__*/external_React_default().createElement("source", {
      srcSet: messageData.content?.darkModeImageURL || "chrome://newtab/content/data/content/assets/highlights/omc-newtab-shortcuts.svg",
      media: "(prefers-color-scheme: dark)"
    }), /*#__PURE__*/external_React_default().createElement("source", {
      srcSet: messageData.content?.imageURL || "chrome://newtab/content/data/content/assets/highlights/omc-newtab-shortcuts.svg",
      media: "(prefers-color-scheme: light)"
    }), /*#__PURE__*/external_React_default().createElement("img", {
      width: "320",
      height: "195",
      alt: ""
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "shortcut-feature-highlight-copy"
    }, messageData.content?.cardTitle ? /*#__PURE__*/external_React_default().createElement("p", {
      className: "title"
    }, messageData.content.cardTitle) : /*#__PURE__*/external_React_default().createElement("p", {
      className: "title",
      "data-l10n-id": "newtab-shortcuts-highlight-title"
    }), messageData.content?.cardMessage ? /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle"
    }, messageData.content.cardMessage) : /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle",
      "data-l10n-id": "newtab-shortcuts-highlight-subtitle"
    }))),
    openedOverride: true,
    showButtonIcon: false,
    dismissCallback: onDismiss,
    outsideClickCallback: handleDismiss
  }));
}
;// CONCATENATED MODULE: ./content-src/components/TopSites/TopSite.jsx
function TopSite_extends() { return TopSite_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, TopSite_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */













const SPOC_TYPE = "SPOC";
const NEWTAB_SOURCE = "newtab";

// For cases if we want to know if this is sponsored by either sponsored_position or type.
// We have two sources for sponsored topsites, and
// sponsored_position is set by one sponsored source, and type is set by another.
// This is not called in all cases, sometimes we want to know if it's one source
// or the other. This function is only applicable in cases where we only care if it's either.
function isSponsored(link) {
  return link?.sponsored_position || link?.type === SPOC_TYPE;
}
class TopSiteLink extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      screenshotImage: null
    };
    this.onDragEvent = this.onDragEvent.bind(this);
    this.onKeyPress = this.onKeyPress.bind(this);
    this.shouldShowOMCHighlight = this.shouldShowOMCHighlight.bind(this);
  }

  /*
   * Helper to determine whether the drop zone should allow a drop. We only allow
   * dropping top sites for now. We don't allow dropping on sponsored top sites
   * or the add shortcut button as their position is fixed.
   */
  _allowDrop(e) {
    return (this.dragged || !isSponsored(this.props.link) && !this.props.isAddButton) && e.dataTransfer.types.includes("text/topsite-index");
  }
  onDragEvent(event) {
    switch (event.type) {
      case "click":
        // Stop any link clicks if we started any dragging
        if (this.dragged) {
          event.preventDefault();
        }
        break;
      case "dragstart":
        event.target.blur();
        if (isSponsored(this.props.link)) {
          event.preventDefault();
          break;
        }
        this.dragged = true;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/topsite-index", this.props.index);
        this.props.onDragEvent(event, this.props.index, this.props.link, this.props.title);
        break;
      case "dragend":
        this.props.onDragEvent(event);
        break;
      case "dragenter":
      case "dragover":
      case "drop":
        if (this._allowDrop(event)) {
          event.preventDefault();
          this.props.onDragEvent(event, this.props.index);
        }
        break;
      case "mousedown":
        // Block the scroll wheel from appearing for middle clicks on search top sites
        if (event.button === 1 && this.props.link.searchTopSite) {
          event.preventDefault();
        }
        // Reset at the first mouse event of a potential drag
        this.dragged = false;
        break;
    }
  }

  /**
   * Helper to obtain the next state based on nextProps and prevState.
   *
   * NOTE: Rename this method to getDerivedStateFromProps when we update React
   *       to >= 16.3. We will need to update tests as well. We cannot rename this
   *       method to getDerivedStateFromProps now because there is a mismatch in
   *       the React version that we are using for both testing and production.
   *       (i.e. react-test-render => "16.3.2", react => "16.2.0").
   *
   * See https://github.com/airbnb/enzyme/blob/master/packages/enzyme-adapter-react-16/package.json#L43.
   */
  static getNextStateFromProps(nextProps, prevState) {
    const {
      screenshot
    } = nextProps.link;
    const imageInState = ScreenshotUtils.isRemoteImageLocal(prevState.screenshotImage, screenshot);
    if (imageInState) {
      return null;
    }

    // Since image was updated, attempt to revoke old image blob URL, if it exists.
    ScreenshotUtils.maybeRevokeBlobObjectURL(prevState.screenshotImage);
    return {
      screenshotImage: ScreenshotUtils.createLocalImageObject(screenshot)
    };
  }

  // NOTE: Remove this function when we update React to >= 16.3 since React will
  //       call getDerivedStateFromProps automatically. We will also need to
  //       rename getNextStateFromProps to getDerivedStateFromProps.
  componentWillMount() {
    const nextState = TopSiteLink.getNextStateFromProps(this.props, this.state);
    if (nextState) {
      this.setState(nextState);
    }
  }

  // NOTE: Remove this function when we update React to >= 16.3 since React will
  //       call getDerivedStateFromProps automatically. We will also need to
  //       rename getNextStateFromProps to getDerivedStateFromProps.
  componentWillReceiveProps(nextProps) {
    const nextState = TopSiteLink.getNextStateFromProps(nextProps, this.state);
    if (nextState) {
      this.setState(nextState);
    }
  }
  componentWillUnmount() {
    ScreenshotUtils.maybeRevokeBlobObjectURL(this.state.screenshotImage);
  }
  onKeyPress(event) {
    // If we have tabbed to a search shortcut top site, and we click 'enter',
    // we should execute the onClick function. This needs to be added because
    // search top sites are anchor tags without an href. See bug 1483135
    if (event.key === "Enter" && (this.props.link.searchTopSite || this.props.isAddButton)) {
      this.props.onClick(event);
    }
  }

  /*
   * Takes the url as a string, runs it through a simple (non-secure) hash turning it into a random number
   * Apply that random number to the color array. The same url will always generate the same color.
   */
  generateColor() {
    let {
      title,
      colors
    } = this.props;
    if (!colors) {
      return "";
    }
    let colorArray = colors.split(",");
    const hashStr = str => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        let charCode = str.charCodeAt(i);
        hash += charCode;
      }
      return hash;
    };
    let hash = hashStr(title);
    let index = hash % colorArray.length;
    return colorArray[index];
  }
  calculateStyle() {
    const {
      defaultStyle,
      link
    } = this.props;
    const {
      tippyTopIcon,
      faviconSize
    } = link;
    let imageClassName;
    let imageStyle;
    let showSmallFavicon = false;
    let smallFaviconStyle;
    let hasScreenshotImage = this.state.screenshotImage && this.state.screenshotImage.url;
    let selectedColor;
    if (defaultStyle) {
      // force no styles (letter fallback) even if the link has imagery
      selectedColor = this.generateColor();
    } else if (link.searchTopSite) {
      imageClassName = "top-site-icon rich-icon";
      imageStyle = {
        backgroundColor: link.backgroundColor,
        backgroundImage: `url(${tippyTopIcon})`
      };
      smallFaviconStyle = {
        backgroundImage: `url(${tippyTopIcon})`
      };
    } else if (link.customScreenshotURL) {
      // assume high quality custom screenshot and use rich icon styles and class names
      imageClassName = "top-site-icon rich-icon";
      imageStyle = {
        backgroundColor: link.backgroundColor,
        backgroundImage: hasScreenshotImage ? `url(${this.state.screenshotImage.url})` : ""
      };
    } else if (tippyTopIcon || link.type === SPOC_TYPE || faviconSize >= MIN_RICH_FAVICON_SIZE) {
      // styles and class names for top sites with rich icons
      imageClassName = "top-site-icon rich-icon";
      imageStyle = {
        backgroundColor: link.backgroundColor,
        backgroundImage: `url(${tippyTopIcon || link.favicon})`
      };
    } else if (faviconSize >= MIN_SMALL_FAVICON_SIZE) {
      showSmallFavicon = true;
      smallFaviconStyle = {
        backgroundImage: `url(${link.favicon})`
      };
    } else {
      selectedColor = this.generateColor();
      imageClassName = "";
    }
    return {
      showSmallFavicon,
      smallFaviconStyle,
      imageStyle,
      imageClassName,
      selectedColor
    };
  }
  shouldShowOMCHighlight(componentId) {
    const messageData = this.props.Messages?.messageData;
    if (!messageData || Object.keys(messageData).length === 0) {
      return false;
    }
    return messageData?.content?.messageType === componentId;
  }
  render() {
    const {
      children,
      className,
      isDraggable,
      link,
      onClick,
      title,
      isAddButton,
      visibleTopSites
    } = this.props;
    const topSiteOuterClassName = `top-site-outer${className ? ` ${className}` : ""}${link.isDragged ? " dragged" : ""}${link.searchTopSite ? " search-shortcut" : ""}`;
    const [letterFallback] = title;
    const {
      showSmallFavicon,
      smallFaviconStyle,
      imageStyle,
      imageClassName,
      selectedColor
    } = this.calculateStyle();
    const addButtonLabell10n = {
      "data-l10n-id": "newtab-topsites-add-shortcut-label"
    };
    const addButtonTitlel10n = {
      "data-l10n-id": "newtab-topsites-add-shortcut-title"
    };
    const addPinnedTitlel10n = {
      "data-l10n-id": "topsite-label-pinned",
      "data-l10n-args": JSON.stringify({
        title
      })
    };
    let draggableProps = {};
    if (isDraggable) {
      draggableProps = {
        onClick: this.onDragEvent,
        onDragEnd: this.onDragEvent,
        onDragStart: this.onDragEvent,
        onMouseDown: this.onDragEvent
      };
    }
    let impressionStats = null;
    if (link.type === SPOC_TYPE) {
      // Record impressions for Pocket tiles.
      impressionStats = /*#__PURE__*/external_React_default().createElement(ImpressionStats_ImpressionStats, {
        flightId: link.flightId,
        rows: [{
          id: link.id,
          pos: link.pos,
          shim: link.shim && link.shim.impression,
          advertiser: title.toLocaleLowerCase()
        }],
        dispatch: this.props.dispatch,
        source: TOP_SITES_SOURCE
      });
    } else if (isSponsored(link)) {
      // Record impressions for non-Pocket sponsored tiles.
      impressionStats = /*#__PURE__*/external_React_default().createElement(TopSiteImpressionWrapper, {
        actionType: actionTypes.TOP_SITES_SPONSORED_IMPRESSION_STATS,
        tile: {
          position: this.props.index,
          tile_id: link.sponsored_tile_id || -1,
          reporting_url: link.sponsored_impression_url,
          advertiser: title.toLocaleLowerCase(),
          source: NEWTAB_SOURCE,
          visible_topsites: visibleTopSites,
          frecency_boosted: link.type === "frecency-boost",
          attribution: link.attribution
        }
        // For testing.
        ,
        IntersectionObserver: this.props.IntersectionObserver,
        document: this.props.document,
        dispatch: this.props.dispatch
      });
    } else {
      // Record impressions for organic tiles.
      impressionStats = /*#__PURE__*/external_React_default().createElement(TopSiteImpressionWrapper, {
        actionType: actionTypes.TOP_SITES_ORGANIC_IMPRESSION_STATS,
        tile: {
          position: this.props.index,
          source: NEWTAB_SOURCE,
          isPinned: this.props.link.isPinned,
          guid: this.props.link.guid,
          visible_topsites: visibleTopSites,
          smartScores: this.props.link.scores,
          smartWeights: this.props.link.weights
        }
        // For testing.
        ,
        IntersectionObserver: this.props.IntersectionObserver,
        document: this.props.document,
        dispatch: this.props.dispatch
      });
    }
    return /*#__PURE__*/external_React_default().createElement("li", TopSite_extends({
      className: topSiteOuterClassName,
      onDrop: this.onDragEvent,
      onDragOver: this.onDragEvent,
      onDragEnter: this.onDragEvent,
      onDragLeave: this.onDragEvent,
      ref: this.props.setRef
    }, draggableProps), /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-inner"
    }, /*#__PURE__*/external_React_default().createElement("a", TopSite_extends({
      className: "top-site-button",
      href: link.searchTopSite ? undefined : link.url,
      tabIndex: this.props.tabIndex,
      onKeyPress: this.onKeyPress,
      onClick: onClick,
      draggable: true,
      "data-is-sponsored-link": !!link.sponsored_tile_id,
      onFocus: this.props.onFocus,
      "aria-label": link.isPinned ? undefined : title
    }, isAddButton && {
      ...addButtonTitlel10n
    }, !isAddButton && {
      title
    }, link.isPinned && {
      ...addPinnedTitlel10n
    }, {
      "data-l10n-args": JSON.stringify({
        title
      })
    }), link.isPinned && /*#__PURE__*/external_React_default().createElement("div", {
      className: "icon icon-pin-small"
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: "tile",
      "aria-hidden": true
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: selectedColor ? "icon-wrapper letter-fallback" : "icon-wrapper",
      "data-fallback": letterFallback,
      style: selectedColor ? {
        backgroundColor: selectedColor
      } : {}
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: imageClassName,
      style: imageStyle
    }), showSmallFavicon && /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-icon default-icon",
      "data-fallback": smallFaviconStyle ? "" : letterFallback,
      style: smallFaviconStyle
    }))), /*#__PURE__*/external_React_default().createElement("div", {
      className: `title${link.isPinned ? " has-icon pinned" : ""}${link.type === SPOC_TYPE || link.show_sponsored_label ? " sponsored" : ""}`
    }, /*#__PURE__*/external_React_default().createElement("span", TopSite_extends({
      className: "title-label",
      dir: "auto"
    }, isAddButton && {
      ...addButtonLabell10n
    }), link.searchTopSite && /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-site-icon search-topsite"
    }), title || /*#__PURE__*/external_React_default().createElement("br", null)), /*#__PURE__*/external_React_default().createElement("span", {
      className: "sponsored-label",
      "data-l10n-id": "newtab-topsite-sponsored"
    }))), isAddButton && this.shouldShowOMCHighlight("ShortcutHighlight") && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
      dispatch: this.props.dispatch,
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/external_React_default().createElement(ShortcutFeatureHighlight, {
      dispatch: this.props.dispatch,
      feature: "FEATURE_SHORTCUT_HIGHLIGHT",
      position: "inset-block-end inset-inline-start",
      messageData: this.props.Messages?.messageData
    })), children, impressionStats));
  }
}
TopSiteLink.defaultProps = {
  title: "",
  link: {},
  isDraggable: true
};
class TopSite extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      showContextMenu: false
    };
    this.onLinkClick = this.onLinkClick.bind(this);
    this.onMenuUpdate = this.onMenuUpdate.bind(this);
  }

  /**
   * Report to telemetry additional information about the item.
   */
  _getTelemetryInfo() {
    const value = {
      icon_type: this.props.link.iconType
    };
    // Filter out "not_pinned" type for being the default
    if (this.props.link.isPinned) {
      value.card_type = "pinned";
    }
    if (this.props.link.searchTopSite) {
      // Set the card_type as "search" regardless of its pinning status
      value.card_type = "search";
      value.search_vendor = this.props.link.hostname;
    }
    if (isSponsored(this.props.link)) {
      value.card_type = "spoc";
    }
    return {
      value
    };
  }
  userEvent(event) {
    this.props.dispatch(actionCreators.UserEvent(Object.assign({
      event,
      source: TOP_SITES_SOURCE,
      action_position: this.props.index
    }, this._getTelemetryInfo())));
  }
  onLinkClick(event) {
    this.userEvent("CLICK");

    // Specially handle a top site link click for "typed" frecency bonus as
    // specified as a property on the link.
    event.preventDefault();
    const {
      altKey,
      button,
      ctrlKey,
      metaKey,
      shiftKey
    } = event;
    if (!this.props.link.searchTopSite) {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.OPEN_LINK,
        data: Object.assign(this.props.link, {
          event: {
            altKey,
            button,
            ctrlKey,
            metaKey,
            shiftKey
          },
          is_sponsored: !!this.props.link.sponsored_tile_id
        })
      }));
      if (this.props.link.type === SPOC_TYPE) {
        // Record a Pocket-specific click.
        this.props.dispatch(actionCreators.ImpressionStats({
          source: TOP_SITES_SOURCE,
          click: 0,
          tiles: [{
            id: this.props.link.id,
            pos: this.props.link.pos,
            shim: this.props.link.shim && this.props.link.shim.click
          }]
        }));

        // Record a click for a Pocket sponsored tile.
        // This first event is for the shim property
        // and is used by our ad service provider.
        this.props.dispatch(actionCreators.DiscoveryStreamUserEvent({
          event: "CLICK",
          source: TOP_SITES_SOURCE,
          action_position: this.props.link.pos,
          value: {
            card_type: "spoc",
            tile_id: this.props.link.id,
            shim: this.props.link.shim && this.props.link.shim.click,
            attribution: this.props.link.attribution
          }
        }));

        // A second event is recoded for internal usage.
        const title = this.props.link.label || this.props.link.hostname;
        this.props.dispatch(actionCreators.OnlyToMain({
          type: actionTypes.TOP_SITES_SPONSORED_IMPRESSION_STATS,
          data: {
            type: "click",
            position: this.props.link.pos,
            tile_id: this.props.link.id,
            advertiser: title.toLocaleLowerCase(),
            source: NEWTAB_SOURCE,
            attribution: this.props.link.attribution
          }
        }));
      } else if (isSponsored(this.props.link)) {
        // Record a click for a non-Pocket sponsored tile.
        const title = this.props.link.label || this.props.link.hostname;
        this.props.dispatch(actionCreators.OnlyToMain({
          type: actionTypes.TOP_SITES_SPONSORED_IMPRESSION_STATS,
          data: {
            type: "click",
            position: this.props.index,
            tile_id: this.props.link.sponsored_tile_id || -1,
            reporting_url: this.props.link.sponsored_click_url,
            advertiser: title.toLocaleLowerCase(),
            source: NEWTAB_SOURCE,
            visible_topsites: this.props.visibleTopSites,
            frecency_boosted: this.props.link.type === "frecency-boost",
            attribution: this.props.link.attribution
          }
        }));
      } else {
        // Record a click for an organic tile.
        this.props.dispatch(actionCreators.OnlyToMain({
          type: actionTypes.TOP_SITES_ORGANIC_IMPRESSION_STATS,
          data: {
            type: "click",
            position: this.props.index,
            source: NEWTAB_SOURCE,
            isPinned: this.props.link.isPinned,
            guid: this.props.link.guid,
            visible_topsites: this.props.visibleTopSites,
            smartScores: this.props.link.scores,
            smartWeights: this.props.link.weights
          }
        }));
      }
      if (this.props.link.sendAttributionRequest) {
        this.props.dispatch(actionCreators.OnlyToMain({
          type: actionTypes.PARTNER_LINK_ATTRIBUTION,
          data: {
            targetURL: this.props.link.url,
            source: "newtab"
          }
        }));
      }
    } else {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.FILL_SEARCH_TERM,
        data: {
          label: this.props.link.label
        }
      }));
    }
  }
  onMenuUpdate(isOpen) {
    if (isOpen) {
      this.props.onActivate(this.props.index);
    } else {
      this.props.onActivate();
    }
  }
  render() {
    const {
      props
    } = this;
    const {
      link
    } = props;
    const isContextMenuOpen = props.activeIndex === props.index;
    const title = link.label || link.title || link.hostname;
    let menuOptions;
    if (link.sponsored_position) {
      menuOptions = TOP_SITES_SPONSORED_POSITION_CONTEXT_MENU_OPTIONS;
    } else if (link.searchTopSite) {
      menuOptions = TOP_SITES_SEARCH_SHORTCUTS_CONTEXT_MENU_OPTIONS;
    } else if (link.type === SPOC_TYPE) {
      menuOptions = TOP_SITES_SPOC_CONTEXT_MENU_OPTIONS;
    } else {
      menuOptions = TOP_SITES_CONTEXT_MENU_OPTIONS;
    }
    return /*#__PURE__*/external_React_default().createElement(TopSiteLink, TopSite_extends({}, props, {
      onClick: this.onLinkClick,
      onDragEvent: this.props.onDragEvent,
      className: `${props.className || ""}${isContextMenuOpen ? " active" : ""}`,
      title: title,
      setPref: this.props.setPref,
      tabIndex: this.props.tabIndex,
      onFocus: this.props.onFocus
    }), /*#__PURE__*/external_React_default().createElement("div", null, /*#__PURE__*/external_React_default().createElement(ContextMenuButton, {
      tooltip: "newtab-menu-content-tooltip",
      tooltipArgs: {
        title
      },
      onUpdate: this.onMenuUpdate,
      tabIndex: this.props.tabIndex,
      onFocus: this.props.onFocus
    }, /*#__PURE__*/external_React_default().createElement(LinkMenu, {
      dispatch: props.dispatch,
      index: props.index,
      onUpdate: this.onMenuUpdate,
      options: menuOptions,
      site: link,
      shouldSendImpressionStats: link.type === SPOC_TYPE,
      siteInfo: this._getTelemetryInfo(),
      source: TOP_SITES_SOURCE
    }))));
  }
}
TopSite.defaultProps = {
  link: {},
  onActivate() {}
};
class TopSiteAddButton extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onEditButtonClick = this.onEditButtonClick.bind(this);
  }
  onEditButtonClick() {
    this.props.dispatch({
      type: actionTypes.TOP_SITES_EDIT,
      data: {
        index: this.props.index
      }
    });
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement(TopSiteLink, TopSite_extends({}, this.props, {
      isAddButton: true,
      className: `add-button ${this.props.className || ""}`,
      onClick: this.onEditButtonClick,
      setPref: this.props.setPref,
      isDraggable: false,
      tabIndex: this.props.tabIndex
    }));
  }
}
class TopSitePlaceholder extends (external_React_default()).PureComponent {
  render() {
    return /*#__PURE__*/external_React_default().createElement(TopSiteLink, TopSite_extends({}, this.props, {
      className: `placeholder ${this.props.className || ""}`,
      isDraggable: false
    }));
  }
}
class _TopSiteList extends (external_React_default()).PureComponent {
  static get DEFAULT_STATE() {
    return {
      activeIndex: null,
      draggedIndex: null,
      draggedSite: null,
      draggedTitle: null,
      topSitesPreview: null,
      focusedIndex: 0
    };
  }
  constructor(props) {
    super(props);
    this.state = _TopSiteList.DEFAULT_STATE;
    this.onDragEvent = this.onDragEvent.bind(this);
    this.onActivate = this.onActivate.bind(this);
    this.onWrapperFocus = this.onWrapperFocus.bind(this);
    this.onTopsiteFocus = this.onTopsiteFocus.bind(this);
    this.onWrapperBlur = this.onWrapperBlur.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }
  componentWillReceiveProps(nextProps) {
    if (this.state.draggedSite) {
      const prevTopSites = this.props.TopSites && this.props.TopSites.rows;
      const newTopSites = nextProps.TopSites && nextProps.TopSites.rows;
      if (prevTopSites && prevTopSites[this.state.draggedIndex] && prevTopSites[this.state.draggedIndex].url === this.state.draggedSite.url && (!newTopSites[this.state.draggedIndex] || newTopSites[this.state.draggedIndex].url !== this.state.draggedSite.url)) {
        // We got the new order from the redux store via props. We can clear state now.
        this.setState(_TopSiteList.DEFAULT_STATE);
      }
    }
  }
  userEvent(event, index) {
    this.props.dispatch(actionCreators.UserEvent({
      event,
      source: TOP_SITES_SOURCE,
      action_position: index
    }));
  }
  onDragEvent(event, index, link, title) {
    switch (event.type) {
      case "dragstart":
        this.dropped = false;
        this.setState({
          draggedIndex: index,
          draggedSite: link,
          draggedTitle: title,
          activeIndex: null
        });
        this.userEvent("DRAG", index);
        break;
      case "dragend":
        if (!this.dropped) {
          // If there was no drop event, reset the state to the default.
          this.setState(_TopSiteList.DEFAULT_STATE);
        }
        break;
      case "dragenter":
        if (index === this.state.draggedIndex) {
          this.setState({
            topSitesPreview: null
          });
        } else {
          this.setState({
            topSitesPreview: this._makeTopSitesPreview(index)
          });
        }
        break;
      case "drop":
        if (index !== this.state.draggedIndex) {
          this.dropped = true;
          this.props.dispatch(actionCreators.AlsoToMain({
            type: actionTypes.TOP_SITES_INSERT,
            data: {
              site: {
                url: this.state.draggedSite.url,
                label: this.state.draggedTitle,
                customScreenshotURL: this.state.draggedSite.customScreenshotURL,
                // Only if the search topsites experiment is enabled
                ...(this.state.draggedSite.searchTopSite && {
                  searchTopSite: true
                })
              },
              index,
              draggedFromIndex: this.state.draggedIndex
            }
          }));
          this.userEvent("DROP", index);
        }
        break;
    }
  }
  _getTopSites() {
    // Make a copy of the sites to truncate or extend to desired length
    let topSites = this.props.TopSites.rows.slice();
    topSites.length = this.props.TopSitesRows * TOP_SITES_MAX_SITES_PER_ROW;
    // if topSites do not fill an entire row add 'Add shortcut' button to array of topSites
    // (there should only be one of these)
    const addButtonIndex = topSites.findIndex(site => site?.isAddButton);

    // Find the position right after the last regular shortcut
    let targetPosition = topSites.length - 1;
    for (let i = topSites.length - 1; i >= 0; i--) {
      if (topSites[i] && !topSites[i].isAddButton) {
        targetPosition = i + 1;
        break;
      }
    }
    if (addButtonIndex === -1) {
      // No add button exists yet, insert it at target position if it's within bounds
      if (targetPosition < topSites.length) {
        topSites[targetPosition] = {
          isAddButton: true
        };
      }
    } else if (addButtonIndex !== targetPosition) {
      // Add button exists but not at the end, move it
      const [button] = topSites.splice(addButtonIndex, 1);
      // Adjust target if we removed something before it
      const adjustedTarget = addButtonIndex < targetPosition ? targetPosition - 1 : targetPosition;
      topSites[adjustedTarget] = button;
    }
    return topSites;
  }

  /**
   * Make a preview of the topsites that will be the result of dropping the currently
   * dragged site at the specified index.
   */
  _makeTopSitesPreview(index) {
    const topSites = this._getTopSites();
    topSites[this.state.draggedIndex] = null;
    const preview = topSites.map(site => site && (site.isPinned || isSponsored(site) || site.isAddButton) ? site : null);
    const unpinned = topSites.filter(site => site && !site.isPinned && !isSponsored(site) && !site.isAddButton);
    const siteToInsert = Object.assign({}, this.state.draggedSite, {
      isPinned: true,
      isDragged: true
    });
    if (!preview[index]) {
      preview[index] = siteToInsert;
    } else {
      // Find the hole to shift the pinned site(s) towards. We shift towards the
      // hole left by the site being dragged.
      let holeIndex = index;
      const indexStep = index > this.state.draggedIndex ? -1 : 1;
      while (preview[holeIndex]) {
        holeIndex += indexStep;
      }

      // Shift towards the hole.
      const shiftingStep = index > this.state.draggedIndex ? 1 : -1;
      while (index > this.state.draggedIndex ? holeIndex < index : holeIndex > index) {
        let nextIndex = holeIndex + shiftingStep;
        while (preview[nextIndex] && (isSponsored(preview[nextIndex]) || preview[nextIndex].isAddButton)) {
          nextIndex += shiftingStep;
        }
        preview[holeIndex] = preview[nextIndex];
        holeIndex = nextIndex;
      }
      preview[index] = siteToInsert;
    }

    // Fill in the remaining holes with unpinned sites.
    for (let i = 0; i < preview.length; i++) {
      if (!preview[i]) {
        preview[i] = unpinned.shift() || null;
      }
    }
    return preview;
  }
  onActivate(index) {
    this.setState({
      activeIndex: index
    });
  }
  onKeyDown(e) {
    if (this.state.activeIndex || this.state.activeIndex === 0) {
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      // Arrow direction should match visual navigation direction in RTL
      const isRTL = document.dir === "rtl";
      const navigateToPrevious = isRTL ? e.key === "ArrowRight" : e.key === "ArrowLeft";
      const targetTopSite = navigateToPrevious ? this.focusedRef?.previousSibling : this.focusedRef?.nextSibling;
      const targetAnchor = targetTopSite?.querySelector("a");
      if (targetAnchor) {
        targetAnchor.tabIndex = 0;
        targetAnchor.focus();
      }
    }
  }
  onWrapperFocus() {
    this.focusRef?.addEventListener("keydown", this.onKeyDown);
  }
  onWrapperBlur() {
    this.focusRef?.removeEventListener("keydown", this.onKeyDown);
  }
  onTopsiteFocus(focusIndex) {
    this.setState(() => ({
      focusedIndex: focusIndex
    }));
  }
  render() {
    const {
      props
    } = this;
    const topSites = this.state.topSitesPreview || this._getTopSites();
    const topSitesUI = [];
    const commonProps = {
      onDragEvent: this.onDragEvent,
      dispatch: props.dispatch
    };
    // We assign a key to each placeholder slot. We need it to be independent
    // of the slot index (i below) so that the keys used stay the same during
    // drag and drop reordering and the underlying DOM nodes are reused.
    // This mostly (only?) affects linux so be sure to test on linux before changing.
    let holeIndex = 0;

    // On narrow viewports, we only show 6 sites per row. We'll mark the rest as
    // .hide-for-narrow to hide in CSS via @media query.
    const maxNarrowVisibleIndex = props.TopSitesRows * 6;
    for (let i = 0, l = topSites.length; i < l; i++) {
      const link = topSites[i] && Object.assign({}, topSites[i], {
        iconType: this.props.topSiteIconType(topSites[i])
      });
      const slotProps = {
        key: link ? link.url : holeIndex++,
        index: i
      };
      if (i >= maxNarrowVisibleIndex) {
        slotProps.className = "hide-for-narrow";
      }
      let topSiteLink;
      // Use a placeholder if the link is empty or it's rendering a sponsored
      // tile for the about:home startup cache.
      if (!link || props.App.isForStartupCache.TopSites && isSponsored(link)) {
        if (link) {
          topSiteLink = /*#__PURE__*/external_React_default().createElement(TopSitePlaceholder, TopSite_extends({}, slotProps, commonProps));
        }
      } else if (topSites[i]?.isAddButton) {
        topSiteLink = /*#__PURE__*/external_React_default().createElement(TopSiteAddButton, TopSite_extends({}, slotProps, commonProps, {
          setRef: i === this.state.focusedIndex ? el => {
            this.focusedRef = el;
          } : () => {},
          tabIndex: i === this.state.focusedIndex ? 0 : -1,
          onFocus: () => {
            this.onTopsiteFocus(i);
          },
          Messages: this.props.Messages,
          visibleTopSites: this.props.visibleTopSites
        }));
      } else {
        topSiteLink = /*#__PURE__*/external_React_default().createElement(TopSite, TopSite_extends({
          link: link,
          activeIndex: this.state.activeIndex,
          onActivate: this.onActivate
        }, slotProps, commonProps, {
          colors: props.colors,
          setRef: i === this.state.focusedIndex ? el => {
            this.focusedRef = el;
          } : () => {},
          tabIndex: i === this.state.focusedIndex ? 0 : -1,
          onFocus: () => {
            this.onTopsiteFocus(i);
          },
          visibleTopSites: this.props.visibleTopSites
        }));
      }
      topSitesUI.push(topSiteLink);
    }
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-sites-list-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("ul", {
      role: "group",
      "aria-label": "Shortcuts",
      onFocus: this.onWrapperFocus,
      onBlur: this.onWrapperBlur,
      ref: el => {
        this.focusRef = el;
      },
      className: `top-sites-list${this.state.draggedSite ? " dnd-active" : ""}`
    }, topSitesUI));
  }
}
const TopSiteList = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  App: state.App,
  Messages: state.Messages,
  Prefs: state.Prefs
}))(_TopSiteList);
;// CONCATENATED MODULE: ./content-src/components/TopSites/TopSiteForm.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */







class TopSiteForm extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    const {
      site
    } = props;
    this.state = {
      label: site ? site.label || site.hostname : "",
      url: site ? site.url : "",
      validationError: false,
      customScreenshotUrl: site ? site.customScreenshotURL : "",
      showCustomScreenshotForm: site ? site.customScreenshotURL : false,
      hasURLChanged: false,
      hasTitleChanged: false
    };
    this.onClearScreenshotInput = this.onClearScreenshotInput.bind(this);
    this.onLabelChange = this.onLabelChange.bind(this);
    this.onUrlChange = this.onUrlChange.bind(this);
    this.onCancelButtonClick = this.onCancelButtonClick.bind(this);
    this.onClearUrlClick = this.onClearUrlClick.bind(this);
    this.onDoneButtonClick = this.onDoneButtonClick.bind(this);
    this.onCustomScreenshotUrlChange = this.onCustomScreenshotUrlChange.bind(this);
    this.onPreviewButtonClick = this.onPreviewButtonClick.bind(this);
    this.onEnableScreenshotUrlForm = this.onEnableScreenshotUrlForm.bind(this);
    this.validateUrl = this.validateUrl.bind(this);
  }
  onLabelChange(event) {
    this.setState({
      label: event.target.value,
      hasTitleChanged: true
    });
  }
  onUrlChange(event) {
    this.setState({
      url: event.target.value,
      validationError: false,
      hasURLChanged: true
    });
  }
  onClearUrlClick() {
    this.setState({
      url: "",
      validationError: false
    });
  }
  onEnableScreenshotUrlForm() {
    this.setState({
      showCustomScreenshotForm: true
    });
  }
  _updateCustomScreenshotInput(customScreenshotUrl) {
    this.setState({
      customScreenshotUrl,
      validationError: false
    });
    this.props.dispatch({
      type: actionTypes.PREVIEW_REQUEST_CANCEL
    });
  }
  onCustomScreenshotUrlChange(event) {
    this._updateCustomScreenshotInput(event.target.value);
  }
  onClearScreenshotInput() {
    this._updateCustomScreenshotInput("");
  }
  onCancelButtonClick(ev) {
    ev.preventDefault();
    this.props.onClose();
  }
  onDoneButtonClick(ev) {
    ev.preventDefault();
    if (this.validateForm()) {
      const site = {
        url: this.cleanUrl(this.state.url)
      };
      const {
        index
      } = this.props;
      const isEdit = !!this.props.site;
      if (this.state.label !== "") {
        site.label = this.state.label;
      }
      if (this.state.customScreenshotUrl) {
        site.customScreenshotURL = this.cleanUrl(this.state.customScreenshotUrl);
      } else if (this.props.site && this.props.site.customScreenshotURL) {
        // Used to flag that previously cached screenshot should be removed
        site.customScreenshotURL = null;
      }
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.TOP_SITES_PIN,
        data: {
          site,
          index
        }
      }));
      if (isEdit) {
        this.props.dispatch(actionCreators.UserEvent({
          source: TOP_SITES_SOURCE,
          event: "TOP_SITES_EDIT",
          action_position: index,
          hasTitleChanged: this.state.hasTitleChanged,
          hasURLChanged: this.state.hasURLChanged
        }));
      } else if (!isEdit) {
        this.props.dispatch(actionCreators.UserEvent({
          source: TOP_SITES_SOURCE,
          event: "TOP_SITES_ADD",
          action_position: index
        }));
      }
      this.props.onClose();
    }
  }
  onPreviewButtonClick(event) {
    event.preventDefault();
    if (this.validateForm()) {
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.PREVIEW_REQUEST,
        data: {
          url: this.cleanUrl(this.state.customScreenshotUrl)
        }
      }));
      this.props.dispatch(actionCreators.UserEvent({
        source: TOP_SITES_SOURCE,
        event: "PREVIEW_REQUEST"
      }));
    }
  }
  cleanUrl(url) {
    // If we are missing a protocol, prepend http://
    if (!url.startsWith("http:") && !url.startsWith("https:")) {
      return `http://${url}`;
    }
    return url;
  }
  _tryParseUrl(url) {
    try {
      return new URL(url);
    } catch (e) {
      return null;
    }
  }
  validateUrl(url) {
    const validProtocols = ["http:", "https:"];
    const urlObj = this._tryParseUrl(url) || this._tryParseUrl(this.cleanUrl(url));
    return urlObj && validProtocols.includes(urlObj.protocol);
  }
  validateCustomScreenshotUrl() {
    const {
      customScreenshotUrl
    } = this.state;
    return !customScreenshotUrl || this.validateUrl(customScreenshotUrl);
  }
  validateForm() {
    const validate = this.validateUrl(this.state.url) && this.validateCustomScreenshotUrl();
    if (!validate) {
      this.setState({
        validationError: true
      });
    }
    return validate;
  }
  _renderCustomScreenshotInput() {
    const {
      customScreenshotUrl
    } = this.state;
    const requestFailed = this.props.previewResponse === "";
    const validationError = this.state.validationError && !this.validateCustomScreenshotUrl() || requestFailed;
    // Set focus on error if the url field is valid or when the input is first rendered and is empty
    const shouldFocus = validationError && this.validateUrl(this.state.url) || !customScreenshotUrl;
    const isLoading = this.props.previewResponse === null && customScreenshotUrl && this.props.previewUrl === this.cleanUrl(customScreenshotUrl);
    if (!this.state.showCustomScreenshotForm) {
      return /*#__PURE__*/external_React_default().createElement(A11yLinkButton, {
        onClick: this.onEnableScreenshotUrlForm,
        className: "enable-custom-image-input",
        "data-l10n-id": "newtab-topsites-use-image-link"
      });
    }
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "custom-image-input-container"
    }, /*#__PURE__*/external_React_default().createElement(TopSiteFormInput, {
      errorMessageId: requestFailed ? "newtab-topsites-image-validation" : "newtab-topsites-url-validation",
      loading: isLoading,
      onChange: this.onCustomScreenshotUrlChange,
      onClear: this.onClearScreenshotInput,
      shouldFocus: shouldFocus,
      typeUrl: true,
      value: customScreenshotUrl,
      validationError: validationError,
      titleId: "newtab-topsites-image-url-label",
      placeholderId: "newtab-topsites-url-input"
    }));
  }
  render() {
    const {
      customScreenshotUrl
    } = this.state;
    const requestFailed = this.props.previewResponse === "";
    // For UI purposes, editing without an existing link is "add"
    const showAsAdd = !this.props.site;
    const previous = this.props.site && this.props.site.customScreenshotURL || "";
    const changed = customScreenshotUrl && this.cleanUrl(customScreenshotUrl) !== previous;
    // Preview mode if changes were made to the custom screenshot URL and no preview was received yet
    // or the request failed
    const previewMode = changed && !this.props.previewResponse;
    const previewLink = Object.assign({}, this.props.site);
    if (this.props.previewResponse) {
      previewLink.screenshot = this.props.previewResponse;
      previewLink.customScreenshotURL = this.props.previewUrl;
    }
    // Handles the form submit so an enter press performs the correct action
    const onSubmit = previewMode ? this.onPreviewButtonClick : this.onDoneButtonClick;
    const addTopsitesHeaderL10nId = "newtab-topsites-add-shortcut-header";
    const editTopsitesHeaderL10nId = "newtab-topsites-edit-shortcut-header";
    return /*#__PURE__*/external_React_default().createElement("form", {
      className: "topsite-form",
      onSubmit: onSubmit
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "form-input-container"
    }, /*#__PURE__*/external_React_default().createElement("h3", {
      className: "section-title grey-title",
      "data-l10n-id": showAsAdd ? addTopsitesHeaderL10nId : editTopsitesHeaderL10nId
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: "fields-and-preview"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "form-wrapper"
    }, /*#__PURE__*/external_React_default().createElement(TopSiteFormInput, {
      onChange: this.onLabelChange,
      value: this.state.label,
      titleId: "newtab-topsites-title-label",
      placeholderId: "newtab-topsites-title-input",
      autoFocusOnOpen: true
    }), /*#__PURE__*/external_React_default().createElement(TopSiteFormInput, {
      onChange: this.onUrlChange,
      shouldFocus: this.state.validationError && !this.validateUrl(this.state.url),
      value: this.state.url,
      onClear: this.onClearUrlClick,
      validationError: this.state.validationError && !this.validateUrl(this.state.url),
      titleId: "newtab-topsites-url-label",
      typeUrl: true,
      placeholderId: "newtab-topsites-url-input",
      errorMessageId: "newtab-topsites-url-validation"
    }), this._renderCustomScreenshotInput()), /*#__PURE__*/external_React_default().createElement(TopSiteLink, {
      link: previewLink,
      defaultStyle: requestFailed,
      title: this.state.label
    }))), /*#__PURE__*/external_React_default().createElement("section", {
      className: "actions"
    }, /*#__PURE__*/external_React_default().createElement("moz-button-group", {
      className: "button-group"
    }, /*#__PURE__*/external_React_default().createElement("moz-button", {
      id: "topsites-form-cancel-button",
      type: "default",
      "data-l10n-id": "newtab-topsites-cancel-button",
      onClick: this.onCancelButtonClick
    }), previewMode ? /*#__PURE__*/external_React_default().createElement("moz-button", {
      id: "topsites-form-preview-button",
      type: "primary",
      "data-l10n-id": "newtab-topsites-preview-button",
      onClick: this.onPreviewButtonClick
    }) : /*#__PURE__*/external_React_default().createElement("moz-button", {
      id: "topsites-form-save-button",
      type: "primary",
      "data-l10n-id": showAsAdd ? "newtab-topsites-add-button" : "newtab-topsites-save-button",
      onClick: this.onDoneButtonClick
    }))));
  }
}
TopSiteForm.defaultProps = {
  site: null,
  index: -1
};
;// CONCATENATED MODULE: ./content-src/components/TopSites/TopSites.jsx
function TopSites_extends() { return TopSites_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, TopSites_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */












function topSiteIconType(link) {
  if (link.customScreenshotURL) {
    return "custom_screenshot";
  }
  if (link.tippyTopIcon || link.faviconRef === "tippytop") {
    return "tippytop";
  }
  if (link.faviconSize >= MIN_RICH_FAVICON_SIZE) {
    return "rich_icon";
  }
  if (link.screenshot) {
    return "screenshot";
  }
  return "no_image";
}

/**
 * Iterates through TopSites and counts types of images.
 *
 * @param acc Accumulator for reducer.
 * @param topsite Entry in TopSites.
 */
function countTopSitesIconsTypes(topSites) {
  const countTopSitesTypes = (acc, link) => {
    acc[topSiteIconType(link)]++;
    return acc;
  };
  return topSites.reduce(countTopSitesTypes, {
    custom_screenshot: 0,
    screenshot: 0,
    tippytop: 0,
    rich_icon: 0,
    no_image: 0
  });
}
class _TopSites extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onEditFormClose = this.onEditFormClose.bind(this);
    this.onSearchShortcutsFormClose = this.onSearchShortcutsFormClose.bind(this);
  }

  /**
   * Dispatch session statistics about the quality of TopSites icons and pinned count.
   */
  _dispatchTopSitesStats() {
    const topSites = this._getVisibleTopSites().filter(topSite => topSite !== null && topSite !== undefined);
    const topSitesIconsStats = countTopSitesIconsTypes(topSites);
    const topSitesPinned = topSites.filter(site => !!site.isPinned).length;
    const searchShortcuts = topSites.filter(site => !!site.searchTopSite).length;
    // Dispatch telemetry event with the count of TopSites images types.
    this.props.dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SAVE_SESSION_PERF_DATA,
      data: {
        topsites_icon_stats: topSitesIconsStats,
        topsites_pinned: topSitesPinned,
        topsites_search_shortcuts: searchShortcuts
      }
    }));
  }

  /**
   * Return the TopSites that are visible based on prefs and window width.
   */
  _getVisibleTopSites() {
    // We hide 2 sites per row when not in the wide layout.
    let sitesPerRow = TOP_SITES_MAX_SITES_PER_ROW;
    // $break-point-widest = 1072px (from _variables.scss)
    if (!globalThis.matchMedia(`(min-width: 1072px)`).matches) {
      sitesPerRow -= 2;
    }
    return this.props.TopSites.rows.slice(0, this.props.TopSitesRows * sitesPerRow);
  }
  componentDidUpdate() {
    this._dispatchTopSitesStats();
  }
  componentDidMount() {
    this._dispatchTopSitesStats();
  }
  onEditFormClose() {
    this.props.dispatch(actionCreators.UserEvent({
      source: TOP_SITES_SOURCE,
      event: "TOP_SITES_EDIT_CLOSE"
    }));
    this.props.dispatch({
      type: actionTypes.TOP_SITES_CANCEL_EDIT
    });
  }
  onSearchShortcutsFormClose() {
    this.props.dispatch(actionCreators.UserEvent({
      source: TOP_SITES_SOURCE,
      event: "SEARCH_EDIT_CLOSE"
    }));
    this.props.dispatch({
      type: actionTypes.TOP_SITES_CLOSE_SEARCH_SHORTCUTS_MODAL
    });
  }
  render() {
    const {
      props
    } = this;
    const {
      editForm,
      showSearchShortcutsForm
    } = props.TopSites;
    const extraMenuOptions = ["AddTopSite"];
    let visibleTopSites;
    const colors = props.Prefs.values["newNewtabExperience.colors"];

    // do not run this function when for startup cache
    if (!props.App.isForStartupCache.TopSites) {
      visibleTopSites = this._getVisibleTopSites()?.length;
    }
    if (props.Prefs.values["improvesearch.topSiteSearchShortcuts"]) {
      extraMenuOptions.push("AddSearchShortcut");
    }
    return /*#__PURE__*/external_React_default().createElement(ComponentPerfTimer, {
      id: "topsites",
      initialized: props.TopSites.initialized,
      dispatch: props.dispatch
    }, /*#__PURE__*/external_React_default().createElement(CollapsibleSection, {
      className: "top-sites",
      id: "topsites",
      title: props.title || {
        id: "newtab-section-header-topsites"
      },
      hideTitle: true,
      extraMenuOptions: extraMenuOptions,
      showPrefName: "feeds.topsites",
      eventSource: TOP_SITES_SOURCE,
      collapsed: false,
      isFixed: props.isFixed,
      isFirst: props.isFirst,
      isLast: props.isLast,
      dispatch: props.dispatch
    }, /*#__PURE__*/external_React_default().createElement(TopSiteList, {
      TopSites: props.TopSites,
      TopSitesRows: props.TopSitesRows,
      dispatch: props.dispatch,
      topSiteIconType: topSiteIconType,
      colors: colors,
      visibleTopSites: visibleTopSites
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: "edit-topsites-wrapper"
    }, editForm && /*#__PURE__*/external_React_default().createElement("div", {
      className: "edit-topsites"
    }, /*#__PURE__*/external_React_default().createElement(ModalOverlayWrapper, {
      unstyled: true,
      onClose: this.onEditFormClose,
      innerClassName: "modal"
    }, /*#__PURE__*/external_React_default().createElement(TopSiteForm, TopSites_extends({
      site: props.TopSites.rows[editForm.index],
      onClose: this.onEditFormClose,
      dispatch: this.props.dispatch
    }, editForm)))), showSearchShortcutsForm && /*#__PURE__*/external_React_default().createElement("div", {
      className: "edit-search-shortcuts"
    }, /*#__PURE__*/external_React_default().createElement(ModalOverlayWrapper, {
      unstyled: true,
      onClose: this.onSearchShortcutsFormClose,
      innerClassName: "modal"
    }, /*#__PURE__*/external_React_default().createElement(SearchShortcutsForm, {
      TopSites: props.TopSites,
      onClose: this.onSearchShortcutsFormClose,
      dispatch: this.props.dispatch
    }))))));
  }
}
const TopSites_TopSites = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  App: state.App,
  TopSites: state.TopSites,
  Prefs: state.Prefs,
  TopSitesRows: state.Prefs.values.topSitesRows
}))(_TopSites);
;// CONCATENATED MODULE: ./content-src/components/Sections/Sections.jsx
function Sections_extends() { return Sections_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, Sections_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */










const Sections_VISIBLE = "visible";
const Sections_VISIBILITY_CHANGE_EVENT = "visibilitychange";
const CARDS_PER_ROW_DEFAULT = 3;
const CARDS_PER_ROW_COMPACT_WIDE = 4;
class Section extends (external_React_default()).PureComponent {
  get numRows() {
    const {
      rowsPref,
      maxRows,
      Prefs
    } = this.props;
    return rowsPref ? Prefs.values[rowsPref] : maxRows;
  }
  _dispatchImpressionStats() {
    const {
      props
    } = this;
    let cardsPerRow = CARDS_PER_ROW_DEFAULT;
    if (props.compactCards && globalThis.matchMedia(`(min-width: 1072px)`).matches) {
      // If the section has compact cards and the viewport is wide enough, we show
      // 4 columns instead of 3.
      // $break-point-widest = 1072px (from _variables.scss)
      cardsPerRow = CARDS_PER_ROW_COMPACT_WIDE;
    }
    const maxCards = cardsPerRow * this.numRows;
    const cards = props.rows.slice(0, maxCards);
    if (this.needsImpressionStats(cards)) {
      props.dispatch(actionCreators.ImpressionStats({
        source: props.eventSource,
        tiles: cards.map(link => ({
          id: link.guid
        }))
      }));
      this.impressionCardGuids = cards.map(link => link.guid);
    }
  }

  // This sends an event when a user sees a set of new content. If content
  // changes while the page is hidden (i.e. preloaded or on a hidden tab),
  // only send the event if the page becomes visible again.
  sendImpressionStatsOrAddListener() {
    const {
      props
    } = this;
    if (!props.shouldSendImpressionStats || !props.dispatch) {
      return;
    }
    if (props.document.visibilityState === Sections_VISIBLE) {
      this._dispatchImpressionStats();
    } else {
      // We should only ever send the latest impression stats ping, so remove any
      // older listeners.
      if (this._onVisibilityChange) {
        props.document.removeEventListener(Sections_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
      }

      // When the page becomes visible, send the impression stats ping if the section isn't collapsed.
      this._onVisibilityChange = () => {
        if (props.document.visibilityState === Sections_VISIBLE) {
          if (!this.props.pref.collapsed) {
            this._dispatchImpressionStats();
          }
          props.document.removeEventListener(Sections_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
        }
      };
      props.document.addEventListener(Sections_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
  }
  componentWillMount() {
    this.sendNewTabRehydrated(this.props.initialized);
  }
  componentDidMount() {
    if (this.props.rows.length && !this.props.pref.collapsed) {
      this.sendImpressionStatsOrAddListener();
    }
  }
  componentDidUpdate(prevProps) {
    const {
      props
    } = this;
    const isCollapsed = props.pref.collapsed;
    const wasCollapsed = prevProps.pref.collapsed;
    if (
    // Don't send impression stats for the empty state
    props.rows.length && (
    // We only want to send impression stats if the content of the cards has changed
    // and the section is not collapsed...
    props.rows !== prevProps.rows && !isCollapsed ||
    // or if we are expanding a section that was collapsed.
    wasCollapsed && !isCollapsed)) {
      this.sendImpressionStatsOrAddListener();
    }
  }
  componentWillUpdate(nextProps) {
    this.sendNewTabRehydrated(nextProps.initialized);
  }
  componentWillUnmount() {
    if (this._onVisibilityChange) {
      this.props.document.removeEventListener(Sections_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
  }
  needsImpressionStats(cards) {
    if (!this.impressionCardGuids || this.impressionCardGuids.length !== cards.length) {
      return true;
    }
    for (let i = 0; i < cards.length; i++) {
      if (cards[i].guid !== this.impressionCardGuids[i]) {
        return true;
      }
    }
    return false;
  }

  // The NEW_TAB_REHYDRATED event is used to inform feeds that their
  // data has been consumed e.g. for counting the number of tabs that
  // have rendered that data.
  sendNewTabRehydrated(initialized) {
    if (initialized && !this.renderNotified) {
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.NEW_TAB_REHYDRATED,
        data: {}
      }));
      this.renderNotified = true;
    }
  }
  render() {
    const {
      id,
      eventSource,
      title,
      rows,
      emptyState,
      dispatch,
      compactCards,
      read_more_endpoint,
      contextMenuOptions,
      initialized,
      learnMore,
      pref,
      privacyNoticeURL,
      isFirst,
      isLast
    } = this.props;
    const waitingForSpoc = id === "topstories" && this.props.Pocket.waitingForSpoc;
    const maxCardsPerRow = compactCards ? CARDS_PER_ROW_COMPACT_WIDE : CARDS_PER_ROW_DEFAULT;
    const {
      numRows
    } = this;
    const maxCards = maxCardsPerRow * numRows;
    const maxCardsOnNarrow = CARDS_PER_ROW_DEFAULT * numRows;
    const shouldShowReadMore = read_more_endpoint;
    const realRows = rows.slice(0, maxCards);

    // The empty state should only be shown after we have initialized and there is no content.
    // Otherwise, we should show placeholders.
    const shouldShowEmptyState = initialized && !rows.length;
    const cards = [];
    if (!shouldShowEmptyState) {
      for (let i = 0; i < maxCards; i++) {
        const link = realRows[i];
        // On narrow viewports, we only show 3 cards per row. We'll mark the rest as
        // .hide-for-narrow to hide in CSS via @media query.
        const className = i >= maxCardsOnNarrow ? "hide-for-narrow" : "";
        let usePlaceholder = !link;
        // If we are in the third card and waiting for spoc,
        // use the placeholder.
        if (!usePlaceholder && i === 2 && waitingForSpoc) {
          usePlaceholder = true;
        }
        cards.push(!usePlaceholder ? /*#__PURE__*/external_React_default().createElement(Card, {
          key: i,
          index: i,
          className: className,
          dispatch: dispatch,
          link: link,
          contextMenuOptions: contextMenuOptions,
          eventSource: eventSource,
          shouldSendImpressionStats: this.props.shouldSendImpressionStats,
          isWebExtension: this.props.isWebExtension
        }) : /*#__PURE__*/external_React_default().createElement(PlaceholderCard, {
          key: i,
          className: className
        }));
      }
    }
    const sectionClassName = ["section", compactCards ? "compact-cards" : "normal-cards"].join(" ");

    // <Section> <-- React component
    // <section> <-- HTML5 element
    return /*#__PURE__*/external_React_default().createElement(ComponentPerfTimer, this.props, /*#__PURE__*/external_React_default().createElement(CollapsibleSection, {
      className: sectionClassName,
      title: title,
      id: id,
      eventSource: eventSource,
      collapsed: this.props.pref.collapsed,
      showPrefName: pref && pref.feed || id,
      privacyNoticeURL: privacyNoticeURL,
      Prefs: this.props.Prefs,
      isFixed: this.props.isFixed,
      isFirst: isFirst,
      isLast: isLast,
      learnMore: learnMore,
      dispatch: this.props.dispatch,
      isWebExtension: this.props.isWebExtension
    }, !shouldShowEmptyState && /*#__PURE__*/external_React_default().createElement("ul", {
      className: "section-list",
      style: {
        padding: 0
      }
    }, cards), shouldShowEmptyState && /*#__PURE__*/external_React_default().createElement("div", {
      className: "section-empty-state"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "empty-state"
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: emptyState.message
    }, /*#__PURE__*/external_React_default().createElement("p", {
      className: "empty-state-message"
    })))), id === "topstories" && /*#__PURE__*/external_React_default().createElement("div", {
      className: "top-stories-bottom-container"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "wrapper-more-recommendations"
    }, shouldShowReadMore && /*#__PURE__*/external_React_default().createElement(MoreRecommendations, {
      read_more_endpoint: read_more_endpoint
    })))));
  }
}
Section.defaultProps = {
  document: globalThis.document,
  rows: [],
  emptyState: {},
  pref: {},
  title: ""
};
const SectionIntl = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Prefs: state.Prefs,
  Pocket: state.Pocket
}))(Section);
class _Sections extends (external_React_default()).PureComponent {
  renderSections() {
    const sections = [];
    const enabledSections = this.props.Sections.filter(section => section.enabled);
    const {
      sectionOrder,
      "feeds.topsites": showTopSites
    } = this.props.Prefs.values;
    // Enabled sections doesn't include Top Sites, so we add it if enabled.
    const expectedCount = enabledSections.length + ~~showTopSites;
    for (const sectionId of sectionOrder.split(",")) {
      const commonProps = {
        key: sectionId,
        isFirst: sections.length === 0,
        isLast: sections.length === expectedCount - 1
      };
      if (sectionId === "topsites" && showTopSites) {
        sections.push(/*#__PURE__*/external_React_default().createElement(TopSites_TopSites, commonProps));
      } else {
        const section = enabledSections.find(s => s.id === sectionId);
        if (section) {
          sections.push(/*#__PURE__*/external_React_default().createElement(SectionIntl, Sections_extends({}, section, commonProps)));
        }
      }
    }
    return sections;
  }
  render() {
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "sections-list"
    }, this.renderSections());
  }
}
const Sections_Sections = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Sections: state.Sections,
  Prefs: state.Prefs
}))(_Sections);
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/Highlights/Highlights.jsx
function Highlights_extends() { return Highlights_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, Highlights_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




class _Highlights extends (external_React_default()).PureComponent {
  render() {
    const section = this.props.Sections.find(s => s.id === "highlights");
    if (!section || !section.enabled) {
      return null;
    }
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-highlights sections-list"
    }, /*#__PURE__*/external_React_default().createElement(SectionIntl, Highlights_extends({}, section, {
      isFixed: true
    })));
  }
}
const Highlights = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Sections: state.Sections
}))(_Highlights);
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/HorizontalRule/HorizontalRule.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


class HorizontalRule extends (external_React_default()).PureComponent {
  render() {
    return /*#__PURE__*/external_React_default().createElement("hr", {
      className: "ds-hr"
    });
  }
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/Navigation/Navigation.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





class Topic extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onLinkClick = this.onLinkClick.bind(this);
  }
  onLinkClick(event) {
    if (this.props.dispatch) {
      this.props.dispatch(actionCreators.DiscoveryStreamUserEvent({
        event: "CLICK",
        source: "POPULAR_TOPICS",
        action_position: 0,
        value: {
          topic: event.target.text.toLowerCase().replace(` `, `-`)
        }
      }));
    }
  }
  render() {
    const {
      url,
      name: topicName
    } = this.props;
    return /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
      onLinkClick: this.onLinkClick,
      className: this.props.className,
      url: url
    }, topicName);
  }
}
class Navigation extends (external_React_default()).PureComponent {
  render() {
    let links = this.props.links || [];
    const alignment = this.props.alignment || "centered";
    const header = this.props.header || {};
    const english = this.props.locale.startsWith("en-");
    const privacyNotice = this.props.privacyNoticeURL || {};
    const {
      newFooterSection
    } = this.props;
    const className = `ds-navigation ds-navigation-${alignment} ${newFooterSection ? `ds-navigation-new-topics` : ``}`;
    let {
      title
    } = header;
    if (newFooterSection) {
      title = {
        id: "newtab-pocket-new-topics-title"
      };
      if (this.props.extraLinks) {
        links = [...links.slice(0, links.length - 1), ...this.props.extraLinks, links[links.length - 1]];
      }
    }
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: className
    }, title && english ? /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: title
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "ds-navigation-header"
    })) : null, english ? /*#__PURE__*/external_React_default().createElement("ul", null, links && links.map(t => /*#__PURE__*/external_React_default().createElement("li", {
      key: t.name
    }, /*#__PURE__*/external_React_default().createElement(Topic, {
      url: t.url,
      name: t.name,
      dispatch: this.props.dispatch
    })))) : null, !newFooterSection ? /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
      className: "ds-navigation-privacy",
      url: privacyNotice.url
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: privacyNotice.title
    })) : null, newFooterSection ? /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-navigation-family"
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "icon firefox-logo"
    }), /*#__PURE__*/external_React_default().createElement("span", null, "|"), /*#__PURE__*/external_React_default().createElement("span", {
      className: "icon pocket-logo"
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "ds-navigation-family-message",
      "data-l10n-id": "newtab-pocket-pocket-firefox-family"
    })) : null);
  }
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/PrivacyLink/PrivacyLink.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




class PrivacyLink extends (external_React_default()).PureComponent {
  render() {
    const {
      properties
    } = this.props;
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-privacy-link"
    }, /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
      url: properties.url
    }, /*#__PURE__*/external_React_default().createElement(FluentOrText, {
      message: properties.title
    })));
  }
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/SectionTitle/SectionTitle.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


class SectionTitle extends (external_React_default()).PureComponent {
  render() {
    const {
      header: {
        title,
        subtitle
      }
    } = this.props;
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-section-title"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "title"
    }, title), subtitle ? /*#__PURE__*/external_React_default().createElement("div", {
      className: "subtitle"
    }, subtitle) : null);
  }
}
;// CONCATENATED MODULE: ./content-src/lib/selectLayoutRender.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

const selectLayoutRender = ({ state = {}, prefs = {} }) => {
  const { layout, feeds, spocs } = state;
  let spocIndexPlacementMap = {};

  /* This function fills spoc positions on a per placement basis with available spocs.
   * It does this by looping through each position for a placement and replacing a rec with a spoc.
   * If it runs out of spocs or positions, it stops.
   * If it sees the same placement again, it remembers the previous spoc index, and continues.
   * If it sees a blocked spoc, it skips that position leaving in a regular story.
   */
  function fillSpocPositionsForPlacement(
    data,
    spocsPositions,
    spocsData,
    placementName
  ) {
    if (
      !spocIndexPlacementMap[placementName] &&
      spocIndexPlacementMap[placementName] !== 0
    ) {
      spocIndexPlacementMap[placementName] = 0;
    }
    const results = [...data];
    for (let position of spocsPositions) {
      const spoc = spocsData[spocIndexPlacementMap[placementName]];
      // If there are no spocs left, we can stop filling positions.
      if (!spoc) {
        break;
      }

      // A placement could be used in two sections.
      // In these cases, we want to maintain the index of the previous section.
      // If we didn't do this, it might duplicate spocs.
      spocIndexPlacementMap[placementName]++;

      // A spoc that's blocked is removed from the source for subsequent newtab loads.
      // If we have a spoc in the source that's blocked, it means it was *just* blocked,
      // and in this case, we skip this position, and show a regular spoc instead.
      if (!spocs.blocked.includes(spoc.url)) {
        results.splice(position.index, 0, spoc);
      }
    }

    return results;
  }

  const positions = {};
  const DS_COMPONENTS = [
    "Message",
    "SectionTitle",
    "Navigation",
    "Widgets",
    "CardGrid",
    "HorizontalRule",
    "PrivacyLink",
  ];

  const filterArray = [];

  // Filter sections is Topsites are turned off
  if (!prefs["feeds.topsites"]) {
    filterArray.push("TopSites");
  }

  // Filter sections is Widgets are turned off
  // Note extra logic is required bc this feature can be enabled via Nimbus
  const nimbusWidgetsTrainhopEnabled = prefs.trainhopConfig?.widgets?.enabled;
  const nimbusWidgetsEnabled = prefs.widgetsConfig?.enabled;
  const widgetsEnabled = prefs["widgets.system.enabled"];
  if (
    !nimbusWidgetsTrainhopEnabled &&
    !nimbusWidgetsEnabled &&
    !widgetsEnabled
  ) {
    filterArray.push("Widgets");
  }

  // Filter sections is Recommended Stories are turned off
  const pocketEnabled =
    prefs["feeds.section.topstories"] && prefs["feeds.system.topstories"];
  if (!pocketEnabled) {
    filterArray.push(
      // Bug 1980459 - Do not remove Widgets if DS is disabled
      ...DS_COMPONENTS.filter(component => component !== "Widgets")
    );
  }

  // function to determine amount of tiles shown per section per viewport
  function getMaxTiles(responsiveLayouts) {
    return responsiveLayouts
      .flatMap(responsiveLayout => responsiveLayout)
      .reduce((acc, t) => {
        acc[t.columnCount] = t.tiles.length;

        // Update maxTile if current tile count is greater
        if (!acc.maxTile || t.tiles.length > acc.maxTile) {
          acc.maxTile = t.tiles.length;
        }
        return acc;
      }, {});
  }

  const placeholderComponent = component => {
    if (!component.feed) {
      // TODO we now need a placeholder for topsites.
      return {
        ...component,
        data: {
          spocs: [],
        },
      };
    }
    const data = {
      recommendations: [],
      sections: [
        {
          layout: {
            responsiveLayouts: [],
          },
          data: [],
        },
      ],
    };

    let items = 0;
    if (component.properties && component.properties.items) {
      items = component.properties.items;
    }
    for (let i = 0; i < items; i++) {
      data.recommendations.push({ placeholder: true });
    }

    const sectionsEnabled = prefs["discoverystream.sections.enabled"];
    if (sectionsEnabled) {
      for (let i = 0; i < items; i++) {
        data.sections[0].data.push({ placeholder: true });
      }
    }

    return { ...component, data };
  };

  // TODO update devtools to show placements
  const handleSpocs = (data = [], spocsPositions, spocsPlacement) => {
    let result = [...data];
    // Do we ever expect to possibly have a spoc.
    if (spocsPositions?.length) {
      const placement = spocsPlacement || {};
      const placementName = placement.name || "newtab_spocs";
      const spocsData = spocs.data[placementName];

      // We expect a spoc, spocs are loaded, and the server returned spocs.
      if (spocs.loaded && spocsData?.items?.length) {
        // Since banner-type ads are placed by row and don't use the normal spoc position,
        // dont combine with content
        const excludedSpocs = ["billboard", "leaderboard"];
        const filteredSpocs = spocsData?.items?.filter(
          item => !excludedSpocs.includes(item.format)
        );
        result = fillSpocPositionsForPlacement(
          result,
          spocsPositions,
          filteredSpocs,
          placementName
        );
      }
    }
    return result;
  };

  const handleSections = (sections = [], recommendations = []) => {
    let result = sections.sort((a, b) => a.receivedRank - b.receivedRank);

    const sectionsMap = recommendations.reduce((acc, recommendation) => {
      const { section } = recommendation;
      acc[section] = acc[section] || [];
      acc[section].push(recommendation);
      return acc;
    }, {});

    result.forEach(section => {
      const { sectionKey } = section;
      const sectionRecs = sectionsMap[sectionKey] || [];
      section.data = sectionRecs.filter(rec => !rec.isHeadline);
    });

    return result;
  };

  const handleComponent = component => {
    if (component?.spocs?.positions?.length) {
      const placement = component.placement || {};
      const placementName = placement.name || "newtab_spocs";
      const spocsData = spocs.data[placementName];
      if (spocs.loaded && spocsData?.items?.length) {
        return {
          ...component,
          data: {
            spocs: spocsData.items
              .filter(spoc => spoc && !spocs.blocked.includes(spoc.url))
              .map((spoc, index) => ({
                ...spoc,
                pos: index,
              })),
          },
        };
      }
    }
    return {
      ...component,
      data: {
        spocs: [],
      },
    };
  };

  const handleComponentWithFeed = component => {
    positions[component.type] = positions[component.type] || 0;
    let data = {
      recommendations: [],
      sections: [],
    };

    const feed = feeds.data[component.feed.url];
    if (feed?.data) {
      data = {
        ...feed.data,
        recommendations: [...(feed.data.recommendations || [])],
        sections: [...(feed.data.sections || [])],
      };
    }

    if (component && component.properties && component.properties.offset) {
      data = {
        ...data,
        recommendations: data.recommendations.slice(
          component.properties.offset
        ),
      };
    }
    const spocsPositions = component?.spocs?.positions;
    const spocsPlacement = component?.placement;

    const sectionsEnabled = prefs["discoverystream.sections.enabled"];
    data = {
      ...data,
      ...(sectionsEnabled
        ? {
            sections: handleSections(data.sections, data.recommendations).map(
              section => {
                const sectionsSpocsPositions = [];
                const smallestBreakpointLayout =
                  section.layout.responsiveLayouts
                    // Initial position for spocs is going to be for the smallest breakpoint.
                    // We can then move it from there via breakpoints.
                    .find(item => item.columnCount === 1);

                smallestBreakpointLayout.tiles.forEach(tile => {
                  if (tile.hasAd) {
                    const widgetsBeforeThisPosition =
                      smallestBreakpointLayout.tiles.filter(
                        t => t.allowsWidget && t.position < tile.position
                      ).length;
                    const adjustedPosition =
                      tile.position - widgetsBeforeThisPosition;
                    sectionsSpocsPositions.push({ index: adjustedPosition });
                  }
                });
                return {
                  ...section,
                  data: handleSpocs(
                    section.data,
                    sectionsSpocsPositions,
                    spocsPlacement
                  ),
                };
              }
            ),
            // We don't fill spocs in recs if sections are enabled,
            // because recs are not going to be seen.
            recommendations: data.recommendations,
          }
        : {
            recommendations: handleSpocs(
              data.recommendations,
              spocsPositions,
              spocsPlacement
            ),
          }),
    };

    let items = 0;
    if (component.properties && component.properties.items) {
      items = Math.min(component.properties.items, data.recommendations.length);
    }

    // loop through a component items
    // Store the items position sequentially for multiple components of the same type.
    // Example: A second card grid starts pos offset from the last card grid.
    for (let i = 0; i < items; i++) {
      data.recommendations[i] = {
        ...data.recommendations[i],
        pos: positions[component.type]++,
      };
    }

    // Setup absolute positions for sections layout.
    if (sectionsEnabled) {
      let currentPosition = 0;
      data.sections.forEach(section => {
        // We assume the count for the breakpoint with the most tiles.
        const { maxTile } = getMaxTiles(section?.layout?.responsiveLayouts);
        for (let i = 0; i < maxTile; i++) {
          if (section.data[i]) {
            section.data[i] = {
              ...section.data[i],
              pos: currentPosition++,
            };
          }
        }
      });
    }

    return { ...component, data };
  };

  const renderLayout = () => {
    const renderedLayoutArray = [];
    for (const row of layout.filter(
      r => r.components.filter(c => !filterArray.includes(c.type)).length
    )) {
      let components = [];
      renderedLayoutArray.push({
        ...row,
        components,
      });
      for (const component of row.components.filter(
        c => !filterArray.includes(c.type)
      )) {
        const spocsConfig = component.spocs;
        if (spocsConfig || component.feed) {
          if (
            (component.feed && !feeds.data[component.feed.url]) ||
            (spocsConfig &&
              spocsConfig.positions &&
              spocsConfig.positions.length &&
              !spocs.loaded)
          ) {
            components.push(placeholderComponent(component));
          } else if (component.feed) {
            components.push(handleComponentWithFeed(component));
          } else {
            components.push(handleComponent(component));
          }
        } else {
          components.push(component);
        }
      }
    }
    return renderedLayoutArray;
  };

  const layoutRender = renderLayout();

  return { layoutRender };
};

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/SectionContextMenu/SectionContextMenu.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




/**
 * A context menu for blocking, following and unfollowing sections.
 *
 * @param props
 * @returns {React.FunctionComponent}
 */
function SectionContextMenu({
  type = "DISCOVERY_STREAM",
  title,
  source,
  index,
  dispatch,
  sectionKey,
  following,
  sectionPersonalization,
  sectionPosition
}) {
  // Initial context menu options: block this section only.
  const SECTIONS_CONTEXT_MENU_OPTIONS = ["SectionBlock"];
  const [showContextMenu, setShowContextMenu] = (0,external_React_namespaceObject.useState)(false);
  if (following) {
    SECTIONS_CONTEXT_MENU_OPTIONS.push("SectionUnfollow");
  }
  const onClick = e => {
    e.preventDefault();
    setShowContextMenu(!showContextMenu);
  };
  const onUpdate = () => {
    setShowContextMenu(!showContextMenu);
  };
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-context-menu"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon",
    size: "default",
    iconsrc: "chrome://global/skin/icons/more.svg",
    title: title || source,
    onClick: onClick
  }), showContextMenu && /*#__PURE__*/external_React_default().createElement(LinkMenu, {
    onUpdate: onUpdate,
    dispatch: dispatch,
    index: index,
    source: type.toUpperCase(),
    options: SECTIONS_CONTEXT_MENU_OPTIONS,
    shouldSendImpressionStats: true,
    site: {
      sectionPersonalization,
      sectionKey,
      sectionPosition,
      title
    }
  }));
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/InterestPicker/InterestPicker.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





const PREF_VISIBLE_SECTIONS = "discoverystream.sections.interestPicker.visibleSections";

/**
 * Shows a list of recommended topics with visual indication whether
 * the user follows some of the topics (active, blue, selected topics)
 * or is yet to do so (neutrally-coloured topics with a "plus" button).
 *
 * @returns {React.Element}
 */
function InterestPicker({
  title,
  subtitle,
  interests,
  receivedFeedRank
}) {
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  const focusedRef = (0,external_React_namespaceObject.useRef)(null);
  const focusRef = (0,external_React_namespaceObject.useRef)(null);
  const [focusedIndex, setFocusedIndex] = (0,external_React_namespaceObject.useState)(0);
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const {
    sectionPersonalization
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream);
  const visibleSections = prefs[PREF_VISIBLE_SECTIONS]?.split(",").map(item => item.trim()).filter(item => item);
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.INLINE_SELECTION_IMPRESSION,
      data: {
        section_position: receivedFeedRank
      }
    }));
  }, [dispatch, receivedFeedRank]);
  const ref = useIntersectionObserver(handleIntersection);
  const onKeyDown = (0,external_React_namespaceObject.useCallback)(e => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // prevent the page from scrolling up/down while navigating.
      e.preventDefault();
    }
    if (focusedRef.current?.nextSibling?.querySelector("input") && e.key === "ArrowDown") {
      focusedRef.current.nextSibling.querySelector("input").tabIndex = 0;
      focusedRef.current.nextSibling.querySelector("input").focus();
    }
    if (focusedRef.current?.previousSibling?.querySelector("input") && e.key === "ArrowUp") {
      focusedRef.current.previousSibling.querySelector("input").tabIndex = 0;
      focusedRef.current.previousSibling.querySelector("input").focus();
    }
  }, []);
  function onWrapperFocus() {
    focusRef.current?.addEventListener("keydown", onKeyDown);
  }
  function onWrapperBlur() {
    focusRef.current?.removeEventListener("keydown", onKeyDown);
  }
  function onItemFocus(index) {
    setFocusedIndex(index);
  }

  // Updates user preferences as they follow or unfollow topics
  // by selecting them from the list
  function handleChange(e, index) {
    const {
      name: topic,
      checked
    } = e.target;
    let updatedSections = {
      ...sectionPersonalization
    };
    if (checked) {
      updatedSections[topic] = {
        isFollowed: true,
        isBlocked: false,
        followedAt: new Date().toISOString()
      };
      if (!visibleSections.includes(topic)) {
        // add section to visible sections and place after the inline picker
        // subtract 1 from the rank so that it is normalized with array index
        visibleSections.splice(receivedFeedRank - 1, 0, topic);
        dispatch(actionCreators.SetPref(PREF_VISIBLE_SECTIONS, visibleSections.join(", ")));
      }
    } else {
      delete updatedSections[topic];
    }
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.INLINE_SELECTION_CLICK,
      data: {
        topic,
        is_followed: checked,
        topic_position: index,
        section_position: receivedFeedRank
      }
    }));
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: updatedSections
    }));
  }
  return /*#__PURE__*/external_React_default().createElement("section", {
    className: "inline-selection-wrapper ds-section",
    ref: el => {
      ref.current = [el];
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-title-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("h2", {
    className: "section-title"
  }, title), /*#__PURE__*/external_React_default().createElement("p", {
    className: "section-subtitle"
  }, subtitle))), /*#__PURE__*/external_React_default().createElement("ul", {
    className: "topic-list",
    onFocus: onWrapperFocus,
    onBlur: onWrapperBlur,
    ref: focusRef
  }, interests.map((interest, index) => {
    const checked = sectionPersonalization[interest.sectionId]?.isFollowed;
    return /*#__PURE__*/external_React_default().createElement("li", {
      key: interest.sectionId,
      ref: index === focusedIndex ? focusedRef : null
    }, /*#__PURE__*/external_React_default().createElement("label", null, /*#__PURE__*/external_React_default().createElement("input", {
      type: "checkbox",
      id: interest.sectionId,
      name: interest.sectionId,
      checked: checked,
      "aria-checked": checked,
      onChange: e => handleChange(e, index),
      key: `${interest.sectionId}-${checked}` // Force remount to sync DOM state with React state
      ,
      tabIndex: index === focusedIndex ? 0 : -1,
      onFocus: () => {
        onItemFocus(index);
      }
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "topic-item-label"
    }, interest.title || ""), /*#__PURE__*/external_React_default().createElement("div", {
      className: `topic-item-icon icon ${checked ? "icon-check-filled" : "icon-add-circle-fill"}`
    })));
  })), /*#__PURE__*/external_React_default().createElement("p", {
    className: "learn-more-copy"
  }, /*#__PURE__*/external_React_default().createElement("a", {
    href: prefs["support.url"],
    "data-l10n-id": "newtab-topic-selection-privacy-link"
  })));
}

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/PersonalizedCard/PersonalizedCard.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




const PersonalizedCard = ({
  dispatch,
  handleDismiss,
  handleClick,
  handleBlock,
  messageData
}) => {
  const kitFox = "chrome://newtab/content/data/content/assets/kit.png";
  const onDismiss = (0,external_React_namespaceObject.useCallback)(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);
  const onToggleClick = (0,external_React_namespaceObject.useCallback)(elementId => {
    dispatch({
      type: actionTypes.SHOW_PERSONALIZE
    });
    dispatch(actionCreators.UserEvent({
      event: "SHOW_PERSONALIZE"
    }));
    handleClick(elementId);
  }, [dispatch, handleClick]);
  return /*#__PURE__*/external_React_default().createElement("aside", {
    className: "personalized-card-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "personalized-card-dismiss"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon ghost",
    iconSrc: "chrome://global/skin/icons/close.svg",
    onClick: onDismiss,
    "data-l10n-id": "newtab-card-dismiss-button"
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "personalized-card-inner"
  }, /*#__PURE__*/external_React_default().createElement("img", {
    src: kitFox,
    alt: ""
  }), /*#__PURE__*/external_React_default().createElement("h2", null, messageData.content.cardTitle), /*#__PURE__*/external_React_default().createElement("p", null, messageData.content.cardMessage), /*#__PURE__*/external_React_default().createElement("div", {
    className: "personalized-card-cta-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "primary",
    class: "personalized-card-cta",
    onClick: () => onToggleClick("open-personalization-panel")
  }, messageData.content.ctaText), /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
    className: "personalized-card-link",
    dispatch: dispatch,
    url: messageData.content.linkUrl || "https://support.mozilla.org/",
    onLinkClick: () => {
      handleClick("link-click");
    }
  }, messageData.content.linkText))));
};
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/FeatureHighlight/FollowSectionButtonHighlight.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



function FollowSectionButtonHighlight({
  arrowPosition,
  dispatch,
  feature,
  handleBlock,
  handleDismiss,
  messageData,
  position,
  verticalPosition
}) {
  const onDismiss = (0,external_React_namespaceObject.useCallback)(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `follow-section-button-highlight ${messageData.content?.darkModeDismiss ? "is-inverted-dark-dismiss-button" : ""}`
  }, /*#__PURE__*/external_React_default().createElement(FeatureHighlight, {
    position: position,
    arrowPosition: arrowPosition,
    verticalPosition: verticalPosition,
    feature: feature,
    dispatch: dispatch,
    message: /*#__PURE__*/external_React_default().createElement("div", {
      className: "follow-section-button-highlight-content"
    }, /*#__PURE__*/external_React_default().createElement("picture", {
      className: "follow-section-button-highlight-image"
    }, /*#__PURE__*/external_React_default().createElement("source", {
      srcSet: messageData.content?.darkModeImageURL || "chrome://newtab/content/data/content/assets/highlights/omc-newtab-follow.svg",
      media: "(prefers-color-scheme: dark)"
    }), /*#__PURE__*/external_React_default().createElement("source", {
      srcSet: messageData.content?.imageURL || "chrome://newtab/content/data/content/assets/highlights/omc-newtab-follow.svg",
      media: "(prefers-color-scheme: light)"
    }), /*#__PURE__*/external_React_default().createElement("img", {
      width: "320",
      height: "195",
      alt: ""
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "follow-section-button-highlight-copy"
    }, messageData.content?.cardTitle ? /*#__PURE__*/external_React_default().createElement("p", {
      className: "title"
    }, messageData.content.cardTitle) : /*#__PURE__*/external_React_default().createElement("p", {
      className: "title",
      "data-l10n-id": "newtab-section-follow-highlight-title"
    }), messageData.content?.cardMessage ? /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle"
    }, messageData.content.cardMessage) : /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle",
      "data-l10n-id": "newtab-section-follow-highlight-subtitle"
    }))),
    openedOverride: true,
    showButtonIcon: false,
    dismissCallback: onDismiss,
    outsideClickCallback: handleDismiss
  }));
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/BriefingCard/BriefingCard.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */







const TIMESTAMP_DISPLAY_DURATION = 15 * 60 * 1000;

/**
 * The BriefingCard component displays "In The Know" headlines.
 * It is the first card in the "Your Briefing" section.
 */
const BriefingCard = ({
  sectionClassNames = "",
  headlines = [],
  lastUpdated,
  selectedTopics,
  isFollowed,
  firstVisibleTimestamp
}) => {
  const [showTimestamp, setShowTimestamp] = (0,external_React_namespaceObject.useState)(false);
  const [timeAgo, setTimeAgo] = (0,external_React_namespaceObject.useState)("");
  const [isDismissed, setIsDismissed] = (0,external_React_namespaceObject.useState)(false);
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  const handleDismiss = () => {
    setIsDismissed(true);
    const tilesWithFormat = headlines.map(headline => ({
      ...headline,
      format: "daily-briefing",
      guid: headline.id,
      tile_id: headline.id,
      ...(headline.section ? {
        section: headline.section,
        section_position: 0,
        is_section_followed: isFollowed
      } : {})
    }));
    const menuOption = LinkMenuOptions.BlockUrls(tilesWithFormat, 0, "DAILY_BRIEFING");
    dispatch(menuOption.action);
    if (menuOption.impression) {
      dispatch(menuOption.impression);
    }
  };
  (0,external_React_namespaceObject.useEffect)(() => {
    if (!lastUpdated) {
      setShowTimestamp(false);
      return undefined;
    }
    const updateTimestamp = () => {
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdated;

      // Only show a timestamp for the first 15 minutes after feed refresh.
      // This avoids showing an outdated timestamp for a cached version of the feed.
      if (now - lastUpdated < TIMESTAMP_DISPLAY_DURATION) {
        setShowTimestamp(true);
        const minutes = Math.ceil(timeSinceUpdate / 60000);
        setTimeAgo(minutes);
      } else {
        setShowTimestamp(false);
      }
    };
    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);
  if (isDismissed || headlines.length === 0) {
    return null;
  }
  const onLinkClick = headline => {
    const userEvent = {
      event: "CLICK",
      source: "DAILY_BRIEFING",
      action_position: headline.pos,
      value: {
        event_source: "CARD_GRID",
        card_type: "organic",
        recommendation_id: headline.recommendation_id,
        tile_id: headline.id,
        fetchTimestamp: headline.fetchTimestamp,
        firstVisibleTimestamp,
        corpus_item_id: headline.corpus_item_id,
        scheduled_corpus_item_id: headline.scheduled_corpus_item_id,
        recommended_at: headline.recommended_at,
        received_rank: headline.received_rank,
        features: headline.features,
        selected_topics: selectedTopics,
        format: "daily-briefing",
        ...(headline.section ? {
          section: headline.section,
          section_position: 0,
          is_section_followed: isFollowed,
          layout_name: "daily-briefing"
        } : {})
      }
    };
    dispatch(actionCreators.DiscoveryStreamUserEvent(userEvent));
  };
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `briefing-card ${sectionClassNames}`
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    className: "briefing-card-context-menu-button",
    iconSrc: "chrome://global/skin/icons/more.svg",
    menuId: "briefing-card-menu",
    type: "ghost"
  }), /*#__PURE__*/external_React_default().createElement("panel-list", {
    id: "briefing-card-menu"
  }, /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-daily-briefing-card-menu-dismiss",
    onClick: handleDismiss
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "briefing-card-header"
  }, /*#__PURE__*/external_React_default().createElement("h3", {
    className: "briefing-card-title",
    "data-l10n-id": "newtab-daily-briefing-card-title"
  }), showTimestamp && /*#__PURE__*/external_React_default().createElement("span", {
    className: "briefing-card-timestamp",
    "data-l10n-id": "newtab-daily-briefing-card-timestamp",
    "data-l10n-args": JSON.stringify({
      minutes: timeAgo
    })
  })), /*#__PURE__*/external_React_default().createElement("hr", null), /*#__PURE__*/external_React_default().createElement("ol", {
    className: "briefing-card-headlines"
  }, headlines.map(headline => /*#__PURE__*/external_React_default().createElement("li", {
    key: headline.id,
    className: "briefing-card-headline"
  }, /*#__PURE__*/external_React_default().createElement(SafeAnchor, {
    url: headline.url,
    dispatch: dispatch,
    onLinkClick: () => onLinkClick(headline),
    className: "briefing-card-headline-link",
    title: headline.title
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "briefing-card-headline-title"
  }, headline.title), /*#__PURE__*/external_React_default().createElement("div", {
    className: "briefing-card-headline-footer"
  }, headline.icon_src && /*#__PURE__*/external_React_default().createElement("img", {
    src: headline.icon_src,
    alt: "",
    className: "briefing-card-headline-icon"
  }), /*#__PURE__*/external_React_default().createElement("span", {
    className: "briefing-card-headline-source"
  }, headline.publisher)))))), /*#__PURE__*/external_React_default().createElement(ImpressionStats_ImpressionStats, {
    rows: headlines.map(headline => ({
      id: headline.id,
      pos: headline.pos,
      recommendation_id: headline.recommendation_id,
      fetchTimestamp: headline.fetchTimestamp,
      corpus_item_id: headline.corpus_item_id,
      scheduled_corpus_item_id: headline.scheduled_corpus_item_id,
      recommended_at: headline.recommended_at,
      received_rank: headline.received_rank,
      features: headline.features,
      format: "daily-briefing",
      ...(headline.section ? {
        section: headline.section,
        // Daily Briefing is a single section, section_position is always 0.
        section_position: 0,
        is_section_followed: isFollowed,
        sectionLayoutName: "daily-briefing"
      } : {})
    })),
    dispatch: dispatch,
    source: "DAILY_BRIEFING",
    firstVisibleTimestamp: firstVisibleTimestamp
  }));
};

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/CardSections/CardSections.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */















// Prefs
const CardSections_PREF_SECTIONS_CARDS_ENABLED = "discoverystream.sections.cards.enabled";
const PREF_SECTIONS_PERSONALIZATION_ENABLED = "discoverystream.sections.personalization.enabled";
const CardSections_PREF_TOPICS_ENABLED = "discoverystream.topicLabels.enabled";
const CardSections_PREF_TOPICS_SELECTED = "discoverystream.topicSelection.selectedTopics";
const CardSections_PREF_TOPICS_AVAILABLE = "discoverystream.topicSelection.topics";
const PREF_INTEREST_PICKER_ENABLED = "discoverystream.sections.interestPicker.enabled";
const CardSections_PREF_VISIBLE_SECTIONS = "discoverystream.sections.interestPicker.visibleSections";
const CardSections_PREF_BILLBOARD_ENABLED = "newtabAdSize.billboard";
const CardSections_PREF_BILLBOARD_POSITION = "newtabAdSize.billboard.position";
const CardSections_PREF_LEADERBOARD_ENABLED = "newtabAdSize.leaderboard";
const CardSections_PREF_LEADERBOARD_POSITION = "newtabAdSize.leaderboard.position";
const PREF_INFERRED_PERSONALIZATION_USER = "discoverystream.sections.personalization.inferred.user.enabled";
const PREF_DAILY_BRIEF_SECTIONID = "discoverystream.dailyBrief.sectionId";
const PREF_DAILY_BRIEF_ENABLED = "discoverystream.dailyBrief.enabled";
const CardSections_PREF_SPOCS_STARTUPCACHE_ENABLED = "discoverystream.spocs.startupCache.enabled";

// Feed URL
const CURATED_RECOMMENDATIONS_FEED_URL = "https://merino.services.mozilla.com/api/v1/curated-recommendations";
function getLayoutData(responsiveLayouts, index) {
  let layoutData = {
    classNames: [],
    imageSizes: {},
    allowsWidget: false
  };
  responsiveLayouts.forEach(layout => {
    layout.tiles.forEach((tile, tileIndex) => {
      if (tile.position === index) {
        layoutData.classNames.push(`col-${layout.columnCount}-${tile.size}`);
        layoutData.classNames.push(`col-${layout.columnCount}-position-${tileIndex}`);
        layoutData.imageSizes[layout.columnCount] = tile.size;
        if (tile.allowsWidget) {
          layoutData.allowsWidget = true;
        }

        // The API tells us whether the tile should show the excerpt or not.
        // Apply extra styles accordingly.
        if (tile.hasExcerpt) {
          if (tile.size === "medium") {
            layoutData.classNames.push(`col-${layout.columnCount}-hide-excerpt`);
          } else {
            layoutData.classNames.push(`col-${layout.columnCount}-show-excerpt`);
          }
        } else {
          layoutData.classNames.push(`col-${layout.columnCount}-hide-excerpt`);
        }
      }
    });
  });
  return layoutData;
}

// function to determine amount of tiles shown per section per viewport
function getMaxTiles(responsiveLayouts) {
  return responsiveLayouts.flatMap(responsiveLayout => responsiveLayout).reduce((acc, t) => {
    acc[t.columnCount] = t.tiles.length;

    // Update maxTile if current tile count is greater
    if (!acc.maxTile || t.tiles.length > acc.maxTile) {
      acc.maxTile = t.tiles.length;
    }
    return acc;
  }, {});
}

/**
 * Transforms a comma-separated string in user preferences
 * into a cleaned-up array.
 *
 * @param {string} pref - The comma-separated pref to be converted.
 * @returns {string[]} An array of trimmed strings, excluding empty values.
 */

const prefToArray = (pref = "") => {
  return pref.split(",").map(item => item.trim()).filter(item => item);
};
function shouldShowOMCHighlight(messageData, componentId) {
  if (!messageData || Object.keys(messageData).length === 0) {
    return false;
  }
  return messageData?.content?.messageType === componentId;
}
function CardSection({
  sectionPosition,
  section,
  dispatch,
  type,
  firstVisibleTimestamp,
  ctaButtonVariant,
  ctaButtonSponsors,
  anySectionsFollowed,
  placeholder
}) {
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const {
    messageData
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Messages);
  const {
    sectionPersonalization,
    feeds
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream);
  const {
    isForStartupCache
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.App);
  const [focusedIndex, setFocusedIndex] = (0,external_React_namespaceObject.useState)(0);
  const onCardFocus = index => {
    setFocusedIndex(index);
  };
  const handleCardKeyDown = e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const currentCardEl = e.target.closest("article.ds-card");
      if (!currentCardEl) {
        return;
      }
      const activeColumn = getActiveColumnLayout(window.innerWidth);

      // Arrow direction should match visual navigation direction in RTL
      const isRTL = document.dir === "rtl";
      const navigateToPrevious = isRTL ? e.key === "ArrowRight" : e.key === "ArrowLeft";

      // Extract current position from classList
      let currentPosition = null;
      const positionPrefix = `${activeColumn}-position-`;
      for (let className of currentCardEl.classList) {
        if (className.startsWith(positionPrefix)) {
          currentPosition = parseInt(className.substring(positionPrefix.length), 10);
          break;
        }
      }
      if (currentPosition === null) {
        return;
      }
      const targetPosition = navigateToPrevious ? currentPosition - 1 : currentPosition + 1;

      // Find card with target position
      const parentEl = currentCardEl.parentElement;
      if (parentEl) {
        const targetSelector = `article.ds-card.${activeColumn}-position-${targetPosition}`;
        const targetCardEl = parentEl.querySelector(targetSelector);
        if (targetCardEl) {
          const link = targetCardEl.querySelector("a.ds-card-link");
          if (link) {
            link.focus();
          }
        }
      }
    }
  };
  const showTopics = prefs[CardSections_PREF_TOPICS_ENABLED];
  const mayHaveSectionsCards = prefs[CardSections_PREF_SECTIONS_CARDS_ENABLED];
  const selectedTopics = prefs[CardSections_PREF_TOPICS_SELECTED];
  const availableTopics = prefs[CardSections_PREF_TOPICS_AVAILABLE];
  const spocsStartupCacheEnabled = prefs[CardSections_PREF_SPOCS_STARTUPCACHE_ENABLED];
  const dailyBriefEnabled = prefs.trainhopConfig?.dailyBriefing?.enabled || prefs[PREF_DAILY_BRIEF_ENABLED];
  const dailyBriefSectionId = prefs.trainhopConfig?.dailyBriefing?.sectionId || prefs[PREF_DAILY_BRIEF_SECTIONID];
  const mayHaveSectionsPersonalization = prefs[PREF_SECTIONS_PERSONALIZATION_ENABLED];
  const {
    sectionKey,
    title,
    subtitle
  } = section;
  const {
    responsiveLayouts,
    name: layoutName
  } = section.layout;
  const following = sectionPersonalization[sectionKey]?.isFollowed;
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.CARD_SECTION_IMPRESSION,
      data: {
        section: sectionKey,
        section_position: sectionPosition,
        is_section_followed: following,
        layout_name: layoutName
      }
    }));
  }, [dispatch, sectionKey, sectionPosition, following, layoutName]);

  // Ref to hold the section element
  const sectionRefs = useIntersectionObserver(handleIntersection);
  const onFollowClick = (0,external_React_namespaceObject.useCallback)(() => {
    const updatedSectionData = {
      ...sectionPersonalization,
      [sectionKey]: {
        isFollowed: true,
        isBlocked: false,
        followedAt: new Date().toISOString()
      }
    };
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: updatedSectionData
    }));
    // Telemetry Event Dispatch
    dispatch(actionCreators.OnlyToMain({
      type: "FOLLOW_SECTION",
      data: {
        section: sectionKey,
        section_position: sectionPosition,
        event_source: "MOZ_BUTTON"
      }
    }));
  }, [dispatch, sectionPersonalization, sectionKey, sectionPosition]);
  const onUnfollowClick = (0,external_React_namespaceObject.useCallback)(() => {
    const updatedSectionData = {
      ...sectionPersonalization
    };
    delete updatedSectionData[sectionKey];
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: updatedSectionData
    }));

    // Telemetry Event Dispatch
    dispatch(actionCreators.OnlyToMain({
      type: "UNFOLLOW_SECTION",
      data: {
        section: sectionKey,
        section_position: sectionPosition,
        event_source: "MOZ_BUTTON"
      }
    }));
  }, [dispatch, sectionPersonalization, sectionKey, sectionPosition]);
  let {
    maxTile
  } = getMaxTiles(responsiveLayouts);
  if (placeholder) {
    // We need a number that divides evenly by 2, 3, and 4.
    // So it can be displayed without orphans in grids with 2, 3, and 4 columns.
    maxTile = 12;
  }
  const shouldShowBriefingCard = sectionKey === dailyBriefSectionId && dailyBriefEnabled;
  const getBriefingData = () => {
    const EMPTY_BRIEFING = {
      headlines: [],
      lastUpdated: null
    };
    if (!shouldShowBriefingCard) {
      return EMPTY_BRIEFING;
    }
    const sections = feeds?.data[CURATED_RECOMMENDATIONS_FEED_URL];
    if (!sections) {
      return EMPTY_BRIEFING;
    }
    const headlines = sections.data.recommendations.filter(rec => rec.section === dailyBriefSectionId && rec.isHeadline);
    return {
      headlines,
      lastUpdated: sections.lastUpdated
    };
  };
  const {
    headlines: briefingHeadlines,
    lastUpdated: briefingLastUpdated
  } = getBriefingData();
  const hasBriefingHeadlines = briefingHeadlines.length === 3;
  const displaySections = section.data.slice(0, maxTile);
  const isSectionEmpty = !displaySections?.length;
  const shouldShowLabels = sectionKey === dailyBriefSectionId && showTopics;
  if (isSectionEmpty) {
    return null;
  }
  function buildCards() {
    const cards = [];
    let dataIndex = 0;
    for (let position = 0; position < maxTile; position++) {
      const layoutData = getLayoutData(responsiveLayouts, position);
      const {
        classNames,
        imageSizes
      } = layoutData;
      const shouldRenderWidget = shouldShowBriefingCard && layoutData.allowsWidget && hasBriefingHeadlines;
      if (shouldRenderWidget) {
        cards.push(/*#__PURE__*/external_React_default().createElement(BriefingCard, {
          key: "briefing-card",
          sectionClassNames: classNames.join(" "),
          headlines: briefingHeadlines,
          lastUpdated: briefingLastUpdated,
          selectedTopics: selectedTopics,
          isFollowed: following,
          firstVisibleTimestamp: firstVisibleTimestamp
        }));
        continue;
      }
      if (dataIndex >= displaySections.length) {
        break;
      }
      const rec = displaySections[dataIndex];
      const currentIndex = dataIndex;

      // Render a placeholder card when:
      // 1. No recommendation is available.
      // 2. The item is flagged as a placeholder.
      // 3. Spocs are loading for with spocs startup cache disabled.
      const isPlaceholder = !rec || rec.placeholder || placeholder || rec.flight_id && !spocsStartupCacheEnabled && isForStartupCache.DiscoveryStream;
      if (isPlaceholder) {
        cards.push(/*#__PURE__*/external_React_default().createElement(PlaceholderDSCard, {
          key: `dscard-${currentIndex}`
        }));
      } else {
        cards.push(/*#__PURE__*/external_React_default().createElement(DSCard, {
          key: `dscard-${rec.id}`,
          pos: rec.pos,
          flightId: rec.flight_id,
          image_src: rec.image_src,
          raw_image_src: rec.raw_image_src,
          icon_src: rec.icon_src,
          word_count: rec.word_count,
          time_to_read: rec.time_to_read,
          title: rec.title,
          topic: rec.topic,
          features: rec.features,
          excerpt: rec.excerpt,
          url: rec.url,
          id: rec.id,
          shim: rec.shim,
          fetchTimestamp: rec.fetchTimestamp,
          type: type,
          context: rec.context,
          sponsor: rec.sponsor,
          sponsored_by_override: rec.sponsored_by_override,
          dispatch: dispatch,
          source: rec.domain,
          publisher: rec.publisher,
          pocket_id: rec.pocket_id,
          context_type: rec.context_type,
          bookmarkGuid: rec.bookmarkGuid,
          recommendation_id: rec.recommendation_id,
          firstVisibleTimestamp: firstVisibleTimestamp,
          corpus_item_id: rec.corpus_item_id,
          scheduled_corpus_item_id: rec.scheduled_corpus_item_id,
          recommended_at: rec.recommended_at,
          received_rank: rec.received_rank,
          format: rec.format,
          alt_text: rec.alt_text,
          mayHaveSectionsCards: mayHaveSectionsCards,
          showTopics: shouldShowLabels,
          selectedTopics: selectedTopics,
          availableTopics: availableTopics,
          ctaButtonSponsors: ctaButtonSponsors,
          ctaButtonVariant: ctaButtonVariant,
          sectionsClassNames: classNames.join(" "),
          sectionsCardImageSizes: imageSizes,
          section: sectionKey,
          sectionPosition: sectionPosition,
          sectionFollowed: following,
          sectionLayoutName: layoutName,
          isTimeSensitive: rec.isTimeSensitive,
          tabIndex: currentIndex === focusedIndex ? 0 : -1,
          onFocus: () => onCardFocus(currentIndex),
          attribution: rec.attribution,
          isDailyBrief: shouldShowBriefingCard
        }));
      }
      dataIndex++;
    }
    return cards;
  }
  const cards = buildCards();
  const sectionContextWrapper = /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-context-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: following ? "section-follow following" : "section-follow"
  }, !anySectionsFollowed && sectionPosition === 0 && shouldShowOMCHighlight(messageData, "FollowSectionButtonHighlight") && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
    dispatch: dispatch
  }, /*#__PURE__*/external_React_default().createElement(FollowSectionButtonHighlight, {
    verticalPosition: "inset-block-center",
    position: "arrow-inline-start",
    dispatch: dispatch,
    feature: "FEATURE_FOLLOW_SECTION_BUTTON",
    messageData: messageData
  })), !anySectionsFollowed && sectionPosition === 0 && shouldShowOMCHighlight(messageData, "FollowSectionButtonAltHighlight") && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
    dispatch: dispatch
  }, /*#__PURE__*/external_React_default().createElement(FollowSectionButtonHighlight, {
    verticalPosition: "inset-block-center",
    position: "arrow-inline-start",
    dispatch: dispatch,
    feature: "FEATURE_ALT_FOLLOW_SECTION_BUTTON"
  })), /*#__PURE__*/external_React_default().createElement("moz-button", {
    onClick: following ? onUnfollowClick : onFollowClick,
    type: "default",
    index: sectionPosition,
    section: sectionKey
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "section-button-follow-text",
    "data-l10n-id": "newtab-section-follow-button"
  }), /*#__PURE__*/external_React_default().createElement("span", {
    className: "section-button-following-text",
    "data-l10n-id": "newtab-section-following-button"
  }), /*#__PURE__*/external_React_default().createElement("span", {
    className: "section-button-unfollow-text",
    "data-l10n-id": "newtab-section-unfollow-button"
  }))), /*#__PURE__*/external_React_default().createElement(SectionContextMenu, {
    dispatch: dispatch,
    index: sectionPosition,
    following: following,
    sectionPersonalization: sectionPersonalization,
    sectionKey: sectionKey,
    title: title,
    type: type,
    sectionPosition: sectionPosition
  }));
  return /*#__PURE__*/external_React_default().createElement("section", {
    className: "ds-section",
    ref: el => {
      sectionRefs.current[0] = el;
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-heading"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "section-title-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("h2", {
    className: "section-title"
  }, title), subtitle && /*#__PURE__*/external_React_default().createElement("p", {
    className: "section-subtitle"
  }, subtitle)), mayHaveSectionsPersonalization ? sectionContextWrapper : null), /*#__PURE__*/external_React_default().createElement("div", {
    className: `ds-section-grid ds-card-grid`,
    onKeyDown: handleCardKeyDown
  }, cards));
}
function CardSections({
  data,
  feed,
  dispatch,
  type,
  firstVisibleTimestamp,
  ctaButtonVariant,
  ctaButtonSponsors,
  placeholder
}) {
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const {
    spocs,
    sectionPersonalization
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream);
  const {
    messageData
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Messages);
  const personalizationEnabled = prefs[PREF_SECTIONS_PERSONALIZATION_ENABLED];
  const interestPickerEnabled = prefs[PREF_INTEREST_PICKER_ENABLED];

  // Handle a render before feed has been fetched by displaying nothing
  if (!data) {
    return null;
  }
  const visibleSections = prefToArray(prefs[CardSections_PREF_VISIBLE_SECTIONS]);
  const {
    interestPicker
  } = data;

  // Used to determine if we should show FollowSectionButtonHighlight
  const anySectionsFollowed = sectionPersonalization && Object.values(sectionPersonalization).some(section => section?.isFollowed);
  let sectionsData = data.sections;
  if (placeholder) {
    // To clean up the placeholder state for sections if the whole section is loading still.
    sectionsData = [{
      ...sectionsData[0],
      title: "",
      subtitle: ""
    }, {
      ...sectionsData[1],
      title: "",
      subtitle: ""
    }];
  }
  let filteredSections = sectionsData.filter(section => !sectionPersonalization[section.sectionKey]?.isBlocked);
  if (interestPickerEnabled && visibleSections.length) {
    filteredSections = visibleSections.reduce((acc, visibleSection) => {
      const found = filteredSections.find(({
        sectionKey
      }) => sectionKey === visibleSection);
      if (found) {
        acc.push(found);
      }
      return acc;
    }, []);
  }
  let sectionsToRender = filteredSections.map((section, sectionPosition) => /*#__PURE__*/external_React_default().createElement(CardSection, {
    key: `section-${section.sectionKey}`,
    sectionPosition: sectionPosition,
    section: section,
    dispatch: dispatch,
    type: type,
    firstVisibleTimestamp: firstVisibleTimestamp,
    ctaButtonVariant: ctaButtonVariant,
    ctaButtonSponsors: ctaButtonSponsors,
    anySectionsFollowed: anySectionsFollowed,
    placeholder: placeholder
  }));

  // Add a billboard/leaderboard IAB ad to the sectionsToRender array (if enabled/possible).
  const billboardEnabled = prefs[CardSections_PREF_BILLBOARD_ENABLED];
  const leaderboardEnabled = prefs[CardSections_PREF_LEADERBOARD_ENABLED];
  if ((billboardEnabled || leaderboardEnabled) && spocs?.data?.newtab_spocs?.items) {
    const spocToRender = spocs.data.newtab_spocs.items.find(({
      format
    }) => format === "leaderboard" && leaderboardEnabled) || spocs.data.newtab_spocs.items.find(({
      format
    }) => format === "billboard" && billboardEnabled);
    if (spocToRender && !spocs.blocked.includes(spocToRender.url)) {
      const row = spocToRender.format === "leaderboard" ? prefs[CardSections_PREF_LEADERBOARD_POSITION] : prefs[CardSections_PREF_BILLBOARD_POSITION];
      sectionsToRender.splice(
      // Math.min is used here to ensure the given row stays within the bounds of the sectionsToRender array.
      Math.min(sectionsToRender.length - 1, row), 0, /*#__PURE__*/external_React_default().createElement(AdBanner, {
        spoc: spocToRender,
        key: `dscard-${spocToRender.id}`,
        dispatch: dispatch,
        type: type,
        firstVisibleTimestamp: firstVisibleTimestamp,
        row: row,
        prefs: prefs
      }));
    }
  }

  // Add the interest picker to the sectionsToRender array (if enabled/possible).
  if (interestPickerEnabled && personalizationEnabled && interestPicker?.sections) {
    const index = interestPicker.receivedFeedRank - 1;
    sectionsToRender.splice(
    // Math.min is used here to ensure the given row stays within the bounds of the sectionsToRender array.
    Math.min(sectionsToRender.length - 1, index), 0, /*#__PURE__*/external_React_default().createElement(InterestPicker, {
      title: interestPicker.title,
      subtitle: interestPicker.subtitle,
      interests: interestPicker.sections || [],
      receivedFeedRank: interestPicker.receivedFeedRank
    }));
  }
  function displayP13nCard() {
    if (messageData && Object.keys(messageData).length >= 1) {
      if (shouldShowOMCHighlight(messageData, "PersonalizedCard") && prefs[PREF_INFERRED_PERSONALIZATION_USER]) {
        const row = messageData.content.position;
        sectionsToRender.splice(row, 0, /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
          dispatch: dispatch,
          onDismiss: () => {}
        }, /*#__PURE__*/external_React_default().createElement(PersonalizedCard, {
          position: row,
          dispatch: dispatch,
          messageData: messageData
        })));
      }
    }
  }
  displayP13nCard();
  const isEmpty = sectionsToRender.length === 0;
  return isEmpty ? /*#__PURE__*/external_React_default().createElement("div", {
    className: "ds-card-grid empty"
  }, /*#__PURE__*/external_React_default().createElement(DSEmptyState, {
    status: data.status,
    dispatch: dispatch,
    feed: feed
  })) : /*#__PURE__*/external_React_default().createElement("div", {
    className: "ds-section-wrapper"
  }, sectionsToRender);
}

;// CONCATENATED MODULE: ./content-src/components/Widgets/Lists/Lists.jsx
function Lists_extends() { return Lists_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, Lists_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





const TASK_TYPE = {
  IN_PROGRESS: "tasks",
  COMPLETED: "completed"
};
const USER_ACTION_TYPES = {
  LIST_COPY: "list_copy",
  LIST_CREATE: "list_create",
  LIST_EDIT: "list_edit",
  LIST_DELETE: "list_delete",
  TASK_CREATE: "task_create",
  TASK_EDIT: "task_edit",
  TASK_DELETE: "task_delete",
  TASK_COMPLETE: "task_complete"
};
const PREF_WIDGETS_LISTS_MAX_LISTS = "widgets.lists.maxLists";
const PREF_WIDGETS_LISTS_MAX_LISTITEMS = "widgets.lists.maxListItems";
const PREF_WIDGETS_LISTS_BADGE_ENABLED = "widgets.lists.badge.enabled";
const PREF_WIDGETS_LISTS_BADGE_LABEL = "widgets.lists.badge.label";

// eslint-disable-next-line max-statements
function Lists({
  dispatch,
  handleUserInteraction,
  isMaximized,
  widgetsMayBeMaximized
}) {
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const {
    selected,
    lists
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.ListsWidget);
  const [newTask, setNewTask] = (0,external_React_namespaceObject.useState)("");
  const [isEditing, setIsEditing] = (0,external_React_namespaceObject.useState)(false);
  const [pendingNewList, setPendingNewList] = (0,external_React_namespaceObject.useState)(null);
  const selectedList = (0,external_React_namespaceObject.useMemo)(() => lists[selected], [lists, selected]);

  // Bug 2012829 - Calculate widget size dynamically based on isMaximized prop.
  // Future sizes: mini, medium, large.
  const widgetSize = isMaximized ? "medium" : "small";
  const prevCompletedCount = (0,external_React_namespaceObject.useRef)(selectedList?.completed?.length || 0);
  const inputRef = (0,external_React_namespaceObject.useRef)(null);
  const selectRef = (0,external_React_namespaceObject.useRef)(null);
  const reorderListRef = (0,external_React_namespaceObject.useRef)(null);
  const [canvasRef, fireConfetti] = useConfetti();
  const impressionFired = (0,external_React_namespaceObject.useRef)(false);
  const handleListInteraction = (0,external_React_namespaceObject.useCallback)(() => handleUserInteraction("lists"), [handleUserInteraction]);

  // store selectedList with useMemo so it isnt re-calculated on every re-render
  const isValidUrl = (0,external_React_namespaceObject.useCallback)(str => URL.canParse(str), []);
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_LISTS_USER_IMPRESSION
      }));
      const telemetryData = {
        widget_name: "lists",
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_IMPRESSION,
        data: telemetryData
      }));
    });
  }, [dispatch, widgetsMayBeMaximized, widgetSize]);
  const listsRef = useIntersectionObserver(handleIntersection);
  const reorderLists = (0,external_React_namespaceObject.useCallback)((draggedElement, targetElement, before = false) => {
    const draggedIndex = selectedList.tasks.findIndex(({
      id
    }) => id === draggedElement.id);
    const targetIndex = selectedList.tasks.findIndex(({
      id
    }) => id === targetElement.id);

    // return early is index is not found
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) {
      return;
    }
    const reordered = [...selectedList.tasks];
    const [removed] = reordered.splice(draggedIndex, 1);
    const insertIndex = before ? targetIndex : targetIndex + 1;
    reordered.splice(insertIndex > draggedIndex ? insertIndex - 1 : insertIndex, 0, removed);
    const updatedLists = {
      ...lists,
      [selected]: {
        ...selectedList,
        tasks: reordered
      }
    };
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.WIDGETS_LISTS_UPDATE,
      data: {
        lists: updatedLists
      }
    }));
    handleListInteraction();
  }, [lists, selected, selectedList, dispatch, handleListInteraction]);
  const moveTask = (0,external_React_namespaceObject.useCallback)((task, direction) => {
    const index = selectedList.tasks.findIndex(({
      id
    }) => id === task.id);

    // guardrail a falsey index
    if (index === -1) {
      return;
    }
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const before = direction === "up";
    const targetTask = selectedList.tasks[targetIndex];
    if (targetTask) {
      reorderLists(task, targetTask, before);
    }
  }, [selectedList, reorderLists]);
  (0,external_React_namespaceObject.useEffect)(() => {
    const selectNode = selectRef.current;
    const reorderNode = reorderListRef.current;
    if (!selectNode || !reorderNode) {
      return undefined;
    }
    function handleSelectChange(e) {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_LISTS_CHANGE_SELECTED,
        data: e.target.value
      }));
      handleListInteraction();
    }
    function handleReorder(e) {
      const {
        draggedElement,
        targetElement,
        position
      } = e.detail;
      reorderLists(draggedElement, targetElement, position === -1);
    }
    reorderNode.addEventListener("reorder", handleReorder);
    selectNode.addEventListener("change", handleSelectChange);
    return () => {
      selectNode.removeEventListener("change", handleSelectChange);
      reorderNode.removeEventListener("reorder", handleReorder);
    };
  }, [dispatch, isEditing, reorderLists, handleListInteraction]);

  // effect that enables editing new list name only after store has been hydrated
  (0,external_React_namespaceObject.useEffect)(() => {
    if (selected === pendingNewList) {
      setIsEditing(true);
      setPendingNewList(null);
    }
  }, [selected, pendingNewList]);
  function saveTask() {
    const trimmedTask = newTask.trimEnd();
    // only add new task if it has a length, to avoid creating empty tasks
    if (trimmedTask) {
      const formattedTask = {
        value: trimmedTask,
        completed: false,
        created: Date.now(),
        id: crypto.randomUUID(),
        isUrl: isValidUrl(trimmedTask)
      };
      const updatedLists = {
        ...lists,
        [selected]: {
          ...selectedList,
          tasks: [formattedTask, ...lists[selected].tasks]
        }
      };
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_UPDATE,
          data: {
            lists: updatedLists
          }
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_LISTS_USER_EVENT,
          data: {
            userAction: USER_ACTION_TYPES.TASK_CREATE
          }
        }));
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.TASK_CREATE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
      setNewTask("");
      handleListInteraction();
    }
  }
  function updateTask(updatedTask, type) {
    const isCompletedType = type === TASK_TYPE.COMPLETED;
    const isNowCompleted = updatedTask.completed;
    let newTasks = selectedList.tasks;
    let newCompleted = selectedList.completed;
    let userAction;

    // If the task is in the completed array and is now unchecked
    const shouldMoveToTasks = isCompletedType && !isNowCompleted;

    // If we're moving the task from tasks → completed (user checked it)
    const shouldMoveToCompleted = !isCompletedType && isNowCompleted;

    //  Move task from completed -> task
    if (shouldMoveToTasks) {
      newCompleted = selectedList.completed.filter(task => task.id !== updatedTask.id);
      newTasks = [...selectedList.tasks, updatedTask];
      // Move task to completed, but also create local version
    } else if (shouldMoveToCompleted) {
      newTasks = selectedList.tasks.filter(task => task.id !== updatedTask.id);
      newCompleted = [...selectedList.completed, updatedTask];
      userAction = USER_ACTION_TYPES.TASK_COMPLETE;
    } else {
      const targetKey = isCompletedType ? "completed" : "tasks";
      const updatedArray = selectedList[targetKey].map(task => task.id === updatedTask.id ? updatedTask : task);
      // In-place update: toggle checkbox (but stay in same array or edit name)
      if (targetKey === "tasks") {
        newTasks = updatedArray;
      } else {
        newCompleted = updatedArray;
      }
      userAction = USER_ACTION_TYPES.TASK_EDIT;
    }
    const updatedLists = {
      ...lists,
      [selected]: {
        ...selectedList,
        tasks: newTasks,
        completed: newCompleted
      }
    };
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_LISTS_UPDATE,
        data: {
          lists: updatedLists
        }
      }));
      if (userAction) {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_USER_EVENT,
          data: {
            userAction
          }
        }));
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: userAction,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      }
    });
    handleListInteraction();
  }
  function deleteTask(task, type) {
    const selectedTasks = lists[selected][type];
    const updatedTasks = selectedTasks.filter(({
      id
    }) => id !== task.id);
    const updatedLists = {
      ...lists,
      [selected]: {
        ...selectedList,
        [type]: updatedTasks
      }
    };
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_LISTS_UPDATE,
        data: {
          lists: updatedLists
        }
      }));
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_LISTS_USER_EVENT,
        data: {
          userAction: USER_ACTION_TYPES.TASK_DELETE
        }
      }));
      const telemetryData = {
        widget_name: "lists",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.TASK_DELETE,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
    handleListInteraction();
  }
  function handleKeyDown(e) {
    if (e.key === "Enter" && document.activeElement === inputRef.current) {
      saveTask();
    } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
      // Clear out the input when esc is pressed
      setNewTask("");
    }
  }
  function handleListNameSave(newLabel) {
    const trimmedLabel = newLabel.trimEnd();
    if (trimmedLabel && trimmedLabel !== selectedList?.label) {
      const updatedLists = {
        ...lists,
        [selected]: {
          ...selectedList,
          label: trimmedLabel
        }
      };
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_UPDATE,
          data: {
            lists: updatedLists
          }
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_LISTS_USER_EVENT,
          data: {
            userAction: USER_ACTION_TYPES.LIST_EDIT
          }
        }));
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.LIST_EDIT,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
      setIsEditing(false);
      handleListInteraction();
    }
  }
  function handleCreateNewList() {
    const id = crypto.randomUUID();
    const newLists = {
      ...lists,
      [id]: {
        label: "",
        tasks: [],
        completed: []
      }
    };
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_LISTS_UPDATE,
        data: {
          lists: newLists
        }
      }));
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_LISTS_CHANGE_SELECTED,
        data: id
      }));
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_LISTS_USER_EVENT,
        data: {
          userAction: USER_ACTION_TYPES.LIST_CREATE
        }
      }));
      const telemetryData = {
        widget_name: "lists",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.LIST_CREATE,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
    setPendingNewList(id);
    handleListInteraction();
  }
  function handleCancelNewList() {
    // If current list is new and has no label/tasks, remove it
    if (!selectedList?.label && selectedList?.tasks?.length === 0) {
      const updatedLists = {
        ...lists
      };
      delete updatedLists[selected];
      const listKeys = Object.keys(updatedLists);
      const key = listKeys[listKeys.length - 1];
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_UPDATE,
          data: {
            lists: updatedLists
          }
        }));
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_CHANGE_SELECTED,
          data: key
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_LISTS_USER_EVENT,
          data: {
            userAction: USER_ACTION_TYPES.LIST_DELETE
          }
        }));
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.LIST_DELETE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
    }
    handleListInteraction();
  }
  function handleDeleteList() {
    let updatedLists = {
      ...lists
    };
    if (updatedLists[selected]) {
      delete updatedLists[selected];

      // if this list was the last one created, add a new list as default
      if (Object.keys(updatedLists)?.length === 0) {
        updatedLists = {
          [crypto.randomUUID()]: {
            label: "",
            tasks: [],
            completed: []
          }
        };
      }
      const listKeys = Object.keys(updatedLists);
      const key = listKeys[listKeys.length - 1];
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_UPDATE,
          data: {
            lists: updatedLists
          }
        }));
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_LISTS_CHANGE_SELECTED,
          data: key
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_LISTS_USER_EVENT,
          data: {
            userAction: USER_ACTION_TYPES.LIST_DELETE
          }
        }));
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.LIST_DELETE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
    }
    handleListInteraction();
  }
  function handleHideLists() {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "widgets.lists.enabled",
          value: false
        }
      }));
      const telemetryData = {
        widget_name: "lists",
        widget_source: "context_menu",
        enabled: false,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_ENABLED,
        data: telemetryData
      }));
    });
    handleListInteraction();
  }
  function handleCopyListToClipboard() {
    const currentList = lists[selected];
    if (!currentList) {
      return;
    }
    const {
      label,
      tasks = [],
      completed = []
    } = currentList;
    const uncompleted = tasks.filter(task => !task.completed);
    const currentCompleted = tasks.filter(task => task.completed);

    // In order in include all items, we need to iterate through both current and completed tasks list and mark format all completed tasks accordingly.
    const formatted = [`List: ${label}`, `---`, ...uncompleted.map(task => `- [ ] ${task.value}`), ...currentCompleted.map(task => `- [x] ${task.value}`), ...completed.map(task => `- [x] ${task.value}`)].join("\n");
    try {
      navigator.clipboard.writeText(formatted);
    } catch (err) {
      console.error("Copy failed", err);
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_LISTS_USER_EVENT,
        data: {
          userAction: USER_ACTION_TYPES.LIST_COPY
        }
      }));
      const telemetryData = {
        widget_name: "lists",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.LIST_COPY,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
    handleListInteraction();
  }
  function handleLearnMore() {
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.OPEN_LINK,
      data: {
        url: "https://support.mozilla.org/kb/firefox-new-tab-widgets"
      }
    }));
    handleListInteraction();
  }

  // Reset baseline only when switching lists
  (0,external_React_namespaceObject.useEffect)(() => {
    prevCompletedCount.current = selectedList?.completed?.length || 0;
    // intentionally leaving out selectedList from dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);
  (0,external_React_namespaceObject.useEffect)(() => {
    if (selectedList) {
      const doneCount = selectedList.completed?.length || 0;
      const previous = Math.floor(prevCompletedCount.current / 5);
      const current = Math.floor(doneCount / 5);
      if (current > previous) {
        fireConfetti();
      }
      prevCompletedCount.current = doneCount;
    }
  }, [selectedList, fireConfetti, selected]);
  if (!lists) {
    return null;
  }

  // Enforce maximum count limits to lists
  const currentListsCount = Object.keys(lists).length;
  // Ensure a minimum of 1, but allow higher values from prefs
  const maxListsCount = Math.max(1, prefs[PREF_WIDGETS_LISTS_MAX_LISTS]);
  const isAtMaxListsLimit = currentListsCount >= maxListsCount;

  // Enforce maximum count limits to list items
  // The maximum applies to the total number of items (both incomplete and completed items)
  const currentSelectedListItemsCount = selectedList?.tasks.length + selectedList?.completed.length;

  // Ensure a minimum of 1, but allow higher values from prefs
  const maxListItemsCount = Math.max(1, prefs[PREF_WIDGETS_LISTS_MAX_LISTITEMS]);
  const isAtMaxListItemsLimit = currentSelectedListItemsCount >= maxListItemsCount;

  // Figure out if the selected list is the first (default) or a new one.
  // Index 0 → use "Task list"; any later index → use "New list".
  // Fallback to 0 if the selected id isn’t found.
  const listKeys = Object.keys(lists);
  const selectedIndex = Math.max(0, listKeys.indexOf(selected));
  const listNamePlaceholder = currentListsCount > 1 && selectedIndex !== 0 ? "newtab-widget-lists-name-placeholder-new" : "newtab-widget-lists-name-placeholder-default";
  const nimbusBadgeEnabled = prefs.widgetsConfig?.listsBadgeEnabled;
  const nimbusBadgeLabel = prefs.widgetsConfig?.listsBadgeLabel;
  const nimbusBadgeTrainhopEnabled = prefs.trainhopConfig?.widgets?.listsBadgeEnabled;
  const nimbusBadgeTrainhopLabel = prefs.trainhopConfig?.widgets?.listsBadgeLabel;
  const badgeEnabled = (nimbusBadgeEnabled || nimbusBadgeTrainhopEnabled) ?? prefs[PREF_WIDGETS_LISTS_BADGE_ENABLED] ?? false;
  const badgeLabel = (nimbusBadgeLabel || nimbusBadgeTrainhopLabel) ?? prefs[PREF_WIDGETS_LISTS_BADGE_LABEL] ?? "";
  return /*#__PURE__*/external_React_default().createElement("article", {
    className: `lists ${isMaximized ? "is-maximized" : ""}`,
    ref: el => {
      listsRef.current = [el];
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "select-wrapper"
  }, /*#__PURE__*/external_React_default().createElement(EditableText, {
    value: lists[selected]?.label || "",
    onSave: handleListNameSave,
    isEditing: isEditing,
    setIsEditing: setIsEditing,
    onCancel: handleCancelNewList,
    type: "list",
    maxLength: 30,
    dataL10nId: listNamePlaceholder
  }, /*#__PURE__*/external_React_default().createElement("moz-select", {
    ref: selectRef,
    value: selected
  }, Object.entries(lists).map(([key, list]) => /*#__PURE__*/external_React_default().createElement("moz-option", Lists_extends({
    key: key,
    value: key
    // On the first/initial list, use default name
  }, list.label ? {
    label: list.label
  } : {
    "data-l10n-id": "newtab-widget-lists-name-label-default"
  }))))), !isEditing && badgeEnabled && badgeLabel && /*#__PURE__*/external_React_default().createElement("moz-badge", {
    "data-l10n-id": (() => {
      if (badgeLabel === "New") {
        return "newtab-widget-lists-label-new";
      }
      if (badgeLabel === "Beta") {
        return "newtab-widget-lists-label-beta";
      }
      return "";
    })()
  }), /*#__PURE__*/external_React_default().createElement("moz-button", {
    className: "lists-panel-button",
    iconSrc: "chrome://global/skin/icons/more.svg",
    menuId: "lists-panel",
    type: "ghost"
  }), /*#__PURE__*/external_React_default().createElement("panel-list", {
    id: "lists-panel"
  }, /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-menu-edit",
    onClick: () => setIsEditing(true)
  }), /*#__PURE__*/external_React_default().createElement("panel-item", Lists_extends({}, isAtMaxListsLimit ? {
    disabled: true
  } : {}, {
    "data-l10n-id": "newtab-widget-lists-menu-create",
    onClick: () => handleCreateNewList(),
    className: "create-list"
  })), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-menu-delete",
    onClick: () => handleDeleteList()
  }), /*#__PURE__*/external_React_default().createElement("hr", null), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-menu-copy",
    onClick: () => handleCopyListToClipboard()
  }), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-menu-hide",
    onClick: () => handleHideLists()
  }), /*#__PURE__*/external_React_default().createElement("panel-item", {
    className: "learn-more",
    "data-l10n-id": "newtab-widget-lists-menu-learn-more",
    onClick: handleLearnMore
  }))), /*#__PURE__*/external_React_default().createElement("div", {
    className: "add-task-container"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: `icon icon-add ${isAtMaxListItemsLimit ? "icon-disabled" : ""}`
  }), /*#__PURE__*/external_React_default().createElement("input", {
    ref: inputRef,
    onBlur: () => saveTask(),
    onChange: e => setNewTask(e.target.value),
    value: newTask,
    "data-l10n-id": "newtab-widget-lists-input-add-an-item",
    className: "add-task-input",
    onKeyDown: handleKeyDown,
    type: "text",
    maxLength: 100,
    disabled: isAtMaxListItemsLimit
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "task-list-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("moz-reorderable-list", {
    ref: reorderListRef,
    itemSelector: "fieldset .task-type-tasks",
    dragSelector: ".checkbox-wrapper:has(.task-label)"
  }, /*#__PURE__*/external_React_default().createElement("fieldset", null, selectedList?.tasks.length >= 1 && selectedList.tasks.map((task, index) => /*#__PURE__*/external_React_default().createElement(ListItem, {
    type: TASK_TYPE.IN_PROGRESS,
    task: task,
    key: task.id,
    updateTask: updateTask,
    deleteTask: deleteTask,
    moveTask: moveTask,
    isValidUrl: isValidUrl,
    isFirst: index === 0,
    isLast: index === selectedList.tasks.length - 1
  })), selectedList?.completed.length >= 1 && /*#__PURE__*/external_React_default().createElement("details", {
    className: "completed-task-wrapper",
    open: selectedList?.tasks.length < 1
  }, /*#__PURE__*/external_React_default().createElement("summary", null, /*#__PURE__*/external_React_default().createElement("span", {
    "data-l10n-id": "newtab-widget-lists-completed-list",
    "data-l10n-args": JSON.stringify({
      number: lists[selected]?.completed.length
    }),
    className: "completed-title"
  })), selectedList?.completed.map(completedTask => /*#__PURE__*/external_React_default().createElement(ListItem, {
    key: completedTask.id,
    type: TASK_TYPE.COMPLETED,
    task: completedTask,
    deleteTask: deleteTask,
    updateTask: updateTask
  }))))), selectedList?.tasks.length < 1 && selectedList?.completed.length < 1 && /*#__PURE__*/external_React_default().createElement("div", {
    className: "empty-list"
  }, /*#__PURE__*/external_React_default().createElement("picture", null, /*#__PURE__*/external_React_default().createElement("source", {
    srcSet: "chrome://newtab/content/data/content/assets/lists-empty-state-dark.svg",
    media: "(prefers-color-scheme: dark)"
  }), /*#__PURE__*/external_React_default().createElement("source", {
    srcSet: "chrome://newtab/content/data/content/assets/lists-empty-state-light.svg",
    media: "(prefers-color-scheme: light)"
  }), /*#__PURE__*/external_React_default().createElement("img", {
    width: "100",
    height: "100",
    alt: ""
  })), /*#__PURE__*/external_React_default().createElement("p", {
    className: "empty-list-text",
    "data-l10n-id": "newtab-widget-lists-empty-cta"
  }))), /*#__PURE__*/external_React_default().createElement("canvas", {
    className: "confetti-canvas",
    ref: canvasRef
  }));
}
function ListItem({
  task,
  updateTask,
  deleteTask,
  moveTask,
  isValidUrl,
  type,
  isFirst = false,
  isLast = false
}) {
  const [isEditing, setIsEditing] = (0,external_React_namespaceObject.useState)(false);
  const [exiting, setExiting] = (0,external_React_namespaceObject.useState)(false);
  const isCompleted = type === TASK_TYPE.COMPLETED;
  const prefersReducedMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function handleCheckboxChange(e) {
    const {
      checked
    } = e.target;
    const updatedTask = {
      ...task,
      completed: checked
    };
    if (checked && !prefersReducedMotion) {
      setExiting(true);
    } else {
      updateTask(updatedTask, type);
    }
  }

  // When the CSS transition finishes, dispatch the real “completed = true”
  function handleTransitionEnd(e) {
    // only fire once for the exit:
    if (e.propertyName === "opacity" && exiting) {
      updateTask({
        ...task,
        completed: true
      }, type);
      setExiting(false);
    }
  }
  function handleSave(newValue) {
    const trimmedTask = newValue.trimEnd();
    if (trimmedTask && trimmedTask !== task.value) {
      updateTask({
        ...task,
        value: newValue,
        isUrl: isValidUrl(trimmedTask)
      }, type);
      setIsEditing(false);
    }
  }
  function handleDelete() {
    deleteTask(task, type);
  }
  const taskLabel = task.isUrl ? /*#__PURE__*/external_React_default().createElement("a", {
    href: task.value,
    rel: "noopener noreferrer",
    target: "_blank",
    className: "task-label",
    title: task.value
  }, task.value) : /*#__PURE__*/external_React_default().createElement("label", {
    className: "task-label",
    title: task.value,
    htmlFor: `task-${task.id}`,
    onClick: () => setIsEditing(true)
  }, task.value);
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `task-item task-type-${type} ${exiting ? " exiting" : ""}`,
    id: task.id,
    key: task.id,
    onTransitionEnd: handleTransitionEnd
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "checkbox-wrapper",
    key: isEditing
  }, /*#__PURE__*/external_React_default().createElement("input", {
    type: "checkbox",
    onChange: handleCheckboxChange,
    checked: task.completed || exiting,
    id: `task-${task.id}`
  }), isCompleted ? taskLabel : /*#__PURE__*/external_React_default().createElement(EditableText, {
    isEditing: isEditing,
    setIsEditing: setIsEditing,
    value: task.value,
    onSave: handleSave,
    type: "task"
  }, taskLabel)), /*#__PURE__*/external_React_default().createElement("moz-button", {
    iconSrc: "chrome://global/skin/icons/more.svg",
    menuId: `panel-task-${task.id}`,
    type: "ghost"
  }), /*#__PURE__*/external_React_default().createElement("panel-list", {
    id: `panel-task-${task.id}`
  }, !isCompleted && /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, task.isUrl && /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-input-menu-open-link",
    onClick: () => window.open(task.value, "_blank", "noopener")
  }), /*#__PURE__*/external_React_default().createElement("panel-item", Lists_extends({}, isFirst ? {
    disabled: true
  } : {}, {
    onClick: () => moveTask(task, "up"),
    "data-l10n-id": "newtab-widget-lists-input-menu-move-up"
  })), /*#__PURE__*/external_React_default().createElement("panel-item", Lists_extends({}, isLast ? {
    disabled: true
  } : {}, {
    onClick: () => moveTask(task, "down"),
    "data-l10n-id": "newtab-widget-lists-input-menu-move-down"
  })), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-input-menu-edit",
    className: "edit-item",
    onClick: () => setIsEditing(true)
  })), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-lists-input-menu-delete",
    className: "delete-item",
    onClick: handleDelete
  })));
}
function EditableText({
  value,
  isEditing,
  setIsEditing,
  onSave,
  onCancel,
  children,
  type,
  dataL10nId = null,
  maxLength = 100
}) {
  const [tempValue, setTempValue] = (0,external_React_namespaceObject.useState)(value);
  const inputRef = (0,external_React_namespaceObject.useRef)(null);

  // True if tempValue is empty, null/undefined, or only whitespace
  const showPlaceholder = (tempValue ?? "").trim() === "";
  (0,external_React_namespaceObject.useEffect)(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else {
      setTempValue(value);
    }
  }, [isEditing, value]);
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      onSave(tempValue.trim());
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTempValue(value);
      onCancel?.();
    }
  }
  function handleOnBlur() {
    onSave(tempValue.trim());
    setIsEditing(false);
  }
  return isEditing ? /*#__PURE__*/external_React_default().createElement("input", Lists_extends({
    className: `edit-${type}`,
    ref: inputRef,
    type: "text",
    value: tempValue,
    maxLength: maxLength,
    onChange: event => setTempValue(event.target.value),
    onBlur: handleOnBlur,
    onKeyDown: handleKeyDown
    // Note that if a user has a custom name set, it will override the placeholder
  }, showPlaceholder && dataL10nId ? {
    "data-l10n-id": dataL10nId
  } : {})) : [children];
}

;// CONCATENATED MODULE: ./content-src/components/Widgets/FocusTimer/FocusTimer.jsx
function FocusTimer_extends() { return FocusTimer_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, FocusTimer_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





const FocusTimer_USER_ACTION_TYPES = {
  TIMER_SET: "timer_set",
  TIMER_PLAY: "timer_play",
  TIMER_PAUSE: "timer_pause",
  TIMER_RESET: "timer_reset",
  TIMER_END: "timer_end",
  TIMER_TOGGLE_FOCUS: "timer_toggle_focus",
  TIMER_TOGGLE_BREAK: "timer_toggle_break"
};

/**
 * Calculates the remaining time (in seconds) by subtracting elapsed time from the original duration
 *
 * @param duration
 * @param start
 * @returns int
 */
const calculateTimeRemaining = (duration, start) => {
  const currentTime = Math.floor(Date.now() / 1000);

  // Subtract the elapsed time from initial duration to get time remaining in the timer
  return Math.max(duration - (currentTime - start), 0);
};

/**
 * Converts a number of seconds into a zero-padded MM:SS time string
 *
 * @param seconds
 * @returns string
 */
const formatTime = seconds => {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
};

/**
 * Validates that the inputs in the timer only allow numerical digits (0-9)
 *
 * @param input - The character being input
 * @returns boolean - true if valid numeric input, false otherwise
 */
const isNumericValue = input => {
  // Check for null/undefined input or non-numeric characters
  return input && /^\d+$/.test(input);
};

/**
 * Validates if adding a new digit would exceed the 2-character limit
 *
 * @param currentValue - The current value in the field
 * @returns boolean - true if at 2-character limit, false otherwise
 */
const isAtMaxLength = currentValue => {
  return currentValue.length >= 2;
};

/**
 * Converts a polar coordinate (angle on circle) into a percentage-based [x,y] position for clip-path
 *
 * @param cx
 * @param cy
 * @param radius
 * @param angle
 * @returns string
 */
const polarToPercent = (cx, cy, radius, angle) => {
  const rad = (angle - 90) * Math.PI / 180;
  const x = cx + radius * Math.cos(rad);
  const y = cy + radius * Math.sin(rad);
  return `${x}% ${y}%`;
};

/**
 * Generates a clip-path polygon string that represents a pie slice from 0 degrees
 * to the current progress angle
 *
 * @returns string
 * @param progress
 */
const getClipPath = progress => {
  const cx = 50;
  const cy = 50;
  const radius = 50;
  // Show some progress right at the start - 6 degrees is just enough to paint a dot once the timer is ticking
  const angle = progress > 0 ? Math.max(progress * 360, 6) : 0;
  const points = [`50% 50%`];
  for (let a = 0; a <= angle; a += 2) {
    points.push(polarToPercent(cx, cy, radius, a));
  }
  return `polygon(${points.join(", ")})`;
};
const FocusTimer = ({
  dispatch,
  handleUserInteraction,
  isMaximized,
  widgetsMayBeMaximized
}) => {
  const [timeLeft, setTimeLeft] = (0,external_React_namespaceObject.useState)(0);
  // calculated value for the progress circle; 1 = 100%
  const [progress, setProgress] = (0,external_React_namespaceObject.useState)(0);
  const activeMinutesRef = (0,external_React_namespaceObject.useRef)(null);
  const activeSecondsRef = (0,external_React_namespaceObject.useRef)(null);
  const arcRef = (0,external_React_namespaceObject.useRef)(null);
  const impressionFired = (0,external_React_namespaceObject.useRef)(false);
  const timerType = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.TimerWidget.timerType);
  const timerData = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.TimerWidget);
  const {
    duration,
    initialDuration,
    startTime,
    isRunning
  } = timerData[timerType];
  const initialTimerDuration = timerData[timerType].initialDuration;
  const widgetSize = isMaximized ? "medium" : "small";
  const handleTimerInteraction = (0,external_React_namespaceObject.useCallback)(() => handleUserInteraction("focusTimer"), [handleUserInteraction]);
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_TIMER_USER_IMPRESSION
      }));
      const telemetryData = {
        widget_name: "focus_timer",
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_IMPRESSION,
        data: telemetryData
      }));
    });
  }, [dispatch, widgetsMayBeMaximized, widgetSize]);
  const timerRef = useIntersectionObserver(handleIntersection);
  const resetProgressCircle = (0,external_React_namespaceObject.useCallback)(() => {
    if (arcRef?.current) {
      arcRef.current.style.clipPath = "polygon(50% 50%)";
      arcRef.current.style.webkitClipPath = "polygon(50% 50%)";
    }
    setProgress(0);
    handleTimerInteraction();
  }, [arcRef, handleTimerInteraction]);
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const showSystemNotifications = prefs["widgets.focusTimer.showSystemNotifications"];
  (0,external_React_namespaceObject.useEffect)(() => {
    // resets default values after timer ends
    let interval;
    let hasReachedZero = false;
    if (isRunning && duration > 0) {
      interval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);
        const elapsed = currentTime - startTime;
        const remaining = calculateTimeRemaining(duration, startTime);

        // using setTimeLeft to trigger a re-render of the component to show live countdown each second
        setTimeLeft(remaining);
        setProgress((initialDuration - remaining) / initialDuration);
        if (elapsed >= duration && hasReachedZero) {
          clearInterval(interval);
          (0,external_ReactRedux_namespaceObject.batch)(() => {
            dispatch(actionCreators.AlsoToMain({
              type: actionTypes.WIDGETS_TIMER_END,
              data: {
                timerType,
                duration: initialTimerDuration,
                initialDuration: initialTimerDuration
              }
            }));
            dispatch(actionCreators.OnlyToMain({
              type: actionTypes.WIDGETS_TIMER_USER_EVENT,
              data: {
                userAction: FocusTimer_USER_ACTION_TYPES.TIMER_END
              }
            }));
            const telemetryData = {
              widget_name: "focus_timer",
              widget_source: "widget",
              user_action: FocusTimer_USER_ACTION_TYPES.TIMER_END,
              widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
            };
            dispatch(actionCreators.OnlyToMain({
              type: actionTypes.WIDGETS_USER_EVENT,
              data: telemetryData
            }));
          });

          // animate the progress circle to turn solid green
          setProgress(1);

          // More transitions after a delay to allow the animation above to complete
          setTimeout(() => {
            // progress circle goes back to default grey
            resetProgressCircle();

            // There's more to see!
            setTimeout(() => {
              // switch over to the other timer type
              // eslint-disable-next-line max-nested-callbacks
              (0,external_ReactRedux_namespaceObject.batch)(() => {
                dispatch(actionCreators.AlsoToMain({
                  type: actionTypes.WIDGETS_TIMER_SET_TYPE,
                  data: {
                    timerType: timerType === "focus" ? "break" : "focus"
                  }
                }));
                const userAction = timerType === "focus" ? FocusTimer_USER_ACTION_TYPES.TIMER_TOGGLE_BREAK : FocusTimer_USER_ACTION_TYPES.TIMER_TOGGLE_FOCUS;
                dispatch(actionCreators.OnlyToMain({
                  type: actionTypes.WIDGETS_TIMER_USER_EVENT,
                  data: {
                    userAction
                  }
                }));
                const telemetryData = {
                  widget_name: "focus_timer",
                  widget_source: "widget",
                  user_action: userAction,
                  widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
                };
                dispatch(actionCreators.OnlyToMain({
                  type: actionTypes.WIDGETS_USER_EVENT,
                  data: telemetryData
                }));
              });
            }, 500);
          }, 1000);
        } else if (elapsed >= duration) {
          hasReachedZero = true;
        }
      }, 1000);
    }

    // Shows the correct live time in the UI whenever the timer state changes
    const newTime = isRunning ? calculateTimeRemaining(duration, startTime) : duration;
    setTimeLeft(newTime);

    // Set progress for paused timers (handles page load and timer type toggling)
    if (!isRunning && duration < initialDuration) {
      // Show previously elapsed time
      setProgress((initialDuration - duration) / initialDuration);
    } else if (!isRunning) {
      // Reset progress for fresh timers
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isRunning, startTime, duration, initialDuration, dispatch, resetProgressCircle, timerType, initialTimerDuration, widgetSize, widgetsMayBeMaximized]);

  // Update the clip-path of the gradient circle to match the current progress value
  (0,external_React_namespaceObject.useEffect)(() => {
    if (arcRef?.current) {
      // Only set clip-path if current timer has been started or is running
      if (progress > 0 || isRunning) {
        arcRef.current.style.clipPath = getClipPath(progress);
      } else {
        arcRef.current.style.clipPath = "";
      }
    }
  }, [progress, isRunning]);

  // set timer function
  const setTimerDuration = () => {
    const minutesEl = activeMinutesRef.current;
    const secondsEl = activeSecondsRef.current;
    const minutesValue = minutesEl.innerText.trim() || "0";
    const secondsValue = secondsEl.innerText.trim() || "0";
    let minutes = parseInt(minutesValue || "0", 10);
    let seconds = parseInt(secondsValue || "0", 10);

    // Set a limit of 99 minutes
    minutes = Math.min(minutes, 99);
    // Set a limit of 59 seconds
    seconds = Math.min(seconds, 59);
    const totalSeconds = minutes * 60 + seconds;
    if (!Number.isNaN(totalSeconds) && totalSeconds > 0 && totalSeconds !== duration) {
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_TIMER_SET_DURATION,
          data: {
            timerType,
            duration: totalSeconds
          }
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_TIMER_USER_EVENT,
          data: {
            userAction: FocusTimer_USER_ACTION_TYPES.TIMER_SET
          }
        }));
        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: FocusTimer_USER_ACTION_TYPES.TIMER_SET,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
    }
    handleTimerInteraction();
  };

  // Pause timer function
  const toggleTimer = () => {
    if (!isRunning && duration > 0) {
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_TIMER_PLAY,
          data: {
            timerType
          }
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_TIMER_USER_EVENT,
          data: {
            userAction: FocusTimer_USER_ACTION_TYPES.TIMER_PLAY
          }
        }));
        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: FocusTimer_USER_ACTION_TYPES.TIMER_PLAY,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
    } else if (isRunning) {
      // calculated to get the new baseline of the timer when it starts or resumes
      const remaining = calculateTimeRemaining(duration, startTime);
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_TIMER_PAUSE,
          data: {
            timerType,
            duration: remaining
          }
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_TIMER_USER_EVENT,
          data: {
            userAction: FocusTimer_USER_ACTION_TYPES.TIMER_PAUSE
          }
        }));
        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: FocusTimer_USER_ACTION_TYPES.TIMER_PAUSE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
    }
    handleTimerInteraction();
  };

  // reset timer function
  const resetTimer = () => {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_TIMER_RESET,
        data: {
          timerType,
          duration: initialTimerDuration,
          initialDuration: initialTimerDuration
        }
      }));
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_TIMER_USER_EVENT,
        data: {
          userAction: FocusTimer_USER_ACTION_TYPES.TIMER_RESET
        }
      }));
      const telemetryData = {
        widget_name: "focus_timer",
        widget_source: "widget",
        user_action: FocusTimer_USER_ACTION_TYPES.TIMER_RESET,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });

    // Reset progress value and gradient arc on the progress circle
    resetProgressCircle();
    handleTimerInteraction();
  };

  // Toggles between "focus" and "break" timer types
  const toggleType = type => {
    const oldTypeRemaining = calculateTimeRemaining(duration, startTime);
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      // The type we are toggling away from automatically pauses
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_TIMER_PAUSE,
        data: {
          timerType,
          duration: oldTypeRemaining
        }
      }));
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_TIMER_USER_EVENT,
        data: {
          userAction: FocusTimer_USER_ACTION_TYPES.TIMER_PAUSE
        }
      }));
      const pauseTelemetryData = {
        widget_name: "focus_timer",
        widget_source: "widget",
        user_action: FocusTimer_USER_ACTION_TYPES.TIMER_PAUSE,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: pauseTelemetryData
      }));

      // Sets the current timer type so it persists when opening a new tab
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WIDGETS_TIMER_SET_TYPE,
        data: {
          timerType: type
        }
      }));
      const toggleUserAction = type === "focus" ? FocusTimer_USER_ACTION_TYPES.TIMER_TOGGLE_FOCUS : FocusTimer_USER_ACTION_TYPES.TIMER_TOGGLE_BREAK;
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_TIMER_USER_EVENT,
        data: {
          userAction: toggleUserAction
        }
      }));
      const toggleTelemetryData = {
        widget_name: "focus_timer",
        widget_source: "widget",
        user_action: toggleUserAction,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: toggleTelemetryData
      }));
    });
    handleTimerInteraction();
  };
  const handleKeyDown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      setTimerDuration(e);
      handleTimerInteraction();
    }
    if (e.key === "Tab") {
      setTimerDuration(e);
      handleTimerInteraction();
    }
  };
  const handleBeforeInput = e => {
    const input = e.data;
    const values = e.target.innerText.trim();

    // only allow numerical digits 0–9 for time input
    if (!isNumericValue(input)) {
      e.preventDefault();
      return;
    }
    const selection = window.getSelection();
    const selectedText = selection.toString();

    // if entire value is selected, replace it with the new input
    if (selectedText === values) {
      e.preventDefault(); // prevent default typing
      e.target.innerText = input;

      // Places the caret at the end of the content-editable text
      // This is a known problem with content-editable where the caret
      const range = document.createRange();
      range.selectNodeContents(e.target);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    // only allow 2 values each for minutes and seconds
    if (isAtMaxLength(values)) {
      e.preventDefault();
    }
  };
  const handleFocus = e => {
    if (isRunning) {
      // calculated to get the new baseline of the timer when it starts or resumes
      const remaining = calculateTimeRemaining(duration, startTime);
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        dispatch(actionCreators.AlsoToMain({
          type: actionTypes.WIDGETS_TIMER_PAUSE,
          data: {
            timerType,
            duration: remaining
          }
        }));
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_TIMER_USER_EVENT,
          data: {
            userAction: FocusTimer_USER_ACTION_TYPES.TIMER_PAUSE
          }
        }));
        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "widget",
          user_action: FocusTimer_USER_ACTION_TYPES.TIMER_PAUSE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_USER_EVENT,
          data: telemetryData
        }));
      });
    }

    // highlight entire text when focused on the time.
    // this makes it easier to input the new time instead of backspacing
    const el = e.target;
    if (document.createRange && window.getSelection) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };
  function handleLearnMore() {
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.OPEN_LINK,
      data: {
        url: "https://support.mozilla.org/kb/firefox-new-tab-widgets"
      }
    }));
    handleTimerInteraction();
  }
  function handlePrefUpdate(prefName, prefValue) {
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.SET_PREF,
      data: {
        name: prefName,
        value: prefValue
      }
    }));
    handleTimerInteraction();
  }
  return timerData ? /*#__PURE__*/external_React_default().createElement("article", {
    className: `focus-timer ${isMaximized ? "is-maximized" : ""}`,
    ref: el => {
      timerRef.current = [el];
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "newtab-widget-timer-notification-title-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("h3", {
    "data-l10n-id": "newtab-widget-timer-notification-title"
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: "focus-timer-context-menu-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    className: "focus-timer-context-menu-button",
    iconSrc: "chrome://global/skin/icons/more.svg",
    menuId: "focus-timer-context-menu",
    type: "ghost"
  }), /*#__PURE__*/external_React_default().createElement("panel-list", {
    id: "focus-timer-context-menu"
  }, /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": showSystemNotifications ? "newtab-widget-timer-menu-notifications" : "newtab-widget-timer-menu-notifications-on",
    onClick: () => {
      handlePrefUpdate("widgets.focusTimer.showSystemNotifications", !showSystemNotifications);
    }
  }), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-timer-menu-hide",
    onClick: () => {
      (0,external_ReactRedux_namespaceObject.batch)(() => {
        handlePrefUpdate("widgets.focusTimer.enabled", false);
        const telemetryData = {
          widget_name: "focus_timer",
          widget_source: "context_menu",
          enabled: false,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
        };
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_ENABLED,
          data: telemetryData
        }));
      });
    }
  }), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-widget-timer-menu-learn-more",
    onClick: handleLearnMore
  })))), /*#__PURE__*/external_React_default().createElement("div", {
    className: "focus-timer-tabs"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "focus-timer-tabs-buttons"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: timerType === "focus" ? "default" : "ghost",
    "data-l10n-id": "newtab-widget-timer-mode-focus",
    size: "small",
    onClick: () => toggleType("focus")
  }), /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: timerType === "break" ? "default" : "ghost",
    "data-l10n-id": "newtab-widget-timer-mode-break",
    size: "small",
    onClick: () => toggleType("break")
  }))), /*#__PURE__*/external_React_default().createElement("div", {
    role: "progress",
    className: `progress-circle-wrapper ${!showSystemNotifications && !timerData[timerType].isRunning ? "is-small" : ""}`
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: `progress-circle-background${timerType === "break" ? "-break" : ""}`
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: `progress-circle ${timerType === "focus" ? "focus-visible" : "focus-hidden"}`,
    ref: timerType === "focus" ? arcRef : null
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: `progress-circle ${timerType === "break" ? "break-visible" : "break-hidden"}`,
    ref: timerType === "break" ? arcRef : null
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: `progress-circle-complete${progress === 1 ? " visible" : ""}`
  }), /*#__PURE__*/external_React_default().createElement("div", {
    role: "timer",
    className: "progress-circle-label"
  }, /*#__PURE__*/external_React_default().createElement(EditableTimerFields, {
    minutesRef: activeMinutesRef,
    secondsRef: activeSecondsRef,
    onKeyDown: handleKeyDown,
    onBeforeInput: handleBeforeInput,
    onFocus: handleFocus,
    timeLeft: timeLeft,
    onBlur: () => setTimerDuration()
  }))), /*#__PURE__*/external_React_default().createElement("div", {
    className: "set-timer-controls-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: `focus-timer-controls timer-running`
  }, /*#__PURE__*/external_React_default().createElement("moz-button", FocusTimer_extends({}, !isRunning ? {
    type: "primary"
  } : {}, {
    iconsrc: `chrome://global/skin/media/${isRunning ? "pause" : "play"}-fill.svg`,
    "data-l10n-id": isRunning ? "newtab-widget-timer-label-pause" : "newtab-widget-timer-label-play",
    onClick: toggleTimer
  })), isRunning && /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon ghost",
    iconsrc: "chrome://newtab/content/data/content/assets/arrow-clockwise-16.svg",
    "data-l10n-id": "newtab-widget-timer-reset",
    onClick: resetTimer
  }))), !showSystemNotifications && !timerData[timerType].isRunning && /*#__PURE__*/external_React_default().createElement("p", {
    className: "timer-notification-status",
    "data-l10n-id": "newtab-widget-timer-notification-warning"
  })) : null;
};
function EditableTimerFields({
  minutesRef,
  secondsRef,
  tabIndex = 0,
  ...props
}) {
  return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("span", {
    contentEditable: "true",
    ref: minutesRef,
    className: "timer-set-minutes",
    onKeyDown: props.onKeyDown,
    onBeforeInput: props.onBeforeInput,
    onFocus: props.onFocus,
    onBlur: props.onBlur,
    tabIndex: tabIndex
  }, formatTime(props.timeLeft).split(":")[0]), ":", /*#__PURE__*/external_React_default().createElement("span", {
    contentEditable: "true",
    ref: secondsRef,
    className: "timer-set-seconds",
    onKeyDown: props.onKeyDown,
    onBeforeInput: props.onBeforeInput,
    onFocus: props.onFocus,
    onBlur: props.onBlur,
    tabIndex: tabIndex
  }, formatTime(props.timeLeft).split(":")[1]));
}
;// CONCATENATED MODULE: ./content-src/components/Weather/LocationSearch.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




function LocationSearch({
  outerClassName
}) {
  // should be the location object from suggestedLocations
  const [selectedLocation, setSelectedLocation] = (0,external_React_namespaceObject.useState)("");
  const suggestedLocations = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Weather.suggestedLocations);
  const locationSearchString = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Weather.locationSearchString);
  const [userInput, setUserInput] = (0,external_React_namespaceObject.useState)(locationSearchString || "");
  const inputRef = (0,external_React_namespaceObject.useRef)(null);
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  (0,external_React_namespaceObject.useEffect)(() => {
    if (selectedLocation) {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_LOCATION_DATA_UPDATE,
        data: {
          city: selectedLocation.localized_name,
          adminName: selectedLocation.administrative_area,
          country: selectedLocation.country
        }
      }));
      dispatch(actionCreators.SetPref("weather.query", selectedLocation.key));
      dispatch(actionCreators.BroadcastToContent({
        type: actionTypes.WEATHER_SEARCH_ACTIVE,
        data: false
      }));
    }
  }, [selectedLocation, dispatch]);

  // when component mounts, set focus to input
  (0,external_React_namespaceObject.useEffect)(() => {
    inputRef?.current?.focus();
  }, [inputRef]);
  function handleChange(event) {
    const {
      value
    } = event.target;
    setUserInput(value);

    // if the user input contains less than three characters and suggestedLocations is not an empty array,
    // reset suggestedLocations to [] so there aren't incorrect items in the datalist
    if (value.length < 3 && suggestedLocations.length) {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_LOCATION_SUGGESTIONS_UPDATE,
        data: []
      }));
    }
    // find match in suggestedLocation array
    const match = suggestedLocations?.find(({
      key
    }) => key === value);
    if (match) {
      setSelectedLocation(match);
      setUserInput(`${match.localized_name}, ${match.administrative_area.localized_name}`);
    } else if (value.length >= 3 && !match) {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_LOCATION_SEARCH_UPDATE,
        data: value
      }));
    }
  }
  function handleCloseSearch() {
    dispatch(actionCreators.BroadcastToContent({
      type: actionTypes.WEATHER_SEARCH_ACTIVE,
      data: false
    }));
    setUserInput("");
  }
  function handleKeyDown(e) {
    if (e.key === "Escape") {
      handleCloseSearch();
    }
  }
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `${outerClassName} location-search`
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "location-input-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "search-icon"
  }), /*#__PURE__*/external_React_default().createElement("input", {
    ref: inputRef,
    list: "merino-location-list",
    type: "text",
    "data-l10n-id": "newtab-weather-change-location-search-input-placeholder",
    onChange: handleChange,
    value: userInput,
    onKeyDown: handleKeyDown
  }), /*#__PURE__*/external_React_default().createElement("moz-button", {
    class: "close-icon",
    type: "icon ghost",
    size: "small",
    iconSrc: "chrome://global/skin/icons/close.svg",
    onClick: handleCloseSearch
  }), /*#__PURE__*/external_React_default().createElement("datalist", {
    id: "merino-location-list"
  }, (suggestedLocations || []).map(merinoLocation => /*#__PURE__*/external_React_default().createElement("option", {
    value: merinoLocation.key,
    key: merinoLocation.key
  }, merinoLocation.localized_name, ",", " ", merinoLocation.administrative_area.localized_name)))));
}

;// CONCATENATED MODULE: ./content-src/components/Widgets/WeatherForecast/WeatherForecast.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */






const WeatherForecast_USER_ACTION_TYPES = {
  CHANGE_LOCATION: "change_location",
  DETECT_LOCATION: "detect_location",
  CHANGE_TEMP_UNIT: "change_temperature_units",
  CHANGE_DISPLAY: "change_weather_display",
  LEARN_MORE: "learn_more",
  PROVIDER_LINK_CLICK: "provider_link_click"
};
function WeatherForecast({
  dispatch,
  isMaximized,
  widgetsMayBeMaximized
}) {
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const weatherData = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Weather);
  const impressionFired = (0,external_React_namespaceObject.useRef)(false);
  const isSmallSize = !isMaximized && widgetsMayBeMaximized;
  const widgetSize = isSmallSize ? "small" : "medium";
  const handleIntersection = (0,external_React_namespaceObject.useCallback)(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;
    const telemetryData = {
      widget_name: "weather",
      widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
    };
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.WIDGETS_IMPRESSION,
      data: telemetryData
    }));
  }, [dispatch, widgetSize, widgetsMayBeMaximized]);
  const forecastRef = useIntersectionObserver(handleIntersection);
  const WEATHER_SUGGESTION = weatherData.suggestions?.[0];
  const nimbusWeatherDisplay = prefs.trainhopConfig?.weather?.display;
  const showDetailedView = nimbusWeatherDisplay === "detailed" || prefs["weather.display"] === "detailed";

  // Check if weather is enabled (browser.newtabpage.activity-stream.showWeather)
  const {
    showWeather
  } = prefs;
  const systemShowWeather = prefs["system.showWeather"];
  const weatherExperimentEnabled = prefs.trainhopConfig?.weather?.enabled;
  const isWeatherEnabled = showWeather && (systemShowWeather || weatherExperimentEnabled);

  // Check if the WeatherForecast widget is enabled
  const nimbusWeatherForecastTrainhopEnabled = prefs.trainhopConfig?.widgets?.weatherForecastEnabled;
  const weatherForecastWidgetEnabled = nimbusWeatherForecastTrainhopEnabled || prefs["widgets.system.weatherForecast.enabled"];

  // This weather forecast widget will only show when the following are true:
  // - The weather view is set to "detailed" (can be checked with the weather.display pref)
  // - Weather is displayed on New Tab (system.showWeather)
  // - The weather forecast widget is enabled (system.weatherForecast.enabled)
  // Note that if the view is set to "detailed" but the weather forecast widget is not enabled,
  // then the mini weather widget will display with the "detailed" view
  if (!showDetailedView || !weatherData?.initialized || !weatherForecastWidgetEnabled || !isWeatherEnabled) {
    return null;
  }
  const weatherOptIn = prefs["system.showWeatherOptIn"];
  const nimbusWeatherOptInEnabled = prefs.trainhopConfig?.weather?.weatherOptInEnabled;
  const isOptInEnabled = weatherOptIn || nimbusWeatherOptInEnabled;
  const {
    searchActive
  } = weatherData;
  function handleChangeLocation() {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.BroadcastToContent({
        type: actionTypes.WEATHER_SEARCH_ACTIVE,
        data: true
      }));
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: WeatherForecast_USER_ACTION_TYPES.CHANGE_LOCATION,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
  }
  function handleDetectLocation() {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_USER_OPT_IN_LOCATION
      }));
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: WeatherForecast_USER_ACTION_TYPES.DETECT_LOCATION,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
  }
  function handleChangeTempUnit(unit) {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "weather.temperatureUnits",
          value: unit
        }
      }));
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: WeatherForecast_USER_ACTION_TYPES.CHANGE_TEMP_UNIT,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
        action_value: unit
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
  }
  function handleChangeDisplay(display) {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "weather.display",
          value: display
        }
      }));
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: WeatherForecast_USER_ACTION_TYPES.CHANGE_DISPLAY,
        action_value: "switch_to_mini_widget",
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
  }
  function handleHideWeather() {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "showWeather",
          value: false
        }
      }));
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        enabled: false,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_ENABLED,
        data: telemetryData
      }));
    });
  }
  function handleLearnMore() {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.OPEN_LINK,
        data: {
          url: "https://support.mozilla.org/kb/firefox-new-tab-widgets"
        }
      }));
      const telemetryData = {
        widget_name: "weather",
        widget_source: "context_menu",
        user_action: WeatherForecast_USER_ACTION_TYPES.LEARN_MORE,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: telemetryData
      }));
    });
  }
  function handleProviderLinkClick() {
    const telemetryData = {
      widget_name: "weather",
      widget_source: "widget",
      user_action: WeatherForecast_USER_ACTION_TYPES.PROVIDER_LINK_CLICK,
      widget_size: widgetsMayBeMaximized ? widgetSize : "medium"
    };
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.WIDGETS_USER_EVENT,
      data: telemetryData
    }));
  }
  return /*#__PURE__*/external_React_default().createElement("article", {
    className: `weather-forecast-widget${isSmallSize ? " small-widget" : ""}`,
    ref: el => {
      forecastRef.current = [el];
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "city-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "city-name"
  }, searchActive ? /*#__PURE__*/external_React_default().createElement(LocationSearch, {
    outerClassName: ""
  }) : /*#__PURE__*/external_React_default().createElement("h3", null, weatherData.locationData.city)), /*#__PURE__*/external_React_default().createElement("div", {
    className: "weather-forecast-context-menu-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    className: "weather-forecast-context-menu-button",
    iconSrc: "chrome://global/skin/icons/more.svg",
    menuId: "weather-forecast-context-menu",
    type: "ghost",
    size: `${isSmallSize ? "small" : "default"}`
  }), /*#__PURE__*/external_React_default().createElement("panel-list", {
    id: "weather-forecast-context-menu"
  }, prefs["weather.locationSearchEnabled"] && /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-change-location",
    onClick: handleChangeLocation
  }), isOptInEnabled && /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-detect-my-location",
    onClick: handleDetectLocation
  }), prefs["weather.temperatureUnits"] === "f" ? /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-change-temperature-units-celsius",
    onClick: () => handleChangeTempUnit("c")
  }) : /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-change-temperature-units-fahrenheit",
    onClick: () => handleChangeTempUnit("f")
  }), !showDetailedView ? /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-change-weather-display-detailed",
    onClick: () => handleChangeDisplay("detailed")
  }) : /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-change-weather-display-simple",
    onClick: () => handleChangeDisplay("simple")
  }), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-hide-weather-v2",
    onClick: handleHideWeather
  }), /*#__PURE__*/external_React_default().createElement("panel-item", {
    "data-l10n-id": "newtab-weather-menu-learn-more",
    onClick: handleLearnMore
  })))), !isSmallSize && /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("div", {
    className: "current-weather-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "weather-icon-column"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: `weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "weather-info-column"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "temperature-unit"
  }, WEATHER_SUGGESTION.current_conditions.temperature[prefs["weather.temperatureUnits"]], "\xB0", prefs["weather.temperatureUnits"]), /*#__PURE__*/external_React_default().createElement("span", {
    className: "temperature-description"
  }, WEATHER_SUGGESTION.current_conditions.summary)), /*#__PURE__*/external_React_default().createElement("div", {
    className: "high-low-column"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "high-temperature"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "arrow-icon arrow-up"
  }), WEATHER_SUGGESTION.forecast.high[prefs["weather.temperatureUnits"]], "\xB0"), /*#__PURE__*/external_React_default().createElement("span", {
    className: "low-temperature"
  }, /*#__PURE__*/external_React_default().createElement("span", {
    className: "arrow-icon arrow-down"
  }), WEATHER_SUGGESTION.forecast.low[prefs["weather.temperatureUnits"]], "\xB0"))), /*#__PURE__*/external_React_default().createElement("hr", null)), /*#__PURE__*/external_React_default().createElement("div", {
    className: "forecast-row"
  }, !isSmallSize && /*#__PURE__*/external_React_default().createElement("p", {
    className: "today-forecast",
    "data-l10n-id": "newtab-weather-todays-forecast"
  }), /*#__PURE__*/external_React_default().createElement("ul", {
    className: "forecast-row-items"
  }, /*#__PURE__*/external_React_default().createElement("li", null, /*#__PURE__*/external_React_default().createElement("span", null, "80\xB0"), /*#__PURE__*/external_React_default().createElement("span", {
    className: `weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
  }), /*#__PURE__*/external_React_default().createElement("span", null, "7:00")), /*#__PURE__*/external_React_default().createElement("li", null, /*#__PURE__*/external_React_default().createElement("span", null, "80\xB0"), /*#__PURE__*/external_React_default().createElement("span", {
    className: `weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
  }), /*#__PURE__*/external_React_default().createElement("span", null, "7:00")), /*#__PURE__*/external_React_default().createElement("li", null, /*#__PURE__*/external_React_default().createElement("span", null, "80\xB0"), /*#__PURE__*/external_React_default().createElement("span", {
    className: `weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
  }), /*#__PURE__*/external_React_default().createElement("span", null, "7:00")), /*#__PURE__*/external_React_default().createElement("li", null, /*#__PURE__*/external_React_default().createElement("span", null, "80\xB0"), /*#__PURE__*/external_React_default().createElement("span", {
    className: `weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
  }), /*#__PURE__*/external_React_default().createElement("span", null, "7:00")), /*#__PURE__*/external_React_default().createElement("li", null, /*#__PURE__*/external_React_default().createElement("span", null, "80\xB0"), /*#__PURE__*/external_React_default().createElement("span", {
    className: `weather-icon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
  }), /*#__PURE__*/external_React_default().createElement("span", null, "7:00")))), /*#__PURE__*/external_React_default().createElement("div", {
    className: "forecast-footer"
  }, /*#__PURE__*/external_React_default().createElement("a", {
    href: WEATHER_SUGGESTION.forecast.url,
    className: "full-forecast",
    "data-l10n-id": "newtab-weather-see-full-forecast",
    onClick: handleProviderLinkClick
  }), /*#__PURE__*/external_React_default().createElement("span", {
    className: "sponsored-text",
    "data-l10n-id": "newtab-weather-sponsored",
    "data-l10n-args": "{\"provider\": \"AccuWeather\xAE\"}"
  })));
}

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/FeatureHighlight/WidgetsFeatureHighlight.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



function WidgetsFeatureHighlight({
  handleDismiss,
  handleBlock,
  dispatch
}) {
  // Extract the strings and feature ID from OMC
  const {
    messageData
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Messages);
  return /*#__PURE__*/React.createElement(FeatureHighlight, {
    position: "inset-inline-end inset-block-end",
    arrowPosition: "arrow-top-start",
    openedOverride: true,
    showButtonIcon: false,
    feature: messageData?.content?.feature,
    modalClassName: `widget-highlight-wrapper${messageData.content?.hideImage ? " no-image" : ""}`,
    message: /*#__PURE__*/React.createElement("div", {
      className: "widget-highlight"
    }, !messageData.content?.hideImage && /*#__PURE__*/React.createElement("img", {
      src: messageData.content?.imageURL || "chrome://newtab/content/data/content/assets/widget-message.png",
      alt: ""
    }), messageData.content?.cardTitle ? /*#__PURE__*/React.createElement("h3", {
      className: "title"
    }, messageData.content.cardTitle) : /*#__PURE__*/React.createElement("h3", {
      className: "title",
      "data-l10n-id": messageData.content.title || "newtab-widget-message-title"
    }), messageData.content?.cardMessage ? /*#__PURE__*/React.createElement("p", {
      className: "subtitle"
    }, messageData.content.cardMessage) : /*#__PURE__*/React.createElement("p", {
      className: "subtitle",
      "data-l10n-id": messageData.content.subtitle || "newtab-widget-message-copy"
    })),
    dispatch: dispatch,
    dismissCallback: () => {
      handleDismiss();
      handleBlock();
    },
    outsideClickCallback: handleDismiss
  });
}

;// CONCATENATED MODULE: ./content-src/components/Widgets/Widgets.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */









const CONTAINER_ACTION_TYPES = {
  HIDE_ALL: "hide_all",
  CHANGE_SIZE_ALL: "change_size_all"
};
const PREF_WIDGETS_LISTS_ENABLED = "widgets.lists.enabled";
const PREF_WIDGETS_SYSTEM_LISTS_ENABLED = "widgets.system.lists.enabled";
const PREF_WIDGETS_TIMER_ENABLED = "widgets.focusTimer.enabled";
const PREF_WIDGETS_SYSTEM_TIMER_ENABLED = "widgets.system.focusTimer.enabled";
const PREF_WIDGETS_SYSTEM_WEATHER_FORECAST_ENABLED = "widgets.system.weatherForecast.enabled";
const PREF_WIDGETS_MAXIMIZED = "widgets.maximized";
const PREF_WIDGETS_SYSTEM_MAXIMIZED = "widgets.system.maximized";

// resets timer to default values (exported for testing)
// In practice, this logic runs inside a useEffect when
// the timer widget is disabled (after the pref flips from true to false).
// Because Enzyme tests cannot reliably simulate that pref update or trigger
// the related useEffect, we expose this helper to at least just test the reset behavior instead

function resetTimerToDefaults(dispatch, timerType) {
  const originalTime = timerType === "focus" ? 1500 : 300;

  // Reset both focus and break timers to their initial durations
  dispatch(actionCreators.AlsoToMain({
    type: actionTypes.WIDGETS_TIMER_RESET,
    data: {
      timerType,
      duration: originalTime,
      initialDuration: originalTime
    }
  }));

  // Set the timer type back to "focus"
  dispatch(actionCreators.AlsoToMain({
    type: actionTypes.WIDGETS_TIMER_SET_TYPE,
    data: {
      timerType: "focus"
    }
  }));
}
function Widgets() {
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const weatherData = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Weather);
  const {
    messageData
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Messages);
  const timerType = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.TimerWidget.timerType);
  const timerData = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.TimerWidget);
  const isMaximized = prefs[PREF_WIDGETS_MAXIMIZED];
  const widgetsMayBeMaximized = prefs[PREF_WIDGETS_SYSTEM_MAXIMIZED];
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  const nimbusListsEnabled = prefs.widgetsConfig?.listsEnabled;
  const nimbusTimerEnabled = prefs.widgetsConfig?.timerEnabled;
  const nimbusListsTrainhopEnabled = prefs.trainhopConfig?.widgets?.listsEnabled;
  const nimbusTimerTrainhopEnabled = prefs.trainhopConfig?.widgets?.timerEnabled;
  const nimbusWeatherForecastTrainhopEnabled = prefs.trainhopConfig?.widgets?.weatherForecastEnabled;
  const nimbusMaximizedTrainhopEnabled = prefs.trainhopConfig?.widgets?.maximized;
  const listsEnabled = (nimbusListsTrainhopEnabled || nimbusListsEnabled || prefs[PREF_WIDGETS_SYSTEM_LISTS_ENABLED]) && prefs[PREF_WIDGETS_LISTS_ENABLED];
  const timerEnabled = (nimbusTimerTrainhopEnabled || nimbusTimerEnabled || prefs[PREF_WIDGETS_SYSTEM_TIMER_ENABLED]) && prefs[PREF_WIDGETS_TIMER_ENABLED];

  // This weather forecast widget will only show when the following are true:
  // - The weather view is set to "detailed" (can be checked with the weather.display pref)
  // - Weather is displayed on New Tab (system.showWeather)
  // - The weather forecast widget is enabled (system.weatherForecast.enabled)
  // Note that if the view is set to "detailed" but the weather forecast widget is not enabled,
  // then the mini weather widget will display with the "detailed" view
  const weatherForecastSystemEnabled = nimbusWeatherForecastTrainhopEnabled || prefs[PREF_WIDGETS_SYSTEM_WEATHER_FORECAST_ENABLED];
  const nimbusWeatherDisplay = prefs.trainhopConfig?.weather?.display;
  const showDetailedView = nimbusWeatherDisplay === "detailed" || prefs["weather.display"] === "detailed";

  // Check if weather is enabled (browser.newtabpage.activity-stream.showWeather)
  const {
    showWeather
  } = prefs;
  const systemShowWeather = prefs["system.showWeather"];
  const weatherExperimentEnabled = prefs.trainhopConfig?.weather?.enabled;
  const isWeatherEnabled = showWeather && (systemShowWeather || weatherExperimentEnabled);
  const weatherForecastEnabled = weatherForecastSystemEnabled && showDetailedView && weatherData?.initialized && isWeatherEnabled;

  // Widget size is "small" only when maximize feature is enabled and widgets
  // are currently minimized. Otherwise defaults to "medium".
  const widgetSize = widgetsMayBeMaximized && !isMaximized ? "small" : "medium";

  // track previous timerEnabled state to detect when it becomes disabled
  const prevTimerEnabledRef = (0,external_React_namespaceObject.useRef)(timerEnabled);

  // Reset timer when it becomes disabled
  (0,external_React_namespaceObject.useEffect)(() => {
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
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.SetPref(PREF_WIDGETS_LISTS_ENABLED, false));
      dispatch(actionCreators.SetPref(PREF_WIDGETS_TIMER_ENABLED, false));
      // If weather forecast widget is visible, turn off the weather
      if (weatherForecastEnabled) {
        dispatch(actionCreators.SetPref("showWeather", false));
      }
      const telemetryData = {
        action_type: CONTAINER_ACTION_TYPES.HIDE_ALL,
        widget_size: widgetSize
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_CONTAINER_ACTION,
        data: telemetryData
      }));

      // Dispatch WIDGETS_ENABLED for each widget being hidden
      if (listsEnabled) {
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_ENABLED,
          data: {
            widget_name: "lists",
            widget_source: "widget",
            enabled: false,
            widget_size: widgetSize
          }
        }));
      }
      if (timerEnabled) {
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_ENABLED,
          data: {
            widget_name: "focus_timer",
            widget_source: "widget",
            enabled: false,
            widget_size: widgetSize
          }
        }));
      }

      // Send telemetry for weather widget if it was visible when hiding all widgets
      if (weatherForecastEnabled) {
        dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_ENABLED,
          data: {
            widget_name: "weather",
            widget_source: "widget",
            enabled: false,
            widget_size: widgetSize
          }
        }));
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
    const newWidgetSize = widgetsMayBeMaximized && !newMaximizedState ? "small" : "medium";
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      dispatch(actionCreators.SetPref(PREF_WIDGETS_MAXIMIZED, newMaximizedState));
      const telemetryData = {
        action_type: CONTAINER_ACTION_TYPES.CHANGE_SIZE_ALL,
        action_value: newMaximizedState ? "maximize_widgets" : "minimize_widgets",
        widget_size: newWidgetSize
      };
      dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_CONTAINER_ACTION,
        data: telemetryData
      }));
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
      dispatch(actionCreators.SetPref(prefName, true));
    }
  }
  if (!(listsEnabled || timerEnabled || weatherForecastEnabled)) {
    return null;
  }
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "widgets-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "widgets-section-container"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "widgets-title-container"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "widgets-title-container-text"
  }, /*#__PURE__*/external_React_default().createElement("h1", {
    "data-l10n-id": "newtab-widget-section-title"
  }), messageData?.content?.messageType === "WidgetMessage" && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
    dispatch: dispatch
  }, /*#__PURE__*/external_React_default().createElement(WidgetsFeatureHighlight, {
    dispatch: dispatch
  }))), (nimbusMaximizedTrainhopEnabled || prefs[PREF_WIDGETS_SYSTEM_MAXIMIZED]) && /*#__PURE__*/external_React_default().createElement("moz-button", {
    id: "toggle-widgets-size-button",
    type: "icon ghost",
    size: "small"
    // Toggle the icon and hover text
    ,
    "data-l10n-id": isMaximized ? "newtab-widget-section-minimize" : "newtab-widget-section-maximize",
    iconsrc: `chrome://browser/skin/${isMaximized ? "fullscreen-exit" : "fullscreen"}.svg`,
    onClick: handleToggleMaximizeClick,
    onKeyDown: handleToggleMaximizeKeyDown
  }), /*#__PURE__*/external_React_default().createElement("moz-button", {
    id: "hide-all-widgets-button",
    type: "icon ghost",
    size: "small",
    "data-l10n-id": "newtab-widget-section-hide-all-button",
    iconsrc: "chrome://global/skin/icons/close.svg",
    onClick: handleHideAllWidgetsClick,
    onKeyDown: handleHideAllWidgetsKeyDown
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: `widgets-container${isMaximized ? " is-maximized" : ""}`
  }, listsEnabled && /*#__PURE__*/external_React_default().createElement(Lists, {
    dispatch: dispatch,
    handleUserInteraction: handleUserInteraction,
    isMaximized: isMaximized,
    widgetsMayBeMaximized: widgetsMayBeMaximized
  }), timerEnabled && /*#__PURE__*/external_React_default().createElement(FocusTimer, {
    dispatch: dispatch,
    handleUserInteraction: handleUserInteraction,
    isMaximized: isMaximized,
    widgetsMayBeMaximized: widgetsMayBeMaximized
  }), weatherForecastEnabled && /*#__PURE__*/external_React_default().createElement(WeatherForecast, {
    dispatch: dispatch,
    handleUserInteraction: handleUserInteraction,
    isMaximized: isMaximized,
    widgetsMayBeMaximized: widgetsMayBeMaximized
  }))));
}

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamBase/DiscoveryStreamBase.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */















const ALLOWED_CSS_URL_PREFIXES = ["chrome://", "resource://", "https://img-getpocket.cdn.mozilla.net/"];
const DUMMY_CSS_SELECTOR = "DUMMY#CSS.SELECTOR";

/**
 * Validate a CSS declaration. The values are assumed to be normalized by CSSOM.
 */
function isAllowedCSS(property, value) {
  // Bug 1454823: INTERNAL properties, e.g., -moz-context-properties, are
  // exposed but their values aren't resulting in getting nothing. Fortunately,
  // we don't care about validating the values of the current set of properties.
  if (value === undefined) {
    return true;
  }

  // Make sure all urls are of the allowed protocols/prefixes
  const urls = value.match(/url\("[^"]+"\)/g);
  return !urls || urls.every(url => ALLOWED_CSS_URL_PREFIXES.some(prefix => url.slice(5).startsWith(prefix)));
}
class _DiscoveryStreamBase extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onStyleMount = this.onStyleMount.bind(this);
  }
  onStyleMount(style) {
    // Unmounting style gets rid of old styles, so nothing else to do
    if (!style) {
      return;
    }
    const {
      sheet
    } = style;
    const styles = JSON.parse(style.dataset.styles);
    styles.forEach((row, rowIndex) => {
      row.forEach((component, componentIndex) => {
        // Nothing to do without optional styles overrides
        if (!component) {
          return;
        }
        Object.entries(component).forEach(([selectors, declarations]) => {
          // Start with a dummy rule to validate declarations and selectors
          sheet.insertRule(`${DUMMY_CSS_SELECTOR} {}`);
          const [rule] = sheet.cssRules;

          // Validate declarations and remove any offenders. CSSOM silently
          // discards invalid entries, so here we apply extra restrictions.
          rule.style = declarations;
          [...rule.style].forEach(property => {
            const value = rule.style[property];
            if (!isAllowedCSS(property, value)) {
              console.error(`Bad CSS declaration ${property}: ${value}`);
              rule.style.removeProperty(property);
            }
          });

          // Set the actual desired selectors scoped to the component
          const prefix = `.ds-layout > .ds-column:nth-child(${rowIndex + 1}) .ds-column-grid > :nth-child(${componentIndex + 1})`;
          // NB: Splitting on "," doesn't work with strings with commas, but
          // we're okay with not supporting those selectors
          rule.selectorText = selectors.split(",").map(selector => prefix + (
          // Assume :pseudo-classes are for component instead of descendant
          selector[0] === ":" ? "" : " ") + selector).join(",");

          // CSSOM silently ignores bad selectors, so we'll be noisy instead
          if (rule.selectorText === DUMMY_CSS_SELECTOR) {
            console.error(`Bad CSS selector ${selectors}`);
          }
        });
      });
    });
  }
  renderComponent(component) {
    switch (component.type) {
      case "Highlights":
        return /*#__PURE__*/external_React_default().createElement(Highlights, null);
      case "TopSites":
        return /*#__PURE__*/external_React_default().createElement("div", {
          className: "ds-top-sites"
        }, /*#__PURE__*/external_React_default().createElement(TopSites_TopSites, {
          isFixed: true,
          title: component.header?.title
        }));
      case "SectionTitle":
        return /*#__PURE__*/external_React_default().createElement(SectionTitle, {
          header: component.header
        });
      case "Navigation":
        return /*#__PURE__*/external_React_default().createElement(Navigation, {
          dispatch: this.props.dispatch,
          links: component.properties.links,
          extraLinks: component.properties.extraLinks,
          alignment: component.properties.alignment,
          explore_topics: component.properties.explore_topics,
          header: component.header,
          locale: this.props.App.locale,
          newFooterSection: component.newFooterSection,
          privacyNoticeURL: component.properties.privacyNoticeURL
        });
      case "CardGrid":
        {
          const sectionsEnabled = this.props.Prefs.values["discoverystream.sections.enabled"];
          if (sectionsEnabled) {
            return /*#__PURE__*/external_React_default().createElement(CardSections, {
              feed: component.feed,
              data: component.data,
              dispatch: this.props.dispatch,
              type: component.type,
              firstVisibleTimestamp: this.props.firstVisibleTimestamp,
              ctaButtonSponsors: component.properties.ctaButtonSponsors,
              ctaButtonVariant: component.properties.ctaButtonVariant,
              placeholder: this.props.placeholder
            });
          }
          return /*#__PURE__*/external_React_default().createElement(CardGrid, {
            title: component.header && component.header.title,
            data: component.data,
            feed: component.feed,
            widgets: component.widgets,
            type: component.type,
            dispatch: this.props.dispatch,
            items: component.properties.items,
            hybridLayout: component.properties.hybridLayout,
            hideCardBackground: component.properties.hideCardBackground,
            fourCardLayout: component.properties.fourCardLayout,
            compactGrid: component.properties.compactGrid,
            ctaButtonSponsors: component.properties.ctaButtonSponsors,
            ctaButtonVariant: component.properties.ctaButtonVariant,
            hideDescriptions: this.props.DiscoveryStream.hideDescriptions,
            firstVisibleTimestamp: this.props.firstVisibleTimestamp,
            spocPositions: component.spocs?.positions,
            placeholder: this.props.placeholder
          });
        }
      case "HorizontalRule":
        return /*#__PURE__*/external_React_default().createElement(HorizontalRule, null);
      case "PrivacyLink":
        return /*#__PURE__*/external_React_default().createElement(PrivacyLink, {
          properties: component.properties
        });
      case "Widgets":
        return /*#__PURE__*/external_React_default().createElement(Widgets, null);
      default:
        return /*#__PURE__*/external_React_default().createElement("div", null, component.type);
    }
  }
  renderStyles(styles) {
    // Use json string as both the key and styles to render so React knows when
    // to unmount and mount a new instance for new styles.
    const json = JSON.stringify(styles);
    return /*#__PURE__*/external_React_default().createElement("style", {
      key: json,
      "data-styles": json,
      ref: this.onStyleMount
    });
  }
  render() {
    const {
      locale
    } = this.props;
    // Bug 1980459 - Note that selectLayoutRender acts as a selector that transforms layout data based on current
    // preferences and experiment flags. It runs after Redux state is populated but before render.
    // Components removed in selectLayoutRender (e.g., Widgets or TopSites) will not appear in the
    // layoutRender result, and therefore will not be rendered here regardless of logic below.

    // Select layout renders data by adding spocs and position to recommendations
    const {
      layoutRender
    } = selectLayoutRender({
      state: this.props.DiscoveryStream,
      prefs: this.props.Prefs.values,
      locale
    });
    const sectionsEnabled = this.props.Prefs.values["discoverystream.sections.enabled"];
    const topicSelectionEnabled = this.props.Prefs.values["discoverystream.topicSelection.enabled"];
    const reportAdsEnabled = this.props.Prefs.values["discoverystream.reportAds.enabled"];
    const spocsEnabled = this.props.Prefs.values["unifiedAds.spocs.enabled"];

    // Find the first component of a type and remove it from layout
    const extractComponent = type => {
      for (const [rowIndex, row] of Object.entries(layoutRender)) {
        for (const [index, component] of Object.entries(row.components)) {
          if (component.type === type) {
            // Remove the row if it was the only component or the single item
            if (row.components.length === 1) {
              layoutRender.splice(rowIndex, 1);
            } else {
              row.components.splice(index, 1);
            }
            return component;
          }
        }
      }
      return null;
    };

    // Get "topstories" Section state for default values
    const topStories = this.props.Sections.find(s => s.id === "topstories");
    if (!topStories) {
      return null;
    }

    // Extract TopSites to render before the rest and Message to use for header
    const topSites = extractComponent("TopSites");

    // There are two ways to enable widgets:
    // Via `widgets.system.*` prefs or Nimbus experiment
    const widgetsNimbusTrainhopEnabled = this.props.Prefs.values.trainhopConfig?.widgets?.enabled;
    const widgetsNimbusEnabled = this.props.Prefs.values.widgetsConfig?.enabled;
    const widgetsSystemPrefsEnabled = this.props.Prefs.values["widgets.system.enabled"];
    const widgets = widgetsNimbusTrainhopEnabled || widgetsNimbusEnabled || widgetsSystemPrefsEnabled;
    const message = extractComponent("Message") || {
      header: {
        link_text: topStories.learnMore.link.message,
        link_url: topStories.learnMore.link.href,
        title: topStories.title
      }
    };
    const privacyLinkComponent = extractComponent("PrivacyLink");
    let learnMore = {
      link: {
        href: message.header.link_url,
        message: message.header.link_text
      }
    };
    let sectionTitle = message.header.title;
    let subTitle = "";
    const {
      DiscoveryStream
    } = this.props;
    return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, (reportAdsEnabled && spocsEnabled || sectionsEnabled) && /*#__PURE__*/external_React_default().createElement(ReportContent, {
      spocs: DiscoveryStream.spocs
    }), topSites && this.renderLayout([{
      width: 12,
      components: [topSites],
      sectionType: "topsites"
    }]), widgets && this.renderLayout([{
      width: 12,
      components: [{
        type: "Widgets"
      }],
      sectionType: "widgets"
    }]), !!layoutRender.length && /*#__PURE__*/external_React_default().createElement(CollapsibleSection, {
      className: "ds-layout",
      collapsed: topStories.pref.collapsed,
      dispatch: this.props.dispatch,
      id: topStories.id,
      isFixed: true,
      learnMore: learnMore,
      privacyNoticeURL: topStories.privacyNoticeURL,
      showPrefName: topStories.pref.feed,
      title: sectionTitle,
      subTitle: subTitle,
      mayHaveTopicsSelection: topicSelectionEnabled,
      sectionsEnabled: sectionsEnabled,
      eventSource: "CARDGRID"
    }, this.renderLayout(layoutRender)), this.renderLayout([{
      width: 12,
      components: [{
        type: "Highlights"
      }]
    }]), privacyLinkComponent && this.renderLayout([{
      width: 12,
      components: [privacyLinkComponent]
    }]));
  }
  renderLayout(layoutRender) {
    const styles = [];
    let [data] = layoutRender;
    // Add helper class for topsites
    const sectionClass = data.sectionType ? `ds-layout-${data.sectionType}` : "";
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: `discovery-stream ds-layout ${sectionClass}`
    }, layoutRender.map((row, rowIndex) => /*#__PURE__*/external_React_default().createElement("div", {
      key: `row-${rowIndex}`,
      className: `ds-column ds-column-${row.width}`
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "ds-column-grid"
    }, row.components.map((component, componentIndex) => {
      if (!component) {
        return null;
      }
      styles[rowIndex] = [...(styles[rowIndex] || []), component.styles];
      return /*#__PURE__*/external_React_default().createElement("div", {
        key: `component-${componentIndex}`
      }, this.renderComponent(component, row.width));
    })))), this.renderStyles(styles));
  }
}
const DiscoveryStreamBase = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  DiscoveryStream: state.DiscoveryStream,
  Prefs: state.Prefs,
  Sections: state.Sections,
  document: globalThis.document,
  App: state.App
}))(_DiscoveryStreamBase);
;// CONCATENATED MODULE: ./content-src/components/CustomizeMenu/SectionsMgmtPanel/SectionsMgmtPanel.jsx
function SectionsMgmtPanel_extends() { return SectionsMgmtPanel_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, SectionsMgmtPanel_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




// eslint-disable-next-line no-shadow

function SectionsMgmtPanel({
  exitEventFired,
  pocketEnabled,
  onSubpanelToggle,
  togglePanel,
  showPanel
}) {
  const arrowButtonRef = (0,external_React_namespaceObject.useRef)(null);
  const {
    sectionPersonalization
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream);
  const layoutComponents = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream.layout[0].components);
  const sections = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.DiscoveryStream.feeds.data);
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();

  // TODO: Wrap sectionsFeedName -> sectionsList logic in try...catch?
  let sectionsFeedName;
  const cardGridEntry = layoutComponents.find(item => item.type === "CardGrid");
  if (cardGridEntry) {
    sectionsFeedName = cardGridEntry.feed.url;
  }
  let sectionsList;
  if (sectionsFeedName) {
    sectionsList = sections[sectionsFeedName].data.sections;
  }
  const [sectionsState, setSectionState] = (0,external_React_namespaceObject.useState)(sectionPersonalization); // State management with useState

  let followedSectionsData = sectionsList.filter(item => sectionsState[item.sectionKey]?.isFollowed);
  let blockedSectionsData = sectionsList.filter(item => sectionsState[item.sectionKey]?.isBlocked);
  function updateCachedData() {
    // Reset cached followed/blocked list data while panel is open
    setSectionState(sectionPersonalization);
    followedSectionsData = sectionsList.filter(item => sectionsState[item.sectionKey]?.isFollowed);
    blockedSectionsData = sectionsList.filter(item => sectionsState[item.sectionKey]?.isBlocked);
  }
  const onFollowClick = (0,external_React_namespaceObject.useCallback)((sectionKey, receivedRank) => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: {
        ...sectionPersonalization,
        [sectionKey]: {
          isFollowed: true,
          isBlocked: false,
          followedAt: new Date().toISOString()
        }
      }
    }));
    // Telemetry Event Dispatch
    dispatch(actionCreators.OnlyToMain({
      type: "FOLLOW_SECTION",
      data: {
        section: sectionKey,
        section_position: receivedRank,
        event_source: "CUSTOMIZE_PANEL"
      }
    }));
  }, [dispatch, sectionPersonalization]);
  const onBlockClick = (0,external_React_namespaceObject.useCallback)((sectionKey, receivedRank) => {
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: {
        ...sectionPersonalization,
        [sectionKey]: {
          isFollowed: false,
          isBlocked: true
        }
      }
    }));

    // Telemetry Event Dispatch
    dispatch(actionCreators.OnlyToMain({
      type: "BLOCK_SECTION",
      data: {
        section: sectionKey,
        section_position: receivedRank,
        event_source: "CUSTOMIZE_PANEL"
      }
    }));
  }, [dispatch, sectionPersonalization]);
  const onUnblockClick = (0,external_React_namespaceObject.useCallback)((sectionKey, receivedRank) => {
    const updatedSectionData = {
      ...sectionPersonalization
    };
    delete updatedSectionData[sectionKey];
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: updatedSectionData
    }));
    // Telemetry Event Dispatch
    dispatch(actionCreators.OnlyToMain({
      type: "UNBLOCK_SECTION",
      data: {
        section: sectionKey,
        section_position: receivedRank,
        event_source: "CUSTOMIZE_PANEL"
      }
    }));
  }, [dispatch, sectionPersonalization]);
  const onUnfollowClick = (0,external_React_namespaceObject.useCallback)((sectionKey, receivedRank) => {
    const updatedSectionData = {
      ...sectionPersonalization
    };
    delete updatedSectionData[sectionKey];
    dispatch(actionCreators.AlsoToMain({
      type: actionTypes.SECTION_PERSONALIZATION_SET,
      data: updatedSectionData
    }));
    // Telemetry Event Dispatch
    dispatch(actionCreators.OnlyToMain({
      type: "UNFOLLOW_SECTION",
      data: {
        section: sectionKey,
        section_position: receivedRank,
        event_source: "CUSTOMIZE_PANEL"
      }
    }));
  }, [dispatch, sectionPersonalization]);

  // Close followed/blocked topic subpanel when parent menu is closed
  (0,external_React_namespaceObject.useEffect)(() => {
    if (exitEventFired && showPanel) {
      togglePanel();
    }
  }, [exitEventFired, showPanel, togglePanel]);

  // Notify parent menu when subpanel opens/closes
  (0,external_React_namespaceObject.useEffect)(() => {
    if (onSubpanelToggle) {
      onSubpanelToggle(showPanel);
    }
  }, [showPanel, onSubpanelToggle]);
  (0,external_React_namespaceObject.useEffect)(() => {
    if (showPanel) {
      updateCachedData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPanel]);
  const handlePanelEntered = () => {
    arrowButtonRef.current?.focus();
  };
  const followedSectionsList = followedSectionsData.map(({
    sectionKey,
    title,
    receivedRank
  }) => {
    const following = sectionPersonalization[sectionKey]?.isFollowed;
    return /*#__PURE__*/external_React_default().createElement("li", {
      key: sectionKey
    }, /*#__PURE__*/external_React_default().createElement("label", {
      htmlFor: `follow-topic-${sectionKey}`
    }, title), /*#__PURE__*/external_React_default().createElement("div", {
      className: following ? "section-follow following" : "section-follow"
    }, /*#__PURE__*/external_React_default().createElement("moz-button", {
      onClick: () => following ? onUnfollowClick(sectionKey, receivedRank) : onFollowClick(sectionKey, receivedRank),
      type: "default",
      index: receivedRank,
      section: sectionKey,
      id: `follow-topic-${sectionKey}`
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-button-follow-text",
      "data-l10n-id": "newtab-section-follow-button"
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-button-following-text",
      "data-l10n-id": "newtab-section-following-button"
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-button-unfollow-text",
      "data-l10n-id": "newtab-section-unfollow-button"
    }))));
  });
  const blockedSectionsList = blockedSectionsData.map(({
    sectionKey,
    title,
    receivedRank
  }) => {
    const blocked = sectionPersonalization[sectionKey]?.isBlocked;
    return /*#__PURE__*/external_React_default().createElement("li", {
      key: sectionKey
    }, /*#__PURE__*/external_React_default().createElement("label", {
      htmlFor: `blocked-topic-${sectionKey}`
    }, title), /*#__PURE__*/external_React_default().createElement("div", {
      className: blocked ? "section-block blocked" : "section-block"
    }, /*#__PURE__*/external_React_default().createElement("moz-button", {
      onClick: () => blocked ? onUnblockClick(sectionKey, receivedRank) : onBlockClick(sectionKey, receivedRank),
      type: "default",
      index: receivedRank,
      section: sectionKey,
      id: `blocked-topic-${sectionKey}`
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-button-block-text",
      "data-l10n-id": "newtab-section-block-button"
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-button-blocked-text",
      "data-l10n-id": "newtab-section-blocked-button"
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "section-button-unblock-text",
      "data-l10n-id": "newtab-section-unblock-button"
    }))));
  });
  return /*#__PURE__*/external_React_default().createElement("div", null, /*#__PURE__*/external_React_default().createElement("moz-box-button", SectionsMgmtPanel_extends({
    onClick: togglePanel,
    "data-l10n-id": "newtab-section-manage-topics-button-v2"
  }, !pocketEnabled ? {
    disabled: true
  } : {})), /*#__PURE__*/external_React_default().createElement(external_ReactTransitionGroup_namespaceObject.CSSTransition, {
    in: showPanel,
    timeout: 300,
    classNames: "sections-mgmt-panel",
    unmountOnExit: true,
    onEntered: handlePanelEntered
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "sections-mgmt-panel"
  }, /*#__PURE__*/external_React_default().createElement("button", {
    ref: arrowButtonRef,
    className: "arrow-button",
    onClick: togglePanel
  }, /*#__PURE__*/external_React_default().createElement("h1", {
    "data-l10n-id": "newtab-section-mangage-topics-title"
  })), /*#__PURE__*/external_React_default().createElement("h3", {
    "data-l10n-id": "newtab-section-mangage-topics-followed-topics"
  }), followedSectionsData.length ? /*#__PURE__*/external_React_default().createElement("ul", {
    className: "topic-list"
  }, followedSectionsList) : /*#__PURE__*/external_React_default().createElement("span", {
    className: "topic-list-empty-state",
    "data-l10n-id": "newtab-section-mangage-topics-followed-topics-empty-state"
  }), /*#__PURE__*/external_React_default().createElement("h3", {
    "data-l10n-id": "newtab-section-mangage-topics-blocked-topics"
  }), blockedSectionsData.length ? /*#__PURE__*/external_React_default().createElement("ul", {
    className: "topic-list"
  }, blockedSectionsList) : /*#__PURE__*/external_React_default().createElement("span", {
    className: "topic-list-empty-state",
    "data-l10n-id": "newtab-section-mangage-topics-blocked-topics-empty-state"
  }))));
}

;// CONCATENATED MODULE: ./content-src/components/WallpaperCategories/WallpaperCategories.jsx
function WallpaperCategories_extends() { return WallpaperCategories_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, WallpaperCategories_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




// eslint-disable-next-line no-shadow

const PREF_WALLPAPER_UPLOADED_PREVIOUSLY = "newtabWallpapers.customWallpaper.uploadedPreviously";
const PREF_WALLPAPER_UPLOAD_MAX_FILE_SIZE = "newtabWallpapers.customWallpaper.fileSize";
const PREF_WALLPAPER_UPLOAD_MAX_FILE_SIZE_ENABLED = "newtabWallpapers.customWallpaper.fileSize.enabled";

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
class _WallpaperCategories extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.handleColorInput = this.handleColorInput.bind(this);
    this.debouncedHandleChange = debounce(this.handleChange.bind(this), 999);
    this.handleChange = this.handleChange.bind(this);
    this.handleReset = this.handleReset.bind(this);
    this.handleCategory = this.handleCategory.bind(this);
    this.focusCategory = this.focusCategory.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.handleBack = this.handleBack.bind(this);
    this.handleWallpaperListEntered = this.handleWallpaperListEntered.bind(this);
    this.getRGBColors = this.getRGBColors.bind(this);
    this.prefersHighContrastQuery = null;
    this.prefersDarkQuery = null;
    this.categoryRef = []; // store references for wallpaper category list
    this.wallpaperRef = []; // store reference for wallpaper selection list
    this.arrowButtonRef = /*#__PURE__*/external_React_default().createRef(); // Used to focus arrow button when category opens
    this.customColorPickerRef = /*#__PURE__*/external_React_default().createRef(); // Used to determine contrast icon color for custom color picker
    this.customColorInput = /*#__PURE__*/external_React_default().createRef(); // Used to determine contrast icon color for custom color picker
    this.state = {
      activeCategory: null,
      activeCategoryFluentID: null,
      inputType: "radio",
      activeId: null,
      customWallpaperErrorType: null,
      focusedCategoryIndex: 0
    };
  }
  componentDidMount() {
    this.prefersDarkQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
  }
  componentDidUpdate(prevProps) {
    // Walllpaper category subpanel should close when parent menu is closed
    if (this.props.exitEventFired && this.props.exitEventFired !== prevProps.exitEventFired) {
      this.handleBack();
    }
  }
  handleColorInput(event) {
    let {
      id
    } = event.target;
    // Set ID to include hex value of custom color
    id = `solid-color-picker-${event.target.value}`;
    const rgbColors = this.getRGBColors(event.target.value);

    // Set background color to custom color
    event.target.style.backgroundColor = `rgb(${rgbColors.toString()})`;
    if (this.customColorPickerRef.current) {
      const colorInputBackground = this.customColorPickerRef.current.children[0].style.backgroundColor;
      this.customColorPickerRef.current.style.backgroundColor = colorInputBackground;
    }

    // Set icon color based on the selected color
    const isColorDark = this.isWallpaperColorDark(rgbColors);
    if (this.customColorPickerRef.current) {
      if (isColorDark) {
        this.customColorPickerRef.current.classList.add("is-dark");
      } else {
        this.customColorPickerRef.current.classList.remove("is-dark");
      }

      // Remove any possible initial classes
      this.customColorPickerRef.current.classList.remove("custom-color-set", "custom-color-dark", "default-color-set");
    }

    // Setting this now so when we remove v1 we don't have to migrate v1 values.
    this.props.setPref("newtabWallpapers.wallpaper", id);
  }

  // Note: There's a separate event (debouncedHandleChange) that fires the handleChange
  // event but is delayed so that it doesn't fire multiple events when a user
  // is selecting a custom color background
  handleChange(event) {
    let {
      id
    } = event.target;

    // Set ID to include hex value of custom color
    if (id === "solid-color-picker") {
      id = `solid-color-picker-${event.target.value}`;
    }
    this.props.setPref("newtabWallpapers.wallpaper", id);
    const uploadedPreviously = this.props.Prefs.values[PREF_WALLPAPER_UPLOADED_PREVIOUSLY];
    this.handleUserEvent(actionTypes.WALLPAPER_CLICK, {
      selected_wallpaper: id,
      had_previous_wallpaper: !!this.props.activeWallpaper,
      had_uploaded_previously: !!uploadedPreviously
    });
  }
  focusCategory(focusIndex) {
    if (!this.categoryRef) {
      return;
    }
    const el = this.categoryRef[focusIndex];
    if (el) {
      el.focus();
    }
  }

  // function implementing arrow navigation for wallpaper category selection
  handleCategoryKeyDown(event, category) {
    const getIndex = this.categoryRef.findIndex(cat => cat.id === category);
    if (getIndex === -1) {
      return; // prevents errors if wallpaper index isn't found when navigating with arrow keys
    }
    const isRTL = document.dir === "rtl"; // returns true if page language is right-to-left
    let eventKey = event.key;
    if (eventKey === "ArrowRight" || eventKey === "ArrowLeft") {
      if (isRTL) {
        eventKey = eventKey === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
      }
    }
    let nextIndex = getIndex;
    if (eventKey === "ArrowRight") {
      nextIndex = getIndex + 1 < this.categoryRef.length ? getIndex + 1 : getIndex;
    } else if (eventKey === "ArrowLeft") {
      nextIndex = getIndex - 1 >= 0 ? getIndex - 1 : getIndex;
    }
    this.setState({
      focusedCategoryIndex: nextIndex
    }, () => this.focusCategory(nextIndex));
  }

  // function implementing arrow navigation for wallpaper selection
  handleWallpaperKeyDown(event, title) {
    if (event.key === "Tab") {
      if (event.shiftKey) {
        event.preventDefault();
        this.arrowButtonRef.current?.focus();
      } else {
        event.preventDefault(); // prevent tabbing within wallpaper selection. We should only be using the Tab key to tab between groups
      }
      return;
    }
    const isRTL = document.dir === "rtl"; // returns true if page language is right-to-left
    let eventKey = event.key;
    if (eventKey === "ArrowRight" || eventKey === "ArrowLeft") {
      if (isRTL) {
        eventKey = eventKey === "ArrowRight" ? "ArrowLeft" : "ArrowRight";
      }
    }
    const getIndex = this.wallpaperRef.findIndex(wallpaper => wallpaper.id === title);
    if (getIndex === -1) {
      return; // prevents errors if wallpaper index isn't found when navigating with arrow keys
    }

    // the set layout of columns per row for the wallpaper selection
    const columnCount = 3;
    let nextIndex = getIndex;
    if (eventKey === "ArrowRight") {
      nextIndex = getIndex + 1 < this.wallpaperRef.length ? getIndex + 1 : getIndex;
    } else if (eventKey === "ArrowLeft") {
      nextIndex = getIndex - 1 >= 0 ? getIndex - 1 : getIndex;
    } else if (eventKey === "ArrowDown") {
      nextIndex = getIndex + columnCount < this.wallpaperRef.length ? getIndex + columnCount : getIndex;
    } else if (eventKey === "ArrowUp") {
      nextIndex = getIndex - columnCount >= 0 ? getIndex - columnCount : getIndex;
    }
    this.wallpaperRef[nextIndex].tabIndex = 0;
    this.wallpaperRef[getIndex].tabIndex = -1;
    this.wallpaperRef[nextIndex].focus();
    this.wallpaperRef[nextIndex].click();
  }
  handleReset() {
    const uploadedPreviously = this.props.Prefs.values[PREF_WALLPAPER_UPLOADED_PREVIOUSLY];
    const selectedWallpaper = this.props.Prefs.values["newtabWallpapers.wallpaper"];

    // If a custom wallpaper is set, remove it
    if (selectedWallpaper === "custom") {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WALLPAPER_REMOVE_UPLOAD
      }));
    }

    // Reset active wallpaper
    this.props.setPref("newtabWallpapers.wallpaper", "");

    // Fire WALLPAPER_CLICK telemetry event
    this.handleUserEvent(actionTypes.WALLPAPER_CLICK, {
      selected_wallpaper: "none",
      had_previous_wallpaper: !!this.props.activeWallpaper,
      had_uploaded_previously: !!uploadedPreviously
    });
  }
  handleCategory = event => {
    this.setState({
      activeCategory: event.target.id
    });
    this.handleUserEvent(actionTypes.WALLPAPER_CATEGORY_CLICK, event.target.id);

    // Notify parent menu when subpanel opens
    if (this.props.onSubpanelToggle) {
      this.props.onSubpanelToggle(true);
    }
    let fluent_id;
    switch (event.target.id) {
      case "abstracts":
        fluent_id = "newtab-wallpaper-category-title-abstract";
        break;
      case "celestial":
        fluent_id = "newtab-wallpaper-category-title-celestial";
        break;
      case "photographs":
        fluent_id = "newtab-wallpaper-category-title-photographs";
        break;
      case "solid-colors":
        fluent_id = "newtab-wallpaper-category-title-colors";
        break;
      case "firefox":
        fluent_id = "newtab-wallpaper-category-title-firefox";
        break;
    }
    this.setState({
      activeCategoryFluentID: fluent_id
    });
  };

  // Custom wallpaper image upload
  async handleUpload() {
    const wallpaperUploadMaxFileSizeEnabled = this.props.Prefs.values[PREF_WALLPAPER_UPLOAD_MAX_FILE_SIZE_ENABLED];
    const wallpaperUploadMaxFileSize = this.props.Prefs.values[PREF_WALLPAPER_UPLOAD_MAX_FILE_SIZE];
    const uploadedPreviously = this.props.Prefs.values[PREF_WALLPAPER_UPLOADED_PREVIOUSLY];

    // Create a file input since category buttons are radio inputs
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*"; // only allow image files

    // Catch cancel events
    fileInput.oncancel = async () => {
      this.setState({
        customWallpaperErrorType: null
      });
    };

    // Reset error state when user begins file selection
    this.setState({
      customWallpaperErrorType: null
    });

    // Fire when user selects a file
    fileInput.onchange = async event => {
      const [file] = event.target.files;
      if (file) {
        // Validate file type: Only accept files with a valid image MIME type
        const isValidImage = file.type && file.type.startsWith("image/");
        if (!isValidImage) {
          console.error("Invalid file type");
          this.setState({
            customWallpaperErrorType: "fileType"
          });
          return;
        }

        // Limit image uploaded to a maximum file size if enabled
        // Note: The max file size pref (customWallpaper.fileSize) is converted to megabytes (MB)
        // Example: if pref value is 5, max file size is 5 MB
        const maxSize = wallpaperUploadMaxFileSize * 1024 * 1024;
        if (wallpaperUploadMaxFileSizeEnabled && file.size > maxSize) {
          console.error("File size exceeds limit");
          this.setState({
            customWallpaperErrorType: "fileSize"
          });
          return;
        }
        this.props.dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WALLPAPER_UPLOAD,
          data: {
            file
          }
        }));

        // Set active wallpaper ID to "custom"
        this.props.setPref("newtabWallpapers.wallpaper", "custom");

        // Update the uploadedPreviously pref to TRUE
        // Note: this pref used for telemetry. Do not reset to false.
        this.props.setPref(PREF_WALLPAPER_UPLOADED_PREVIOUSLY, true);
        this.handleUserEvent(actionTypes.WALLPAPER_CLICK, {
          selected_wallpaper: "custom",
          had_previous_wallpaper: !!this.props.activeWallpaper,
          had_uploaded_previously: !!uploadedPreviously
        });
      }
    };
    fileInput.click();
  }
  handleBack() {
    this.setState({
      activeCategory: null
    }, () => {
      // Notify parent menu when subpanel closes
      if (this.props.onSubpanelToggle) {
        this.props.onSubpanelToggle(false);
      }

      // Wait for the category grid to be back in the DOM
      requestAnimationFrame(() => {
        this.focusCategory(this.state.focusedCategoryIndex);
      });
    });
  }
  handleWallpaperListEntered() {
    this.arrowButtonRef.current?.focus();
  }

  // Record user interaction when changing wallpaper and reseting wallpaper to default
  handleUserEvent(type, data) {
    this.props.dispatch(actionCreators.OnlyToMain({
      type,
      data
    }));
  }
  setActiveId = id => {
    this.setState({
      activeId: id
    }); // Set the active ID
  };
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
  sortWallpapersByOrder(wallpapers) {
    return wallpapers.sort((a, b) => {
      const aOrder = a.order || 0;
      const bOrder = b.order || 0;
      if (aOrder === 0 && bOrder === 0) {
        return 0;
      }
      if (aOrder === 0) {
        return 1;
      }
      if (bOrder === 0) {
        return -1;
      }
      return aOrder - bOrder;
    });
  }
  render() {
    const prefs = this.props.Prefs.values;
    const {
      wallpaperList,
      categories
    } = this.props.Wallpapers;
    const {
      activeWallpaper
    } = this.props;
    const {
      activeCategory
    } = this.state;
    const {
      activeCategoryFluentID
    } = this.state;
    // Enable custom color select if pref'ed on
    let showColorPicker = prefs["newtabWallpapers.customColor.enabled"];
    let filteredWallpapers = wallpaperList.filter(wallpaper => wallpaper.category === activeCategory);
    const wallpaperUploadMaxFileSize = this.props.Prefs.values[PREF_WALLPAPER_UPLOAD_MAX_FILE_SIZE];
    function reduceColorsToFitCustomColorInput(arr) {
      // Reduce the amount of custom colors to make space for the custom color picker
      while (arr.length % 3 !== 2) {
        arr.pop();
      }
      return arr;
    }
    let wallpaperCustomSolidColorHex = null;
    const selectedWallpaper = prefs["newtabWallpapers.wallpaper"];

    // User has previous selected a custom color
    if (selectedWallpaper.includes("solid-color-picker")) {
      showColorPicker = true;
      const regex = /#([a-fA-F0-9]{6})/;
      [wallpaperCustomSolidColorHex] = selectedWallpaper.match(regex);
    }

    // Remove last item of solid colors to make space for custom color picker
    if (prefs["newtabWallpapers.customColor.enabled"] && activeCategory === "solid-colors") {
      filteredWallpapers = reduceColorsToFitCustomColorInput(filteredWallpapers);
    }

    // Bug 1953012 - If nothing selected, default to color of customize panel
    // --color-blue-70 : #054096
    // --color-blue-05 : #deeafc
    const starterColorHex = this.prefersDarkQuery?.matches ? "#054096" : "#deeafc";

    // Set initial state of the color picker (depending if the user has already set a custom color)
    let initStateClassname = wallpaperCustomSolidColorHex ? "custom-color-set" : "default-color-set";

    // If a custom color picker is set, make sure the icon has the correct contrast
    if (wallpaperCustomSolidColorHex) {
      const rgbColors = this.getRGBColors(wallpaperCustomSolidColorHex);
      const isColorDark = this.isWallpaperColorDark(rgbColors);
      if (isColorDark) {
        initStateClassname += " custom-color-dark";
      }
    }
    let colorPickerInput = showColorPicker && activeCategory === "solid-colors" ? /*#__PURE__*/external_React_default().createElement("div", {
      className: `theme-custom-color-picker ${initStateClassname}`,
      ref: this.customColorPickerRef
    }, /*#__PURE__*/external_React_default().createElement("input", {
      onInput: this.handleColorInput,
      onChange: this.debouncedHandleChange,
      onClick: () => this.setActiveId("solid-color-picker") //
      ,
      type: "color",
      name: `wallpaper-solid-color-picker`,
      id: "solid-color-picker"
      // aria-checked is not applicable for input[type="color"] elements
      ,
      "aria-current": this.state.activeId === "solid-color-picker",
      value: wallpaperCustomSolidColorHex || starterColorHex,
      className: `wallpaper-input
              ${this.state.activeId === "solid-color-picker" ? "active" : ""}`,
      ref: this.customColorInput
    }), /*#__PURE__*/external_React_default().createElement("label", {
      htmlFor: "solid-color-picker",
      "data-l10n-id": "newtab-wallpaper-custom-color"
    })) : "";
    return /*#__PURE__*/external_React_default().createElement("div", null, /*#__PURE__*/external_React_default().createElement("div", {
      className: "category-header"
    }, /*#__PURE__*/external_React_default().createElement("h2", {
      "data-l10n-id": "newtab-wallpaper-title"
    }), /*#__PURE__*/external_React_default().createElement("button", {
      className: "wallpapers-reset",
      onClick: this.handleReset,
      "data-l10n-id": "newtab-wallpaper-reset"
    })), /*#__PURE__*/external_React_default().createElement("div", {
      role: "grid",
      "aria-label": "Wallpaper category selection. Use arrow keys to navigate."
    }, /*#__PURE__*/external_React_default().createElement("fieldset", {
      className: "category-list"
    }, categories.map((category, index) => {
      const filteredList = wallpaperList.filter(wallpaper => wallpaper.category === category);
      const sortedList = this.sortWallpapersByOrder(filteredList);
      const activeWallpaperObj = activeWallpaper && sortedList.find(wp => wp.title === activeWallpaper);
      // Detect custom solid color
      const isCustomSolidColor = category === "solid-colors" && activeWallpaper.startsWith("solid-color-picker");
      const thumbnail = activeWallpaperObj || sortedList[0];
      let fluent_id;
      switch (category) {
        case "abstracts":
          fluent_id = "newtab-wallpaper-category-title-abstract";
          break;
        case "celestial":
          fluent_id = "newtab-wallpaper-category-title-celestial";
          break;
        case "custom-wallpaper":
          fluent_id = "newtab-wallpaper-upload-image";
          break;
        case "photographs":
          fluent_id = "newtab-wallpaper-category-title-photographs";
          break;
        case "solid-colors":
          fluent_id = "newtab-wallpaper-category-title-colors";
          break;
        case "firefox":
          fluent_id = "newtab-wallpaper-category-title-firefox";
          break;
      }
      let style = {};
      if (thumbnail?.wallpaperUrl) {
        style.backgroundImage = `url(${thumbnail?.thumbnail || thumbnail?.wallpaperUrl})`;
        style.backgroundPosition = thumbnail.background_position || "center";
      } else {
        style.backgroundColor = thumbnail?.solid_color || "";
      }
      // If custom solid color is active, override the thumbnail to the chosen hex
      if (isCustomSolidColor) {
        const hex = activeWallpaper.split("solid-color-picker-")[1] || "";
        style.backgroundColor = hex;
      }
      const isCategorySelected = activeWallpaperObj || isCustomSolidColor;
      return /*#__PURE__*/external_React_default().createElement("div", {
        key: category
      }, /*#__PURE__*/external_React_default().createElement("button", WallpaperCategories_extends({
        ref: el => {
          if (el) {
            this.categoryRef[index] = el;
          }
        },
        id: category,
        style: style,
        onKeyDown: e => this.handleCategoryKeyDown(e, category)
        // Add overrides for custom wallpaper upload UI
        ,
        onClick: event => {
          this.setState({
            focusedCategoryIndex: index
          });
          if (category !== "custom-wallpaper") {
            this.handleCategory(event);
          } else {
            this.handleUpload();
          }
        },
        className: `wallpaper-input
                      ${category === "custom-wallpaper" ? "theme-custom-wallpaper" : ""}
                      ${isCategorySelected ? "selected" : ""}`,
        tabIndex: this.state.focusedCategoryIndex === index ? 0 : -1
      }, category === "custom-wallpaper" ? {
        "aria-errormessage": "customWallpaperError"
      } : {})), /*#__PURE__*/external_React_default().createElement("label", {
        htmlFor: category,
        "data-l10n-id": fluent_id
      }, fluent_id));
    })), this.state.customWallpaperErrorType && /*#__PURE__*/external_React_default().createElement("div", {
      className: "custom-wallpaper-error",
      id: "customWallpaperError"
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "icon icon-info"
    }), (() => {
      switch (this.state.customWallpaperErrorType) {
        case "fileSize":
          return /*#__PURE__*/external_React_default().createElement("span", {
            "data-l10n-id": "newtab-wallpaper-error-max-file-size",
            "data-l10n-args": `{"file_size": ${wallpaperUploadMaxFileSize}}`
          });
        case "fileType":
          return /*#__PURE__*/external_React_default().createElement("span", {
            "data-l10n-id": "newtab-wallpaper-error-upload-file-type"
          });
        default:
          return null;
      }
    })())), /*#__PURE__*/external_React_default().createElement(external_ReactTransitionGroup_namespaceObject.CSSTransition, {
      in: !!activeCategory,
      timeout: 300,
      classNames: "wallpaper-list",
      unmountOnExit: true,
      onEntered: this.handleWallpaperListEntered
    }, /*#__PURE__*/external_React_default().createElement("section", {
      className: "category wallpaper-list ignore-color-mode"
    }, /*#__PURE__*/external_React_default().createElement("button", {
      ref: this.arrowButtonRef,
      className: "arrow-button",
      "data-l10n-id": activeCategoryFluentID,
      onClick: this.handleBack
    }), /*#__PURE__*/external_React_default().createElement("div", {
      role: "grid",
      "aria-label": "Wallpaper selection. Use arrow keys to navigate."
    }, /*#__PURE__*/external_React_default().createElement("fieldset", null, this.sortWallpapersByOrder(filteredWallpapers).map(({
      background_position,
      fluent_id,
      solid_color,
      theme,
      title,
      thumbnail,
      wallpaperUrl
    }, index) => {
      let style = {};
      if (wallpaperUrl) {
        style.backgroundImage = `url(${thumbnail || wallpaperUrl})`;
        style.backgroundPosition = background_position || "center";
      } else {
        style.backgroundColor = solid_color || "";
      }
      return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("input", {
        ref: el => {
          if (el) {
            this.wallpaperRef[index] = el;
          }
        },
        onChange: this.handleChange,
        onKeyDown: e => this.handleWallpaperKeyDown(e, title),
        style: style,
        type: "radio",
        name: `wallpaper-${title}`,
        id: title,
        value: title,
        checked: title === activeWallpaper,
        "aria-checked": title === activeWallpaper,
        className: `wallpaper-input theme-${theme} ${this.state.activeId === title ? "active" : ""}`,
        onClick: () => this.setActiveId(title) //
        ,
        tabIndex: index === 0 ? 0 : -1 //the first wallpaper in the array will have a tabindex of 0 so we can tab into it. The rest will have a tabindex of -1
      }), /*#__PURE__*/external_React_default().createElement("label", {
        htmlFor: title,
        className: "sr-only",
        "data-l10n-id": fluent_id
      }, fluent_id));
    }), colorPickerInput)))));
  }
}
const WallpaperCategories = (0,external_ReactRedux_namespaceObject.connect)(state => {
  return {
    Wallpapers: state.Wallpapers,
    Prefs: state.Prefs
  };
})(_WallpaperCategories);
;// CONCATENATED MODULE: ./content-src/components/CustomizeMenu/ContentSection/ContentSection.jsx
function ContentSection_extends() { return ContentSection_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, ContentSection_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */






class ContentSection extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onPreferenceSelect = this.onPreferenceSelect.bind(this);

    // Refs are necessary for dynamically measuring drawer heights for slide animations
    this.topSitesDrawerRef = /*#__PURE__*/external_React_default().createRef();
    this.pocketDrawerRef = /*#__PURE__*/external_React_default().createRef();
  }
  inputUserEvent(eventSource, eventValue) {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.UserEvent({
        event: "PREF_CHANGED",
        source: eventSource,
        value: {
          status: eventValue,
          menu_source: "CUSTOMIZE_MENU"
        }
      }));

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
        const {
          widgetsMaximized,
          widgetsMayBeMaximized
        } = this.props.enabledWidgets;
        let widgetSize;
        if (widgetName === "weather") {
          if (this.props.mayHaveWeatherForecast && this.props.weatherDisplay === "detailed") {
            widgetSize = widgetsMayBeMaximized && !widgetsMaximized ? "small" : "medium";
          } else {
            widgetSize = "mini";
          }
        } else {
          widgetSize = widgetsMayBeMaximized && !widgetsMaximized ? "small" : "medium";
        }
        const data = {
          widget_name: widgetName,
          widget_source: "customize_panel",
          enabled: eventValue,
          widget_size: widgetSize
        };
        this.props.dispatch(actionCreators.OnlyToMain({
          type: actionTypes.WIDGETS_ENABLED,
          data
        }));
      }
    });
  }
  onPreferenceSelect(e) {
    // eventSource: WEATHER | TOP_SITES | TOP_STORIES | WIDGET_LISTS | WIDGET_TIMER
    const {
      preference,
      eventSource
    } = e.target.dataset;
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
    this.setDrawerMargin(`TOP_SITES`, this.props.enabledSections.topSitesEnabled);
    this.setDrawerMargin(`TOP_STORIES`, this.props.enabledSections.pocketEnabled);
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
      let drawerHeight = parseFloat(window.getComputedStyle(drawerRef)?.height) || 100;
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
      showSectionsMgmtPanel
    } = this.props;
    const {
      topSitesEnabled,
      pocketEnabled,
      weatherEnabled,
      showInferredPersonalizationEnabled,
      topSitesRowsCount
    } = enabledSections;
    const {
      timerEnabled,
      listsEnabled
    } = enabledWidgets;
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: "home-section"
    }, wallpapersEnabled && /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement("div", {
      className: "wallpapers-section"
    }, /*#__PURE__*/external_React_default().createElement(WallpaperCategories, {
      setPref: setPref,
      activeWallpaper: activeWallpaper,
      exitEventFired: exitEventFired,
      onSubpanelToggle: onSubpanelToggle
    })), !mayHaveWidgets && /*#__PURE__*/external_React_default().createElement("span", {
      className: "divider",
      role: "separator"
    })), mayHaveWidgets && /*#__PURE__*/external_React_default().createElement("div", {
      className: "widgets-section"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "category-header"
    }, /*#__PURE__*/external_React_default().createElement("h2", {
      "data-l10n-id": "newtab-custom-widget-section-title"
    })), /*#__PURE__*/external_React_default().createElement("div", {
      className: "settings-widgets"
    }, mayHaveWeather && /*#__PURE__*/external_React_default().createElement("div", {
      id: "weather-section",
      className: "section"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "weather-toggle",
      pressed: weatherEnabled || null,
      onToggle: this.onPreferenceSelect,
      "data-preference": "showWeather",
      "data-event-source": "WEATHER",
      "data-l10n-id": "newtab-custom-widget-weather-toggle"
    })), mayHaveListsWidget && /*#__PURE__*/external_React_default().createElement("div", {
      id: "lists-widget-section",
      className: "section"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "lists-toggle",
      pressed: listsEnabled || null,
      onToggle: this.onPreferenceSelect,
      "data-preference": "widgets.lists.enabled",
      "data-event-source": "WIDGET_LISTS",
      "data-l10n-id": "newtab-custom-widget-lists-toggle"
    })), mayHaveTimerWidget && /*#__PURE__*/external_React_default().createElement("div", {
      id: "timer-widget-section",
      className: "section"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "timer-toggle",
      pressed: timerEnabled || null,
      onToggle: this.onPreferenceSelect,
      "data-preference": "widgets.focusTimer.enabled",
      "data-event-source": "WIDGET_TIMER",
      "data-l10n-id": "newtab-custom-widget-timer-toggle"
    })), /*#__PURE__*/external_React_default().createElement("span", {
      className: "divider",
      role: "separator"
    }))), /*#__PURE__*/external_React_default().createElement("div", {
      className: "settings-toggles"
    }, !mayHaveWidgets && mayHaveWeather && /*#__PURE__*/external_React_default().createElement("div", {
      id: "weather-section",
      className: "section"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "weather-toggle",
      pressed: weatherEnabled || null,
      onToggle: this.onPreferenceSelect,
      "data-preference": "showWeather",
      "data-event-source": "WEATHER",
      "data-l10n-id": "newtab-custom-weather-toggle"
    })), /*#__PURE__*/external_React_default().createElement("div", {
      id: "shortcuts-section",
      className: "section"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", {
      id: "shortcuts-toggle",
      pressed: topSitesEnabled || null,
      onToggle: this.onPreferenceSelect,
      "data-preference": "feeds.topsites",
      "data-event-source": "TOP_SITES",
      "data-l10n-id": "newtab-custom-shortcuts-toggle"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      slot: "nested"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "more-info-top-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "more-information",
      ref: this.topSitesDrawerRef
    }, /*#__PURE__*/external_React_default().createElement("select", {
      id: "row-selector",
      className: "selector",
      name: "row-count",
      "data-preference": "topSitesRows",
      value: topSitesRowsCount,
      onChange: this.onPreferenceSelect,
      disabled: !topSitesEnabled,
      "aria-labelledby": "custom-shortcuts-title"
    }, /*#__PURE__*/external_React_default().createElement("option", {
      value: "1",
      "data-l10n-id": "newtab-custom-row-selector",
      "data-l10n-args": "{\"num\": 1}"
    }), /*#__PURE__*/external_React_default().createElement("option", {
      value: "2",
      "data-l10n-id": "newtab-custom-row-selector",
      "data-l10n-args": "{\"num\": 2}"
    }), /*#__PURE__*/external_React_default().createElement("option", {
      value: "3",
      "data-l10n-id": "newtab-custom-row-selector",
      "data-l10n-args": "{\"num\": 3}"
    }), /*#__PURE__*/external_React_default().createElement("option", {
      value: "4",
      "data-l10n-id": "newtab-custom-row-selector",
      "data-l10n-args": "{\"num\": 4}"
    }))))))), pocketRegion && /*#__PURE__*/external_React_default().createElement("div", {
      id: "pocket-section",
      className: "section"
    }, /*#__PURE__*/external_React_default().createElement("moz-toggle", ContentSection_extends({
      id: "pocket-toggle",
      pressed: pocketEnabled || null,
      onToggle: this.onPreferenceSelect,
      "aria-describedby": "custom-pocket-subtitle",
      "data-preference": "feeds.section.topstories",
      "data-event-source": "TOP_STORIES"
    }, mayHaveInferredPersonalization ? {
      "data-l10n-id": "newtab-custom-stories-personalized-toggle"
    } : {
      "data-l10n-id": "newtab-custom-stories-toggle"
    }), /*#__PURE__*/external_React_default().createElement("div", {
      slot: "nested"
    }, (mayHaveInferredPersonalization || mayHaveTopicSections) && /*#__PURE__*/external_React_default().createElement("div", {
      className: "more-info-pocket-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "more-information",
      ref: this.pocketDrawerRef
    }, mayHaveInferredPersonalization && /*#__PURE__*/external_React_default().createElement("div", {
      className: "check-wrapper",
      role: "presentation"
    }, /*#__PURE__*/external_React_default().createElement("input", {
      id: "inferred-personalization",
      className: "customize-menu-checkbox",
      disabled: !pocketEnabled,
      checked: showInferredPersonalizationEnabled,
      type: "checkbox",
      onChange: this.onPreferenceSelect,
      "data-preference": "discoverystream.sections.personalization.inferred.user.enabled",
      "data-event-source": "INFERRED_PERSONALIZATION"
    }), /*#__PURE__*/external_React_default().createElement("label", {
      className: "customize-menu-checkbox-label",
      htmlFor: "inferred-personalization",
      "data-l10n-id": "newtab-custom-stories-personalized-checkbox-label"
    })), mayHaveTopicSections && /*#__PURE__*/external_React_default().createElement(SectionsMgmtPanel, {
      exitEventFired: exitEventFired,
      pocketEnabled: pocketEnabled,
      onSubpanelToggle: onSubpanelToggle,
      togglePanel: toggleSectionsMgmtPanel,
      showPanel: showSectionsMgmtPanel
    }))))))), /*#__PURE__*/external_React_default().createElement("span", {
      className: "divider",
      role: "separator"
    }), /*#__PURE__*/external_React_default().createElement("div", null, /*#__PURE__*/external_React_default().createElement("button", {
      id: "settings-link",
      className: "external-link",
      onClick: openPreferences,
      "data-l10n-id": "newtab-custom-settings"
    })));
  }
}
;// CONCATENATED MODULE: ./content-src/components/CustomizeMenu/CustomizeMenu.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




// eslint-disable-next-line no-shadow

class _CustomizeMenu extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onEntered = this.onEntered.bind(this);
    this.onExited = this.onExited.bind(this);
    this.onSubpanelToggle = this.onSubpanelToggle.bind(this);
    this.state = {
      exitEventFired: false,
      subpanelOpen: false
    };
  }
  onSubpanelToggle(isOpen) {
    this.setState({
      subpanelOpen: isOpen
    });
  }
  onEntered() {
    this.setState({
      exitEventFired: false
    });
    if (this.closeButton) {
      this.closeButton.focus();
    }
  }
  onExited() {
    this.setState({
      exitEventFired: true
    });
    if (this.openButton) {
      this.openButton.focus();
    }
  }
  render() {
    const activationWindowVariant = this.props.Prefs.values["activationWindow.variant"];
    const activationWindowClass = activationWindowVariant ? `activation-window-variant-${activationWindowVariant}` : "";
    return /*#__PURE__*/external_React_default().createElement("span", null, /*#__PURE__*/external_React_default().createElement(external_ReactTransitionGroup_namespaceObject.CSSTransition, {
      timeout: 300,
      classNames: "personalize-animate",
      in: !this.props.showing,
      appear: true
    }, /*#__PURE__*/external_React_default().createElement("button", {
      className: `${activationWindowClass} personalize-button`,
      "data-l10n-id": "newtab-customize-panel-icon-button",
      onClick: () => this.props.onOpen(),
      onKeyDown: e => {
        if (e.key === "Enter") {
          this.props.onOpen();
        }
      },
      ref: c => this.openButton = c
    }, /*#__PURE__*/external_React_default().createElement("label", {
      "data-l10n-id": "newtab-customize-panel-icon-button-label"
    }), /*#__PURE__*/external_React_default().createElement("div", null, /*#__PURE__*/external_React_default().createElement("img", {
      role: "presentation",
      src: "chrome://global/skin/icons/edit-outline.svg"
    })))), /*#__PURE__*/external_React_default().createElement(external_ReactTransitionGroup_namespaceObject.CSSTransition, {
      timeout: 250,
      classNames: "customize-animate",
      in: this.props.showing,
      onEntered: this.onEntered,
      onExited: this.onExited,
      appear: true
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "customize-menu-animate-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: `customize-menu ${this.state.subpanelOpen ? "subpanel-open" : ""}`,
      role: "dialog",
      "data-l10n-id": "newtab-settings-dialog-label"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "close-button-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("moz-button", {
      onClick: () => this.props.onClose(),
      id: "close-button",
      type: "icon ghost",
      "data-l10n-id": "newtab-custom-close-menu-button",
      iconsrc: "chrome://global/skin/icons/close.svg",
      ref: c => this.closeButton = c
    })), /*#__PURE__*/external_React_default().createElement(ContentSection, {
      openPreferences: this.props.openPreferences,
      setPref: this.props.setPref,
      enabledSections: this.props.enabledSections,
      enabledWidgets: this.props.enabledWidgets,
      wallpapersEnabled: this.props.wallpapersEnabled,
      activeWallpaper: this.props.activeWallpaper,
      pocketRegion: this.props.pocketRegion,
      mayHaveTopicSections: this.props.mayHaveTopicSections,
      mayHaveInferredPersonalization: this.props.mayHaveInferredPersonalization,
      mayHaveWeather: this.props.mayHaveWeather,
      mayHaveWidgets: this.props.mayHaveWidgets,
      mayHaveWeatherForecast: this.props.mayHaveWeatherForecast,
      weatherDisplay: this.props.weatherDisplay,
      mayHaveTimerWidget: this.props.mayHaveTimerWidget,
      mayHaveListsWidget: this.props.mayHaveListsWidget,
      dispatch: this.props.dispatch,
      exitEventFired: this.state.exitEventFired,
      onSubpanelToggle: this.onSubpanelToggle,
      toggleSectionsMgmtPanel: this.props.toggleSectionsMgmtPanel,
      showSectionsMgmtPanel: this.props.showSectionsMgmtPanel
    })))));
  }
}
const CustomizeMenu = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  DiscoveryStream: state.DiscoveryStream,
  Prefs: state.Prefs
}))(_CustomizeMenu);
;// CONCATENATED MODULE: ./content-src/components/Logo/Logo.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function Logo() {
  return /*#__PURE__*/external_React_default().createElement("h1", {
    className: "logo-and-wordmark-wrapper"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "logo-and-wordmark",
    role: "img",
    "data-l10n-id": "newtab-logo-and-wordmark"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "logo"
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: "wordmark"
  })));
}

;// CONCATENATED MODULE: ./content-src/components/ExternalComponentWrapper/ExternalComponentWrapper.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




/**
 * A React component that dynamically loads and embeds external custom elements
 * into the newtab page.
 *
 * This component serves as a bridge between React's declarative rendering and
 * browser-native custom elements that are registered and managed outside of
 * React's control. It:
 *
 * 1. Looks up the component configuration by type from the ExternalComponents
 *    registry
 * 2. Dynamically imports the component's script module (which registers the
 *    custom element)
 * 3. Creates an instance of the custom element using imperative DOM APIs
 * 4. Appends it to a React-managed container div
 * 5. Cleans up the custom element on unmount
 *
 * This approach is necessary because:
 * - Custom elements have their own lifecycle separate from React
 * - They need to be created imperatively (document.createElement) rather than
 *   declaratively (JSX)
 * - React shouldn't try to diff/reconcile their internal DOM, as they manage
 *   their own shadow DOM
 * - We need manual cleanup to prevent memory leaks when the component unmounts
 *
 * @param {object} props
 * @param {string} props.type - The component type to load (e.g., "SEARCH")
 * @param {string} props.className - CSS class name(s) to apply to the wrapper div
 * @param {Function} props.importModule - Function to import modules (for testing)
 */
function ExternalComponentWrapper({
  type,
  className,
  // importFunction is declared as an arrow function here purely so that we can
  // override it for testing.
  // eslint-disable-next-line no-unsanitized/method
  importModule = url => import(/* webpackIgnore: true */url)
}) {
  const containerRef = external_React_default().useRef(null);
  const customElementRef = external_React_default().useRef(null);
  const l10nLinksRef = external_React_default().useRef([]);
  const [error, setError] = external_React_default().useState(null);
  const {
    components
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.ExternalComponents);
  external_React_default().useEffect(() => {
    const container = containerRef.current;
    const loadComponent = async () => {
      try {
        const config = components.find(c => c.type === type);
        if (!config) {
          console.warn(`No external component configuration found for type: ${type}`);
          return;
        }
        await importModule(config.componentURL);
        l10nLinksRef.current = [];
        for (let l10nURL of config.l10nURLs) {
          const l10nEl = document.createElement("link");
          l10nEl.rel = "localization";
          l10nEl.href = l10nURL;
          document.head.appendChild(l10nEl);
          l10nLinksRef.current.push(l10nEl);
        }
        if (containerRef.current && !customElementRef.current) {
          const element = document.createElement(config.tagName);
          if (config.attributes) {
            for (const [key, value] of Object.entries(config.attributes)) {
              element.setAttribute(key, value);
            }
          }
          if (config.cssVariables) {
            for (const [variable, style] of Object.entries(config.cssVariables)) {
              element.style.setProperty(variable, style);
            }
          }
          customElementRef.current = element;
          containerRef.current.appendChild(element);
        }
      } catch (err) {
        console.error(`Failed to load external component for type ${type}:`, err);
        setError(err);
      }
    };
    loadComponent();
    return () => {
      if (customElementRef.current && container) {
        container.removeChild(customElementRef.current);
        customElementRef.current = null;
      }
      for (const link of l10nLinksRef.current) {
        link.remove();
      }
      l10nLinksRef.current = [];
    };
  }, [type, components, importModule]);
  if (error) {
    return null;
  }
  return /*#__PURE__*/external_React_default().createElement("div", {
    ref: containerRef,
    className: className
  });
}

;// CONCATENATED MODULE: ./content-src/components/Search/Search.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

/* globals ContentSearchHandoffUIController */

/**
 * @backward-compat { version 148 }
 *
 * Temporary dual implementation to support train hopping. The old handoff UI
 * is kept alongside the new contentSearchHandoffUI.mjs custom element until
 * the module lands on all channels. Controlled by the pref
 * browser.newtabpage.activity-stream.search.useHandoffComponent.
 * Remove the old implementation and the pref once this ships to Release.
 */






class _Search extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.onSearchHandoffClick = this.onSearchHandoffClick.bind(this);
    this.onSearchHandoffPaste = this.onSearchHandoffPaste.bind(this);
    this.onSearchHandoffDrop = this.onSearchHandoffDrop.bind(this);
    this.onInputMountHandoff = this.onInputMountHandoff.bind(this);
    this.onSearchHandoffButtonMount = this.onSearchHandoffButtonMount.bind(this);
  }
  handleEvent(event) {
    // Also track search events with our own telemetry
    if (event.detail.type === "Search") {
      this.props.dispatch(actionCreators.UserEvent({
        event: "SEARCH"
      }));
    }
  }
  doSearchHandoff(text) {
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.HANDOFF_SEARCH_TO_AWESOMEBAR,
      data: {
        text
      }
    }));
    this.props.dispatch({
      type: actionTypes.FAKE_FOCUS_SEARCH
    });
    this.props.dispatch(actionCreators.UserEvent({
      event: "SEARCH_HANDOFF"
    }));
    if (text) {
      this.props.dispatch({
        type: actionTypes.DISABLE_SEARCH
      });
    }
  }
  onSearchHandoffClick(event) {
    // When search hand-off is enabled, we render a big button that is styled to
    // look like a search textbox. If the button is clicked, we style
    // the button as if it was a focused search box and show a fake cursor but
    // really focus the awesomebar without the focus styles ("hidden focus").
    event.preventDefault();
    this.doSearchHandoff();
  }
  onSearchHandoffPaste(event) {
    event.preventDefault();
    this.doSearchHandoff(event.clipboardData.getData("Text"));
  }
  onSearchHandoffDrop(event) {
    event.preventDefault();
    let text = event.dataTransfer.getData("text");
    if (text) {
      this.doSearchHandoff(text);
    }
  }
  componentDidMount() {
    const {
      caretBlinkCount,
      caretBlinkTime,
      "search.useHandoffComponent": useHandoffComponent,
      "externalComponents.enabled": useExternalComponents
    } = this.props.Prefs.values;
    if (useExternalComponents) {
      // Nothing to do - the external component will have set the caret
      // values itself.
      return;
    }
    if (useHandoffComponent) {
      const {
        handoffUI
      } = this;
      if (handoffUI) {
        // If caret blink count isn't defined, use the default infinite behavior for animation
        handoffUI.style.setProperty("--caret-blink-count", caretBlinkCount > -1 ? caretBlinkCount : "infinite");

        // Apply custom blink rate if set, else fallback to default (567ms on/off --> 1134ms total)
        handoffUI.style.setProperty("--caret-blink-time", caretBlinkTime > 0 ? `${caretBlinkTime * 2}ms` : `${1134}ms`);
      }
    } else {
      const caret = this.fakeCaret;
      if (caret) {
        // If caret blink count isn't defined, use the default infinite behavior for animation
        caret.style.setProperty("--caret-blink-count", caretBlinkCount > -1 ? caretBlinkCount : "infinite");

        // Apply custom blink rate if set, else fallback to default (567ms on/off --> 1134ms total)
        caret.style.setProperty("--caret-blink-time", caretBlinkTime > 0 ? `${caretBlinkTime * 2}ms` : `${1134}ms`);
      }
    }
  }
  onInputMountHandoff(input) {
    if (input) {
      // The handoff UI controller helps us set the search icon and reacts to
      // changes to default engine to keep everything in sync.
      this._handoffSearchController = new ContentSearchHandoffUIController();
    }
  }
  onSearchHandoffButtonMount(button) {
    // Keep a reference to the button for use during "paste" event handling.
    this._searchHandoffButton = button;
  }

  /*
   * Do not change the ID on the input field, as legacy newtab code
   * specifically looks for the id 'newtab-search-text' on input fields
   * in order to execute searches in various tests
   */
  render() {
    const useHandoffComponent = this.props.Prefs.values["search.useHandoffComponent"];
    const useExternalComponents = this.props.Prefs.values["externalComponents.enabled"];
    if (useHandoffComponent) {
      if (useExternalComponents) {
        return /*#__PURE__*/external_React_default().createElement("div", {
          className: "search-wrapper"
        }, this.props.showLogo && /*#__PURE__*/external_React_default().createElement(Logo, null), /*#__PURE__*/external_React_default().createElement(ExternalComponentWrapper, {
          type: "SEARCH",
          className: "search-inner-wrapper"
        }));
      }
      return /*#__PURE__*/external_React_default().createElement("div", {
        className: "search-wrapper"
      }, this.props.showLogo && /*#__PURE__*/external_React_default().createElement(Logo, null), /*#__PURE__*/external_React_default().createElement("div", {
        className: "search-inner-wrapper"
      }, /*#__PURE__*/external_React_default().createElement("content-search-handoff-ui", {
        ref: el => {
          this.handoffUI = el;
        }
      })));
    }
    const wrapperClassName = ["search-wrapper", this.props.disable && "search-disabled", this.props.fakeFocus && "fake-focus"].filter(v => v).join(" ");
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: wrapperClassName
    }, this.props.showLogo && /*#__PURE__*/external_React_default().createElement(Logo, null), /*#__PURE__*/external_React_default().createElement("div", {
      className: "search-inner-wrapper"
    }, /*#__PURE__*/external_React_default().createElement("button", {
      className: "search-handoff-button",
      ref: this.onSearchHandoffButtonMount,
      onClick: this.onSearchHandoffClick,
      tabIndex: "-1"
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "fake-textbox"
    }), /*#__PURE__*/external_React_default().createElement("input", {
      type: "search",
      className: "fake-editable",
      tabIndex: "-1",
      "aria-hidden": "true",
      onDrop: this.onSearchHandoffDrop,
      onPaste: this.onSearchHandoffPaste,
      ref: this.onInputMountHandoff
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: "fake-caret",
      ref: el => {
        this.fakeCaret = el;
      }
    }))));
  }
}
const Search_Search = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  Prefs: state.Prefs
}))(_Search);
;// CONCATENATED MODULE: ./content-src/components/Weather/Weather.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */






const Weather_USER_ACTION_TYPES = {
  CHANGE_DISPLAY: "change_weather_display",
  CHANGE_LOCATION: "change_location",
  CHANGE_TEMP_UNIT: "change_temperature_units",
  DETECT_LOCATION: "detect_location",
  LEARN_MORE: "learn_more",
  OPT_IN_ACCEPTED: "opt_in_accepted",
  PROVIDER_LINK_CLICK: "provider_link_click"
};
const Weather_VISIBLE = "visible";
const Weather_VISIBILITY_CHANGE_EVENT = "visibilitychange";
const PREF_SYSTEM_SHOW_WEATHER = "system.showWeather";
function WeatherPlaceholder() {
  const [isSeen, setIsSeen] = (0,external_React_namespaceObject.useState)(false);

  // We are setting up a visibility and intersection event
  // so animations don't happen with headless automation.
  // The animations causes tests to fail beause they never stop,
  // and many tests wait until everything has stopped before passing.
  const ref = useIntersectionObserver(() => setIsSeen(true), 1);
  const isSeenClassName = isSeen ? `placeholder-seen` : ``;
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `weather weather-placeholder ${isSeenClassName}`,
    ref: el => {
      ref.current = [el];
    }
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "placeholder-image placeholder-fill"
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: "placeholder-context"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "placeholder-header placeholder-fill"
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: "placeholder-description placeholder-fill"
  })));
}
class _Weather extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.state = {
      url: "https://example.com",
      impressionSeen: false,
      errorSeen: false
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
    const {
      props
    } = this;
    if (!props.dispatch) {
      return;
    }
    if (props.document.visibilityState === Weather_VISIBLE) {
      // Setup the impression observer once the page is visible.
      this.setImpressionObservers();
    } else {
      // We should only ever send the latest impression stats ping, so remove any
      // older listeners.
      if (this._onVisibilityChange) {
        props.document.removeEventListener(Weather_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
      }
      this._onVisibilityChange = () => {
        if (props.document.visibilityState === Weather_VISIBLE) {
          // Setup the impression observer once the page is visible.
          this.setImpressionObservers();
          props.document.removeEventListener(Weather_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
        }
      };
      props.document.addEventListener(Weather_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
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
      this.props.document.removeEventListener(Weather_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
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
        (0,external_ReactRedux_namespaceObject.batch)(() => {
          // Old event (keep for backward compatibility)
          this.props.dispatch(actionCreators.OnlyToMain({
            type: actionTypes.WEATHER_IMPRESSION
          }));

          // New unified event
          this.props.dispatch(actionCreators.OnlyToMain({
            type: actionTypes.WIDGETS_IMPRESSION,
            data: {
              widget_name: "weather",
              widget_size: "mini"
            }
          }));
        });

        // Stop observing since element has been seen
        this.setState({
          impressionSeen: true
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
        (0,external_ReactRedux_namespaceObject.batch)(() => {
          // Old event (keep for backward compatibility)
          this.props.dispatch(actionCreators.OnlyToMain({
            type: actionTypes.WEATHER_LOAD_ERROR
          }));

          // New unified event
          this.props.dispatch(actionCreators.OnlyToMain({
            type: actionTypes.WIDGETS_ERROR,
            data: {
              widget_name: "weather",
              widget_size: "mini",
              error_type: "load_error"
            }
          }));
        });

        // Stop observing since element has been seen
        this.setState({
          errorSeen: true
        });
      }
    }
  }
  onProviderClick() {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      // Old event (keep for backward compatibility)
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WEATHER_OPEN_PROVIDER_URL,
        data: {
          source: "WEATHER"
        }
      }));

      // New unified event
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "widget",
          user_action: Weather_USER_ACTION_TYPES.PROVIDER_LINK_CLICK,
          widget_size: "mini"
        }
      }));
    });
  }
  handleChangeLocation = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.BroadcastToContent({
        type: actionTypes.WEATHER_SEARCH_ACTIVE,
        data: true
      }));
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "context_menu",
          user_action: Weather_USER_ACTION_TYPES.CHANGE_LOCATION,
          widget_size: "mini"
        }
      }));
    });
  };
  handleDetectLocation = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      // Old event (keep for backward compatibility)
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_USER_OPT_IN_LOCATION
      }));

      // New unified event
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "context_menu",
          user_action: Weather_USER_ACTION_TYPES.DETECT_LOCATION,
          widget_size: "mini"
        }
      }));
    });
  };
  handleChangeTempUnit = value => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "weather.temperatureUnits",
          value
        }
      }));
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "context_menu",
          user_action: Weather_USER_ACTION_TYPES.CHANGE_TEMP_UNIT,
          widget_size: "mini",
          action_value: value
        }
      }));
    });
  };
  handleChangeDisplay = value => {
    const weatherForecastEnabled = this.props.Prefs.values["widgets.system.weatherForecast.enabled"];
    if (this.panelElement) {
      this.panelElement.hide();
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "weather.display",
          value
        }
      }));
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "context_menu",
          user_action: Weather_USER_ACTION_TYPES.CHANGE_DISPLAY,
          widget_size: "mini",
          action_value: weatherForecastEnabled ? "switch_to_forecast_widget" : value
        }
      }));
    });
  };
  handleHideWeather = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.SET_PREF,
        data: {
          name: "showWeather",
          value: false
        }
      }));
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_ENABLED,
        data: {
          widget_name: "weather",
          widget_source: "context_menu",
          enabled: false,
          widget_size: "mini"
        }
      }));
    });
  };
  handleLearnMore = () => {
    if (this.panelElement) {
      this.panelElement.hide();
    }
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.OPEN_LINK,
        data: {
          url: "https://support.mozilla.org/kb/customize-items-on-firefox-new-tab-page"
        }
      }));
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "context_menu",
          user_action: Weather_USER_ACTION_TYPES.LEARN_MORE,
          widget_size: "mini"
        }
      }));
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
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      this.props.dispatch(actionCreators.SetPref("weather.optInAccepted", false));
      this.props.dispatch(actionCreators.SetPref("weather.optInDisplayed", false));

      // Old event (keep for backward compatibility)
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_OPT_IN_PROMPT_SELECTION,
        data: "rejected opt-in"
      }));

      // New unified event
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "widget",
          user_action: Weather_USER_ACTION_TYPES.OPT_IN_ACCEPTED,
          widget_size: "mini",
          action_value: false
        }
      }));
    });
  };
  handleAcceptOptIn = () => {
    (0,external_ReactRedux_namespaceObject.batch)(() => {
      // Old events (keep for backward compatibility)
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_USER_OPT_IN_LOCATION
      }));
      this.props.dispatch(actionCreators.AlsoToMain({
        type: actionTypes.WEATHER_OPT_IN_PROMPT_SELECTION,
        data: "accepted opt-in"
      }));

      // New unified event
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.WIDGETS_USER_EVENT,
        data: {
          widget_name: "weather",
          widget_source: "widget",
          user_action: Weather_USER_ACTION_TYPES.OPT_IN_ACCEPTED,
          widget_size: "mini",
          action_value: true
        }
      }));
    });
  };
  isEnabled() {
    const {
      values
    } = this.props.Prefs;
    const systemValue = values[PREF_SYSTEM_SHOW_WEATHER] && values["feeds.weatherfeed"];
    const experimentValue = values.trainhopConfig?.weather?.enabled;
    return systemValue || experimentValue;
  }
  render() {
    // Check if weather should be rendered
    if (!this.isEnabled()) {
      return false;
    }
    if (this.props.App.isForStartupCache.Weather || !this.props.Weather.initialized) {
      return /*#__PURE__*/external_React_default().createElement(WeatherPlaceholder, null);
    }
    const {
      props
    } = this;
    const {
      Prefs,
      Weather
    } = props;
    const WEATHER_SUGGESTION = Weather.suggestions?.[0];
    const nimbusWeatherDisplay = Prefs.values.trainhopConfig?.weather?.display;
    const showDetailedView = nimbusWeatherDisplay === "detailed" || Prefs.values["weather.display"] === "detailed";
    const nimbusWeatherForecastTrainhopEnabled = Prefs.values.trainhopConfig?.widgets?.weatherForecastEnabled;
    const weatherForecastWidgetEnabled = nimbusWeatherForecastTrainhopEnabled || Prefs.values["widgets.system.weatherForecast.enabled"];
    if (showDetailedView && weatherForecastWidgetEnabled) {
      return null;
    }
    const outerClassName = ["weather", Weather.searchActive && "search"].filter(v => v).join(" ");
    const weatherOptIn = Prefs.values["system.showWeatherOptIn"];
    const nimbusWeatherOptInEnabled = Prefs.values.trainhopConfig?.weather?.weatherOptInEnabled;
    // Bug 2009484: Controls button order in opt-in dialog for A/B testing.
    // When true, "Not now" gets slot="primary";
    // when false/undefined, "Yes" gets slot="primary".
    // Also note the primary button's position varies by platform:
    // on Windows, it appears on the left,
    // while on Linux and macOS, it appears on the right.
    const reverseOptInButtons = Prefs.values.trainhopConfig?.weather?.reverseOptInButtons;
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
    const shouldShowOptInDialog = isOptInEnabled && optInDisplayed && !optInUserChoice;

    // Show static weather data only if:
    // - weather is enabled on customization menu
    // - weather opt-in pref is enabled
    // - static weather data is enabled
    const showStaticData = isOptInEnabled && staticWeather;
    const showFullMenu = !showStaticData;
    const isLocationSearchEnabled = Prefs.values["weather.locationSearchEnabled"];
    const isFahrenheit = Prefs.values["weather.temperatureUnits"] === "f";
    const isSimpleDisplay = Prefs.values["weather.display"] === "simple";
    const contextMenu = (showFullContextMenu = true) => /*#__PURE__*/external_React_default().createElement("div", {
      className: "weatherButtonContextMenuWrapper"
    }, /*#__PURE__*/external_React_default().createElement("button", {
      "aria-haspopup": "true",
      onKeyDown: this.onMenuButtonKeyDown,
      onClick: this.onMenuButtonClick,
      "data-l10n-id": "newtab-menu-section-tooltip",
      className: "weatherButtonContextMenu"
    }), /*#__PURE__*/external_React_default().createElement("panel-list", {
      id: "weather-context-menu",
      ref: this.setPanelRef
    }, isLocationSearchEnabled && /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-change-location",
      "data-l10n-id": "newtab-weather-menu-change-location",
      onClick: this.handleChangeLocation
    }), isOptInEnabled && /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-detect-location",
      "data-l10n-id": "newtab-weather-menu-detect-my-location",
      onClick: this.handleDetectLocation
    }), showFullContextMenu && (isFahrenheit ? /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-temp-celsius",
      "data-l10n-id": "newtab-weather-menu-change-temperature-units-celsius",
      onClick: () => this.handleChangeTempUnit("c")
    }) : /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-temp-fahrenheit",
      "data-l10n-id": "newtab-weather-menu-change-temperature-units-fahrenheit",
      onClick: () => this.handleChangeTempUnit("f")
    })), showFullContextMenu && (isSimpleDisplay ? /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-display-detailed",
      "data-l10n-id": "newtab-weather-menu-change-weather-display-detailed",
      onClick: () => this.handleChangeDisplay("detailed")
    }) : /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-display-simple",
      "data-l10n-id": "newtab-weather-menu-change-weather-display-simple",
      onClick: () => this.handleChangeDisplay("simple")
    })), /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-hide",
      "data-l10n-id": "newtab-weather-menu-hide-weather-v2",
      onClick: this.handleHideWeather
    }), /*#__PURE__*/external_React_default().createElement("panel-item", {
      id: "weather-menu-learn-more",
      "data-l10n-id": "newtab-weather-menu-learn-more",
      onClick: this.handleLearnMore
    })));
    if (Weather.searchActive) {
      return /*#__PURE__*/external_React_default().createElement(LocationSearch, {
        outerClassName: outerClassName
      });
    } else if (WEATHER_SUGGESTION) {
      return /*#__PURE__*/external_React_default().createElement("div", {
        ref: this.setImpressionRef,
        className: outerClassName
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherCard"
      }, showStaticData ? /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherInfoLink staticWeatherInfo"
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherIconCol"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherIcon iconId3"
      })), /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherText"
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherForecastRow"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherTemperature"
      }, "22\xB0", Prefs.values["weather.temperatureUnits"])), /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherCityRow"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherCity",
        "data-l10n-id": "newtab-weather-static-city"
      })))) : /*#__PURE__*/external_React_default().createElement("a", {
        "data-l10n-id": "newtab-weather-see-forecast-description",
        "data-l10n-args": "{\"provider\": \"AccuWeather\xAE\"}",
        "data-l10n-attrs": "aria-description",
        href: WEATHER_SUGGESTION.forecast.url,
        className: "weatherInfoLink",
        onClick: this.onProviderClick
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherIconCol"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: `weatherIcon iconId${WEATHER_SUGGESTION.current_conditions.icon_id}`
      })), /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherText"
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherForecastRow"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherTemperature"
      }, WEATHER_SUGGESTION.current_conditions.temperature[Prefs.values["weather.temperatureUnits"]], "\xB0", Prefs.values["weather.temperatureUnits"])), /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherCityRow"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherCity"
      }, Weather.locationData.city)), showDetailedView && !weatherForecastWidgetEnabled ? /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherDetailedSummaryRow"
      }, /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherHighLowTemps"
      }, /*#__PURE__*/external_React_default().createElement("span", null, WEATHER_SUGGESTION.forecast.high[Prefs.values["weather.temperatureUnits"]], "\xB0", Prefs.values["weather.temperatureUnits"]), /*#__PURE__*/external_React_default().createElement("span", null, "\u2022"), /*#__PURE__*/external_React_default().createElement("span", null, WEATHER_SUGGESTION.forecast.low[Prefs.values["weather.temperatureUnits"]], "\xB0", Prefs.values["weather.temperatureUnits"])), /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherTextSummary"
      }, WEATHER_SUGGESTION.current_conditions.summary)) : null)), contextMenu(showFullMenu)), /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherSponsorText",
        "aria-hidden": "true"
      }, /*#__PURE__*/external_React_default().createElement("span", {
        "data-l10n-id": "newtab-weather-sponsored",
        "data-l10n-args": "{\"provider\": \"AccuWeather\xAE\"}"
      })), shouldShowOptInDialog && /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherOptIn"
      }, /*#__PURE__*/external_React_default().createElement("dialog", {
        open: true
      }, /*#__PURE__*/external_React_default().createElement("span", {
        className: "weatherOptInImg"
      }), /*#__PURE__*/external_React_default().createElement("div", {
        className: "weatherOptInContent"
      }, /*#__PURE__*/external_React_default().createElement("h3", {
        "data-l10n-id": "newtab-weather-opt-in-see-weather"
      }), /*#__PURE__*/external_React_default().createElement("moz-button-group", {
        className: "button-group"
      }, /*#__PURE__*/external_React_default().createElement("moz-button", {
        size: "small",
        type: "default",
        "data-l10n-id": "newtab-weather-opt-in-yes",
        onClick: this.handleAcceptOptIn,
        id: "accept-opt-in",
        slot: reverseOptInButtons ? "" : "primary"
      }), /*#__PURE__*/external_React_default().createElement("moz-button", {
        size: "small",
        type: "default",
        "data-l10n-id": "newtab-weather-opt-in-not-now",
        onClick: this.handleRejectOptIn,
        id: "reject-opt-in",
        slot: reverseOptInButtons ? "primary" : ""
      }))))));
    }
    return /*#__PURE__*/external_React_default().createElement("div", {
      ref: this.setErrorRef,
      className: outerClassName
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "weatherNotAvailable"
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "icon icon-info-warning"
    }), " ", /*#__PURE__*/external_React_default().createElement("p", {
      "data-l10n-id": "newtab-weather-error-not-available"
    }), contextMenu(false)));
  }
}
const Weather_Weather = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  App: state.App,
  Weather: state.Weather,
  Prefs: state.Prefs,
  IntersectionObserver: globalThis.IntersectionObserver,
  document: globalThis.document
}))(_Weather);
;// CONCATENATED MODULE: ./content-src/components/DownloadModalToggle/DownloadModalToggle.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function DownloadModalToggle({
  onClick,
  isActive
}) {
  return /*#__PURE__*/external_React_default().createElement("button", {
    className: `mobile-download-promo ${isActive ? " is-active" : ""}`,
    onClick: onClick
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "icon icon-device-phone"
  }));
}

;// CONCATENATED MODULE: ./content-src/components/Notifications/Toasts/ReportContentToast.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


function ReportContentToast({
  onDismissClick,
  onAnimationEnd
}) {
  const mozMessageBarRef = (0,external_React_namespaceObject.useRef)(null);
  (0,external_React_namespaceObject.useEffect)(() => {
    const {
      current: mozMessageBarElement
    } = mozMessageBarRef;
    mozMessageBarElement.addEventListener("message-bar:user-dismissed", onDismissClick, {
      once: true
    });
    return () => {
      mozMessageBarElement.removeEventListener("message-bar:user-dismissed", onDismissClick);
    };
  }, [onDismissClick]);
  return /*#__PURE__*/external_React_default().createElement("moz-message-bar", {
    type: "success",
    class: "notification-feed-item",
    dismissable: true,
    "data-l10n-id": "newtab-toast-thanks-for-reporting",
    ref: mozMessageBarRef,
    onAnimationEnd: onAnimationEnd
  });
}

;// CONCATENATED MODULE: ./content-src/components/Notifications/Notifications.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





function Notifications_Notifications({
  dispatch
}) {
  const toastQueue = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Notifications.toastQueue);
  const toastCounter = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Notifications.toastCounter);

  /**
   * Syncs {@link toastQueue} array so it can be used to
   * remove the toasts wrapper if there are none after a
   * toast is auto-hidden (animated out) via CSS.
   */
  const syncHiddenToastData = (0,external_React_namespaceObject.useCallback)(() => {
    const toastId = toastQueue[toastQueue.length - 1];
    const queuedToasts = [...toastQueue].slice(1);
    dispatch(actionCreators.OnlyToOneContent({
      type: actionTypes.HIDE_TOAST_MESSAGE,
      data: {
        toastQueue: queuedToasts,
        toastCounter: queuedToasts.length,
        toastId,
        showNotifications: false
      }
    }, "ActivityStream:Content"));
  }, [dispatch, toastQueue]);
  const getToast = (0,external_React_namespaceObject.useCallback)(() => {
    // Note: This architecture could expand to support multiple toast notifications at once
    const latestToastItem = toastQueue[toastQueue.length - 1];
    if (!latestToastItem) {
      throw new Error("No toast found");
    }
    switch (latestToastItem) {
      case "reportSuccessToast":
        return /*#__PURE__*/external_React_default().createElement(ReportContentToast, {
          onDismissClick: syncHiddenToastData,
          onAnimationEnd: syncHiddenToastData,
          key: toastCounter
        });
      default:
        throw new Error(`Unexpected toast type: ${latestToastItem}`);
    }
  }, [syncHiddenToastData, toastCounter, toastQueue]);
  (0,external_React_namespaceObject.useEffect)(() => {
    getToast();
  }, [toastQueue, getToast]);
  return toastQueue.length ? /*#__PURE__*/external_React_default().createElement("div", {
    className: "notification-wrapper"
  }, getToast()) : "";
}

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/TopicSelection/TopicSelection.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





const EMOJI_LABELS = {
  business: "💼",
  arts: "🎭",
  food: "🍕",
  health: "🩺",
  finance: "💰",
  government: "🏛️",
  sports: "⚽️",
  tech: "💻",
  travel: "✈️",
  "education-science": "🧪",
  society: "💡"
};
function TopicSelection({
  supportUrl
}) {
  const dispatch = (0,external_ReactRedux_namespaceObject.useDispatch)();
  const inputRef = (0,external_React_namespaceObject.useRef)(null);
  const modalRef = (0,external_React_namespaceObject.useRef)(null);
  const checkboxWrapperRef = (0,external_React_namespaceObject.useRef)(null);
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const topics = prefs["discoverystream.topicSelection.topics"].split(", ");
  const selectedTopics = prefs["discoverystream.topicSelection.selectedTopics"];
  const suggestedTopics = prefs["discoverystream.topicSelection.suggestedTopics"]?.split(", ");
  const displayCount = prefs["discoverystream.topicSelection.onboarding.displayCount"];
  const topicsHaveBeenPreviouslySet = prefs["discoverystream.topicSelection.hasBeenUpdatedPreviously"];
  const [isFirstRun] = (0,external_React_namespaceObject.useState)(displayCount === 0);
  const displayCountRef = (0,external_React_namespaceObject.useRef)(displayCount);
  const preselectedTopics = () => {
    if (selectedTopics) {
      return selectedTopics.split(", ");
    }
    return isFirstRun ? suggestedTopics : [];
  };
  const [topicsToSelect, setTopicsToSelect] = (0,external_React_namespaceObject.useState)(preselectedTopics);
  function isFirstSave() {
    // Only return true if the user has not previous set prefs
    // and the selected topics pref is empty
    if (selectedTopics === "" && !topicsHaveBeenPreviouslySet) {
      return true;
    }
    return false;
  }
  function handleModalClose() {
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.TOPIC_SELECTION_USER_DISMISS
    }));
    dispatch(actionCreators.BroadcastToContent({
      type: actionTypes.TOPIC_SELECTION_SPOTLIGHT_CLOSE
    }));
  }
  function handleUserClose(e) {
    const id = e?.target?.id;
    if (id === "first-run") {
      dispatch(actionCreators.AlsoToMain({
        type: actionTypes.TOPIC_SELECTION_MAYBE_LATER
      }));
      dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", true));
    } else {
      dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", false));
    }
    handleModalClose();
  }

  // By doing this, the useEffect that sets up the IntersectionObserver
  // will not re-run every time displayCount changes,
  // but the observer callback will always have access
  // to the latest displayCount value through the ref.
  (0,external_React_namespaceObject.useEffect)(() => {
    displayCountRef.current = displayCount;
  }, [displayCount]);
  (0,external_React_namespaceObject.useEffect)(() => {
    const {
      current
    } = modalRef;
    let observer;
    if (current) {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          // if the user has seen the modal more than 3 times,
          // automatically remove them from onboarding
          if (displayCountRef.current > 3) {
            dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", false));
          }
          observer.unobserve(modalRef.current);
          dispatch(actionCreators.AlsoToMain({
            type: actionTypes.TOPIC_SELECTION_IMPRESSION
          }));
        }
      });
      observer.observe(current);
    }
    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [modalRef, dispatch]);

  // when component mounts, set focus to input
  (0,external_React_namespaceObject.useEffect)(() => {
    inputRef?.current?.focus();
  }, [inputRef]);
  const handleFocus = (0,external_React_namespaceObject.useCallback)(e => {
    const isArrowPressed = e.key === "ArrowUp" || e.key === "ArrowDown";
    if (isArrowPressed && checkboxWrapperRef.current.contains(document.activeElement)) {
      e.preventDefault();
      const checkboxElements = checkboxWrapperRef.current.querySelectorAll("input");
      const [firstInput] = checkboxElements;
      const lastInput = checkboxElements[checkboxElements.length - 1];
      const inputArr = Array.from(checkboxElements);
      const currentIndex = inputArr.indexOf(document.activeElement);
      let nextEl;
      if (e.key === "ArrowUp") {
        nextEl = document.activeElement === firstInput ? lastInput : checkboxElements[currentIndex - 1];
      } else if (e.key === "ArrowDown") {
        nextEl = document.activeElement === lastInput ? firstInput : checkboxElements[currentIndex + 1];
      }
      nextEl.tabIndex = 0;
      document.activeElement.tabIndex = -1;
      nextEl.focus();
    }
  }, []);
  (0,external_React_namespaceObject.useEffect)(() => {
    const ref = modalRef.current;
    ref.addEventListener("keydown", handleFocus);
    inputRef.current.tabIndex = 0;
    return () => {
      ref.removeEventListener("keydown", handleFocus);
    };
  }, [handleFocus]);
  function handleChange(e) {
    const topic = e.target.name;
    const isChecked = e.target.checked;
    if (isChecked) {
      setTopicsToSelect([...topicsToSelect, topic]);
    } else {
      const updatedTopics = topicsToSelect.filter(t => t !== topic);
      setTopicsToSelect(updatedTopics);
    }
  }
  function handleSubmit() {
    const topicsString = topicsToSelect.join(", ");
    dispatch(actionCreators.SetPref("discoverystream.topicSelection.selectedTopics", topicsString));
    dispatch(actionCreators.SetPref("discoverystream.topicSelection.onboarding.maybeDisplay", false));
    if (!topicsHaveBeenPreviouslySet) {
      dispatch(actionCreators.SetPref("discoverystream.topicSelection.hasBeenUpdatedPreviously", true));
    }
    dispatch(actionCreators.OnlyToMain({
      type: actionTypes.TOPIC_SELECTION_USER_SAVE,
      data: {
        topics: topicsString,
        previous_topics: selectedTopics,
        first_save: isFirstSave()
      }
    }));
    handleModalClose();
  }
  return /*#__PURE__*/external_React_default().createElement(ModalOverlayWrapper, {
    onClose: handleUserClose,
    innerClassName: "topic-selection-container"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "topic-selection-form",
    ref: modalRef
  }, /*#__PURE__*/external_React_default().createElement("button", {
    className: "dismiss-button",
    title: "dismiss",
    onClick: handleUserClose
  }), /*#__PURE__*/external_React_default().createElement("h1", {
    className: "title",
    "data-l10n-id": "newtab-topic-selection-title"
  }), /*#__PURE__*/external_React_default().createElement("p", {
    className: "subtitle",
    "data-l10n-id": "newtab-topic-selection-subtitle"
  }), /*#__PURE__*/external_React_default().createElement("div", {
    className: "topic-list",
    ref: checkboxWrapperRef
  }, topics.map((topic, i) => {
    const checked = topicsToSelect.includes(topic);
    return /*#__PURE__*/external_React_default().createElement("label", {
      className: `topic-item`,
      key: topic
    }, /*#__PURE__*/external_React_default().createElement("input", {
      type: "checkbox",
      id: topic,
      name: topic,
      ref: i === 0 ? inputRef : null,
      onChange: handleChange,
      checked: checked,
      "aria-checked": checked,
      tabIndex: -1
    }), /*#__PURE__*/external_React_default().createElement("div", {
      className: `topic-custom-checkbox`
    }, /*#__PURE__*/external_React_default().createElement("span", {
      className: "topic-icon"
    }, EMOJI_LABELS[`${topic}`]), /*#__PURE__*/external_React_default().createElement("span", {
      className: "topic-checked"
    })), /*#__PURE__*/external_React_default().createElement("span", {
      className: "topic-item-label",
      "data-l10n-id": `newtab-topic-label-${topic}`
    }));
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "modal-footer"
  }, /*#__PURE__*/external_React_default().createElement("a", {
    href: supportUrl,
    "data-l10n-id": "newtab-topic-selection-privacy-link"
  }), /*#__PURE__*/external_React_default().createElement("moz-button-group", {
    className: "button-group"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    id: isFirstRun ? "first-run" : "",
    "data-l10n-id": isFirstRun ? "newtab-topic-selection-button-maybe-later" : "newtab-topic-selection-cancel-button",
    onClick: handleUserClose
  }), /*#__PURE__*/external_React_default().createElement("moz-button", {
    "data-l10n-id": "newtab-topic-selection-save-button",
    type: "primary",
    onClick: handleSubmit
  })))));
}

;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/FeatureHighlight/DownloadMobilePromoHighlight.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





const PREF_MOBILE_DOWNLOAD_HIGHLIGHT_VARIANT_A = "mobileDownloadModal.variant-a";
const PREF_MOBILE_DOWNLOAD_HIGHLIGHT_VARIANT_B = "mobileDownloadModal.variant-b";
const PREF_MOBILE_DOWNLOAD_HIGHLIGHT_VARIANT_C = "mobileDownloadModal.variant-c";
const FEATURE_ID = "FEATURE_DOWNLOAD_MOBILE_PROMO";
function DownloadMobilePromoHighlight({
  position,
  dispatch,
  handleDismiss,
  handleBlock,
  isIntersecting
}) {
  const onDismiss = (0,external_React_namespaceObject.useCallback)(() => {
    // This event is emitted manually because the feature may be triggered outside the OMC flow,
    // and may not be captured by the messaging-system’s automatic reporting.
    dispatch(actionCreators.DiscoveryStreamUserEvent({
      event: "FEATURE_HIGHLIGHT_DISMISS",
      source: "FEATURE_HIGHLIGHT",
      value: {
        feature: FEATURE_ID
      }
    }));
    handleDismiss();
    handleBlock();
  }, [dispatch, handleDismiss, handleBlock]);
  (0,external_React_namespaceObject.useEffect)(() => {
    if (isIntersecting) {
      // This event is emitted manually because the feature may be triggered outside the OMC flow,
      // and may not be captured by the messaging-system’s automatic reporting.
      dispatch(actionCreators.DiscoveryStreamUserEvent({
        event: "FEATURE_HIGHLIGHT_IMPRESSION",
        source: "FEATURE_HIGHLIGHT",
        value: {
          feature: FEATURE_ID
        }
      }));
    }
  }, [dispatch, isIntersecting]);
  const prefs = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Prefs.values);
  const mobileDownloadPromoVarA = prefs[PREF_MOBILE_DOWNLOAD_HIGHLIGHT_VARIANT_A];
  const mobileDownloadPromoVarB = prefs[PREF_MOBILE_DOWNLOAD_HIGHLIGHT_VARIANT_B];
  const mobileDownloadPromoVarC = prefs[PREF_MOBILE_DOWNLOAD_HIGHLIGHT_VARIANT_C];
  function getActiveVariant() {
    if (mobileDownloadPromoVarA) {
      return "A";
    }
    if (mobileDownloadPromoVarB) {
      return "B";
    }
    if (mobileDownloadPromoVarC) {
      return "C";
    }
    return null;
  }
  function getVariantQRCodeImg() {
    const variant = getActiveVariant();
    switch (variant) {
      case "A":
        return "chrome://newtab/content/data/content/assets/download-qr-code-var-a.png";
      case "B":
        return "chrome://newtab/content/data/content/assets/download-qr-code-var-b.png";
      case "C":
        return "chrome://newtab/content/data/content/assets/download-qr-code-var-c.png";
      default:
        return null;
    }
  }
  function getVariantCopy() {
    const variant = getActiveVariant();
    switch (variant) {
      case "A":
        return "newtab-download-mobile-highlight-body-variant-a";
      case "B":
        return "newtab-download-mobile-highlight-body-variant-b";
      case "C":
        return "newtab-download-mobile-highlight-body-variant-c";
      default:
        return null;
    }
  }
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: "download-firefox-feature-highlight"
  }, /*#__PURE__*/external_React_default().createElement(FeatureHighlight, {
    position: position,
    feature: FEATURE_ID,
    dispatch: dispatch,
    message: /*#__PURE__*/external_React_default().createElement("div", {
      className: "download-firefox-feature-highlight-content"
    }, /*#__PURE__*/external_React_default().createElement("img", {
      src: getVariantQRCodeImg(),
      "data-l10n-id": "newtab-download-mobile-highlight-image",
      width: "120",
      height: "191",
      alt: ""
    }), /*#__PURE__*/external_React_default().createElement("p", {
      className: "title",
      "data-l10n-id": "newtab-download-mobile-highlight-title"
    }), /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle",
      "data-l10n-id": getVariantCopy()
    })),
    openedOverride: true,
    showButtonIcon: false,
    dismissCallback: onDismiss,
    outsideClickCallback: handleDismiss
  }));
}
;// CONCATENATED MODULE: ./content-src/components/DiscoveryStreamComponents/FeatureHighlight/WallpaperFeatureHighlight.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */





function WallpaperFeatureHighlight({
  position,
  dispatch,
  handleDismiss,
  handleClick,
  handleBlock
}) {
  const onDismiss = (0,external_React_namespaceObject.useCallback)(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);
  const onToggleClick = (0,external_React_namespaceObject.useCallback)(elementId => {
    dispatch({
      type: actionTypes.SHOW_PERSONALIZE
    });
    dispatch(actionCreators.UserEvent({
      event: "SHOW_PERSONALIZE"
    }));
    handleClick(elementId);
    onDismiss();
  }, [dispatch, onDismiss, handleClick]);

  // Extract the strings and feature ID from OMC
  const {
    messageData
  } = (0,external_ReactRedux_namespaceObject.useSelector)(state => state.Messages);
  return /*#__PURE__*/external_React_default().createElement("div", {
    className: `wallpaper-feature-highlight ${messageData.content?.darkModeDismiss ? "is-inverted-dark-dismiss-button" : ""}`
  }, /*#__PURE__*/external_React_default().createElement(FeatureHighlight, {
    position: position,
    "data-l10n-id": "feature-highlight-wallpaper",
    feature: messageData.content.feature,
    dispatch: dispatch,
    message: /*#__PURE__*/external_React_default().createElement("div", {
      className: "wallpaper-feature-highlight-content"
    }, /*#__PURE__*/external_React_default().createElement("picture", {
      className: "follow-section-button-highlight-image"
    }, /*#__PURE__*/external_React_default().createElement("source", {
      srcSet: messageData.content?.darkModeImageURL || "chrome://newtab/content/data/content/assets/highlights/omc-newtab-wallpapers.svg",
      media: "(prefers-color-scheme: dark)"
    }), /*#__PURE__*/external_React_default().createElement("source", {
      srcSet: messageData.content?.imageURL || "chrome://newtab/content/data/content/assets/highlights/omc-newtab-wallpapers.svg",
      media: "(prefers-color-scheme: light)"
    }), /*#__PURE__*/external_React_default().createElement("img", {
      width: "320",
      height: "195",
      alt: ""
    })), messageData.content?.cardTitle ? /*#__PURE__*/external_React_default().createElement("p", {
      className: "title"
    }, messageData.content.cardTitle) : /*#__PURE__*/external_React_default().createElement("p", {
      className: "title",
      "data-l10n-id": messageData.content.title || "newtab-new-user-custom-wallpaper-title"
    }), messageData.content?.cardMessage ? /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle"
    }, messageData.content.cardMessage) : /*#__PURE__*/external_React_default().createElement("p", {
      className: "subtitle",
      "data-l10n-id": messageData.content.subtitle || "newtab-new-user-custom-wallpaper-subtitle"
    }), /*#__PURE__*/external_React_default().createElement("span", {
      className: "button-wrapper"
    }, messageData.content?.cardCta ? /*#__PURE__*/external_React_default().createElement("moz-button", {
      type: "default",
      onClick: () => onToggleClick("open-customize-menu"),
      label: messageData.content.cardCta
    }) : /*#__PURE__*/external_React_default().createElement("moz-button", {
      type: "default",
      onClick: () => onToggleClick("open-customize-menu"),
      "data-l10n-id": messageData.content.cta || "newtab-new-user-custom-wallpaper-cta"
    }))),
    toggle: /*#__PURE__*/external_React_default().createElement("div", {
      className: "icon icon-help"
    }),
    openedOverride: true,
    showButtonIcon: false,
    dismissCallback: onDismiss,
    outsideClickCallback: handleDismiss
  }));
}
;// CONCATENATED MODULE: ./content-src/components/ActivationWindowMessage/ActivationWindowMessage.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */



function ActivationWindowMessage({
  dispatch,
  handleBlock,
  handleClick,
  handleDismiss,
  messageData
}) {
  const {
    content
  } = messageData;
  const hasButtons = content.primaryButton || content.secondaryButton;
  const onDismiss = (0,external_React_namespaceObject.useCallback)(() => {
    handleDismiss();
    handleBlock();
  }, [handleDismiss, handleBlock]);
  const onPrimaryClick = (0,external_React_namespaceObject.useCallback)(() => {
    handleClick("primary-button");
    if (content.primaryButton?.action?.dismiss) {
      handleDismiss();
      handleBlock();
    }
    if (content.primaryButton?.action?.type === "SHOW_PERSONALIZE") {
      dispatch({
        type: actionTypes.SHOW_PERSONALIZE
      });
      dispatch(actionCreators.UserEvent({
        event: "SHOW_PERSONALIZE"
      }));
    }
  }, [dispatch, handleClick, handleDismiss, handleBlock, content]);
  const onSecondaryClick = (0,external_React_namespaceObject.useCallback)(() => {
    handleClick("secondary-button");
    if (content.secondaryButton?.action?.dismiss) {
      handleDismiss();
      handleBlock();
    }
  }, [handleClick, handleDismiss, handleBlock, content]);
  return /*#__PURE__*/external_React_default().createElement("aside", {
    className: hasButtons ? "activation-window-message" : "activation-window-message no-buttons"
  }, /*#__PURE__*/external_React_default().createElement("div", {
    className: "activation-window-message-dismiss"
  }, /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "icon ghost",
    iconSrc: "chrome://global/skin/icons/close.svg",
    onClick: onDismiss,
    "data-l10n-id": "newtab-activation-window-message-dismiss-button"
  })), /*#__PURE__*/external_React_default().createElement("div", {
    className: "activation-window-message-inner"
  }, /*#__PURE__*/external_React_default().createElement("img", {
    src: content.imageSrc || "chrome://newtab/content/data/content/assets/kit-in-circle.svg",
    alt: "",
    role: "presentation"
  }), /*#__PURE__*/external_React_default().createElement("div", null, content.heading && (typeof content.heading === "string" ? /*#__PURE__*/external_React_default().createElement("h2", null, content.heading) : /*#__PURE__*/external_React_default().createElement("h2", {
    "data-l10n-id": content.heading.string_id
  })), content.message && (typeof content.message === "string" ? /*#__PURE__*/external_React_default().createElement("p", null, content.message) : /*#__PURE__*/external_React_default().createElement("p", {
    "data-l10n-id": content.message.string_id
  })), (content.primaryButton || content.secondaryButton) && /*#__PURE__*/external_React_default().createElement("moz-button-group", null, content.primaryButton && (typeof content.primaryButton.label === "string" ? /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "primary",
    onClick: onPrimaryClick
  }, content.primaryButton.label) : /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "primary",
    onClick: onPrimaryClick,
    "data-l10n-id": content.primaryButton.label.string_id
  })), content.secondaryButton && (typeof content.secondaryButton.label === "string" ? /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "default",
    onClick: onSecondaryClick
  }, content.secondaryButton.label) : /*#__PURE__*/external_React_default().createElement("moz-button", {
    type: "default",
    onClick: onSecondaryClick,
    "data-l10n-id": content.secondaryButton.label.string_id
  }))))));
}
;// CONCATENATED MODULE: ./content-src/components/Base/Base.jsx
function Base_extends() { return Base_extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, Base_extends.apply(null, arguments); }
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




















const Base_VISIBLE = "visible";
const Base_VISIBILITY_CHANGE_EVENT = "visibilitychange";
const PREF_INFERRED_PERSONALIZATION_SYSTEM = "discoverystream.sections.personalization.inferred.enabled";
const Base_PREF_INFERRED_PERSONALIZATION_USER = "discoverystream.sections.personalization.inferred.user.enabled";

// Returns a function will not be continuously triggered when called. The
// function will be triggered if called again after `wait` milliseconds.
function Base_debounce(func, wait) {
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
function WithDsAdmin(props) {
  const {
    hash = globalThis?.location?.hash || ""
  } = props;
  const [devtoolsCollapsed, setDevtoolsCollapsed] = (0,external_React_namespaceObject.useState)(!hash.startsWith("#devtools"));
  (0,external_React_namespaceObject.useEffect)(() => {
    const onHashChange = () => {
      const h = globalThis?.location?.hash || "";
      setDevtoolsCollapsed(!h.startsWith("#devtools"));
    };

    // run once in case hash changed before mount
    onHashChange();
    globalThis?.addEventListener("hashchange", onHashChange);
    return () => globalThis?.removeEventListener("hashchange", onHashChange);
  }, []);
  return /*#__PURE__*/external_React_default().createElement((external_React_default()).Fragment, null, /*#__PURE__*/external_React_default().createElement(DiscoveryStreamAdmin, {
    devtoolsCollapsed: devtoolsCollapsed
  }), devtoolsCollapsed ? /*#__PURE__*/external_React_default().createElement(BaseContent, props) : null);
}
function _Base(props) {
  const isDevtoolsEnabled = props.Prefs.values["asrouter.devtoolsEnabled"];
  const {
    App
  } = props;
  if (!App.initialized) {
    return null;
  }
  return /*#__PURE__*/external_React_default().createElement(ErrorBoundary, {
    className: "base-content-fallback"
  }, isDevtoolsEnabled ? /*#__PURE__*/external_React_default().createElement(WithDsAdmin, props) : /*#__PURE__*/external_React_default().createElement(BaseContent, props));
}
class BaseContent extends (external_React_default()).PureComponent {
  constructor(props) {
    super(props);
    this.openPreferences = this.openPreferences.bind(this);
    this.openCustomizationMenu = this.openCustomizationMenu.bind(this);
    this.closeCustomizationMenu = this.closeCustomizationMenu.bind(this);
    this.handleOnKeyDown = this.handleOnKeyDown.bind(this);
    this.onWindowScroll = Base_debounce(this.onWindowScroll.bind(this), 5);
    this.setPref = this.setPref.bind(this);
    this.shouldShowOMCHighlight = this.shouldShowOMCHighlight.bind(this);
    this.updateWallpaper = this.updateWallpaper.bind(this);
    this.prefersDarkQuery = null;
    this.handleColorModeChange = this.handleColorModeChange.bind(this);
    this.onVisible = this.onVisible.bind(this);
    this.toggleDownloadHighlight = this.toggleDownloadHighlight.bind(this);
    this.handleDismissDownloadHighlight = this.handleDismissDownloadHighlight.bind(this);
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
      showSectionsMgmtPanel: false
    };
    this.spocPlaceholderStartTime = null;
  }
  setFirstVisibleTimestamp() {
    if (!this.state.firstVisibleTimestamp) {
      this.setState({
        firstVisibleTimestamp: Date.now()
      });
    }
  }
  onVisible() {
    this.setState({
      visible: true
    });
    this.setFirstVisibleTimestamp();
    this.shouldDisplayTopicSelectionModal();
    this.onVisibilityDispatch();
    if (this.isSpocsOnDemandExpired && !this.spocPlaceholderStartTime) {
      this.spocPlaceholderStartTime = Date.now();
    }
  }
  onVisibilityDispatch() {
    const {
      onDemand = {}
    } = this.props.DiscoveryStream.spocs;

    // We only need to dispatch this if:
    // 1. onDemand is enabled,
    // 2. onDemand spocs have not been loaded on this tab.
    // 3. Spocs are expired.
    if (onDemand.enabled && !onDemand.loaded && this.isSpocsOnDemandExpired) {
      // This dispatches that spocs are expired and we need to update them.
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.DISCOVERY_STREAM_SPOCS_ONDEMAND_UPDATE
      }));
    }
  }
  get isSpocsOnDemandExpired() {
    const {
      onDemand = {},
      cacheUpdateTime,
      lastUpdated
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
    const {
      onDemand = {},
      loaded
    } = this.props.DiscoveryStream.spocs;

    // We only need to fire this if:
    // 1. Spoc data is loaded.
    // 2. onDemand is enabled.
    // 3. The component is visible (not preloaded tab).
    // 4. onDemand spocs have not been loaded on this tab.
    // 5. Spocs are not expired.
    if (loaded && onDemand.enabled && this.state.visible && !onDemand.loaded && !this.isSpocsOnDemandExpired) {
      // This dispatches that spocs have been loaded on this tab
      // and we don't need to update them again for this tab.
      this.props.dispatch(actionCreators.BroadcastToContent({
        type: actionTypes.DISCOVERY_STREAM_SPOCS_ONDEMAND_LOAD
      }));
    }
  }
  componentDidMount() {
    this.applyBodyClasses();
    __webpack_require__.g.addEventListener("scroll", this.onWindowScroll);
    __webpack_require__.g.addEventListener("keydown", this.handleOnKeyDown);
    const prefs = this.props.Prefs.values;
    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];
    if (!prefs["externalComponents.enabled"]) {
      if (prefs["search.useHandoffComponent"]) {
        // Dynamically import the contentSearchHandoffUI module, but don't worry
        // about webpacking this one.
        import(/* webpackIgnore: true */"chrome://browser/content/contentSearchHandoffUI.mjs");
      } else {
        const scriptURL = "chrome://browser/content/contentSearchHandoffUI.js";
        const scriptEl = document.createElement("script");
        scriptEl.src = scriptURL;
        document.head.appendChild(scriptEl);
      }
    }
    if (this.props.document.visibilityState === Base_VISIBLE) {
      this.onVisible();
    } else {
      this._onVisibilityChange = () => {
        if (this.props.document.visibilityState === Base_VISIBLE) {
          this.onVisible();
          this.props.document.removeEventListener(Base_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
          this._onVisibilityChange = null;
        }
      };
      this.props.document.addEventListener(Base_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
    }
    // track change event to dark/light mode
    this.prefersDarkQuery = globalThis.matchMedia("(prefers-color-scheme: dark)");
    this.prefersDarkQuery.addEventListener("change", this.handleColorModeChange);
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
    const isReload = globalThis.performance?.getEntriesByType("navigation")[0]?.type === "reload";
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
      this.props.dispatch(actionCreators.SetPref("weather.optInDisplayed", true));
    }
    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];
    if (wallpapersEnabled) {
      // destructure current and previous props with fallbacks
      // (preventing undefined errors)
      const {
        Wallpapers: {
          uploadedWallpaper = null,
          wallpaperList = null
        } = {}
      } = this.props;
      const {
        Wallpapers: {
          uploadedWallpaper: prevUploadedWallpaper = null,
          wallpaperList: prevWallpaperList = null
        } = {},
        Prefs: {
          values: prevPrefs = {}
        } = {}
      } = prevProps;
      const selectedWallpaper = prefs["newtabWallpapers.wallpaper"];
      const prevSelectedWallpaper = prevPrefs["newtabWallpapers.wallpaper"];
      const uploadedWallpaperTheme = prefs["newtabWallpapers.customWallpaper.theme"];
      const prevUploadedWallpaperTheme = prevPrefs["newtabWallpapers.customWallpaper.theme"];

      // don't update wallpaper unless the wallpaper is being changed.
      if (selectedWallpaper !== prevSelectedWallpaper ||
      // selecting a new wallpaper
      uploadedWallpaper !== prevUploadedWallpaper ||
      // uploading a new wallpaper
      wallpaperList !== prevWallpaperList ||
      // remote settings wallpaper list updates
      this.props.App.isForStartupCache.Wallpaper !== prevProps.App.isForStartupCache.Wallpaper ||
      // Startup cached page wallpaper is updating
      uploadedWallpaperTheme !== prevUploadedWallpaperTheme) {
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
    const wasExpired = prevProps.DiscoveryStream.spocs.onDemand?.enabled && !prevProps.DiscoveryStream.spocs.onDemand?.loaded && Date.now() - prevProps.DiscoveryStream.spocs.lastUpdated >= prevProps.DiscoveryStream.spocs.cacheUpdateTime;

    // Record duration telemetry event when placeholders are replaced with real content
    if (wasExpired && !isExpired && this.spocPlaceholderStartTime) {
      const duration = Date.now() - this.spocPlaceholderStartTime;
      this.props.dispatch(actionCreators.OnlyToMain({
        type: actionTypes.DISCOVERY_STREAM_SPOC_PLACEHOLDER_DURATION,
        data: {
          duration
        }
      }));
      this.spocPlaceholderStartTime = null;
    }
  }
  handleColorModeChange() {
    const colorMode = this.prefersDarkQuery?.matches ? "dark" : "light";
    if (colorMode !== this.state.colorMode) {
      this.setState({
        colorMode
      });
      this.updateWallpaper();
    }
  }
  componentWillUnmount() {
    this.prefersDarkQuery?.removeEventListener("change", this.handleColorModeChange);
    __webpack_require__.g.removeEventListener("scroll", this.onWindowScroll);
    __webpack_require__.g.removeEventListener("keydown", this.handleOnKeyDown);
    if (this._onVisibilityChange) {
      this.props.document.removeEventListener(Base_VISIBILITY_CHANGE_EVENT, this._onVisibilityChange);
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
    const {
      showSearch
    } = prefs;
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
      logoAndWordmarkWrapperMarginBottom: 0
    };

    // Logo visibility applies to all layouts
    if (!logoAlwaysVisible) {
      layout.logoAndWordmarkWrapperHeight = 0;
      layout.logoAndWordmarkWrapperMarginBottom = 0;
    }
    SCROLL_THRESHOLD = layout.outerWrapperPaddingTop + layout.searchWrapperPaddingTop + layout.logoAndWordmarkWrapperHeight + layout.logoAndWordmarkWrapperMarginBottom - layout.searchWrapperFixedScrollPaddingTop;
    MAIN_OFFSET_PADDING = layout.searchWrapperPaddingTop + layout.searchWrapperPaddingBottom + layout.searchInnerWrapperMinHeight + layout.logoAndWordmarkWrapperHeight + layout.logoAndWordmarkWrapperMarginBottom;

    // Edge case if logo and thums are turned off, but Var A is enabled
    if (SCROLL_THRESHOLD < 1) {
      SCROLL_THRESHOLD = 1;
    }
    if (__webpack_require__.g.scrollY > SCROLL_THRESHOLD && !this.state.fixedSearch) {
      this.setState({
        fixedSearch: true,
        fixedNavStyle: {
          paddingBlockStart: `${MAIN_OFFSET_PADDING}px`
        }
      });
    } else if (__webpack_require__.g.scrollY <= SCROLL_THRESHOLD && this.state.fixedSearch) {
      this.setState({
        fixedSearch: false,
        fixedNavStyle: {}
      });
    }
  }
  openPreferences() {
    this.props.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.SETTINGS_OPEN
    }));
    this.props.dispatch(actionCreators.UserEvent({
      event: "OPEN_NEWTAB_PREFS"
    }));
  }
  openCustomizationMenu() {
    this.props.dispatch({
      type: actionTypes.SHOW_PERSONALIZE
    });
    this.props.dispatch(actionCreators.UserEvent({
      event: "SHOW_PERSONALIZE"
    }));
  }
  closeCustomizationMenu() {
    if (this.props.App.customizeMenuVisible) {
      this.props.dispatch({
        type: actionTypes.HIDE_PERSONALIZE
      });
      this.props.dispatch(actionCreators.UserEvent({
        event: "HIDE_PERSONALIZE"
      }));
    }
  }
  handleOnKeyDown(e) {
    if (e.key === "Escape") {
      this.closeCustomizationMenu();
    }
  }
  setPref(pref, value) {
    this.props.dispatch(actionCreators.SetPref(pref, value));
  }
  applyBodyClasses() {
    const {
      body
    } = this.props.document;
    if (!body) {
      return;
    }
    if (!body.classList.contains("activity-stream")) {
      body.classList.add("activity-stream");
    }
  }
  renderWallpaperAttribution() {
    const {
      wallpaperList
    } = this.props.Wallpapers;
    const activeWallpaper = this.props.Prefs.values[`newtabWallpapers.wallpaper`];
    const selected = wallpaperList.find(wp => wp.title === activeWallpaper);
    // make sure a wallpaper is selected and that the attribution also exists
    if (!selected?.attribution) {
      return null;
    }
    const {
      name: authorDetails,
      webpage
    } = selected.attribution;
    if (activeWallpaper && wallpaperList && authorDetails.url) {
      return /*#__PURE__*/external_React_default().createElement("p", {
        className: `wallpaper-attribution`,
        key: authorDetails.string,
        "data-l10n-id": "newtab-wallpaper-attribution",
        "data-l10n-args": JSON.stringify({
          author_string: authorDetails.string,
          author_url: authorDetails.url,
          webpage_string: webpage.string,
          webpage_url: webpage.url
        })
      }, /*#__PURE__*/external_React_default().createElement("a", {
        "data-l10n-name": "name-link",
        href: authorDetails.url
      }, authorDetails.string), /*#__PURE__*/external_React_default().createElement("a", {
        "data-l10n-name": "webpage-link",
        href: webpage.url
      }, webpage.string));
    }
    return null;
  }
  async updateWallpaper() {
    const prefs = this.props.Prefs.values;
    const selectedWallpaper = prefs["newtabWallpapers.wallpaper"];
    const {
      wallpaperList,
      uploadedWallpaper: uploadedWallpaperUrl
    } = this.props.Wallpapers;
    const uploadedWallpaperTheme = prefs["newtabWallpapers.customWallpaper.theme"];
    // Uuse this.prefersDarkQuery since this.state.colorMode can be undefined when this is called
    const colorMode = this.prefersDarkQuery?.matches ? "dark" : "light";
    let url = "";
    let color = "transparent";
    let newTheme = colorMode;
    let backgroundPosition = "center";

    // if no selected wallpaper fallback to browser/theme styles
    if (!selectedWallpaper) {
      __webpack_require__.g.document?.body.style.removeProperty("--newtab-wallpaper");
      __webpack_require__.g.document?.body.style.removeProperty("--newtab-wallpaper-color");
      __webpack_require__.g.document?.body.style.removeProperty("--newtab-wallpaper-backgroundPosition");
      __webpack_require__.g.document?.body.classList.remove("lightWallpaper", "darkWallpaper");
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
      const wallpaper = wallpaperList.find(wp => wp.title === selectedWallpaper);
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
    __webpack_require__.g.document?.body.style.setProperty("--newtab-wallpaper", `url(${url})`);
    __webpack_require__.g.document?.body.style.setProperty("--newtab-wallpaper-backgroundPosition", backgroundPosition);
    __webpack_require__.g.document?.body.style.setProperty("--newtab-wallpaper-color", color || "transparent");
    __webpack_require__.g.document?.body.classList.remove("lightWallpaper", "darkWallpaper");
    __webpack_require__.g.document?.body.classList.add(newTheme === "dark" ? "darkWallpaper" : "lightWallpaper");
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
      const override = !(prevState.showDownloadHighlightOverride ?? this.shouldShowOMCHighlight("DownloadMobilePromoHighlight"));
      if (override) {
        // Emit an open event manually since OMC isn't handling it
        this.props.dispatch(actionCreators.DiscoveryStreamUserEvent({
          event: "FEATURE_HIGHLIGHT_OPEN",
          source: "FEATURE_HIGHLIGHT",
          value: {
            feature: "FEATURE_DOWNLOAD_MOBILE_PROMO"
          }
        }));
      }
      return {
        showDownloadHighlightOverride: override
      };
    });
  }
  handleDismissDownloadHighlight() {
    this.setState({
      showDownloadHighlightOverride: false
    });
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
      showSectionsMgmtPanel: !prevState.showSectionsMgmtPanel
    }));
  }
  shouldDisplayTopicSelectionModal() {
    const prefs = this.props.Prefs.values;
    const pocketEnabled = prefs["feeds.section.topstories"] && prefs["feeds.system.topstories"];
    const topicSelectionOnboardingEnabled = prefs["discoverystream.topicSelection.onboarding.enabled"] && pocketEnabled;
    const maybeShowModal = prefs["discoverystream.topicSelection.onboarding.maybeDisplay"];
    const displayTimeout = prefs["discoverystream.topicSelection.onboarding.displayTimeout"];
    const lastDisplayed = prefs["discoverystream.topicSelection.onboarding.lastDisplayed"];
    const displayCount = prefs["discoverystream.topicSelection.onboarding.displayCount"];
    if (!maybeShowModal || !prefs["discoverystream.topicSelection.enabled"] || !topicSelectionOnboardingEnabled) {
      return;
    }
    const day = 24 * 60 * 60 * 1000;
    const now = new Date().getTime();
    const timeoutOccured = now - parseFloat(lastDisplayed) > displayTimeout;
    if (displayCount < 3) {
      if (displayCount === 0 || timeoutOccured) {
        this.props.dispatch(actionCreators.BroadcastToContent({
          type: actionTypes.TOPIC_SELECTION_SPOTLIGHT_OPEN
        }));
        this.setPref("discoverystream.topicSelection.onboarding.displayTimeout", day);
      }
    }
  }

  // eslint-disable-next-line max-statements, complexity
  render() {
    const {
      props
    } = this;
    const {
      App,
      DiscoveryStream
    } = props;
    const {
      initialized,
      customizeMenuVisible
    } = App;
    const prefs = props.Prefs.values;
    const activeWallpaper = prefs[`newtabWallpapers.wallpaper`];
    const wallpapersEnabled = prefs["newtabWallpapers.enabled"];
    const weatherEnabled = prefs.showWeather;
    const {
      showTopicSelection
    } = DiscoveryStream;
    const mayShowTopicSelection = showTopicSelection && prefs["discoverystream.topicSelection.enabled"];
    const isDiscoveryStream = props.DiscoveryStream.config && props.DiscoveryStream.config.enabled;
    let filteredSections = props.Sections.filter(section => section.id !== "topstories");
    const pocketEnabled = prefs["feeds.section.topstories"] && prefs["feeds.system.topstories"];
    const noSectionsEnabled = !prefs["feeds.topsites"] && !pocketEnabled && filteredSections.filter(section => section.enabled).length === 0;
    const enabledSections = {
      topSitesEnabled: prefs["feeds.topsites"],
      pocketEnabled: prefs["feeds.section.topstories"],
      showInferredPersonalizationEnabled: prefs[Base_PREF_INFERRED_PERSONALIZATION_USER],
      topSitesRowsCount: prefs.topSitesRows,
      weatherEnabled: prefs.showWeather
    };
    const pocketRegion = prefs["feeds.system.topstories"];
    const mayHaveInferredPersonalization = prefs[PREF_INFERRED_PERSONALIZATION_SYSTEM];
    const mayHaveWeather = prefs["system.showWeather"] || prefs.trainhopConfig?.weather?.enabled;
    const supportUrl = prefs["support.url"];

    // Widgets experiment pref check
    const nimbusWidgetsEnabled = prefs.widgetsConfig?.enabled;
    const nimbusListsEnabled = prefs.widgetsConfig?.listsEnabled;
    const nimbusTimerEnabled = prefs.widgetsConfig?.timerEnabled;
    const nimbusWidgetsTrainhopEnabled = prefs.trainhopConfig?.widgets?.enabled;
    const nimbusListsTrainhopEnabled = prefs.trainhopConfig?.widgets?.listsEnabled;
    const nimbusTimerTrainhopEnabled = prefs.trainhopConfig?.widgets?.timerEnabled;
    const mayHaveWidgets = prefs["widgets.system.enabled"] || nimbusWidgetsEnabled || nimbusWidgetsTrainhopEnabled;
    const mayHaveListsWidget = prefs["widgets.system.lists.enabled"] || nimbusListsEnabled || nimbusListsTrainhopEnabled;
    const mayHaveTimerWidget = prefs["widgets.system.focusTimer.enabled"] || nimbusTimerEnabled || nimbusTimerTrainhopEnabled;

    // These prefs set the initial values on the Customize panel toggle switches
    const enabledWidgets = {
      listsEnabled: prefs["widgets.lists.enabled"],
      timerEnabled: prefs["widgets.focusTimer.enabled"],
      weatherEnabled: prefs.showWeather,
      widgetsMaximized: prefs["widgets.maximized"],
      widgetsMayBeMaximized: prefs["widgets.system.maximized"]
    };

    // Mobile Download Promo Pref Checks
    const mobileDownloadPromoEnabled = prefs["mobileDownloadModal.enabled"];
    const mobileDownloadPromoVariantAEnabled = prefs["mobileDownloadModal.variant-a"];
    const mobileDownloadPromoVariantBEnabled = prefs["mobileDownloadModal.variant-b"];
    const mobileDownloadPromoVariantCEnabled = prefs["mobileDownloadModal.variant-c"];
    const mobileDownloadPromoVariantABorC = mobileDownloadPromoVariantAEnabled || mobileDownloadPromoVariantBEnabled || mobileDownloadPromoVariantCEnabled;
    const mobileDownloadPromoWrapperHeightModifier = prefs["weather.display"] === "detailed" && weatherEnabled && mayHaveWeather ? "is-tall" : "";
    const sectionsEnabled = prefs["discoverystream.sections.enabled"];
    const sectionsCustomizeMenuPanelEnabled = prefs["discoverystream.sections.customizeMenuPanel.enabled"];
    const sectionsPersonalizationEnabled = prefs["discoverystream.sections.personalization.enabled"];

    // Logic to show follow/block topic mgmt panel in Customize panel
    const mayHavePersonalizedTopicSections = sectionsPersonalizationEnabled && sectionsEnabled && sectionsCustomizeMenuPanelEnabled && DiscoveryStream.feeds.loaded;
    const featureClassName = [mobileDownloadPromoEnabled && mobileDownloadPromoVariantABorC && "has-mobile-download-promo",
    // Mobile download promo modal is enabled/visible
    weatherEnabled && mayHaveWeather && "has-weather",
    // Weather widget is enabled/visible
    prefs.showSearch ? "has-search" : "no-search",
    // layoutsVariantAEnabled ? "layout-variant-a" : "", // Layout experiment variant A
    // layoutsVariantBEnabled ? "layout-variant-b" : "", // Layout experiment variant B
    pocketEnabled ? "has-recommended-stories" : "no-recommended-stories", sectionsEnabled ? "has-sections-grid" : ""].filter(v => v).join(" ");
    const outerClassName = ["outer-wrapper", isDiscoveryStream && pocketEnabled && "ds-outer-wrapper-search-alignment", isDiscoveryStream && "ds-outer-wrapper-breakpoint-override", prefs.showSearch && this.state.fixedSearch && !noSectionsEnabled && "fixed-search", prefs.showSearch && noSectionsEnabled && "only-search", prefs["feeds.topsites"] && !pocketEnabled && !prefs.showSearch && "only-topsites", noSectionsEnabled && "no-sections", prefs["logowordmark.alwaysVisible"] && "visible-logo"].filter(v => v).join(" ");

    // If state.showDownloadHighlightOverride has value, let it override the logic
    // Otherwise, defer to OMC message display logic
    const shouldShowDownloadHighlight = this.state.showDownloadHighlightOverride ?? this.shouldShowOMCHighlight("DownloadMobilePromoHighlight");
    return /*#__PURE__*/external_React_default().createElement("div", {
      className: featureClassName
    }, /*#__PURE__*/external_React_default().createElement("div", {
      className: "weatherWrapper"
    }, weatherEnabled && /*#__PURE__*/external_React_default().createElement(ErrorBoundary, null, /*#__PURE__*/external_React_default().createElement(Weather_Weather, null))), /*#__PURE__*/external_React_default().createElement("div", {
      className: `mobileDownloadPromoWrapper ${mobileDownloadPromoWrapperHeightModifier}`
    }, mobileDownloadPromoEnabled && mobileDownloadPromoVariantABorC && /*#__PURE__*/external_React_default().createElement(ErrorBoundary, null, /*#__PURE__*/external_React_default().createElement(DownloadModalToggle, {
      isActive: shouldShowDownloadHighlight,
      onClick: this.toggleDownloadHighlight
    }), shouldShowDownloadHighlight && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
      hiddenOverride: shouldShowDownloadHighlight,
      onDismiss: this.handleDismissDownloadHighlight,
      dispatch: this.props.dispatch
    }, /*#__PURE__*/external_React_default().createElement(DownloadMobilePromoHighlight, {
      position: `inset-inline-start inset-block-end`,
      dispatch: this.props.dispatch
    })))), /*#__PURE__*/external_React_default().createElement("div", {
      className: outerClassName,
      onClick: this.closeCustomizationMenu
    }, /*#__PURE__*/external_React_default().createElement("main", {
      className: "newtab-main",
      style: this.state.fixedNavStyle
    }, prefs.showSearch && /*#__PURE__*/external_React_default().createElement("div", {
      className: "non-collapsible-section"
    }, /*#__PURE__*/external_React_default().createElement(ErrorBoundary, null, /*#__PURE__*/external_React_default().createElement(Search_Search, Base_extends({
      showLogo: noSectionsEnabled || prefs["logowordmark.alwaysVisible"]
    }, props.Search)))), !prefs.showSearch && !noSectionsEnabled && /*#__PURE__*/external_React_default().createElement(Logo, null), /*#__PURE__*/external_React_default().createElement("div", {
      className: `body-wrapper${initialized ? " on" : ""}`
    }, this.shouldShowOMCHighlight("ActivationWindowMessage") && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
      dispatch: this.props.dispatch
    }, /*#__PURE__*/external_React_default().createElement(ActivationWindowMessage, {
      dispatch: this.props.dispatch,
      messageData: this.props.Messages.messageData
    })), isDiscoveryStream ? /*#__PURE__*/external_React_default().createElement(ErrorBoundary, {
      className: "borderless-error"
    }, /*#__PURE__*/external_React_default().createElement(DiscoveryStreamBase, {
      locale: props.App.locale,
      firstVisibleTimestamp: this.state.firstVisibleTimestamp,
      placeholder: this.isSpocsOnDemandExpired
    })) : /*#__PURE__*/external_React_default().createElement(Sections_Sections, null)), /*#__PURE__*/external_React_default().createElement(ConfirmDialog, null), wallpapersEnabled && this.renderWallpaperAttribution()), /*#__PURE__*/external_React_default().createElement("aside", null, this.props.Notifications?.showNotifications && /*#__PURE__*/external_React_default().createElement(ErrorBoundary, null, /*#__PURE__*/external_React_default().createElement(Notifications_Notifications, {
      dispatch: this.props.dispatch
    }))), mayShowTopicSelection && pocketEnabled && /*#__PURE__*/external_React_default().createElement(TopicSelection, {
      supportUrl: supportUrl
    })), /*#__PURE__*/external_React_default().createElement("menu", {
      className: "personalizeButtonWrapper"
    }, /*#__PURE__*/external_React_default().createElement(CustomizeMenu, {
      onClose: this.closeCustomizationMenu,
      onOpen: this.openCustomizationMenu,
      openPreferences: this.openPreferences,
      setPref: this.setPref,
      enabledSections: enabledSections,
      enabledWidgets: enabledWidgets,
      wallpapersEnabled: wallpapersEnabled,
      activeWallpaper: activeWallpaper,
      pocketRegion: pocketRegion,
      mayHaveTopicSections: mayHavePersonalizedTopicSections,
      mayHaveInferredPersonalization: mayHaveInferredPersonalization,
      mayHaveWeather: mayHaveWeather,
      mayHaveWidgets: mayHaveWidgets,
      mayHaveTimerWidget: mayHaveTimerWidget,
      mayHaveListsWidget: mayHaveListsWidget,
      mayHaveWeatherForecast: prefs["widgets.system.weatherForecast.enabled"],
      weatherDisplay: prefs["weather.display"],
      showing: customizeMenuVisible,
      toggleSectionsMgmtPanel: this.toggleSectionsMgmtPanel,
      showSectionsMgmtPanel: this.state.showSectionsMgmtPanel
    }), this.shouldShowOMCHighlight("CustomWallpaperHighlight") && /*#__PURE__*/external_React_default().createElement(MessageWrapper, {
      dispatch: this.props.dispatch
    }, /*#__PURE__*/external_React_default().createElement(WallpaperFeatureHighlight, {
      position: "inset-block-start inset-inline-start",
      dispatch: this.props.dispatch
    }))));
  }
}
BaseContent.defaultProps = {
  document: __webpack_require__.g.document
};
const Base = (0,external_ReactRedux_namespaceObject.connect)(state => ({
  App: state.App,
  Prefs: state.Prefs,
  Sections: state.Sections,
  DiscoveryStream: state.DiscoveryStream,
  Messages: state.Messages,
  Notifications: state.Notifications,
  Search: state.Search,
  Wallpapers: state.Wallpapers,
  Weather: state.Weather
}))(_Base);
;// CONCATENATED MODULE: ./content-src/lib/detect-user-session-start.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */




const detect_user_session_start_VISIBLE = "visible";
const detect_user_session_start_VISIBILITY_CHANGE_EVENT = "visibilitychange";

class DetectUserSessionStart {
  constructor(store, options = {}) {
    this._store = store;
    // Overrides for testing
    this.document = options.document || globalThis.document;
    this._perfService = options.perfService || perfService;
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
  }

  /**
   * sendEventOrAddListener - Notify immediately if the page is already visible,
   *                    or else set up a listener for when visibility changes.
   *                    This is needed for accurate session tracking for telemetry,
   *                    because tabs are pre-loaded.
   */
  sendEventOrAddListener() {
    if (this.document.visibilityState === detect_user_session_start_VISIBLE) {
      // If the document is already visible, to the user, send a notification
      // immediately that a session has started.
      this._sendEvent();
    } else {
      // If the document is not visible, listen for when it does become visible.
      this.document.addEventListener(
        detect_user_session_start_VISIBILITY_CHANGE_EVENT,
        this._onVisibilityChange
      );
    }
  }

  /**
   * _sendEvent - Sends a message to the main process to indicate the current
   *              tab is now visible to the user, includes the
   *              visibility_event_rcvd_ts time in ms from the UNIX epoch.
   */
  _sendEvent() {
    this._perfService.mark("visibility_event_rcvd_ts");

    try {
      let visibility_event_rcvd_ts =
        this._perfService.getMostRecentAbsMarkStartByName(
          "visibility_event_rcvd_ts"
        );

      this._store.dispatch(
        actionCreators.AlsoToMain({
          type: actionTypes.SAVE_SESSION_PERF_DATA,
          data: {
            visibility_event_rcvd_ts,
            window_inner_width: window.innerWidth,
            window_inner_height: window.innerHeight,
          },
        })
      );
    } catch (ex) {
      // If this failed, it's likely because the `privacy.resistFingerprinting`
      // pref is true.  We should at least not blow up.
    }
  }

  /**
   * _onVisibilityChange - If the visibility has changed to visible, sends a notification
   *                      and removes the event listener. This should only be called once per tab.
   */
  _onVisibilityChange() {
    if (this.document.visibilityState === detect_user_session_start_VISIBLE) {
      this._sendEvent();
      this.document.removeEventListener(
        detect_user_session_start_VISIBILITY_CHANGE_EVENT,
        this._onVisibilityChange
      );
    }
  }
}

;// CONCATENATED MODULE: external "Redux"
const external_Redux_namespaceObject = Redux;
;// CONCATENATED MODULE: ./content-src/lib/init-store.mjs
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */


// We disable import checking here as redux is installed via the npm packages
// at the newtab level, rather than in the top-level package.json.
// eslint-disable-next-line import/no-unresolved


const MERGE_STORE_ACTION = "NEW_TAB_INITIAL_STATE";
const OUTGOING_MESSAGE_NAME = "ActivityStream:ContentToMain";
const INCOMING_MESSAGE_NAME = "ActivityStream:MainToContent";

/**
 * A higher-order function which returns a reducer that, on MERGE_STORE action,
 * will return the action.data object merged into the previous state.
 *
 * For all other actions, it merely calls mainReducer.
 *
 * Because we want this to merge the entire state object, it's written as a
 * higher order function which takes the main reducer (itself often a call to
 * combineReducers) as a parameter.
 *
 * @param  {function} mainReducer reducer to call if action != MERGE_STORE_ACTION
 * @return {function}             a reducer that, on MERGE_STORE_ACTION action,
 *                                will return the action.data object merged
 *                                into the previous state, and the result
 *                                of calling mainReducer otherwise.
 */
function mergeStateReducer(mainReducer) {
  return (prevState, action) => {
    if (action.type === MERGE_STORE_ACTION) {
      return { ...prevState, ...action.data };
    }

    return mainReducer(prevState, action);
  };
}

/**
 * messageMiddleware - Middleware that looks for SentToMain type actions, and sends them if necessary
 */
const messageMiddleware = () => next => action => {
  const skipLocal = action.meta && action.meta.skipLocal;
  if (actionUtils.isSendToMain(action)) {
    RPMSendAsyncMessage(OUTGOING_MESSAGE_NAME, action);
  }
  if (!skipLocal) {
    next(action);
  }
};

const rehydrationMiddleware = ({ getState }) => {
  // NB: The parameter here is MiddlewareAPI which looks like a Store and shares
  // the same getState, so attached properties are accessible from the store.
  getState.didRehydrate = false;
  getState.didRequestInitialState = false;
  return next => action => {
    if (getState.didRehydrate || window.__FROM_STARTUP_CACHE__) {
      // Startup messages can be safely ignored by the about:home document
      // stored in the startup cache.
      if (
        window.__FROM_STARTUP_CACHE__ &&
        action.meta &&
        action.meta.isStartup
      ) {
        return null;
      }
      return next(action);
    }

    const isMergeStoreAction = action.type === MERGE_STORE_ACTION;
    const isRehydrationRequest = action.type === actionTypes.NEW_TAB_STATE_REQUEST;

    if (isRehydrationRequest) {
      getState.didRequestInitialState = true;
      return next(action);
    }

    if (isMergeStoreAction) {
      getState.didRehydrate = true;
      return next(action);
    }

    // If init happened after our request was made, we need to re-request
    if (getState.didRequestInitialState && action.type === actionTypes.INIT) {
      return next(actionCreators.AlsoToMain({ type: actionTypes.NEW_TAB_STATE_REQUEST }));
    }

    if (
      actionUtils.isBroadcastToContent(action) ||
      actionUtils.isSendToOneContent(action) ||
      actionUtils.isSendToPreloaded(action)
    ) {
      // Note that actions received before didRehydrate will not be dispatched
      // because this could negatively affect preloading and the the state
      // will be replaced by rehydration anyway.
      return null;
    }

    return next(action);
  };
};

/**
 * initStore - Create a store and listen for incoming actions
 *
 * @param  {object} reducers An object containing Redux reducers
 * @param  {object} intialState (optional) The initial state of the store, if desired
 * @return {object}          A redux store
 */
function initStore(reducers, initialState) {
  const store = (0,external_Redux_namespaceObject.createStore)(
    mergeStateReducer((0,external_Redux_namespaceObject.combineReducers)(reducers)),
    initialState,
    globalThis.RPMAddMessageListener &&
      (0,external_Redux_namespaceObject.applyMiddleware)(rehydrationMiddleware, messageMiddleware)
  );

  if (globalThis.RPMAddMessageListener) {
    globalThis.RPMAddMessageListener(INCOMING_MESSAGE_NAME, msg => {
      try {
        store.dispatch(msg.data);
      } catch (ex) {
        console.error("Content msg:", msg, "Dispatch error: ", ex);
        dump(
          `Content msg: ${JSON.stringify(msg)}\nDispatch error: ${ex}\n${
            ex.stack
          }`
        );
      }
    });
  }

  return store;
}

;// CONCATENATED MODULE: external "ReactDOM"
const external_ReactDOM_namespaceObject = ReactDOM;
var external_ReactDOM_default = /*#__PURE__*/__webpack_require__.n(external_ReactDOM_namespaceObject);
;// CONCATENATED MODULE: ./content-src/activity-stream.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */









const NewTab = ({
  store
}) => /*#__PURE__*/external_React_default().createElement(external_ReactRedux_namespaceObject.Provider, {
  store: store
}, /*#__PURE__*/external_React_default().createElement(Base, null));
function doRequestWhenReady() {
  // If this document has already gone into the background by the time we've reached
  // here, we can deprioritize the request until the event loop
  // frees up. If, however, the visibility changes, we then send the request.
  const doRequestPromise = new Promise(resolve => {
    let didRequest = false;
    let requestIdleCallbackId = 0;
    function doRequest() {
      if (!didRequest) {
        if (requestIdleCallbackId) {
          cancelIdleCallback(requestIdleCallbackId);
        }
        didRequest = true;
        resolve();
      }
    }
    if (document.hidden) {
      requestIdleCallbackId = requestIdleCallback(doRequest);
      addEventListener("visibilitychange", doRequest, {
        once: true
      });
    } else {
      resolve();
    }
  });
  return doRequestPromise;
}
function renderWithoutState() {
  const store = initStore(reducers);
  new DetectUserSessionStart(store).sendEventOrAddListener();
  doRequestWhenReady().then(() => {
    // If state events happened before we got here, we can request state again.
    store.dispatch(actionCreators.AlsoToMain({
      type: actionTypes.NEW_TAB_STATE_REQUEST
    }));
    // If we rendered without state, we don't need the startup cache.
    store.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.NEW_TAB_STATE_REQUEST_WITHOUT_STARTUPCACHE
    }));
  });
  external_ReactDOM_default().hydrate(/*#__PURE__*/external_React_default().createElement(NewTab, {
    store: store
  }), document.getElementById("root"));
}
function renderCache(initialState) {
  if (initialState) {
    initialState.App.isForStartupCache.App = false;
  }
  const store = initStore(reducers, initialState);
  new DetectUserSessionStart(store).sendEventOrAddListener();
  doRequestWhenReady().then(() => {
    // If state events happened before we got here,
    // we can notify main that we need updates.
    // The individual feeds know what state is not cached.
    store.dispatch(actionCreators.OnlyToMain({
      type: actionTypes.NEW_TAB_STATE_REQUEST_STARTUPCACHE
    }));
  });
  external_ReactDOM_default().hydrate(/*#__PURE__*/external_React_default().createElement(NewTab, {
    store: store
  }), document.getElementById("root"));
}
NewtabRenderUtils = __webpack_exports__;
/******/ })()
;