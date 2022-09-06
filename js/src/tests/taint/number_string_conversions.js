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

    // Test explicit string conversion
    var taintedNumber = taint(42);
    assertTainted(taintedNumber.toString());
    assertTainted(String(taintedNumber));

    // Test implicit string conversion
    assertTainted(taintedNumber + "abc");
    assertTainted((taintedNumber + "abc")[1]);
    assertNotTainted((taintedNumber + "abc")[2]);

    // Test explicit number conversion
    assertNumberTainted(Number(taint("42")));
    assertNumberTainted(parseInt(taint("42")));
    assertNumberTainted(parseFloat(taint("42.42")));

    // Test implicit number conversion
    assertNumberTainted(42 - taint("2"));
    assertNumberTainted(taint("42") - 2);
    assertNumberTainted(taint("42") - taint("2"));
    assertNumberTainted(42 * taint("2"));
    assertNumberTainted(taint("42") * 2);
    assertNumberTainted(taint("42") * taint("2"));
    assertNumberTainted(42 / taint("2"));
    assertNumberTainted(taint("42") / 2);
    assertNumberTainted(taint("42") / taint("2"));

}

runTaintTest(numberStringConversionTests);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
