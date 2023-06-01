/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// State
const {
  FilterState,
} = require("resource://devtools/client/webconsole/reducers/filters.js");
const {
  PrefState,
} = require("resource://devtools/client/webconsole/reducers/prefs.js");
const {
  UiState,
} = require("resource://devtools/client/webconsole/reducers/ui.js");

// Redux
const {
  applyMiddleware,
  compose,
  createStore,
} = require("resource://devtools/client/shared/vendor/redux.js");

// Prefs
const { PREFS } = require("resource://devtools/client/webconsole/constants.js");
const {
  getPrefsService,
} = require("resource://devtools/client/webconsole/utils/prefs.js");

// Reducers
const {
  reducers,
} = require("resource://devtools/client/webconsole/reducers/index.js");

// Middlewares
const {
  ignore,
} = require("resource://devtools/client/shared/redux/middleware/ignore.js");
const eventTelemetry = require("resource://devtools/client/webconsole/middleware/event-telemetry.js");
const historyPersistence = require("resource://devtools/client/webconsole/middleware/history-persistence.js");
const performanceMarker = require("resource://devtools/client/webconsole/middleware/performance-marker.js");
const {
  thunk,
} = require("resource://devtools/client/shared/redux/middleware/thunk.js");

// Enhancers
const enableBatching = require("resource://devtools/client/webconsole/enhancers/batching.js");
const enableActorReleaser = require("resource://devtools/client/webconsole/enhancers/actor-releaser.js");
const ensureCSSErrorReportingEnabled = require("resource://devtools/client/webconsole/enhancers/css-error-reporting.js");
const enableMessagesCacheClearing = require("resource://devtools/client/webconsole/enhancers/message-cache-clearing.js");

/**
 * Create and configure store for the Console panel. This is the place
 * where various enhancers and middleware can be registered.
 */
function configureStore(webConsoleUI, options = {}) {
  const prefsService = getPrefsService(webConsoleUI);
  const { getBoolPref, getIntPref } = prefsService;

  const logLimit =
    options.logLimit || Math.max(getIntPref("devtools.hud.loglimit"), 1);
  const sidebarToggle = getBoolPref(PREFS.FEATURES.SIDEBAR_TOGGLE);
  const autocomplete = getBoolPref(PREFS.FEATURES.AUTOCOMPLETE);
  const eagerEvaluation = getBoolPref(PREFS.FEATURES.EAGER_EVALUATION);
  const groupWarnings = getBoolPref(PREFS.FEATURES.GROUP_WARNINGS);
  const historyCount = getIntPref(PREFS.UI.INPUT_HISTORY_COUNT);

  const initialState = {
    prefs: PrefState({
      logLimit,
      sidebarToggle,
      autocomplete,
      eagerEvaluation,
      historyCount,
      groupWarnings,
    }),
    filters: FilterState({
      error: getBoolPref(PREFS.FILTER.ERROR),
      warn: getBoolPref(PREFS.FILTER.WARN),
      info: getBoolPref(PREFS.FILTER.INFO),
      debug: getBoolPref(PREFS.FILTER.DEBUG),
      log: getBoolPref(PREFS.FILTER.LOG),
      css: getBoolPref(PREFS.FILTER.CSS),
      net: getBoolPref(PREFS.FILTER.NET),
      netxhr: getBoolPref(PREFS.FILTER.NETXHR),
    }),
    ui: UiState({
      networkMessageActiveTabId: "headers",
      persistLogs: getBoolPref(PREFS.UI.PERSIST),
      editor: getBoolPref(PREFS.UI.EDITOR),
      editorWidth: getIntPref(PREFS.UI.EDITOR_WIDTH),
      showEditorOnboarding: getBoolPref(PREFS.UI.EDITOR_ONBOARDING),
      timestampsVisible: getBoolPref(PREFS.UI.MESSAGE_TIMESTAMP),
      showEvaluationContextSelector: getBoolPref(PREFS.UI.CONTEXT_SELECTOR),
      enableNetworkMonitoring:
        webConsoleUI.isBrowserConsole || webConsoleUI.isBrowserToolboxConsole
          ? getBoolPref(PREFS.UI.ENABLE_NETWORK_MONITORING)
          : true,
    }),
  };

  const { toolbox } = options.thunkArgs;
  const sessionId = (toolbox && toolbox.sessionId) || -1;
  const middleware = applyMiddleware(
    performanceMarker(sessionId),
    ignore,
    thunk({
      prefsService,
      ...options.thunkArgs,
    }),
    historyPersistence.bind(null, webConsoleUI),
    eventTelemetry.bind(null, options.telemetry)
  );

  return createStore(
    createRootReducer(),
    initialState,
    compose(
      middleware,
      enableActorReleaser(webConsoleUI),
      enableMessagesCacheClearing(webConsoleUI),
      ensureCSSErrorReportingEnabled(webConsoleUI),
      // ⚠️ Keep this one last so it will be executed before all the other ones. This is
      // needed so batched actions can be "unbatched" and handled in the other enhancers.
      enableBatching()
    )
  );
}

function createRootReducer() {
  return function rootReducer(state, action) {
    // We want to compute the new state for all properties except
    // "messages" and "history". These two reducers are handled
    // separately since they are receiving additional arguments.
    const newState = Object.entries(reducers).reduce((res, [key, reducer]) => {
      if (key !== "messages" && key !== "history") {
        res[key] = reducer(state[key], action);
      }
      return res;
    }, {});

    // Pass prefs state as additional argument to the history reducer.
    newState.history = reducers.history(state.history, action, newState.prefs);

    // Specifically pass the updated filters, prefs and ui states as additional arguments.
    newState.messages = reducers.messages(
      state.messages,
      action,
      newState.filters,
      newState.prefs,
      newState.ui
    );

    return newState;
  };
}

// Provide the store factory for test code so that each test is working with
// its own instance.
module.exports.configureStore = configureStore;
