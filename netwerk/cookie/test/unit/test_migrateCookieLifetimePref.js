/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/*
  Tests that
  - the migration code runs,
  - the sanitize on shutdown prefs for profiles with the network.cookie.lifetimePolicy enabled are set to true,
  - the previous settings for clearOnShutdown prefs will not be applied due to sanitizeOnShutdown being disabled
  - the network.cookie.lifetimePolicy is disabled afterwards.
*/
add_task(async function migrateSanitizationPrefsClearCleaningPrefs() {
  // Former network.cookie.lifetimePolicy values ACCEPT_SESSION/ACCEPT_NORMALLY are not available anymore
  // 2 = ACCEPT_SESSION
  Services.prefs.setIntPref("network.cookie.lifetimePolicy", 2);
  Services.prefs.setBoolPref("privacy.sanitize.sanitizeOnShutdown", false);
  Services.prefs.setBoolPref("privacy.clearOnShutdown.cache", false);
  Services.prefs.setBoolPref("privacy.clearOnShutdown.cookies", false);
  Services.prefs.setBoolPref("privacy.clearOnShutdown.offlineApps", false);
  Services.prefs.setBoolPref("privacy.clearOnShutdown.downloads", true);
  Services.prefs.setBoolPref("privacy.clearOnShutdown.sessions", true);

  // The migration code is called in cookieService::Init
  Services.cookies;

  // Former network.cookie.lifetimePolicy values ACCEPT_SESSION/ACCEPT_NORMALLY are not available anymore
  // 0 = ACCEPT_NORMALLY
  Assert.equal(
    Services.prefs.getIntPref("network.cookie.lifetimePolicy", 0),
    0,
    "Cookie lifetime policy is off"
  );

  Assert.ok(
    Services.prefs.getBoolPref("privacy.sanitize.sanitizeOnShutdown"),
    "Sanitize on shutdown is set"
  );

  Assert.ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cookies"),
    "Clearing cookies on shutdown is selected"
  );

  Assert.ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.cache"),
    "Clearing cache on shutdown is still selected"
  );

  Assert.ok(
    Services.prefs.getBoolPref("privacy.clearOnShutdown.offlineApps"),
    "Clearing offline apps on shutdown is selected"
  );

  Assert.ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.downloads"),
    "Clearing downloads on shutdown is not set anymore"
  );
  Assert.ok(
    !Services.prefs.getBoolPref("privacy.clearOnShutdown.sessions"),
    "Clearing active logins on shutdown is not set anymore"
  );

  Services.prefs.resetPrefs();

  delete Services.cookies;
});
