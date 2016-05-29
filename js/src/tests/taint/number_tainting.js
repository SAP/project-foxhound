function numberTaintingTest() {
    var a = taint(42);
    var b = taint(13.37);
    assertNumberTainted(a);
    assertNumberTainted(b);

    // Basic arithmetic tests
    assertNumberTainted(a + 13.37);
    assertNumberTainted(a - 13.37);
    assertNumberTainted(a * 13.37);
    assertNumberTainted(a / 13.37);

    assertNumberTainted(a + b);
    assertNumberTainted(a - b);
    assertNumberTainted(a * b);
    assertNumberTainted(a / b);
}

runTaintTest(numberTaintingTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
