function trimTaintTest() {
    var str = multiTaint(randomString(30).trim());
    var trimMe = "      " + str + "  " + taint("           ") + " ";
    assertEqualTaint(trimMe.trim(), str);
}

runTaintTest(trimTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
