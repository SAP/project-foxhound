function substringTaintTest() {
    var a = randomString(10);
    var b = randomString(10);
    var c = randomString(10);
    var str = taint(a) + b + taint(c);

    // Verify that taint ranges are computed correctly
    assertEq(str.substr(1, 3).taint[0].begin, 0);
    assertEq(str.substr(1, 3).taint[0].end, 3);

    // Verify that inner substring is not tainted
    assertNotTainted(str.substring(a.length, a.length + b.length));

    // Verify that the first and last part of the string is fully tainted
    assertFullTainted(str.substring(0, a.length));
    assertFullTainted(str.substring(a.length + b.length, str.length));

    var tail = str.substring(a.length + b.length, str.length);
    assertEq(tail.taint.length, 1);
    assertEq(tail.taint[0].begin, 0);
    assertEq(tail.taint[0].end, tail.length);
    assertHasTaintOperation(tail, 'substring');

    // Verify that multi-tainted substrings are handled correctly
    var substring = str.substring(2, str.length - 2);
    print(": " + str);
    print("[]: " + substring);
    print(stringifyTaint(substring.taint));
    assertEq(substring.taint.length, 2);
    assertEq(substring.taint[0].begin, 0);
    assertEq(substring.taint[0].end, a.length - 2);
    assertEq(substring.taint[1].begin, a.length + b.length - 2);
    assertEq(substring.taint[1].end, str.length - 4);

    // Test substr()
    var substr = str.substr(2, str.length - 4);
    assertHasTaintOperation(tail, 'substr');
    assertEqualTaint(substring, substr);

    // Test slice()
    var slice = str.slice(2, str.length - 2);
    assertHasTaintOperation(tail, 'slice');
    assertEqualTaint(substring, slice);
}

runTaintTest(substringTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
