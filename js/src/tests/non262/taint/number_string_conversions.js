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

    // Test number as parameter taint propagation
    index = taint(3)
    untaintedStr = "Hello World"
    assertTainted(untaintedStr.charAt(index))

    // Small numbers <=6bit are sometimes transformed to Atoms, when
    // converted to strings, which can cause problems
    var taintedNumberSmall = taint(42);
    var taintedNumberLarge = taint(9000);

    // Text JSON.stringify with inputs including tainted numbers
    assertTainted(JSON.stringify(taintedNumberSmall))
    assertTainted(JSON.stringify([1,2,3,taintedNumberSmall,5]))
    assertTainted(JSON.stringify({"num":taintedNumberSmall}))
    assertTainted(JSON.stringify([1,2,3,{"num":taintedNumberSmall},5]))

    // Test explicit string conversion
    assertTainted(taintedNumberLarge.toString());
    assertTainted(String(taintedNumberLarge));
    assertTainted(taintedNumberSmall.toString());
    assertTainted(String(taintedNumberSmall));

    // Test implicit string conversion
    assertTainted(taintedNumberLarge + "abc");
    assertTainted((taintedNumberLarge + "abc")[1]);
    assertNotTainted((taintedNumberLarge + "abc")[5]);
    assertTainted(taintedNumberSmall + "abc");
    assertTainted((taintedNumberSmall + "abc")[1]);
    assertNotTainted((taintedNumberSmall + "abc")[2]);

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
