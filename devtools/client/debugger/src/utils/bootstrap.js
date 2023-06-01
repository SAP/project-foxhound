/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

import React from "react";
import { bindActionCreators, combineReducers } from "redux";
import ReactDOM from "react-dom";
const { Provider } = require("react-redux");

import ToolboxProvider from "devtools/client/framework/store-provider";
import flags from "devtools/shared/flags";
const {
  registerStoreObserver,
} = require("devtools/client/shared/redux/subscriber");

const { AppConstants } = ChromeUtils.importESModule(
  "resource://gre/modules/AppConstants.sys.mjs"
);

import { SearchDispatcher } from "../workers/search";
import { PrettyPrintDispatcher } from "../workers/pretty-print";

import configureStore from "../actions/utils/create-store";
import reducers from "../reducers";
import * as selectors from "../selectors";
import App from "../components/App";
import { asyncStore, prefs } from "./prefs";
import { persistTabs } from "../utils/tabs";
const { sanitizeBreakpoints } = require("devtools/client/shared/thread-utils");

let gWorkers;

export function bootstrapStore(client, workers, panel, initialState) {
  const debugJsModules = AppConstants.DEBUG_JS_MODULES == "1";
  const createStore = configureStore({
    log: prefs.logging || flags.testing,
    timing: debugJsModules,
    makeThunkArgs: (args, state) => {
      return { ...args, client, ...workers, panel };
    },
  });

  const store = createStore(combineReducers(reducers), initialState);
  registerStoreObserver(store, updatePrefs);

  const actions = bindActionCreators(
    require("../actions").default,
    store.dispatch
  );

  return { store, actions, selectors };
}

export function bootstrapWorkers(panelWorkers) {
  // The panel worker will typically be the source map and parser workers.
  // Both will be managed by the toolbox.
  gWorkers = {
    prettyPrintWorker: new PrettyPrintDispatcher(),
    searchWorker: new SearchDispatcher(),
  };
  return { ...panelWorkers, ...gWorkers };
}

export function teardownWorkers() {
  gWorkers.prettyPrintWorker.stop();
  gWorkers.searchWorker.stop();
}

/**
 * Create and mount the root App component.
 *
 * @param {ReduxStore} store
 * @param {ReduxStore} toolboxStore
 * @param {Object} appComponentAttributes
 * @param {Array} appComponentAttributes.fluentBundles
 * @param {Document} appComponentAttributes.toolboxDoc
 */
export function bootstrapApp(store, toolboxStore, appComponentAttributes = {}) {
  const mount = getMountElement();
  if (!mount) {
    return;
  }

  ReactDOM.render(
    React.createElement(
      Provider,
      { store },
      React.createElement(
        ToolboxProvider,
        { store: toolboxStore },
        React.createElement(App, appComponentAttributes)
      )
    ),
    mount
  );
}

function getMountElement() {
  return document.querySelector("#mount");
}

// This is the opposite of bootstrapApp
export function unmountRoot() {
  ReactDOM.unmountComponentAtNode(getMountElement());
}

function updatePrefs(state, oldState) {
  const hasChanged = selector =>
    selector(oldState) && selector(oldState) !== selector(state);

  if (hasChanged(selectors.getPendingBreakpoints)) {
    asyncStore.pendingBreakpoints = sanitizeBreakpoints(
      selectors.getPendingBreakpoints(state)
    );
  }

  if (
    oldState.eventListenerBreakpoints &&
    oldState.eventListenerBreakpoints !== state.eventListenerBreakpoints
  ) {
    asyncStore.eventListenerBreakpoints = state.eventListenerBreakpoints;
  }

  if (hasChanged(selectors.getTabs)) {
    asyncStore.tabs = persistTabs(selectors.getTabs(state));
  }

  if (hasChanged(selectors.getXHRBreakpoints)) {
    asyncStore.xhrBreakpoints = selectors.getXHRBreakpoints(state);
  }

  if (hasChanged(selectors.getBlackBoxRanges)) {
    asyncStore.blackboxedRanges = selectors.getBlackBoxRanges(state);
  }
}
