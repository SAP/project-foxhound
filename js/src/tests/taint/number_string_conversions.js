function numberStringConversionTests() {
    // Test single character taint propagation
    var taintedStr = randomTaintedString();
    assertTainted(String.fromCharCode(taintedStr.charCodeAt(0)));

    // Test multi character taint propagation
    taintedStr = randomMultiTaintedString();
    var chars = [];
    for (var i = 0; i < taintedStr.length; i++) {
        chars.push(taintedStr.charCodeAt(i));
    }

    var copiedString = String.fromCharCode.apply(null, chars);
    assertEqualTaint(copiedString, taintedStr);

    // TODO do we care about number.toString()?
}

runTaintTest(numberStringConversionTests);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
