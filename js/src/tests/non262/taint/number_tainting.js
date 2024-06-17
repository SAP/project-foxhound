function numberTaintingTest() {
    var a = taint(42);
    var b = taint(13.37);
    assertNumberTainted(a);
    assertNumberTainted(b);

    //
    // Basic arithmetic tests
    assertNumberTainted(a + 1);

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
    assertEq(a * 13.37, 561.54);
    assertNumberTainted(13.37 * a);
    assertEq(13.37 * a, 13.37 * 42);
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

}

function incrementNumberTaintingTest() {

    // Number increment/decrement
    var a = taint(42);
    assertNumberTainted(a);
    assertNumberTainted(a++);
    assertEq(43, a);
    assertNumberTainted(a--);
    assertEq(42, a);
    assertNumberTainted(a);
    assertNumberTainted(++a);
    assertEq(43, a);
    assertNumberTainted(a);
    assertNumberTainted(--a);
    assertEq(42, a);
    assertNumberTainted(a);

    // Number increment/decrement
    var b = taint(3.14159);
    assertNumberTainted(b);
    assertNumberTainted(b++);
    assertNumberTainted(b--);
    assertNumberTainted(b);
    assertNumberTainted(++b);
    assertNumberTainted(b);
    assertNumberTainted(--b);
    assertNumberTainted(b);

}

function bitwiseNumberTaintingTest() {
    //
    // Bitwise operations
    var a = taint(42);
    var b = taint(3);
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
runTaintTest(incrementNumberTaintingTest);
runTaintTest(bitwiseNumberTaintingTest);

if (typeof reportCompare === 'function')
  reportCompare(true, true);
