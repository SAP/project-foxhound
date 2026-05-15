"use strict";

const PAGE_URL =
  "https://example.org/browser/browser/extensions/formautofill/test/fixtures/autocomplete_multiple_emails_checkout.html";

// This testcase is to ensure that if a field gets recoginised by both
// login manager and formautofill providers, that if an address is saved,
// that the formautofill popup gets priority over the login manager.

// The first two tests check what happens when the field is focused and the
// popup is manually opened with the keyboard.

add_task(async function test_email_field_is_address_dropdown() {
  await SpecialPowers.pushPrefEnv({
    set: [["signon.rememberSignons", true]],
  });
  // If an address is saved, show the formautofill dropdown.
  await setStorage(TEST_ADDRESS_1);
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_URL },
    async function (browser) {
      const focusInput = "#email";
      // We need to initialize and identify fields on a field that doesn't trigger
      // a login autocomplete on focus, otherwise the popup could appear too early.
      await focusAndWaitForFieldsIdentified(browser, "#given-name");
      await openPopupOn(browser, focusInput);
      const item = getDisplayedPopupItems(browser)[1];

      is(
        item.getAttribute("ac-value"),
        "Manage addresses",
        "Address popup should show a valid email suggestion"
      );

      await closePopup(browser);
    }
  );
});

add_task(
  async function test_email_field_shows_login_dropdown_when_no_saved_address() {
    // However, if no addresses are saved, show the login manager.
    await removeAllRecords();
    await BrowserTestUtils.withNewTab(
      { gBrowser, url: PAGE_URL },
      async function (browser) {
        const focusInput = "#email";
        await focusAndWaitForFieldsIdentified(browser, "#given-name");
        await openPopupOn(browser, focusInput);
        const item = getDisplayedPopupItems(browser)[0];

        is(
          item.getAttribute("ac-value"),
          "Manage Passwords",
          "Login Manager should be shown"
        );

        await closePopup(browser);
      }
    );
  }
);

// The next two tests check what happens when the field is focused but the
// popup is not manually opened.

add_task(async function test_email_field_is_address_dropdown_onfocus() {
  // However, if no addresses are saved, show the login manager.
  await removeAllRecords();

  await SpecialPowers.pushPrefEnv({
    set: [["signon.rememberSignons", true]],
  });
  // If an address is saved, show the formautofill dropdown.
  await setStorage(TEST_ADDRESS_1);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: PAGE_URL },
    async function (browser) {
      // Note that at present the popup will appear on focus because
      // it could be a login form, even through the address items appear
      // in the popup menu.
      await SpecialPowers.spawn(browser, [], () => {
        content.document.getElementById("email").focus();
      });
      await runAndWaitForAutocompletePopupOpen(browser, () => {});
      const item = getDisplayedPopupItems(browser)[1];

      is(
        item.getAttribute("ac-value"),
        "Manage addresses",
        "Address popup should show a valid email suggestion"
      );

      await closePopup(browser);
    }
  );
});

add_task(
  async function test_email_field_shows_login_dropdown_when_no_saved_address_onfocus() {
    // However, if no addresses are saved, show the login manager.
    await removeAllRecords();
    await BrowserTestUtils.withNewTab(
      { gBrowser, url: PAGE_URL },
      async function (browser) {
        await SpecialPowers.spawn(browser, [], () => {
          content.document.getElementById("email").focus();
        });
        await runAndWaitForAutocompletePopupOpen(browser, () => {});
        const item = getDisplayedPopupItems(browser)[0];

        is(
          item.getAttribute("ac-value"),
          "Manage Passwords",
          "Login Manager should be shown"
        );

        await closePopup(browser);
      }
    );
  }
);
