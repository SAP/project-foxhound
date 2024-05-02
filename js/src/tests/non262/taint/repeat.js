function stringLargeRepeatTest() {
    var str = randomTaintedString();
    var repStr = str.repeat(100);
    assertLastTaintOperationEquals(repStr, "repeat");
    assertNotHasTaintOperation(str, "repeat");
    assertFullTainted(repStr);
}

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

    assertFullTainted(str);
    assertNotHasTaintOperation(str, "repeat");
    assertFullTainted(repStr);
    assertLastTaintOperationEquals(repStr, "repeat");
}

function stringZeroRepeatTest() {
    var str = randomTaintedString();
    var repStr = str.repeat(0);

    assertFullTainted(str);
    assertNotHasTaintOperation(str, "repeat");
}

runTaintTest(stringRepeatTest);
runTaintTest(stringSingleRepeatTest);
runTaintTest(stringZeroRepeatTest);
runTaintTest(stringLargeRepeatTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
