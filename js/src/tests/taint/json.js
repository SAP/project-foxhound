function JSONTaintTest() {
    var str = randomMultiTaintedString();

    var stringifiedStr = JSON.stringify(str);
    assertEq(stringifiedStr.taint.length, str.taint.length);
    assertLastTaintOperationEquals(stringifiedStr, 'JSON.stringify');

    var parsedStr = JSON.parse(stringifiedStr);
    assertEq(str, parsedStr);
    assertEqualTaint(str, parsedStr);
    assertLastTaintOperationEquals(parsedStr, 'JSON.parse');
}

runTaintTest(JSONTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
