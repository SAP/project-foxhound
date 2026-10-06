/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Non-phonebk collates as root.
{
  let locales = ["de", "de-DE", "de-AT", "de-CH"];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale, { sensitivity: "base" });
    assertEq(collator.resolvedOptions().collation, "default");
    assertEq(collator.compare("ae", "ä"), 1);
  }
}

// In de-u-co-phonebk, "ä" is primary-equal to "ae".
{
  let locales = ["de", "de-DE", "de-CH"];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale, { sensitivity: "base", collation: "phonebk" });
    assertEq(collator.resolvedOptions().collation, "phonebk");
    assertEq(collator.compare("ae", "ä"), 0);
  }
}

// In de-AT-u-co-phonebk, "ä" is a base letter.
{
  let locales = ["de-AT"];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale, { sensitivity: "base", collation: "phonebk" });
    assertEq(collator.resolvedOptions().collation, "phonebk");
    assertEq(collator.compare("ae", "ä"), -1);
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
