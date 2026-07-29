/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Test Nynorsk and Bokmål mapping
{
  let locales = ["no", "nn", "nb"];
  for (let locale of locales) {
    let collator = new Intl.Collator(locale);
    assertEq(collator.resolvedOptions().locale, locale);
    assertEq(collator.compare("ø", "z"), 1);
  }
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
