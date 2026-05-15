/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

const { ExtensionCommon } = ChromeUtils.importESModule(
  "resource://gre/modules/ExtensionCommon.sys.mjs"
);

AddonTestUtils.initMochitest(this);

// Test that an install that requires cookies to be sent succeeds when cookies
// are set.
// This test file verifies that it succeeds with install on navigation when the
// cookie is set and fails with mozAddonManager (which is expected to not be
// sending the cookies) and with install on navigation when the cookie is not set.

async function testInstallWithCookie({
  useMozAddonManager,
  addCookie,
  expectFailure,
}) {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.webapi.testing", true],
      [PREF_INSTALL_REQUIREBUILTINCERTS, false],
    ],
  });

  let promiseAddonStarted;

  function confirm_install(panel) {
    is(panel.getAttribute("name"), "XPI Test", "Should have seen the name");
    promiseAddonStarted = AddonTestUtils.promiseWebExtensionStartup(
      "amosigned-xpi@tests.mozilla.org"
    );
    return true;
  }

  function install_ended(install, addon) {
    promiseAddonStarted.then(() => addon.uninstall());
  }

  function download_failed(install) {
    is(
      install.error,
      AddonManager.ERROR_NETWORK_FAILURE,
      "Install should fail"
    );
  }

  const deferredInstallCompleted = Promise.withResolvers();
  if (expectFailure) {
    Harness.downloadFailedCallback = download_failed;
  } else {
    Harness.installConfirmCallback = confirm_install;
    Harness.installEndedCallback = install_ended;
  }
  Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
  Harness.setup();
  registerCleanupFunction(() => Harness.finish());

  if (addCookie) {
    const cv = Services.cookies.add(
      "example.com",
      "/browser/" + RELATIVE_DIR,
      "xpinstall",
      "true",
      false,
      false,
      true,
      Date.now() + 1000 * 60,
      {},
      Ci.nsICookie.SAMESITE_UNSET,
      Ci.nsICookie.SCHEME_HTTPS
    );
    Assert.equal(cv.result, Ci.nsICookieValidation.eOK, "Valid cookie");
  }

  PermissionTestUtils.add(
    "https://example.com/",
    "install",
    Services.perms.ALLOW_ACTION
  );

  await BrowserTestUtils.withNewTab({ gBrowser }, async browser => {
    const expectNavigationFailure = !useMozAddonManager && expectFailure;
    const triggerUrl =
      SECURE_TESTROOT +
      "cookieRedirect.sjs?" +
      SECURE_TESTROOT +
      "amosigned.xpi";
    if (useMozAddonManager) {
      var triggers = encodeURIComponent(JSON.stringify({ url: triggerUrl }));
      BrowserTestUtils.startLoadingURIString(
        browser,
        SECURE_TESTROOT + "mozaddonmanager.html?" + triggers
      );
    } else {
      await ExtensionCommon.withHandlingUserInput(window, () =>
        BrowserTestUtils.startLoadingURIString(browser, triggerUrl)
      );
    }

    if (expectNavigationFailure) {
      info("Wait for browserLoaded");
      await BrowserTestUtils.browserLoaded(browser);
      info("Verify expected navigation failure");
      const navigationResultText = await SpecialPowers.spawn(
        browser,
        [],
        () => {
          return this.content.document.body.innerText;
        }
      );
      is(
        navigationResultText,
        "Invalid request",
        "Got the expected failure message from install on navigation without the expected cookie"
      );
      return;
    }

    const count = await deferredInstallCompleted.promise;
    if (expectFailure) {
      is(count, 0, "Add-on should have NOT been successfully installed");
    } else {
      is(count, 1, "1 Add-on should have been successfully installed");
    }
  });

  if (addCookie) {
    Services.cookies.remove(
      "example.com",
      "xpinstall",
      "/browser/" + RELATIVE_DIR,
      {}
    );
  }
  PermissionTestUtils.remove("https://example.com", "install");
  await SpecialPowers.popPrefEnv();
}

add_task(async function test_installOnNavigation_failure() {
  await testInstallWithCookie({
    useMozAddonManager: false,
    expectFailure: true,
    addCookie: false,
  });
});

add_task(async function test_installOnNavigation_successfull() {
  await testInstallWithCookie({
    useMozAddonManager: false,
    expectFailure: false,
    addCookie: true,
  });
});

add_task(
  async function test_installOnNavigation_successfull_thirdPartyCookieDisabled() {
    await SpecialPowers.pushPrefEnv({
      set: [["network.cookie.cookieBehavior", 1]],
    });
    await testInstallWithCookie({
      useMozAddonManager: false,
      expectFailure: false,
      addCookie: true,
    });
    await SpecialPowers.popPrefEnv();
  }
);

add_task(async function test_mozAddonManager_install_failure() {
  await testInstallWithCookie({
    useMozAddonManager: true,
    expectFailure: true,
    addCookie: true,
  });
});
