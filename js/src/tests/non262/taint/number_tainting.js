function numberTaintingTest() {
    var a = taint(42);
    var b = taint(13.37);
    assertNumberTainted(a);
    assertNumberTainted(b);

    //
    // Basic arithmetic tests
    assertNumberTainted(a + 13.37);
    assertNumberTainted(13.37 + a);
    assertNumberTainted(a + b);
    assertEq(a + b, 42 + 13.37);        // assertEq uses === for comparing values
    assertEq(a + b == 42 + 13.37, true);

    assertNumberTainted(a - 13.37);
    assertNumberTainted(13.37 - a);
    assertNumberTainted(a - b);
    assertEq(a - b, 42 - 13.37);
    assertEq(a - b == 42 - 13.37, true);

    assertNumberTainted(a * 13.37);
    assertNumberTainted(13.37 * a);
    assertNumberTainted(a * b);
    assertEq(a * b, 42 * 13.37);
    assertEq(a * b == 42 * 13.37, true);

    assertNumberTainted(a / 13.37);
    assertNumberTainted(13.37 / a);
    assertNumberTainted(a / b);
    assertEq(a / b, 42 / 13.37);
    assertEq(a / b == 42 / 13.37, true);

    assertNumberTainted(a % 13.37);
    assertNumberTainted(a % b);
    assertEq(a % b, 42 % 13.37);
    assertEq(a % b == 42 % 13.37, true);

    assertNumberTainted(a ** 13.37);
    assertNumberTainted(13.37 ** a);
    assertNumberTainted(a ** b);
    assertEq(a ** b, 42 ** 13.37);
    assertEq(a ** b == 42 ** 13.37, true);


    //
    // Number increment/decrement
    assertNumberTainted(a++);
    assertNumberTainted(a);
    assertNumberTainted(a--);
    assertNumberTainted(a);
    assertNumberTainted(++a);
    assertNumberTainted(a);
    assertNumberTainted(--a);
    assertNumberTainted(a);

    
    //
    // Bitwise operations
    b = taint(3);
    assertNumberTainted(a << 1);
    assertNumberTainted(a << b);
    assertEq(a << b, 42 << 3);

    assertNumberTainted(a >> 1);
    assertNumberTainted(a >> b);
    assertEq(a >> b, 42 >> 3);

    assertNumberTainted(a >>> 1);
    assertNumberTainted(a >>> b);
    assertEq(a >> b, 42 >>> 3);
    assertEq(taint(-5) >>> taint(2), 1073741822);

    assertNumberTainted(a & 1);
    assertNumberTainted(a & b);
    assertEq(a & b, 42 & 3);

    assertNumberTainted(a | 1);
    assertNumberTainted(a | b);
    assertEq(a | b, 42 | 3);

    assertNumberTainted(a ^ 1);
    assertNumberTainted(a ^ b);
    assertEq(a ^ b, 42 ^ 3);

    assertNumberTainted(~a);
    assertEq(~a, ~42);

    // Element access
    var table = [0,1,2,3,4,5,6,7];
    assertNumberTainted(table[a & 7]);
}

runTaintTest(numberTaintingTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
