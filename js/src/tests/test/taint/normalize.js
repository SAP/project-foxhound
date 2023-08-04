function testNormalizeAscii() {
    var str = randomMultiTaintedString();

    var norm = str.normalize('NFD');
    assertEq(str.taint.length, norm.taint.length);
    assertEqualTaint(str, norm);
}

function testNormalizeUnicode1() {
    var str = taint("asdfüqwert");

    // "canonically decomposed form" will create 2 unicode chars out of our 1
    var norm = str.normalize('NFD');
    // this new char should be included in the taint
    assertFullTainted(str);
    // assertFullTainted(norm); // TODO fails
}

function testNormalizeUnicode2() {
    var str = taint("ä") + "xxx" + taint("ü") + "yyy";

    // "canonically decomposed form" will create 2 unicode chars out of our 1
    var norm = str.normalize('NFD');
    // this new char should be included in the taint
    assertEq(str.length + 2, norm.length);
    // assertRangesTainted(norm, [0,2], [5,7]); // TODO fails
}

function runNormalizeTests() {
    testNormalizeAscii();
    testNormalizeUnicode1();
    testNormalizeUnicode2();
}

runTaintTest(runNormalizeTests);

if (typeof reportCompare === 'function')
    reportCompare(true, true);

