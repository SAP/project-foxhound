/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Test that HTTPS-Only/-First doesn't downgrade the current load on its
// background timer if the load is blocked by the client certificate dialog (Bug
// 1968527).

function runTest() {
  return BrowserTestUtils.withNewTab("about:blank", async function (browser) {
    const certDialogPromise = new Promise(resolve =>
      Services.obs.addObserver(resolve, "cert-dialog-loaded")
    );

    BrowserTestUtils.startLoadingURIString(
      browser,
      // eslint-disable-next-line @microsoft/sdl/no-insecure-url
      "http://requireclientcert.example.com"
    );

    const certDialog = await certDialogPromise;

    is(certDialog.checkVisibility(), true, "Client cert dialog should be open");

    is(browser.currentURI.displaySpec, "about:blank", "Page should be loading");

    await new Promise(resolve => {
      // The expected behavior is to have no downgrade happen and have the load
      // continue indefinetely waiting for user input. There is no event we can
      // listen to to test this, so we will have to do this with a timeout
      // instead.
      // eslint-disable-next-line mozilla/no-arbitrary-setTimeout
      setTimeout(resolve, 500);
    });

    is(
      certDialog.checkVisibility(),
      true,
      "Client cert dialog should still be open after 500ms"
    );

    is(
      browser.currentURI.displaySpec,
      "about:blank",
      "Page should still be loading after 500ms"
    );
  });
}

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["security.default_personal_cert", "Ask Every Time"],
      // (Almost) instantly perform the downgrade
      ["dom.security.https_only_fire_http_request_background_timer_ms", 100],
    ],
  });
});

describe("Client certificate", function () {
  afterEach(async function () {
    // Forget about requireclientcert.example.com again
    await new Promise(resolve =>
      Services.clearData.deleteDataFromHost(
        "requireclientcert.example.com",
        false,
        Services.clearData.CLEAR_CLIENT_AUTH_REMEMBER_SERVICE,
        resolve
      )
    );
  });

  it("HTTPS-First", async function () {
    await runTest();
  });

  it("HTTPS-Only", async function () {
    await SpecialPowers.pushPrefEnv({
      set: [["dom.security.https_only_mode", true]],
    });

    await runTest();
  });
});
