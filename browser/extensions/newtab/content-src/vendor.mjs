/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

// Vendor bundle that exposes React 19 and related libraries as globals
// This is used by both the main page and the cache.worker.js for SSR

import React from "react";
import * as ReactDOMNamespace from "react-dom";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString, renderToStaticMarkup } from "react-dom/server.browser";
import PropTypes from "prop-types";
import * as ReactTransitionGroup from "react-transition-group";
import * as ReactRedux from "react-redux";
import * as Redux from "redux";

// Detect if we're in a worker or window context
const globalScope = typeof window !== "undefined" ? window : self;

// Export as globals
// React 19 splits functionality across react-dom, react-dom/client, and react-dom/server
// We need to export them separately and as a merged ReactDOM for compatibility
globalScope.React = React;

// Export the merged ReactDOM (includes both react-dom and react-dom/client functions)
const mergedReactDOM = Object.assign({}, ReactDOMNamespace, {
  createRoot,
  hydrateRoot,
});

globalScope.ReactDOM = mergedReactDOM;

globalScope.ReactDOMServer = {
  renderToString,
  renderToStaticMarkup,
};

globalScope.PropTypes = PropTypes;

// Export react-transition-group compatible with React 19
globalScope.ReactTransitionGroup = ReactTransitionGroup;

// Export react-redux compatible with React 19
globalScope.ReactRedux = ReactRedux;

// Export redux
globalScope.Redux = Redux;
