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

    // With nothing to escape, escape() used to return its own input and record
    // nothing, and unescape() used to return its input with the operation
    // written onto it.
    var plain = taint('abcdef');
    var escaped = escape(plain);
    assertLastTaintOperationEquals(escaped, 'escape');
    assertFullTainted(escaped);
    assertNotHasTaintOperation(plain, 'escape');

    var unescaped = unescape(plain);
    assertLastTaintOperationEquals(unescaped, 'unescape');
    assertFullTainted(unescaped);
    assertNotHasTaintOperation(plain, 'unescape');
}

runTaintTest(strEscapeTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
