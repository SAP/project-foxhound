function encodingTest() {
    var str = randomMultiTaintedString();

    var encodedStr = encodeURI(str);
    assertTainted(encodedStr);
    print(JSON.stringify(encodedStr.taint));
    assertLastTaintOperationEquals(encodedStr, 'encodeURI');

    var decodedStr = decodeURI(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertLastTaintOperationEquals(decodedStr, 'decodeURI');

    encodedStr = encodeURIComponent(str);
    assertTainted(encodedStr);
    assertLastTaintOperationEquals(encodedStr, 'encodeURIComponent');

    decodedStr = decodeURIComponent(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertLastTaintOperationEquals(decodedStr, 'decodeURIComponent');
}

runTaintTest(encodingTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
