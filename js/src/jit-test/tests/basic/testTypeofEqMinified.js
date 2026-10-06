assertEq(typeof foo === "undefined", true);
assertEq(typeof foo !== "undefined", false);

assertEq("undefined" === typeof foo, true);
assertEq("undefined" !== typeof foo, false);

assertEq(typeof foo > "u", true);
assertEq(typeof foo < "u", false);

assertEq("u" < typeof foo, true);
assertEq("u" > typeof foo, false);

assertEq(typeof foo >= "u", true);
assertEq(typeof foo <= "u", false);

assertEq("u" <= typeof foo, true);
assertEq("u" >= typeof foo, false);
