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

    assertNumberTainted(a++);
    assertNumberTainted(a);
    assertNumberTainted(a--);
    assertNumberTainted(a);
    assertNumberTainted(++a);
    assertNumberTainted(a);
    assertNumberTainted(--a);
    assertNumberTainted(a);

    // Bitwise operations
    assertNumberTainted(a << 1);
    assertNumberTainted(a >> 1);
    assertNumberTainted(a & 1);
    assertNumberTainted(a | 1);
    assertNumberTainted(a ^ 1);
    assertNumberTainted(~a);

    // Element access
    var table = [0,1,2,3,4,5,6,7];
    assertNumberTainted(table[a & 7]);
}

runTaintTest(numberTaintingTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
