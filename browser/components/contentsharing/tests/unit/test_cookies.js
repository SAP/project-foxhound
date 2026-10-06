/* Any copyright is dedicated to the Public Domain.
https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

add_setup(function () {
  let serverURL = Services.prefs.getStringPref(
    "browser.contentsharing.server.url",
    ""
  );
  Services.prefs.setStringPref(
    "browser.contentsharing.server.url",
    "https://localhost"
  );
  registerCleanupFunction(() => {
    Services.prefs.setStringPref(
      "browser.contentsharing.server.url",
      serverURL
    );
  });
});

add_task(async function test_valid_cookie() {
  setCookie("auth", "valid_session");
  Assert.ok(
    ContentSharingUtils.isSignedIn(),
    "Should return true if there is a valid auth cookie"
  );

  Assert.equal(
    "valid_session",
    ContentSharingUtils.getCookie(),
    "Should get the expected cookie value"
  );
  clearCookies();
});

add_task(async function test_missing_cookie() {
  Assert.ok(
    !ContentSharingUtils.isSignedIn(),
    "Should return false if there is no cookie"
  );
});

add_task(async function test_expired_cookie_check() {
  setCookie("auth", "valid_session", -100);
  Assert.ok(
    !ContentSharingUtils.isSignedIn(),
    "Should return false if there is an expired auth cookie"
  );
  clearCookies();
});
