function strEscapeTest() {
    var str = randomMultiTaintedString(20) + randomMultiTaintedStringWithEscapables(20);

    var encodedStr = escape(str);
    // NB: We need to keep the asserts in this order, otherwise
    //     the "assertLastTaintOperationEquals" will appear in
    //     the taint operation list!
    assertLastTaintOperationEquals(encodedStr, 'escape');
    assertTainted(encodedStr);
    assertNotHasTaintOperation(str, 'escape');

    var decodedStr = unescape(encodedStr);
    assertLastTaintOperationEquals(decodedStr, 'unescape');
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertNotHasTaintOperation(encodedStr, 'unescape');
}

runTaintTest(strEscapeTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
