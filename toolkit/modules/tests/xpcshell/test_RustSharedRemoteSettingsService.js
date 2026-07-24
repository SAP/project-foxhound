/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

ChromeUtils.defineESModuleGetters(this, {
  Region: "resource://gre/modules/Region.sys.mjs",
  SharedRemoteSettingsService:
    "resource://gre/modules/RustSharedRemoteSettingsService.sys.mjs",
  Utils: "resource://services-settings/Utils.sys.mjs",
});

// When the app's region or locale changes, `SharedRemoteSettingsService` should
// update its country and locale.
add_task(async function regionOrLocaleChanged() {
  let tests = [
    { country: "US", locale: "en-US" },
    { country: "US", locale: "es-MX" },
    { country: "DE", locale: "de" },
    { country: "DE", locale: "en-US" },
  ];

  for (let { country, locale } of tests) {
    await withRegionAndLocale({
      locale,
      region: country,
      callback: async () => {
        await waitForServiceCountryAndLocale({ country, locale });
        Assert.equal(
          SharedRemoteSettingsService.country,
          country,
          "SharedRemoteSettingsService.country should be the expected country"
        );
        Assert.equal(
          SharedRemoteSettingsService.locale,
          locale,
          "SharedRemoteSettingsService.locale should be the expected locale"
        );
      },
    });
  }
});

// When the app's region or locale changes, the service's server URL should not
// change. This task makes sure we use the correct server URL when we update the
// config in response to region or locale changes.
add_task(async function serverUrl() {
  let countriesAndLocales = [
    { newLocale: "de" },
    { newCountry: "DE" },
    { newCountry: "DE", newLocale: "de" },
  ];
  let serverUrls = [
    undefined,
    Utils.SERVER_URL,
    "https://example.com/test-shared-rs-service-1",
    "https://example.com/test-shared-rs-service-2",
  ];
  for (let { newCountry, newLocale } of countriesAndLocales) {
    for (let url of serverUrls) {
      await doServerUrlTest({ newCountry, newLocale, url });
    }
  }
});

async function doServerUrlTest({
  url,
  newCountry = "US",
  newLocale = "en-US",
}) {
  // First, set an initial app country and locale.
  await withRegionAndLocale({
    region: "US",
    locale: "en-US",
    callback: async () => {
      await waitForServiceCountryAndLocale({ country: "US", locale: "en-US" });

      // Set the initial server URL.
      SharedRemoteSettingsService.updateServer({ url });

      // Now update the app country and locale.
      await withRegionAndLocale({
        region: newCountry,
        locale: newLocale,
        callback: async () => {
          await waitForServiceCountryAndLocale({
            country: newCountry,
            locale: newLocale,
          });

          // The server URL set above should remain set.
          if (!url || url == Utils.SERVER_URL) {
            // A falsey URL should fall back to `Utils.SERVER_URL`, and during
            // testing `Utils.SERVER_URL` is a cannot-be-a-base URL, so the
            // server should be undefined.
            Assert.ok(
              !SharedRemoteSettingsService.server,
              "SharedRemoteSettingsService.server should be undefined"
            );
          } else {
            Assert.ok(
              SharedRemoteSettingsService.server,
              "SharedRemoteSettingsService.server should be defined"
            );
            Assert.equal(
              SharedRemoteSettingsService.server.url,
              url,
              "SharedRemoteSettingsService.server.url should be as expected"
            );
          }
        },
      });
    },
  });
}

/**
 * Sets the app's region (country) and locale, calls your callback, and restores
 * the original region and locale.
 *
 * @param {string} region
 *   The app region to set.
 * @param {string} locale
 *   The app locale to set.
 * @param {function} callback
 *   Your callback.
 */
async function withRegionAndLocale({ region, locale, callback }) {
  let originalRegion = Region.home;

  info("Setting region: " + region);
  Region._setHomeRegion(region, true);

  Assert.equal(Region.home, region, "Region should now be the desired region");

  let { availableLocales, requestedLocales } = Services.locale;
  let localePromise = waitForLocaleChange(locale);

  info("Setting locale: " + locale);
  Services.locale.availableLocales = [locale];
  Services.locale.requestedLocales = [locale];

  info("Waiting for locale change");
  await localePromise;
  info("Done waiting for locale change");

  Assert.equal(
    Services.locale.appLocaleAsBCP47,
    locale,
    "App locale should now be the desired locale"
  );

  info("Calling callback");
  await callback();
  info("Done calling callback");

  // Restore the original region and locales.
  info("Resetting region to orginal: " + originalRegion);
  Region._setHomeRegion(originalRegion, true);

  Assert.equal(
    Region.home,
    originalRegion,
    "Region should now be the original region"
  );

  let restoreLocalePromise = waitForLocaleChange(requestedLocales[0]);
  Services.locale.availableLocales = availableLocales;
  Services.locale.requestedLocales = requestedLocales;

  info("Waiting for original locale to be restored");
  await restoreLocalePromise;
  info("Done waiting for original locale to be restored");

  Assert.equal(
    Services.locale.appLocaleAsBCP47,
    requestedLocales[0],
    "App locale should now be the original locale"
  );
}

/**
 * Waits for the app locale to be set to an expected value.
 *
 * @param {string} locale
 *   The expected locale.
 */
async function waitForLocaleChange(locale) {
  // Nothing happens when the locale doesn't actually change.
  if (locale == Services.locale.requestedLocales[0]) {
    info("Locale is already set");
  } else {
    info("Waiting for intl:app-locales-changed");
    await TestUtils.topicObserved("intl:app-locales-changed");
    info("Got intl:app-locales-changed");
  }
}

/**
 * Waits for the country and locale of the `SharedRemoteSettingsService` to be
 * set to some expected values.
 *
 * @param {string} country
 *   The expected country.
 * @param {string} locale
 *   The expected locale.
 */
async function waitForServiceCountryAndLocale({ country, locale }) {
  await TestUtils.waitForCondition(
    () =>
      SharedRemoteSettingsService.country == country &&
      SharedRemoteSettingsService.locale == locale,
    "Waiting for SharedRemoteSettingsService country and locale to be set: " +
      JSON.stringify({ country, locale })
  );
}
