/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const LINKS = Object.freeze({
  // Used for the upgrade button in the main panel view
  get PRODUCT_URL() {
    return (
      Services.prefs.getCharPref(
        "browser.ipProtection.productVpn.endpoint",
        "https://www.mozilla.org"
      ) +
      "/products/vpn/?utm_medium=firefox-desktop&utm_source=vpn-panel&utm_campaign=fx-vpn&utm_content=upgrade-button"
    );
  },

  SUPPORT_SLUG: "built-in-vpn",
});

export const ERRORS = Object.freeze({
  GENERIC: "generic-error",
  NETWORK: "network-error",
  TIMEOUT: "timeout-error", // Activation took too long and was aborted
  MISSING_PROMISE: "missing-activation-promise", // Expected promise was not returned
  MISSING_ABORT: "missing-abort-controller", // Expected abort controller was not returned
  PASS_UNAVAILABLE: "pass-unavailable", // No pass was returned from the server
  SERVER_NOT_FOUND: "server-not-found", // No server was found for the location
});

export const SIGNIN_DATA = Object.freeze({
  where: "tab",
  entrypoint: "vpn_integration_panel",
  autoClose: false,
  extraParams: {
    service: "vpn",
    utm_campaign: "fx-vpn",
    utm_medium: "firefox-desktop",
  },
});

export const ONBOARDING_PREF_FLAGS = {
  EVER_TURNED_ON_AUTOSTART: 1 << 0,
  EVER_USED_SITE_EXCEPTIONS: 1 << 1,
  EVER_TURNED_ON_VPN: 1 << 2,
};

export const BANDWIDTH = Object.freeze({
  BYTES_IN_GB: Math.pow(2, 30),
  BYTES_IN_MB: Math.pow(2, 20),
  MAX_IN_GB: 50,
  FIRST_THRESHOLD: 0.5,
  SECOND_THRESHOLD: 0.25,
  THIRD_THRESHOLD: 0.1,
});
