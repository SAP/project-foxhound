/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BAD_CERT = "https://expired.example.com/";
const BAD_STS_CERT =
  "https://badchain.include-subdomains.pinning.example.com:443";
const PREF_PERMANENT_OVERRIDE = "security.certerrors.permanentOverride";

// Security CertError Felt Privacy set to false
add_task(async function checkExceptionDialogButton_feltPrivacyToFalse() {
  await setSecurityCertErrorsFeltPrivacyToFalse();
  info(
    "Loading a bad cert page and making sure the exceptionDialogButton directly adds an exception"
  );
  let tab = await openErrorPage(BAD_CERT);
  let browser = tab.linkedBrowser;
  let loaded = BrowserTestUtils.browserLoaded(browser, false, BAD_CERT);
  info("Clicking the exceptionDialogButton in advanced panel");
  await SpecialPowers.spawn(browser, [], async function () {
    let doc = content.document;
    let exceptionButton = doc.getElementById("exceptionDialogButton");
    exceptionButton.click();
  });

  info("Loading the url after adding exception");
  await loaded;

  await SpecialPowers.spawn(browser, [], async function () {
    let doc = content.document;
    ok(
      !doc.documentURI.startsWith("about:certerror"),
      "Exception has been added"
    );
  });

  let certOverrideService = Cc[
    "@mozilla.org/security/certoverride;1"
  ].getService(Ci.nsICertOverrideService);
  certOverrideService.clearValidityOverride("expired.example.com", -1, {});
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function checkPermanentExceptionPref_feltPrivacyToFalse() {
  await setSecurityCertErrorsFeltPrivacyToFalse();
  info(
    "Loading a bad cert page and making sure the permanent state of exceptions can be controlled via pref"
  );

  for (let permanentOverride of [false, true]) {
    await SpecialPowers.pushPrefEnv({
      set: [[PREF_PERMANENT_OVERRIDE, permanentOverride]],
    });

    let tab = await openErrorPage(BAD_CERT);
    let browser = tab.linkedBrowser;
    let loaded = BrowserTestUtils.browserLoaded(browser, false, BAD_CERT);
    info("Clicking the exceptionDialogButton in advanced panel");
    let serverCertBytes = await SpecialPowers.spawn(
      browser,
      [],
      async function () {
        let doc = content.document;
        let exceptionButton = doc.getElementById("exceptionDialogButton");
        exceptionButton.click();
        return content.docShell.failedChannel.securityInfo.serverCert.getRawDER();
      }
    );

    info("Loading the url after adding exception");
    await loaded;

    await SpecialPowers.spawn(browser, [], async function () {
      let doc = content.document;
      ok(
        !doc.documentURI.startsWith("about:certerror"),
        "Exception has been added"
      );
    });

    let certOverrideService = Cc[
      "@mozilla.org/security/certoverride;1"
    ].getService(Ci.nsICertOverrideService);

    let isTemporary = {};
    let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
      Ci.nsIX509CertDB
    );
    let cert = certdb.constructX509(serverCertBytes);
    let hasException = certOverrideService.hasMatchingOverride(
      "expired.example.com",
      -1,
      {},
      cert,
      isTemporary
    );
    ok(hasException, "Has stored an exception for the page.");
    is(
      isTemporary.value,
      !permanentOverride,
      `Has stored a ${
        permanentOverride ? "permanent" : "temporary"
      } exception for the page.`
    );

    certOverrideService.clearValidityOverride("expired.example.com", -1, {});
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }

  await SpecialPowers.flushPrefEnv();
});

add_task(async function checkBadStsCert_feltPrivacyToFalse() {
  await setSecurityCertErrorsFeltPrivacyToFalse();
  info("Loading a badStsCert and making sure exception button doesn't show up");

  for (let useFrame of [false]) {
    let tab = await openErrorPage(BAD_STS_CERT, useFrame);
    let browser = tab.linkedBrowser;

    await SpecialPowers.spawn(
      browser,
      [{ frame: useFrame }],
      async function ({ frame }) {
        let doc = frame
          ? content.document.querySelector("iframe").contentDocument
          : content.document;
        let exceptionButton = doc.getElementById("exceptionDialogButton");
        ok(
          ContentTaskUtils.isHidden(exceptionButton),
          "Exception button is hidden."
        );
      }
    );

    let message = await SpecialPowers.spawn(
      browser,
      [{ frame: useFrame }],
      async function ({ frame }) {
        let doc = frame
          ? content.document.querySelector("iframe").contentDocument
          : content.document;
        let advancedButton = doc.getElementById("advancedButton");
        advancedButton.click();

        // aboutNetError.mjs is using async localization to format several
        // messages and in result the translation may be applied later.
        // We want to return the textContent of the element only after
        // the translation completes, so let's wait for it here.
        let elements = [doc.getElementById("badCertTechnicalInfo")];
        await ContentTaskUtils.waitForCondition(() => {
          return elements.every(elem => !!elem.textContent.trim().length);
        });

        return doc.getElementById("badCertTechnicalInfo").textContent;
      }
    );
    ok(
      message.includes("SSL_ERROR_BAD_CERT_DOMAIN"),
      "Didn't find SSL_ERROR_BAD_CERT_DOMAIN."
    );
    ok(
      message.includes("The certificate is only valid for"),
      "Didn't find error message."
    );
    ok(
      message.includes("a certificate that is not valid for"),
      "Didn't find error message."
    );
    ok(
      message.includes("badchain.include-subdomains.pinning.example.com"),
      "Didn't find domain in error message."
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
  await SpecialPowers.popPrefEnv();
});

add_task(
  async function checkhideAddExceptionButtonViaPref_feltPrivacyToFalse() {
    info(
      "Loading a bad cert page and verifying the pref security.certerror.hideAddException"
    );
    await SpecialPowers.pushPrefEnv({
      set: [
        ["security.certerror.hideAddException", true],
        ["security.certerrors.felt-privacy-v1", false],
      ],
    });

    for (let useFrame of [false, true]) {
      let tab = await openErrorPage(BAD_CERT, useFrame);
      let browser = tab.linkedBrowser;

      await SpecialPowers.spawn(
        browser,
        [{ frame: useFrame }],
        async function ({ frame }) {
          let doc = frame
            ? content.document.querySelector("iframe").contentDocument
            : content.document;

          let exceptionButton = doc.getElementById("exceptionDialogButton");
          ok(
            ContentTaskUtils.isHidden(exceptionButton),
            "Exception button is hidden."
          );
        }
      );

      BrowserTestUtils.removeTab(gBrowser.selectedTab);
    }

    await SpecialPowers.flushPrefEnv();
  }
);

add_task(
  async function checkhideAddExceptionButtonInFrames_feltPrivacyToFalse() {
    await setSecurityCertErrorsFeltPrivacyToFalse();
    info("Loading a bad cert page in a frame and verifying it's hidden.");
    let tab = await openErrorPage(BAD_CERT, true);
    let browser = tab.linkedBrowser;

    await SpecialPowers.spawn(browser, [], async function () {
      let doc = content.document.querySelector("iframe").contentDocument;
      let exceptionButton = doc.getElementById("exceptionDialogButton");
      ok(
        ContentTaskUtils.isHidden(exceptionButton),
        "Exception button is hidden."
      );
    });

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    await SpecialPowers.popPrefEnv();
  }
);

// Security CertError Felt Privacy set to true
add_task(async function checkExceptionDialogButton_feltPrivacyToTrue() {
  await setSecurityCertErrorsFeltPrivacyToTrue();
  info(
    "Loading a bad cert page and making sure the exceptionDialogButton directly adds an exception"
  );
  let tab = await openErrorPage(BAD_CERT);
  let browser = tab.linkedBrowser;
  let loaded = BrowserTestUtils.browserLoaded(browser, false, BAD_CERT);
  info("Clicking the exceptionDialogButton in advanced panel");
  await SpecialPowers.spawn(browser, [], async function () {
    const netErrorCard =
      content.document.querySelector("net-error-card").wrappedJSObject;
    await netErrorCard.getUpdateComplete();

    // Perform user button click interaction
    netErrorCard.advancedButton.scrollIntoView(true);
    EventUtils.synthesizeMouseAtCenter(
      netErrorCard.advancedButton,
      {},
      content
    );
    await ContentTaskUtils.waitForCondition(
      () =>
        netErrorCard.exceptionButton && !netErrorCard.exceptionButton.disabled,
      "Wait for the exception button to be created."
    );

    info("Clicking the Proceed Risky button in advanced panel");
    netErrorCard.exceptionButton.scrollIntoView(true);
    EventUtils.synthesizeMouseAtCenter(
      netErrorCard.exceptionButton,
      {},
      content
    );
  });

  info("Loading the url after adding exception");
  await loaded;

  await SpecialPowers.spawn(browser, [], async function () {
    let doc = content.document;
    Assert.ok(
      !doc.documentURI.startsWith("about:certerror"),
      "Exception has been added"
    );
  });

  let certOverrideService = Cc[
    "@mozilla.org/security/certoverride;1"
  ].getService(Ci.nsICertOverrideService);
  certOverrideService.clearValidityOverride("expired.example.com", -1, {});
  BrowserTestUtils.removeTab(gBrowser.selectedTab);
  await SpecialPowers.popPrefEnv();
});

add_task(async function checkPermanentExceptionPref_feltPrivacyToTrue() {
  info(
    "Loading a bad cert page and making sure the permanent state of exceptions can be controlled via pref"
  );

  for (let permanentOverride of [false, true]) {
    await SpecialPowers.pushPrefEnv({
      set: [
        [PREF_PERMANENT_OVERRIDE, permanentOverride],
        ["security.certerrors.felt-privacy-v1", true],
      ],
    });

    let tab = await openErrorPage(BAD_CERT);
    let browser = tab.linkedBrowser;
    let loaded = BrowserTestUtils.browserLoaded(browser, false, BAD_CERT);
    info("Clicking the exceptionDialogButton in advanced panel");
    let serverCertBytes = await SpecialPowers.spawn(
      browser,
      [],
      async function () {
        const netErrorCard =
          content.document.querySelector("net-error-card").wrappedJSObject;
        await netErrorCard.getUpdateComplete();

        // Perform user button click interaction
        netErrorCard.advancedButton.scrollIntoView(true);
        EventUtils.synthesizeMouseAtCenter(
          netErrorCard.advancedButton,
          {},
          content
        );
        await ContentTaskUtils.waitForCondition(
          () =>
            netErrorCard.exceptionButton &&
            !netErrorCard.exceptionButton.disabled,
          "Wait for the exception button to be created."
        );

        info("Clicking the Proceed Risky button in advanced panel");
        netErrorCard.exceptionButton.scrollIntoView(true);
        EventUtils.synthesizeMouseAtCenter(
          netErrorCard.exceptionButton,
          {},
          content
        );
        return content.docShell.failedChannel.securityInfo.serverCert.getRawDER();
      }
    );

    info("Loading the url after adding exception");
    await loaded;

    await SpecialPowers.spawn(browser, [], async function () {
      let doc = content.document;
      Assert.ok(
        !doc.documentURI.startsWith("about:certerror"),
        "Exception has been added"
      );
    });

    let certOverrideService = Cc[
      "@mozilla.org/security/certoverride;1"
    ].getService(Ci.nsICertOverrideService);

    let isTemporary = {};
    let certdb = Cc["@mozilla.org/security/x509certdb;1"].getService(
      Ci.nsIX509CertDB
    );
    let cert = certdb.constructX509(serverCertBytes);
    let hasException = certOverrideService.hasMatchingOverride(
      "expired.example.com",
      -1,
      {},
      cert,
      isTemporary
    );
    Assert.ok(hasException, "Has stored an exception for the page.");
    Assert.equal(
      isTemporary.value,
      !permanentOverride,
      `Has stored a ${
        permanentOverride ? "permanent" : "temporary"
      } exception for the page.`
    );

    certOverrideService.clearValidityOverride("expired.example.com", -1, {});
    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
  await SpecialPowers.flushPrefEnv();
});

add_task(async function checkBadStsCert_feltPrivacyToTrue() {
  await setSecurityCertErrorsFeltPrivacyToTrue();
  info("Loading a badStsCert and making sure exception button doesn't show up");

  for (let useFrame of [false, true]) {
    let tab = await openErrorPage(BAD_STS_CERT, useFrame);
    let browser = tab.linkedBrowser;

    await SpecialPowers.spawn(
      browser,
      [{ frame: useFrame }],
      async function ({ frame }) {
        let doc = frame
          ? content.document.querySelector("iframe").contentDocument
          : content.document;

        const netErrorCard = await ContentTaskUtils.waitForCondition(
          () => doc.querySelector("net-error-card")?.wrappedJSObject
        );
        await netErrorCard.getUpdateComplete();

        // Perform user button click interaction to load exception button
        netErrorCard.advancedButton.scrollIntoView(true);
        EventUtils.synthesizeMouseAtCenter(
          netErrorCard.advancedButton,
          {},
          content
        );
        await netErrorCard.getUpdateComplete();
        Assert.ok(
          !netErrorCard.exceptionButton,
          "The exception button is not found in DOM."
        );

        // Check that the HSTS explanation text is present in the intro section
        const stsExplanation = netErrorCard.badStsCertExplanation;
        Assert.ok(
          stsExplanation,
          "The HSTS explanation element exists in the intro section."
        );
        Assert.equal(
          stsExplanation.dataset.l10nId,
          "certerror-what-should-i-do-bad-sts-cert-explanation",
          "The HSTS explanation has the correct l10n ID."
        );
      }
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
  await SpecialPowers.popPrefEnv();
});

add_task(async function checkhideAddExceptionButtonViaPref_feltPrivacyToTrue() {
  info(
    "Loading a bad cert page and verifying the pref security.certerror.hideAddException"
  );

  await SpecialPowers.pushPrefEnv({
    set: [
      ["security.certerror.hideAddException", true],
      ["security.certerrors.felt-privacy-v1", true],
    ],
  });

  for (let useFrame of [false, true]) {
    let tab = await openErrorPage(BAD_CERT, useFrame);
    let browser = tab.linkedBrowser;

    await SpecialPowers.spawn(
      browser,
      [{ frame: useFrame }],
      async function ({ frame }) {
        let doc = frame
          ? content.document.querySelector("iframe").contentDocument
          : content.document;

        const netErrorCard = await ContentTaskUtils.waitForCondition(
          () => doc.querySelector("net-error-card")?.wrappedJSObject
        );
        await netErrorCard.getUpdateComplete();

        // Perform user button click interaction to load exception button
        netErrorCard.advancedButton.click();

        Assert.ok(
          !netErrorCard.exceptionButton,
          "The exception button is not found in DOM."
        );
      }
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
  await SpecialPowers.flushPrefEnv();
});

add_task(
  async function checkhideAddExceptionButtonInFrames_feltPrivacyToTrue() {
    await setSecurityCertErrorsFeltPrivacyToTrue();
    info("Loading a bad cert page in a frame and verifying it's hidden.");
    let tab = await openErrorPage(BAD_CERT, true);
    let browser = tab.linkedBrowser;

    await SpecialPowers.spawn(browser, [], async function () {
      let doc = content.document.querySelector("iframe").contentDocument;
      const netErrorCard = await ContentTaskUtils.waitForCondition(
        () => doc.querySelector("net-error-card")?.wrappedJSObject
      );
      await netErrorCard.getUpdateComplete();

      // Perform user button click interaction to load exception button
      netErrorCard.advancedButton.click();

      Assert.ok(
        !netErrorCard.exceptionButton,
        "The exception button is not found in DOM."
      );
    });

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
    await SpecialPowers.popPrefEnv();
  }
);
