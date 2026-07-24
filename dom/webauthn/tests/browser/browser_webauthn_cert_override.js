/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

let expectSecurityError = expectError("Security");

async function test_webauthn_with_cert_override({
  aTestDomain,
  aExpectSecurityError = false,
  aFeltPrivacyV1 = false,
  aAllowCertificateOverrideByPref = false,
}) {
  let authenticatorId = add_virtual_authenticator(/*autoremove*/ false);

  let certOverrideService = Cc[
    "@mozilla.org/security/certoverride;1"
  ].getService(Ci.nsICertOverrideService);
  Services.prefs.setBoolPref(
    "security.certerrors.felt-privacy-v1",
    aFeltPrivacyV1
  );
  Services.prefs.setBoolPref("network.proxy.allow_hijacking_localhost", true);
  Services.prefs.setBoolPref(
    "security.webauthn.allow_with_certificate_override",
    aAllowCertificateOverrideByPref
  );
  let testURL = "https://" + aTestDomain;
  let certErrorLoaded;
  let tab = await BrowserTestUtils.openNewForegroundTab(
    gBrowser,
    () => {
      gBrowser.selectedTab = BrowserTestUtils.addTab(gBrowser, testURL);
      let browser = gBrowser.selectedBrowser;
      certErrorLoaded = BrowserTestUtils.waitForErrorPage(browser);
    },
    false
  );
  info("Waiting for cert error page.");
  await certErrorLoaded;

  let loaded = BrowserTestUtils.browserLoaded(tab.linkedBrowser);

  info("Adding certificate error override.");
  await SpecialPowers.spawn(
    tab.linkedBrowser,
    [aFeltPrivacyV1],
    async function (aFeltPrivacyV1) {
      const doc = content.document;

      if (!aFeltPrivacyV1) {
        info("Using old cert error page flow.");
        let doc = content.document;
        let exceptionButton = doc.getElementById("exceptionDialogButton");
        exceptionButton.click();
      } else {
        info("Using felt-privacy-v1 cert error page flow.");
        const netErrorCard =
          doc.querySelector("net-error-card").wrappedJSObject;
        await netErrorCard.getUpdateComplete();
        await EventUtils.synthesizeMouseAtCenter(
          netErrorCard.advancedButton,
          {},
          content
        );
        await ContentTaskUtils.waitForCondition(() => {
          return (
            netErrorCard.exceptionButton &&
            !netErrorCard.exceptionButton.disabled
          );
        }, "Waiting for exception button");
        netErrorCard.exceptionButton.scrollIntoView();
        EventUtils.synthesizeMouseAtCenter(
          netErrorCard.exceptionButton,
          {},
          content
        );
      }
    }
  );

  info("Waiting for page load.");
  await loaded;

  await SpecialPowers.spawn(tab.linkedBrowser, [], async function () {
    let doc = content.document;
    ok(
      !doc.documentURI.startsWith("about:certerror"),
      "Exception has been added."
    );
  });

  let makeCredPromise = promiseWebAuthnMakeCredential(tab, "none", "preferred");
  if (aExpectSecurityError) {
    await makeCredPromise.then(arrivingHereIsBad).catch(expectSecurityError);
    ok(
      true,
      "Calling navigator.credentials.create() results in a security error"
    );
  } else {
    await makeCredPromise.catch(arrivingHereIsBad);
    ok(true, "Calling navigator.credentials.create() is allowed");
  }

  let getAssertionPromise = promiseWebAuthnGetAssertionDiscoverable(tab);
  if (aExpectSecurityError) {
    await getAssertionPromise
      .then(arrivingHereIsBad)
      .catch(expectSecurityError);
    ok(true, "Calling navigator.credentials.get() results in a security error");
  } else {
    await getAssertionPromise.catch(arrivingHereIsBad);
    ok(true, "Calling navigator.credentials.get() results in a security error");
  }

  certOverrideService.clearValidityOverride(aTestDomain, -1, {});

  loaded = BrowserTestUtils.waitForErrorPage(tab.linkedBrowser);
  BrowserCommands.reloadSkipCache();
  await loaded;

  BrowserTestUtils.removeTab(gBrowser.selectedTab);

  remove_virtual_authenticator(authenticatorId);

  Services.prefs.clearUserPref(
    "security.webauthn.allow_with_certificate_override"
  );
  Services.prefs.clearUserPref("network.proxy.allow_hijacking_localhost");
  Services.prefs.clearUserPref("security.certerrors.felt-privacy-v1");
}

for (let feltPrivacyV1 of [false, true]) {
  add_task(() =>
    test_webauthn_with_cert_override({
      aTestDomain: "expired.example.com",
      aExpectSecurityError: false,
      aFeltPrivacyV1: feltPrivacyV1,
      aAllowCertificateOverrideByPref: false,
    })
  );
  add_task(() =>
    test_webauthn_with_cert_override({
      aTestDomain: "untrusted.example.com",
      aExpectSecurityError: true,
      aFeltPrivacyV1: feltPrivacyV1,
      aAllowCertificateOverrideByPref: false,
    })
  );
  add_task(() =>
    test_webauthn_with_cert_override({
      aTestDomain: "no-subject-alt-name.example.com",
      aExpectSecurityError: true,
      aFeltPrivacyV1: feltPrivacyV1,
      aAllowCertificateOverrideByPref: false,
    })
  );
  add_task(() =>
    test_webauthn_with_cert_override({
      aTestDomain: "badcertdomain.localhost",
      aExpectSecurityError: false,
      aFeltPrivacyV1: feltPrivacyV1,
      aAllowCertificateOverrideByPref: false,
    })
  );
  add_task(() =>
    test_webauthn_with_cert_override({
      aTestDomain: "untrusted.example.com",
      aExpectSecurityError: false,
      aFeltPrivacyV1: feltPrivacyV1,
      aAllowCertificateOverrideByPref: true,
    })
  );
}
