function stringRepeatTest() {
    var str = randomTaintedString();
    var repStr = str.repeat(3);
    assertLastTaintOperationEquals(repStr, "repeat");
    assertNotHasTaintOperation(str, "repeat");
    assertFullTainted(repStr);
}

function stringSingleRepeatTest() {
    var str = randomTaintedString();
    var repStr = str.repeat(1);
    assertLastTaintOperationEquals(repStr, "repeat");
    assertNotHasTaintOperation(str, "repeat");
    assertFullTainted(repStr);
}

runTaintTest(stringRepeatTest);
runTaintTest(stringSingleRepeatTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
