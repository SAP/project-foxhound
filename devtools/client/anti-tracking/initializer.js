/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { BrowserLoader } = ChromeUtils.importESModule(
  "resource://devtools/shared/loader/browser-loader.sys.mjs"
);
const require = BrowserLoader({
  baseURI: "resource://devtools/client/anti-tracking/",
  window,
}).require;

const {
  WebcompatTrackerDebugger,
} = require("resource://devtools/client/anti-tracking/webcompat-tracker-debugger.js");

window.AntiTracking = {
  debugger: null,

  async bootstrap({ commands }) {
    this.debugger = new WebcompatTrackerDebugger(commands);
  },

  async destroy() {
    if (this.debugger) {
      await this.debugger.destroy();
      this.debugger = null;
    }
  },
};
