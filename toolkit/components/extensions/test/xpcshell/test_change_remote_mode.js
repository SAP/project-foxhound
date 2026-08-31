"use strict";

add_task(async function change_remote() {
  let remote = Services.prefs.getBoolPref("extensions.webextensions.remote");
  Assert.equal(
    WebExtensionPolicy.useRemoteWebExtensions,
    remote,
    "value of useRemoteWebExtensions matches the pref"
  );

  Services.prefs.setBoolPref("extensions.webextensions.remote", !remote);

  Assert.equal(
    WebExtensionPolicy.useRemoteWebExtensions,
    remote,
    "value of useRemoteWebExtensions is still the same after changing the pref"
  );
});
