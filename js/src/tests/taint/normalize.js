function normalizeTest() {
    var str = randomMultiTaintedString();
    //var str = randomUnicodeString(); <-- TODO

    // "canonically decomposed form" will create 2 unicode chars out of our 1
    var norm = str.normalize('NFD');
    // this new char should be included in the taint
    assertEq(str.taint.length, norm.taint.length);
    assertEq(norm.taint[0].begin, 0);
    assertEq(norm.taint[0].end, 7); //!!
}

runTaintTest(normalizeTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);

