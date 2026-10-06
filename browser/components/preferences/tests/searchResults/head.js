/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

// paneGeneral does not exist in the settings redesign UI; tests that just
// need any pane open to exercise the search bar fall back to paneSync.
const DEFAULT_PANE = SRD_PREF_VALUE ? "paneSync" : "paneGeneral";
