"use strict";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["extensions.formautofill.addresses.experiments.enabled", false],
      ["extensions.formautofill.addresses.capture.enabled", true],
      ["extensions.formautofill.addresses.supported", "detect"],
      ["extensions.formautofill.addresses.supportedCountries", "US,CA"],
      [
        "extensions.formautofill.addresses.capture.requiredFields",
        "street-address",
      ],
    ],
  });
});

add_task(async function test_save_doorhanger_supported_region() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: ADDRESS_FORM_URL },
    async function (browser) {
      const onPopupShown = waitForPopupShown();

      await focusUpdateSubmitForm(browser, {
        focusSelector: "#given-name",
        newValues: {
          "#given-name": "John",
          "#family-name": "Doe",
          "#organization": "Mozilla",
          "#street-address": "123 Sesame Street",
          "#country": "US",
        },
      });
      await onPopupShown;
      await clickDoorhangerButton(MAIN_BUTTON, 0);
    }
  );

  await expectSavedAddressesCount(1);
  await removeAllRecords();
});

add_task(async function test_save_doorhanger_supported_region_from_pref() {
  const initialHomeRegion = Region._home;
  const initialCurrentRegion = Region._current;
  const region = "US";
  Region._setCurrentRegion(region);
  Region._setHomeRegion(region);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: ADDRESS_FORM_URL },
    async function (browser) {
      // Remove the country field
      await SpecialPowers.spawn(browser, [], async function () {
        let countryField = content.document.getElementById("country");
        countryField.remove();
      });

      const onPopupShown = waitForPopupShown();

      await focusUpdateSubmitForm(browser, {
        focusSelector: "#given-name",
        newValues: {
          "#given-name": "John",
          "#family-name": "Doe",
          "#organization": "Mozilla",
          "#street-address": "123 Sesame Street",
        },
      });
      await onPopupShown;
      await clickDoorhangerButton(MAIN_BUTTON, 0);
    }
  );

  Region._setCurrentRegion(initialHomeRegion);
  Region._setHomeRegion(initialCurrentRegion);

  await expectSavedAddressesCount(1);
  await removeAllRecords();
});

/**
 * Do not display the address capture doorhanger if the country field of the
 * submitted form is not on the supported list."
 */
add_task(async function test_save_doorhanger_unsupported_region_from_record() {
  await BrowserTestUtils.withNewTab(
    { gBrowser, url: ADDRESS_FORM_URL },
    async function (browser) {
      await focusUpdateSubmitForm(browser, {
        focusSelector: "#given-name",
        newValues: {
          "#given-name": "John",
          "#family-name": "Doe",
          "#organization": "Mozilla",
          "#street-address": "123 Sesame Street",
          "#country": "DE",
        },
      });

      await ensureNoDoorhanger();
    }
  );
});

add_task(async function test_save_doorhanger_unsupported_region_from_pref() {
  const initialHomeRegion = Region._home;
  const initialCurrentRegion = Region._current;

  const region = "FR";
  Region._setCurrentRegion(region);
  Region._setHomeRegion(region);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: ADDRESS_FORM_URL },
    async function (browser) {
      await focusUpdateSubmitForm(browser, {
        focusSelector: "#given-name",
        newValues: {
          "#given-name": "John",
          "#family-name": "Doe",
          "#organization": "Mozilla",
          "#street-address": "123 Sesame Street",
        },
      });

      await ensureNoDoorhanger();
    }
  );

  Region._setCurrentRegion(initialHomeRegion);
  Region._setHomeRegion(initialCurrentRegion);
});

add_task(async function test_save_doorhanger_unsupported_region_supported_on() {
  await expectSavedAddressesCount(0);

  // Now try with the supported preference set to "on".
  await SpecialPowers.pushPrefEnv({
    set: [["extensions.formautofill.addresses.supported", "on"]],
  });

  const initialHomeRegion = Region._home;
  const initialCurrentRegion = Region._current;

  const region = "FR";
  Region._setCurrentRegion(region);
  Region._setHomeRegion(region);

  await BrowserTestUtils.withNewTab(
    { gBrowser, url: ADDRESS_FORM_URL },
    async function (browser) {
      let onPopupShown = waitForPopupShown();

      await focusUpdateSubmitForm(browser, {
        focusSelector: "#given-name",
        newValues: {
          "#given-name": "John",
          "#family-name": "Doe",
          "#organization": "Mozilla",
          "#street-address": "123 Sesame Street",
        },
      });

      await onPopupShown;
      await clickDoorhangerButton(MAIN_BUTTON, 0);
    }
  );

  Region._setCurrentRegion(initialHomeRegion);
  Region._setHomeRegion(initialCurrentRegion);

  await expectSavedAddressesCount(1);
  await removeAllRecords();
});
