/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

Services.scriptloader.loadSubScript(
  "chrome://mochitests/content/browser/browser/components/preferences/tests/head.js",
  this
);

// In the redesigned settings UI, connection/proxy controls and HTTPS-Only
// controls live in a "connectionSecurity" sub-pane of Privacy and security,
// and DNS-over-HTTPS controls live in a "dnsOverHttps" sub-pane of Privacy and security.
const CONNECTION_SECURITY_PREF_PANE = SRD_PREF_VALUE
  ? "paneConnectionSecurity"
  : "panePrivacy";
const DOH_PREF_PANE = SRD_PREF_VALUE ? "paneDnsOverHttps" : "panePrivacy";
