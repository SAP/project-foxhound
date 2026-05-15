/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

var proxyPrefValue;

// ----------------------------------------------------------------------------
// Tests that going offline cancels an in progress download.
async function test() {
  waitForExplicitFinish(); // have to call this ourselves because we're async.

  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      [PREF_INSTALL_REQUIREBUILTINCERTS, false],
    ],
  });

  Harness.downloadProgressCallback = download_progress;
  Harness.installsCompletedCallback = finish_test;
  Harness.setup();

  var triggers = encodeURIComponent(
    JSON.stringify({
      url: SECURE_TESTROOT + "amosigned.xpi",
    })
  );
  gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser);
  BrowserTestUtils.startLoadingURIString(
    gBrowser,
    SECURE_TESTROOT + "mozaddonmanager.html?" + triggers
  );
}

function download_progress() {
  try {
    // Tests always connect to localhost, and per bug 87717, localhost is now
    // reachable in offline mode.  To avoid this, disable any proxy.
    proxyPrefValue = Services.prefs.getIntPref("network.proxy.type");
    Services.prefs.setIntPref("network.proxy.type", 0);
    Services.io.manageOfflineStatus = false;
    Services.io.offline = true;
  } catch (ex) {}
}

function finish_test(count) {
  function wait_for_online() {
    info("Checking if the browser is still offline...");

    let tab = gBrowser.selectedTab;
    BrowserTestUtils.waitForContentEvent(
      tab.linkedBrowser,
      "DOMContentLoaded",
      true
    ).then(async function () {
      let url = await ContentTask.spawn(
        tab.linkedBrowser,
        null,
        async function () {
          return content.document.documentURI;
        }
      );
      info("loaded: " + url);
      if (/^about:neterror\?e=netOffline/.test(url)) {
        wait_for_online();
      } else {
        gBrowser.removeCurrentTab();
        Harness.finish();
      }
    });
    BrowserTestUtils.startLoadingURIString(
      tab.linkedBrowser,
      "https://example.com/"
    );
  }

  is(count, 0, "No add-ons should have been installed");
  try {
    Services.prefs.setIntPref("network.proxy.type", proxyPrefValue);
    Services.io.offline = false;
  } catch (ex) {}

  wait_for_online();
}
