// |reftest| skip-if(!xulRuntime.shell)

var BUGNUMBER = 1509768;
var summary = "String#replace with an empty string pattern on a rope should prepend the replacement string.";

print(BUGNUMBER + ": " + summary);

// Rope is created when the string length >= 25.
//
// This testcase depends on that condition to reliably test the code for
// String#replace on a rope.
//
// Please rewrite this testcase when the following assertion fails.
//
// As Foxhound adjusts the internal string structure, the norope/rope boundary is now 32
//
var norope = 32
var rope = norope + 1
assertEq(isRope("a".repeat(norope)), false);
assertEq(isRope("a".repeat(rope)), true);

// Not a rope.
assertEq("a".repeat(norope).replace("", "foo"),
         "foo" + "a".repeat(norope));
assertEq("a".repeat(norope).replace("", ""),
         "a".repeat(norope));

// A rope.
assertEq("a".repeat(rope).replace("", "foo"),
         "foo" + "a".repeat(rope));
assertEq("a".repeat(rope).replace("", ""),
         "a".repeat(rope));

if (typeof reportCompare === "function")
    reportCompare(true, true);
