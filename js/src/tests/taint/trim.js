// Test taint propagation with str.trim()

var orig = randomString(30).trim();
orig = multitaint(orig);
var toTrim = "      " + orig + "  " + taint("           ") + " ";

assertDeepEq(toTrim.trim().taint, orig.taint);

if (typeof reportCompare === "function")
  reportCompare(true, true);
