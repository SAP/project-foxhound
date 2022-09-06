function numberStringConversionTests() {
    // Test single character taint propagation
    var taintedStr = randomTaintedString();
    assertNumberTainted(taintedStr.charCodeAt(0));
    assertTainted(String.fromCharCode(taintedStr.charCodeAt(0)));

    // Test multi character taint propagation
    taintedStr = randomMultiTaintedString();
    var chars = [];
    for (var i = 0; i < taintedStr.length; i++) {
        chars.push(taintedStr.charCodeAt(i));
    }

    var copiedString = String.fromCharCode.apply(null, chars);
    assertEqualTaint(copiedString, taintedStr);

    // Test explicit number.toString()
    var taintedNumber = taint(42);
    assertTainted(taintedNumber.toString());

    // Test implicit string conversion
    var taintedNumber = taint(42);
    assertTainted(taintedNumber + "abc");
    assertTainted((taintedNumber + "abc")[1]);
    assertNotTainted((taintedNumber + "abc")[2]);

}

runTaintTest(numberStringConversionTests);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
