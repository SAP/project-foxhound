/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* Test that the QWACs indicator appears as appropriate in the site identity
 * drop-down. */

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["security.qwacs.enabled", true],
      ["security.qwacs.enable_test_trust_anchors", true],
    ],
  });
});

add_task(async function test_1_qwac() {
  await BrowserTestUtils.withNewTab(
    "https://1-qwac.example.com",
    async function () {
      let promisePanelOpen = BrowserTestUtils.waitForEvent(
        window,
        "popupshown",
        true,
        event => event.target == gIdentityHandler._identityPopup
      );

      gIdentityHandler._identityIconBox.click();
      await promisePanelOpen;

      // Wait for the QWAC status to be determined.
      await gIdentityHandler._qwacStatusPromise;

      let securityView = document.getElementById("identity-popup-securityView");
      let shown = BrowserTestUtils.waitForEvent(securityView, "ViewShown");
      document.getElementById("identity-popup-security-button").click();
      await shown;

      let qualifiedText = document.getElementById(
        "identity-popup-content-etsi"
      );
      ok(
        BrowserTestUtils.isVisible(qualifiedText),
        "etsi qualified text visible"
      );

      let issuedToLabel = document.getElementById(
        "identity-popup-content-owner-label"
      );
      ok(
        BrowserTestUtils.isVisible(issuedToLabel),
        "'Certificate issued to:' label visible"
      );

      let qwacOrganization = document.getElementById(
        "identity-popup-content-owner"
      );
      ok(
        BrowserTestUtils.isVisible(qwacOrganization),
        "QWAC organization text visible"
      );
      is(
        qwacOrganization.textContent,
        "Test 1-QWAC Organization",
        "QWAC organization text as expected"
      );

      let qwacLocation = document.getElementById(
        "identity-popup-content-supplemental"
      );
      ok(
        BrowserTestUtils.isVisible(qwacLocation),
        "QWAC location text visible"
      );
      is(
        qwacLocation.textContent,
        "1-QWAC Test Locality\nEX",
        "QWAC location text as expected"
      );
    }
  );
});

add_task(async function test_2_qwac() {
  let boundBy2QwacUri =
    getRootDirectory(gTestPath).replace(
      "chrome://mochitests/content",
      "https://bound-by-2-qwac.example.com"
    ) + "2-qwac.html";

  await BrowserTestUtils.withNewTab(boundBy2QwacUri, async function () {
    let promisePanelOpen = BrowserTestUtils.waitForEvent(
      window,
      "popupshown",
      true,
      event => event.target == gIdentityHandler._identityPopup
    );

    gIdentityHandler._identityIconBox.click();
    await promisePanelOpen;

    // Wait for the QWAC status to be determined.
    await gIdentityHandler._qwacStatusPromise;

    let securityView = document.getElementById("identity-popup-securityView");
    let shown = BrowserTestUtils.waitForEvent(securityView, "ViewShown");
    document.getElementById("identity-popup-security-button").click();
    await shown;

    let qualifiedText = document.getElementById("identity-popup-content-etsi");
    ok(
      BrowserTestUtils.isVisible(qualifiedText),
      "etsi qualified text visible"
    );

    let issuedToLabel = document.getElementById(
      "identity-popup-content-owner-label"
    );
    ok(
      BrowserTestUtils.isVisible(issuedToLabel),
      "'Certificate issued to:' label visible"
    );

    let qwacOrganization = document.getElementById(
      "identity-popup-content-owner"
    );
    ok(
      BrowserTestUtils.isVisible(qwacOrganization),
      "QWAC organization text visible"
    );
    is(
      qwacOrganization.textContent,
      "Test 2-QWAC Organization",
      "QWAC organization text as expected"
    );

    let qwacLocation = document.getElementById(
      "identity-popup-content-supplemental"
    );
    ok(BrowserTestUtils.isVisible(qwacLocation), "QWAC location text visible");
    is(
      qwacLocation.textContent,
      "2-QWAC Test Locality\nEX",
      "QWAC location text as expected"
    );
  });
});

// Also check that there are conditions where this isn't shown.
add_task(async function test_non_qwac() {
  let uris = [
    // eslint-disable-next-line @microsoft/sdl/no-insecure-url
    "http://example.com",
    "https://example.com",
    "data:,Hello%2C World!",
  ];
  for (let uri of uris) {
    await BrowserTestUtils.withNewTab(uri, async function () {
      let promisePanelOpen = BrowserTestUtils.waitForEvent(
        window,
        "popupshown",
        true,
        event => event.target == gIdentityHandler._identityPopup
      );

      gIdentityHandler._identityIconBox.click();
      await promisePanelOpen;

      // Wait for the QWAC status to be determined.
      await gIdentityHandler._qwacStatusPromise;

      let securityView = document.getElementById("identity-popup-securityView");
      let shown = BrowserTestUtils.waitForEvent(securityView, "ViewShown");
      document.getElementById("identity-popup-security-button").click();
      await shown;

      let qualifiedText = document.getElementById(
        "identity-popup-content-etsi"
      );
      ok(
        !BrowserTestUtils.isVisible(qualifiedText),
        "etsi qualified text not visible"
      );

      let issuedToLabel = document.getElementById(
        "identity-popup-content-owner-label"
      );
      ok(
        !BrowserTestUtils.isVisible(issuedToLabel),
        "'Certificate issued to:' label not visible"
      );

      let qwacOrganization = document.getElementById(
        "identity-popup-content-owner"
      );
      ok(
        !BrowserTestUtils.isVisible(qwacOrganization),
        "QWAC organization text not visible"
      );

      let qwacLocation = document.getElementById(
        "identity-popup-content-supplemental"
      );
      ok(
        !BrowserTestUtils.isVisible(qwacLocation),
        "QWAC location text not visible"
      );
    });
  }
});
