/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

// This functionality covered in this test is also covered in other tests.
// The purpose of this test is to catch window leaks.  It should fail in
// debug builds if a window reference is held onto after an install finishes.
// See bug 1541577 for further details.

let promiseAddonStarted = null;

function confirm_install(panel) {
  is(panel.getAttribute("name"), "XPI Test", "Should have seen the name");
  promiseAddonStarted = AddonTestUtils.promiseWebExtensionStartup(
    "amosigned-xpi@tests.mozilla.org"
  );
  return true;
}

function install_ended(install, addon) {
  is(
    addon.__AddonInternal__._install,
    null,
    "Expect addon._install to not be set after install is completed"
  );
  promiseAddonStarted.then(() => addon.uninstall());
}

add_task(async function test_newwindow_leak() {
  // Sanity check (currently this test is going expected to fail on non-DEBUG builds,
  // see note related to the __AddonInstallInternal__ getter from the installStartedCallback
  // below).
  ok(AppConstants.DEBUG, "Test is running on a DEBUG build as expected");

  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      [PREF_INSTALL_REQUIREBUILTINCERTS, false],
    ],
  });

  const deferredInstallCompleted = Promise.withResolvers();
  Harness.installConfirmCallback = confirm_install;
  Harness.installStartedCallback = install => {
    // NOTE: __AddonInstallInternal__ currently returns the AddonInstall instance only while
    // running on debug builds.
    is(
      install.addon.__AddonInternal__._install,
      install.__AddonInstallInternal__,
      "Expect addon._install to be set when install is started"
    );
  };
  Harness.installEndedCallback = install_ended;
  Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
  Harness.finalContentEvent = "InstallComplete";

  let win = await BrowserTestUtils.openNewBrowserWindow();
  Harness.setup(win);

  const triggers = encodeURIComponent(
    JSON.stringify({
      url: SECURE_TESTROOT + "amosigned.xpi",
    })
  );

  const url = `${SECURE_TESTROOT}mozaddonmanager.html?${triggers}`;

  let newtabPromise = BrowserTestUtils.openNewForegroundTab(win.gBrowser, url);
  let popupPromise = BrowserTestUtils.waitForEvent(
    win.PanelUI.notificationPanel,
    "popupshown"
  );

  info("Wait for the install to be completed");
  const count = await deferredInstallCompleted.promise;
  is(count, 1, "1 Add-on should have been successfully installed");

  const results = await SpecialPowers.spawn(
    win.gBrowser.selectedBrowser,
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

  // Explicitly click the "OK" button to avoid the panel reopening in the other window once this
  // window closes (see also bug 1535069):
  await popupPromise;
  win.PanelUI.notificationPanel
    .querySelector("popupnotification[popupid=addon-installed]")
    .button.click();

  // Wait for the promise returned by BrowserTestUtils.openNewForegroundTab
  // to be resolved before removing the window to prevent an uncaught exception
  // triggered from inside openNewForegroundTab to trigger a test failure due
  // to a race between openNewForegroundTab and closeWindow calls, e.g. as for
  // Bug 1728482).
  await newtabPromise;

  await BrowserTestUtils.closeWindow(win);
  Harness.finish(win);

  await SpecialPowers.popPrefEnv();
});
