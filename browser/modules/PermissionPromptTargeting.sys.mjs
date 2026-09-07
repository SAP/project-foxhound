/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lazy = {};

ChromeUtils.defineESModuleGetters(lazy, {
  TargetingContext: "resource://messaging-system/targeting/Targeting.sys.mjs",
});

export const PERMISSION_UI_FEATURE_ID = "webNotificationsPermissionUi";

const ALLOWED_LOGO_SCHEMES = ["chrome:", "resource:", "https:"];

export function isValidLogoUrl(url) {
  if (typeof url !== "string" || !url) {
    return false;
  }
  try {
    let uri = Services.io.newURI(url);
    return ALLOWED_LOGO_SCHEMES.includes(uri.scheme + ":");
  } catch (e) {
    return false;
  }
}

export async function evalPermissionPromptTargeting(jexlString, siteCategory) {
  if (!jexlString) {
    return true;
  }
  try {
    let targetingContext = new lazy.TargetingContext(
      { webNotificationSiteCategory: siteCategory },
      { source: PERMISSION_UI_FEATURE_ID }
    );
    return !!(await targetingContext.evalWithDefault(jexlString));
  } catch (e) {
    console.error("webNotificationsPermissionUi targeting eval failed:", e);
    return false;
  }
}
