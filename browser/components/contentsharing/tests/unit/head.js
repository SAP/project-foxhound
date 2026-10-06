/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

ChromeUtils.defineESModuleGetters(this, {
  ContentSharingUtils:
    "resource:///modules/contentsharing/ContentSharingUtils.sys.mjs",
  makeShareResult:
    "resource:///modules/contentsharing/ContentSharingUtils.sys.mjs",
  ERRORS: "resource:///modules/contentsharing/ContentSharingUtils.sys.mjs",
});

/**
 * Sets a cookie for test purposes.
 *
 * @param {string} name Name of the cookie (ours will usually be "auth")
 * @param {string} value Value of the cookie
 * @param {number} [expiry] Optional, Cookie expiry time in milliseconds in
 *                          the future (or past), defaults to 5 minutes.
 * @param {string} [host] Optional, defaults to "localhost".
 */
function setCookie(name, value, expiry = 1000 * 60 * 5, host = "localhost") {
  Services.cookies.add(
    host,
    "/",
    name,
    value,
    true, // isSecure
    false, // isHttpOnly
    false, // isSession
    Date.now() + expiry,
    {}, // originAttributes
    Ci.nsICookie.SAMESITE_LAX,
    Ci.nsICookie.SCHEME_HTTPS
  );
}

function clearCookies() {
  Services.cookies.removeAll();
}
