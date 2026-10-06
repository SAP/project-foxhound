/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

async function openSecurityPrefs(options = { leaveOpen: true }) {
  let category = SRD_PREF_VALUE ? "connectionSecurity" : "privacy";
  return openPreferencesViaOpenPreferencesAPI(category, options);
}
