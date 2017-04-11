function strEscapeTest() {
    var str = randomMultiTaintedString();

    var encodedStr = escape(str);
    assertTainted(encodedStr);
    assertLastTaintOperationEquals(encodedStr, 'escape');
    assertNotHasTaintOperation(str, 'escape');

    var decodedStr = unescape(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertLastTaintOperationEquals(decodedStr, 'unescape');
    assertNotHasTaintOperation(encodedStr, 'unescape');
}

runTaintTest(strEscapeTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
