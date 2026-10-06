/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

// Test whether an install fails when there is no manifest.json

add_task(async function test_empty() {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      [PREF_INSTALL_REQUIREBUILTINCERTS, false],
    ],
  });

  const deferredDownloadFailed = Promise.withResolvers();
  const deferredInstallCompleted = Promise.withResolvers();

  Harness.downloadFailedCallback = deferredDownloadFailed.resolve;
  Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
  Harness.setup();

  const triggers = encodeURIComponent(
    JSON.stringify({
      url: SECURE_TESTROOT + "empty.xpi",
    })
  );

  const url = `${SECURE_TESTROOT}mozaddonmanager.html?${triggers}`;
  await BrowserTestUtils.openNewForegroundTab(gBrowser, url);

  info("Wait for the download to fail");
  let install = await deferredDownloadFailed.promise;
  is(install.error, AddonManager.ERROR_CORRUPT_FILE, "Install should fail");

  info("Wait for the install to be completed");
  const count = await deferredInstallCompleted.promise;
  is(count, 0, "No add-ons should have been installed");

  gBrowser.removeCurrentTab();
  Harness.finish();

  await SpecialPowers.popPrefEnv();
});
