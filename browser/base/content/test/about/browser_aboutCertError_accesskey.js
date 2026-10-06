/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

const BAD_CERT = "https://expired.example.com/";
const UNKNOWN_ISSUER = "https://self-signed.example.com";
const DNS_NOT_FOUND = "https://nonexistent-domain-for-testing.invalid/";

add_setup(async function () {
  await setSecurityCertErrorsFeltPrivacyToTrue();
});

function getAccessKeyModifiers() {
  const contentAccess = Services.prefs.getIntPref("ui.key.contentAccess", 5);
  return {
    shiftKey: !!(contentAccess & 1),
    ctrlKey: !!(contentAccess & 2),
    altKey: !!(contentAccess & 4),
    metaKey: !!(contentAccess & 8),
  };
}

add_task(async function test_goBackButton_accesskey() {
  info("Test Go Back button has correct accesskey attribute and activates");

  let tab = await openErrorPage(BAD_CERT, false);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(
    browser,
    [getAccessKeyModifiers()],
    async function (mods) {
      const netErrorCard =
        content.document.querySelector("net-error-card").wrappedJSObject;
      await netErrorCard.getUpdateComplete();

      const returnButton = netErrorCard.returnButton;
      Assert.ok(returnButton, "Return button exists");

      await ContentTaskUtils.waitForCondition(
        () => returnButton.accessKey,
        "Waiting for accesskey to be set by Fluent"
      );

      is(returnButton.accessKey, "G", "Return button has accesskey 'G'");

      let clickReceived = false;
      returnButton.addEventListener(
        "click",
        e => {
          e.stopImmediatePropagation();
          clickReceived = true;
        },
        { capture: true, once: true }
      );

      EventUtils.synthesizeKey("g", mods, content);

      Assert.ok(clickReceived, "Access key G activated the Go Back button");
    }
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_proceedButton_accesskey() {
  info(
    "Test Proceed button has correct accesskey attribute in advanced section and activates"
  );

  let tab = await openErrorPage(UNKNOWN_ISSUER, false);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(
    browser,
    [getAccessKeyModifiers()],
    async function (mods) {
      const netErrorCard =
        content.document.querySelector("net-error-card").wrappedJSObject;
      await netErrorCard.getUpdateComplete();

      const advancedButton = netErrorCard.advancedButton;
      Assert.ok(advancedButton, "Advanced button exists");

      advancedButton.scrollIntoView(true);
      EventUtils.synthesizeMouseAtCenter(advancedButton, {}, content);

      await ContentTaskUtils.waitForCondition(
        () =>
          netErrorCard.advancedContainer &&
          ContentTaskUtils.isVisible(netErrorCard.advancedContainer),
        "Advanced container is visible"
      );

      await ContentTaskUtils.waitForCondition(
        () =>
          netErrorCard.exceptionButton &&
          !netErrorCard.exceptionButton.disabled,
        "Exception button is enabled after security delay"
      );

      const exceptionButton = netErrorCard.exceptionButton;
      Assert.ok(exceptionButton, "Exception button exists");

      await ContentTaskUtils.waitForCondition(
        () => exceptionButton.accessKey,
        "Waiting for accesskey to be set by Fluent"
      );

      is(exceptionButton.accessKey, "P", "Exception button has accesskey 'P'");

      let clickReceived = false;
      exceptionButton.addEventListener(
        "click",
        e => {
          e.stopImmediatePropagation();
          clickReceived = true;
        },
        { capture: true, once: true }
      );

      EventUtils.synthesizeKey("p", mods, content);

      Assert.ok(clickReceived, "Access key P activated the exception button");
    }
  );

  await BrowserTestUtils.removeTab(tab);

  // Clear any cert exception that may have been added when the exception button
  // access key was activated.
  Cc["@mozilla.org/security/certoverride;1"]
    .getService(Ci.nsICertOverrideService)
    .clearValidityOverride("self-signed.example.com", -1, {});
});

add_task(async function test_tryAgainButton_accesskey() {
  info(
    "Test Try Again button has correct accesskey attribute for network errors and activates"
  );

  let tab = await openErrorPage(DNS_NOT_FOUND, false);
  let browser = tab.linkedBrowser;

  await SpecialPowers.spawn(
    browser,
    [getAccessKeyModifiers()],
    async function (mods) {
      const netErrorCard =
        content.document.querySelector("net-error-card").wrappedJSObject;
      await netErrorCard.getUpdateComplete();

      const tryAgainButton = netErrorCard.tryAgainButton;
      Assert.ok(tryAgainButton, "Try Again button exists");

      await ContentTaskUtils.waitForCondition(
        () => tryAgainButton.accessKey,
        "Waiting for accesskey to be set by Fluent"
      );

      is(tryAgainButton.accessKey, "T", "Try Again button has accesskey 'T'");

      let clickReceived = false;
      tryAgainButton.addEventListener(
        "click",
        e => {
          e.stopImmediatePropagation();
          clickReceived = true;
        },
        { capture: true, once: true }
      );

      EventUtils.synthesizeKey("t", mods, content);

      Assert.ok(clickReceived, "Access key T activated the Try Again button");
    }
  );

  await BrowserTestUtils.removeTab(tab);
});

add_task(async function test_accesskeys_across_error_types() {
  info("Test that accesskeys are correctly set across different error types");

  const testCases = [
    {
      errorUrl: BAD_CERT,
      description: "expired certificate error",
      openAdvanced: false,
      expectedButtons: {
        returnButton: "G",
      },
    },
    {
      errorUrl: UNKNOWN_ISSUER,
      description: "unknown issuer with advanced section",
      openAdvanced: true,
      expectedButtons: {
        returnButton: "G",
        exceptionButton: "P",
      },
    },
    {
      errorUrl: DNS_NOT_FOUND,
      description: "network error",
      openAdvanced: false,
      expectedButtons: {
        tryAgainButton: "T",
        returnButton: "G",
      },
    },
  ];

  for (const testCase of testCases) {
    info(`Testing ${testCase.description}`);

    let tab = await openErrorPage(testCase.errorUrl, false);
    let browser = tab.linkedBrowser;

    await SpecialPowers.spawn(
      browser,
      [testCase],
      async function (testCaseData) {
        const netErrorCard =
          content.document.querySelector("net-error-card").wrappedJSObject;
        await netErrorCard.getUpdateComplete();

        if (testCaseData.openAdvanced) {
          const advancedButton = netErrorCard.advancedButton;
          advancedButton.scrollIntoView(true);
          EventUtils.synthesizeMouseAtCenter(advancedButton, {}, content);

          await ContentTaskUtils.waitForCondition(
            () =>
              netErrorCard.advancedContainer &&
              ContentTaskUtils.isVisible(netErrorCard.advancedContainer),
            "Advanced container is visible"
          );

          await ContentTaskUtils.waitForCondition(
            () =>
              netErrorCard.exceptionButton &&
              !netErrorCard.exceptionButton.disabled,
            "Exception button is enabled"
          );
        }

        for (const [buttonName, expectedAccessKey] of Object.entries(
          testCaseData.expectedButtons
        )) {
          const button = netErrorCard[buttonName];

          if (!button) {
            info(
              `${buttonName} not present for ${testCaseData.description} (skipping)`
            );
            continue;
          }

          Assert.ok(
            button,
            `${buttonName} exists for ${testCaseData.description}`
          );

          await ContentTaskUtils.waitForCondition(
            () => button.accessKey,
            `Waiting for ${buttonName} accesskey to be set by Fluent`
          );

          is(
            button.accessKey,
            expectedAccessKey,
            `${buttonName} has correct accesskey '${expectedAccessKey}' for ${testCaseData.description}`
          );
        }
      }
    );

    await BrowserTestUtils.removeTab(tab);
  }
});
