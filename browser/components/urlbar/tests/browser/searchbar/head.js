/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  CustomizableUITestUtils:
    "resource://testing-common/CustomizableUITestUtils.sys.mjs",
  SearchService: "moz-src:///toolkit/components/search/SearchService.sys.mjs",
  SearchUITestUtils: "resource://testing-common/SearchUITestUtils.sys.mjs",
  SearchUtils: "moz-src:///toolkit/components/search/SearchUtils.sys.mjs",
  TelemetryTestUtils: "resource://testing-common/TelemetryTestUtils.sys.mjs",
  UrlbarPrefs: "moz-src:///browser/components/urlbar/UrlbarPrefs.sys.mjs",
  UrlbarResult: "chrome://browser/content/urlbar/UrlbarResult.mjs",
  UrlbarUtils: "moz-src:///browser/components/urlbar/UrlbarUtils.sys.mjs",
  sinon: "resource://testing-common/Sinon.sys.mjs",
});

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/head-common.js",
  this
);

let gCUITestUtils = new CustomizableUITestUtils(window);

add_setup(async () => {
  await gCUITestUtils.addSearchBar();
});

registerCleanupFunction(async () => {
  document.getElementById("searchbar-new").handleRevert();
  await SearchbarTestUtils.promisePopupClose(window);
  await gCUITestUtils.removeSearchBar();
  await SearchbarTestUtils.formHistory.clear();
  Services.prefs.clearUserPref("browser.search.widget.lastUsed");
});
