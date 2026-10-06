/* Any copyright is dedicated to the Public Domain.
 * https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const SERVER_URL_PREF = "browser.contentsharing.server.url";
const TIMEOUT_PREF = "browser.contentsharing.automation.detectLoginTimeoutMS";

add_setup(function () {
  let serverURL = Services.prefs.getStringPref(SERVER_URL_PREF, "");
  Services.prefs.setStringPref(SERVER_URL_PREF, "https://localhost");
  registerCleanupFunction(() => {
    Services.prefs.setStringPref(SERVER_URL_PREF, serverURL);
    Services.prefs.clearUserPref(TIMEOUT_PREF);
  });
});

add_task(async function test_detectLogin_resolves_when_auth_cookie_set() {
  clearCookies();
  Assert.ok(
    !ContentSharingUtils.observingCookieChange,
    "We should not be observing yet."
  );
  Services.prefs.setIntPref(TIMEOUT_PREF, 2000);
  let promise = ContentSharingUtils.detectLogin();
  setCookie("auth", 1);
  try {
    await promise;
    Assert.ok(true, "detectLogin resolved after the auth cookie was set");
  } catch (ex) {
    Assert.ok(
      false,
      "detectLogin did not resolve after the auth cookie was set"
    );
  } finally {
    clearCookies();
  }
});

add_task(async function test_detectLogin_rejects_on_timeout() {
  clearCookies();
  Assert.ok(
    !ContentSharingUtils.observingCookieChange,
    "We should not be observing yet."
  );
  Services.prefs.setIntPref(TIMEOUT_PREF, 50);
  let promise = ContentSharingUtils.detectLogin();
  try {
    await promise;
    Assert.ok(
      false,
      "detectLogin did not reject when the auth cookie was not set"
    );
  } catch (ex) {
    Assert.ok(
      true,
      "detectLogin should reject if the auth cookie is not set before timeout"
    );
  } finally {
    clearCookies();
  }
});

// If the wrong cookie is set, we should still reject.
add_task(
  async function test_detectLogin_not_resolves_when_session_cookie_set() {
    clearCookies();
    Assert.ok(
      !ContentSharingUtils.observingCookieChange,
      "We should not be observing yet."
    );
    Services.prefs.setIntPref(TIMEOUT_PREF, 50);
    let promise = ContentSharingUtils.detectLogin();
    setCookie("sessionid", "1234567890");
    try {
      await promise;
      Assert.ok(
        false,
        "detectLogin did not reject when the auth cookie was not set"
      );
    } catch (ex) {
      Assert.ok(
        true,
        "detectLogin should reject if the auth cookie is not set before timeout"
      );
    } finally {
      clearCookies();
    }
  }
);
