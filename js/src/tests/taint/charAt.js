function charAtTest() {
    var str = randomTaintedString();
    assertTainted(str.charAt(rand() % str.length));
}

runTaintTest(charAtTest);

if (typeof reportCompare === "function")
  reportCompare(true, true);
