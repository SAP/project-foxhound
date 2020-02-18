function JSONTaintTest() {
    var str = randomMultiTaintedString();

    var stringifiedStr = JSON.stringify(str);
    assertEq(stringifiedStr.taint.length, str.taint.length);
    assertLastTaintOperationEquals(stringifiedStr, 'JSON.stringify');

    var parsedStr = JSON.parse(stringifiedStr);
    assertEq(str, parsedStr);
    assertEqualTaint(str, parsedStr);
    assertLastTaintOperationEquals(parsedStr, 'JSON.parse');

    var t = String.tainted("hello");
    var stringifiedTaint = JSON.stringify({ "name": t });
    assertEq(stringifiedTaint, "{\"name\":\"hello\"}");
    assertRangeTainted(stringifiedTaint, [9, 14]);
}

runTaintTest(JSONTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
