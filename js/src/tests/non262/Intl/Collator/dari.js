/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Dari collates like Pashto.
{
  let locales = ["ps", "fa-AF"];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.resolvedOptions().locale, locale);
    assertEq(collator.resolvedOptions().collation, "default");
    assertEq(collator.compare("أ", "ء"), -1);
  }
}

// Persian does not collate like Dari.
{
  let locales = ["fa"];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.resolvedOptions().locale, locale);
    assertEq(collator.resolvedOptions().collation, "default");
    assertEq(collator.compare("أ", "ء"), 1);
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
