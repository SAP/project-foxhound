add_task(async function test_openPreferences_spotlight() {
  await SpecialPowers.pushPrefEnv({
    set: [["browser.settings-redesign.enabled", true]],
  });

  for (let [arg, expectedPane, expectedHash, expectedSubcategory] of [
    ["privacy-reports", "panePermissionsData", "#permissionsData", "reports"],
    [
      "privacy-address-autofill",
      "panePasswordsAutofill",
      "#passwordsAutofill",
      "addresses-autofill address-autofill",
    ],
    [
      "privacy-payment-methods-autofill",
      "panePasswordsAutofill",
      "#passwordsAutofill",
      "payment-methods-autofill credit-card-autofill",
    ],
    ["privacy-logins", "panePasswordsAutofill", "#passwordsAutofill", "logins"],
    ["privacy-trackingprotection", "panePrivacy", "#privacy", "etpStatus"],
  ]) {
    if (
      arg == "privacy-credit-card-autofill" &&
      Services.prefs.getCharPref(
        "extensions.formautofill.creditCards.supported"
      ) == "off"
    ) {
      continue;
    }
    if (
      arg == "privacy-address-autofill" &&
      Services.prefs.getCharPref(
        "extensions.formautofill.addresses.supported"
      ) == "off"
    ) {
      continue;
    }

    let prefs = await openPreferencesViaOpenPreferencesAPI(arg, {
      leaveOpen: true,
    });
    is(prefs.selectedPane, expectedPane, "The right pane is selected");
    let doc = gBrowser.contentDocument;
    is(
      doc.location.hash,
      expectedHash,
      "The subcategory should be removed from the URI"
    );
    await TestUtils.waitForCondition(
      () => doc.querySelector(".spotlight"),
      "Wait for the spotlight"
    );
    is(
      doc.querySelector(".spotlight").getAttribute("data-subcategory"),
      expectedSubcategory,
      "The right subcategory is spotlighted"
    );

    doc.defaultView.spotlight(null);
    is(
      doc.querySelector(".spotlight"),
      null,
      "The spotlighted section is cleared"
    );

    BrowserTestUtils.removeTab(gBrowser.selectedTab);
  }
});
