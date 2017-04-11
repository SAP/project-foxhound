
function testEncodingFunctions() {
    var str = randomMultiTaintedString();

    var encodedStr = encodeURI(str);
    assertTainted(encodedStr);
    print(JSON.stringify(encodedStr.taint));
    assertLastTaintOperationEquals(encodedStr, 'encodeURI');
    assertNotHasTaintOperation(str, 'encodeURI');

    var decodedStr = decodeURI(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertLastTaintOperationEquals(decodedStr, 'decodeURI');
    assertNotHasTaintOperation(encodedStr, 'decodeURI');

    encodedStr = encodeURIComponent(str);
    assertTainted(encodedStr);
    assertLastTaintOperationEquals(encodedStr, 'encodeURIComponent');
    assertNotHasTaintOperation(str, 'encodeURIComponent');

    decodedStr = decodeURIComponent(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertLastTaintOperationEquals(decodedStr, 'decodeURIComponent');
    assertNotHasTaintOperation(encodedStr, 'decodeURIComponent');
}

function testURLDecode() {
    var str = taint("%41%42%43");
    var decoded = decodeURI(str);
    assertFullTainted(decoded);
    assertEq(decoded.taint.length, 1);
}

function runEncodingTests() {
    testEncodingFunctions();
    testURLDecode();
}

runTaintTest(runEncodingTests);

if (typeof reportCompare === "function")
  reportCompare(true, true);
