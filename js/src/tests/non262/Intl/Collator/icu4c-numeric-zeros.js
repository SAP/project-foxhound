/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

// ICU4C computes wrong results in the numeric mode
// with long sequences of zeros. Test that we match
// the incorrect behavior (without panic) for now.

{
  let collator = new Intl.Collator("en", { numeric: true });
  assertEq(collator.compare("1" + "0".repeat(770), "2" + "0".repeat(769)), -1);
}

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
