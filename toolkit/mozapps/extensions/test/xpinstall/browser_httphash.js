/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

const ADDON_ID = "amosigned-xpi@tests.mozilla.org";
const xpiFilePath = getTestFilePath("./amosigned.xpi");
let xpiFileHash;
let promiseAddonStarted;

add_setup(async () => {
  xpiFileHash = await IOUtils.computeHexDigest(xpiFilePath, "sha256");
});

function confirm_install(panel) {
  is(panel.getAttribute("name"), "XPI Test", "Should have seen the name");
  promiseAddonStarted = AddonTestUtils.promiseWebExtensionStartup(ADDON_ID);
  return true;
}

function download_failed(install) {
  is(install.error, AddonManager.ERROR_INCORRECT_HASH, "Install should fail");
}

async function test_install_with_xtargetdirect_header_hash({
  url,
  apiCallHashString,
  expectFailure,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      [PREF_INSTALL_REQUIREBUILTINCERTS, false],
    ],
  });

  const deferredInstallCompleted = Promise.withResolvers();

  if (expectFailure) {
    Harness.downloadFailedCallback = download_failed;
  } else {
    Harness.installConfirmCallback = confirm_install;
    Harness.installEndedCallback = (install, addon) =>
      promiseAddonStarted.then(() => addon.uninstall());
  }
  Harness.finalContentEvent = "InstallComplete";
  Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
  Harness.setup();
  registerCleanupFunction(() => Harness.finish());

  var triggers = encodeURIComponent(
    JSON.stringify({
      url,
      ...(apiCallHashString ? { hash: apiCallHashString } : {}),
    })
  );

  gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser);
  BrowserTestUtils.startLoadingURIString(
    gBrowser,
    SECURE_TESTROOT + "mozaddonmanager.html?" + triggers
  );

  info("Wait for the install to be completed");
  const count = await deferredInstallCompleted.promise;
  if (expectFailure) {
    is(count, 0, "Add-on should have NOT been successfully installed");
  } else {
    is(count, 1, "1 Add-on should have been successfully installed");
  }

  await SpecialPowers.popPrefEnv();

  gBrowser.removeCurrentTab();
}

// Test whether an install fails when an invalid hash is included in the HTTPS
// request. This verifies bug 591070
add_task(async function test_failure_on_invalid_hash() {
  const httpsHashString = `sha1:foobar`;
  const url = `https://example.com/browser/${RELATIVE_DIR}hashRedirect.sjs?${httpsHashString}|${TESTROOT}amosigned.xpi`;
  await test_install_with_xtargetdirect_header_hash({
    url,
    expectFailure: true,
  });
});

// Tests that the HTTPS hash is ignored when mozAddonManager install flow is passed a hash.
// This verifies bug 591070
add_task(async function test_success_on_invalid_hash_ignored() {
  const httpsHashString = `sha256:foobar`;
  const url = `https://example.com/browser/${RELATIVE_DIR}hashRedirect.sjs?${httpsHashString}|${TESTROOT}amosigned.xpi`;
  await test_install_with_xtargetdirect_header_hash({
    url,
    apiCallHashString: `sha256:${xpiFileHash}`,
    expectFailure: false,
  });
});

// Test whether an install succeeds when a valid hash is included in the HTTPS
// request. This verifies bug 591070
add_task(async function test_success_on_valid_hash() {
  const httpsHashString = `sha256:${xpiFileHash}`;
  const url = `https://example.com/browser/${RELATIVE_DIR}hashRedirect.sjs?${httpsHashString}|${TESTROOT}amosigned.xpi`;
  await test_install_with_xtargetdirect_header_hash({
    url,
    expectFailure: false,
  });
});

// Test that hashes are ignored in the headers of HTTP requests
// This verifies bug 591070.
add_task(async function test_success_on_invalid_hash_on_insecure_request() {
  const httpsHashString = `sha256:foobar`;
  const url = `http://example.com/browser/${RELATIVE_DIR}hashRedirect.sjs?${httpsHashString}|${TESTROOT}amosigned.xpi`;
  await test_install_with_xtargetdirect_header_hash({
    url,
    // Doesn't fail because the hash is ignored when set on an insecure request.
    expectFailure: false,
  });
});

// Test that only the first HTTPS hash is used. This verifies bug 591070.
add_task(
  async function test_success_with_invalid_hash_ignored_on_further_redirects() {
    const redirUrl = `https://example.com/browser/${RELATIVE_DIR}hashRedirect.sjs`;
    const url = `${redirUrl}?sha256:${xpiFileHash}|${redirUrl}?sha256:foobar|${TESTROOT}amosigned.xpi`;
    await test_install_with_xtargetdirect_header_hash({
      url,
      expectFailure: false,
    });
  }
);

// Tests that a new hash is accepted when restarting a failed download
// This verifies bug 593535
add_task(
  async function test_success_on_new_valid_hash_after_download_failure() {
    function setup_redirect(aSettings) {
      var url = `https://example.com/browser/${RELATIVE_DIR}redirect.sjs?mode=setup`;
      for (var name in aSettings) {
        url += "&" + name + "=" + aSettings[name];
      }

      var req = new XMLHttpRequest();
      req.open("GET", url, false);
      req.send(null);
    }

    await SpecialPowers.pushPrefEnv({
      set: [
        // Bug 721336 - Use sync XHR system requests
        ["network.xhr.block_sync_system_requests", false],
      ],
    });

    info("Trigger download failure due to invalid hash");
    // Set up the redirect to give a bad hash
    setup_redirect({
      "X-Target-Digest": "sha1:foo",
      Location: `http://example.com/browser/${RELATIVE_DIR}amosigned.xpi`,
    });

    let failedInstall;
    const promiseDownloadFailed = AddonTestUtils.promiseInstallEvent(
      "onDownloadFailed",
      install => {
        if (install.error === AddonManager.ERROR_INCORRECT_HASH) {
          failedInstall = install;
          return true;
        }
        return false;
      }
    );

    const url = `https://example.com/browser/${RELATIVE_DIR}redirect.sjs?mode=redirect`;

    info("Wait for xtarget redirect test failure");
    await test_install_with_xtargetdirect_header_hash({
      url,
      // Expect failure due to the invalid hash set on the redirect while
      // downloading for the first time.
      expectFailure: true,
    });

    info("Wait for download failed");
    await promiseDownloadFailed;

    info("Retry install with new valid hash");
    // Give it the right hash this time
    setup_redirect({
      "X-Target-Digest": `sha256:${xpiFileHash}`,
      Location: `http://example.com/browser/${RELATIVE_DIR}amosigned.xpi`,
    });

    // Setup to track the successful re-download

    const deferredInstallCompleted = Promise.withResolvers();

    Harness.installConfirmCallback = confirm_install;
    Harness.installEndedCallback = (install, addon) =>
      promiseAddonStarted.then(() => addon.uninstall());
    Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
    // This retry doesn't go through mozaddonmanager.html and so we are
    // not going to expect an "InstallComplete" event to await for.
    Harness.finalContentEvent = null;
    Harness.setup();

    // The harness expects onNewInstall events for all installs that are about to start
    Harness.onNewInstall(failedInstall);

    // Restart the install as a regular webpage install so the harness tracks it
    await BrowserTestUtils.withNewTab({ gBrowser }, async () => {
      AddonManager.installAddonFromWebpage(
        "application/x-xpinstall",
        gBrowser.selectedBrowser,
        Services.scriptSecurityManager.getSystemPrincipal(),
        failedInstall
      );
      const count = await deferredInstallCompleted.promise;
      is(count, 1, "1 Add-on should have been successfully installed");
    });

    await SpecialPowers.popPrefEnv();
  }
);
