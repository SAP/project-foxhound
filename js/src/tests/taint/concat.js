function stringConcatTest() {
    var s1 = randomString();
    var s2 = randomString();
    var ts1 = randomTaintedString();
    var ts2 = randomTaintedString();

    assertNotTainted(s1 + s2);
    assertTainted(s1 + ts1);
    assertRangeTainted(s1 + ts2, [s1.length, STR_END]);
    assertFullTainted(ts1 + ts2);
    assertEq(ts1.concat(ts2).taint.length, 2);
}

runTaintTest(stringConcatTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
