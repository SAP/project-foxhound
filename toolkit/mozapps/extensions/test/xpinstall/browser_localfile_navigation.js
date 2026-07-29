/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

// Tests a navigation to a file:-xpi from a file:-URL.

function test() {
  Harness.installEndedCallback = install_ended;
  Harness.installsCompletedCallback = finish_test;
  Harness.setup();

  var cr = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
    Ci.nsIChromeRegistry
  );

  var chromeroot = extractChromeRoot(gTestPath);
  var rootpath = chromeroot;
  try {
    rootpath = cr.convertChromeURL(makeURI(chromeroot)).spec;
  } catch (ex) {
    // scenario where we are running from a .jar and already extracted
  }

  BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    rootpath + "navigate.html?amosigned.xpi"
  );
}

function install_ended(install, addon) {
  const sourceURL = gBrowser.selectedBrowser.currentURI.spec;
  ok(sourceURL.startsWith("file://"), "sourceURL is file:-URL");
  ok(sourceURL.endsWith("navigate.html?amosigned.xpi"), "sourceURL is page");

  Assert.deepEqual(
    install.installTelemetryInfo,
    { source: "file-url", sourceURL, method: "link" },
    "Got the expected install.installTelemetryInfo"
  );

  return addon.uninstall();
}

function finish_test(count) {
  is(count, 1, "1 Add-on should have been successfully installed");

  gBrowser.removeCurrentTab();
  Harness.finish();
}
