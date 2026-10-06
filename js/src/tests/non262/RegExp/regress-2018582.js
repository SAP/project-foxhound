// |reftest| skip-if(!this.hasOwnProperty("Intl")) -- Unicode RegExp requires ICU

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

assertEq(/\p{CWCF}/iu.test("a"), true);
assertEq(/\p{CWCF}/iu.test("A"), true);
assertEq(/\p{CWCF}/iv.test("a"), true);
assertEq(/\p{CWCF}/iv.test("A"), true);
assertEq(/\P{CWCF}/iu.test("a"), true);
assertEq(/\P{CWCF}/iu.test("A"), true);
assertEq(/\P{CWCF}/iv.test("a"), false);
assertEq(/\P{CWCF}/iv.test("A"), false);

if (typeof reportCompare === "function")
  reportCompare(0, 0, "ok");
