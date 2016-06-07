function atomTaintTest() {
    var atom = 'a';
    var str  = taint('a');

    assertNotTainted(atom);
    assertTainted(str);

    // Test functions that could produce (tainted) atoms.
    var untaintedStr = randomString();
    var taintedStr = taint(untaintedStr);
    var index = rand() % untaintedStr.length;

    assertTainted(taintedStr[i]);
    assertNotTainted(untaintedStr[i]);
    assertTainted(taintedStr[i.toString()]);
    assertNotTainted(untaintedStr[i.toString()]);

    assertTainted(taintedStr.charAt(i));
    assertNotTainted(untaintedStr.charAt(i));

    assertTainted(taintedStr.substr(i, 1));
    assertNotTainted(untaintedStr.substr(i, 1));

    var untaintedStrings = untaintedStr.split('');
    var taintedStrings = taintedStr.split('');
    assertTainted(taintedStrings[i]);
    assertNotTainted(untaintedStrings[i]);
}

runTaintTest(atomTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
