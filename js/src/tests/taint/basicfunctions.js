function basicTaintTest() {
    // Make sure newly allocated strings are untainted
    var untaintedString = "a string literal";
    assertNotTainted(untaintedString);
    untaintedString = randomString();
    assertNotTainted(untaintedString);

    // Test basic (manual) string tainting
    var taintedString = String.newAllTainted(untaintedString);
    var taint = taintedString.taint;
    var flow = taint[0].flow;
    assertFullTainted(taintedString);
    assertEq(flow[flow.length - 1].operation, 'manual taint source');
    assertEq(flow[flow.length - 1].arguments[0], untaintedString);

    // Tainting does not influence string comparisons
    assertEq(taintedString, untaintedString);

    // Test str.untaint()
    taintedString.untaint();
    assertNotTainted(taintedString);
    assertEq(taintedString, untaintedString);

    // Test taint assignment
    // TODO expand these once the taint setter is feature complete
    var string1 = randomString();
    var string2 = String.newAllTainted(string1);
    string1.taint = string2.taint;
    assertFullTainted(string1);
    assertDeepEq(string1.taint, string2.taint);

    return true;
}

runTaintTest(basicTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);

