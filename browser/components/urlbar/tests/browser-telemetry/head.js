/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "PlacesFrecencyRecalculator", () => {
  return Cc["@mozilla.org/places/frecency-recalculator;1"].getService(
    Ci.nsIObserver
  ).wrappedJSObject;
});

ChromeUtils.defineLazyGetter(this, "SearchUITestUtils", () => {
  let { SearchUITestUtils } = ChromeUtils.importESModule(
    "resource://testing-common/SearchUITestUtils.sys.mjs"
  );
  SearchUITestUtils.init(this);
  return SearchUITestUtils;
});

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/head-common.js",
  this
);

registerCleanupFunction(async () => {
  await UrlbarTestUtils.promisePopupClose(window);
});

function clearSAPTelemetry() {
  TelemetryTestUtils.getAndClearKeyedHistogram("SEARCH_COUNTS");
  Services.fog.testResetFOG();
}
