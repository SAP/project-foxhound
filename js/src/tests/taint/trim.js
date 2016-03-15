// Test taint propagation with str.trim()

var orig = randomMultiTaintString();
var toTrim = "      " + orig + taint("           ");

var n = toTrim.trim();
assertDeepEq(n.taint, orig.trim().taint);

if (typeof reportCompare === "function")
  reportCompare(true, true);
