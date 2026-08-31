/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.extension = class extends ExtensionAPI {
  getAPI(context) {
    return {
      extension: {
        get lastError() {
          return context.lastError;
        },

        isAllowedIncognitoAccess() {
          return context.privateBrowsingAllowed;
        },

        isAllowedFileSchemeAccess() {
          if (
            !Services.prefs.getBoolPref(
              "extensions.webextensions.fileSchemeAccess.requireOptIn"
            )
          ) {
            // Historically, we returned false here even when extensions had
            // the ability to run content scripts in file:. When the preference
            // disables the required opt-in, we maintain this historical
            // behavior instead of returning true.
            return false;
          }
          return context.extension.policy.fileSchemeAllowed;
        },
      },
    };
  }
};
