function stringRepeatTest() {
    var str = randomTaintedString();
    var repStr = str.repeat(3);
    assertLastTaintOperationEquals(repStr, "repeat");
    assertFullTainted(repStr);

    var str = randomTaintedString();
    var repStr = str.repeat(1);
    assertLastTaintOperationEquals(repStr, "repeat");
    assertFullTainted(repStr);
}

runTaintTest(stringRepeatTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
