/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test languages for which the root collation without
// script reordering is attested to be valid.
{
  let locales = [
    "de",
    "en",
    "fr",
    "ga",
    "id",
    "it",
    "lb",
    "lij",
    "ms",
    "nl",
    "pt",
    "st",
    "sw",
    "xh",
    "zu",
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale, { sensitivity: "base" });
    assertEq(collator.resolvedOptions().locale, locale);
    assertEq(collator.resolvedOptions().collation, "default");
    assertEq(collator.compare("ae", "ä"), 1);
    let eor = new Intl.Collator(locale, { collation: "eor", sensitivity: "base" });
    assertEq(eor.resolvedOptions().locale, locale);
    assertEq(eor.resolvedOptions().collation, "eor");
    assertEq(eor.compare("ae", "ä"), 1);
    let emoji = new Intl.Collator(locale, { collation: "emoji", sensitivity: "base" });
    assertEq(emoji.resolvedOptions().locale, locale);
    assertEq(emoji.resolvedOptions().collation, "emoji");
    assertEq(emoji.compare("ae", "ä"), 1);
  }
}

// Test some non-root Latin-script languages.
{
  let locales = [
    "fi",
    "sv",
    "da",
    "no",
  ];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale, { sensitivity: "base" });
    assertEq(collator.resolvedOptions().locale, locale);
    assertEq(collator.resolvedOptions().collation, "default");
    assertEq(collator.compare("ae", "ä"), -1);
    let eor = new Intl.Collator(locale, { collation: "eor", sensitivity: "base" });
    assertEq(eor.resolvedOptions().locale, locale);
    assertEq(eor.resolvedOptions().collation, "eor");
    assertEq(eor.compare("ae", "ä"), 1); // eor overrides language
    let emoji = new Intl.Collator(locale, { collation: "emoji", sensitivity: "base" });
    assertEq(emoji.resolvedOptions().locale, locale);
    assertEq(emoji.resolvedOptions().collation, "emoji");
    assertEq(emoji.compare("ae", "ä"), 1); // emoji overrides language
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
