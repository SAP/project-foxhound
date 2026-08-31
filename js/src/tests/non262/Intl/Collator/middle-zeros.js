/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// Middle zeros after identical prefix should not be treated as leading zeros.
{
  let collator = new Intl.Collator("en", { numeric: true });
  assertEq(collator.compare("5001", "501"), 1);
  assertEq(collator.compare("50001", "5002"), 1);
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
