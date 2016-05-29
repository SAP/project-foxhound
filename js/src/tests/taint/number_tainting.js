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

    // Bitwise operations
    assertNumberTainted(a << 1);
    assertNumberTainted(a >> 1);
    assertNumberTainted(a & 1);
    assertNumberTainted(a | 1);
    assertNumberTainted(a ^ 1);
    assertNumberTainted(~a);
}

runTaintTest(numberTaintingTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
