function strEscapeTest() {
    var str = randomMultiTaintedString();

    var encodedStr = escape(str);
    assertTainted(encodedStr);
    assertHasTaintOperation(encodedStr, 'escape');

    var decodedStr = unescape(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertHasTaintOperation(encodedStr, 'escape');
    assertHasTaintOperation(encodedStr, 'unescape');
}

runTaintTest(strEscapeTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
