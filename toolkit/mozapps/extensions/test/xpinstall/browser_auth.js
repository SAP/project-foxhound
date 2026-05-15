/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/
 */

"use strict";

const { AddonTestUtils } = ChromeUtils.importESModule(
  "resource://testing-common/AddonTestUtils.sys.mjs"
);

AddonTestUtils.initMochitest(this);

const ADDON_ID = "amosigned-xpi@tests.mozilla.org";

// Test whether an install succeeds when authentication is required
// This verifies bug 312473.

async function testAuthRequiredInstall({ authInfo, expectFailure }) {
  const deferredInstallCompleted = Promise.withResolvers();

  let promiseAddonStarted;
  Harness.installConfirmCallback = () => {
    promiseAddonStarted = AddonTestUtils.promiseWebExtensionStartup(ADDON_ID);
    return true;
  };
  Harness.authenticationCallback = () => {
    return authInfo;
  };
  Harness.downloadFailedCallback = () => {
    ok(
      expectFailure,
      expectFailure
        ? "Install should have failed"
        : "Install should have NOT failed"
    );
  };

  if (!expectFailure) {
    Harness.installEndedCallback = (install, addon) => {
      return promiseAddonStarted.then(() => addon.uninstall());
    };
  }

  Harness.installsCompletedCallback = deferredInstallCompleted.resolve;
  Harness.setup();
  registerCleanupFunction(() => Harness.finish());

  PermissionTestUtils.add(
    "https://example.com/",
    "install",
    Services.perms.ALLOW_ACTION
  );

  const server = AddonTestUtils.createHttpServer({
    hosts: ["authredirect.example.com"],
  });

  let gotTabNavigationRequest = false;
  server.registerPathHandler("/", (request, response) => {
    if (!gotTabNavigationRequest) {
      // The first request is expected to be the one intercepted by amContentHandler.sys.mjs,
      // which will just look to the content-type to detect it as an add-on installation,
      // then the request is cancelled and a new one retriggered as part of the actual
      // add-on install flow.
      gotTabNavigationRequest = true;
      response.setStatusLine(request.httpVersion, 200, "OK");
      response.setHeader("Content-Type", "application/x-xpinstall");
      return;
    }
    // This second request is the one handled by the DownloadAddonInstall instance,
    // and for this second request we require authentication to explicitly trigger
    // the nsIAuthPrompt2 interface to be retrieved from the DownloadAddonInstall,
    // see DownloadAddonInstall getInterface method.
    if (request.hasHeader("Authorization")) {
      if (
        request.getHeader("Authorization") == "Basic dGVzdHVzZXI6dGVzdHBhc3M="
      ) {
        response.setStatusLine(request.httpVersion, 302, "Found");
        response.setHeader("Location", request.queryString);
        response.write("See " + request.queryString);
      } else {
        response.setStatusLine(request.httpVersion, 403, "Forbidden");
        response.write("Invalid credentials");
      }
    } else {
      response.setStatusLine(
        request.httpVersion,
        401,
        "Authentication required"
      );
      response.setHeader("WWW-Authenticate", 'basic realm="XPInstall"', false);
      response.write("Unauthenticated request");
    }
  });

  var triggers = encodeURIComponent(
    "http://authredirect.example.com/?" + TESTROOT + "amosigned.xpi"
  );
  await BrowserTestUtils.withNewTab({ gBrowser }, async () => {
    BrowserTestUtils.startLoadingURIString(
      gBrowser,
      SECURE_TESTROOT + "navigate.html?" + triggers
    );

    info("Wait for the install to be completed");
    const count = await deferredInstallCompleted.promise;

    if (expectFailure) {
      is(count, 0, "Add-on should have NOT been successfully installed");
    } else {
      is(count, 1, "1 Add-on should have been successfully installed");
    }
  });

  var authMgr = Cc["@mozilla.org/network/http-auth-manager;1"].getService(
    Ci.nsIHttpAuthManager
  );
  authMgr.clearAll();

  PermissionTestUtils.remove("https://example.com", "install");
}

add_task(async function test_failure_on_invalid_authInfo() {
  await testAuthRequiredInstall({
    authInfo: ["baduser", "badpass"],
    expectFailure: true,
  });
});

add_task(async function test_failure_on_no_authInfo() {
  await testAuthRequiredInstall({
    authInfo: null,
    expectFailure: true,
  });
});

add_task(async function test_success_on_valid_authInfo() {
  await testAuthRequiredInstall({
    authInfo: ["testuser", "testpass"],
    expectFailure: false,
  });
});
