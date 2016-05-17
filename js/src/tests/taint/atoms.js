function atomTaintTest() {
    var atom = 'a';
    var str  = taint('a');

    assertNotTainted(atom);
    assertTainted(str);
}

runTaintTest(atomTaintTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
