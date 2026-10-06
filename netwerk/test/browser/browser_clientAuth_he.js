// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/
"use strict";

// Regression coverage for bug 2042598: a client-cert handshake through Happy
// Eyeballs must pass the loading tab's browserId to chooseCertificate. Before
// the fix HappyEyeballsTransaction inherited BrowserId() == 0, so PSM skipped
// the BrowsingContext lookup and the dialog got null (Android crash, desktop
// misroute). A localhost Node HTTPS server keeps the request direct so HE runs.

const { MockRegistrar } = ChromeUtils.importESModule(
  "resource://testing-common/MockRegistrar.sys.mjs"
);
const { NodeHTTPSServer } = ChromeUtils.importESModule(
  "resource://testing-common/NodeServer.sys.mjs"
);

let gServer;
let gCapturedDialogArgs = [];

const gClientAuthDialogService = {
  QueryInterface: ChromeUtils.generateQI(["nsIClientAuthDialogService"]),

  chooseCertificate(hostname, certArray, loadContext, _caNames, callback) {
    gCapturedDialogArgs.push({
      hostname,
      loadContext,
      // Capture now, while the BC is still live.
      capturedBrowserId: loadContext?.top?.browserId ?? null,
    });
    // Any cert lets the connection finish; the server doesn't validate it.
    if (certArray && certArray.length) {
      callback.certificateChosen(certArray[0], false);
    } else {
      callback.certificateChosen(null, false);
    }
  },
};

add_setup(async function setup() {
  let cid = MockRegistrar.register(
    "@mozilla.org/security/ClientAuthDialogService;1",
    gClientAuthDialogService
  );

  // Force Happy Eyeballs on regardless of nightly default.
  await SpecialPowers.pushPrefEnv({
    set: [
      ["network.http.happy_eyeballs_enabled", true],
      // "Ask" mode so candidates surface through chooseCertificate.
      ["security.default_personal_cert", "Ask Every Time"],
    ],
  });

  gServer = new NodeHTTPSServer();
  gServer.setRequestClientCert(true);
  await gServer.start();

  registerCleanupFunction(async () => {
    MockRegistrar.unregister(cid);
    await gServer.stop();
  });
});

add_task(async function test_he_dialog_receives_matching_browser_id() {
  gCapturedDialogArgs.length = 0;

  let win = await BrowserTestUtils.openNewBrowserWindow();
  try {
    let expectedBrowserId = win.gBrowser.selectedBrowser.browserId;
    let url = gServer.origin() + "/";

    BrowserTestUtils.startLoadingURIString(win.gBrowser.selectedBrowser, url);
    await BrowserTestUtils.browserLoaded(
      win.gBrowser.selectedBrowser,
      false,
      u => u.startsWith(gServer.origin()),
      true
    );

    Assert.greaterOrEqual(
      gCapturedDialogArgs.length,
      1,
      "ClientAuthDialogService.chooseCertificate should have been invoked"
    );

    let invocation = gCapturedDialogArgs[0];
    Assert.equal(
      invocation.hostname,
      "localhost",
      "dialog should be invoked for localhost"
    );
    Assert.notEqual(
      invocation.loadContext,
      null,
      "BrowsingContext arg should not be null — verifies BrowserId propagated " +
        "(GetCurrentTopByBrowserId returned a real BC instead of being skipped)"
    );
    Assert.equal(
      invocation.capturedBrowserId,
      expectedBrowserId,
      "BrowsingContext.top.browserId should match the loading tab's browserId"
    );
  } finally {
    await BrowserTestUtils.closeWindow(win);
  }
});
