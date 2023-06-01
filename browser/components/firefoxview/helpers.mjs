/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { XPCOMUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/XPCOMUtils.sys.mjs"
);

const lazy = {};
ChromeUtils.defineESModuleGetters(lazy, {
  BrowserUtils: "resource://gre/modules/BrowserUtils.sys.mjs",
  PlacesUIUtils: "resource:///modules/PlacesUIUtils.sys.mjs",
});

XPCOMUtils.defineLazyGetter(lazy, "relativeTimeFormat", () => {
  return new Services.intl.RelativeTimeFormat(undefined, { style: "narrow" });
});

// Cutoff of 1.5 minutes + 1 second to determine what text string to display
export const NOW_THRESHOLD_MS = 91000;

export function formatURIForDisplay(uriString) {
  return lazy.BrowserUtils.formatURIStringForDisplay(uriString);
}

export function convertTimestamp(
  timestamp,
  fluentStrings,
  _nowThresholdMs = NOW_THRESHOLD_MS
) {
  if (!timestamp) {
    // It's marginally better to show nothing instead of "53 years ago"
    return "";
  }
  const elapsed = Date.now() - timestamp;
  let formattedTime;
  if (elapsed <= _nowThresholdMs) {
    // Use a different string for very recent timestamps
    formattedTime = fluentStrings.formatValueSync(
      "firefoxview-just-now-timestamp"
    );
  } else {
    formattedTime = lazy.relativeTimeFormat.formatBestUnit(new Date(timestamp));
  }
  return formattedTime;
}

export function createFaviconElement(image, targetURI = "") {
  const imageUrl = image
    ? lazy.PlacesUIUtils.getImageURL(image)
    : `page-icon:${targetURI}`;
  let favicon = document.createElement("div");

  favicon.style.backgroundImage = `url('${imageUrl}')`;
  favicon.classList.add("favicon");
  return favicon;
}

export function getImageUrl(icon, targetURI) {
  return icon ? lazy.PlacesUIUtils.getImageURL(icon) : `page-icon:${targetURI}`;
}

export function onToggleContainer(detailsContainer) {
  // Ignore early `toggle` events, which may either be fired because the
  // UI sections update visibility on component connected (based on persisted
  // UI state), or because <details> elements fire `toggle` events when added
  // to the DOM with the "open" attribute set. In either case, we don't want
  // to record telemetry as these events aren't the result of user action.
  if (detailsContainer.ownerDocument.readyState != "complete") {
    return;
  }

  const isOpen = detailsContainer.open;
  const isTabPickup = detailsContainer.id === "tab-pickup-container";

  const newFluentString = isOpen
    ? "firefoxview-collapse-button-hide"
    : "firefoxview-collapse-button-show";

  detailsContainer
    .querySelector(".twisty")
    .setAttribute("data-l10n-id", newFluentString);

  if (isTabPickup) {
    Services.telemetry.recordEvent(
      "firefoxview",
      "tab_pickup_open",
      "tabs",
      isOpen.toString()
    );
    Services.prefs.setBoolPref(
      "browser.tabs.firefox-view.ui-state.tab-pickup.open",
      isOpen
    );
  } else {
    Services.telemetry.recordEvent(
      "firefoxview",
      "closed_tabs_open",
      "tabs",
      isOpen.toString()
    );
    Services.prefs.setBoolPref(
      "browser.tabs.firefox-view.ui-state.recently-closed-tabs.open",
      isOpen
    );
  }
}
