/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

// paneSync is the default settings pane when browser.settings-redesign.enabled
// is true.
const DEFAULT_PANE = SRD_PREF_VALUE ? "paneSync" : "paneGeneral";
