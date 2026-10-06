// |reftest| skip-if(!this.hasOwnProperty("Intl")||!xulRuntime.shell)

const locales = {
  "en": "en",
  "en-US": "en-US",
  "en-Latn-US": "en-Latn-US",

  // Variant subtags are stripped.
  "de-1997": "de",
  "de-Latn-1997": "de-Latn",
  "de-Latn-DE-1997": "de-Latn-DE",

  // Unicode extension subtags are stripped.
  "fr-u-ca-gregory": "fr",

  // Invalid inputs are changed to the unknown locale "und-Zzzz-ZZ".
  "C": "und-Zzzz-ZZ",
  "POSIX": "und-Zzzz-ZZ",

  // Case is normalized.
  "En-LaTn-Us": "en-Latn-US",

  // Locales are canonicalized.
  "eng": "en",
  "cnr": "sr-ME",
};

for (let [locale, expected] of Object.entries(locales)) {
  setDefaultLocale(locale);
  assertEq(getDefaultLocale(), expected, `Locale: "${locale}"`);

  // Reset to system default locale.
  setDefaultLocale(undefined);
}

// getRealmLocale() returns the computed default locale for ECMA-402.
function ActualDefaultLocale(locale, expected) {
  var isSupported = false;
  try {
    isSupported = Intl.NumberFormat.supportedLocalesOf(locale).length > 0;
  } catch {}

  // Return last-ditch locale if not supported.
  if (!isSupported) {
    return "en-GB";
  }

  // Return the actual available locale.
  return new Intl.NumberFormat(expected).resolvedOptions().locale;
}

for (let [locale, expected] of Object.entries(locales)) {
  expected = ActualDefaultLocale(locale, expected);

  setRealmLocale(locale);
  assertEq(getRealmLocale(), expected, `Locale: "${locale}"`);

  // Reset to system default locale.
  setRealmLocale(undefined);
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
