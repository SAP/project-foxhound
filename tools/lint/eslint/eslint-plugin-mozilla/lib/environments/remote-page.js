/**
 * @fileoverview Defines the environment for remote page.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

module.exports = {
  globals: {
    atob: false,
    btoa: false,
    RPMAddTRRExcludedDomain: false,
    RPMGetAppBuildID: false,
    RPMGetInnerMostURI: false,
    RPMGetIntPref: false,
    RPMGetStringPref: false,
    RPMGetBoolPref: false,
    RPMSetBoolPref: false,
    RPMGetFormatURLPref: false,
    RPMIsTRROnlyFailure: false,
    RPMIsFirefox: false,
    RPMIsNativeFallbackFailure: false,
    RPMIsWindowPrivate: false,
    RPMSendAsyncMessage: false,
    RPMSendQuery: false,
    RPMAddMessageListener: false,
    RPMRecordTelemetryEvent: false,
    RPMCheckAlternateHostAvailable: false,
    RPMAddToHistogram: false,
    RPMRemoveMessageListener: false,
    RPMGetHttpResponseHeader: false,
    RPMTryPingSecureWWWLink: false,
    RPMOpenSecureWWWLink: false,
    RPMOpenPreferences: false,
    RPMGetTRRSkipReason: false,
    RPMGetTRRDomain: false,
    RPMIsSiteSpecificTRRError: false,
  },
};
