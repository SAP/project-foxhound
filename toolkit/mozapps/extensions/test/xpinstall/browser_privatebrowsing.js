/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

let gDidSeeChannel = false;
let promiseAddonStarted = null;

function check_channel(subject) {
  if (!(subject instanceof Ci.nsIHttpChannel)) {
    return;
  }
  let channel = subject.QueryInterface(Ci.nsIHttpChannel);
  let uri = channel.URI;
  if (!uri || !uri.spec.endsWith("amosigned.xpi")) {
    return;
  }
  gDidSeeChannel = true;
  ok(true, "Got request for " + uri.spec);

  let loadInfo = channel.loadInfo;
  is(
    loadInfo.originAttributes.privateBrowsingId,
    1,
    "Request should have happened using private browsing"
  );
}

function confirm_install(panel) {
  is(panel.getAttribute("name"), "XPI Test", "Should have seen the name");
  promiseAddonStarted = AddonTestUtils.promiseWebExtensionStartup(
    "amosigned-xpi@tests.mozilla.org"
  );
  return true;
}

function install_ended(install, addon) {
  AddonTestUtils.checkInstallInfo(install, {
    method: "amWebAPI",
    source: "test-host",
    sourceURL: /https:\/\/example.com\/.*\/mozaddonmanager.html/,
  });
  promiseAddonStarted.then(() => addon.uninstall());
}

// Verifies use of a private browsing channel to download xpi files while installing
// through mozAddonManager
let gPrivateWin;
add_task(async function test_privateBrowsing_mozAddonManager_install() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      [PREF_INSTALL_REQUIREBUILTINCERTS, false],
    ],
  });

  const deferredInstallCompleted = Promise.withResolvers();
  Harness.installConfirmCallback = confirm_install;
  Harness.installEndedCallback = install_ended;
  Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
  Harness.finalContentEvent = "InstallComplete";

  gPrivateWin = await BrowserTestUtils.openNewBrowserWindow({ private: true });
  Harness.setup(gPrivateWin);

  var triggers = encodeURIComponent(
    JSON.stringify({
      url: SECURE_TESTROOT + "amosigned.xpi",
    })
  );
  gPrivateWin.gBrowser.selectedTab = BrowserTestUtils.addTab(
    gPrivateWin.gBrowser
  );
  Services.obs.addObserver(check_channel, "http-on-before-connect");
  BrowserTestUtils.startLoadingURIString(
    gPrivateWin.gBrowser,
    SECURE_TESTROOT + "mozaddonmanager.html?" + triggers
  );

  info("Wait for the install to be completed");
  const count = await deferredInstallCompleted.promise;

  ok(
    gDidSeeChannel,
    "Should have seen the request for the XPI and verified it was sent the right way."
  );
  is(count, 1, "1 Add-on should have been successfully installed");

  Services.obs.removeObserver(check_channel, "http-on-before-connect");

  const results = await SpecialPowers.spawn(
    gPrivateWin.gBrowser.selectedBrowser,
    [],
    () => {
      return {
        return: content.document.getElementById("return").textContent,
        status: content.document.getElementById("status").textContent,
      };
    }
  );

  is(results.return, "true", "mozAddonManager should have claimed success");
  is(results.status, "STATE_INSTALLED", "Callback should have seen a success");

  // Now finish the test:
  await BrowserTestUtils.closeWindow(gPrivateWin);
  Harness.finish(gPrivateWin);
  gPrivateWin = null;
});
