function stringRepeatTest() {
    var str = randomTaintedString();
    var repStr = str.repeat(3);
    assertFullTainted(repStr);
}

runTaintTest(stringRepeatTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
