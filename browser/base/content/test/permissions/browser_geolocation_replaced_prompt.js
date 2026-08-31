/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const ORIGIN = "https://example.com";
const PAGE =
  getRootDirectory(gTestPath).replace("chrome://mochitests/content", ORIGIN) +
  "empty.html";

add_setup(async function () {
  let uri = NetUtil.newURI(ORIGIN);
  PermissionTestUtils.remove(uri, "geo");
  registerCleanupFunction(() => {
    PermissionTestUtils.remove(uri, "geo");
  });
});

// Two back-to-back getCurrentPosition calls: the second replaces the first's
// prompt. The first request must be cancelled with PERMISSION_DENIED rather
// than leaving its error callback dangling.
add_task(async function testReplacedGeoPromptCancelsFirstRequest() {
  await BrowserTestUtils.withNewTab(PAGE, async browser => {
    let firstPopup = BrowserTestUtils.waitForEvent(
      PopupNotifications.panel,
      "popupshown"
    );

    let firstResultPromise = SpecialPowers.spawn(browser, [], async () => {
      return new Promise(resolve => {
        content.wrappedJSObject.firstResult = resolve;
        content.wrappedJSObject.secondResult = () => {};
        content.eval(`
          navigator.geolocation.getCurrentPosition(
            () => window.firstResult({ ok: true }),
            err => window.firstResult({ ok: false, code: err.code })
          );
          navigator.geolocation.getCurrentPosition(
            () => window.secondResult({ ok: true }),
            err => window.secondResult({ ok: false, code: err.code })
          );
        `);
      });
    });

    await firstPopup;

    let firstResult = await firstResultPromise;
    is(firstResult.ok, false, "first getCurrentPosition got an error");
    is(
      firstResult.code,
      1 /* PERMISSION_DENIED */,
      "first request was cancelled as PERMISSION_DENIED"
    );

    ok(
      PopupNotifications.getNotification("geolocation", browser),
      "second geolocation prompt is still showing"
    );

    let popuphidden = BrowserTestUtils.waitForEvent(
      PopupNotifications.panel,
      "popuphidden"
    );
    EventUtils.synthesizeMouseAtCenter(
      PopupNotifications.panel.firstElementChild.secondaryButton,
      {}
    );
    await popuphidden;
  });
});
