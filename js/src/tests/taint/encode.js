function encodingTest() {
    var str = randomMultiTaintedString();

    var encodedStr = encodeURI(str);
    assertTainted(encodedStr);
    assertHasTaintOperation(encodedStr, 'encodeURI');

    var decodedStr = decodeURI(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertHasTaintOperation(encodedStr, 'encodeURI');
    assertHasTaintOperation(encodedStr, 'decodeURI');

    encodedStr = encodeURIComponent(str);
    assertTainted(encodedStr);
    assertHasTaintOperation(encodedStr, 'encodeURIComponent');

    decodedStr = decodeURIComponent(encodedStr);
    assertEq(decodedStr, str);
    assertEqualTaint(decodedStr, str);
    assertHasTaintOperation(encodedStr, 'encodeURIComponent');
    assertHasTaintOperation(encodedStr, 'decodeURIComponent');
}

runTaintTest(encodingTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
