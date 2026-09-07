/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  SearchUtils: "moz-src:///toolkit/components/search/SearchUtils.sys.mjs",
});

ChromeUtils.defineLazyGetter(this, "UrlbarSearchUtils", () => {
  const { UrlbarSearchUtils } = ChromeUtils.importESModule(
    "moz-src:///browser/components/urlbar/UrlbarSearchUtils.sys.mjs"
  );
  UrlbarSearchUtils.init(this);
  return UrlbarSearchUtils;
});

ChromeUtils.defineLazyGetter(this, "PlacesFrecencyRecalculator", () => {
  return Cc["@mozilla.org/places/frecency-recalculator;1"].getService(
    Ci.nsIObserver
  ).wrappedJSObject;
});

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/urlbar/tests/browser/head-common.js",
  this
);

registerCleanupFunction(async () => {
  await UrlbarTestUtils.promisePopupClose(window);
});

/**
 * Switches focus to the search mode switcher.
 *
 * @param {ChromeWindow} [win]
 */
async function focusSearchModeSwitcher(win = window) {
  await UrlbarTestUtils.promiseAutocompleteResultPopup({
    window: win,
    waitForFocus: true,
    value: "",
    fireInputEvent: true,
  });
  Assert.ok(win.gURLBar.hasAttribute("focused"), "Urlbar was focused");

  EventUtils.synthesizeKey("KEY_Tab", { shiftKey: true }, win);
  let switcher = win.gURLBar.querySelector(".searchmode-switcher");
  await BrowserTestUtils.waitForCondition(
    () => win.document.activeElement == switcher
  );
  Assert.ok(true, "Search mode switcher was focused");
}
