/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test Latn
{
  let locales = [
    "bs",
    "hr",
    "bs-BA",
    "hr-HR",
    "sr-ME",
    "bs-Latn",
    "hr-Latn",
    "sr-Latn",
    "bs-Latn-BA",
    "hr-Latn-HR",
    "sr-Latn-RS",
    "sr-Latn-ME",
    "sr-Latn-XK",
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.compare("č", "ć"), -1);
  }
}

// Test Cyrl
{
  let locales = [
    // hr-Cyrl intentionally not on the list
    "sr",
    "sr-RS",
    "sr-XK",
    "sr-Cyrl",
    "bs-Cyrl",
    "bs-Cyrl-BA",
    "sr-Cyrl-RS",
    "sr-Cyrl-ME",
    "sr-Cyrl-XK",
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.compare("йа", "ив"), -1);
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
