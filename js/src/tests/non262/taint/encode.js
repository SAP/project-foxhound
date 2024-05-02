function testEncodingFunctions() {
    var str = randomMultiTaintedString(20) + randomMultiTaintedStringWithEscapables(20);

    var encodedStr = encodeURI(str);
    assertLastTaintOperationEquals(encodedStr, 'encodeURI');
    assertTainted(encodedStr);
    assertNotHasTaintOperation(str, 'encodeURI');

    var decodedStr = decodeURI(encodedStr);
    assertLastTaintOperationEquals(decodedStr, 'decodeURI');
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertNotHasTaintOperation(encodedStr, 'decodeURI');
}

function testEncodingComponentFunctions() {
    var str = randomMultiTaintedString(20) + randomMultiTaintedStringWithEscapables(20);

    var encodedStr = encodeURIComponent(str);
    assertLastTaintOperationEquals(encodedStr, 'encodeURIComponent');
    assertTainted(encodedStr);
    assertNotHasTaintOperation(str, 'encodeURIComponent');

    var decodedStr = decodeURIComponent(encodedStr);
    assertLastTaintOperationEquals(decodedStr, 'decodeURIComponent');
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertNotHasTaintOperation(encodedStr, 'decodeURIComponent');
}

function testURLDecode() {
    var str = taint("%41%42%43");
    var decoded = decodeURI(str);
    assertFullTainted(decoded);
    assertEq(decoded.taint.length, 1);
}

runTaintTest(testEncodingFunctions);
runTaintTest(testEncodingComponentFunctions);
runTaintTest(testURLDecode);

if (typeof reportCompare === "function")
  reportCompare(true, true);
